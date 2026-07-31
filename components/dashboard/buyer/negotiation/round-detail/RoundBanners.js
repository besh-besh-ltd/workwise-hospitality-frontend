// Every edge case this page must handle VISIBLY, in one ordered strip.
//
// The ordering is deliberate: state of the record first (cancelled / sealed),
// then what is blocking (approval), then what the numbers do and do not mean
// (no target, regression, stale baseline, no responses).
//
// The one thing this component must never do is render a red "target missed"
// treatment on a round that never had a target — roughly 60% of rounds.

import { Lock, Ban, AlertTriangle, Info, TrendingDown, Gavel, FileText } from "lucide-react";
import {
  formatDateTime,
  formatMoney,
  roundDenominatorText,
} from "./roundDetailModel";

function Banner({ tone, icon, children, testId }) {
  return (
    <div className={`guide ${tone}`} style={{ alignItems: "flex-start" }} data-testid={testId}>
      <div className="g-ic">{icon}</div>
      <div>{children}</div>
    </div>
  );
}

export default function RoundBanners({ model, scope }) {
  const { round, totals, lines, meta } = model;
  const banners = [];

  // ── the record itself ────────────────────────────────────────────────────
  if (round.isTerminated) {
    const word = round.statusPresentation.label.toLowerCase();
    banners.push(
      <Banner key="terminated" tone="danger" icon={<Ban size={14} />} testId="banner-terminated">
        <strong>This round was {word}.</strong> It is rendered in full anyway — the targets that
        were asked for and any prices that came back are the historical record of the negotiation.
        {round.closedAt ? ` Closed ${formatDateTime(round.closedAt)}.` : ""}
      </Banner>
    );
  }

  if (meta.quoteVisibilityLocked) {
    banners.push(
      <Banner key="locked" tone="warn" icon={<Lock size={14} />} testId="banner-locked">
        <strong>Vendor prices are sealed.</strong> You can see the round metadata and the targets
        you set, but no baseline, revised price or saving until the quote submission deadline
        passes.
        {meta.quoteVisibilityReason ? ` ${meta.quoteVisibilityReason}` : ""}
      </Banner>
    );
  }

  // ── what is blocking ─────────────────────────────────────────────────────
  if (round.approval?.isPending) {
    banners.push(
      <Banner key="approval" tone="violet" icon={<Gavel size={14} />} testId="banner-approval">
        <strong>Waiting on approval.</strong>{" "}
        {round.approval.pendingWith
          ? `Currently with ${round.approval.pendingWith}`
          : "Currently with the configured approver"}
        {round.approval.level != null && round.approval.totalLevels != null
          ? ` · level ${round.approval.level} of ${round.approval.totalLevels}`
          : ""}
        . Vendors are not notified until this clears.
      </Banner>
    );
  }
  if (round.approval?.isRejected) {
    banners.push(
      <Banner key="approval-rejected" tone="danger" icon={<Ban size={14} />} testId="banner-approval-rejected">
        <strong>This round was rejected in approval.</strong> The targets below were never sent to
        the vendors.
      </Banner>
    );
  }

  // ── what the numbers mean ────────────────────────────────────────────────
  const noTargetAnywhere = totals.targetValue == null && !lines.some((l) => l.hasNumericTarget);
  if (noTargetAnywhere && lines.length > 0) {
    // Info, never danger. A target that was not set cannot be missed.
    banners.push(
      <Banner key="no-target" tone="" icon={<Info size={14} />} testId="banner-no-target">
        <strong>No price target was set on this round.</strong> Everything below reports what was
        actually achieved against the baseline. There is nothing to score attainment against, so no
        target result is shown.
      </Banner>
    );
  }

  if (totals.savedValue != null && totals.savedValue < 0 && !meta.quoteVisibilityLocked) {
    banners.push(
      <Banner key="regression" tone="danger" icon={<TrendingDown size={14} />} testId="banner-regression">
        <strong>Prices went up on this round.</strong> Net movement is{" "}
        {formatMoney(Math.abs(totals.savedValue))} <em>against</em> you. This page shows the real
        signed figure — the dashboard tile clamps regressions to zero, this one deliberately does
        not.
      </Banner>
    );
  }

  const anyRegressedLine =
    !meta.quoteVisibilityLocked &&
    (totals.savedValue == null || totals.savedValue >= 0) &&
    lines.some((l) => l.savedValue != null && l.savedValue < 0);
  if (anyRegressedLine) {
    const n = lines.filter((l) => l.savedValue != null && l.savedValue < 0).length;
    banners.push(
      <Banner key="line-regression" tone="warn" icon={<AlertTriangle size={14} />} testId="banner-line-regression">
        <strong>
          {n} line{n === 1 ? "" : "s"} came back more expensive
        </strong>{" "}
        even though the round is net positive overall. They are flagged in danger colour in the
        table below.
      </Banner>
    );
  }

  if (
    totals.respondedCount === 0 &&
    lines.length > 0 &&
    !round.isTerminated &&
    !meta.quoteVisibilityLocked
  ) {
    banners.push(
      <Banner key="no-responses" tone="warn" icon={<AlertTriangle size={14} />} testId="banner-no-responses">
        <strong>No vendor has responded yet.</strong> The charts show the reduction you requested
        with no achieved series to compare it against.
        {round.endDate ? ` Responses are due ${formatDateTime(round.endDate)}.` : ""}
      </Banner>
    );
  }

  if (meta.baselineStale && !meta.quoteVisibilityLocked) {
    banners.push(
      <Banner key="stale-baseline" tone="warn" icon={<Info size={14} />} testId="banner-stale-baseline">
        <strong>At least one baseline is stale.</strong> It was captured when the round opened and
        the vendor&apos;s live quote has moved since. Hover the source label on each line to see
        exactly where its baseline came from.
      </Banner>
    );
  }

  // ── shape of the record ──────────────────────────────────────────────────
  if (round.wholeParentMode) {
    banners.push(
      <Banner key="whole-parent" tone="" icon={<FileText size={14} />} testId="banner-whole-parent">
        <strong>Whole-{round.isArc ? "contract" : "RFQ"} round.</strong> The targets were set once
        across the record rather than per item, so per-line figures are apportioned from the
        record-level ask.
      </Banner>
    );
  }

  if (round.isArc) {
    banners.push(
      <Banner key="arc" tone="" icon={<Info size={14} />} testId="banner-arc">
        <strong>This round belongs to a rate contract.</strong> ARC rounds are negotiated inside
        the contract&apos;s commercial stage — figures here mirror that stage rather than an RFQ
        quote comparison.
      </Banner>
    );
  }

  // Both denominators disagree — say so rather than picking one.
  if (
    round.roundsOnParent != null &&
    round.roundsInScope != null &&
    round.roundsOnParent !== round.roundsInScope
  ) {
    banners.push(
      <Banner key="denominator" tone="" icon={<Info size={14} />} testId="banner-denominator">
        <strong>{roundDenominatorText(round)}.</strong> The two counts differ because rounds are
        numbered across the whole {round.isArc ? "rate contract" : "RFQ"} while this cycle covers
        only the items floated together.
        {scope === "round" ? " You are currently viewing this round only." : ""}
      </Banner>
    );
  }

  if (banners.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="round-banners">
      {banners}
    </div>
  );
}
