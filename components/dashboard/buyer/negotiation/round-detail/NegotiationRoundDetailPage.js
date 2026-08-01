// NEGOTIATION COMMAND CENTER — the single source of truth for one negotiation.
//
// The job: when a vendor calls or emails, the buyer opens this one page and can
// answer anything without a second click — what state the negotiation is in,
// what reduction was asked for, what was achieved, how much has been saved so
// far, who has responded and who hasn't, when the deadline is, what's pending
// approval, what happened in previous rounds, and what they can do next.
//
// Data: GET /negotiation/rounds/:id/detail?scope=round|cycle, normalised
// through ./roundDetailModel (which is where all the defensive field reading
// and derived math lives — see that file's header).
//
// Scope: the page defaults to `cycle` when sibling rounds exist and `round`
// otherwise, and the toggle is always visible so the figure is never ambiguous
// about what it covers. 885 of 886 production rounds are one product × one
// vendor, which is exactly why the denominator has to be stated.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Coins,
  ListOrdered,
  Users,
  Gavel,
  History,
  RefreshCw,
} from "lucide-react";

import LifecycleHero from "@/components/dashboard/shared/LifecycleHero";
import { getNegotiationRoundDetail } from "@/services/negotiation";

import {
  normalizeRoundDetail,
  defaultScope,
  roundDenominatorText,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from "./roundDetailModel";
import ScopeToggle, { scopeLabelText } from "./ScopeToggle";
import RoundBanners from "./RoundBanners";
import RoundStatStrip from "./RoundStatStrip";
import ReductionChart from "./ReductionChart";
import MoneyFlowChart from "./MoneyFlowChart";
import RoundLinesTable from "./RoundLinesTable";
import VendorPanel from "./VendorPanel";
import ApprovalPanel from "./ApprovalPanel";
import RoundHistoryPanel from "./RoundHistoryPanel";
import RoundActions from "./RoundActions";
import RoundDetailSkeleton from "./RoundDetailSkeleton";

function SectionCard({ title, sub, icon, right, children, testId, flush }) {
  return (
    <section className="section-card" data-testid={testId}>
      <div className="section-head">
        <div className="h-left">
          <span className="ic">{icon}</span>
          <div>
            <h2>{title}</h2>
            {sub && <div className="h-sub">{sub}</div>}
          </div>
        </div>
        {right && <div className="h-right">{right}</div>}
      </div>
      {flush ? children : <div className="section-body">{children}</div>}
    </section>
  );
}

export default function NegotiationRoundDetailPage({ roundId }) {
  // `null` scope means "let the server apply the product default"; the toggle
  // switches it to an explicit value from then on.
  const [scope, setScope] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (nextScope, { silent = false } = {}) => {
      if (!roundId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await getNegotiationRoundDetail(roundId, { scope: nextScope || undefined });
        setModel(normalizeRoundDetail(res));
      } catch (e) {
        setModel(null);
        setError({
          message: e?.message || "This negotiation round could not be loaded.",
          // 423 from helper/quoteVisibility.js — quotes are still sealed.
          quoteVisibility: e?.meta?.quoteVisibility || e?.quoteVisibility || null,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roundId]
  );

  useEffect(() => {
    load(scope, { silent: model != null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, scope]);

  const activeScope = useMemo(() => scope || defaultScope(model) || "round", [scope, model]);

  const copyLink = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, []);

  if (loading && !model) return <RoundDetailSkeleton />;

  if (error || !model?.round) {
    return (
      <main className="main-body">
        <div className="empty-state" style={{ padding: "64px 24px" }} data-testid="round-detail-error">
          <div className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>
            {error?.quoteVisibility?.locked
              ? "Quotes are still sealed"
              : "This negotiation round is not available"}
          </h2>
          <p>
            {error?.quoteVisibility?.locked
              ? error.quoteVisibility.message ||
                "Vendor prices stay hidden until the quote submission deadline passes."
              : error?.message ||
                "It may have been removed, or you may not have access to the RFQ or rate contract it belongs to."}
          </p>
          <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center" }}>
            <Link href="/dashboard/buyer/negotiation" className="btn btn-secondary btn-sm">
              Back to negotiations
            </Link>
            <button type="button" className="btn btn-sm" onClick={() => load(scope)}>
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { round, lines, totals, vendors, history, actions, meta } = model;
  const locked = meta.quoteVisibilityLocked;
  const scopeLabel = scopeLabelText(activeScope, round.roundNumber);
  const chip = round.statusPresentation;

  return (
    <main className="main-body" data-testid="negotiation-round-detail">
      {/* ── HERO ── muted (desaturated) for cancelled / expired rounds, but
          still rendered in full: the historical value is the point. ── */}
      <div
        data-testid={round.isTerminated ? "hero-muted" : "hero"}
        style={round.isTerminated ? { filter: "saturate(0.4)", opacity: 0.94 } : undefined}
      >
        <LifecycleHero
          eyebrow={`${round.isArc ? "Rate contract" : round.isTender ? "Tender" : "RFQ"} · Negotiation round`}
          title={round.title}
          status={{ label: chip.label, tone: chip.chip }}
          // The RFQ / ARC number, not the round id — that is the number a
          // vendor reads off their email when they call.
          idText={`#${round.rfqNo || round.arcNo || round.rfqId || round.arcId || round.roundId}`}
          copy={{ copied, onCopy: copyLink, label: "Copy link to this round" }}
          back={{ label: "Back to negotiations", href: "/dashboard/buyer/negotiation" }}
          sub={
            <>
              {/* The state, spelled out. Nothing else on the page says in
                  plain words what "Ready for your decision" actually means. */}
              <span data-testid="hero-state-description">{chip.description}</span>
              <span className="sep">·</span>
              <span className="em" data-testid="hero-denominator">
                {roundDenominatorText(round)}
              </span>
              {round.hotelName && (
                <>
                  <span className="sep">·</span>
                  <span data-testid="hero-hotel">{round.hotelName}</span>
                </>
              )}
              {round.departmentTitle && (
                <>
                  <span className="sep">·</span>
                  <span data-testid="hero-department">{round.departmentTitle}</span>
                </>
              )}
              {round.categoryTitle && (
                <>
                  <span className="sep">·</span>
                  <span>{round.categoryTitle}</span>
                </>
              )}
              {round.createdByName && (
                <>
                  <span className="sep">·</span>
                  <span data-testid="hero-creator">
                    Opened by <span className="em">{round.createdByName}</span>
                    {round.createdAt ? ` · ${formatDateTime(round.createdAt)}` : ""}
                  </span>
                </>
              )}
            </>
          }
          actions={<RoundActions actions={actions} round={round} onDark />}
          meta={[
            {
              label: "Responses due",
              value: <span className="em">{formatDateTime(round.endDate)}</span>,
            },
            {
              label: round.closedAt ? "Closed" : "Opened",
              value: <span className="em">{formatDateTime(round.closedAt || round.createdAt)}</span>,
            },
            {
              label: "Targets set on",
              value: (
                <span className="em">
                  {round.wholeParentMode
                    ? `Whole ${round.isArc ? "contract" : "RFQ"}`
                    : "Individual items"}
                </span>
              ),
            },
            {
              label: "Baseline value",
              value: <span className="em">{locked ? "Sealed" : formatMoney(totals.baselineValue)}</span>,
            },
            {
              label: "Net movement",
              value: (
                <span className="em">
                  {locked ? "Sealed" : formatSignedMoney(totals.savedValue)}
                  {!locked && totals.savedPct != null ? ` · ${formatSignedPct(totals.savedPct)}` : ""}
                </span>
              ),
            },
          ]}
        />
      </div>

      <RoundBanners model={model} scope={activeScope} />

      {/* ── SCOPE BAR ── the denominator, always visible ── */}
      <div className="list-toolbar">
        <div className="lt-left" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <ScopeToggle
            scope={activeScope}
            roundNumber={round.roundNumber}
            hasSiblings={meta.hasSiblings}
            siblingCount={meta.siblingCount}
            busy={refreshing}
            onChange={setScope}
          />
          <span className="fs-12 text-fg-3">
            Every figure on this page covers{" "}
            <span className="fw-600 text-fg">{scopeLabel.toLowerCase()}</span> ·{" "}
            <span className="mono fw-600 text-fg">{totals.lineCount ?? lines.length}</span>{" "}
            {(totals.lineCount ?? lines.length) === 1 ? "line" : "lines"}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => load(scope, { silent: true })}
          disabled={refreshing}
          data-testid="refresh"
        >
          <RefreshCw size={13} strokeWidth={2} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <RoundStatStrip round={round} totals={totals} scopeLabel={scopeLabel} locked={locked} />

      {/* ── CHARTS ── `.dash-grid.lop` is the shared 1.6fr/1fr split that
          collapses to one column under 1000px. ── */}
      <div className="dash-grid lop">
        <SectionCard
          testId="chart-reduction-card"
          icon={<BarChart3 size={13} strokeWidth={2} />}
          title="Requested vs achieved reduction"
          sub="Both series are % off the same baseline — the only axis on which a unit-price ask and a line-total outcome are comparable."
        >
          <ReductionChart lines={lines} locked={locked} respondedCount={totals.respondedCount ?? 0} />
        </SectionCard>

        <SectionCard
          testId="chart-money-card"
          icon={<Coins size={13} strokeWidth={2} />}
          title="Where the money went"
          sub={`Aggregate for ${scopeLabel.toLowerCase()}.`}
        >
          <MoneyFlowChart totals={totals} locked={locked} />
        </SectionCard>
      </div>

      {/* ── LINE LEDGER ── */}
      <SectionCard
        testId="lines-card"
        flush
        icon={<ListOrdered size={13} strokeWidth={2} />}
        title="Line by line"
        sub="What was asked, what came back, and where each baseline came from."
        right={
          <span className="fs-11 text-fg-3">
            {totals.respondedCount ?? 0} of {totals.lineCount ?? lines.length} responded
          </span>
        }
      >
        <RoundLinesTable lines={lines} locked={locked} scopeLabel={scopeLabel} />
      </SectionCard>

      {/* ── PEOPLE + APPROVAL ── */}
      <div className="dash-grid">
        <SectionCard
          testId="vendors-card"
          flush
          icon={<Users size={13} strokeWidth={2} />}
          title="Vendor participation"
          sub="Who has replied, who hasn't, and how to reach them."
        >
          <VendorPanel vendors={vendors} locked={locked} />
        </SectionCard>

        <SectionCard
          testId="approval-card"
          flush
          icon={<Gavel size={13} strokeWidth={2} />}
          title="Approval"
          sub="A round reaches vendors only after this clears."
        >
          <ApprovalPanel approval={round.approval} />
        </SectionCard>
      </div>

      {/* ── HISTORY ── */}
      <SectionCard
        testId="history-card"
        flush
        icon={<History size={13} strokeWidth={2} />}
        title="Every round on this record"
        sub="Each figure is scoped to its own round — no cumulative number is presented as a round number."
      >
        <RoundHistoryPanel history={history} currentRoundId={round.roundId} locked={locked} />
      </SectionCard>
    </main>
  );
}
