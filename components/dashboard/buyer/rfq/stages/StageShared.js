// Shared pieces for the RFQ lifecycle stage components: the no-permission
// panel, a generic content-aware stage skeleton, and a read-only banner.
// Cloned from the ARC StageShared (same arc_v2.css classes).

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
