// "What can I do next" — rendered from the server's available-actions list.
//
// The server owns permission and state; this component only renders. Anything
// it does not recognise still renders (label + href from the payload), so a
// new backend action appears here without a frontend change. Known keys get a
// route resolved locally when the payload omits one, because the existing
// approve/close screens already live at fixed paths.

import Link from "next/link";

/** Fallback route for the actions that already have screens in this app. */
export function resolveActionHref(action, round) {
  if (action.href) return action.href;
  const key = String(action.key || "").toLowerCase();
  if (round.isArc) {
    if (/approve|reject|decide/.test(key) && round.arcId) {
      return `/dashboard/buyer/rate-contracts/${round.arcId}/negotiation/${round.roundId}/approve`;
    }
    if (round.arcId) return `/dashboard/buyer/rate-contracts/${round.arcId}?stage=commercial`;
    return null;
  }
  if (/approve|reject|decide/.test(key) && round.rfqId) {
    return `/dashboard/buyer/negotiation/${round.rfqId}/approve`;
  }
  if (/new_round|next_round|create_round/.test(key) && round.rfqId) {
    return `/dashboard/buyer/negotiation/${round.rfqId}/create`;
  }
  if (/compare|quote|finali[sz]e/.test(key) && round.rfqId) {
    return `/dashboard/buyer/quote-comparison?rfq=${round.rfqId}`;
  }
  return null;
}

function ActionButton({ action, round, onDark }) {
  const href = resolveActionHref(action, round);
  const cls = `btn btn-sm${action.tone === "primary" || onDark ? " cta" : ""}`;
  if (action.disabled || !href) {
    return (
      <button
        type="button"
        className={cls}
        disabled
        title={action.reason || (href ? undefined : "No screen is wired for this action yet.")}
        data-testid={`action-${action.key}`}
      >
        {action.label}
      </button>
    );
  }
  return (
    <Link href={href} className={cls} data-testid={`action-${action.key}`}>
      {action.label}
    </Link>
  );
}

export default function RoundActions({ actions = [], round, onDark = false }) {
  // Always offer the way back to the parent record — a buyer answering a call
  // needs to be one click from the RFQ / contract regardless of round state.
  const parentHref = round.isArc
    ? round.arcId
      ? `/dashboard/buyer/rate-contracts/${round.arcId}?stage=commercial`
      : null
    : round.rfqId
    ? `/dashboard/buyer/quote-comparison?rfq=${round.rfqId}`
    : null;

  return (
    <>
      {actions.map((a) => (
        <ActionButton key={a.key} action={a} round={round} onDark={onDark} />
      ))}
      {parentHref && (
        <Link href={parentHref} className="btn btn-sm" data-testid="action-open-parent">
          {round.isArc ? "Open rate contract" : "Open quote comparison"}
        </Link>
      )}
    </>
  );
}
