import React, { useState } from "react";
import { BsX } from "react-icons/bs";
import { ACTOR_META } from "./activityPresentation";
import styles from "./Activity.module.css";

/**
 * The filter controls, as a compact bar rather than a tall rail.
 *
 * They used to be eight stacked fields down the left, occupying about a third
 * of the width and most of the first screen. That is the right shape for a
 * screen you come to with a question, and the wrong one for a screen you come
 * to in order to notice something — which is what this page is for. The feed
 * is the content; narrowing it is secondary, so search stays out (it is the
 * one people reach for) and the rest folds behind a disclosure.
 *
 * Options still come from what this company actually has, so an admin is never
 * offered a filter that returns nothing — an empty result from a filter you
 * were invited to pick reads as a broken page.
 */
const ActivityFilters = ({ filters, facets, onChange, onClear, resultCount }) => {
  const [showMore, setShowMore] = useState(false);
  const set = (key, value) => onChange({ ...filters, [key]: value || undefined, page: 1 });

  const active = Object.entries(filters).filter(
    ([key, value]) => value && !["page", "limit"].includes(key)
  );

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterTop}>
        <label className={styles.searchWrap}>
          <span className={styles.srOnly}>Search</span>
          <input
            type="search"
            className={styles.search}
            placeholder="Search an RFQ number, a name, a word…"
            value={filters.q || ""}
            onChange={(e) => set("q", e.target.value)}
          />
        </label>

        <button
          type="button"
          className={`${styles.moreBtn} ${showMore ? styles.moreBtnOn : ""}`}
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          More filters
          {active.length > 0 && <span className={styles.activeDot}>{active.length}</span>}
        </button>

        {active.length > 0 && (
          <button type="button" className={styles.clearBtn} onClick={onClear}>
            <BsX size={14} /> Clear
          </button>
        )}

        {resultCount != null && (
          <p className={styles.resultCount}>
            {resultCount.toLocaleString()} {resultCount === 1 ? "entry" : "entries"}
          </p>
        )}
      </div>

      {showMore && (
        <div className={styles.filterMore}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>From</span>
            <input
              type="date"
              className={styles.input}
              value={filters.from || ""}
              onChange={(e) => set("from", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>To</span>
            <input
              type="date"
              className={styles.input}
              value={filters.to || ""}
              onChange={(e) => set("to", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Business unit</span>
            <select
              className={styles.input}
              value={filters.hotel_id || ""}
              onChange={(e) => set("hotel_id", e.target.value)}
            >
              <option value="">All business units</option>
              {(facets.units || []).map((u) => (
                <option key={u.hotel_id} value={u.hotel_id}>
                  {u.hotel_name || `Unit #${u.hotel_id}`} ({u.count})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Area</span>
            <select
              className={styles.input}
              value={filters.category || ""}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">Everything</option>
              {(facets.categories || []).map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Person</span>
            <select
              className={styles.input}
              value={filters.actor_user_id || ""}
              onChange={(e) => set("actor_user_id", e.target.value)}
            >
              <option value="">Anyone</option>
              {(facets.actors || []).map((a) => (
                <option key={a.actor_user_id} value={a.actor_user_id}>
                  {a.actor_label} ({a.count})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Kind of actor</span>
            <select
              className={styles.input}
              value={filters.actor_type || ""}
              onChange={(e) => set("actor_type", e.target.value)}
            >
              <option value="">Everyone</option>
              {Object.entries(ACTOR_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
};

export default ActivityFilters;
