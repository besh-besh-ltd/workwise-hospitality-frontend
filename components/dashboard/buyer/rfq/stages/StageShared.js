// Shared pieces for the RFQ lifecycle stage components: the no-permission
// panel, a generic content-aware stage skeleton, a read-only banner, and the
// StageCard — a card whose header matches the Overview cards (icon-in-rounded-
// box + bold label) so every stage's sections look consistent with ViewRFQ.

// Mirrors ViewRFQ.module.scss .card / .cardHead / .cardTitleIcon exactly.
export function StageCard({ icon, title, right, children }) {
  return (
    <section style={{ background: "#ffffff", border: "1px solid #ebebe6", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #ebebe6", background: "linear-gradient(180deg,#fdfdfb 0%,#ffffff 100%)", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "#f4f4f1", border: "1px solid #ebebe6", display: "grid", placeItems: "center", color: "#71717a", flexShrink: 0 }}>{icon}</span>
          <h2 style={{ fontSize: 13.5, fontWeight: 600, color: "#18181b", letterSpacing: "-0.01em", margin: 0 }}>{title}</h2>
        </div>
        {right ? <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{right}</div> : null}
      </header>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </section>
  );
}


export function StageNoPermission({ stageLabel }) {
  return (
    <div className="empty-state" style={{ padding: "48px 24px" }}>
      <div className="ic">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2>No permission to view {stageLabel}</h2>
      <p>
        You don't have permission to view {stageLabel} for this RFQ.
        Ask your administrator to grant you access.
      </p>
    </div>
  );
}

export function StageReadOnlyBanner({ children }) {
  return (
    <div className="guide" style={{ alignItems: "center" }}>
      <div className="g-ic" style={{ marginTop: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>{children}</div>
    </div>
  );
}

const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

export function StageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="arc-sk-tile">
        <Sk w={220} h={15} style={{ marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Sk w="70%" h={9} style={{ marginBottom: 7 }} />
              <Sk w="85%" h={15} />
            </div>
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, c) => (
        <div key={c} className="arc-sk-tile">
          <Sk w={170} h={14} style={{ marginBottom: 14 }} />
          {Array.from({ length: 3 }).map((__, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < 2 ? "1px dashed var(--border)" : "none" }}>
              <Sk w={30} h={30} r={8} style={{ flexShrink: 0 }} />
              <Sk w="55%" h={13} style={{ flex: 1 }} />
              <Sk w={80} h={13} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
