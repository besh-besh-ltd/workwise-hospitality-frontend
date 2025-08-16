import { useEffect, useState, useRef } from "react";

const DURATION = 10;   // seconds
const SPARKLE_MS = 1500;

const NormalizeInfoModal = ({ show, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [showSparkle, setShowSparkle] = useState(false);
  const [showPanel, setShowPanel] = useState(false); // controls modal body visibility
  const [isClosing, setIsClosing] = useState(false); // guard against double-close
  const timerRef = useRef(null);

  const pct = ((DURATION - secondsLeft) / DURATION) * 100;

  // Start countdown when modal opens
  useEffect(() => {
    if (!show) return;

    setShowPanel(true);
    setIsClosing(false);
    setShowSparkle(false);
    setSecondsLeft(DURATION);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(DURATION - elapsed, 0);
      setSecondsLeft(left);

      // ≤ 0 to be robust against timing quirks / dev double-render
      if (left <= 0) {
        clearInterval(timerRef.current);
        runCloseSequence();
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [show]);

  // Secondary guard: if secondsLeft hits 0 for any reason, close.
  useEffect(() => {
    if (show && !isClosing && secondsLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      runCloseSequence();
    }
  }, [show, secondsLeft, isClosing]);

  const runCloseSequence = () => {
    if (isClosing) return;
    setIsClosing(true);

    // Hide the panel so only the sparkle overlay shows
    setShowPanel(false);
    setShowSparkle(true);

    setTimeout(() => {
      setShowSparkle(false);
      onClose?.(); // parent hides modal AFTER sparkle
    }, SPARKLE_MS);
  };

  if (!show && !showSparkle) return null;

  return (
    <>
      {show && showPanel && (
        <div style={styles.backdrop} role="dialog" aria-modal="true">
          <div style={styles.modal}>
            <div style={styles.header}>
              <h5 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                Normalizing Quotes…
              </h5>
              <button
                type="button"
                onClick={runCloseSequence}
                style={styles.closeBtn}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={styles.body}>
              <p style={styles.lead}>
                Normalization ensures every vendor’s quote is compared on the same terms.
              </p>

              <ol style={styles.list}>
                <li>
                  <b>Convert costs to %</b> — Freight, Packaging, and Tax amounts are converted
                  into a percentage of the base product cost.
                </li>
                <li>
                  <b>Fill missing data</b> — If Freight/Packaging is missing, use the average %.
                  If Tax is missing, use the median %.
                </li>
                <li>
                  <b>Payment term adjustment</b> — Each term has a percentage of the total cost
                  and days until payment:
                  <ul style={styles.sublist}>
                    <li><b>Advance</b> (0 days) → No deduction.</li>
                    <li><b>Credit</b> → Deduct <code>1% per 30 days</code>.</li>
                  </ul>
                  Formula: <code>adjusted = % × total × (1 − (days ÷ 30) × 0.01)</code>.
                  Leftover % (if total terms &lt; 100%) → No deduction.
                </li>
              </ol>

              <p style={styles.note}>
                Result: pricing differences reflect real costs, not missing data or varying terms.
              </p>
            </div>

            <div style={styles.footer}>
              <div style={styles.progressOuter}>
                <div style={{ ...styles.progressInner, width: `${pct}%` }} />
              </div>
              <div style={styles.timerRow}>
                <span>Closing in {secondsLeft}s</span>
                <button style={styles.primaryBtn} onClick={runCloseSequence}>
                  Close Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSparkle && (
        <div style={styles.sparkleOverlay}>
          {Array.from({ length: 200 }).map((_, i) => {
            const left = Math.random() * 100;
            const top = 60 + Math.random() * 20;
            const delay = Math.random() * 0.1;
            const colors = ["#FFD700", "#FFEA00", "#7c3aed", "#3b82f6", "#facc15"];
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${
                    colors[Math.floor(Math.random() * colors.length)]
                  } 30%, #ffffff 90%)`,
                  left: `${left}%`,
                  top: `${top}%`,
                  animation: `sparkle-float 1.4s ease-out forwards`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes sparkle-float {
          0% { opacity: 0.9; transform: translateY(0px) scale(0.5) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-160px) scale(1) rotate(360deg); }
        }
      `}</style>
    </>
  );
};

const styles = {
  sparkleOverlay: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1060,
    overflow: "hidden",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(17,24,39,0.45)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
  },
  modal: {
    width: "min(900px, 95vw)",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #edf0f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    color: "#6b7280",
  },
  body: { padding: "16px 22px" },
  lead: { margin: "0 0 12px", color: "#111827", fontSize: 17, fontWeight: 600 },
  list: {
    margin: 0,
    paddingLeft: 18,
    color: "#1f2937",
    lineHeight: 1.6,
    fontSize: 15.5,
  },
  sublist: {
    margin: "6px 0 0 18px",
    lineHeight: 1.55,
    fontSize: 14.5,
    color: "#374151",
  },
  note: { fontSize: 14.5, color: "#374151", marginTop: 14 },
  footer: { padding: "14px 20px 18px" },
  progressOuter: {
    height: 8,
    background: "#eef2ff",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
    border: "1px solid #e6ecff",
  },
  progressInner: {
    height: "100%",
    background: "linear-gradient(90deg,#2d5ba7,#3f83f8)",
    transition: "width .25s linear",
  },
  timerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13.5,
    color: "#4b5563",
  },
  primaryBtn: {
    border: "none",
    background: "#2d5ba7",
    color: "#fff",
    borderRadius: 10,
    padding: "8px 14px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};

export default NormalizeInfoModal;
