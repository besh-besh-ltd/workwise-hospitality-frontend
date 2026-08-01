// Level 2 — one RFQ's negotiation, end to end.
//
// The listing collapsed 886 rounds into 124 RFQ cards. This is where the
// rounds went: the gist of the RFQ's whole negotiation at the top, then every
// round of it as a table row. RFQ 512 has 138 of them, which is exactly why
// this is a table and not a stack of cards.
//
// TWO CALLS, ONE ENDPOINT. `POST /negotiation/list-view` serves both grains:
//   1. groupBy 'parent' + parentKey filter, limit 1 → the roll-up, the state
//      mix and the savings block. Identical numbers to the listing card,
//      because it is literally the same row.
//   2. groupBy 'round'  + parentKey filter, paged  → the rounds table.
// No new endpoint, so there is no second server-side definition of "what state
// is this round in" to drift out of sync.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Layers, PiggyBank, Package, TrendingDown, UserCheck, Users } from "lucide-react";

import { getNegotiationListView } from "@/services/negotiation";
import { negStatePresentation } from "../round-detail/negotiationStates";
import StateStrip from "../list/StateStrip";
import LifecycleHero from "@/components/dashboard/shared/LifecycleHero";
import {
  ROLL_UP_TOOLTIP,
  asArray,
  fmtDate,
  formatPct,
  formatSaved,
  parentNumber,
  parentTitle,
  savedWord,
  savingsView,
  toDate,
} from "../list/parentRow";

const ROUNDS_PER_PAGE = 20;
const LIST_HREF = "/dashboard/buyer/negotiation";

const roundHref = (roundId) => `/dashboard/buyer/negotiation/round/${roundId}`;

/* ── gist tiles ───────────────────────────────────────────────────────────── */

function Tile({ tone = "neutral", icon, value, label, sub, testId }) {
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

/**
 * The savings tile. Same rule as the listing card: the total across every
 * participating vendor is the headline, the awarded-vendor share sits under it
 * by name, and an RFQ with no approved quote says so instead of claiming ₹0.
 */
function SavedTile({ row }) {
  const view = savingsView(row);
  if (view.kind !== "measured") {
    return (
      <Tile
        testId="gist-saved"
        tone="neutral"
        icon={<PiggyBank />}
        value="—"
        label="Saved"
        sub={view.kind === "arc" ? "Tracked on the rate contract" : "Nothing comparable to measure yet"}
      />
    );
  }
  const negative = view.value < 0;
  const pct = formatPct(view.pct);
  return (
    <Tile
      testId="gist-saved"
      tone={negative ? "danger" : "green"}
      icon={negative ? <TrendingDown /> : <PiggyBank />}
      value={formatSaved(view.value)}
      label={`${savedWord(view.value)} · all vendors`}
      sub={
        view.awarded ? (
          <span data-testid="gist-saved-awarded">
            <span className="fw-600">{formatSaved(view.awarded.value)}</span> on awarded vendors
            {pct ? ` · ${pct} overall` : ""}
          </span>
        ) : (
          <span
            data-testid="gist-saved-awarded"
            title="No quote on this RFQ has been approved yet, so no share of the saving belongs to an awarded vendor."
          >
            not yet awarded
          </span>
        )
      }
    />
  );
}

/* ── rounds table ─────────────────────────────────────────────────────────── */

function windowText(round) {
  const closed = fmtDate(round.closed_at);
  if (closed) return `Closed ${closed}`;
  const end = toDate(round.end_date);
  if (!end) return "—";
  return `${end.getTime() > Date.now() ? "Ends" : "Ended"} ${fmtDate(round.end_date)}`;
}

function RoundsTable({ rounds }) {
  return (
    <div className="table-scroll">
      <table className="table" data-testid="rounds-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Products</th>
            <th className="center">Vendors</th>
            <th>Window</th>
            {/* No "Saved" column. The round grain carries no money of its own
                — savings are computed per RFQ across rounds — so the column
                could only ever render an em dash, which teaches the reader the
                figure does not exist. It does: the Saved tile above holds the
                RFQ-wide number, and each round's own figures are one click
                away on the round itself. */}
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => {
            const st = negStatePresentation(r.neg_status);
            const items = asArray(r.item_names);
            const invited = Number(r.invited_count || 0);
            const quoted = Number(r.quotes_received || 0);
            return (
              <tr key={r.round_id} data-testid={`round-row-${r.round_id}`}>
                <td className="strong">
                  <Link href={roundHref(r.round_id)} style={{ color: "inherit", textDecoration: "none" }}>
                    Round {r.round_number || r.stored_round_number || 1}
                  </Link>
                  {r.action_required && r.action_label && (
                    <span className="needs-action-pill" style={{ marginLeft: 8 }}>{r.action_label}</span>
                  )}
                  <div className="fs-11 text-fg-3">{fmtDate(r.round_created_at) || ""}</div>
                </td>
                <td>
                  {items.length === 0 ? (
                    <span className="text-fg-3">—</span>
                  ) : (
                    <span title={items.map(String).join(", ")}>
                      <span className="em">{String(items[0])}</span>
                      {items.length > 1 ? ` +${items.length - 1}` : ""}
                    </span>
                  )}
                </td>
                <td className="center">
                  <span className="mono fw-600">{quoted}</span>
                  <span className="text-fg-3"> / {invited}</span>
                  <div className="fs-11 text-fg-3">quoted</div>
                </td>
                <td>{windowText(r)}</td>
                <td>
                  <span className={`status-pill ${st.tone}`} title={st.description}>
                    <span className="dot" /><span>{st.label}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function RfqNegotiationPage({ rfqId }) {
  const parentKey = rfqId != null ? `RFQ:${rfqId}` : null;

  const [parent, setParent] = useState(null);
  const [parentLoading, setParentLoading] = useState(true);
  const [parentFailed, setParentFailed] = useState(false);

  const [rounds, setRounds] = useState([]);
  const [roundsTotal, setRoundsTotal] = useState(0);
  const [roundsLimit, setRoundsLimit] = useState(ROUNDS_PER_PAGE);
  const [roundsLoading, setRoundsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [onlyMine, setOnlyMine] = useState(false);

  const parentSeq = useRef(0);
  const roundsSeq = useRef(0);

  // 1 — the gist. limit 1: the parentKey filter can only ever match one row.
  useEffect(() => {
    if (!parentKey) return;
    const id = ++parentSeq.current;
    setParentLoading(true);
    setParentFailed(false);
    getNegotiationListView({ groupBy: "parent", filters: { parentKey: [parentKey] }, limit: 1 })
      .then((res) => {
        if (id !== parentSeq.current) return;
        const row = (res?.data?.rows || [])[0] || null;
        setParent(row);
        setParentFailed(!row);
      })
      .catch(() => {
        if (id !== parentSeq.current) return;
        setParent(null);
        setParentFailed(true);
      })
      .finally(() => { if (id === parentSeq.current) setParentLoading(false); });
  }, [parentKey]);

  // 2 — the rounds. Paged, because 138 of them on one page is the problem this
  // whole change exists to fix.
  useEffect(() => {
    if (!parentKey) return;
    const id = ++roundsSeq.current;
    setRoundsLoading(true);
    getNegotiationListView({
      groupBy: "round",
      filters: { parentKey: [parentKey] },
      needsMyApproval: onlyMine,
      sort: "recent",
      page,
      limit: ROUNDS_PER_PAGE,
    })
      .then((res) => {
        if (id !== roundsSeq.current) return;
        const d = res?.data || {};
        setRounds(Array.isArray(d.rows) ? d.rows : []);
        setRoundsTotal(Number(d.total || 0));
        setRoundsLimit(Number(d.limit) > 0 ? Number(d.limit) : ROUNDS_PER_PAGE);
      })
      .catch(() => {
        if (id !== roundsSeq.current) return;
        setRounds([]);
        setRoundsTotal(0);
      })
      .finally(() => { if (id === roundsSeq.current) setRoundsLoading(false); });
  }, [parentKey, page, onlyMine]);

  const showMine = useCallback(() => { setOnlyMine(true); setPage(1); }, []);

  // The first round on this RFQ that is waiting on the caller. `action_required`
  // is stamped per row by the server against the logged-in user, so this is
  // never a guess about who someone is.
  const mineOnPage = useMemo(() => rounds.find((r) => r.action_required) || null, [rounds]);

  const totalPages = Math.max(1, Math.ceil(roundsTotal / (roundsLimit || ROUNDS_PER_PAGE)));

  if (parentLoading && !parent) {
    return (
      <main className="main-body" data-testid="rfq-negotiation-skeleton">
        <span className="arc-sk" style={{ display: "block", height: 148, borderRadius: 14 }} />
        <div className="stat-strip" style={{ marginTop: 14 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="arc-sk" style={{ display: "block", height: 76, borderRadius: 12 }} />
          ))}
        </div>
        <span className="arc-sk" style={{ display: "block", height: 260, borderRadius: 14, marginTop: 14 }} />
      </main>
    );
  }

  if (parentFailed || !parent) {
    return (
      <main className="main-body">
        <div className="empty-state" style={{ padding: "64px 24px" }} data-testid="rfq-negotiation-error">
          <div className="ic">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>No negotiation on this RFQ</h2>
          <p>Either no round has been opened on it, or it is outside what you can see.</p>
          <div style={{ marginTop: 18 }}>
            <Link href={LIST_HREF} className="btn btn-secondary btn-sm">Back to negotiations</Link>
          </div>
        </div>
      </main>
    );
  }

  const st = negStatePresentation(parent.neg_status);
  const roundCount = Number(parent.round_count || 0);
  const vendors = asArray(parent.vendors);
  const vendorCount = Number(parent.vendor_count ?? vendors.length ?? 0);
  const productCount = Number(parent.product_count ?? asArray(parent.item_names).length ?? 0);
  const quotesReceived = Number(parent.quotes_received || 0);

  return (
    <main className="main-body" data-testid="rfq-negotiation-page">
      <LifecycleHero
        eyebrow={`${parent.is_tender ? "Tender" : "RFQ"} · Negotiation`}
        title={parentTitle(parent)}
        status={{ label: st.label, tone: st.heroChip }}
        idText={`#${parentNumber(parent)}`}
        back={{ label: "Back to negotiations", href: LIST_HREF }}
        sub={
          <>
            <span data-testid="hero-rounds">
              <span className="em">{roundCount}</span> {roundCount === 1 ? "round" : "rounds"}
            </span>
            <span className="sep">·</span>
            <span title={ROLL_UP_TOOLTIP} data-testid="hero-state-description">{st.description}</span>
            {parent.hotel_name && (<><span className="sep">·</span><span>{parent.hotel_name}</span></>)}
            {parent.department_title && (<><span className="sep">·</span><span>{parent.department_title}</span></>)}
          </>
        }
        meta={[
          { label: "First round", value: fmtDate(parent.first_round_at) || "—" },
          { label: "Last activity", value: fmtDate(parent.last_activity_at) || "—" },
          { label: "Next deadline", value: fmtDate(parent.next_deadline) || "None pending" },
          { label: "Vendor responses", value: quotesReceived },
        ]}
      />

      {/* ── the gist ── every question the card raised, answered before the
          reader has to open a single round. ── */}
      <div className="stat-strip" style={{ marginTop: 14 }} data-testid="gist-strip">
        <SavedTile row={parent} />

        <Tile
          testId="gist-rounds"
          tone="indigo"
          icon={<Layers />}
          value={roundCount}
          label={roundCount === 1 ? "Round" : "Rounds"}
          sub={<StateStrip stateCounts={parent.state_counts} roundCount={roundCount} showTotal={false} testId="gist-state-strip" />}
        />

        <Tile
          testId="gist-products"
          tone="blue"
          icon={<Package />}
          value={productCount}
          label={productCount === 1 ? "Product negotiated" : "Products negotiated"}
          sub="Not every product on the RFQ — only the ones a round touched."
        />

        <Tile
          testId="gist-vendors"
          tone="violet"
          icon={<Users />}
          value={vendorCount}
          label={vendorCount === 1 ? "Vendor invited" : "Vendors invited"}
          sub={`${quotesReceived} vendor ${quotesReceived === 1 ? "response" : "responses"}`}
        />

        {mineOnPage ? (
          <Tile
            testId="gist-needs-you"
            tone="amber"
            icon={<UserCheck />}
            value={
              <Link href={roundHref(mineOnPage.round_id)} style={{ color: "inherit" }} data-testid="needs-you-link">
                Round {mineOnPage.round_number || mineOnPage.stored_round_number || 1}
              </Link>
            }
            label="Needs you"
            sub={mineOnPage.action_label || "An approval is assigned to you"}
          />
        ) : parent.action_required ? (
          <Tile
            testId="gist-needs-you"
            tone="amber"
            icon={<UserCheck />}
            value={
              <button
                type="button"
                onClick={showMine}
                data-testid="needs-you-show"
                style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
              >
                Show
              </button>
            }
            label="Needs you"
            sub={parent.action_label || "An approval on this RFQ is assigned to you"}
          />
        ) : (
          <Tile
            testId="gist-needs-you"
            tone="neutral"
            icon={<CalendarClock />}
            value="All clear"
            label="Needs you"
            sub="Nothing needs you right now"
          />
        )}
      </div>

      {/* ── the rounds ── */}
      <div className="section-card" style={{ marginTop: 14 }}>
        <div className="section-head">
          <div className="h-left">
            <h2>Rounds</h2>
            <span className="h-sub">
              {roundsTotal} {roundsTotal === 1 ? "round" : "rounds"}
              {onlyMine ? " waiting on you" : ""} · newest first
            </span>
          </div>
          <div className="h-right">
            <label className="filter-opt" style={{ cursor: "pointer", margin: 0 }} data-testid="rounds-only-mine">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={() => { setOnlyMine((v) => !v); setPage(1); }}
              />
              <span className="fo-box" />
              <span className="fo-text">Only rounds needing my approval</span>
            </label>
          </div>
        </div>
        <div className="section-body flush">
          {roundsLoading && rounds.length === 0 ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="arc-sk" style={{ display: "block", height: 34, borderRadius: 8 }} />
              ))}
            </div>
          ) : rounds.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 24px" }} data-testid="rounds-empty">
              <h2>{onlyMine ? "No round here is waiting on you" : "No rounds to show"}</h2>
              <p>
                {onlyMine
                  ? "Clear the filter to see every round on this RFQ."
                  : "Rounds appear here as soon as one is opened on this RFQ."}
              </p>
            </div>
          ) : (
            <RoundsTable rounds={rounds} />
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
          <span style={{ fontSize: 12.5, color: "#71717a", padding: "0 8px" }} data-testid="rounds-pager">
            Page {page} of {totalPages}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
        </div>
      )}
    </main>
  );
}
