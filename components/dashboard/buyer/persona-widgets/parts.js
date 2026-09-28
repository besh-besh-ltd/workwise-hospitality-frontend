/* ────────────────────────────────────────────────────────────
   Small building blocks shared by the persona widgets.
   ──────────────────────────────────────────────────────────── */
import React from "react";
import Link from "next/link";
import moment from "moment";
import { ArrowUpRight } from "lucide-react";
import { getWidgetMeta } from "../dashboardWidgetMeta";
import styles from "./PersonaCard.module.scss";

/** Title + tooltip for a widget, from the one catalogue (dashboardWidgetMeta). */
export const widgetCopy = (code) => {
  const meta = getWidgetMeta(code);
  return { title: meta?.title || code, tooltip: meta?.description };
};

/** Lists come back capped (20); the card shows the first few of them. */
export const VISIBLE_ITEMS = 5;

export const plural = (n, one, many = `${one}s`) => (Number(n) === 1 ? one : many);

/** "3 days" / "5 hours" / "just now" — relative, no suffix. */
export const since = (value) => {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.fromNow(true) : "—";
};

/** "in 2 days" / "3 hours ago". */
export const relative = (value) => {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.fromNow() : "—";
};

export const ViewAll = ({ href, label = "View all" }) => (
  <Link href={href} className={styles.badge} title={label}>
    {label} <ArrowUpRight size={11} />
  </Link>
);

/** Headline: the TRUE count, never the length of the capped list. */
export const Headline = ({ count, unit, units }) => (
  <div className={styles.headlineRow}>
    <span className={styles.headlineNum}>{count ?? 0}</span>
    <span className={styles.headlineUnit}>{plural(count ?? 0, unit, units)}</span>
  </div>
);

export const ItemLink = ({ href, title, meta = [], right }) => (
  <Link href={href} className={styles.item}>
    <div className={styles.itemMain}>
      <div className={styles.itemTitle}>{title}</div>
      {meta.filter(Boolean).length > 0 && (
        <div className={styles.itemMeta}>
          {meta.filter(Boolean).map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      )}
    </div>
    <div className={styles.itemRight}>
      {right}
      <ArrowUpRight size={12} />
    </div>
  </Link>
);

/** Renders the first VISIBLE_ITEMS items and a "+N more" line when the true
 *  count is larger than what is shown. */
export const ItemList = ({ items, count, render, moreHref }) => {
  const shown = (items || []).slice(0, VISIBLE_ITEMS);
  if (!shown.length) return null;
  const hidden = Math.max(0, (count ?? (items || []).length) - shown.length);
  return (
    <div className={styles.itemList}>
      {shown.map(render)}
      {hidden > 0 && (
        <Link href={moreHref} className={styles.moreLink}>
          +{hidden} more
        </Link>
      )}
    </div>
  );
};

export const rfqLabel = (item) => item?.rfq_title || item?.title || (item?.rfq_no ? `RFQ #${item.rfq_no}` : "RFQ");
