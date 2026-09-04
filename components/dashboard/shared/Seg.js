import React from "react";
import styles from "./DashboardSurface.module.scss";

/**
 * Seg — segmented control (e.g. QTD / FY / All).
 *
 * Props:
 *   options Array<{ value, label }>
 *   value   current selected value
 *   onChange(v)
 */
const Seg = ({ options = [], value, onChange }) => (
  <div className={styles.seg} role="tablist">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        role="tab"
        aria-selected={value === opt.value}
        className={value === opt.value ? styles.segActive : ""}
        onClick={() => onChange?.(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default Seg;
