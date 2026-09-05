import { raw } from "./index";
import { rfq } from "@/data/ihg/thread";
import { generateQuotes } from "./demoQuotes";

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

const EMPTY = {
  drafts: {},
  publishedRfqs: {},  // rfq_no -> the RFQ published this session        // rfq_id -> { items, hotel_ids }
  rfqQuotes: {},     // rfq_no -> vendor responses, see demoQuotes.js
  clauses: {},       // rfq_product_id -> { minimum_passing_score, items: [] }
  awards: {},        // "rfq:product" -> the vendor a product was finalised to
  poDecisions: {},   // po_id  -> { decision, remarks, at }
  techMarks: {},     // "itemId:vendor:clause" -> marks
  rounds: [],        // negotiation rounds created this session
};

const KEY = "ihg:demoSession";

/**
 * Kept in sessionStorage, not just module memory.
 *
 * Module state dies on a full page load, so approving a PO and then hitting
 * refresh would silently un-approve it. sessionStorage survives reloads within
 * the tab while a brand-new tab still starts from a clean demo.
 */
const load = () => {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch (_) {
    return { ...EMPTY };
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
      session.poDecisions[params.id] = {
        decision,
        remarks: body?.remarks || "",
        at: new Date().toISOString(),
      };
      persist();
      // PODetail surfaces `res.message` in its success toast.
      return raw({
        status: 1,
        message:
          decision === "reject"
            ? "PO rejected · vendor notified"
            : "PO approved · routed to the next step",
      });
    },
  },
  {
    method: "get",
    path: "/po/initiate/:id",
    handler: () => raw({ status: 1, message: "PO initiated" }),
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
