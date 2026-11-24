import { peopleById } from "@/data/ihg/org";
import {
  pendingApprovalsFor,
  approvalCountsFor,
  approvalLink,
  actionCentreFor,
  vendorRejectedPosFor,
  noResponseRfqs,
  rfqsEndingSoon,
  posAwaitingAcceptanceFor,
  procurementSnapshotFor,
  negotiationSavingsFor,
  smartInsightsFor,
  workflowEfficiencyFor,
  categorySpendFor,
  abcFor,
  costIntelligenceFor,
  notificationsFor,
} from "@/data/ihg/aggregate";
import { demoSession } from "../writeRoutes";

/**
 * Dashboard home and cross-module aggregates — action centre, approvals, notifications, insights.
 *
 * Seed routes for the stand demo. Registered in routes.js AHEAD of the older
 * list/detail/write routes, so a path defined here overrides the same path
 * there (first match wins). Every figure must be derived from data/ihg/*
 * fixtures, never typed in.
 *
 * All of it is computed in data/ihg/aggregate.js from the four areas'
 * exports. The same `pendingApprovalsFor` list drives the action centre's
 * count, the approvals modal, the banner and the sidebar pills, so they
 * always agree.
 */

/** Who the browser is signed in as, from the seeded token (same rule as routes.js). */
const persona = () => {
  if (typeof window === "undefined") return peopleById.purchase;
  try {
    const token = window.localStorage.getItem("token") || "";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Object.values(peopleById).find((p) => p.numericId === payload.sub) || peopleById.purchase;
  } catch (_) {
    return peopleById.purchase;
  }
};

/** The session's PO decisions, so an approval in the demo leaves every list at once. */
const opts = () => ({ poDecisions: demoSession.poDecisions || {} });

const get = (path, handler) => ({ method: "get", path, handler });

const dashRoutes = [
  /* ── action centre + its three modals ── */
  get("/dashboard-v2/action-center", ({ query }) => actionCentreFor(persona().id, query, opts())),
  get("/dashboard-v2/pending-approvals", () =>
    pendingApprovalsFor(persona().id, opts()).map((e) => ({ ...e, link: approvalLink(e) }))
  ),
  get("/dashboard-v2/rejected-pos", ({ query }) => vendorRejectedPosFor(persona().id, query)),
  get("/dashboard-v2/no-response", ({ query }) => noResponseRfqs(persona().id, query)),

  /* ── banner + sidebar pills: the same list, counted ── */
  get("/dashboard-v2/buyer-status-banner", ({ query }) => {
    const p = persona();
    const pending = pendingApprovalsFor(p.id, opts()).length;
    const awaiting = posAwaitingAcceptanceFor(p.id, query).length;
    const closing = rfqsEndingSoon(p.id, query);
    const noResp = noResponseRfqs(p.id, query);
    const total = pending + awaiting;
    return {
      greeting_name: p.name.split(" ")[0],
      mode: total > 0 ? "steady" : "clear",
      counts: {
        pending_approvals: pending,
        po_acceptance_pending: awaiting,
        closing_soon: closing.length,
        closed_no_quotes: noResp.expired.length,
      },
      soonest_closing: closing[0] ? { id: closing[0].id, title: closing[0].title } : null,
      items: [],
      total,
    };
  }),
  get("/general/hospitality/approval/pending/counts", () => approvalCountsFor(persona().id, opts())),

  /* ── widgets ── */
  get("/dashboard-v2/procurement-snapshot", ({ query }) => procurementSnapshotFor(persona().id, query, opts())),
  get("/dashboard-v2/negotiation-savings", ({ query }) => negotiationSavingsFor(persona().id, query)),
  get("/dashboard-v2/smart-insights", ({ query }) => smartInsightsFor(persona().id, query, opts())),
  get("/dashboard-v2/workflow-efficiency", ({ query }) => workflowEfficiencyFor(persona().id, query, opts())),
  get("/dashboard-v2/category-insights", ({ query }) => categorySpendFor(persona().id, query, opts())),
  get("/dashboard-v2/abc-analysis", ({ query }) => abcFor(persona().id, query, opts())),
  get("/dashboard-v2/cost-intelligence", ({ query }) => costIntelligenceFor(persona().id, query, opts())),

  /* ── notifications: every area's activity for this persona ── */
  get("/users/notifications/list", ({ config }) => {
    // listNotifications puts page/limit in the URL itself, not in params.
    const qs = new URLSearchParams(String(config?.url || "").split("?")[1] || "");
    const page = Number(qs.get("page")) || 1;
    const limit = Number(qs.get("limit")) || 20;
    let rows = notificationsFor(persona().id, opts());
    if (qs.get("unread")) rows = rows.filter((n) => !n.is_read);
    return rows.slice((page - 1) * limit, page * limit);
  }),
  get("/users/notifications/unread-count", () => {
    const rows = notificationsFor(persona().id, opts());
    const unread = rows.filter((n) => !n.is_read).length;
    return { unread, undelivered: unread, count: unread, unread_count: unread };
  }),
];

export default dashRoutes;
