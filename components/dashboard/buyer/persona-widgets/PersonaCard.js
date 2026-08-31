/* ────────────────────────────────────────────────────────────
   PersonaCard — shared shell for role-targeted dashboard widgets
   ──────────────────────────────────────────────────────────── */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import InfoTip from "@/components/shared/InfoTip";
import { DASHBOARD_POLL_MS } from "@/components/dashboard/shared";
import styles from "./PersonaCard.module.scss";

const DEFAULT_POLL_MS = DASHBOARD_POLL_MS;

/**
 * Common layout for persona widgets — title bar, polling, loading,
 * error and empty handling. Children render the actual data view.
 *
 * Props:
 *   title          string                — card title (required)
 *   icon           component             — Lucide icon
 *   tooltip        string                — explanatory tooltip
 *   filters        object                — passed straight to fetcher
 *   fetcher        (filters) => Promise  — service method returning {data}
 *   pollMs         number                — poll interval, default 20s
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
  pollMs = DEFAULT_POLL_MS,
  children,
  renderEmpty,
  actions,
  foot,
  noPad,
  isEmpty,
  skeleton,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setError(null);
    try {
      const response = await fetcher(filters);
      if (fetchIdRef.current !== id) return; // stale
      const payload = response?.data?.data ?? response?.data ?? response ?? null;
      setData(payload);
    } catch (err) {
      if (fetchIdRef.current !== id) return;
      setError(err?.message || err?.response?.data?.message || "Failed to load");
      setData(null);
    } finally {
      if (fetchIdRef.current === id) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, JSON.stringify(filters || {})]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const t = setInterval(() => fetchData(), pollMs);
    return () => clearInterval(t);
  }, [fetchData, pollMs]);

  const handleRetry = () => {
    setLoading(true);
    fetchData();
  };

  // Empty check — caller may override via isEmpty(data) or via renderEmpty.
  const dataIsEmpty = (() => {
    if (loading || error) return false;
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

        {!loading && error && (
          <div className={styles.errorState}>
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

        {!loading && !error && dataIsEmpty && (
          renderEmpty ? renderEmpty({ onRetry: handleRetry }) : (
            <div className={styles.emptyState}>Nothing to show right now.</div>
          )
        )}

        {!loading && !error && !dataIsEmpty && (
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
        {!loading && error && (
          <div className={styles.errorState}>
            <AlertCircle size={14} />
            <span>{error}</span>
            {onRefresh && (
              <button type="button" className={styles.errorBtn} onClick={onRefresh}>
                Retry
              </button>
            )}
          </div>
        )}
        {!loading && !error && isEmpty && (
          renderEmpty ? renderEmpty() : (
            <div className={styles.emptyState}>Nothing to show right now.</div>
          )
        )}
        {!loading && !error && !isEmpty && children}
      </div>
      {foot && <div className={styles.foot}>{foot}</div>}
    </div>
  );
};
