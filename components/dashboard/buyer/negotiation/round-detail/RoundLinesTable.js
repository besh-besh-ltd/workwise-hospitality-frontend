// Per-line ledger — one row per product × vendor.
//
// This is the row a buyer reads out loud when a vendor calls: what we asked
// for, what came back, what it moved, and where the baseline came from.
//
// Three rules are visible here:
//   • Money is signed and unclamped. A revised price that went UP renders in
//     danger colour with explicit copy ("Price increased ₹236").
//   • A line with no numeric target says "No price target was set" — it never
//     shows a red "target missed" treatment, because there was no target.
//   • Non-numeric targets (payment terms, documents, comments, delivery
//     period, vendor T&C) render as chips, never as numbers.

import { Info, Lock } from "lucide-react";
import {
  formatMoney,
  formatSignedMoney,
  formatPct,
  formatSignedPct,
  movementSentence,
  outcomePresentation,
  baselineSourceCopy,
  baselineSourceLabel,
  formatDateTime,
  OUTCOME,
} from "./roundDetailModel";

function OutcomeBadge({ outcome }) {
  const p = outcomePresentation(outcome);
  return (
    <span className={`pill ${p.tone}`} data-testid={`outcome-${outcome}`}>
      <span className="pdot" />
      {p.label}
    </span>
  );
}

function BaselineSourceHint({ source, stale }) {
  const copy = baselineSourceCopy(source);
  const title = stale
    ? `${copy} This baseline is older than the current quote on the RFQ, so the comparison is against the price at the time the round opened.`
    : copy;
  return (
    <span
      data-testid="baseline-source"
      title={title}
      aria-label={title}
      className="fs-11"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: stale ? "var(--warn)" : "var(--fg-4)",
        cursor: "help",
        fontWeight: 500,
      }}
    >
      <Info size={11} strokeWidth={2} />
      {baselineSourceLabel(source)}
      {stale ? " · stale" : ""}
    </span>
  );
}

function TargetCell({ line, locked }) {
  const chips = (
    <>
      {line.nonNumericTargets.map((t) => (
        <span
          key={t.field}
          className="pill neutral"
          data-testid={`nonnumeric-target-${t.field}`}
          title={`${t.label}: ${t.value}`}
          style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {t.label} · {t.value}
        </span>
      ))}
      {line.taxDemand && (
        <span className="pill indigo" data-testid="tax-demand" title={line.taxDemand}>
          Tax ask · {line.taxDemand}
        </span>
      )}
    </>
  );

  if (!line.hasNumericTarget) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <span className="fs-11" style={{ color: "var(--fg-4)" }} data-testid="no-target">
          No price target was set
        </span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {chips}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <span className="mono" style={{ fontWeight: 600, color: "var(--fg)" }}>
        {locked ? "—" : formatMoney(line.targetUnit)}
      </span>
      {/* No sign here: "+10%" next to a REDUCTION reads as a price rise. */}
      <span className="fs-11" style={{ color: "var(--fg-4)" }}>
        per {line.uom || "unit"}
        {line.requestedPct != null ? ` · ${formatPct(line.requestedPct)} cut asked` : ""}
        {line.targetMode === "percentage" ? " · % mode" : ""}
      </span>
      {(line.nonNumericTargets.length > 0 || line.taxDemand) && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {chips}
        </div>
      )}
    </div>
  );
}

function MovementCell({ line, locked }) {
  if (locked) {
    return (
      <span className="fs-11" style={{ color: "var(--fg-4)" }}>
        —
      </span>
    );
  }
  if (!line.responded) {
    return (
      <span className="fs-11" style={{ color: "var(--fg-4)" }} data-testid="movement-none">
        Awaiting vendor
      </span>
    );
  }
  const negative = line.savedValue != null && line.savedValue < 0;
  const colour = negative
    ? "var(--danger)"
    : line.savedValue > 0
    ? "var(--success)"
    : "var(--fg-3)";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}
      data-testid={negative ? "movement-regression" : "movement-normal"}
    >
      <span className="mono" style={{ fontWeight: 700, color: colour }}>
        {formatSignedMoney(line.savedValue)}
      </span>
      <span className="fs-11" style={{ color: colour, fontWeight: 500 }}>
        {movementSentence(line.savedValue)}
      </span>
      {line.achievedPct != null && (
        <span className="fs-11 mono" style={{ color: "var(--fg-4)" }}>
          {formatSignedPct(line.achievedPct)} from baseline
        </span>
      )}
    </div>
  );
}

export default function RoundLinesTable({ lines = [], locked = false, scopeLabel }) {
  if (lines.length === 0) {
    return (
      <div className="empty-state" data-testid="lines-empty">
        <div className="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" />
          </svg>
        </div>
        <h2>No lines on this round</h2>
        <p>
          Nothing was negotiated under {scopeLabel || "this scope"}. Switch the scope above, or
          open the parent record to see the full item list.
        </p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="table" data-testid="lines-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Vendor</th>
            <th className="right">Baseline</th>
            <th className="right">Target</th>
            <th className="right">Achieved</th>
            <th className="right">Movement</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key} data-testid={`line-row-${line.key}`}>
              <td>
                <div style={{ fontWeight: 600, color: "var(--fg)" }}>{line.productName}</div>
                <div className="fs-11" style={{ color: "var(--fg-3)", marginTop: 3 }}>
                  {line.variantName ? `${line.variantName} · ` : ""}
                  {line.quantity != null ? (
                    <span className="mono">
                      {line.quantity} {line.uom || ""}
                    </span>
                  ) : (
                    "Quantity not recorded"
                  )}
                </div>
              </td>

              <td>
                <div style={{ color: "var(--fg)", fontWeight: 500 }}>{line.vendorName}</div>
                <div className="fs-11" style={{ color: "var(--fg-3)", marginTop: 3 }}>
                  {line.responded
                    ? `Responded${line.respondedAt ? ` ${formatDateTime(line.respondedAt)}` : ""}`
                    : "No response yet"}
                  {line.vendorApprovalStatus ? ` · ${line.vendorApprovalStatus}` : ""}
                </div>
              </td>

              <td className="right">
                {locked ? (
                  <span
                    className="fs-11"
                    style={{ color: "var(--fg-4)", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <Lock size={11} strokeWidth={2} /> Sealed
                  </span>
                ) : (
                  <>
                    <div>{formatMoney(line.baselineTotal)}</div>
                    {line.baselineUnit != null && (
                      <div className="fs-11 mono" style={{ color: "var(--fg-4)", fontWeight: 400, marginTop: 2 }}>
                        {formatMoney(line.baselineUnit)} / {line.uom || "unit"}
                      </div>
                    )}
                  </>
                )}
                <div style={{ marginTop: 4 }}>
                  <BaselineSourceHint source={line.baselineSource} stale={line.baselineStale} />
                </div>
              </td>

              <td className="right" style={{ fontFamily: "inherit", fontWeight: 400 }}>
                <TargetCell line={line} locked={locked} />
              </td>

              <td className="right">
                {locked ? "—" : line.responded ? formatMoney(line.achievedTotal) : (
                  <span className="fs-11" style={{ color: "var(--fg-4)", fontWeight: 400 }}>
                    No revised price
                  </span>
                )}
              </td>

              <td className="right" style={{ fontFamily: "inherit", fontWeight: 400 }}>
                <MovementCell line={line} locked={locked} />
              </td>

              <td>
                <OutcomeBadge outcome={line.outcome} />
                {line.outcome === OUTCOME.NO_TARGET && (
                  <div className="fs-11" style={{ color: "var(--fg-4)", marginTop: 4 }}>
                    Achieved-only — nothing to score against.
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
