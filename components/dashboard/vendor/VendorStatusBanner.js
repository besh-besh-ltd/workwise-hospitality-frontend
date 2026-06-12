import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import moment from "moment";
import { Sparkles, RefreshCw } from "lucide-react";
import { getVendorStatusBanner } from "@/services/vendorDashboard";
// Reuse the buyer-side banner SCSS — both surfaces share the same hero
// visual language. If they ever diverge meaningfully, fork the file.
import styles from "../buyer/BuyerStatusBanner.module.scss";

const MODE_THEME = {
  clear:         { className: "modeClear" },
  steady:        { className: "modeSteady" },
  action_needed: { className: "modeActionNeeded" },
  critical:      { className: "modeCritical" },
};

// Targets a highlight can carry: { href } renders as <Link>; plain
// highlight without target is rendered as <span>.
const TARGET = {
  INQUIRIES:        { href: "/dashboard/vendor/inquiries-received" },
  ORDER_BOOK:       { href: "/dashboard/vendor/order-book" },
  SUBSCRIPTION:     { href: "/dashboard/vendor/subscription" },
};

const greetingFor = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Format ₹ amounts compactly: ≥1Cr → "₹X.YY Cr"; ≥1L → "₹X.YY L"; else raw.
const formatRevenue = (n) => {
  if (!n || n <= 0) return null;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

/**
 * Vendor-specific narrative. Same fragment shape as the buyer side so
 * the renderer is identical.
 */
const buildNarrative = (data, mode) => {
  const c = data?.counts || {};
  const w = data?.weekly || {};
  const close = data?.soonest_closing;

  if (mode === "critical") {
    const parts = [];
    if (c.subscription_expiring > 0) {
      parts.push({ text: "Your " });
      parts.push({
        text: `subscription is expiring`,
        highlight: true,
        target: TARGET.SUBSCRIPTION,
      });
      parts.push({ text: " soon. Renew to keep receiving inquiries. " });
    }
    if (c.po_acceptance_pending > 0) {
      parts.push({ text: "You also have " });
      parts.push({
        text: `${c.po_acceptance_pending} PO${c.po_acceptance_pending > 1 ? "s" : ""}`,
        highlight: true,
        target: TARGET.ORDER_BOOK,
      });
      parts.push({ text: " awaiting your acceptance." });
    }
    if (parts.length === 0) {
      parts.push({ text: "Several items need your attention today." });
    }
    return parts;
  }

  if (mode === "action_needed") {
    const parts = [];
    if (c.closing_soon > 0) {
      parts.push({
        text: `${c.closing_soon} RFQ${c.closing_soon > 1 ? "s" : ""} you were invited to close${c.closing_soon === 1 ? "s" : ""} within 24 hours`,
        highlight: true,
        target: TARGET.INQUIRIES,
      });
      if (close?.title) parts.push({ text: ` — earliest is ${close.title}. ` });
      else parts.push({ text: ". " });
    }
    if (c.pending_negotiation > 0) {
      parts.push({ text: "You have " });
      parts.push({
        text: `${c.pending_negotiation} negotiation round${c.pending_negotiation > 1 ? "s" : ""}`,
        highlight: true,
        target: TARGET.INQUIRIES,
      });
      parts.push({ text: " awaiting your response" });
    }
    if (c.po_acceptance_pending > 0) {
      parts.push({ text: c.pending_negotiation > 0 ? " and " : "You have " });
      parts.push({
        text: `${c.po_acceptance_pending} PO${c.po_acceptance_pending > 1 ? "s" : ""}`,
        highlight: true,
        target: TARGET.ORDER_BOOK,
      });
      parts.push({ text: " to accept" });
    }
    if (c.subscription_expiring > 0) {
      parts.push({ text: ". Your " });
      parts.push({
        text: `subscription renews soon`,
        highlight: true,
        target: TARGET.SUBSCRIPTION,
      });
      parts.push({ text: " — keep an eye on it." });
    } else {
      parts.push({ text: ". Work the urgent ones first — the rest can wait." });
    }
    return parts;
  }

  if (mode === "steady") {
    const fragments = [];
    if (c.new_rfqs_unviewed > 0) {
      fragments.push({
        text: `${c.new_rfqs_unviewed} new RFQ${c.new_rfqs_unviewed > 1 ? "s" : ""} to review`,
        highlight: true,
        target: TARGET.INQUIRIES,
      });
    }
    if (c.po_in_transit > 0) {
      fragments.push({
        text: `${c.po_in_transit} PO${c.po_in_transit > 1 ? "s" : ""} in transit`,
        highlight: true,
        target: TARGET.ORDER_BOOK,
      });
    }
    const parts = [{ text: "You have " }];
    fragments.forEach((f, i) => {
      if (i > 0) parts.push({ text: " and " });
      parts.push(f);
    });
    parts.push({ text: ". Nothing urgent today — review the new inquiries when you have a moment." });
    return parts;
  }

  // clear
  const parts = [{ text: "All caught up — no inquiries need your action right now." }];
  const rev = formatRevenue(w.revenue);
  if ((w.pos_won || 0) > 0 || rev) {
    parts.push({ text: " You've " });
    if ((w.pos_won || 0) > 0) {
      parts.push({
        text: `won ${w.pos_won} order${w.pos_won === 1 ? "" : "s"}`,
        highlight: true,
      });
    }
    if (rev) {
      parts.push({ text: (w.pos_won || 0) > 0 ? " worth " : "earned " });
      parts.push({ text: rev, highlight: true });
    }
    parts.push({ text: " this week. Nice work." });
  } else {
    parts.push({ text: " New opportunities will show up here as they arrive." });
  }
  return parts;
};

const VendorStatusBanner = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVendorStatusBanner()
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
  }, [refreshTick]);

  const handleRefresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

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
  const fragments = buildNarrative(data, mode);
  const name = data.greeting?.first_name;

  const renderFragment = (f, idx) => {
    if (!f.highlight) {
      return <React.Fragment key={idx}>{f.text}</React.Fragment>;
    }
    const cls = styles.highlight;
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

      <p className={styles.narrative}>{fragments.map(renderFragment)}</p>
    </div>
  );
};

export default VendorStatusBanner;
