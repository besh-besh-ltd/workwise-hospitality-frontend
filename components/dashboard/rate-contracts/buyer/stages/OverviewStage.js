// Overview stage — extracted from the old [contractId]/index.js detail page.
// Vendor response tracker, items-in-scope (with past-consumption expanders),
// attachments, tender stats and key dates. The page hero, workflow stepper
// and quick-action links moved to the lifecycle shell / stage timeline.

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";
import storageInstance from "@/utils/storageInstance";
import { StageSkeleton, removalReasonLabel } from "./StageShared";
import { StageColumns, ActorFlowCard, ApprovalDecisionCard } from "./StageAside";

const vendorInitials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Read the logged-in user's id (creator gate for the re-publish CTA).
function currentUserId() {
  try {
    const raw = storageInstance.getStorage("user");
    if (!raw) return null;
    const u = typeof raw === "string" ? JSON.parse(raw) : raw;
    return u?.id ?? null;
  } catch { return null; }
}

const AV_PALETTE = ["av-warm", "av-sky", "av-indigo", "av-violet", "av-green", "av-zinc"];
const pickAv = (id) => {
  const n = String(id || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AV_PALETTE[n % AV_PALETTE.length];
};
const initialsOf = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
// `timestamp without time zone` columns (submission_start/end_at, and the
// submitted_at/responded_at/updated_at audit fields below) arrive as naive
// IST wall-clock strings. Slice the raw value instead of going through
// Date(), which would render in the VIEWER's local timezone (correct for an
// IST viewer, silently wrong otherwise).
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const m = String(iso).replace("T", " ").match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})/);
  if (!m) return "—";
  const [, , mo, da, hh, mi] = m;
  return `${da} ${MON_SHORT[Number(mo) - 1]}, ${hh}:${mi}`;
};
// Sr 40 — "Extend deadline" picker helpers. A <input type="datetime-local">
// wants "YYYY-MM-DDTHH:mm"; slice the raw naive string the same IST-safe way
// as fmtDateTime (no Date() parse) so the picker starts from the true stored
// value instead of the viewer's local rendering of it.
const toDateTimeLocalValue = (iso) => {
  if (!iso) return "";
  const m = String(iso).replace("T", " ").match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})/);
  if (!m) return "";
  const [, y, mo, da, hh, mi] = m;
  return `${y}-${mo}-${da}T${hh}:${mi}`;
};
// "Now" in IST for the picker's min= bound. Uses Intl (no moment-timezone
// dependency on the FE) so a non-IST browser still sees the correct IST wall
// clock as the floor — the server is the authoritative check regardless.
const nowIstDateTimeLocal = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};
const fmtMoney = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
};
const fmtQty = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
};
const daysUntil = (iso) => {
  if (!iso) return 0;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
};

function classifyInvitation(inv, quoteByVendor) {
  const q = quoteByVendor[inv.vendor_id];
  if (q && q.submitted_at) return "submitted";
  if (q) return "draft";
  if (inv.responded_at) return "submitted";
  return "none";
}

export default function OverviewStage({ arc, stage, lifecycle, permissions, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Sr 40 — "Extend deadline" control state.
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendValue, setExtendValue] = useState("");
  const [extending, setExtending] = useState(false);

  // Publish-approval gate state.
  const reason = stage?.reason;
  const isPendingPublish = reason === "pending_publish_approval";
  const isPublishRejected = reason === "publish_rejected";
  const publishSummary = stage?.publish_approval || null; // { status, current_step, can_user_approve }
  const [pubChain, setPubChain] = useState(null);  // full getApprovalInstanceDetails shape
  const [decideComment, setDecideComment] = useState("");
  const [decideBusy, setDecideBusy] = useState(false);

  useEffect(() => {
    if (!arc?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.getContractDetail(arc.id);
        if (cancelled) return;
        setData(res?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [arc?.id]);

  // Fetch the full publish-approval chain only while pending/rejected.
  useEffect(() => {
    if (!arc?.id || !(isPendingPublish || isPublishRejected)) { setPubChain(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await ArcApi.getPublishApproval(arc.id);
        if (!cancelled) setPubChain(res?.data?.approval || null);
      } catch { if (!cancelled) setPubChain(null); }
    })();
    return () => { cancelled = true; };
  }, [arc?.id, isPendingPublish, isPublishRejected]);

  const decidePublish = async (decision) => {
    // Sr 47 (Cap 2, Path A) — "Request changes" reuses the existing publish
    // reject mechanics 1:1 (same decision value, same status, same notify);
    // only the approver-facing copy is re-framed as a send-back, not a kill.
    if (decision === "reject" && !decideComment.trim()) {
      toast.error("Add a note describing what the creator should fix");
      return;
    }
    setDecideBusy(true);
    try {
      await ArcApi.publishApprovalDecide(arc.id, { decision, comment: decideComment.trim() || undefined });
      toast.success(decision === "approve" ? "Approved — rate contract going live" : "Changes requested — sent back to the creator");
      setDecideComment("");
      if (onRefresh) await onRefresh();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Could not record your decision";
      toast.error(typeof msg === "string" ? msg : "Could not record your decision");
    } finally {
      setDecideBusy(false);
    }
  };

  // Last rejection reason from the chain (or the ARC's closed_reason fallback).
  const rejectReason = useMemo(() => {
    if (arc?.closed_reason) return arc.closed_reason;
    const steps = pubChain?.steps || [];
    for (let i = steps.length - 1; i >= 0; i--) {
      const rej = (steps[i].approvers || []).find((a) => a.status === "REJECTED" && a.comment);
      if (rej) return rej.comment;
    }
    return null;
  }, [pubChain, arc?.closed_reason]);

  const isCreator = arc?.created_by != null && currentUserId() != null && Number(arc.created_by) === Number(currentUserId());

  const items = data?.items || [];
  const invitations = data?.invitations || [];
  const quotes = data?.quotes || [];
  const vendors = data?.vendors || {};

  // Sr 47 (Cap 1) — items carrying buyer-authored technical clauses, for the
  // read-only "Technical clauses for approval" panel on the pending-publish
  // gate. `tech_eval` is null when technical evaluation was skipped for that
  // item; clamp `minimum_passing_score` to ≤100 (legacy rows can exceed it).
  const itemsWithClauses = useMemo(
    () => items.filter((it) => it.tech_eval && Array.isArray(it.tech_eval.clauses) && it.tech_eval.clauses.length > 0),
    [items]
  );

  const quoteByVendor = useMemo(() => {
    const map = {};
    quotes.forEach((q) => { if (q.vendor_id != null) map[q.vendor_id] = q; });
    return map;
  }, [quotes]);

  const invitedCount = invitations.length;
  const submittedCount = useMemo(
    () => invitations.filter((inv) => classifyInvitation(inv, quoteByVendor) === "submitted").length,
    [invitations, quoteByVendor]
  );
  const responsePct = invitedCount > 0 ? Math.round((submittedCount / invitedCount) * 100) : 0;
  const daysToClose = daysUntil(arc?.submission_end_at);
  const isFloated = arc?.status === "floated";
  const windowClosed = !!stage?.window?.closed;

  // Sr 40 — "Extend deadline": pre-evaluation only (floated | submission_closed),
  // and only for the creator or someone holding arc-comm.evaluate / arc.admin
  // in this ARC's scope — mirrors the server-side authorization exactly.
  const canExtend = ["floated", "submission_closed"].includes(arc?.status)
    && (isCreator
      || (permissions?.["arc-comm"] || []).includes("evaluate")
      || (permissions?.["arc"] || []).includes("admin"));

  const openExtend = () => {
    setExtendValue(toDateTimeLocalValue(arc?.submission_end_at) || nowIstDateTimeLocal());
    setExtendOpen(true);
  };
  const handleExtend = async () => {
    if (!extendValue) { toast.error("Pick a new submission deadline"); return; }
    setExtending(true);
    try {
      await ArcApi.extendSubmission(arc.id, { submission_end_at: extendValue });
      toast.success("Submission deadline extended");
      setExtendOpen(false);
      if (onRefresh) await onRefresh();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      if (msg) toast.error(typeof msg === "string" ? msg : "Could not extend the deadline");
    } finally {
      setExtending(false);
    }
  };

  const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  if (loading) return <StageSkeleton />;
  if (!data?.arc) return <div className="empty-state"><h2>Contract not found</h2></div>;

  return (
    <>
      <style jsx>{`
        @media (min-width: 980px) {
          .detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start; }
          .detail-aside { position: sticky; top: 78px; }
        }
        @media (max-width: 979px) {
          .detail-grid { display: flex; flex-direction: column; gap: 18px; }
        }
        .vendor-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); transition: background 0.13s ease; }
        .vendor-row:last-child { border-bottom: none; }
        .vendor-row:hover { background: var(--surface-2); }
        .vendor-row :global(.vc-av) { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .vc-meta { min-width: 0; flex: 1; }
        .vc-meta .vc-name { font-size: 13.5px; font-weight: 500; color: var(--fg); }
        .vc-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11.5px; color: var(--fg-3); margin-top: 2px; }
        .vc-sub .gst { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--fg-4); }
        .vr-time { font-size: 11.5px; color: var(--fg-3); white-space: nowrap; }
        .vr-time .em { color: var(--fg-2); font-weight: 500; }
        .vr-status { margin-left: auto; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .expand-btn { background: transparent; border: 1px solid var(--border); border-radius: 6px; width: 24px; height: 24px; display: grid; place-items: center; color: var(--fg-3); cursor: pointer; transition: all 0.15s ease; flex-shrink: 0; }
        .expand-btn:hover { background: var(--surface-3); color: var(--fg); border-color: var(--border-strong); }
        .expand-btn.open { background: var(--fg); color: white; border-color: var(--fg); transform: rotate(180deg); }
        .item-expand-row > td { background: var(--surface-2); padding: 0 !important; border-top: none !important; }
        .iex-inner { padding: 14px 16px 16px 60px; border-top: 1px dashed var(--border); }
        .stat-mini { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .stat-mini:last-child { border-bottom: none; }
        .stat-mini .sm-k { font-size: 12px; color: var(--fg-3); display: flex; align-items: center; gap: 7px; }
        .stat-mini .sm-ic { width: 22px; height: 22px; border-radius: 6px; background: var(--surface-3); display: grid; place-items: center; color: var(--fg-3); border: 1px solid var(--border); }
        .stat-mini .sm-v { font-family: 'Geist Mono', monospace; font-weight: 700; color: var(--fg); font-size: 13px; }
        .stat-mini .sm-v.warn { color: var(--warn); }
        .stat-mini .sm-v.success { color: var(--success); }
        .qty-chip { display: inline-flex; align-items: baseline; gap: 4px; padding: 3px 8px; background: var(--surface-3); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; }
        .qty-chip .qc-code { font-weight: 700; color: var(--fg-2); letter-spacing: 0.02em; }
        .qty-chip .qc-qty { font-family: 'Geist Mono', monospace; font-weight: 600; color: var(--fg); }
        .file-chip { display: inline-flex; align-items: center; gap: 9px; padding: 9px 13px; background: var(--surface); border: 1px solid var(--border); border-radius: 9px; font-size: 12.5px; color: var(--fg-2); cursor: pointer; transition: all 0.15s ease; text-decoration: none; }
        .file-chip:hover { border-color: var(--border-strong); background: var(--surface-2); color: var(--fg); }
        .file-chip .fc-ic { width: 30px; height: 30px; border-radius: 7px; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; flex-shrink: 0; border: 1px solid rgba(37,99,235,0.18); }
        .file-chip .fc-meta { display: flex; flex-direction: column; gap: 1px; line-height: 1.3; text-align: left; }
        .file-chip .fc-name { font-weight: 600; color: var(--fg); }
        .file-chip .fc-sub { font-size: 10.5px; color: var(--fg-4); font-family: 'Geist Mono', monospace; }
        .ico-attach { color: var(--fg-3); }
        .pub-mem-row { display: flex; align-items: center; gap: 11px; padding: 9px 0; border-bottom: 1px solid var(--border); }
        .pub-mem-row:last-child { border-bottom: none; }
        .pub-mem-av { width: 30px; height: 30px; border-radius: 8px; background: var(--surface-3); border: 1px solid var(--border); display: grid; place-items: center; font-size: 10.5px; font-weight: 700; color: var(--fg-2); flex-shrink: 0; }
        .pub-mem-meta { min-width: 0; flex: 1; }
        .pub-mem-name { font-size: 13px; font-weight: 500; color: var(--fg); }
        .pub-mem-role { font-size: 11px; color: var(--fg-3); }
        .pub-mem-comment { font-size: 11.5px; color: var(--fg-2); margin-top: 2px; font-style: italic; }
      `}</style>

      {/* Single-column shell — the "who's involved" card and approval decision now
          live at the top of the stats rail (detail-aside) so they sit beside the
          stage content rather than isolated in a far-right third column. */}
      <StageColumns aside={null}>

      {/* ── PUBLISH-APPROVAL GATE (pending / rejected) ── */}
      {isPendingPublish && (
        <>
        <section className="section-card" style={{ marginBottom: 16, borderColor: "var(--warn)" }}>
          <div className="guide warn" style={{ alignItems: "center", margin: 0, borderRadius: "10px 10px 0 0" }}>
            <div className="g-ic" style={{ marginTop: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <strong>Pending publish approval.</strong> This rate contract is not yet live — vendors cannot see it until the approval below completes.
            </div>
          </div>
          <div className="section-body">
            {(pubChain?.steps || []).map((step) => {
              const isCurrent = publishSummary?.status === "PENDING" && Number(step.step_order) === Number(pubChain?.current_step);
              const isStepSkipped = step.status === "SKIPPED";
              const isStepRemoved = step.status === "REMOVED";
              // REMOVED approver rows are a mid-flight reconciler's soft-tombstone
              // (role revoked while the approval was in progress) — exclude them
              // from the live list, show them separately and muted instead.
              const allApprovers = step.approvers || [];
              const activeApprovers = allApprovers.filter((ap) => ap.status !== "REMOVED");
              const removedApprovers = allApprovers.filter((ap) => ap.status === "REMOVED");
              return (
                <div key={step.step_order}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 2px" }}>
                    <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: isCurrent ? "var(--warn)" : "var(--fg-4)", fontWeight: 700 }}>
                      Level {step.step_order}{step.decision_rule ? (step.decision_rule === "ALL" ? " · all must approve" : " · any one approves") : ""}
                    </span>
                    <span className={`status-pill ${step.status === "APPROVED" ? "success" : step.status === "REJECTED" ? "danger" : isStepSkipped || isStepRemoved ? "neutral" : isCurrent ? "warn" : "neutral"}`} style={{ fontSize: 9.5 }}>
                      <span className="dot" />
                      {step.status === "APPROVED" ? "cleared" : step.status === "REJECTED" ? "rejected" : isStepSkipped ? "skipped" : isStepRemoved ? "removed" : isCurrent ? "reviewing now" : "waiting"}
                    </span>
                  </div>
                  {activeApprovers.map((ap, ai) => (
                    <div key={`active-${ap.user_id ?? ai}`} className="pub-mem-row">
                      <div className="pub-mem-av">{vendorInitials(ap.user_name)}</div>
                      <div className="pub-mem-meta">
                        <div className="pub-mem-name">{ap.user_name}</div>
                        <div className="pub-mem-role">{ap.user_designation || ap.user_department || "Approver"}</div>
                        {ap.comment && <div className="pub-mem-comment">{ap.comment}</div>}
                      </div>
                      <span className={`status-pill ${ap.status === "APPROVED" ? "success" : ap.status === "REJECTED" ? "danger" : "neutral"}`} style={{ fontSize: 9.5 }}>
                        <span className="dot" />{ap.status === "APPROVED" ? "approved" : ap.status === "REJECTED" ? "rejected" : "pending"}
                      </span>
                    </div>
                  ))}
                  {removedApprovers.map((ap, ai) => {
                    const reasonLabel = ap.removal_reason ? removalReasonLabel(ap.removal_reason) : null;
                    return (
                      <div key={`removed-${ap.user_id ?? ai}`} className="pub-mem-row" style={{ opacity: 0.6 }}>
                        <div className="pub-mem-av">{vendorInitials(ap.user_name)}</div>
                        <div className="pub-mem-meta">
                          <div className="pub-mem-name">{ap.user_name}</div>
                          <div className="pub-mem-role">{ap.user_designation || ap.user_department || "Approver"}</div>
                        </div>
                        <span className="status-pill neutral" style={{ fontSize: 9.5 }}>
                          <span className="dot" />
                          Removed{reasonLabel ? ` · ${reasonLabel}` : ""}{ap.removed_at ? ` · ${fmtDate(ap.removed_at)}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          </div>
        </section>

        {/* ── Sr 47 (Cap 1) — READ-ONLY technical clauses, for the approver to review before deciding ── */}
        {itemsWithClauses.length > 0 ? (
          <section className="section-card" style={{ marginBottom: 16 }}>
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div>
                  <h2>Technical clauses for approval</h2>
                  <div className="h-sub">Read-only · buyer-configured evaluation criteria, for reference before you decide</div>
                </div>
              </div>
              <div className="h-right">
                <span className="pill outline">View only</span>
              </div>
            </div>
            <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {itemsWithClauses.map((it) => {
                const itemKey = it.id || it.arc_item_id;
                const itemName = it.variant_name || it.name || `Item #${itemKey}`;
                // Clamp legacy data than can exceed 100 (consistency w/ Group C/I).
                const minPass = Math.min(100, Number(it.tech_eval.minimum_passing_score) || 0);
                return (
                  <div key={itemKey}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{itemName}</span>
                      <span className="status-pill neutral" style={{ fontSize: 9.5 }}>
                        <span className="dot" />Passing mark: {minPass}%
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {it.tech_eval.clauses.map((cl, idx) => (
                        <div key={cl.id || idx} className="clause-cell" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface-2)" }}>
                          <span className="c-num">{idx + 1}</span>
                          <span className="c-text">{cl.clause_text}</span>
                          <div className="c-meta">
                            <span className="c-weight">weight <span className="mono">{cl.weightage ?? 0}</span> marks</span>
                            {cl.clause_type && <span className="c-type">{cl.clause_type}</span>}
                            {cl.is_mandatory && (
                              <span className="c-type" style={{ background: "var(--danger-soft)", color: "var(--danger)", fontWeight: 700 }}>
                                Mandatory
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="guide" style={{ marginBottom: 16 }}>
            <div className="g-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            </div>
            <div>Technical evaluation skipped for this contract.</div>
          </div>
        )}
        </>
      )}

      {/* Sr 47 (Cap 2, Path A) — same publish_rejected state, softened to read
          as a send-back for revision rather than a hard kill. Mechanics
          (status, note, Edit & re-publish CTA) are unchanged. */}
      {isPublishRejected && (
        <section className="section-card" style={{ marginBottom: 16, borderColor: "var(--warn)" }}>
          <div className="guide warn" style={{ alignItems: "center", margin: 0, borderRadius: "10px 10px 0 0" }}>
            <div className="g-ic" style={{ marginTop: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </div>
            <div>
              <strong>Changes requested by the approver.</strong> {rejectReason ? <>Note: {rejectReason}. </> : null}Revise the rate contract and re-publish to send it back for approval.
            </div>
          </div>
          {isCreator && (
            <div className="section-body">
              <a className="btn btn-primary" href={`/dashboard/buyer/rate-contracts/create?c=${arc.id}`}>
                Edit &amp; re-publish
              </a>
            </div>
          )}
        </section>
      )}

      {/* GUIDE BANNER */}
      {isFloated && !windowClosed && (
        <div className="guide">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <strong>Tender is open</strong> — <strong>{daysToClose} days</strong> remaining. Vendors are submitting quotes. Once submission closes, <strong>Technical Evaluation</strong> unlocks on the timeline above.
          </div>
        </div>
      )}
      {windowClosed && (
        <div className="guide success" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <strong>Quotation window closed.</strong>{" "}
            <span className="mono fw-600">{submittedCount} of {invitedCount}</span> invited vendors submitted.
            This snapshot is now read-only — the journey continues in the next stages.
          </div>
        </div>
      )}

      {/* TWO-COLUMN BODY */}
      <div className="detail-grid" style={{ marginTop: 4 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* VENDOR RESPONSE TRACKER */}
          <section className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h2>Vendor response tracker</h2>
                  <div className="h-sub">
                    <span className="mono fw-600 text-fg">{submittedCount} of {invitedCount}</span> vendors have submitted ·{" "}
                    <span className="text-warn fw-600">{Math.max(0, invitedCount - submittedCount)} awaiting</span>
                  </div>
                </div>
              </div>
              <div className="h-right">
                <div className="progress-bar" style={{ width: 120, maxWidth: "none" }}>
                  <div className="fill warn" style={{ width: `${responsePct}%` }} />
                </div>
                <span className="mono fs-12 fw-600 text-fg">{responsePct}%</span>
              </div>
            </div>
            <div className="section-body flush">
              {invitations.length === 0 ? (
                <div style={{ padding: 18, color: "var(--fg-3)", fontSize: 13 }}>No vendors have been invited yet.</div>
              ) : (
                invitations.map((inv) => {
                  const vendor = vendors[inv.vendor_id] || {};
                  const status = classifyInvitation(inv, quoteByVendor);
                  const q = quoteByVendor[inv.vendor_id];
                  const vendorName = inv.vendor_company?.trim() || inv.vendor_name || vendor.name || `Vendor #${inv.vendor_id}`;
                  const email = inv.vendor_email || vendor.email || null;
                  const mobile = inv.vendor_mobile || vendor.mobile || null;
                  return (
                    <div key={inv.id || inv.vendor_id} className="vendor-row">
                      <div className="vendor-cell" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                        <div className={`vc-av ${pickAv(inv.vendor_id)}`}>{initialsOf(vendorName)}</div>
                        <div className="vc-meta">
                          <div className="vc-name">{vendorName}</div>
                          <div className="vc-sub">
                            {email ? <span>{email}</span> : null}
                            {email && mobile ? <span className="sep">·</span> : null}
                            {mobile ? <span className="mono">{mobile}</span> : null}
                            {!email && !mobile ? <span>—</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="vr-status">
                        {status === "submitted" && <span className="pill success"><span className="pdot" />Submitted</span>}
                        {status === "draft" && <span className="pill warn"><span className="pdot" />In draft</span>}
                        {status === "none" && <span className="pill neutral"><span className="pdot" />Not started</span>}
                        <span className="vr-time">
                          {status === "submitted" && (
                            <span><span className="em">Submitted</span> · {fmtDateTime(q?.submitted_at || inv.responded_at)}</span>
                          )}
                          {status === "draft" && <span>Last edited {fmtDateTime(q?.updated_at)}</span>}
                          {status === "none" && <span>No activity yet</span>}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* ITEMS IN SCOPE */}
          <section className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h2>Items in scope</h2>
                  <div className="h-sub">{items.length} line item{items.length === 1 ? "" : "s"} · committed quantities</div>
                </div>
              </div>
              <div className="h-right">
                <span className="pill outline">Click row to view past consumption</span>
              </div>
            </div>
            <div className="section-body flush">
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}></th>
                      <th>Item</th>
                      <th>Spec</th>
                      <th>Per-BU committed qty</th>
                      <th className="center">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 18, color: "var(--fg-3)", fontSize: 13 }}>No items in scope.</td></tr>
                    ) : items.map((it) => {
                      const itemKey = it.id || it.arc_item_id;
                      const isOpen = !!expanded[itemKey];
                      const itemName = it.variant_name || it.name || `Item #${itemKey}`;
                      const itemCode = it.variant_slug || it.code || "—";
                      const uom = it.uom || "—";
                      const qty = it.committed_qty != null ? it.committed_qty : it.indicative_qty ?? it.quantity;
                      const past = it.past_consumption || [];
                      return (
                        <tbody key={itemKey} style={{ display: "contents" }}>
                          <tr onClick={() => toggleExpand(itemKey)} style={{ cursor: "pointer" }}>
                            <td className="center">
                              <button
                                type="button"
                                className={`expand-btn ${isOpen ? "open" : ""}`}
                                onClick={(e) => { e.stopPropagation(); toggleExpand(itemKey); }}
                                title={isOpen ? "Collapse" : "Expand past consumption"}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </td>
                            <td>
                              <div className="item-cell">
                                <div className="ic-thumb">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                  </svg>
                                </div>
                                <div className="ic-meta">
                                  <div className="ic-name">{itemName}</div>
                                  <div className="ic-code"><span>{itemCode}</span> · <span>{uom}</span></div>
                                </div>
                              </div>
                            </td>
                            <td style={{ maxWidth: 240, color: "var(--fg-3)", fontSize: 12, lineHeight: 1.5 }}>
                              {it.spec_text || it.spec || it.specification || "—"}
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1" style={{ maxWidth: 300 }}>
                                <span className="qty-chip">
                                  <span className="qc-code">{arc.hotel_code || "BU"}</span>
                                  <span className="qc-qty">{fmtQty(qty)}</span>
                                </span>
                              </div>
                            </td>
                            <td className="center">
                              <svg className="ico-attach" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="item-expand-row">
                              <td colSpan={6}>
                                <div className="iex-inner">
                                  <div className="section-label" style={{ marginBottom: 10 }}>
                                    Past 3-year consumption (units in <span>{uom}</span>)
                                  </div>
                                  {past.length === 0 ? (
                                    <div style={{ color: "var(--fg-4)", fontSize: 12 }}>Consumption history not available.</div>
                                  ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                      {past.map((p, idx) => (
                                        <div key={idx} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: "11.5px", fontWeight: 600 }}>{p.hotel_name || "Hotel"}</div>
                                            <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "'Geist Mono',monospace" }}>{p.hotel_code || ""}</div>
                                          </div>
                                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 10px", fontSize: "11.5px" }}>
                                            <div>FY {p.fy1_label || "—"}</div>
                                            <div>FY {p.fy2_label || "—"}</div>
                                            <div>FY {p.fy3_label || "—"}</div>
                                            <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{p.fy1 != null ? Number(p.fy1).toLocaleString("en-IN") : "—"}</div>
                                            <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{p.fy2 != null ? Number(p.fy2).toLocaleString("en-IN") : "—"}</div>
                                            <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{p.fy3 != null ? Number(p.fy3).toLocaleString("en-IN") : "—"}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ATTACHMENTS */}
          {Array.isArray(arc.attachments) && arc.attachments.length > 0 && (
            <section className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </div>
                  <div>
                    <h2>Attachments &amp; documents</h2>
                    <div className="h-sub">RFQ pack shared with all invited vendors</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="flex flex-wrap gap-2">
                  {arc.attachments.map((f, idx) => (
                    <a key={f.id || idx} className="file-chip" href={f.url || "#"} target="_blank" rel="noopener noreferrer">
                      <div className="fc-ic">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="fc-meta">
                        <span className="fc-name">{f.name || f.filename || "Attachment"}</span>
                        <span className="fc-sub">{f.size_label || f.size || ""}{f.uploaded_at ? ` · ${fmtDate(f.uploaded_at)}` : ""}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT ASIDE */}
        <aside className="detail-aside" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Who's involved · what happens next — sits at the top of the rail, above
              the stats, so it's prominent without needing a separate column. */}
          <ActorFlowCard stage={stage} />
          {publishSummary?.can_user_approve && publishSummary?.status === "PENDING" && (
            <ApprovalDecisionCard
              stepLabel={stage?.actors?.approver?.step_label}
              approvers={stage?.actors?.approver?.people}
              comment={decideComment}
              setComment={setDecideComment}
              commentError={false}
              onApprove={() => decidePublish("approve")}
              onReject={() => decidePublish("reject")}
              busy={decideBusy}
              approveLabel="Approve & publish"
              rejectLabel="Request changes"
              commentPlaceholder="What should the creator fix before this can go live?"
              rejectRequiredLabel="required to request changes"
            />
          )}

          {/* STATS CARD */}
          <section className="section-card">
            <div className="section-head" style={{ padding: "11px 16px" }}>
              <div className="h-left">
                <h2 style={{ fontSize: "12.5px" }}>Tender stats</h2>
              </div>
            </div>
            <div className="section-body" style={{ padding: "6px 16px 10px" }}>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </span>
                  Responses
                </div>
                <div className="sm-v">{submittedCount} <span className="text-fg-4 fw-500">/ {invitedCount}</span></div>
              </div>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  Days to close
                </div>
                <div className="sm-v warn">{windowClosed ? 0 : daysToClose}<span className="text-fg-4 fw-500 fs-11">d</span></div>
              </div>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </span>
                  Response rate
                </div>
                <div className="sm-v">{responsePct}%</div>
              </div>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </span>
                  Items in scope
                </div>
                <div className="sm-v">{items.length}</div>
              </div>
            </div>
          </section>

          {/* KEY DATES */}
          <section className="section-card">
            <div className="section-head" style={{ padding: "11px 16px" }}>
              <div className="h-left">
                <h2 style={{ fontSize: "12.5px" }}>Key dates</h2>
              </div>
            </div>
            <div className="section-body" style={{ padding: "12px 16px" }}>
              <div className="kv-grid">
                <div className="k">Created</div><div className="v">{fmtDate(arc.created_at)}</div>
                <div className="k">Subm. opens</div><div className="v">{fmtDateTime(arc.submission_start_at)}</div>
                <div className="k">Subm. closes</div>
                <div className="v">
                  <span>{fmtDateTime(arc.submission_end_at)}</span>
                  {isFloated && !windowClosed && <span className="text-warn fw-600 fs-11"> · {daysToClose}d</span>}
                  {canExtend && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginLeft: 8, padding: "1px 8px", fontSize: 11, minHeight: 22 }}
                      onClick={openExtend}
                    >
                      Extend
                    </button>
                  )}
                </div>
                <div className="k">Term starts</div><div className="v">{fmtDate(arc.contract_start_at)}</div>
                <div className="k">Term ends</div><div className="v">{fmtDate(arc.contract_end_at)}</div>
                <div className="k">Last updated</div><div className="v fs-12">{fmtDate(arc.updated_at)}</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
      </StageColumns>

      {/* Sr 40 — EXTEND SUBMISSION DEADLINE MODAL */}
      {extendOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2050 }}
          onClick={() => !extending && setExtendOpen(false)}
        >
          <div
            className="dash-panel"
            style={{ width: 420, maxWidth: "92vw", background: "#fff", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dash-panel-head" style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              Extend submission deadline
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: "0 0 12px" }}>
                {windowClosed
                  ? "This tender's submission window closed. Extending re-opens it — invited vendors will be notified and can quote again."
                  : "Push the submission deadline further out. Invited vendors will be re-notified."}
              </p>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-3)", marginBottom: 6 }}>New submission deadline</label>
              <input
                type="datetime-local"
                className="input"
                value={extendValue}
                min={nowIstDateTimeLocal()}
                onChange={(e) => setExtendValue(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid var(--border-input)", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" disabled={extending} onClick={() => setExtendOpen(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={extending} onClick={handleExtend}>
                  {extending ? "Extending..." : "Extend"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
