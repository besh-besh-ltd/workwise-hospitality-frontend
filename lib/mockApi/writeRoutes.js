import { raw } from "./index";
import { rfq, lineItems as threadLineItems } from "@/data/ihg/thread";
import { generateQuotes } from "./demoQuotes";
import { techEvalGroupsFor } from "./techGroups";
import { itLineItems, IT_RFQ_ID } from "@/data/ihg/itRfq";
import { docUrlFor, poRecordById, poTotal, activePos } from "./poState";

/**
 * Writes.
 *
 * A demo where nothing can be created or approved reads as broken, so the
 * actions on the golden thread genuinely succeed and their effects persist
 * for the session. Nothing goes to a server — `session` below is the whole
 * "database", and a page refresh keeps it while a new tab starts clean.
 *
 * These return what the calling screen actually checks for. `addProductsToDraft`
 * is the instructive one: StartRFQ throws unless the response carries an
 * `rfq_id`, so a generic "ok: true" would still have failed.
 */

/**
 * Two draft purchase orders that can legitimately be combined.
 *
 * Awards for the same RFQ + vendor + project already fold into one draft on
 * their own, so two mergeable drafts cannot arise by accident — seeding an
 * arbitrary pair would contradict the auto-merge we just implemented, on the
 * same screen, in front of the client.
 *
 * The honest generator is the remaining leg of the real merge key: the same
 * supplier on the same RFQ, booked to two different PROJECTS. That is exactly
 * why the backend team shipped "Combine N into one" — an escape hatch for when
 * the key is finer-grained than the buyer's intent. The listing renders
 * `project_details.name` under the PO number, so the two rows visibly differ
 * and the reason they did not merge is on screen.
 */
const seedDrafts = () => {
  const draft = (id, projectName, lines) => ({
    id,
    po_number: null,
    status: "draft",
    rfq_id: "535944",
    rfq_no: "535944",
    // Sriram Textiles — the numeric id the quote grids use for the first vendor.
    finalized_vendor_id: 7101,
    project_id: `proj-${id}`,
    project_name: projectName,
    lines,
    created_at: "2026-08-24T09:20:00.000Z",
    initiated_at: null,
    approved_at: null,
    decision: null,
    remarks: null,
    merged_from: [],
    merged_into: null,
    doc_url: null,
    covers_all_products: false,
  });

  return {
    108290: draft(108290, "Guest Floor Refurbishment — Phase 1", [
      { key: "535944:1", rfq_product_id: 1, total_value: 4988000, at: "2026-08-24T09:20:00.000Z" },
    ]),
    108291: draft(108291, "Ramnagar & Sawai Madhopur Pre-opening", [
      { key: "535944:2", rfq_product_id: 2, total_value: 2328800, at: "2026-08-24T09:24:00.000Z" },
    ]),
  };
};

const EMPTY = {
  drafts: {},
  publishedRfqs: {},  // rfq_no -> the RFQ published this session        // rfq_id -> { items, hotel_ids }
  rfqQuotes: {},     // rfq_no -> vendor responses, see demoQuotes.js
  clauses: {},       // rfq_product_id -> { minimum_passing_score, items: [] }
  awards: {},        // "rfq:product" -> the vendor a product was finalised to
  quoteApprovals: {},// "rfq:product" -> "approved" | "rejected", the approver's call
  techComplete: {},  // rfq_no -> technical evaluation signed off, which unmasks quotes
  buyerMarks: {},    // "clauseId:vendorId" -> the mark the evaluator gave
  poDecisions: {},   // po_id  -> { decision, remarks, at }
  techMarks: {},     // "itemId:vendor:clause" -> marks
  rounds: [],        // negotiation rounds created this session
  // A purchase order is a RECORD here, not something re-derived on each read.
  // It used to be re-grouped from `awards` at read time with the id assigned by
  // array position, so approving two awards in a different order renumbered
  // them — and nothing (an initiate, a decision, a merge) could be keyed by a
  // PO id that moves. Materialising it at approval time is what lets a PO have
  // a life: draft -> initiated -> approved.
  pos: seedDrafts(), // po_id -> the purchase order record, see poRecord()
  nextPoId: 108300,  // ids continue past the five seeded in data/ihg/orders.js
};

const KEY = "ihg:demoSession";

/**
 * Kept in sessionStorage, not just module memory.
 *
 * Module state dies on a full page load, so approving a PO and then hitting
 * refresh would silently un-approve it. sessionStorage survives reloads within
 * the tab while a brand-new tab still starts from a clean demo.
 */
// A deep copy every time. `{ ...EMPTY }` shares each nested object with the
// EMPTY literal, so the first write mutated the template itself: a later
// resetDemoSession() cloned the already-polluted EMPTY and the "reset" kept
// everything. Harmless while the session was small; not once a PO record is
// stored here.
const blank = () => JSON.parse(JSON.stringify(EMPTY));

const load = () => {
  if (typeof window === "undefined") return blank();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch (_) {
    return blank();
  }
};

const session = load();

const persist = () => {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(session)); } catch (_) {}
};

export const demoSession = session;

/** Back to a clean run — the presenter's undo. */
export const resetDemoSession = () => {
  Object.assign(session, JSON.parse(JSON.stringify(EMPTY)));
  if (typeof window !== "undefined") {
    try { window.sessionStorage.removeItem(KEY); } catch (_) {}
  }
};

/** Clauses live per rfq_product; the bucket is created on first touch. */
const clauseBucket = (rfqProductId) => {
  const key = String(rfqProductId ?? "unknown");
  if (!session.clauses[key]) session.clauses[key] = { minimum_passing_score: null, items: [] };
  return session.clauses[key];
};

/** Every clause written this session, newest last. */
export const allSessionClauses = () =>
  Object.values(session.clauses || {}).flatMap((b) => b.items);

let nextClauseId = 4200;

/** Sequential ids that look like the real ones rather than random noise. */
let nextDraftId = Number(rfq.id) + 100;

/* ── purchase orders ──────────────────────────────────────── */

/**
 * Did the approver reject?
 *
 * The UI sends "rejected"; older code here tested for "reject". Both are
 * accepted now so a decision can never be read as its opposite.
 */
export const isRejection = (decision) => String(decision || "").startsWith("reject");

/**
 * How many products the RFQ has in total, to decide `covers_all_products`.
 *
 * A PO carrying every line of its RFQ initiates plainly; one that does not is
 * an amber FORCE initiate, because initiating freezes it and anything awarded
 * afterwards is clubbed into a separate PO. That warning is only honest if the
 * count behind it is real.
 */
const rfqProductCount = (rfqId) => {
  if (String(rfqId) === IT_RFQ_ID) return itLineItems.length;
  if (String(rfqId) === String(rfq.id)) return threadLineItems.length;
  const draft = session.drafts?.[rfqId];
  if (draft?.products?.length) return draft.products.length;
  return 0;
};

/** A purchase order as stored. Everything else in the app is a view of this. */
const poRecord = (id, award, rfqNo) => ({
  id,
  // Assigned by initiate, not by award — a draft has no PO number, which is
  // precisely what distinguishes it from an issued order.
  po_number: null,
  status: "draft",
  rfq_id: award.rfq_id ?? rfqNo,
  rfq_no: rfqNo,
  finalized_vendor_id: award.vendor_id ?? null,
  // Part of the real merge key. Nothing in the demo sets a project on an
  // award, so awarded POs share `null` and therefore auto-merge on vendor.
  project_id: award.project_id ?? null,
  project_name: null,
  lines: [],
  created_at: new Date().toISOString(),
  initiated_at: null,
  approved_at: null,
  decision: null,
  remarks: null,
  // Provenance, for our own reasoning — no component reads this. A merge shows
  // up in the UI as a longer line list and a bigger total, which is how the
  // real product shows it too.
  merged_from: [],
  merged_into: null,
  doc_url: null,
});

/**
 * Put an approved award onto a purchase order.
 *
 * This is the portal's auto-merge, made explicit: the backend folds a newly
 * finalised line into an existing DRAFT po when rfq + vendor + project match,
 * and only then. A PO that has already been initiated is frozen, so a later
 * award opens a new one rather than quietly changing something that is already
 * out for approval.
 */
const attachAwardToPo = (key, award) => {
  const [rfqNo] = key.split(":");
  const already = Object.values(session.pos || {}).find((po) =>
    po.lines.some((l) => l.key === key)
  );
  if (already) return already;

  const target = Object.values(session.pos || {}).find(
    (po) =>
      po.status === "draft" &&
      !po.merged_into &&
      String(po.rfq_no) === String(rfqNo) &&
      String(po.finalized_vendor_id) === String(award.vendor_id) &&
      (po.project_id ?? null) === (award.project_id ?? null)
  );

  const po = target || poRecord(session.nextPoId++, award, rfqNo);
  po.lines.push({
    key,
    rfq_product_id: award.rfq_product_id ?? null,
    total_value: Number(award.total_value) || 0,
    at: award.decided_at || award.at || new Date().toISOString(),
  });
  if (target) po.merged_from.push({ key, at: new Date().toISOString() });

  const total = rfqProductCount(rfqNo);
  po.covers_all_products = total > 0 ? po.lines.length >= total : true;

  session.pos[po.id] = po;
  return po;
};

/** Record an approve/reject against whichever RFQ this product was awarded on. */
const recordQuoteDecision = (rfqProductId, decision, remarks) => {
  const suffix = `:${rfqProductId}`;
  const keys = Object.keys(session.awards || {}).filter((k) => k.endsWith(suffix));
  if (!keys.length) return false;
  keys.forEach((k) => {
    session.quoteApprovals[k] = decision;
    session.awards[k].decision = decision;
    session.awards[k].remarks = remarks || null;
    session.awards[k].decided_at = new Date().toISOString();
    // An approved award is what brings a purchase order into existence.
    if (decision === "approved") attachAwardToPo(k, session.awards[k]);
  });
  persist();
  return true;
};

const writeRoutes = [
  /* ── RFQ draft creation ─────────────────────────────────── */
  {
    method: "post",
    path: "/rfq/add-products-to-draft",
    handler: ({ body }) => {
      const rfqId = body?.rfq_id || String((nextDraftId += 1));
      // StartRFQ posts `{ is_tender, hotel_ids, variants: [{variant_id}] }`.
      // Store the variant ids so re-opening the draft shows the products the
      // buyer actually picked, not a default pair.
      session.drafts[rfqId] = {
        rfq_id: rfqId,
        variant_ids: (body?.variants || []).map((v) => Number(v.variant_id)).filter(Boolean),
        hotel_ids: body?.hotel_ids || [],
        is_tender: body?.is_tender ? 1 : 0,
        created_at: new Date().toISOString(),
      };
      // StartRFQ throws unless `rfq_id` comes back — a bare success is not enough.
      persist();
      return { rfq_id: rfqId, status: 1, message: "Draft created" };
    },
  },

  {
    method: "post",
    path: "/rfq/save-draft",
    handler: ({ body }) => {
      // Keep whatever the wizard saved. Without this the Review step reloads
      // the draft from "the server", gets the untouched fixture back, and the
      // timeline the buyer just set silently reverts to blank.
      const id = String(body?.rfq_id || body?.id || "");
      if (id) {
        const prev = session.drafts[id] || { rfq_id: id };
        session.drafts[id] = {
          ...prev,
          form: { ...(prev.form || {}), ...(body?.rfq_form_data || body || {}) },
          products: body?.rfq_products || prev.products,
        };
        persist();
      }
      return { rfq_id: id, status: 1, message: "Draft saved" };
    },
  },

  {
    method: "post",
    path: "/rfq/create",
    handler: ({ body }) => {
      // The success toast reads `res.data.rfq_no`, so a bare "ok" leaves the
      // user on Review with no feedback and no redirect.
      // The wizard posts the draft's own id. Reusing it keeps the link to the
      // products chosen in step 1 — minting a fresh id here is what left every
      // created RFQ with no line items to quote against.
      const draftId = body?.rfq_id && Number(body.rfq_id) > 0 ? String(body.rfq_id) : null;
      const id = draftId || String((nextDraftId += 1));
      session.publishedRfqs = session.publishedRfqs || {};
      session.publishedRfqs[id] = {
        rfq_no: id,
        title: body?.title || "Untitled RFQ",
        // Carried through so the register shows the deadline the buyer set,
        // not a placeholder.
        bid_end_date: body?.bid_end_date || null,
        variant_ids: session.drafts[id]?.variant_ids || [],
        hotel_ids: body?.hotel_ids || session.drafts[id]?.hotel_ids || [],
        created_at: new Date().toISOString(),
      };
      persist();
      return { rfq_id: id, rfq_no: id, id, status: 1, message: "RFQ created" };
    },
  },
  {
    method: "post",
    path: "/rfq/update",
    handler: ({ body }) => ({
      rfq_id: body?.rfq_id || body?.id || null,
      rfq_no: body?.rfq_no || body?.rfq_id || null,
      status: 1,
      message: "RFQ updated",
    }),
  },

  /* ── demo: invite vendors and collect their quotes ──────── */
  {
    method: "post",
    path: "/rfq/demo-publish/:id",
    handler: ({ params }) => {
      const id = String(params.id);
      const rec = session.publishedRfqs?.[id];
      const variantIds = rec?.variant_ids?.length
        ? rec.variant_ids
        : session.drafts[id]?.variant_ids || [];

      const result = generateQuotes(id, variantIds);
      session.rfqQuotes[id] = result;
      if (rec) rec.published_at = result.at;
      persist();

      return {
        rfq_id: id,
        status: 1,
        invited: result.invited,
        submitted: result.submitted,
        regretted: result.regretted,
        message: `${result.submitted} of ${result.invited} invited suppliers responded`,
      };
    },
  },

  /* ── technical clauses, written from the RFQ wizard ─────── */
  //
  // All five endpoints return through raw(): the shapes these callers expect
  // ARE the envelope. `getClausesByRfqProductId` reads `res.data` and
  // `res.minimum_passing_score` off the peeled response, so a `{ data }`
  // wrapper puts the clause array at res.data.data — the list then reads as
  // empty and every saved clause vanishes, which is exactly what happened.
  {
    method: "post",
    path: "/rfq/get-clauses-of-product",
    handler: ({ body }) => {
      const bucket = clauseBucket(body?.rfq_product_id);
      return raw({
        success: true,
        vendor_response: false,
        minimum_passing_score: bucket.minimum_passing_score,
        data: bucket.items,
      });
    },
  },
  {
    method: "post",
    path: "/rfq/add-clause",
    handler: ({ body }) => {
      const bucket = clauseBucket(body?.rfq_product_id);
      const clause = {
        clause_id: (nextClauseId += 1),
        rfq_id: body?.rfq_id ?? null,
        rfq_product_id: body?.rfq_product_id ?? null,
        clause_text: body?.clause_text || "",
        clause_type: body?.clause_type || "clause",
        weightage: Number(body?.weightage) || 0,
        // Written as `file_url`, read back as `files` — the list renders the
        // latter, so store both rather than losing attachments on reload.
        files: body?.file_url || [],
        file_url: body?.file_url || [],
      };
      bucket.items.push(clause);
      persist();
      return raw({ status: 1, message: "Clause added", clause_id: clause.clause_id, data: clause });
    },
  },
  {
    method: "put",
    path: "/rfq/update-clause",
    handler: ({ body }) => {
      const id = Number(body?.clause_id);
      let found = null;
      Object.values(session.clauses).forEach((b) => {
        const c = b.items.find((x) => x.clause_id === id);
        if (!c) return;
        c.clause_text = body?.clause_text ?? c.clause_text;
        c.clause_type = body?.clause_type || c.clause_type;
        c.weightage = Number(body?.weightage) || c.weightage;
        c.files = body?.file_url || c.files;
        c.file_url = c.files;
        found = c;
      });
      persist();
      return raw({ status: found ? 1 : 0, message: found ? "Clause updated" : "Clause not found", data: found });
    },
  },
  {
    method: "delete",
    path: "/rfq/remove-clause/:id",
    handler: ({ params }) => {
      const id = Number(params.id);
      Object.values(session.clauses).forEach((b) => {
        b.items = b.items.filter((c) => c.clause_id !== id);
      });
      persist();
      return raw({ status: 1, message: "Clause removed" });
    },
  },
  {
    method: "post",
    path: "/rfq/update-minimum-passing-score",
    handler: ({ body }) => {
      const bucket = clauseBucket(body?.rfq_product_id);
      bucket.minimum_passing_score = Number(body?.minimum_passing_score);
      persist();
      // The caller gates its success toast on `res.status === 1`.
      return raw({ status: 1, message: "Minimum passing percentage updated" });
    },
  },

  {
    method: "post",
    path: "/rfq/demo-close-bidding/:id",
    handler: ({ params }) => {
      // Quotes stay sealed until the bid deadline — the real behaviour, and a
      // wall in a demo where the deadline is weeks out. This brings the
      // deadline forward to now rather than pretending the rule isn't there.
      const id = String(params.id);
      const rec = session.publishedRfqs?.[id];
      if (!rec) return { status: 0, message: "Unknown RFQ" };

      const now = new Date().toISOString();
      rec.bid_end_date = now;
      rec.bidding_closed = true;
      persist();

      const collected = session.rfqQuotes?.[id];
      return {
        rfq_id: id,
        status: 1,
        bid_end_date: now,
        message: collected
          ? `Bidding closed · ${collected.submitted} quotes are now visible`
          : "Bidding closed",
      };
    },
  },

  /* ── scoring a clause for one vendor ────────────────────── */
  {
    method: "post",
    path: "/rfq/update-buyer-marks",
    handler: ({ body }) => {
      const key = `${body?.clause_id}:${body?.vendor_id}`;
      session.buyerMarks[key] = {
        marks: body?.buyer_marks ?? null,
        remark: body?.buyer_remark ?? null,
        at: new Date().toISOString(),
      };
      persist();
      return raw({ status: 1, message: "Marks saved" });
    },
  },
  {
    method: "post",
    path: "/rfq/get-vendor-responses",
    handler: () => raw({ status: 1, data: [] }),
  },
  {
    method: "post",
    path: "/rfq/get-deviation-previews",
    // An ARRAY: loadDeviationPreviews does res.data.forEach, and an object
    // here throws before the scoring matrix ever renders.
    handler: () => raw({ status: 1, data: [] }),
  },
  {
    method: "post",
    path: "/rfq/tech-evaluation-cleared-vendors",
    handler: () => raw({ status: 1, message: "Cleared vendors carried into commercial evaluation" }),
  },
  {
    method: "post",
    path: "/rfq/tech-eval/approval/action",
    handler: ({ body }) => raw({
      status: 1,
      message: body?.action === "REJECT" ? "Evaluation sent back" : "Evaluation approved",
    }),
  },

  /* ── the approver's call on a finalised product ─────────── */
  //
  // Keyed by rfq_product_id alone, which is what the caller sends. The RFQ is
  // resolved from the awards already recorded, so an approval cannot land on
  // a product that was never finalised.
  {
    method: "post",
    path: "/negotiation/quotes/:id/approve",
    handler: ({ params, body }) => {
      const decided = recordQuoteDecision(params.id, "approved", body?.remarks);
      return raw({
        status: decided ? 1 : 0,
        message: decided ? "Approved — a purchase order draft has been raised" : "Nothing to approve",
      });
    },
  },
  {
    method: "post",
    path: "/negotiation/quotes/:id/reject",
    handler: ({ params, body }) => {
      const decided = recordQuoteDecision(params.id, "rejected", body?.remarks);
      return raw({
        status: decided ? 1 : 0,
        message: decided ? "Sent back to the sourcing desk" : "Nothing to reject",
      });
    },
  },

  /* ── accept the evaluator's proposed marks ──────────────── */
  {
    method: "post",
    path: "/rfq/demo-apply-suggested-marks/:id",
    // "Apply all suggested marks" on the AI panel. The proposals are written
    // through the same store the evaluator's own marks use, so the matrix,
    // the counters and the pass/fail roll-up all see one set of numbers.
    //
    // Deliberately NOT uniform: the lowest-ranked vendor is marked down so it
    // genuinely fails the bar. A panel that passes everyone demonstrates
    // nothing about a gate.
    handler: ({ params, config }) => {
      const groups = techEvalGroupsFor(String(params.id));
      if (!groups.length) return { rfq_id: params.id, status: 0, marks_written: 0 };

      let written = 0;
      const at = new Date().toISOString();
      groups.forEach((g) => {
        const last = g.vendors[g.vendors.length - 1]?.vendor_id;
        g.clauses.forEach((c) => {
          g.vendors.forEach((v) => {
            const share = v.vendor_id === last ? 0.45 : 0.88;
            session.buyerMarks[`${c.clause_id}:${v.vendor_id}`] = {
              marks: Math.round((c.weightage || 0) * share),
              remark: null,
              at,
            };
            written += 1;
          });
        });
      });
      persist();
      return { rfq_id: params.id, status: 1, marks_written: written };
    },
  },

  /* ── technical evaluation signed off ────────────────────── */
  //
  // This is the gate the pitch describes: on an RFQ that carries clauses, no
  // price and no vendor identity is visible until the technical evaluation is
  // complete. Both the real submit and the demo shortcut land here.
  {
    method: "post",
    path: "/rfq/tech-eval/submit-for-approval",
    handler: ({ body }) => {
      const id = String(body?.rfq_id || "");
      if (id) { session.techComplete[id] = new Date().toISOString(); persist(); }
      return raw({ status: 1, message: "Technical evaluation submitted — commercial quotes are now visible" });
    },
  },
  {
    method: "post",
    path: "/rfq/demo-complete-technical/:id",
    handler: ({ params }) => {
      const id = String(params.id);
      session.techComplete[id] = new Date().toISOString();
      persist();
      return {
        rfq_id: id,
        status: 1,
        message: "Technical evaluation complete — quotes unmasked",
      };
    },
  },

  /* ── award a product to a vendor ────────────────────────── */
  {
    method: "post",
    path: "/rfq/finalize",
    handler: ({ body }) => {
      // One POST per product, so a bulk award is N of these. The sheet reads
      // `status` and surfaces `message` per item on failure.
      const key = `${body?.rfq_id}:${body?.product_info?.rfq_product_id}`;
      session.awards[key] = {
        rfq_id: body?.rfq_id ?? null,
        rfq_product_id: body?.product_info?.rfq_product_id ?? null,
        vendor_id: body?.vendor_id ?? null,
        total_value: body?.total_value ?? null,
        comment: body?.comment || "",
        at: new Date().toISOString(),
      };
      persist();
      return raw({
        status: 1,
        message: "Product finalized and sent for approval",
        rfq_product_id: body?.product_info?.rfq_product_id ?? null,
        vendor_id: body?.vendor_id ?? null,
      });
    },
  },

  /* ── PO approval ────────────────────────────────────────── */
  {
    method: "post",
    path: "/po/approve/:id",
    handler: ({ params, body }) => {
      const decision = body?.decision || "approve";
      // Every caller sends "rejected"; this used to test for "reject" and so
      // never matched, which meant rejecting a PO reported — and rendered —
      // as APPROVED. Normalise once here and read it through isRejection()
      // everywhere else.
      const rejected = isRejection(decision);
      session.poDecisions[params.id] = {
        decision,
        remarks: body?.remarks || "",
        at: new Date().toISOString(),
      };
      const po = poRecordById(session, params.id);
      if (po) {
        po.status = rejected ? "rejected" : "approved";
        po.decision = decision;
        po.remarks = body?.remarks || "";
        po.approved_at = new Date().toISOString();
      }
      persist();
      // PODetail surfaces `res.message` in its success toast.
      return raw({
        status: 1,
        message: rejected
          ? "PO rejected · vendor notified"
          : "PO approved · issued to the vendor",
      });
    },
  },
  {
    /**
     * Initiate — which in this product IS "generate the final PO".
     *
     * It is the single action that creates the approval instance, assigns the
     * PO number, produces the document and notifies the approvers. There is no
     * separate generate or send button anywhere in the portal, so there is
     * none here either.
     */
    method: "get",
    path: "/po/initiate/:id",
    handler: ({ params }) => {
      const po = poRecordById(session, params.id);
      if (!po) return raw({ status: 2, message: "Purchase order not found" });
      if (po.status !== "draft") {
        return raw({ status: 2, message: "Only a draft purchase order can be initiated" });
      }
      const seq = activePos(session).filter((p) => p.po_number).length + 1;
      po.po_number = `IHG/PO/26-27/${String(seq).padStart(4, "0")}`;
      po.status = "pending_approval";
      po.initiated_at = new Date().toISOString();
      // Built now, while the line data is in hand — the document route runs on
      // the server and cannot see this session.
      po.doc_url = docUrlFor(po);
      persist();
      return raw({
        status: 1,
        message: `Purchase order ${po.po_number} generated and sent for approval`,
      });
    },
  },
  {
    /**
     * Combine drafts — the portal's one manual merge.
     *
     * Awards for the same RFQ + vendor + project already fold into a single
     * draft on their own (see attachAwardToPo). This is the escape hatch for
     * when the merge key was finer-grained than the buyer's intent — two
     * drafts booked to different projects that they would rather cut as one
     * order. Rules mirror the backend's: at least two, all still draft, one
     * vendor, one RFQ.
     */
    method: "post",
    path: "/po/merge-drafts",
    handler: ({ body }) => {
      const keepId = body?.keep_po_id;
      const ids = (body?.po_ids || []).map(String);
      const fail = (message) => raw({ status: 2, message });

      if (ids.length < 2) return fail("Select at least 2 drafts to combine into one");
      if (!ids.includes(String(keepId))) return fail("The purchase order to keep must be one of the selected");

      const records = ids.map((id) => poRecordById(session, id));
      if (records.some((r) => !r)) return fail("One of the selected purchase orders no longer exists");
      if (records.some((r) => r.status !== "draft")) return fail("Only draft purchase orders can be combined");
      if (new Set(records.map((r) => String(r.finalized_vendor_id))).size > 1) {
        return fail("You can only combine drafts of the same vendor");
      }
      if (new Set(records.map((r) => String(r.rfq_no))).size > 1) {
        return fail("You can only combine drafts raised against the same RFQ");
      }

      const keep = poRecordById(session, keepId);
      const absorbed = records.filter((r) => String(r.id) !== String(keep.id));
      absorbed.forEach((r) => {
        r.lines.forEach((l) => {
          if (!keep.lines.some((k) => k.key === l.key)) keep.lines.push(l);
        });
        keep.merged_from.push({ from_po_id: r.id, at: new Date().toISOString() });
        r.merged_into = keep.id;
      });
      const total = rfqProductCount(keep.rfq_no);
      keep.covers_all_products = total > 0 ? keep.lines.length >= total : true;
      // The combined order is no longer specific to one project.
      if (absorbed.some((r) => (r.project_id ?? null) !== (keep.project_id ?? null))) {
        keep.project_name = null;
      }
      persist();

      return raw({
        status: 1,
        message: `Merged ${records.length} purchase orders into #${keep.po_number || keep.id}`,
        data: {
          keep_po_id: keep.id,
          merged_po_ids: absorbed.map((r) => r.id),
          new_line_count: keep.lines.length,
          new_total_value: poTotal(keep),
          new_line_subtotal: poTotal(keep),
        },
      });
    },
  },

  /* ── technical evaluation ───────────────────────────────── */
  {
    method: "post",
    path: "/arc-v2/evaluation/tech-eval/score",
    handler: ({ body }) => {
      const key = `${body?.item_id}:${body?.vendor_alias_key}:${body?.clause_id}`;
      session.techMarks[key] = body?.marks ?? null;
      persist();
      return { status: 1, saved: true };
    },
  },
  {
    method: "post",
    path: "/arc-v2/evaluation/universal-tech-eval/score",
    handler: ({ body }) => {
      const key = `universal:${body?.vendor_alias_key}:${body?.clause_id}`;
      session.techMarks[key] = body?.marks ?? null;
      persist();
      return { status: 1, saved: true };
    },
  },
  {
    method: "post",
    path: "/arc-v2/evaluation/items/:id/tech-eval",
    handler: () => ({ status: 1, saved: true }),
  },
  {
    method: "post",
    path: "/arc-v2/evaluation/:id/tech-eval/submit",
    handler: () => ({ status: 1, message: "Technical evaluation submitted for approval" }),
  },
  {
    method: "post",
    path: "/arc-v2/evaluation/:id/tech-eval/decide",
    handler: () => ({ status: 1, message: "Decision recorded" }),
  },

  /* ── negotiation ────────────────────────────────────────── */
  {
    method: "post",
    path: "/negotiation/rounds",
    handler: ({ body }) => {
      const round = { id: session.rounds.length + 1, ...body, created_at: new Date().toISOString() };
      session.rounds.push(round);
      persist();
      return { round_id: round.id, status: 1, message: "Round created and sent to suppliers" };
    },
  },
];

export default writeRoutes;
