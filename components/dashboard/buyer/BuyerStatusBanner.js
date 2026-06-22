import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment";
import { Sparkles, RefreshCw } from "lucide-react";
import { getBuyerStatusBanner } from "@/services/dashboard";
import PendingApprovalsModal from "./dashboard-components/PendingApprovalsModal";
import styles from "./BuyerStatusBanner.module.scss";

// Mode → outer card variant. The base is a deep navy hero; criticality
// just nudges the accents so the rest stays calm.
const MODE_THEME = {
  clear:         { className: "modeClear" },
  steady:        { className: "modeSteady" },
  action_needed: { className: "modeActionNeeded" },
  critical:      { className: "modeCritical" },
};

// Targets a highlight can carry:
//   - { href }       → renders as a Next <Link>
//   - { modal: 'X' } → renders as a button that opens a banner-owned modal
const TARGET = {
  CLOSING_SOON:        { href: "/dashboard/buyer/rfq-management?tab=manage-rfq" },
  CLOSED_NO_QUOTES:    { href: "/dashboard/buyer/rfq-management?ended_no_quotes=1" },
  APPROVALS:           { modal: "approvals" },
  QUOTE_COMPARE:       { href: "/dashboard/buyer/quote-comparison" },
  PO_VENDOR_PENDING:   { href: "/dashboard/buyer/purchase-orders/tracking" },
  WEEKLY_PUBLISHED:    { href: "/dashboard/buyer/rfq-management?tab=manage-rfq" },
};

const greetingFor = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Build the narrative as TWO lines of fragments — { primary, secondary }.
 * Line 1 (primary) carries the main situational message; line 2 (secondary)
 * carries the "you also have N approvals…" follow-up. Each fragment is plain
 * text or a highlight with an optional `target` (link or modal).
 */
const approvalsFragment = (n) => ({
  text: `${n} approval${n > 1 ? "s" : ""}`,
  highlight: true,
  target: TARGET.APPROVALS,
});
const poFragment = (n) => ({
  text: `${n} PO${n > 1 ? "s" : ""}`,
  highlight: true,
  target: TARGET.PO_VENDOR_PENDING,
});

const buildNarrative = (data, mode) => {
  const c = data?.counts || {};
  const w = data?.weekly || {};
  const close = data?.soonest_closing;

  if (mode === "critical") {
    const primary = [];
    if (c.closed_no_quotes > 0) {
      primary.push({ text: "Heads up — " });
      primary.push({
        text: `${c.closed_no_quotes} RFQ${c.closed_no_quotes > 1 ? "s" : ""} ended without quotes`,
        highlight: true,
        target: TARGET.CLOSED_NO_QUOTES,
      });
      primary.push({ text: ". Vendors aren't responding; consider re-issuing or closing them out." });
    } else {
      primary.push({ text: "A few items need your attention." });
    }
    const secondary = [];
    if (c.pending_approvals > 0) {
      secondary.push({ text: "You also have " }, approvalsFragment(c.pending_approvals), { text: " waiting on you." });
    }
    return { primary, secondary };
  }

  if (mode === "action_needed") {
    const closingParts = [];
    if (c.closing_soon > 0) {
      closingParts.push({
        text: `${c.closing_soon} RFQ${c.closing_soon > 1 ? "s" : ""} close${c.closing_soon === 1 ? "s" : ""} within 24 hours`,
        highlight: true,
        target: TARGET.CLOSING_SOON,
      });
      closingParts.push({ text: close?.title ? ` — earliest is ${close.title}.` : "." });
      closingParts.push({ text: " Work the urgent ones first — the rest can wait." });
    }
    const followUp = [];
    if (c.pending_approvals > 0) {
      followUp.push({ text: "You have " }, approvalsFragment(c.pending_approvals), { text: " on your plate" });
    }
    if (c.po_acceptance_pending > 0) {
      followUp.push({ text: followUp.length ? " and " : "You have " }, poFragment(c.po_acceptance_pending), { text: " awaiting vendor acceptance" });
    }
    if (followUp.length) followUp.push({ text: "." });

    // If there's no closing-soon line, promote the follow-up to the primary line.
    if (!closingParts.length) return { primary: followUp, secondary: [] };
    return { primary: closingParts, secondary: followUp };
  }

  if (mode === "steady") {
    const total =
      (c.pending_approvals || 0) +
      (c.quote_compare_ready || 0) +
      (c.po_acceptance_pending || 0);
    const primary = [
      { text: "You have " },
      { text: `${total} thing${total === 1 ? "" : "s"}`, highlight: true },
      { text: " on your plate today." },
    ];
    const fragments = [];
    if (c.pending_approvals > 0) {
      fragments.push({ text: `${c.pending_approvals} approval${c.pending_approvals > 1 ? "s" : ""} pending`, highlight: true, target: TARGET.APPROVALS });
    }
    if (c.quote_compare_ready > 0) {
      fragments.push({ text: `${c.quote_compare_ready} quote${c.quote_compare_ready > 1 ? "s" : ""} ready to compare`, highlight: true, target: TARGET.QUOTE_COMPARE });
    }
    if (c.po_acceptance_pending > 0) {
      fragments.push({ text: `${c.po_acceptance_pending} PO${c.po_acceptance_pending > 1 ? "s" : ""} awaiting vendor`, highlight: true, target: TARGET.PO_VENDOR_PENDING });
    }
    const secondary = [];
    fragments.forEach((f, i) => {
      if (i > 0) secondary.push({ text: ", " });
      secondary.push(f);
    });
    if (secondary.length) secondary.push({ text: ". Nothing urgent; pick what to tackle first." });
    else secondary.push({ text: "Nothing urgent right now." });
    return { primary, secondary };
  }

  // clear
  const primary = [{ text: "All caught up — no items need you right now." }];
  const secondary = [];
  if (w.rfqs_published > 0) {
    secondary.push({ text: "You published " });
    secondary.push({ text: `${w.rfqs_published} RFQ${w.rfqs_published === 1 ? "" : "s"}`, highlight: true, target: TARGET.WEEKLY_PUBLISHED });
    secondary.push({ text: " in this period" });
    if (w.savings_pct > 0) {
      secondary.push({ text: " with " });
      secondary.push({ text: `${w.savings_pct}% savings`, highlight: true });
      secondary.push({ text: " from negotiation" });
    }
    secondary.push({ text: "." });
  } else {
    secondary.push({ text: "Start a new RFQ when you're ready." });
  }
  return { primary, secondary };
};

const BuyerStatusBanner = ({ hotelIds, filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [openModal, setOpenModal] = useState(null); // null | 'approvals'

  // Fetch on mount + whenever the BU filter, date range, or refresh changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = {};
    if (hotelIds && hotelIds.length) params.hotel_ids = hotelIds.join(",");
    if (filters?.start_date) params.start_date = filters.start_date;
    if (filters?.end_date) params.end_date = filters.end_date;
    getBuyerStatusBanner(params)
      .then((res) => {
        if (cancelled) return;
        setData(res?.data?.data || res?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not load banner");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotelIds?.join(","), filters?.start_date, filters?.end_date, refreshTick]);

  const handleRefresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  // Local-clock greeting + date subline. Visual touch only.
  const greetText = useMemo(() => greetingFor(new Date().getHours()), []);
  const dateLine = useMemo(() => moment().format("dddd, D MMM YYYY"), []);

  if (loading) {
    return (
      <div className={`${styles.banner} ${styles.skeleton}`}>
        <div className={styles.shimmerHead} />
        <div className={styles.shimmerSub} />
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const mode = data.mode || "clear";
  const theme = MODE_THEME[mode] || MODE_THEME.clear;
  const { primary, secondary } = buildNarrative(data, mode);
  const name = data.greeting?.first_name;

  // Render one fragment — plain span, link, or button depending on target.
  const renderFragment = (f, idx) => {
    if (!f.highlight) {
      return <React.Fragment key={idx}>{f.text}</React.Fragment>;
    }
    const cls = styles.highlight;
    if (f.target?.modal === "approvals") {
      return (
        <button
          key={idx}
          type="button"
          className={`${cls} ${styles.highlightBtn}`}
          onClick={() => setOpenModal("approvals")}
        >
          {f.text}
        </button>
      );
    }
    if (f.target?.href) {
      return (
        <Link key={idx} href={f.target.href} className={cls}>
          {f.text}
        </Link>
      );
    }
    return (
      <span key={idx} className={cls}>
        {f.text}
      </span>
    );
  };

  return (
    <>
      <div className={`${styles.banner} ${styles[theme.className]}`}>
        <div className={styles.topRow}>
          <div className={styles.brandBlock}>
            <span className={styles.brandIcon}>
              <Sparkles size={14} />
            </span>
            <div className={styles.brandText}>
              <span className={styles.brandName}>WISELY</span>
              <span className={styles.brandDate}>{dateLine}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={handleRefresh}
            aria-label="Refresh status"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <h2 className={styles.headline}>
          {greetText}{name ? `, ${name}` : ""}.
        </h2>

        <p className={styles.narrative}>{primary.map(renderFragment)}</p>
        {secondary && secondary.length > 0 && (
          <p className={styles.narrativeSecondary}>{secondary.map(renderFragment)}</p>
        )}
      </div>

      {openModal === "approvals" && (
        <PendingApprovalsModal
          onClose={() => setOpenModal(null)}
          filters={filters}
        />
      )}
    </>
  );
};

export default BuyerStatusBanner;
