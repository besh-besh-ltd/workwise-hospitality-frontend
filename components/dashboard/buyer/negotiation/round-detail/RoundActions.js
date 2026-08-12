// "What can I do next" — rendered from the server's available-actions list.
//
// The server owns permission and state; this component only renders. Anything
// it does not recognise still renders (label + href from the payload), so a
// new backend action appears here without a frontend change. Known keys get a
// route resolved locally when the payload omits one, because the existing
// approve/close screens already live at fixed paths.

import Link from "next/link";

/**
 * Fallback route for the actions that already have screens in this app.
 *
 * The server sends permission GATES, not routes — `actions` is a flat object
 * of booleans — so the model tags each enabled gate with a `route` intent and
 * this function turns that intent into a real path. The key-regex path below
 * is kept for payloads that send action descriptors instead.
 */
export function resolveActionHref(action, round) {
  if (action.href) return action.href;

  const intent =
    action.route ||
    (() => {
      const key = String(action.key || "").toLowerCase();
      if (/approve|reject|decide/.test(key)) return "approve";
      if (/new_round|next_round|create_round/.test(key)) return "next_round";
      if (/compare|quote|finali[sz]e/.test(key)) return "compare";
      return null;
    })();

  if (round.isArc) {
    if (!round.arcId) return null;
    if (intent === "approve") {
      return `/dashboard/buyer/rate-contracts/${round.arcId}/negotiation/${round.roundId}/approve`;
    }
    return `/dashboard/buyer/rate-contracts/${round.arcId}?stage=commercial`;
  }

  if (!round.rfqId) return null;
  if (intent === "approve") return `/dashboard/buyer/negotiation/${round.rfqId}/approve`;
  if (intent === "next_round") return `/dashboard/buyer/negotiation/${round.rfqId}/create`;
  if (intent === "compare") return `/dashboard/buyer/quote-comparison?rfq=${round.rfqId}`;
  // `round` intent (close the round) has no dedicated screen — the negotiation
  // workspace on the RFQ owns it.
  if (intent === "round") return `/dashboard/buyer/negotiation/${round.rfqId}`;
  return null;
}

function ActionButton({ action, round, onDark, onAction }) {
  // Operations act on the round in place rather than navigating. They still
  // come from the same server-derived gate list, so nothing renders that the
  // API would refuse.
  if (action.operation) {
    const cls = `btn btn-sm${action.tone === "primary" || onDark ? " cta" : ""}`;
    return (
      <button
        type="button"
        className={cls}
        onClick={() => onAction && onAction(action)}
        disabled={action.disabled || !onAction}
        data-testid={`action-${action.key}`}
      >
        {action.label}
      </button>
    );
  }
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

export default function RoundActions({ actions = [], round, onDark = false, onAction }) {
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
        <ActionButton key={a.key} action={a} round={round} onDark={onDark} onAction={onAction} />
      ))}
      {parentHref && (
        <Link href={parentHref} className="btn btn-sm" data-testid="action-open-parent">
          {round.isArc ? "Open rate contract" : "Open quote comparison"}
        </Link>
      )}
    </>
  );
}
