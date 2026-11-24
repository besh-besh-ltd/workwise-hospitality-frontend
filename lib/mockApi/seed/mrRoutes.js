import { raw } from "../index";
import { peopleById } from "@/data/ihg/org";
import {
  analyticsFor, listViewFor, filterOptionsFor, formHotelsFor, contractedItemsFor, approvalPreview,
  findMr, detailPayload, createMr, submitMr, cancelMr, decideMr, mrsInScope, MR_DEPARTMENTS,
} from "@/data/ihg/mrWorkflow";

/**
 * Material requisitions — register, approvals, detail lines, create form.
 *
 * Seed routes for the stand demo. Registered in routes.js AHEAD of the older
 * list/detail/write routes, so a path defined here overrides the same path
 * there (first match wins). Every figure must be derived from data/ihg/*
 * fixtures, never typed in — here, data/ihg/requisitions.js through the
 * session-aware views in data/ihg/mrWorkflow.js.
 */

/** Who the browser is signed in as, from the seeded token. */
const personaId = () => {
  if (typeof window === "undefined") return "purchase";
  try {
    const p = JSON.parse(atob((localStorage.getItem("token") || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return (Object.values(peopleById).find((x) => x.numericId === p.sub) || peopleById.purchase).id;
  } catch (_) { return "purchase"; }
};

const mrRoutes = [
  { method: "get", path: "/mr/analytics", handler: ({ query }) => analyticsFor(personaId(), query) },
  { method: "get", path: "/mr/kpis", handler: ({ query }) => analyticsFor(personaId(), query).totals },
  { method: "get", path: "/mr/dashboard/filter-options", handler: () => filterOptionsFor(personaId()) },
  { method: "post", path: "/mr/list-view", handler: ({ body }) => listViewFor(personaId(), body || {}) },
  {
    method: "get",
    path: "/mr",
    handler: ({ query }) => {
      const view = listViewFor(personaId(), { tab: query?.tab || "all", limit: 100 });
      return { rows: view.rows, items: view.rows, total: view.total, tab_counts: view.tab_counts };
    },
  },

  /* create form */
  { method: "get", path: "/mr/form/hotels", handler: () => ({ hotels: formHotelsFor(personaId()) }) },
  { method: "get", path: "/mr/form/departments", handler: () => ({ departments: MR_DEPARTMENTS }) },
  { method: "get", path: "/mr/search-contracted-items", handler: ({ query }) => ({ items: contractedItemsFor(query || {}) }) },
  { method: "get", path: "/mr/approval-preview", handler: () => approvalPreview() },
  { method: "post", path: "/mr", handler: ({ body }) => ({ mr: createMr(personaId(), body || {}) }) },
  { method: "post", path: "/mr/:id/submit", handler: ({ params }) => ({ mr: submitMr(params.id) }) },
  { method: "post", path: "/mr/:id/cancel", handler: ({ params }) => ({ ok: cancelMr(params.id) }) },

  /* detail — only MRs in the persona's scope open */
  {
    method: "get",
    path: "/mr/:id",
    handler: ({ params }) => {
      const pid = personaId();
      const m = findMr(params.id);
      if (!m || !mrsInScope(pid).some((x) => x.id === m.id)) return undefined;
      return detailPayload(m, pid);
    },
  },

  /*
   * Approve / reject from the MR detail page. The page posts to the generic
   * approval endpoint with `approval_instance_id: "mr:<MR id>"`; anything that
   * is not an MR instance gets the same success the adapter's write fallback
   * would have returned.
   */
  {
    method: "post",
    path: "/general/hospitality/approval/action",
    handler: ({ body }) => {
      const inst = String(body?.approval_instance_id || "");
      if (!inst.startsWith("mr:")) return raw({ status: 1, ok: true, message: "Saved" });
      const m = decideMr(inst.slice(3), personaId(), body.action, body.comment);
      return m ? { status: 1, mr_status: m.outcome } : raw({ status: 0, message: "This requisition is not waiting on you." });
    },
  },
];

export default mrRoutes;
