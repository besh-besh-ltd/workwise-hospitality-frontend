/* ────────────────────────────────────────────────────────────
   PersonaCard — shared shell for role-targeted dashboard widgets
   ──────────────────────────────────────────────────────────── */

import React from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import InfoTip from "@/components/shared/InfoTip";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./PersonaCard.module.scss";

/* Inline notice rendered above still-valid content when the latest refresh
   failed: the numbers stay on screen, the user is told they may be old. */
export const StaleNotice = ({ onRetry }) => (
  <div className={styles.staleBar} role="status">
    <AlertCircle size={12} />
    <span>Couldn't refresh — showing the last loaded figures.</span>
    {onRetry && (
      <button type="button" className={styles.staleRetry} onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

/**
 * Common layout for persona widgets — title bar, data lifecycle, loading,
 * error and empty handling. Children render the actual data view.
 *
 * Props:
 *   title          string                — card title (required)
 *   icon           component             — Lucide icon
 *   tooltip        string                — explanatory tooltip
 *   filters        object                — page filters (hotel_ids, dates, _refresh)
 *   fetcher        (params, {signal}) => Promise — service method returning {data}
 *   poll           boolean               — queue widget: refresh every 60s while visible.
 *                                          Analytics widgets leave this off.
 *   children       (data, ctx) => node   — render-prop receives engine data
 *   renderEmpty    ({onRetry}) => node   — optional empty-state override
 *   actions        node                  — top-right action node (e.g. link)
 */
const PersonaCard = ({
  title,
  subtitle,
  icon: Icon,
  tooltip,
  filters,
  fetcher,
  poll = false,
  pollMs,
  children,
  renderEmpty,
  actions,
  foot,
  noPad,
  isEmpty,
  skeleton,
}) => {
  const { data, loading, error, stale, refetch } = useDashboardQuery(fetcher, filters, {
    poll,
    ...(pollMs ? { pollMs } : {}),
  });
  const handleRetry = () => {
    refetch();
  };

  // Empty check — caller may override via isEmpty(data) or via renderEmpty.
  const showError = Boolean(error) && !stale;
  const dataIsEmpty = (() => {
    if (loading || showError) return false;
    if (typeof isEmpty === "function") return isEmpty(data);
    if (data == null) return true;
    if (Array.isArray(data) && data.length === 0) return true;
    return false;
  })();

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          {Icon && (
            <div className={styles.iconWrap}>
              <Icon size={14} strokeWidth={2} />
            </div>
          )}
          <div className={styles.title}>
            {title}
            {tooltip && <InfoTip text={tooltip} />}
          </div>
        </div>
        <div className={styles.headActions}>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {actions}
          {!loading && (
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={handleRetry}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.body} ${noPad ? styles.noPad : ""}`}>
        {loading && (
          skeleton ?? (
            <div className={styles.skeleton}>
              <div className={styles.skelBar} style={{ width: "55%", height: 20 }} />
              <div className={styles.skelBar} style={{ width: "78%" }} />
              <div className={styles.skelBar} style={{ width: "62%" }} />
            </div>
          )
        )}

        {!loading && showError && (
          <div className={styles.errorState} role="alert">
            <AlertCircle size={14} />
            <span>{error}</span>
            <button
              type="button"
              className={styles.errorBtn}
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && stale && <StaleNotice onRetry={handleRetry} />}

        {!loading && !showError && dataIsEmpty && (
          renderEmpty ? renderEmpty({ onRetry: handleRetry }) : (
            <div className={styles.emptyState}>Nothing to show right now.</div>
          )
        )}

        {!loading && !showError && !dataIsEmpty && (
          typeof children === "function" ? children(data, { onRetry: handleRetry }) : children
        )}
      </div>
      {foot && <div className={styles.foot}>{foot}</div>}
    </div>
  );
};

export default PersonaCard;

/* ────────────────────────────────────────────────────────────
   PersonaCardShell — same visual chrome, no data fetching.
   Use this when a widget already owns its own data lifecycle
   (legacy v2 dashboard cards) but wants the unified look.
   ──────────────────────────────────────────────────────────── */
export const PersonaCardShell = ({
  title,
  subtitle,
  icon: Icon,
  tooltip,
  actions,
  foot,
  noPad,
  onRefresh,
  loading = false,
  error = null,
  stale = false,
  isEmpty = false,
  renderEmpty,
  children,
  className,
  skeleton,
}) => {
  return (
    <div className={`${styles.card} ${className || ""}`}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          {Icon && (
            <div className={styles.iconWrap}>
              <Icon size={14} strokeWidth={2} />
            </div>
          )}
          <div className={styles.title}>
            {title}
            {tooltip && <InfoTip text={tooltip} />}
          </div>
        </div>
        <div className={styles.headActions}>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {actions}
          {onRefresh && !loading && (
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={onRefresh}
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.body} ${noPad ? styles.noPad : ""}`}>
        {loading && (
          skeleton ?? (
            <div className={styles.skeleton}>
              <div className={styles.skelBar} style={{ width: "55%", height: 20 }} />
              <div className={styles.skelBar} style={{ width: "78%" }} />
              <div className={styles.skelBar} style={{ width: "62%" }} />
            </div>
          )
        )}
        {!loading && error && !stale && (
          <div className={styles.errorState} role="alert">
            <AlertCircle size={14} />
            <span>{error}</span>
            {onRefresh && (
              <button type="button" className={styles.errorBtn} onClick={onRefresh}>
                Retry
              </button>
            )}
          </div>
        )}
        {!loading && stale && <StaleNotice onRetry={onRefresh} />}
        {!loading && (!error || stale) && isEmpty && (
          renderEmpty ? renderEmpty() : (
            <div className={styles.emptyState}>Nothing to show right now.</div>
          )
        )}
        {!loading && (!error || stale) && !isEmpty && children}
      </div>
      {foot && <div className={styles.foot}>{foot}</div>}
    </div>
  );
};
