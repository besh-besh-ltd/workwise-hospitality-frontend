// ViewRFQSkeleton — shaped loading placeholder for the RFQ details page.
// Mirrors ViewRFQ's layout (header + stat strip, 2-col body with detail grid,
// products, terms on the left and the lifecycle journey on the right) so the
// page settles into place instead of popping in from blank.
import React from "react";
import styles from "./ViewRFQSkeleton.module.scss";

const Bar = ({ w, h, r }) => (
  <span
    className={styles.bar}
    style={{ width: w, height: h, borderRadius: r }}
  />
);

const ViewRFQSkeleton = () => {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading RFQ details">
      {/* ── Header ── */}
      <section className={styles.header}>
        <div className={styles.headerInner}>
          <Bar w="150px" h="28px" r="7px" />
          <div className={styles.eyebrowRow}>
            <Bar w="6px" h="6px" r="50%" />
            <Bar w="220px" h="11px" r="4px" />
          </div>
          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <Bar w="46%" h="26px" r="7px" />
              <div className={styles.subRow}>
                <Bar w="120px" h="13px" r="4px" />
                <Bar w="90px" h="13px" r="4px" />
                <Bar w="110px" h="13px" r="4px" />
              </div>
            </div>
            <div className={styles.actionsRow}>
              <Bar w="92px" h="34px" r="7px" />
              <Bar w="92px" h="34px" r="7px" />
              <Bar w="100px" h="34px" r="7px" />
            </div>
          </div>

          {/* Stat strip */}
          <div className={styles.statStrip}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div className={styles.statCell} key={i}>
                <Bar w="28px" h="28px" r="7px" />
                <div className={styles.statBody}>
                  <Bar w="70px" h="9px" r="3px" />
                  <Bar w="100px" h="14px" r="4px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <main className={styles.body}>
        <div className={styles.leftCol}>
          {/* Buyer & inquiry details */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <Bar w="22px" h="22px" r="6px" />
              <Bar w="160px" h="14px" r="4px" />
            </div>
            <div className={styles.detailGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div className={styles.detailCell} key={i}>
                  <Bar w="64px" h="9px" r="3px" />
                  <Bar w="84%" h="13px" r="4px" />
                </div>
              ))}
            </div>
          </section>

          {/* Products requested */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <Bar w="22px" h="22px" r="6px" />
              <Bar w="170px" h="14px" r="4px" />
              <Bar w="64px" h="20px" r="999px" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div className={styles.productRow} key={i}>
                <div className={styles.productTop}>
                  <Bar w="26px" h="26px" r="7px" />
                  <div className={styles.productMeta}>
                    <Bar w="40%" h="14px" r="4px" />
                    <Bar w="60%" h="11px" r="4px" />
                  </div>
                  <Bar w="80px" h="34px" r="8px" />
                </div>
                <div className={styles.productBody}>
                  <Bar w="100%" h="86px" r="12px" />
                  <Bar w="100%" h="86px" r="12px" />
                </div>
              </div>
            ))}
          </section>

          {/* Terms */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <Bar w="22px" h="22px" r="6px" />
              <Bar w="150px" h="14px" r="4px" />
            </div>
            <div className={styles.termsList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div className={styles.termRow} key={i}>
                  <Bar w="18px" h="13px" r="3px" />
                  <Bar w={`${90 - i * 7}%`} h="13px" r="4px" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right — lifecycle journey */}
        <aside className={styles.rightCol}>
          <div className={styles.journeyCard}>
            <div className={styles.journeyHead}>
              <Bar w="180px" h="14px" r="4px" />
              <Bar w="140px" h="11px" r="4px" />
              <Bar w="100%" h="4px" r="999px" />
            </div>
            <div className={styles.journeyBody}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div className={styles.timelineRow} key={i}>
                  <Bar w="16px" h="16px" r="50%" />
                  <div className={styles.timelineMeta}>
                    <Bar w={`${70 - i * 8}%`} h="13px" r="4px" />
                    <Bar w={`${55 - i * 6}%`} h="11px" r="4px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default ViewRFQSkeleton;
