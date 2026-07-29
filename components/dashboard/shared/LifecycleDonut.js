import React, { useMemo } from "react";
import styles from "./DashboardSurface.module.scss";

/**
 * LifecycleDonut — conic-gradient donut + legend with proportion bars.
 *
 * Props:
 *   segments Array<{ key, label, value, color }>  // any number; zero-value entries are dropped
 *   centerLabel  string  // small uppercase label below the big number (e.g. "Contracts")
 */
const LifecycleDonut = ({ segments = [], centerLabel = "Total" }) => {
  const segs = segments.filter((s) => Number(s.value) > 0);
  const total = useMemo(() => segs.reduce((s, x) => s + (Number(x.value) || 0), 0), [segs]);

  const gradient = useMemo(() => {
    if (!total) return "background: #f4f4f1;";
    let acc = 0;
    const stops = segs.map((s) => {
      const start = (acc / total) * 360;
      acc += Number(s.value) || 0;
      const end = (acc / total) * 360;
      return `${s.color} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`;
    });
    return `background: conic-gradient(from -90deg, ${stops.join(", ")});`;
  }, [segs, total]);

  if (!total) {
    return (
      <div className={styles.donutWrap}>
        <div className={styles.donut}>
          <div className={styles.donutRing} style={{ background: "#f4f4f1" }} />
          <div className={styles.donutHole} />
          <div className={styles.donutCenter}>
            <div className={styles.dcVal}>0</div>
            <div className={styles.dcLbl}>{centerLabel}</div>
          </div>
        </div>
        <div className={styles.donutLegend}>
          <div style={{ fontSize: 12, color: "#71717a" }}>Nothing to show yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut}>
        <div className={styles.donutRing} style={{ background: gradient.replace("background:", "").trim().replace(/;$/, "") }} />
        <div className={styles.donutHole} />
        <div className={styles.donutCenter}>
          <div className={styles.dcVal}>{total}</div>
          <div className={styles.dcLbl}>{centerLabel}</div>
        </div>
      </div>
      <div className={styles.donutLegend}>
        {segs.map((s) => (
          <div className={styles.donutRow} key={s.key}>
            <span className={styles.dt} style={{ background: s.color }} />
            <span className={styles.nm}>{s.label}</span>
            <span className={styles.ctBar}>
              <span
                className={styles.ctFill}
                style={{ width: `${(Number(s.value) / total) * 100}%`, background: s.color }}
              />
            </span>
            <span className={styles.ct}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LifecycleDonut;
