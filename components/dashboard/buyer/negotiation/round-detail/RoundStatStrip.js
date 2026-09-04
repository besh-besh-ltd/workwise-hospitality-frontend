// The five-number answer strip.
//
// Multi-round rule: the headline is ALWAYS this round and the cumulative
// figure is ALWAYS a separate, explicitly labelled tile. There is never a bare
// "saved" number on this page — a buyer on the phone must be able to tell
// which denominator they are quoting.

import { PiggyBank, Layers, Target, Users, CalendarClock, TrendingDown } from "lucide-react";
import {
  formatSignedMoney,
  formatPct,
  formatSignedPct,
  formatDateTime,
  relativeTo,
} from "./roundDetailModel";

function StatCard({ tone, icon, value, sub, label, testId }) {
  return (
    <div className="stat-card" data-testid={testId}>
      <div className={`s-ic ${tone}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="s-val">{value}</div>
        <div className="s-label">{label}</div>
        {sub && (
          <div className="fs-11" style={{ color: "var(--fg-3)", marginTop: 3 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoundStatStrip({ round, totals, scopeLabel, locked }) {
  const saved = totals.savedValue;
  const regressed = saved != null && saved < 0;
  const hasTarget = totals.targetValue != null;
  // The cumulative figure accumulates over the rounds that negotiated the SAME
  // ITEMS (server: `cumulative.rounds_counted`, cancelled rounds excluded), so
  // the tile is labelled off that count — never off the RFQ-wide total, which
  // on RFQ 512 would have claimed "all 138 rounds" for a four-round sequence.
  const cumulativeRounds =
    totals.cumulativeRoundsCounted ?? round.roundsOnProducts ?? round.roundsOnParent ?? 1;
  const multiRound = cumulativeRounds > 1 || (round.roundsOnParent ?? 1) > 1;

  const responded = totals.respondedCount ?? 0;
  const lineCount = totals.lineCount ?? 0;

  const deadline = round.closedAt || round.endDate;
  const deadlineRel = relativeTo(deadline);

  return (
    <div className="stat-strip" data-testid="round-stat-strip">
      {/* 1 — this round, always labelled as such */}
      <StatCard
        testId="stat-saved-round"
        tone={locked ? "neutral" : regressed ? "danger" : "green"}
        icon={regressed ? <TrendingDown /> : <PiggyBank />}
        value={locked ? "Sealed" : formatSignedMoney(saved)}
        label={`Saved · this round`}
        sub={
          locked
            ? "Unlocks after the deadline"
            : `${scopeLabel}${totals.savedPct != null ? ` · ${formatSignedPct(totals.savedPct)}` : ""}`
        }
      />

      {/* 2 — cumulative, only when there is more than one round to accumulate */}
      {multiRound ? (
        <StatCard
          testId="stat-saved-cumulative"
          tone={locked ? "neutral" : "indigo"}
          icon={<Layers />}
          value={
            locked
              ? "Sealed"
              : totals.cumulativeSavedValue != null
              ? formatSignedMoney(totals.cumulativeSavedValue)
              : "—"
          }
          label={
            totals.cumulativeFromRound != null && totals.cumulativeToRound != null
              ? `Saved · rounds ${totals.cumulativeFromRound}–${totals.cumulativeToRound}`
              : `Saved · all ${cumulativeRounds} rounds`
          }
          sub={
            totals.cumulativeSavedValue == null && !locked
              ? "No round in this sequence has a comparable price on both sides"
              : totals.cumulativeSavedPct != null
              ? `${formatSignedPct(totals.cumulativeSavedPct)} across ${cumulativeRounds} round${
                  cumulativeRounds === 1 ? "" : "s"
                }`
              : `Across ${cumulativeRounds} round${cumulativeRounds === 1 ? "" : "s"} on these items`
          }
        />
      ) : (
        <StatCard
          testId="stat-single-round"
          tone="neutral"
          icon={<Layers />}
          value="1"
          label="Rounds so far"
          sub="This is the only round on this record"
        />
      )}

      {/* 3 — attainment, or an honest "no target" */}
      {hasTarget ? (
        <StatCard
          testId="stat-attainment"
          tone={
            totals.targetMet === true ? "green" : totals.attainmentPct == null ? "neutral" : "amber"
          }
          icon={<Target />}
          value={totals.attainmentPct != null ? formatPct(totals.attainmentPct, { digits: 0 }) : "—"}
          label="Of the requested reduction"
          sub={
            totals.targetMet === true
              ? "Target met"
              : totals.targetMet === false
              ? "Below target"
              : "Attainment not computable"
          }
        />
      ) : (
        <StatCard
          testId="stat-no-target"
          tone="neutral"
          icon={<Target />}
          value="—"
          label="No price target"
          sub="This round was opened without a numeric target"
        />
      )}

      {/* 4 — participation */}
      <StatCard
        testId="stat-responses"
        tone={responded === 0 ? "amber" : responded >= lineCount && lineCount > 0 ? "green" : "blue"}
        icon={<Users />}
        value={
          <>
            {responded}
            <span className="cur"> of {lineCount}</span>
          </>
        }
        label="Lines responded"
        sub={responded === 0 ? "No vendor has replied yet" : scopeLabel}
      />

      {/* 5 — the clock */}
      <StatCard
        testId="stat-deadline"
        tone={round.isTerminated ? "neutral" : round.closedAt ? "neutral" : "violet"}
        icon={<CalendarClock />}
        value={
          <span style={{ fontSize: 14, fontWeight: 600 }}>{formatDateTime(deadline)}</span>
        }
        label={round.closedAt ? "Closed" : "Responses due"}
        sub={deadlineRel || "No deadline recorded"}
      />
    </div>
  );
}
