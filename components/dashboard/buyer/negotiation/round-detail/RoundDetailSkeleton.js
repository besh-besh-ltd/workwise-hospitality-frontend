// Loading shell — same silhouette as the loaded page so nothing jumps.
// Built on the shared `.arc-sk*` shimmer primitives from arc_v2.css.

const sk = (style) => <span className="arc-sk" style={{ display: "block", ...style }} />;

export default function RoundDetailSkeleton() {
  return (
    <main className="main-body" data-testid="round-detail-skeleton">
      <div className="arc-sk-hero" style={{ height: 168, borderRadius: "var(--radius-lg)" }} />

      <div className="stat-strip">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stat-card">
            {sk({ width: 38, height: 38, borderRadius: 10, flexShrink: 0 })}
            <div style={{ flex: 1, minWidth: 0 }}>
              {sk({ width: "62%", height: 18, marginBottom: 8 })}
              {sk({ width: "84%", height: 10 })}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid lop">
        <div className="section-card">
          <div className="section-head">{sk({ width: 210, height: 13, borderRadius: 4 })}</div>
          <div className="section-body">{sk({ height: 300, borderRadius: 10 })}</div>
        </div>
        <div className="section-card">
          <div className="section-head">{sk({ width: 160, height: 13, borderRadius: 4 })}</div>
          <div className="section-body">{sk({ height: 300, borderRadius: 10 })}</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-head">{sk({ width: 180, height: 13, borderRadius: 4 })}</div>
        <div className="section-body">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
              {sk({ flex: 2, height: 15, borderRadius: 4 })}
              {sk({ flex: 1, height: 15, borderRadius: 4 })}
              {sk({ flex: 1, height: 15, borderRadius: 4 })}
              {sk({ flex: 1, height: 15, borderRadius: 4 })}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
