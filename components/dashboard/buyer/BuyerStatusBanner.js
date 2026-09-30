import React, { useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { getBuyerStatusBanner } from "@/services/dashboard";
import PendingApprovalsModal from "./dashboard-components/PendingApprovalsModal";
import { rfqList, rfqListView, poTracking } from "@/components/dashboard/shared/dashboardLinks";
import styles from "./BuyerStatusBanner.module.scss";
import useDashboardQuery from "@/hooks/useDashboardQuery";

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
// The RFQ counts are the user's OWN RFQs (backend `created_by = me`), so each
// link opens the list narrowed to theirs (mine=1) — the list then shows the
// same RFQs the sentence counted.
export const TARGET = {
  CLOSING_SOON:        { href: rfqListView("closing_soon", { mine: true }) },
  CLOSED_NO_QUOTES:    { href: rfqListView("ended_no_quotes", { mine: true }) },
  APPROVALS:           { modal: "approvals" },
  QUOTE_COMPARE:       { href: rfqListView("quote_compare", { mine: true }) },
  PO_VENDOR_PENDING:   { href: poTracking({ tab: "active" }) },
  WEEKLY_PUBLISHED:    { href: rfqList({ mine: true }) },
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

export const buildNarrative = (data, mode) => {
  const c = data?.counts || {};
  // `period` is the windowed part (the header range); `weekly` is its
  // deprecated alias from older backends.
  const w = data?.period || data?.weekly || {};
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
    // Everything else still on the plate — critical mode must not hide it.
    const others = [];
    if (c.pending_approvals > 0) others.push(approvalsFragment(c.pending_approvals));
    if (c.closing_soon > 0) {
      others.push({ text: `${c.closing_soon} RFQ${c.closing_soon > 1 ? "s" : ""} closing soon`, highlight: true, target: TARGET.CLOSING_SOON });
    }
    if (c.quote_compare_ready > 0) {
      others.push({ text: `${c.quote_compare_ready} ready to compare`, highlight: true, target: TARGET.QUOTE_COMPARE });
    }
    if (c.po_acceptance_pending > 0) {
      others.push({ ...poFragment(c.po_acceptance_pending), text: `${c.po_acceptance_pending} PO${c.po_acceptance_pending > 1 ? "s" : ""} awaiting vendor` });
    }
    const secondary = [];
    if (others.length) {
      secondary.push({ text: "Also waiting: " });
      others.forEach((f, i) => {
        if (i > 0) secondary.push({ text: i === others.length - 1 ? " and " : ", " });
        secondary.push(f);
      });
      secondary.push({ text: "." });
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
      // Awarded basis (SPEC D2) — the same figure as Negotiation savings.
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

const BuyerStatusBanner = ({ filters }) => {
  // The banner is a work queue (approvals, closing soon…) — it polls while
  // the tab is visible and follows the page refresh button via filters._refresh.
  const { data, loading, error, stale, refreshing, refetch } = useDashboardQuery(
    getBuyerStatusBanner,
    filters,
    { poll: true, errorMessage: "Could not load your status summary" }
  );
  const [openModal, setOpenModal] = useState(null); // null | 'approvals'

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

  // Never vanish silently: a failed first load gets a compact retry strip.
  if (error && !stale) {
    return (
      <div className={`${styles.banner} ${styles.errorBanner}`} role="alert">
        <AlertCircle size={14} />
        <span>{error}</span>
        <button type="button" className={styles.errorRetry} onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
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
            onClick={refetch}
            aria-label="Refresh status"
            title={stale ? "Couldn't refresh — showing the last loaded status. Click to retry." : "Refresh"}
          >
            <RefreshCw size={14} className={refreshing ? styles.spinning : ""} />
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
