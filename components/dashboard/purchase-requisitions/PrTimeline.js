// The PR's full audit trail (events[], oldest first) in plain words.
// Unknown event types and payload keys are rendered defensively.

import { useState } from "react";
import { STATUS_LABEL, formatINR } from "./prFormat";
import { ATTACHMENT_KIND_LABEL, fmtDateTime } from "./prDetail";

const item = (n) => (n ? `item ${n}` : "an item");
const Item = (n) => (n ? `Item ${n}` : "An item");
const quote = (s) => (s ? `“${s}”` : null);
const humanize = (t) => {
  const s = String(t || "event").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const FIELD = {
  title: "title", justification: "justification", required_by_date: "need-by date", pr_type: "type", urgency: "urgency",
  delivery_location: "delivery location", hotel_id: "hotel", department_id: "department",
};

const EVENTS = {
  created: () => ({ title: "Draft created" }),
  updated: (p) => {
    const fields = Object.keys(p.changed || {}).map((k) => FIELD[k] || k.replace(/_/g, " "));
    const l = p.lines || {};
    const parts = [];
    if (fields.length) parts.push(`Changed ${fields.join(", ")}`);
    if (l.added) parts.push(`${l.added} item${l.added === 1 ? "" : "s"} added`);
    if (l.removed) parts.push(`${l.removed} removed`);
    return { title: "Draft edited", detail: parts.join(" · ") || null };
  },
  submitted: (p) => ({
    title: p.from_status === "returned" ? "Resubmitted" : "Submitted",
    detail: [p.estimated_total ? formatINR(p.estimated_total) : null, p.line_count ? `${p.line_count} item${p.line_count === 1 ? "" : "s"}` : null]
      .filter(Boolean).join(" · ") || null,
    tone: "info",
  }),
  review_created: (p) => ({ title: `Sent for technical review — ${p.department_title || "department"}`, tone: "info" }),
  review_completed: (p) => ({ title: `Technical review completed — ${p.department_title || "department"}`, detail: quote(p.note), tone: "success" }),
  self_reviewed: (p) => ({ title: `Technical review completed by the requester (self-review) — ${p.department_title || "department"}`, detail: quote(p.note), tone: "warn" }),
  review_sent_back: (p) => ({ title: `Sent back by technical review — ${p.department_title || "department"}`, detail: quote(p.note), tone: "warn" }),
  review_superseded: () => ({ title: "Technical review closed (superseded)" }),
  spec_edited: (p, n) => ({ title: `Specification changed on ${item(n)}`, spec: { before: p.before, after: p.after } }),
  clause_added: (p, n) => ({
    title: `${p.clause_type === "sampling" ? "Sampling clause" : "Clause"} added to ${item(n)}`,
    detail: [quote(p.clause_text), p.weightage != null && p.weightage !== "" ? `weight ${Number(p.weightage)}%` : null].filter(Boolean).join(" · ") || null,
  }),
  clause_removed: (p, n) => ({ title: `Clause removed from ${item(n)}`, detail: quote(p.clause_text) }),
  attachment_added: (p, n, e) => ({
    title: e.pr_line_id ? `File attached to ${item(n)}` : "File attached",
    detail: [p.file_name, ATTACHMENT_KIND_LABEL[p.kind]].filter(Boolean).join(" · ") || null,
  }),
  attachment_removed: (p, n, e) => ({ title: e.pr_line_id ? `File removed from ${item(n)}` : "File removed", detail: p.file_name || null }),
  approval_started: (p) => ({
    title: "Approval started",
    detail: [p.amount ? formatINR(p.amount) : null, Array.isArray(p.steps) ? `${p.steps.length} step${p.steps.length === 1 ? "" : "s"}` : null]
      .filter(Boolean).join(" · ") || null,
    tone: "info",
  }),
  approval_sent_back: (p) => ({ title: `Sent back by an approver${p.step_order ? ` (step ${p.step_order})` : ""}`, detail: quote(p.note), tone: "warn" }),
  approved: (p) => ({ title: "Approved", detail: quote(p.comment), tone: "success" }),
  rejected: (p) => ({ title: "Rejected", detail: quote(p.comment), tone: "danger" }),
  withdrawn: (p) => ({ title: "Withdrawn by the requester", detail: p.from_status ? `Was ${STATUS_LABEL[p.from_status] || p.from_status}` : null, tone: "warn" }),
  cancelled: (p) => ({ title: "Cancelled", detail: quote(p.reason), tone: "danger" }),
  copied_from: (p) => ({ title: `Copied from ${p.source_pr_number || "another PR"}` }),
  assigned: (p) => ({ title: `Assigned to ${p.to_name || "a buyer"}`, detail: p.from_name ? `Was ${p.from_name}` : null, tone: "info" }),
  line_mapped: (p, n) => ({ title: `${Item(n)} mapped to ${p.variant_name || "a catalog item"}` }),
  catalog_requested: (p, n) => ({ title: `New catalog item requested for ${item(n)}`, detail: quote(p.requested_name) }),
  catalog_fulfilled: (p) => ({ title: `Catalog item added — ${p.variant_name || "item"}`, tone: "success" }),
  catalog_rejected: (p) => ({ title: "Catalog request rejected", detail: quote(p.note) }),
  line_closed: (p, n) => ({ title: `${Item(n)} closed by the purchase team`, detail: quote(p.reason), tone: "warn" }),
  line_cancelled: (p, n) => ({ title: `${Item(n)} cancelled`, detail: quote(p.reason), tone: "warn" }),
  converted: (p, n) => ({ title: `${Item(n)} sent to sourcing${p.rfq_no ? ` on RFQ #${p.rfq_no}` : ""}`, tone: "info" }),
  comment_added: () => ({ title: "Commented" }),
};

/** { title, detail?, tone?, spec? } for one event. */
export function eventView(e, lineNoById = new Map()) {
  const p = e.payload && typeof e.payload === "object" ? e.payload : {};
  const n = p.line_no ?? (e.pr_line_id ? lineNoById.get(e.pr_line_id) : null);
  const fn = EVENTS[e.event_type];
  return fn ? fn(p, n, e) : { title: humanize(e.event_type) };
}

const COLLAPSED = 12;

/** One step approval from the detail's approval_history (the completing approval is the "approved" event). */
export function approvalView(a) {
  const step = a.step_order ? `step ${a.step_order}${a.total_steps ? ` of ${a.total_steps}` : ""}` : "a step";
  return { title: `Approved ${step}`, detail: quote(a.comment), tone: "success" };
}

const timeOf = (s) => {
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * PR events and step approvals as one list, oldest first. Events keep their own
 * order; a step approval goes after every event that happened before or at the
 * same instant.
 */
export function timelineItems(events = [], approvals = [], lineNoById = new Map()) {
  const items = [
    ...events.map((e, i) => ({ key: `e-${e.id}`, at: timeOf(e.created_at), rank: 0, i, actor: e.actor_name, created_at: e.created_at, view: eventView(e, lineNoById) })),
    ...approvals.map((a, i) => ({ key: `a-${a.id}`, at: timeOf(a.created_at), rank: 1, i, actor: a.actor_name, created_at: a.created_at, view: approvalView(a) })),
  ];
  return items.sort((x, y) => x.at - y.at || x.rank - y.rank || x.i - y.i);
}

export default function PrTimeline({ events = [], approvals = [], lines = [] }) {
  const [all, setAll] = useState(false);
  const lineNoById = new Map(lines.map((l) => [l.id, l.line_no]));
  const items = timelineItems(events, approvals, lineNoById);
  const shown = all || items.length <= COLLAPSED ? items : items.slice(-COLLAPSED);

  return (
    <div className="section-card" data-testid="pr-timeline">
      <div className="section-head">
        <div className="h-left">
          <div>
            <h2>Timeline</h2>
            <div className="h-sub">Everything that happened to this PR, oldest first</div>
          </div>
        </div>
        {items.length > COLLAPSED && (
          <div className="h-right">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll((v) => !v)}>
              {all ? "Show recent" : `Show all ${items.length}`}
            </button>
          </div>
        )}
      </div>
      <div className="section-body">
        {items.length === 0 && <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>Nothing yet.</div>}
        <div className="audit-tl">
          {shown.map((e) => {
            const v = e.view;
            return (
              <div key={e.key} className="audit-tl-row">
                <div className={`tl-ic ${v.tone || ""}`} />
                <div className="tl-main">
                  <div className="tl-title">{v.title}</div>
                  <div className="tl-detail">
                    {e.actor || "System"}
                    {v.detail ? <> · {v.detail}</> : null}
                  </div>
                  {v.spec && (
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 8px", marginTop: 4, fontSize: 12 }}>
                      <span style={{ color: "var(--fg-4)" }}>Before</span>
                      <span style={{ color: "var(--fg-3)", textDecoration: "line-through", whiteSpace: "pre-wrap" }}>{v.spec.before || "(none)"}</span>
                      <span style={{ color: "var(--fg-4)" }}>After</span>
                      <span style={{ color: "var(--fg)", whiteSpace: "pre-wrap" }}>{v.spec.after || "(none)"}</span>
                    </div>
                  )}
                </div>
                <div className="tl-time">{fmtDateTime(e.created_at)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
