// One card per RFQ (or per rate contract) — the negotiation listing's row.
//
// It answers, in this order: which RFQ, where, how much negotiating happened,
// what state it is in, who was involved, what it saved. The round grain could
// answer none of those without the reader summing 138 rows by eye.

import Link from "next/link";
import {
  ROLL_UP_TOOLTIP,
  asArray,
  buCodeFor,
  fmtDate,
  isArcRow,
  parentHref,
  parentNumber,
  parentTitle,
} from "./parentRow";
import { negStatePresentation } from "../round-detail/negotiationStates";
import StateStrip from "./StateStrip";
import SavingsLine from "./SavingsLine";

function BadgeIcon({ badge }) {
  const p = {
    width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (badge) {
    case "active":    return (<svg {...p}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>);
    case "awaiting":  return (<svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
    case "committee": return (<svg {...p}><path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" /></svg>);
    case "expired":   return (<svg {...p}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>);
    default:          return (<svg {...p}><circle cx="12" cy="12" r="10" /></svg>);
  }
}

export default function ParentCard({ row }) {
  const st = negStatePresentation(row.neg_status);
  const isArc = isArcRow(row);
  const vendors = asArray(row.vendors);
  const itemNames = asArray(row.item_names);
  const vendorCount = Number(row.vendor_count ?? vendors.length ?? 0);
  const productCount = Number(row.product_count ?? itemNames.length ?? 0);
  const roundCount = Number(row.round_count || 0);
  const nextDeadline = fmtDate(row.next_deadline);
  const lastActivity = fmtDate(row.last_activity_at);
  const showStrip = roundCount > 0;

  return (
    <Link
      href={parentHref(row)}
      className={`contract-card${row.action_required ? " needs-action" : ""}`}
      data-testid={`parent-card-${row.parent_key || row.rfq_id || row.arc_id}`}
    >
      <div className="cc-head">
        <div className="cc-left">
          <div className={`cc-badge ${st.badge}`}><BadgeIcon badge={st.badge} /></div>
          <div className="cc-meta">
            <div className="cc-title">
              <span>{parentTitle(row)}</span>
              <span className="cc-num">#{parentNumber(row)}</span>
              <span className="cc-num">{isArc ? "ARC" : row.is_tender ? "Tender" : "RFQ"}</span>
              {row.action_required && row.action_label && (
                <span className="needs-action-pill">{row.action_label}</span>
              )}
            </div>

            <div className="cc-sub">
              {row.hotel_name && (
                <span>
                  <span className="mono fw-600">{buCodeFor(row.hotel_name)}</span>{" "}
                  <span>{row.hotel_name}</span>
                </span>
              )}
              {row.department_title && (
                <>
                  <span className="sep">·</span>
                  <span>{row.department_title}</span>
                </>
              )}
              {vendorCount > 0 && (
                <>
                  <span className="sep">·</span>
                  <span>
                    {vendors[0]?.name ? (
                      <>
                        <span className="em">{vendors[0].name}</span>
                        {vendorCount > 1 ? ` +${vendorCount - 1} vendors` : ""}
                      </>
                    ) : (
                      `${vendorCount} vendor${vendorCount === 1 ? "" : "s"}`
                    )}
                  </span>
                </>
              )}
              {productCount > 0 && (
                <>
                  <span className="sep">·</span>
                  <span title="Products actually negotiated — not every product on the RFQ.">
                    <span className="mono fw-600">{productCount}</span>{" "}
                    {productCount === 1 ? "product" : "products"} negotiated
                  </span>
                </>
              )}
            </div>

            {itemNames.length > 0 && (
              <div className="cc-tags">
                {itemNames.slice(0, 3).map((name, i) => (
                  <span key={i} className="bu-tag" title={String(name)}><span>{String(name)}</span></span>
                ))}
                {itemNames.length > 3 && (
                  <span className="bu-tag">+<span>{itemNames.length - 3}</span> more</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="cc-right">
          <span
            className={`status-pill ${st.tone}${st.pulse ? " pulse" : ""}`}
            title={`${st.description} ${ROLL_UP_TOOLTIP}`}
            data-testid="rollup-pill"
          >
            <span className="dot" /><span>{st.label}</span>
          </span>
          {showStrip && (
            <span className="text-fg-3 fs-12" data-testid="round-count">
              <span className="mono fw-600 text-fg">{roundCount}</span>{" "}
              {roundCount === 1 ? "round" : "rounds"}
            </span>
          )}
          {nextDeadline ? (
            <span className="mono text-fg-3 fs-12">Next deadline {nextDeadline}</span>
          ) : lastActivity ? (
            <span className="mono text-fg-3 fs-12">Last activity {lastActivity}</span>
          ) : null}
        </div>
      </div>

      <div className="cc-foot">
        {/* Renders only when the parent's rounds actually disagree — otherwise
            it would repeat the pill and the round count verbatim. */}
        <StateStrip stateCounts={row.state_counts} roundCount={roundCount} />
        <SavingsLine row={row} />
      </div>
    </Link>
  );
}
