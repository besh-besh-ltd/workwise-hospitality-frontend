import { peopleById } from "@/data/ihg/org";
import { pendingPos, purchaseOrders, monthlySpend, budgetHeads } from "@/data/ihg/orders";
import { groupStats, negotiation, rfq } from "@/data/ihg/thread";
import { allRfqs, allContracts } from "@/data/ihg/register";
import { notificationsFor } from "@/data/ihg/notifications";
import { demoSession } from "./writeRoutes";
import listRoutes from "./listRoutes";
import detailRoutes from "./detailRoutes";
import writeRoutes from "./writeRoutes";

/**
 * The endpoints the demo actually serves.
 *
 * Deliberately not all 362 the service layer can reach. This file grows from
 * observation: run the app, walk the golden thread, read the `[demo] no
 * fixture for …` warnings, and add what turns up. Anything unmapped falls
 * through to a safe empty payload rather than an error, so an unvisited
 * corner of the portal degrades to "nothing here" instead of a red screen.
 */

/** Who the browser is currently signed in as, from the seeded token. */
const currentPersona = () => {
  if (typeof window === "undefined") return peopleById.purchase;
  try {
    const token = window.localStorage.getItem("token") || "";
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return (
      Object.values(peopleById).find((p) => p.numericId === payload.sub) ||
      peopleById.purchase
    );
  } catch (_) {
    return peopleById.purchase;
  }
};

/** Every dashboard widget the registry knows about. */
const DASHBOARD_WIDGETS = [
  "procurement_snapshot", "action_center", "my_drafts", "my_active_rfqs",
  "my_quote_compares", "my_active_negotiations", "my_tech_evals_pending",
  "my_tech_approvals_pending", "my_commercial_approvals_pending",
  "my_award_approvals_pending", "my_no_response_rfqs",
  "my_rfqs_bid_closed_no_quotes", "recent_awards", "award_value_pipeline",
  "negotiation_savings", "category_insights", "cost_intelligence",
  "abc_analysis", "deals_with_price_anomalies",
  "commercial_approval_throughput",
];

/**
 * What a persona may do in a module.
 *
 * `approve` is the one that matters: it is what makes signing in as Priya or
 * Vikram change the screen rather than just the name in the corner.
 */
const actionsFor = (persona, moduleKey) => {
  const base = ["read", "create", "update", "delete"];
  const canApprove = persona.can.approvePO || persona.can.awardContract;
  if (moduleKey === "dashboard") return DASHBOARD_WIDGETS;
  return canApprove ? [...base, "approve", "regenerate"] : base;
};

const routes = [
  /* ── permissions ──────────────────────────────────────────── */
  {
    method: "post",
    path: "/rbac/me/permissions/bulk",
    handler: ({ body }) => {
      const persona = currentPersona();
      // getBulkPermissions posts `{ key, hotel_ids }`. Answer for whatever key
      // is asked rather than a fixed list — the app uses more module keys than
      // are obvious from a grep ("te", "awarding", …), and a key we failed to
      // anticipate would render as Access Denied on a screen that should work.
      const keys = body?.key ? [body.key] : body?.modules || ["dashboard"];
      const permissions = {};
      keys.forEach((k) => {
        permissions[k] = { actions: actionsFor(persona, k), scope: { all: true } };
      });
      return { permissions };
    },
  },
  {
    method: "get",
    path: "/rbac/me/permissions",
    handler: () => {
      const persona = currentPersona();
      const permissions = {};
      ["dashboard", "tender", "rfq", "purchase_order", "material_requisition",
       "negotiation", "technical_evaluation", "arc", "awarding"].forEach((k) => {
        permissions[k] = { actions: actionsFor(persona, k), scope: { all: true } };
      });
      return { permissions };
    },
  },

  /* ── topbar / shell chrome ────────────────────────────────── */
  {
    method: "get",
    path: "/users/notifications/unread-count",
    handler: () => {
      const persona = currentPersona();
      return { unread_count: notificationsFor(persona.id).filter((n) => !n.read).length };
    },
  },
  {
    method: "get",
    path: "/general/hospitality/approval/pending/counts",
    handler: () => {
      const persona = currentPersona();
      // Only approvers have anything waiting — this drives the count pills on
      // the sidebar, so it has to agree with what the PO queue actually shows.
      const undecided = pendingPos.filter((p) => !demoSession.poDecisions[p.id]);
      const n = persona.can.approvePO ? undecided.length : 0;
      // usePendingApprovalIndicators does `counts.forEach(({entity_type,count}))`
      // — it wants a flat array, not a keyed object.
      return n > 0 ? [{ entity_type: "PO", count: n }] : [];
    },
  },
  {
    method: "get",
    path: "/dashboard-v2/buyer-status-banner",
    handler: () => {
      const persona = currentPersona();
      return {
        greeting_name: persona.name.split(" ")[0],
        items: [],
        total: 0,
      };
    },
  },
];

/* ── dashboard-v2 widgets ─────────────────────────────────────
   The buyer dashboard fans out to one endpoint per widget. Figures are drawn
   from the same fixtures the rest of the demo uses, so the dashboard totals
   agree with the screens they link to. ── */
const dashboardWidgetRoutes = [
  ["/dashboard-v2/action-center", () => {
    const persona = currentPersona();
    const mine = persona.can.approvePO ? pendingPos.filter((p) => !demoSession.poDecisions[p.id]).length : 0;
    return {
      pending_approvals: mine,
      pos_awaiting: mine,
      rejected_vendors: 0,
      rfqs_awaiting: persona.can.runSourcing ? groupStats.openRfqs : 0,
      rfqs_ending_soon: persona.can.runSourcing ? 2 : 0,
    };
  }],
  ["/dashboard-v2/procurement-snapshot", () => ({
    active_rfqs: groupStats.openRfqs,
    closed_rfqs: 12,
    pos_issued: purchaseOrders.length,
    total_spend: monthlySpend.reduce((s, m) => s + m.value, 0),
    average_turnaround_days: 19,
  })],
  ["/dashboard-v2/negotiation-savings", () => ({
    total_savings: groupStats.savingsYtd,
    savings_percent: groupStats.savingsActualPct,
    rounds: negotiation.priorRounds,
    items: [],
  })],
  ["/dashboard-v2/my-active-rfqs", () => ({
    items: allRfqs.filter((r) => r.status !== "Awarded").map((r) => ({
      id: r.id, rfq_number: r.id, title: r.title,
      quotes_received: r.quoted, vendors_invited: r.invited,
      bid_end_date: r.closesOn, status: r.status,
    })),
    total: allRfqs.filter((r) => r.status !== "Awarded").length,
  })],
  ["/dashboard-v2/my-active-negotiations", () => ({
    items: [{ id: rfq.id, rfq_number: rfq.id, title: rfq.title, round: negotiation.round, vendors: negotiation.vendorsSelected }],
    total: 1,
  })],
  ["/dashboard-v2/recent-awards", () => ({
    items: allContracts.filter((c) => c.stage === "active").map((c) => ({
      id: c.id, title: c.title, value: c.value, awarded_on: c.termStart,
    })),
    total: allContracts.filter((c) => c.stage === "active").length,
  })],
  ["/dashboard-v2/category-insights", () => ({
    items: budgetHeads.map((b) => ({ category: b.head, spend: b.consumed, budget: b.allocated })),
    total: budgetHeads.length,
  })],
];

/* Widgets we have no story for yet return an honest empty set rather than
   invented numbers — an empty widget reads as "nothing here", a fabricated
   one gets asked about. */
const emptyWidgets = [
  "/dashboard-v2/my-drafts",
  "/dashboard-v2/my-quote-compares",
  "/dashboard-v2/my-tech-evals-pending",
  "/dashboard-v2/my-tech-approvals-pending",
  "/dashboard-v2/my-commercial-approvals-pending",
  "/dashboard-v2/my-award-approvals-pending",
  "/dashboard-v2/my-no-response-rfqs",
  "/dashboard-v2/my-rfqs-bid-closed-no-quotes",
  "/dashboard-v2/deals-with-price-anomalies",
  "/dashboard-v2/abc-analysis",
  "/dashboard-v2/cost-intelligence",
  "/dashboard-v2/commercial-approval-throughput",
  "/dashboard-v2/award-value-pipeline",
];

dashboardWidgetRoutes.forEach(([path, handler]) =>
  routes.push({ method: "get", path, handler })
);
emptyWidgets.forEach((path) =>
  routes.push({ method: "get", path, handler: () => ({ items: [], total: 0 }) })
);

routes.push(...listRoutes);
routes.push(...detailRoutes);
routes.push(...writeRoutes);

export default routes;
