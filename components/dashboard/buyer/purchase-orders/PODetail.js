import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Download,
  X,
  Check,
  Clock,
  ShieldCheck,
  Boxes,
  Building2,
  FileText,
  ClipboardCheck,
  BarChart2,
  IndianRupee,
  Phone,
  Mail,
  CreditCard,
  User,
  ExternalLink,
  AlertCircle,
  Circle,
  ChevronDown,
  Send,
} from "lucide-react";
import ReadMore from "@/components/shared/ReadMore";
import { getPODetailFull, handlePOApproval, handlePOInitialization } from "@/services/po";
import { previewTotals } from "@/services/pricing";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
// Single source of truth for reason-code → human label. Owned by the RFQ stage
// panels; imported (never re-implemented) so the PO trail and the RFQ trail can
// never drift into calling the same code two different things.
import { removalReasonLabel } from "@/components/dashboard/buyer/rfq/stages/StageShared";
import styles, {
  avatarClass,
  initialsOf,
  statusLabel,
  statusTone,
  inr,
  fmtDateTime,
  fmtDateOnly,
  fmtMaybeDate,
  Sk,
} from "./shared";

const PO_ROUTE = "/dashboard/buyer/purchase-orders";

// Technical-evaluation status → label + tone class (resolved against the module).
const TE_STATUS = {
  passed: { label: "Passed", cls: "tePassed" },
  failed: { label: "Failed", cls: "teFailed" },
  evaluated: { label: "Evaluated", cls: "teEval" },
  pending: { label: "Pending", cls: "tePend" },
};

/* ── Audit-trail step vocabulary ─────────────────────────────────────────
   Every node status the trail can receive gets an explicit class + chip here.
   A backend that starts emitting a status this map has no entry for falls
   through to the neutral pending look with the raw token title-cased — never a
   blank chip and never the literal string "undefined" in a className, which is
   exactly what a previous cross-repo enum addition shipped. */
const WF_STEP_CLASS = {
  done: "wfDone",
  current: "wfCurrent",
  pending: "wfPending",
  skipped: "wfSkipped",
  removed: "wfRemoved",
  rejected: "wfRejected",
  cancelled: "wfCancelled",
};
const WF_STEP_CHIP = {
  done: "Done",
  current: "Awaiting",
  pending: "", // queued and unremarkable — deliberately no chip
  skipped: "Skipped",
  removed: "Removed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
/* Steps that were never reached and never will be — excluded from BOTH sides of
   the "N of M done" fraction. A rejected step is not in here: it did happen and
   still belongs in the denominator. */
const DEAD_STEP_STATUSES = new Set(["skipped", "removed", "cancelled"]);
/* Steps that are finished, whatever the outcome. A still-PENDING approver on
   one of these is no longer waiting on anything. */
const CLOSED_STEP_STATUSES = new Set(["done", "rejected", "skipped", "removed", "cancelled"]);

const titleCaseStatus = (s) => {
  const raw = String(s || "").replace(/[_-]+/g, " ").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";
};

/* ConfirmationModal renders its `description` through dangerouslySetInnerHTML,
   so every value interpolated into that prop is parsed as markup. The other
   call sites in the codebase interpolate buyer-authored strings; the vendor
   company name below is the first value on that prop that a VENDOR types into
   their own profile, which turns a raw interpolation into a stored-XSS path
   from a vendor straight into a buyer's browser. The sink is shared by ~37 call
   sites and is a separate cleanup, so the escaping happens here, at the
   boundary we own. Anything vendor-supplied that reaches `description` must go
   through this. */
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* ── Audit-trail approver vocabulary ─────────────────────────────────────
   The DB only ever stores PENDING / APPROVED / REJECTED / REMOVED on an
   approver row. The two states a reader actually needs but the DB never
   writes — "someone else cleared this step so you were never needed" and "the
   step died before it got to you" — are derived: the backend sends them as
   `effective_status`, and the same derivation is repeated here so an old
   payload (deploy skew) still reads correctly instead of printing "Awaiting"
   next to six people who will never act.

   The six outcomes below are the same vocabulary as
   components/dashboard/buyer/approval/approverState.js, which the RFQ stage
   panel and the quote-comparison approval drawer share. This page did NOT move
   onto it: it prefers the server's own `effective_status` when the payload
   carries it and only falls back to deriving, and it reads the PO-details
   payload's LOWERCASE step statuses ("done"/"skipped") rather than the stored
   uppercase ones — folding it in would be a rewrite, not a move. Change one and
   check the other; they describe the same approvals. */
const APPROVER_STATE = {
  APPROVED: { label: "Approved", cls: "rsApproved" },
  REJECTED: { label: "Rejected", cls: "rsRejected" },
  PENDING: { label: "Awaiting", cls: "rsPending" },
  NOT_REQUIRED: { label: "Not required", cls: "rsNotRequired" },
  NOT_REACHED: { label: "Not reached", cls: "rsNotReached" },
  REMOVED: { label: "Removed", cls: "rsRemoved" },
};

/* Statuses that are not keys of APPROVER_STATE but have an exact equivalent
   there. SKIPPED is the mid-flight reconciler's word for "this person was taken
   out of the running before they were ever asked"; the RFQ stage panel
   (PurchaseOrderStage.effectiveApproverStatus) already folds it into
   NOT_REQUIRED. Without this map the lookup misses, the PENDING default runs,
   and the same approver reads "Awaiting" here and "Not required" there — the
   page saying someone still owes an action they can no longer take. */
const APPROVER_STATE_ALIAS = {
  SKIPPED: "NOT_REQUIRED",
};

/* Any status token → the APPROVER_STATE key that renders it, or null if this
   build genuinely has no idea what it is. Never returns a key that isn't in
   APPROVER_STATE, so a caller can't reach the stylesheet with an unknown value. */
const canonicalApproverState = (status) => {
  const key = String(status || "").toUpperCase();
  if (APPROVER_STATE[key]) return key;
  return APPROVER_STATE_ALIAS[key] || null;
};

const effectiveApproverStatus = (approver, stepStatus, decisionRule) => {
  // The server's derivation wins outright. It is the single copy of this rule
  // (poDashboardModel.effectiveStatusOf); second-guessing it here is how the
  // same approval ends up labelled two different ways on two pages.
  const explicit = canonicalApproverState(approver?.effective_status);
  if (explicit) return explicit;

  // Fallback for a payload that predates `effective_status` (deploy skew).
  // Mirrors the server rule exactly, including its refusal to bucket the one
  // anomalous case — see below.
  const raw = String(approver?.status || "").toUpperCase();
  if (raw !== "PENDING") return canonicalApproverState(raw) || "PENDING";
  if (!CLOSED_STEP_STATUSES.has(stepStatus)) return "PENDING";
  // A level the reconciler skipped or voided never asked anyone on it to act —
  // "not required", the same reading a cleared ANY level gets. Only a level that
  // was rejected or cancelled ended before reaching them. Collapsing the two
  // into NOT_REACHED is the divergence this vocabulary exists to prevent:
  // poDashboardModel.effectiveApproverStatus splits them, and so does
  // PurchaseOrderStage.
  if (stepStatus === "skipped" || stepStatus === "removed") return "NOT_REQUIRED";
  if (stepStatus !== "done") return "NOT_REACHED";
  // The step cleared. Under ANY that means someone else was enough and this
  // person was never needed. Under ALL it means the step closed while someone
  // still owed an action — which cannot legitimately happen (measured on stage:
  // 0 such rows across 63 ALL/APPROVED steps). We deliberately keep "Awaiting"
  // there rather than relabelling it "Not required": if the approval engine
  // ever does close an ALL step early, that is a bug, and it should look wrong
  // on screen instead of being quietly explained away.
  return String(decisionRule || "").toUpperCase() === "ALL" ? "PENDING" : "NOT_REQUIRED";
};

/* Display order: people who acted, then people who still owe an action, then
   people who no longer need to, then the removed tombstones last. */
const APPROVER_RANK = {
  APPROVED: 0,
  REJECTED: 0,
  PENDING: 1,
  NOT_REQUIRED: 2,
  NOT_REACHED: 2,
  REMOVED: 3,
};

const RULE_LABEL = { ALL: "All must approve", ANY: "Any one approves" };

/* Beyond this many approvers the roster collapses. The state summary above it
   stays visible either way, so a collapsed 20-person level still says what
   happened — the control only hides names, never status. */
const ROSTER_VISIBLE = 8;

const PODetail = ({ id }) => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(null); // 'approved' | 'rejected' | null
  const [initiating, setInitiating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [otherChargesOpen, setOtherChargesOpen] = useState(false);
  const [globalChargesOpen, setGlobalChargesOpen] = useState(false);
  // Reject is a two-step action: the button opens the modal, the modal's
  // confirm submits. Nothing is sent from the button click itself.
  const [rejectOpen, setRejectOpen] = useState(false);

  /* ── Permission scope ────────────────────────────────────────────────────
     Whether this user may act on THIS purchase order is a question about the
     PO's own hotel, so that is the scope the grants are resolved against —
     the same thing the legacy listing page does with its RFQ
     (PurchaseOrders.js: `if (currentRfqData.hotel_id != null) return
     [currentRfqData.hotel_id]`) and the same tuple the server evaluates
     (purchaseOrderModel.assertPoAccess → company × hotel × department ×
     process, sourced from the PO's parent RFQ or ARC).

     This page used to ask about the viewer's `hospitality_mappings` instead,
     which is a different question with a different answer in both
     directions: a create grant that lives at the PO's hotel is filtered out
     of the reply whenever the viewer's mapping snapshot doesn't cover it
     (rbacModel.getUserPermissionsForHotels keys on `urs.company_id IN
     (companies of the requested hotels) AND (urs.hotel_id IS NULL OR
     urs.hotel_id IN (requested))`) — that is the missing Force Initiate
     button — while a create grant held at some *other* hotel was being
     counted as if it applied here.

     The viewer's mappings survive only as the pre-load / no-hotel fallback:
     a PO with no hotel at all (legacy non-hospitality PO) still has to
     resolve to something, and until the PO arrives there is nothing else to
     key on. */
  const viewerHotelIds = useMemo(() => {
    const mappings = userProfile?.hospitality_mappings || [];
    return mappings.map((m) => m.hospitality_hotel_id).filter(Boolean);
  }, [userProfile]);

  const hotelIds = useMemo(
    () => (po?.hotel_id != null ? [po.hotel_id] : viewerHotelIds),
    [po?.hotel_id, viewerHotelIds]
  );

  const { canRead, canApprove, canUpdate, canCreate, loading: permissionsLoading } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds,
    // The server's scope predicate includes the department axis, so the gate
    // asks about the PO's department too — a grant scoped to some other
    // department is not a grant on this PO.
    departmentId: po?.department_id ?? null,
  });
  // Same predicate as the legacy listing page (PurchaseOrders.js), deliberately:
  // two pages offering the same action must not disagree about who may take it.
  //
  // It is worth being precise about who that leaves out, because the previous
  // comment here got it backwards ("the PO creator typically holds create").
  // Awarding a PO and initiating it are separate grants: finalising a quote
  // needs `quote-compare.create`, initiating needs `awarding.create/update`,
  // and in production 49 of the 53 users who can finalise hold neither of the
  // latter — `awarding.create` rides on Commercial Approver / ARC Approver /
  // CEO / Final Awarding, not on the negotiator and observer roles most
  // finalisers have. So the common case is a buyer looking at a draft they
  // themselves created and correctly being unable to move it on. Whether that
  // is the intended workflow is a product question and is NOT settled by
  // widening this predicate; what this page owes them meanwhile is an
  // explanation instead of a missing button (see the hero note below).
  const canWrite = canUpdate || canCreate;

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getPODetailFull(id);
      setPo(data || null);
      if (!data) { setError(true); return; }

      // Kick off pricing preview — builds the per-line charge breakdown and
      // global charges totals without any client-side math.
      try {
        const rawGlobal = data.global_charges;
        const globalCharges = Array.isArray(rawGlobal) ? rawGlobal
          : (typeof rawGlobal === "string" && rawGlobal.trim()
              ? (() => { try { return JSON.parse(rawGlobal); } catch (_) { return []; } })()
              : []);
        const prev = await previewTotals({
          items: (data.items || []).map((it) => ({
            unit_price: it.unit_price,
            quantity: it.quantity,
            tax: it.gst ?? 0,
            tax_mode: "percentage",
            other_charges: it.charges_meta?.other_charges || [],
          })),
          global_charges: globalCharges,
        });
        setPreview(prev?.data || prev);
      } catch (_) {
        // preview is optional — grand total still shown from PO data
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(PO_ROUTE);
  };

  // Approve / Reject — reuse the existing PO approval endpoint and payload
  // shape: handlePOApproval(po_id, { decision, type: "approval", remarks }).
  //
  // `reasonOverride` is what the reject modal collected. Rejection used to read
  // the aside's comment textarea, which the top-right Reject button sits nowhere
  // near — clicking it produced "please add a reason" pointing at a field that
  // wasn't on screen. The reason is now always asked for at the moment of the
  // decision, so the guard below is defence only, never the user's first
  // encounter with the requirement.
  const decide = async (decision, reasonOverride) => {
    const remarks = String(reasonOverride ?? comment).trim();
    if (decision === "rejected" && !remarks) {
      toast.error("Please add a reason before rejecting this PO.");
      return;
    }
    setSubmitting(decision);
    try {
      const res = await handlePOApproval(id, {
        decision,
        type: "approval",
        remarks,
      });
      const message =
        res?.data?.message ||
        res?.message ||
        (decision === "approved" ? "PO approved successfully" : "PO rejected · vendor notified");
      toast.success(message);
      setComment("");
      setRejectOpen(false);
      await fetchDetail();
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || "Something went wrong, please try again.";
      toast.error(message);
    } finally {
      setSubmitting(null);
    }
  };

  // Force Initiate — drives the draft PO into the standard initiation flow
  // (GET /po/initiate/:id). Triggers approval-instance creation, PDF
  // generation, and approver notification. No approval bypass; if no
  // policy is configured the backend returns the same error it would for
  // any other initiate trigger.
  const handleForceInitiate = async () => {
    setInitiating(true);
    try {
      const res = await handlePOInitialization(id);
      const message =
        res?.data?.message ||
        res?.message ||
        "Purchase Order initiated successfully";
      toast.success(message);
      await fetchDetail();
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || "Failed to initiate Purchase Order";
      toast.error(message);
    } finally {
      setInitiating(false);
    }
  };

  if (permissionsLoading || loading) return <DetailSkeleton onBack={handleBack} />;

  /* Read gate. Only meaningful when the server did NOT hand us the PO: the
     detail endpoint applies its own scope predicate and 404s anything the
     caller may not read, and it accepts `rfq.read` / `boq.read` as well as
     `awarding.read` (purchaseOrderModel.PO_SCOPE_PERMISSIONS). Blacking out a
     PO the backend deliberately returned would make this page stricter than
     the server and hide pages from users who legitimately hold one of the
     other two grants. */
  if (!po && !canRead) {
    return (
      <div className={styles.page}>
        <div className={styles.pageBody}>
          <AccessDeniedPage
            title="Access Denied"
            message="You do not have permission to view this Purchase Order."
            showBackButton
            backUrl={PO_ROUTE}
            backLabel="Back to Purchase Orders"
          />
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className={styles.page}>
        <Breadcrumb onBack={handleBack} current={id} />
        <div className={styles.pageBody}>
          <div className={styles.sectionCard}>
            <div className={styles.emptyState}>
              <div className={styles.ic}>
                <FileText size={20} />
              </div>
              <div className={styles.ttl}>Unable to load this purchase order</div>
              <div className={styles.sub}>It may have been removed, or you may not have access.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPending =
    po.status === "pending" ||
    po.status === "pending_approval" ||
    po.status === "acceptance_pending";
  // Gating: the action card / hero banner / Approve-Reject buttons only show
  // when the backend says this PO is awaiting THE CURRENT USER. canApprove
  // additionally gates the buttons.
  const awaitingMe = po.awaiting_me === true;
  const currentStepLabel = po.current_step_label || null;
  const currentApprovers = Array.isArray(po.current_approvers) ? po.current_approvers : [];
  const currentApproverNames = currentApprovers.map((a) => a.name).filter(Boolean).join(", ");
  const heroMod =
    po.status === "approved" || po.status === "delivered" || po.status === "completed"
      ? styles.heroApproved
      : po.status === "rejected"
      ? styles.heroRejected
      : "";

  const pricing = po.pricing || {};
  const items = Array.isArray(po.items) ? po.items : [];
  const vendor = po.vendor || {};
  const rfq = po.rfq || {};
  const comparison = Array.isArray(po.comparison) ? po.comparison : [];
  const docs = Array.isArray(po.docs) ? po.docs : [];
  // The generated PO document (po_pdf_url) is surfaced in docs as type "po".
  const poDocUrl = (docs.find((d) => d.type === "po") || {}).url || null;
  const paymentTerms = Array.isArray(po.payment_terms) ? po.payment_terms : [];
  const techEval = Array.isArray(po.tech_eval) ? po.tech_eval : [];
  const workflow = Array.isArray(po.workflow) ? po.workflow : [];
  const keyDates = Array.isArray(po.key_dates) ? po.key_dates : [];
  const activity = Array.isArray(po.activity) ? po.activity : [];
  const decisionChecks = Array.isArray(po.decision_checks) ? po.decision_checks : [];

  const rfqDocs = po.rfq_docs || null;
  const vendorDocs = po.vendor_docs || null;

  const freightInsurance = (Number(pricing.freight) || 0) + (Number(pricing.insurance) || 0);

  const itemAmount = (it) => it.quantity * it.unit_price * (1 + (it.gst || 0) / 100);

  // All breakdown values come from the pricing/preview response — no client math.
  const previewLines = preview?.lines || null;
  const previewGlobal = preview?.global_charges || [];

  const computedSubtotal = previewLines
    ? previewLines.reduce((s, l) => s + (l.base || 0) + (l.base_tax || 0), 0)
    : items.reduce((s, it) => s + itemAmount(it), 0);

  // ── Per-column footer aggregates (issue 2e) ────────────────────────────
  // Only the Amount column used to be totalled; every other column ended in a
  // blank cell, so a buyer could not read "how many units am I buying" or "what
  // rate am I really paying" off this table at all.
  //
  // The aggregate has to differ per column — a straight sum of GST % across
  // lines is arithmetic nobody wants (3 lines at 18% would print 54%). Base and
  // tax still come from the pricing preview (the file's no-client-math rule);
  // only the roll-ups the server has no figure for are computed here.
  const totalBase = previewLines
    ? previewLines.reduce((s, l) => s + (l.base || 0), 0)
    : items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const totalLineTax = previewLines
    ? previewLines.reduce((s, l) => s + (l.base_tax || 0), 0)
    : items.reduce(
        (s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) * (Number(it.gst) || 0)) / 100,
        0
      );
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  // A quantity sum only carries a unit when every line shares it — "58 kg + 4
  // nos = 62" is a number with no unit that means anything, so the unit is
  // dropped rather than picked from the first row.
  //
  // Lines are commensurable when they all name the same unit, OR when not one
  // of them names a unit at all: an unlabelled column is one unspecified unit,
  // not several, and treating it as mixed would blank the rate on every PO
  // whose items carry no `unit` field.
  const itemUnits = items.map((it) => (it.unit ? String(it.unit).trim() : null));
  const unitKeys = itemUnits.map((u) => (u ? u.toLowerCase() : null));
  const unitsComparable = items.length > 0 && unitKeys.every((u) => u === unitKeys[0]);
  const uniformUnit = unitsComparable ? itemUnits[0] : null;
  const mixedUnits = items.length > 0 && !unitsComparable;

  // Weighted, not summed: total base ÷ total qty for the rate, total tax ÷
  // total base for the GST rate.
  //
  // The rate exists only when the quantities it divides by are commensurable.
  // Dropping the unit LABEL off a mixed-unit sum while still dividing money by
  // that sum fixed the caption and kept the lie: PO 31 (45.799 nos @ ₹150 · 566
  // pieces @ ₹10 · 13 cm @ ₹250) printed "₹25.26 avg" — a rate below every
  // number in the column it sits under, because ₹ ÷ (nos + pieces + cm) is a
  // price per nothing. There is no honest figure for that cell, so it stays
  // empty, exactly like the Grand total row's.
  //
  // The GST average is always defined: it is tax ÷ base, dimensionless, and the
  // only aggregate that reconciles with the Amount column (base + tax).
  const avgUnitPrice = unitsComparable && totalQty > 0 ? totalBase / totalQty : null;
  const avgGstPct = totalBase > 0 ? (totalLineTax / totalBase) * 100 : null;

  const totalOtherCharges = previewLines
    ? previewLines.reduce((s, l) => s + (l.charges_total || 0), 0)
    : 0;

  const totalGlobalCharges = preview?.global_charges_total ?? 0;

  const showOtherCharges = previewLines?.some((l) => (l.charges_total || 0) > 0) ?? false;
  const showGlobalCharges = previewGlobal.length > 0;

  const passedChecks = decisionChecks.filter((c) => c.status === "ok").length;

  // "skipped" / "removed" / "cancelled" workflow nodes will never be acted on
  // (the step was auto-bypassed, voided, or the instance was cancelled) — they
  // belong in neither side of the "N of M done" fraction. Counting them as done
  // would claim an action that never happened; counting them in the denominator
  // would make a buyer think more steps are still outstanding than actually are
  // (e.g. a SKIPPED level 4 sitting in a "2 of 4 done" reads as 2 outstanding
  // when only 1 really is).
  const activeWorkflowSteps = workflow.filter((w) => !DEAD_STEP_STATUSES.has(w.status));
  const doneSteps = activeWorkflowSteps.filter((w) => w.status === "done").length;

  // The header fraction's denominator silently excludes those steps (see
  // above), so a row list with one of them in it (e.g. L1/L2 approved, L3
  // pending, L4 skipped → "2 of 3 done" above 4 visible rows) reads as
  // arithmetic no one asked to check. Spell out the exclusion inline instead
  // of leaving the reader to notice the row count doesn't match the fraction.
  const skippedStepCount = workflow.filter((w) => w.status === "skipped").length;
  const removedStepCount = workflow.filter((w) => w.status === "removed").length;
  const cancelledStepCount = workflow.filter((w) => w.status === "cancelled").length;
  const workflowExcludedSuffix = [
    skippedStepCount > 0 ? `${skippedStepCount} skipped step${skippedStepCount === 1 ? "" : "s"}` : null,
    removedStepCount > 0 ? `${removedStepCount} removed step${removedStepCount === 1 ? "" : "s"}` : null,
    cancelledStepCount > 0 ? `${cancelledStepCount} cancelled step${cancelledStepCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const finalizedBy = rfq.finalized_by;
  const finalizedDate = rfq.finalized_date ? fmtDateOnly(rfq.finalized_date) : null;

  // Call-off provenance (set only for ARC call-off POs, which have no RFQ).
  const isCallOff = !!po.is_call_off;
  const callOff = po.call_off || {};
  const arcHref = callOff.arc_id
    ? `/dashboard/buyer/rate-contracts/${callOff.arc_id}?stage=active`
    : null;
  const mrHref = callOff.mr_id
    ? `/dashboard/buyer/material-requisitions/${callOff.mr_id}`
    : null;

  return (
    <div className={styles.page}>
      <Breadcrumb onBack={handleBack} current={po.po_number || po.id} />

      {/* Hero */}
      <section className={`${styles.detailHero} ${heroMod}`}>
        <div className={styles.detailHeroInner}>
          <div className={styles.heroIdBlock}>
            <div className={styles.hEye}>Purchase order</div>
            <h1>
              <span className={styles.poMono}>#{po.po_number || po.id}</span>
              <span className={`${styles.statusPill} ${statusTone(po.status)}`}>
                <span className={styles.dot} />
                {po.status_label || statusLabel(po.status)}
              </span>
            </h1>
            <div className={styles.hSub}>
              {vendor.name && <span className={styles.vendor}>{vendor.name}</span>}
              {vendor.name && <span className={styles.sep}>·</span>}
              <span className={styles.amount}>{inr(pricing.total ?? po.total_value)}</span>
              {rfq.number && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={`${styles.rfqLink} ${styles.mono}`}>RFQ #{rfq.number}</span>
                </>
              )}
              {isCallOff && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={`${styles.rfqLink} ${styles.mono}`}>
                    Released PO{callOff.arc_number ? ` · ${callOff.arc_number}` : ""}
                  </span>
                </>
              )}
            </div>

            {isPending && awaitingMe && (
              <div className={styles.heroWaiting}>
                <span className={styles.clockIc}>
                  <Clock size={14} />
                </span>
                <span>
                  Waiting on <strong>you</strong> for approval — review the details and take action.
                </span>
              </div>
            )}
            {/* Why the Initiate button is dead. Awarding a PO and initiating
                it are two different grants held by two mostly-disjoint sets of
                people, so the person looking at their own freshly-awarded
                draft is usually NOT the person who can move it on. Saying that
                out loud is the whole point of this note: silence here reads as
                a broken page. It names the permission rather than a role
                because roles are per-tenant and this page cannot know which
                one carries the grant here. */}
            {po.status === "draft" && !canWrite && (
              <div className={styles.heroPendingNote}>
                <span className={styles.clockIc}>
                  <AlertCircle size={14} />
                </span>
                <span>
                  This purchase order is still a draft and you cannot initiate it —
                  that needs the <strong>awarding · create</strong> permission for this
                  business unit, which your roles do not grant. Ask an administrator, or
                  whoever approves purchase orders here, to initiate it.
                </span>
              </div>
            )}
            {isPending && !awaitingMe && (
              <div className={styles.heroPendingNote}>
                <span className={styles.clockIc}>
                  <Clock size={14} />
                </span>
                <span>
                  Pending approval — currently with
                  {currentStepLabel ? ` ${currentStepLabel}` : ""}
                  {currentApproverNames ? `: ${currentApproverNames}` : ""}.
                </span>
              </div>
            )}
          </div>

          <div className={styles.heroActions}>
            {poDocUrl ? (
              <a
                className={`${styles.btn} ${styles.btnSecondary}`}
                href={poDocUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={13} />
                Download PO
              </a>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                type="button"
                disabled
                title="PO document not available yet"
              >
                <Download size={13} />
                Download PO
              </button>
            )}
            {/* Force Initiate. A user without the grant still SEES the control,
                disabled and captioned (see the note under the hero) — the
                button used to be omitted outright, which told a finaliser who
                cannot initiate their own draft nothing at all and sent them to
                support instead of to whoever holds the permission. Most people
                who award a PO do not hold `awarding.create`: in production 53
                users can finalise (`quote-compare.create`) and 32 can
                initiate, and only 4 of the finalisers are in that second set. */}
            {po.status === "draft" && (
              <button
                /* Neutral, not green, when it cannot be pressed: `btnSuccess`
                   only fades to 0.6 opacity when disabled, which still reads
                   as the page's primary call to action and invites the click
                   it will not accept. The unavailable state should look like
                   the disabled "Download PO" beside it. */
                className={`${styles.btn} ${canWrite ? styles.btnSuccess : styles.btnSecondary}`}
                type="button"
                disabled={initiating || !canWrite}
                onClick={canWrite ? handleForceInitiate : undefined}
                title={
                  canWrite
                    ? undefined
                    : "You do not have permission to initiate a purchase order for this business unit."
                }
              >
                <Send size={13} />
                {initiating ? "Initiating…" : "Force Initiate"}
              </button>
            )}
            {isPending && awaitingMe && canApprove && (
              <>
                <button
                  className={`${styles.btn} ${styles.btnDangerStrong}`}
                  type="button"
                  disabled={!!submitting}
                  onClick={() => setRejectOpen(true)}
                >
                  <X size={13} />
                  Reject
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  type="button"
                  disabled={!!submitting}
                  onClick={() => decide("approved")}
                >
                  <Check size={14} strokeWidth={2.4} />
                  Approve PO
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <main className={`${styles.pageBody} ${styles.pageBodyAside}`}>
        {/* LEFT */}
        <div className={styles.sectionStack}>
          {/* Decision summary — hidden when empty */}
          {decisionChecks.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <ShieldCheck size={13} />
                  </div>
                  <h2>Decision summary</h2>
                  <span className={`${styles.pill} ${styles.pillSuccess}`}>
                    {passedChecks} of {decisionChecks.length} checks pass
                  </span>
                </div>
              </div>
              <div className={styles.decisionGrid}>
                {decisionChecks.map((c, i) => (
                  <div
                    key={i}
                    className={`${styles.decisionCell} ${
                      c.status === "ok"
                        ? styles.dcOk
                        : c.status === "warn"
                        ? styles.dcWarn
                        : c.status === "err"
                        ? styles.dcErr
                        : styles.dcNeutral
                    }`}
                  >
                    <span className={styles.checkIc}>
                      {c.status === "ok" ? (
                        <Check size={13} strokeWidth={2.4} />
                      ) : c.status === "warn" ? (
                        <AlertCircle size={13} />
                      ) : c.status === "err" ? (
                        <X size={13} />
                      ) : (
                        <Circle size={13} />
                      )}
                    </span>
                    <div className={styles.meta}>
                      <div className={styles.k}>{c.k}</div>
                      <div className={styles.v}>{c.v}</div>
                      {c.sub && <div className={styles.vSub}>{c.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Items & pricing */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div className={styles.hLeft}>
                <div className={styles.ic}>
                  <Boxes size={13} />
                </div>
                <h2>Items &amp; pricing</h2>
                <span className={styles.pill}>
                  {items.length} line item{items.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">GST %</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className={styles.itIdx}>{String(idx + 1).padStart(2, "0")}</td>
                    <td>
                      <div className={styles.itName}>{it.name}</div>
                      {it.size && (
                        <div className={styles.itSpec}>
                          <span className={styles.itLabel}>Product size: </span>{it.size}
                        </div>
                      )}
                      {it.spec && (
                        <div className={styles.itSpec}>
                          <span className={styles.itLabel}>Product specification:</span>
                          <ReadMore content={it.spec} maxLines={2} />
                        </div>
                      )}
                      {it.comment && (
                        <div className={styles.itSpec}>
                          <span className={styles.itLabel}>Comment:</span>
                          <ReadMore content={it.comment} maxLines={2} />
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {it.quantity}
                      {it.unit && <span className={styles.itUnit}>{it.unit}</span>}
                    </td>
                    <td className="num">{inr(it.unit_price)}</td>
                    <td className="num">
                      {it.gst != null
                        ? `${it.gst}% (${inr((it.quantity * it.unit_price * it.gst) / 100)})`
                        : "—"}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {inr(itemAmount(it))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Subtotal — the line-items roll-up, one aggregate per column
                    directly under the column it aggregates. The label sits
                    leftmost (it used to be pinned hard right behind a colSpan
                    of 5) so it reads as the row's heading rather than as an
                    afterthought floating above the amount. Qty sums; unit price
                    and GST % are weighted averages, both labelled "avg" so
                    neither can be misread as a total. */}
                <tr className="subtotal">
                  <td colSpan={2}>Subtotal</td>
                  <td
                    className="num"
                    title={
                      mixedUnits
                        ? "The lines are measured in different units — this is a raw count of quantities, not a quantity in any one unit."
                        : undefined
                    }
                  >
                    {totalQty > 0 ? (
                      <>
                        {Number(totalQty.toFixed(3))}
                        {uniformUnit && <span className={styles.itUnit}>{uniformUnit}</span>}
                        {/* The user asked for a per-column total, so the sum
                            stays — but a bare "624.799" under a column reading
                            nos / pieces / cm invites being read as a quantity.
                            Say what it is instead of leaving it to be guessed. */}
                        {mixedUnits && <span className={styles.aggMixed}> mixed units</span>}
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                  <td
                    className="num"
                    title={
                      mixedUnits
                        ? "No average rate: the lines are priced in different units, so there is no price per unit to state."
                        : undefined
                    }
                  >
                    {avgUnitPrice != null ? (
                      <>
                        {inr(avgUnitPrice)}
                        <span className={styles.aggNote}> avg</span>
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="num">
                    {avgGstPct != null ? (
                      <>
                        {avgGstPct.toFixed(2)}%<span className={styles.aggNote}> avg</span>
                        <span className={styles.taxNote}> ({inr(totalLineTax)})</span>
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="num">{inr(computedSubtotal)}</td>
                </tr>

                {/* Other charges — accordion, one row per charge + tax sub-row */}
                {showOtherCharges && (
                  <>
                    <tr
                      className={styles.sectionHeadRow}
                      style={{ cursor: "pointer" }}
                      onClick={() => setOtherChargesOpen((o) => !o)}
                    >
                      <td colSpan={5}>
                        Other charges
                        <ChevronDown size={13} style={{ marginLeft: 5, verticalAlign: "middle", transition: "transform 0.2s", transform: otherChargesOpen ? "rotate(180deg)" : "none" }} />
                      </td>
                      <td className="num">{inr(totalOtherCharges)}</td>
                    </tr>
                    {otherChargesOpen && previewLines.flatMap((line, i) => {
                      const it = items[i];
                      if (!line.charges.length) return [];
                      return line.charges.map((c, j) => {
                        const orig = it?.charges_meta?.other_charges?.[j];
                        const rateMeta = orig?.amount_mode === "percentage" ? `${orig.amount}%` : "";
                        return (
                          <tr key={`${i}-${j}`} className={styles.breakdownRow}>
                            <td colSpan={4} className={styles.breakdownLabel}>
                              {it?.name}{c.name ? ` — ${c.name}` : ""}
                            </td>
                            <td className={styles.breakdownMeta}>{rateMeta}</td>
                            <td className={`num ${styles.breakdownAmt}`}>
                              {inr(c.amount)}
                              {(c.tax || 0) > 0 && (
                                <span className={styles.taxNote}> + tax ({inr(c.tax)})</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </>
                )}

                {/* Global charges — accordion with per-charge base + additional tax sub-row */}
                {showGlobalCharges && (
                  <>
                    <tr
                      className={styles.sectionHeadRow}
                      style={{ cursor: "pointer" }}
                      onClick={() => setGlobalChargesOpen((o) => !o)}
                    >
                      <td colSpan={5}>
                        Global charges
                        <ChevronDown size={13} style={{ marginLeft: 5, verticalAlign: "middle", transition: "transform 0.2s", transform: globalChargesOpen ? "rotate(180deg)" : "none" }} />
                      </td>
                      <td className="num">{inr(totalGlobalCharges)}</td>
                    </tr>
                    {globalChargesOpen && previewGlobal.map((gc, i) => (
                      <tr key={i} className={styles.breakdownRow}>
                        <td colSpan={4} className={styles.breakdownLabel}>{gc.name}</td>
                        <td className={styles.breakdownMeta}>{gc.mode === "percentage" ? `${gc.rate}%` : ""}</td>
                        <td className={`num ${styles.breakdownAmt}`}>
                          {inr(gc.amount)}
                          {(gc.additional_tax || 0) > 0 && (
                            <span className={styles.taxNote}> + tax ({inr(gc.additional_tax)})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Freight + insurance (existing global shipping charges) */}
                {freightInsurance > 0 && (
                  <tr className="subtotal">
                    <td colSpan={5}>Freight + insurance</td>
                    <td className="num">{inr(freightInsurance)}</td>
                  </tr>
                )}

                {/* Grand total — label leftmost like Subtotal. The qty / unit
                    price / GST % cells stay empty on purpose: this row adds
                    other + global charges, which carry no quantity and whose
                    tax is not line GST, so there is no honest figure to put
                    under those three columns. A blank beats a number that
                    reconciles with nothing. */}
                <tr className="total">
                  <td colSpan={5}>Grand total</td>
                  <td className="num">{inr(pricing.total ?? po.total_value)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Vendor profile */}
          {vendor.name && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <Building2 size={13} />
                  </div>
                  <h2>Vendor profile</h2>
                </div>
              </div>
              <div className={styles.vendorProfile}>
                <div className={`${styles.vLogo} ${avatarClass(null, vendor.name)}`}>
                  {vendor.short || initialsOf(vendor.name)}
                </div>
                <div className={styles.vMain}>
                  <div className={styles.vName}>{vendor.name}</div>
                  {vendor.tagline && <div className={styles.vTagline}>{vendor.tagline}</div>}
                  <div className={styles.vMeta}>
                    {vendor.gstin && (
                      <VRow icon={<FileText size={12} />} label="GSTIN" value={vendor.gstin} />
                    )}
                    {vendor.pan && <VRow icon={<FileText size={12} />} label="PAN" value={vendor.pan} />}
                    {vendor.phone && <VRow icon={<Phone size={12} />} label="Contact" value={vendor.phone} />}
                    {vendor.email && <VRow icon={<Mail size={12} />} label="Email" value={vendor.email} />}
                    {vendor.bank && <VRow icon={<CreditCard size={12} />} label="Bank" value={vendor.bank} />}
                    {vendor.contact && <VRow icon={<User size={12} />} label="Primary" value={vendor.contact} />}
                  </div>
                </div>
                {(vendor.rating != null || vendor.past_orders != null || vendor.on_time_delivery != null) && (
                  <div className={styles.vStats}>
                    {vendor.rating != null && (
                      <>
                        <div className={styles.statV}>{vendor.rating} ★</div>
                        <div className={styles.stat}>Vendor rating</div>
                      </>
                    )}
                    {vendor.past_orders != null && (
                      <>
                        <div className={`${styles.statV} ${styles.mt}`}>{vendor.past_orders}</div>
                        <div className={styles.stat}>Prior POs</div>
                      </>
                    )}
                    {vendor.on_time_delivery != null && (
                      <>
                        <div className={`${styles.statV} ${styles.mt}`}>{vendor.on_time_delivery}%</div>
                        <div className={styles.stat}>On-time delivery</div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {(Array.isArray(vendor.flags) && vendor.flags.length > 0) ||
              vendor.avg_delay ||
              vendor.past_value ? (
                <div className={styles.vendorFlags}>
                  {(vendor.flags || []).map((f, i) => {
                    const label = typeof f === "string" ? f : f.label;
                    const type = typeof f === "object" ? f.type : "neutral";
                    return (
                      <span
                        key={i}
                        className={`${styles.pill} ${type === "success" ? styles.pillSuccess : styles.pillNeutral}`}
                      >
                        <span className={styles.pdot} />
                        {label}
                      </span>
                    );
                  })}
                  {vendor.avg_delay && (
                    <span className={`${styles.pill} ${styles.pillOutline}`}>
                      Avg delay <span className={styles.mono} style={{ marginLeft: 3, color: "var(--fg)" }}>{vendor.avg_delay}</span>
                    </span>
                  )}
                  {vendor.past_value && (
                    <span className={`${styles.pill} ${styles.pillOutline}`}>
                      Past value <span className={styles.mono} style={{ marginLeft: 3, color: "var(--fg)" }}>₹{vendor.past_value}</span>
                    </span>
                  )}
                </div>
              ) : null}
            </section>
          )}

          {/* RFQ context */}
          {(rfq.title || rfq.number) && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>RFQ context</h2>
                </div>
                <div className={styles.hRight}>
                  {rfq.id && (
                    <button
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                      type="button"
                      onClick={() => router.push(`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${rfq.id}`)}
                    >
                      <ExternalLink size={12} />
                      Open RFQ
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.rfqContext}>
                <div className={styles.rfqIc}>
                  <FileText size={16} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.title}>
                    <span>{rfq.title}</span>
                    {rfq.number && (
                      <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>#{rfq.number}</span>
                    )}
                  </div>
                  <div className={styles.sub}>
                    {[rfq.company, rfq.business_unit, rfq.department].filter(Boolean).map((v, i, arr) => (
                      <React.Fragment key={i}>
                        <span>{v}</span>
                        {i < arr.length - 1 && <span className={styles.sep}>·</span>}
                      </React.Fragment>
                    ))}
                    {rfq.vendors_participated != null && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span>
                          <span className={styles.em}>
                            {rfq.vendors_participated}
                            {rfq.vendors_invited != null ? ` of ${rfq.vendors_invited}` : ""}
                          </span>{" "}
                          vendors quoted
                        </span>
                      </>
                    )}
                    {rfq.rounds != null && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span>
                          <span className={styles.em}>{rfq.rounds} rounds</span> of negotiation
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {finalizedBy && (
                <div className={styles.rfqFinalized}>
                  Vendor selection finalized by <strong>{finalizedBy}</strong>
                  {finalizedDate && (
                    <>
                      {" "}
                      on <strong className={styles.mono}>{finalizedDate}</strong>
                    </>
                  )}{" "}
                  based on commercial evaluation.
                </div>
              )}
            </section>
          )}

          {/* Call-off source — for ARC call-off POs (no RFQ). Links back to the
              originating rate contract and material requisition. */}
          {isCallOff && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>Released PO source</h2>
                </div>
                <div className={styles.hRight}>
                  {arcHref && (
                    <Link href={arcHref} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                      <ExternalLink size={12} />
                      Open rate contract
                    </Link>
                  )}
                </div>
              </div>
              <div className={styles.rfqContext}>
                <div className={styles.rfqIc}>
                  <FileText size={16} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.title}>
                    {arcHref ? (
                      <Link href={arcHref} className={styles.rfqLink} style={{ textDecoration: "none" }}>
                        {callOff.arc_title || "Rate contract"}
                      </Link>
                    ) : (
                      <span>{callOff.arc_title || "Rate contract"}</span>
                    )}
                    {callOff.arc_number && (
                      <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>
                        {callOff.arc_number}
                      </span>
                    )}
                  </div>
                  <div className={styles.sub}>
                    {[rfq.company, rfq.business_unit, rfq.department].filter(Boolean).map((v, i, arr) => (
                      <React.Fragment key={i}>
                        <span>{v}</span>
                        {i < arr.length - 1 && <span className={styles.sep}>·</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {callOff.mr_number && (
                <div className={styles.rfqFinalized}>
                  Released against material requisition{" "}
                  {mrHref ? (
                    <Link href={mrHref} className={styles.mono} style={{ fontWeight: 600 }}>
                      {callOff.mr_number}
                    </Link>
                  ) : (
                    <strong className={styles.mono}>{callOff.mr_number}</strong>
                  )}{" "}
                  at contracted rates — no fresh sourcing required.
                </div>
              )}
            </section>
          )}

          {/* Technical evaluation — per product clause marks + % + approver.
              Hidden only when no product in this PO has a technical evaluation. */}
          {techEval.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <ClipboardCheck size={13} />
                  </div>
                  <h2>Technical evaluation</h2>
                  <span className={styles.pill}>
                    {techEval.length} {techEval.length === 1 ? "product" : "products"}
                  </span>
                </div>
              </div>

              <div className={styles.teList}>
                {techEval.map((t, i) => {
                  const meta = TE_STATUS[t.status] || TE_STATUS.evaluated;
                  return (
                    <div key={i} className={styles.teProduct}>
                      <div className={styles.teProductHead}>
                        <div className={styles.teProductName}>{t.product}</div>
                        <div className={styles.teProductMeta}>
                          {t.round != null && (
                            <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>
                              Round {t.round}
                            </span>
                          )}
                          {t.percentage != null && (
                            <span className={`${styles.teScore} ${styles[meta.cls]}`}>
                              {t.percentage}%
                            </span>
                          )}
                          <span className={`${styles.teStatusPill} ${styles[meta.cls]}`}>
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <div className={styles.teSubMeta}>
                        {t.minimum_passing_score != null && (
                          <span>
                            Passing mark{" "}
                            <span className={styles.mono}>{t.minimum_passing_score}%</span>
                          </span>
                        )}
                        <span className={styles.teApprover}>
                          {t.approver ? (
                            <>
                              Approved by <strong>{t.approver}</strong>
                              {t.approved_at ? (
                                <span className={styles.when}> · {fmtDateTime(t.approved_at)}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className={styles.teMuted}>Evaluation approval pending</span>
                          )}
                        </span>
                      </div>

                      {t.clauses && t.clauses.length > 0 ? (
                        <table className={styles.teClauseTable}>
                          <thead>
                            <tr>
                              <th>Clause</th>
                              <th className={styles.num}>Max</th>
                              <th className={styles.num}>Obtained</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.clauses.map((c, ci) => {
                              const max = c.max_marks != null ? c.max_marks : null;
                              const got = c.obtained_marks;
                              const pct = max && got != null ? Math.max(0, Math.min(100, (got / max) * 100)) : 0;
                              return (
                                <tr key={ci}>
                                  <td>
                                    <div className={styles.teClauseText}>{c.clause_text}</div>
                                    {max != null && got != null && (
                                      <div className={styles.teClauseBar}>
                                        <span style={{ width: `${pct}%` }} />
                                      </div>
                                    )}
                                  </td>
                                  <td className={`${styles.num} ${styles.mono}`}>{max != null ? max : "—"}</td>
                                  <td className={`${styles.num} ${styles.mono}`}>
                                    {got != null ? got : <span className={styles.teMuted}>—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className={styles.teMuted}>No clause-level marks recorded.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quote comparison */}
          {comparison.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <BarChart2 size={13} />
                  </div>
                  <h2>Quote comparison</h2>
                  <span className={styles.pill}>{comparison.length} bidders</span>
                </div>
              </div>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>GSTIN</th>
                    <th className="num">Quoted</th>
                    <th className="num">Delivery</th>
                    <th className="num">Δ vs L1</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((v, i) => (
                    <tr key={i} className={v.is_winner ? styles.isWinner : undefined}>
                      <td>
                        <div className={styles.vCell}>
                          <div className={`${styles.vAvatar} ${avatarClass(null, v.vendor)}`}>
                            {v.short || initialsOf(v.vendor)}
                          </div>
                          <div className={styles.vn}>{v.vendor}</div>
                          {v.is_winner && (
                            <span className={styles.winnerMarker}>
                              <Check size={9} strokeWidth={3} />
                              Awarded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.gstinCell}>{v.gstin || "—"}</td>
                      <td className="num">
                        <span className={v.is_winner ? styles.winnerAmt : undefined}>{inr(v.amount)}</span>
                      </td>
                      <td className="num">{v.delivery_days != null ? `${v.delivery_days} days` : "—"}</td>
                      <td className="num">
                        {v.is_winner ? (
                          <span className={styles.saving}>— Baseline</span>
                        ) : (
                          <span className={styles.over}>{v.delta_pct != null ? `${v.delta_pct}%` : "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>Documents &amp; attachments</h2>
                  <span className={styles.pill}>{docs.length} files</span>
                </div>
              </div>
              <div className={styles.docsList}>
                {docs.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.url || "#"}
                    target={doc.url ? "_blank" : undefined}
                    rel="noreferrer"
                    className={`${styles.docItem} ${styles[doc.type] || ""}`}
                  >
                    <div className={styles.fileIc}>
                      <FileText size={14} />
                    </div>
                    <div className={styles.meta}>
                      <div className={styles.name}>{doc.name}</div>
                      <div className={styles.sub}>
                        {[doc.kind, doc.size].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <Download size={14} className={styles.dl} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Payment terms */}
          {paymentTerms.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <IndianRupee size={13} />
                  </div>
                  <h2>Payment terms</h2>
                </div>
              </div>
              <div className={styles.milestoneList}>
                {paymentTerms.map((m, i) => (
                  <div key={i} className={styles.milestoneRow}>
                    <span className={styles.mNum}>{String(m.num ?? i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className={styles.mName}>{m.name}</div>
                      {m.due && <div className={styles.mDue}>{m.due}</div>}
                    </div>
                    <div className={styles.mPct}>{m.pct != null ? `${m.pct}%` : ""}</div>
                    <div className={styles.mAmt}>{inr(m.amount)}</div>
                    <span className={`${styles.pill} ${styles.pillNeutral}`}>Scheduled</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT (sticky aside) */}
        <div>
          <div className={styles.asideStack}>
            {/* Calm read-only note — pending, but not awaiting the current user */}
            {isPending && !awaitingMe && (
              <div className={styles.pendingNoteCard}>
                <div className={styles.pnHead}>
                  <Clock size={13} />
                  <span>Pending approval</span>
                </div>
                <div className={styles.pnBody}>
                  Currently with
                  {currentStepLabel ? ` ${currentStepLabel}` : ""}
                  {currentApproverNames ? `: ${currentApproverNames}` : ""}.
                  {" "}No action is required from you right now.
                </div>
              </div>
            )}

            {/* Action card */}
            {isPending && awaitingMe && canApprove && (
              <div className={styles.actionCard}>
                <div className={styles.acHead}>
                  <div className={styles.hereNow}>Your action required</div>
                  <div className={styles.title}>
                    {currentStepLabel ? `${currentStepLabel} approval · You` : "Approval · You"}
                  </div>
                  <div className={styles.sub}>
                    Approve to route to the next approver. Rejecting asks you for a reason and
                    returns the PO to the initiator.
                  </div>
                </div>
                <div className={styles.acBody}>
                  <textarea
                    className={styles.acComment}
                    placeholder="Add a comment for next approver or audit trail (optional)…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className={styles.acCta}>
                    {/* Same action as the top-right control, so: same danger
                        theme and the same modal. It used to be btnSecondary —
                        white-on-black — which made one of the two Reject
                        buttons on the page look like a neutral, reversible
                        thing. */}
                    <button
                      className={`${styles.btn} ${styles.btnDangerStrong}`}
                      type="button"
                      disabled={!!submitting}
                      onClick={() => setRejectOpen(true)}
                    >
                      <X size={12} />
                      {submitting === "rejected" ? "Rejecting…" : "Reject"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSuccess}`}
                      type="button"
                      disabled={!!submitting}
                      onClick={() => decide("approved")}
                    >
                      <Check size={13} strokeWidth={2.4} />
                      {submitting === "approved" ? "Approving…" : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Audit trail — full PO lifecycle */}
            {workflow.length > 0 && (
              <div className={styles.workflowCard}>
                <div className={styles.wfHead}>
                  <span>Audit trail</span>
                  <span className={styles.wfProgress}>
                    {doneSteps} of {activeWorkflowSteps.length} done
                    {workflowExcludedSuffix ? ` · ${workflowExcludedSuffix}` : ""}
                  </span>
                </div>
                {workflow.map((w, i) => {
                  const isRejected = w.status === "rejected";
                  const reasonText = isRejected ? w.reason || w.policy : null;
                  // The full roster arrives only from the newer backend. With an
                  // old payload it is absent and the node falls back to exactly
                  // what it rendered before: one `by` name + the `policy` string.
                  const roster = Array.isArray(w.approvers) && w.approvers.length > 0 ? w.approvers : null;
                  // The rejection reason is the rejecter's own action comment, so
                  // once the roster prints it against their name the step-level
                  // copy is the same sentence twice in a 270px column. Drop the
                  // unattributed one — but only when the roster really carries it,
                  // so a payload with no per-approver comment still shows a reason.
                  const reasonOnRoster =
                    !!roster && !!reasonText &&
                    roster.some((a) => String(a?.comment || "").trim() === String(reasonText).trim());
                  const stepClass = WF_STEP_CLASS[w.status] || WF_STEP_CLASS.pending;
                  const stepChip = WF_STEP_CHIP[w.status] ?? titleCaseStatus(w.status);
                  return (
                    <div key={i} className={`${styles.wfStep} ${styles[stepClass]}`}>
                      <div className={styles.wfNode} />
                      <div className={styles.body}>
                        <div className={styles.stepName}>{w.title}</div>
                        {!roster && w.by && (
                          <div className={styles.stepMeta}>
                            <span className={`${styles.miniAv} ${avatarClass(null, w.by)}`}>
                              {initialsOf(w.by)}
                            </span>
                            <span className={styles.byName}>{w.by}</span>
                          </div>
                        )}
                        {w.when && (
                          <div className={styles.stepWhen}>{fmtDateTime(w.when)}</div>
                        )}
                        {isRejected ? (
                          !reasonOnRoster && (
                            <div className={styles.stepMeta} style={{ marginTop: 4 }}>
                              <span className={styles.rejectReason}>
                                {reasonText ? `Reason: “${reasonText}”` : "Rejected (no reason given)"}
                              </span>
                            </div>
                          )
                        ) : (
                          !roster && w.policy && (
                            <div className={styles.stepMeta} style={{ marginTop: 4 }}>
                              <span className={styles.policy}>{w.policy}</span>
                            </div>
                          )
                        )}
                        {roster && (
                          <ApproverRoster
                            approvers={roster}
                            stepStatus={w.status}
                            rule={w.decision_rule}
                            addedMidFlight={w.step_added_mid_flight === true}
                            removedMidFlight={w.step_removed_mid_flight === true}
                          />
                        )}
                      </div>
                      <div className={styles.rightStat}>{stepChip}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Key dates */}
            {keyDates.length > 0 && (
              <div className={styles.datesCard}>
                <div className={styles.dHead}>Key dates</div>
                {keyDates.map((d, i) => (
                  <div key={i} className={`${styles.dRow} ${d.soon ? styles.dSoon : ""}`}>
                    <span className={styles.k}>{d.k}</span>
                    <span className={styles.v}>{fmtMaybeDate(d.v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Activity */}
            {activity.length > 0 && (
              <div className={styles.workflowCard}>
                <div className={styles.wfHead}>
                  <span>Activity</span>
                  <span className={styles.wfProgress}>{activity.length} events</span>
                </div>
                <div className={styles.activityList}>
                  {activity.map((a, i) => {
                    const cls =
                      a.type === "approved"
                        ? styles.aiApproved
                        : a.type === "rejected"
                        ? styles.aiRejected
                        : styles.aiComment;
                    const isOk = a.dot === "ok";
                    return (
                      <div key={i} className={`${styles.activityItem} ${cls}`}>
                        <div className={`${styles.aDot} ${isOk ? "" : avatarClass(null, a.who)}`}>
                          {isOk ? "✓" : initialsOf(a.who)}
                        </div>
                        <div className={styles.aBody}>
                          <div className={styles.aMsg}>
                            <span className={styles.who}>{a.who}</span> {a.msg}
                          </div>
                          {a.when && <div className={styles.aWhen}>{fmtDateTime(a.when)}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Buyer + Vendor documents — sticky wrapper so both cards stay pinned */}
            {((rfqDocs && (rfqDocs.rfq_level.length > 0 || rfqDocs.products.length > 0)) ||
              (vendorDocs && (vendorDocs.quote_level.length > 0 || vendorDocs.products.length > 0))) && (
              <div className={styles.docsSticky}>
                {rfqDocs && (rfqDocs.rfq_level.length > 0 || rfqDocs.products.length > 0) && (
                  <DocAsideCard title="Buyer documents" sections={[
                    rfqDocs.rfq_level.length > 0 && { label: "RFQ level", files: rfqDocs.rfq_level },
                    ...rfqDocs.products.map((p) => ({ label: p.name, files: p.files })),
                  ].filter(Boolean)} />
                )}
                {vendorDocs && (vendorDocs.quote_level.length > 0 || vendorDocs.products.length > 0) && (
                  <DocAsideCard title="Vendor documents" sections={[
                    vendorDocs.quote_level.length > 0 && { label: "Quote level", files: vendorDocs.quote_level },
                    ...vendorDocs.products.map((p) => ({ label: p.name, files: p.files })),
                  ].filter(Boolean)} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject confirmation — the reason is collected HERE, at the moment of
          the decision, by both Reject buttons on this page. Confirm stays
          disabled until a reason is typed (ConfirmationModal's requireComment),
          so the requirement is visible before it is enforced instead of
          arriving as a toast pointing at an off-screen textarea.

          `description` is the modal's one dangerouslySetInnerHTML prop, and the
          vendor name is vendor-authored, so both interpolations are escaped
          (see escapeHtml). Anything added to this string later must be too. */}
      <ConfirmationModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => decide("rejected", reason)}
        title="Reject this purchase order?"
        description={`PO #${escapeHtml(po.po_number || po.id)} will be rejected and returned to the initiator, and ${
          escapeHtml(vendor.name) || "the vendor"
        } will be notified. This cannot be undone — a new PO has to be raised to proceed.`}
        confirmButtonColor="danger"
        confirmButtonText="Reject PO"
        cancelButtonText="Cancel"
        showCloseButton
        requireComment
        commentLabel="Reason for rejection"
        commentPlaceholder="Why is this PO being rejected? The initiator and the audit trail will show this."
      />
    </div>
  );
};

/* ── Audit-trail approver roster ────────────────────────────────────────────
   Every approver on a level, each with their own status and timestamp.

   The trail used to print one name and the string "7 approvers", so a level
   where one of seven had approved looked identical to a level where one of
   seven had been removed and six had never been asked. Two aggregates are kept
   deliberately separate: REMOVED rows are rendered (they are part of what
   happened) but never counted in the "N of M" and never surfaced as the
   level's headline actor — a removed approver reading as live was a production
   P0.

   Counts are derived from the rows this component actually renders rather than
   from a separate server total, so the fraction can never disagree with what
   the reader can count on screen. */
const ApproverRoster = ({ approvers, stepStatus, rule, addedMidFlight, removedMidFlight }) => {
  const [expanded, setExpanded] = useState(false);

  const rows = approvers.map((a) => ({ a, key: effectiveApproverStatus(a, stepStatus, rule) }));
  const ordered = rows
    .map((r, i) => ({ ...r, i }))
    .sort((x, y) => (APPROVER_RANK[x.key] ?? 9) - (APPROVER_RANK[y.key] ?? 9) || x.i - y.i);

  const count = (k) => rows.filter((r) => r.key === k).length;
  const removedCount = count("REMOVED");
  const activeTotal = rows.length - removedCount;
  const approvedCount = count("APPROVED");
  // Who unblocked the level — named on the rows of people who therefore never
  // had to act, so "Not required" answers its own "why?".
  const clearedBy = rows
    .filter((r) => r.key === "APPROVED")
    .map((r) => r.a?.name)
    .filter(Boolean)
    .join(", ");

  const summary = [
    `${approvedCount} of ${activeTotal} approved`,
    count("REJECTED") > 0 ? `${count("REJECTED")} rejected` : null,
    count("PENDING") > 0 ? `${count("PENDING")} awaiting` : null,
    count("NOT_REQUIRED") > 0 ? `${count("NOT_REQUIRED")} not required` : null,
    count("NOT_REACHED") > 0 ? `${count("NOT_REACHED")} not reached` : null,
    removedCount > 0 ? `${removedCount} removed` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const ruleKey = String(rule || "").toUpperCase();
  const ruleLabel = RULE_LABEL[ruleKey] || null;

  const hidden = Math.max(0, ordered.length - ROSTER_VISIBLE);
  const visible = expanded || hidden === 0 ? ordered : ordered.slice(0, ROSTER_VISIBLE);

  return (
    <div className={styles.roster}>
      <div className={styles.rosterHead}>
        <span className={styles.rosterSummary}>{summary}</span>
        {ruleLabel && (
          <span className={styles.ruleBadge} title={`Decision rule: ${ruleKey}`}>{ruleLabel}</span>
        )}
      </div>
      {(addedMidFlight || removedMidFlight) && (
        <div className={styles.rosterFlags}>
          {addedMidFlight && <span className={styles.rFlag}>Level added mid-flight</span>}
          {removedMidFlight && <span className={styles.rFlag}>Level removed mid-flight</span>}
        </div>
      )}
      {visible.map(({ a, key }, idx) => {
        const state = APPROVER_STATE[key] || APPROVER_STATE.PENDING;
        const isRemoved = key === "REMOVED";
        const meta = [a?.designation, a?.department].filter(Boolean).join(" · ");
        const when = isRemoved ? a?.removed_at : a?.acted_at;
        const detail = isRemoved
          ? `Removed · ${removalReasonLabel(a?.removal_reason)}`
          : key === "NOT_REQUIRED"
          ? clearedBy
            ? `Did not need to act — cleared by ${clearedBy}`
            : "Did not need to act — the step cleared without them"
          : key === "NOT_REACHED"
          ? "The step closed before reaching this approver"
          : null;
        return (
          <div
            key={a?.user_id ?? `${key}-${idx}`}
            className={`${styles.rosterRow} ${isRemoved ? styles.rRemovedRow : ""}`}
          >
            <span className={`${styles.rAv} ${avatarClass(null, a?.name)}`}>{initialsOf(a?.name)}</span>
            <div className={styles.rMain}>
              <div className={styles.rName}>{a?.name || "Approver"}</div>
              {meta && <div className={styles.rMeta}>{meta}</div>}
              {a?.added_mid_flight === true && <span className={styles.rFlag}>Added mid-flight</span>}
              {detail && <div className={styles.rDetail}>{detail}</div>}
              {a?.comment && <div className={styles.rComment}>“{a.comment}”</div>}
            </div>
            <div className={styles.rSide}>
              <span
                className={`${styles.rStatus} ${styles[state.cls]}`}
                title={a?.status ? `Recorded status: ${a.status}` : undefined}
              >
                {state.label}
              </span>
              {when && <span className={styles.rWhen}>{fmtDateTime(when)}</span>}
            </div>
          </div>
        );
      })}
      {hidden > 0 && (
        <button type="button" className={styles.rosterMore} onClick={() => setExpanded((o) => !o)}>
          {expanded ? "Show fewer" : `Show all ${ordered.length} approvers`}
        </button>
      )}
    </div>
  );
};

const fileDisplayName = (url) => {
  try {
    const seg = new URL(url).pathname.split("/").pop();
    const name = decodeURIComponent(seg);
    return name.length > 40 ? name.slice(0, 37) + "…" : name || "File";
  } catch {
    return "File";
  }
};

const DocAsideCard = ({ title, sections }) => (
  <div className={styles.docAsideCard}>
    <div className={styles.docAsideHead}>
      <FileText size={13} />
      {title}
    </div>
    {sections.map((sec, si) => (
      <div key={si} className={styles.docSection}>
        <div className={styles.docSectionLabel}>{sec.label}</div>
        {sec.files.map((f, fi) => (
          <div key={fi} className={styles.docFileRow}>
            <Download size={11} />
            {f.label && <span className={styles.docTypeBadge}>{f.label}</span>}
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docFileName}
              title={fileDisplayName(f.url)}
            >
              {fileDisplayName(f.url)}
            </a>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const VRow = ({ icon, label, value }) => (
  <div className={styles.row}>
    {icon}
    <span>{label}</span>
    <span className={styles.v}>{value}</span>
  </div>
);

const Breadcrumb = ({ onBack, current }) => (
  <div className={styles.breadcrumbStrip}>
    <div className={styles.breadcrumbInner}>
      <button type="button" className={styles.crumbBack} onClick={onBack}>
        <ArrowLeft size={13} />
        Back
      </button>
      <span className={styles.crumbSep}>/</span>
      <a onClick={onBack}>Purchase orders</a>
      <span className={styles.crumbSep}>/</span>
      <span className={`${styles.crumbCurrent} ${styles.mono}`}>#{current}</span>
    </div>
  </div>
);

const DetailSkeleton = ({ onBack }) => (
  <div className={styles.page}>
    <Breadcrumb onBack={onBack} current="…" />
    <section className={styles.detailHero}>
      <div className={styles.detailHeroInner}>
        <div className={styles.heroIdBlock}>
          <Sk w={110} h={11} style={{ marginBottom: 8 }} />
          <Sk w={280} h={30} style={{ marginBottom: 10 }} />
          <Sk w={380} h={13} />
        </div>
        <div className={styles.heroActions}>
          <Sk w={120} h={36} r={6} />
          <Sk w={120} h={36} r={6} />
        </div>
      </div>
    </section>
    <main className={`${styles.pageBody} ${styles.pageBodyAside}`}>
      <div className={styles.sectionStack}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skCard}>
            <Sk w={180} h={16} style={{ marginBottom: 16 }} />
            <Sk h={90} />
          </div>
        ))}
      </div>
      <div>
        <div className={styles.asideStack}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <Sk w={140} h={14} style={{ marginBottom: 14 }} />
              <Sk h={70} />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default PODetail;
