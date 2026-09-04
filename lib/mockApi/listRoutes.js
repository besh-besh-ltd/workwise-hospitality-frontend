import { raw } from "./index";
import { demoSession } from "./writeRoutes";
import { peopleById, propertiesById } from "@/data/ihg/org";
import { purchaseOrders, pendingPos, heldValue, monthlySpend, budgetHeads } from "@/data/ihg/orders";
import { allRfqs, allMrs, allContracts } from "@/data/ihg/register";
import { notificationsFor } from "@/data/ihg/notifications";
import { vendorsById } from "@/data/ihg/vendors";
import { CATEGORY, groupStats, negotiation, rfq as threadRfq } from "@/data/ihg/thread";

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
const RFQ_STATUS_KEY = {
  Open: "published",
  "Quotes received": "published",
  "Under negotiation": "negotiation",
  Awarded: "awarded",
};

const rfqRow = (r) => ({
  id: Number(r.id),
  rfq_no: r.id,
  code: `RFQ-${r.id}`,
  title: r.title,
  status_key: RFQ_STATUS_KEY[r.status] || "published",
  bid_end_date: iso(r.closesOn),
  hotel_name: r.propertyIds.map((p) => propertiesById[p]?.shortName).join(", "),
  department_title: r.department,
  invited_count: r.invited,
  submitted_count: r.quoted,
  categories: [CATEGORY],
  products: [],
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
        // The register's own vocabulary is published / negotiation / awarded —
      // "Quotes received" maps onto published there too, so the pill matches.
      status_key: "published",
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
const paged = (rows, query = {}, tabCounts = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const slice = rows.slice((page - 1) * limit, page * limit);
  return {
    rows: slice,
    facets: {},
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
      const rows = purchaseOrders.map(poRow);
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
    handler: () => raw({ data: persona().can.approvePO ? stillPending().map(poRow) : [] }),
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
