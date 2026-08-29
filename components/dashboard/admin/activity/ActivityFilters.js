import React from "react";
import { BsX } from "react-icons/bs";
import InfoTip from "@/components/shared/InfoTip";
import { SEVERITY_META, ACTOR_META } from "./activityPresentation";
import styles from "./Activity.module.css";

/**
 * The filter rail.
 *
 * Persistent rather than hidden behind a button: on a screen whose job is
 * answering "what happened to X", the narrowing controls are the primary
 * interface, not a secondary one.
 *
 * Options come from what this company actually has, so an admin is never
 * offered a filter that returns nothing — an empty result from a filter you
 * were invited to pick reads as a broken page.
 */
const ActivityFilters = ({ filters, facets, onChange, onClear, resultCount }) => {
  const set = (key, value) => onChange({ ...filters, [key]: value || undefined, page: 1 });

  const active = Object.entries(filters).filter(
    ([key, value]) => value && !["page", "limit"].includes(key)
  );

  return (
    <aside className={styles.rail}>
      <div className={styles.railHead}>
        <h2 className={styles.railTitle}>Filter</h2>
        {active.length > 0 && (
          <button type="button" className={styles.clearBtn} onClick={onClear}>
            <BsX size={14} /> Clear
          </button>
        )}
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Search</span>
        <input
          type="search"
          className={styles.input}
          placeholder="An RFQ number, a name, a word…"
          value={filters.q || ""}
          onChange={(e) => set("q", e.target.value)}
        />
      </label>

      <div className={styles.fieldRow}>
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
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.fieldLabel}>
          Importance
          <InfoTip
            label="What the importance levels mean"
            text="Critical covers money, access and anything that cannot be undone — awards, order approvals, role grants, deactivations. Notable moves work forward a stage. Routine is everyday edits."
          />
        </legend>
        <div className={styles.pills}>
          {Object.entries(SEVERITY_META).map(([value, meta]) => (
            <button
              key={value}
              type="button"
              className={`${styles.pill} ${filters.severity === value ? styles.pillOn : ""}`}
              aria-pressed={filters.severity === value}
              onClick={() => set("severity", filters.severity === value ? "" : value)}
            >
              {meta.label}
            </button>
          ))}
        </div>
      </fieldset>

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

      {resultCount != null && (
        <p className={styles.railCount}>
          {resultCount.toLocaleString()} {resultCount === 1 ? "entry" : "entries"}
        </p>
      )}
    </aside>
  );
};

export default ActivityFilters;
