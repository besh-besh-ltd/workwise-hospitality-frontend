import React from "react";
import styles from "./DashboardSurface.module.scss";

const rankClass = (i) => (i === 0 ? styles.r1 : i === 1 ? styles.r2 : i === 2 ? styles.r3 : "");

/**
 * RankList — list of items with medal-style index, name (+ optional sub),
 * horizontal proportion bar, and a right-aligned value.
 *
 * Props:
 *   rows  Array<{
 *           key:   string,
 *           index: string | number,           // override index chip (e.g. BU code, initials)
 *           name:  string,
 *           sub:   string | node,             // optional second line
 *           value: number,
 *           valueLabel: string | node,        // formatted value (e.g. "₹4.20 L")
 *           valueSub:   string | node,        // optional small grey line under value
 *           barColor:   string,               // override bar fill color
 *         }>
 *   max   number                              // max value for bar normalization (auto if absent)
 *   formatValue(v) => node                    // fallback formatter when valueLabel is absent
 */
const RankList = ({ rows = [], max, formatValue }) => {
  if (!rows.length) return null;
  const computedMax = max ?? Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  return (
    <div className={styles.rankList}>
      {rows.map((row, i) => {
        const indexLabel = row.index ?? String(i + 1).padStart(2, "0");
        const pct = Math.min(100, ((Number(row.value) || 0) / computedMax) * 100);
        return (
          <div key={row.key ?? i} className={`${styles.rankRow} ${rankClass(i)}`}>
            <div className={styles.rk}>{indexLabel}</div>
            <div className={styles.rl}>
              <div className={styles.rlName}>{row.name}</div>
              {row.sub && <div className={styles.rlSub}>{row.sub}</div>}
              <div className={styles.rlBar}>
                <div
                  className={styles.fill}
                  style={{
                    width: `${pct}%`,
                    ...(row.barColor ? { background: row.barColor } : {}),
                  }}
                />
              </div>
            </div>
            <div className={styles.rv}>
              <span>{row.valueLabel ?? (formatValue ? formatValue(row.value) : row.value)}</span>
              {row.valueSub && <span className={styles.sub}>{row.valueSub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RankList;
