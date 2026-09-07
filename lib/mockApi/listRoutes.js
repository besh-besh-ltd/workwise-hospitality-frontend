import { raw } from "./index";
import { demoSession, allSessionClauses } from "./writeRoutes";
import { peopleById, propertiesById } from "@/data/ihg/org";
import { purchaseOrders, pendingPos, heldValue, monthlySpend, budgetHeads } from "@/data/ihg/orders";
import { allRfqs, allMrs, allContracts } from "@/data/ihg/register";
import { notificationsFor } from "@/data/ihg/notifications";
import { vendorsById } from "@/data/ihg/vendors";
import { CATEGORY, groupStats, negotiation, rfq as threadRfq } from "@/data/ihg/thread";
import { IT_RFQ_ID, itVendors } from "@/data/ihg/itRfq";

/**
 * The list and dashboard endpoints behind the buyer's register screens.
 *
 * Field names here are not invented — they are taken from what the real
 * components destructure (`ContractsListPage`, `PODashboard`, `RfqListPage`)
 * and from the response shapes the service layer documents in its own
 * comments. Getting these exactly right is what lets the production screens
 * render untouched.
 */

const persona = () => {
  if (typeof window === "undefined") return peopleById.purchase;
  try {
    const p = JSON.parse(atob((localStorage.getItem("token") || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Object.values(peopleById).find((x) => x.numericId === p.sub) || peopleById.purchase;
  } catch (_) { return peopleById.purchase; }
};

const iso = (d) => new Date(`${d}T10:00:00.000Z`).toISOString();

/* ── RFQ register ─────────────────────────────────────────── */
// The app's own status vocabulary (STATUS_META in RfqListPage). Lower-case
// keys of my own invention fell through metaFor() and rendered raw — the
// filter rail listed "published" and "negotiation" instead of "Awaiting
// Quotes" and "Negotiation", and the row pills read the same way.
const RFQ_STATUS_KEY = {
  Open: "AWAITING_QUOTES",
  "Quotes received": "COMMERCIAL_EVALUATION",
  "Under negotiation": "NEGOTIATION_ONGOING",
  Awarded: "APPROVED_COMPLETED",
  Closed: "CLOSED",
  Draft: "DRAFT",
};

const rfqRow = (r) => ({
  id: Number(r.id),
  rfq_no: r.id,
  code: `RFQ-${r.id}`,
  title: r.title,
  status_key: RFQ_STATUS_KEY[r.status] || "AWAITING_QUOTES",
  bid_end_date: iso(r.closesOn),
  hotel_name: r.propertyIds.map((p) => propertiesById[p]?.shortName).join(", "),
  department_title: r.department,
  invited_count: r.invited,
  submitted_count: r.quoted,
  // What the filter rail counts. The thread and the IT RFQ carry their real
  // line items; the surrounding book of work carries its own.
  categories: [{ title: r.category || CATEGORY }],
  products: (r.products || []).map((name, i) => ({ id: i + 1, name })),
  vendors_invited_names: r.vendors || [],
  is_pending_for_me: false,
  can_approve: false,
  pending_reasons: [],
  action_holders: [],
  approval_entity_type: "RFQ",
});


/**
 * RFQs published during this session, newest first, shaped like register rows.
 *
 * Without this an RFQ you create in the wizard gets an rfq_no, shows its
 * success toast, and then cannot be found anywhere — which makes it impossible
 * to test anything downstream of creation.
 */
const sessionRfqRows = () =>
  Object.values(demoSession.publishedRfqs || {})
    .sort((a, b) => String(b.rfq_no).localeCompare(String(a.rfq_no)))
    .map((r) => {
      // Set once "Publish now" has run; until then the row honestly reads 0/0.
      const q = demoSession.rfqQuotes?.[String(r.rfq_no)];
      return {
        id: Number(r.rfq_no),
        rfq_no: String(r.rfq_no),
        code: `RFQ-${r.rfq_no}`,
        title: r.title,
        // Published and waiting on suppliers until Publish now collects them.
        status_key: q ? "COMMERCIAL_EVALUATION" : "AWAITING_QUOTES",
        bid_end_date: r.bid_end_date || iso("2026-10-15"),
        hotel_name: propertiesById["ic-mumbai"].shortName,
        department_title: "Housekeeping",
        invited_count: q?.invited || 0,
        submitted_count: q?.submitted || 0,
        categories: [CATEGORY],
        products: [],
        is_pending_for_me: false,
        can_approve: false,
        pending_reasons: [],
        action_holders: [],
        approval_entity_type: "RFQ",
        created_now: true,
        // Read by the list row to decide which demo control to offer.
        demo_awaiting_publish: !q,
        demo_awaiting_close: !!q && !r.bidding_closed,
      };
    });

/* ── Material requisitions ────────────────────────────────── */
const mrRow = (m) => ({
  id: m.id,
  mr_number: m.id,
  mr_no: m.id,
  title: m.title,
  status: m.status,
  urgency: m.urgency,
  hotel_name: propertiesById[m.propertyId]?.shortName,
  department_title: m.department,
  items_count: m.lineCount,
  total_value: m.value,
  created_at: iso(m.raisedOn),
  requested_by: peopleById[m.raisedBy]?.name || "Gilles Galloni",
});

/* ── Rate contracts ───────────────────────────────────────── */
const ARC_STATUS = { active: "ACTIVE", expiring: "ACTIVE", draft: "DRAFT", "tech-eval": "TECHNICAL_EVALUATION" };

const arcRow = (c) => ({
  id: c.id,
  arc_number: c.id,
  title: c.title,
  status: ARC_STATUS[c.stage] || "DRAFT",
  category_title: c.category,
  department_title: "Housekeeping",
  hotel_name: c.propertyIds.map((p) => propertiesById[p]?.shortName).join(", "),
  contract_start_at: iso(c.termStart),
  contract_end_at: iso(c.termEnd),
  submission_end_at: iso(c.termStart),
  committed_value: c.value,
  consumed_value: c.stage === "active" ? Math.round(c.value * 0.42) : 0,
  invited_count: c.live ? 9 : 6,
  submitted_count: c.live ? 6 : 4,
  call_off_count: c.stage === "active" ? 7 : 0,
  awarded_vendors: c.stage === "active" ? ["Sriram Textiles Pvt Ltd"] : [],
  awarded_vendor_names: c.stage === "active" ? ["Sriram Textiles Pvt Ltd"] : [],
  awarded_vendor_ids: c.stage === "active" ? ["sriram"] : [],
  item_names: [CATEGORY],
  active_amendments: 0,
  requested_amendments: 0,
  action_required: c.live,
  action_label: c.live ? "Score technical evaluation" : null,
});

/* ── Purchase orders ──────────────────────────────────────── */

/**
 * Purchase orders raised from awards approved this session.
 *
 * The finalise sheet promises "1 vendor · 1 purchase order", and the rail says
 * a draft has been raised — but nothing was creating one, so the register
 * still showed only the seeded five and the thread stopped at approval.
 *
 * Grouped by RFQ and vendor, matching what the sheet said it would do.
 */
const sessionPoRows = () => {
  const approved = Object.entries(demoSession.awards || {}).filter(
    ([key]) => demoSession.quoteApprovals?.[key] === "approved"
  );
  if (!approved.length) return [];

  const byVendor = {};
  approved.forEach(([key, award]) => {
    const [rfqNo] = key.split(":");
    const group = `${rfqNo}:${award.vendor_id}`;
    (byVendor[group] = byVendor[group] || { rfqNo, vendorId: award.vendor_id, lines: [] }).lines.push(award);
  });

  return Object.values(byVendor).map((g, idx) => {
    const value = g.lines.reduce((sum, l) => sum + (Number(l.total_value) || 0), 0);
    const vendorName = vendorNameForId(g.vendorId);
    return {
      id: 108300 + idx,
      po_number: String(108300 + idx),
      status: "pending",
      status_label: "Pending approval",
      total_value: value,
      vendor: { name: vendorName },
      vendor_name: vendorName,
      rfq_no: g.rfqNo,
      rfq_title: `Awarded from RFQ #${g.rfqNo}`,
      items_count: g.lines.length,
      items_label: `${g.lines.length} item${g.lines.length === 1 ? "" : "s"}`,
      quantity: g.lines.length,
      created_at: g.lines[0]?.decided_at || g.lines[0]?.at || null,
      waiting_days: 0,
      current_step_label: "Financial approval",
      current_approvers: [{ name: peopleById.finance?.name }],
      initiator: { name: peopleById.purchase?.name },
      hotel_name: propertiesById["ic-mumbai"]?.shortName,
      flags: [],
      raised_this_session: true,
    };
  });
};

/** Vendor display name from the numeric id used across the quote grids. */
const vendorNameForId = (vendorId) => {
  const linen = Object.values(vendorsById).find((v, i) => 7101 + i === Number(vendorId));
  if (linen) return linen.name;
  const it = itVendors.find((v, i) => 7301 + i === Number(vendorId));
  return it ? it.name : "Awarded vendor";
};

const poRow = (p) => {
  const v = vendorsById[p.vendorId];
  return {
    id: Number(p.id),
    po_number: p.id,
    status: demoSession.poDecisions[p.id]
      ? (demoSession.poDecisions[p.id].decision === "reject" ? "rejected" : "approved")
      : "pending",
    status_label: demoSession.poDecisions[p.id]
      ? (demoSession.poDecisions[p.id].decision === "reject" ? "Rejected" : "Approved")
      : p.status,
    total_value: p.value,
    vendor: { name: v?.name || "—" },
    vendor_name: v?.name || "—",
    rfq_no: threadRfq.id,
    rfq_title: p.title,
    items_count: p.lines.length,
    items_label: `${p.lines.length} items`,
    quantity: p.lines.reduce((s, l) => s + (l.qty || 0), 0),
    created_at: iso(p.raisedOn),
    waiting_days: p.pendingDays,
    current_step_label: "Financial approval",
    current_approvers: [{ name: peopleById[p.approverId]?.name }],
    initiator: { name: peopleById[p.raisedBy]?.name },
    hotel_name: propertiesById[p.propertyId]?.shortName,
    flags: [],
  };
};

/**
 * The register screens (RFQ, MR, ARC, negotiations) all read the same
 * envelope: `{ rows, facets, tab_counts, total, limit }`. `data`/`items` are
 * kept alongside for the handful of older callers that still expect them.
 */
/**
 * Counts per filter option, from the rows themselves.
 *
 * The filter rail reads `facets[group] = [{ key, label, count }]` sorted by
 * count. An empty object renders no rail at all, which is why the register
 * had a lone FY control where the real portal shows status, business unit,
 * category, department, product and vendor.
 *
 * Derived rather than hardcoded so a count can never disagree with the list
 * beside it — filter by a value and the rows that remain are exactly that many.
 */
const facetsFrom = (rows) => {
  const tally = (pick) => {
    const seen = new Map();
    rows.forEach((r) => {
      (pick(r) || []).forEach(({ key, label }) => {
        if (key == null || key === "") return;
        const k = String(key);
        const hit = seen.get(k) || { key: k, label: label || k, count: 0 };
        hit.count += 1;
        seen.set(k, hit);
      });
    });
    return Array.from(seen.values()).sort((a, b) => b.count - a.count);
  };

  return {
    // No label here: the rail maps status keys through its own STATUS_META.
    status: tally((r) => [{ key: r.status_key }]),
    buId: tally((r) =>
      String(r.hotel_name || "")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => ({ key: n, label: n }))
    ),
    categoryId: tally((r) => (r.categories || []).map((c) => ({ key: c.title || c, label: c.title || c }))),
    departmentId: tally((r) => [{ key: r.department_title, label: r.department_title }]),
    productId: tally((r) => (r.products || []).map((p) => ({ key: p.name, label: p.name }))),
    vendorId: tally((r) => (r.vendors_invited_names || []).map((n) => ({ key: n, label: n }))),
  };
};

const paged = (rows, query = {}, tabCounts = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const slice = rows.slice((page - 1) * limit, page * limit);
  return {
    rows: slice,
    // Counted across ALL rows, not the current page — a facet that only
    // counted page one would drop as you paged through.
    facets: facetsFrom(rows),
    tab_counts: { all: rows.length, ...tabCounts },
    total: rows.length,
    page,
    limit,
    // legacy aliases
    data: slice,
    items: slice,
    total_items: rows.length,
  };
};


/*
 * A note on `raw()`.
 *
 * Most endpoints send `{ data: <payload> }` and the screen reads `res.data`.
 * The /po/* family does not: its documented shape IS the envelope, e.g.
 * `GET /po/list → { data[], total_items, status_counts }`, and PODashboard
 * reads `res?.data` expecting that array. Wrapping those in another envelope
 * produced an object where an array was expected — which `Array.isArray(...)
 * ? ... : []` quietly swallowed, so the screens rendered empty instead of
 * erroring. `raw()` returns the body verbatim.
 */

/** Still waiting on someone — i.e. not decided in this session. */
const stillPending = () => pendingPos.filter((p) => !demoSession.poDecisions[p.id]);

const listRoutes = [
  /* RFQs */
  {
    method: "get",
    path: "/rfq/get-rfqs",
    // The technical-evaluation section asks with `tech_eval: true`, meaning
    // "only RFQs that have an evaluation to run". Unfiltered, it opened on the
    // linen thread — which correctly has no clauses — and showed five
    // products each saying "No Clauses Available".
    handler: ({ query }) => {
      const techOnly = query?.tech_eval === true || query?.tech_eval === "true";
      const rows = [...sessionRfqRows(), ...allRfqs.map(rfqRow)];
      if (!techOnly) return rows;

      const withClauses = new Set([IT_RFQ_ID]);
      allSessionClauses().forEach((c) => c.rfq_id && withClauses.add(String(c.rfq_id)));
      return rows
        .filter((r) => withClauses.has(String(r.rfq_no)))
        .map((r) => ({
          ...r,
          // An unscored evaluation is genuinely waiting on the evaluator, so it
          // belongs in Action Required — the tab this section opens on. That
          // tab filters on `has_pending_evaluation` (plus a bid window that has
          // already closed), not on is_pending_for_me.
          has_pending_evaluation: !demoSession.techComplete?.[String(r.rfq_no)],
          te_approval_rejected: false,
          approval_required: false,
          has_pending_te_approval: !!demoSession.techComplete?.[String(r.rfq_no)],
          is_pending_for_me: !demoSession.techComplete?.[String(r.rfq_no)],
        }));
    },
  },
  {
    method: "post",
    path: "/rfq/list-view",
    handler: ({ body }) =>
      paged([...sessionRfqRows(), ...allRfqs.map(rfqRow)], body, {
        pending_for_me: 0,
        drafts: 0,
        approval: 0,
        ongoing: allRfqs.filter((r) => r.status !== "Awarded").length + sessionRfqRows().length,
        approved: allRfqs.filter((r) => r.status === "Awarded").length,
        closed: allRfqs.filter((r) => r.status === "Awarded").length,
      }),
  },
  { method: "post", path: "/rfq/get-draft-rfqs", handler: () => paged([]) },

  /* Requisitions */
  {
    method: "post",
    path: "/mr/list-view",
    handler: ({ body }) =>
      paged(allMrs.map(mrRow), body, {
        draft: allMrs.filter((m) => m.status === "Draft").length,
        pending: allMrs.filter((m) => m.status === "Awaiting approval").length,
        sourcing: allMrs.filter((m) => m.status === "In sourcing").length,
        converted: allMrs.filter((m) => m.status === "Converted to RFQ").length,
      }),
  },
  {
    method: "get",
    path: "/mr/analytics",
    handler: () => ({
      total: allMrs.length,
      pending_approval: allMrs.filter((m) => m.status === "Awaiting approval").length,
      in_sourcing: allMrs.filter((m) => m.status === "In sourcing").length,
      converted: allMrs.filter((m) => m.status === "Converted to RFQ").length,
      total_value: allMrs.reduce((s, m) => s + m.value, 0),
      // The dashboard's trend strip reads { month, count }.
      split: monthlySpend.map((m) => ({ month: m.month, count: Math.max(1, Math.round(m.value / 3_000_000)) })),
      by_department: [
        { name: "Housekeeping", count: 3 },
        { name: "Food & Beverage", count: 1 },
        { name: "Engineering", count: 1 },
        { name: "Front Office", count: 1 },
      ],
    }),
  },
  {
    method: "get",
    path: "/mr/dashboard/filter-options",
    handler: () => ({
      statuses: ["Draft", "Awaiting approval", "In sourcing", "Converted to RFQ"],
      departments: ["Housekeeping", "Food & Beverage", "Engineering", "Front Office"],
      urgencies: ["Planned", "Urgent"],
    }),
  },

  /* Negotiations */
  {
    method: "post",
    path: "/negotiation/list-view",
    handler: ({ body }) =>
      paged(
        [
          {
            id: threadRfq.id,
            rfq_id: Number(threadRfq.id),
            rfq_no: threadRfq.id,
            title: threadRfq.title,
            round: negotiation.round,
            rounds_total: negotiation.round,
            status: "ACTIVE",
            status_label: "Drafting round 1",
            vendors_count: negotiation.vendorsSelected,
            value: threadRfq.estimatedValue,
            hotel_name: "All properties",
            created_at: iso(negotiation.openedOn),
          },
        ],
        body
      ),
  },

  /* Rate contracts */
  {
    method: "post",
    path: "/arc-v2/list-view",
    handler: ({ body }) =>
      paged(allContracts.map(arcRow), body, {
        active: allContracts.filter((c) => c.stage === "active").length,
        expiring: allContracts.filter((c) => c.stage === "expiring").length,
        draft: allContracts.filter((c) => c.stage === "draft").length,
        ongoing: allContracts.filter((c) => c.stage === "tech-eval").length,
      }),
  },
  { method: "get", path: "/arc-v2", handler: ({ query }) => paged(allContracts.map(arcRow), query) },
  {
    method: "get",
    path: "/arc-v2/kpis",
    handler: () => ({
      active: allContracts.filter((c) => c.stage === "active").length,
      expiring: allContracts.filter((c) => c.stage === "expiring").length,
      draft: allContracts.filter((c) => c.stage === "draft").length,
      in_evaluation: allContracts.filter((c) => c.stage === "tech-eval").length,
      total: allContracts.length,
      committed_value: allContracts.reduce((s, c) => s + c.value, 0),
      consumed_value: allContracts
        .filter((c) => c.stage === "active")
        .reduce((s, c) => s + Math.round(c.value * 0.42), 0),
    }),
  },

  /* Purchase orders */
  {
    method: "get",
    path: "/po/list",
    handler: ({ query }) => {
      const rows = [...sessionPoRows(), ...purchaseOrders.map(poRow)];
      return raw({
        data: rows,
        total_items: rows.length,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
        status_counts: {
          all: rows.length,
          pending: stillPending().length,
          approved: Object.values(demoSession.poDecisions).filter((d) => d.decision !== "reject").length,
          rejected: Object.values(demoSession.poDecisions).filter((d) => d.decision === "reject").length,
        },
      });
    },
  },
  {
    method: "get",
    path: "/po/awaiting",
    handler: () => raw({ data: persona().can.approvePO ? [...sessionPoRows(), ...stillPending().map(poRow)] : [] }),
  },
  {
    method: "get",
    path: "/po/dashboard/kpis",
    handler: () => {
      const me = persona();
      const mine = me.can.approvePO ? stillPending() : [];
      return raw({
        activeCount: purchaseOrders.length,
        awaitingYou: mine.length,
        awaitingOldestDays: Math.max(0, ...mine.map((p) => p.pendingDays)),
        inTransit: 0,
        vendorAccepted: 0,
        vendorAcceptancePending: 0,
        avgDeliveryDays: 28,
        approvedThisMonth: Object.values(demoSession.poDecisions).filter((d) => d.decision !== "reject").length,
        approvedDeltaPct: 0,
        totalValueMTD: monthlySpend[monthlySpend.length - 1].value,
        totalValueDeltaPct: groupStats.mtdDeltaPct,
        heldValue,
      });
    },
  },

  /* Notifications */
  {
    method: "get",
    path: "/users/notifications/list",
    handler: () => {
      const rows = notificationsFor(persona().id).map((n, i) => ({
        id: i + 1,
        title: n.title,
        message: n.message,
        body: n.message,
        is_read: n.read,
        read_at: n.read ? iso("2026-09-01") : null,
        created_at: iso("2026-09-02"),
        redirect_url: n.href,
        url: n.href,
        type: "INFO",
      }));
      return { data: rows, items: rows, total_items: rows.length, unread_count: rows.filter((r) => !r.is_read).length };
    },
  },
  { method: "post", path: "/users/notifications/mark-delivered", handler: () => ({ ok: true }) },

  /* PO tracking + analytics — shapes taken from the service comments:
     tracking → { data[], total_items, tab_counts }
     analytics → { kpis, spend_trend, status_dist, bottlenecks, top_vendors,
                   savings, compliance, spend_by_dept, queue_health } */
  {
    method: "get",
    path: "/po/tracking",
    handler: ({ query }) => {
      const rows = purchaseOrders.map((p) => ({
        ...poRow(p),
        tracking_status: "pending_approval",
        expected_delivery: null,
        dispatched_at: null,
        delivered_at: null,
      }));
      return raw({
        data: rows,
        total_items: rows.length,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
        tab_counts: {
          all: rows.length,
          pending_approval: pendingPos.length,
          sent: 0, dispatched: 0, delivered: 0, completed: 0,
        },
      });
    },
  },
  {
    method: "get",
    path: "/po/analytics",
    handler: () => raw({
      kpis: {
        total_value: monthlySpend.reduce((s, m) => s + m.value, 0),
        po_count: purchaseOrders.length,
        avg_value: Math.round(
          purchaseOrders.reduce((s, p) => s + p.value, 0) / purchaseOrders.length
        ),
        avg_approval_days: 3,
      },
      spend_trend: monthlySpend.map((m) => ({ label: m.month, month: m.month, value: m.value })),
      status_dist: [
        { label: "Pending approval", status: "pending", count: pendingPos.length },
        { label: "Approved", status: "approved", count: 0 },
      ],
      spend_by_dept: budgetHeads.map((b) => ({ label: b.head, name: b.head, value: b.consumed })),
      top_vendors: Object.values(
        purchaseOrders.reduce((acc, p) => {
          const name = vendorsById[p.vendorId]?.name || "—";
          acc[name] = acc[name] || { label: name, name, value: 0, po_count: 0 };
          acc[name].value += p.value;
          acc[name].po_count += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.value - a.value),
      savings: { total: groupStats.savingsYtd, percent: groupStats.savingsActualPct },
      // The screen maps over this: { name, pct, tone }.
      compliance: [
        { name: "Placed against a rate contract", pct: 80, tone: "ok" },
        { name: "Within agreed call-off caps", pct: 83, tone: "warn" },
        { name: "Supplier certificates valid", pct: 80, tone: "warn" },
      ],
      bottlenecks: [],
      queue_health: { awaiting: pendingPos.length, oldest_days: Math.max(0, ...pendingPos.map((p) => p.pendingDays)) },
    }),
  },
];

export default listRoutes;
