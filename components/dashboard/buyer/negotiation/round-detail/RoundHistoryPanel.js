// What happened in previous rounds.
//
// Multi-round negotiations are where a bare "saved" number does the most
// damage, so every row here states its own round number and each figure is
// scoped to that round. The currently-open round is marked, not hidden.

import Link from "next/link";
import { formatSignedMoney, formatDate, roundStatusPresentation } from "./roundDetailModel";

export default function RoundHistoryPanel({ history = [], currentRoundId, locked }) {
  if (history.length === 0) {
    return (
      <div className="section-body">
        <p className="help-text" style={{ margin: 0 }} data-testid="history-empty">
          No other rounds have been recorded against this record.
        </p>
      </div>
    );
  }

  return (
    <div className="table-scroll" data-testid="round-history">
      <table className="table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Status</th>
            <th className="right">Lines</th>
            <th className="right">Responded</th>
            <th className="right">Saved</th>
            <th className="right">Ended</th>
          </tr>
        </thead>
        <tbody>
          {history.map((r) => {
            const isCurrent = r.isCurrent || (currentRoundId != null && r.roundId === currentRoundId);
            const p = roundStatusPresentation(r.status);
            const negative = r.savedValue != null && r.savedValue < 0;
            return (
              <tr key={r.key} data-testid={`history-row-${r.roundNumber ?? r.key}`}>
                <td className="strong">
                  {isCurrent ? (
                    <span>
                      Round {r.roundNumber ?? "—"}{" "}
                      <span className="pill info" style={{ marginLeft: 6 }}>
                        You are here
                      </span>
                    </span>
                  ) : r.roundId ? (
                    <Link
                      href={`/dashboard/buyer/negotiation/round/${r.roundId}`}
                      style={{ color: "var(--primary)", fontWeight: 600 }}
                    >
                      Round {r.roundNumber ?? "—"}
                    </Link>
                  ) : (
                    <span>Round {r.roundNumber ?? "—"}</span>
                  )}
                </td>
                <td>
                  <span className={`pill ${p.tone === "success" ? "success" : p.tone === "danger" ? "danger" : "neutral"}`}>
                    {p.label}
                  </span>
                </td>
                <td className="right">{r.lineCount ?? "—"}</td>
                <td className="right">{r.respondedCount ?? "—"}</td>
                <td className="right" style={{ color: negative ? "var(--danger)" : undefined }}>
                  {locked ? "—" : r.savedValue != null ? formatSignedMoney(r.savedValue) : "—"}
                </td>
                <td className="right" style={{ fontWeight: 400 }}>
                  {formatDate(r.endDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
