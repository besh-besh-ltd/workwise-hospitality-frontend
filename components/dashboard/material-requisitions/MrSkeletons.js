// Content-aware skeleton loaders for the MR module. Each mirrors the real
// page's structure 1:1 (same layout classes) so the load→content transition
// feels structured rather than a flash. Built on the shared .arc-sk shimmer.

const Sk = ({ w = "100%", h = 12, r = 6, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
);

const PageHead = ({ subW = 460 }) => (
  <div className="flex items-start justify-between gap-3 flex-wrap">
    <div style={{ minWidth: 0 }}>
      <Sk w={300} h={24} style={{ marginBottom: 9 }} />
      <Sk w={subW} h={13} style={{ maxWidth: "70vw" }} />
    </div>
    <Sk w={150} h={40} r={9} />
  </div>
);

const CardHead = ({ w = 150 }) => (
  <div className="section-head"><Sk w={w} h={14} /></div>
);

// ── Dashboard (index) ──────────────────────────────────────────────────────
export function MrDashboardSkeleton() {
  return (
    <div className="main-body">
      <PageHead subW={520} />

      <section className="kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-tile">
            <div className="kt-row"><Sk w={90} h={11} /><Sk w={32} h={32} r={9} /></div>
            <Sk w={72} h={28} style={{ marginTop: 11 }} />
            <Sk w={130} h={11} style={{ marginTop: 9 }} />
          </div>
        ))}
      </section>

      <section className="mrd-metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mrd-metric">
            <Sk w={32} h={32} r={9} />
            <div style={{ flex: 1 }}><Sk w={52} h={18} style={{ marginBottom: 6 }} /><Sk w="80%" h={11} /></div>
          </div>
        ))}
      </section>

      <div className="mrd-2col">
        <div className="section-card">
          <CardHead w={160} />
          <div className="section-body">
            <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
              <Sk w={124} h={124} r={62} />
              <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 11 }}>
                {Array.from({ length: 3 }).map((_, i) => <Sk key={i} w="100%" h={13} />)}
              </div>
            </div>
          </div>
        </div>
        <div className="section-card">
          <CardHead w={190} />
          <div className="section-body">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150 }}>
              {[40, 65, 50, 80, 60, 90].map((hpct, i) => <Sk key={i} w={36} h={`${hpct}%`} r={6} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="mrd-2col">
        <div className="section-card">
          <CardHead w={170} />
          <div className="section-body">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 0" }}>
                <Sk w={120} h={12} /><Sk w="100%" h={9} r={99} /><Sk w={80} h={11} />
              </div>
            ))}
          </div>
        </div>
        <div className="section-card">
          <CardHead w={200} />
          <div className="section-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><Sk w={60} h={12} /><Sk w={20} h={12} /></div><Sk w="100%" h={7} r={99} /></div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><Sk w={26} h={26} r={13} /><Sk w="40%" h={12} /><Sk w={24} h={12} style={{ marginLeft: "auto" }} /></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-card">
        <CardHead w={170} />
        <div className="section-body" style={{ padding: 0 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
              <Sk w={96} h={22} r={99} /><Sk w="38%" h={13} /><Sk w={70} h={13} style={{ marginLeft: "auto" }} /><Sk w={50} h={11} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── faceted list (All MRs) ─────────────────────────────────────────────────
export function MrAllSkeleton() {
  return (
    <div className="main-body">
      <PageHead subW={540} />
      <div className="section-card">
        <div className="section-head" style={{ padding: "10px 14px" }}><Sk w={380} h={36} r={8} /></div>
      </div>
      <div className="contracts-layout">
        <aside className="filter-sidebar">
          <div className="fs-head"><Sk w={70} h={14} /></div>
          {Array.from({ length: 5 }).map((_, g) => (
            <div key={g} className="filter-group">
              <Sk w={80} h={10} style={{ marginBottom: 11 }} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 0" }}>
                  <Sk w={14} h={14} r={4} /><Sk w="55%" h={12} /><Sk w={18} h={11} style={{ marginLeft: "auto" }} />
                </div>
              ))}
            </div>
          ))}
        </aside>
        <div>
          <div className="list-toolbar">
            <Sk w={120} h={13} />
            <div style={{ display: "flex", gap: 8 }}><Sk w={280} h={34} r={6} /><Sk w={120} h={34} r={6} /></div>
          </div>
          <div className="contract-list" style={{ marginTop: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => <MrCardSk key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// one list card skeleton (contract-card shape; `foot` adds the approval-chain row)
function MrCardSk({ foot }) {
  return (
    <div className="contract-card">
      <div className="cc-head">
        <div className="cc-left">
          <Sk w={44} h={44} r={11} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Sk w="48%" h={15} style={{ marginBottom: 8 }} />
            <Sk w="78%" h={12} style={{ marginBottom: 9 }} />
            <div style={{ display: "flex", gap: 5 }}>{Array.from({ length: 3 }).map((_, j) => <Sk key={j} w={72} h={20} r={99} />)}</div>
          </div>
        </div>
        <div className="cc-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <Sk w={96} h={22} r={99} /><Sk w={60} h={13} />
        </div>
      </div>
      {foot && (
        <div className="cc-foot"><Sk w="55%" h={12} /></div>
      )}
    </div>
  );
}

// ── detail ([mrId]) ────────────────────────────────────────────────────────
export function MrDetailSkeleton() {
  return (
    <div className="main-body" style={{ paddingBottom: 108 }}>
      <section className="arc-sk-hero">
        <Sk w={180} h={11} style={{ marginBottom: 12 }} />
        <Sk w="55%" h={26} style={{ marginBottom: 11 }} />
        <Sk w="42%" h={13} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginTop: 22 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}><Sk w={70} h={10} style={{ marginBottom: 8, background: "rgba(255,255,255,0.14)" }} /><Sk w={90} h={14} style={{ background: "rgba(255,255,255,0.14)" }} /></div>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="section-card">
            <CardHead w={160} />
            <div className="section-body">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <Sk w="38%" h={14} /><Sk w={50} h={14} /><Sk w={120} h={14} style={{ marginLeft: "auto" }} />
                </div>
              ))}
            </div>
          </div>
          <div className="section-card">
            <CardHead w={120} />
            <div className="section-body"><Sk w="92%" h={12} style={{ marginBottom: 8 }} /><Sk w="70%" h={12} /></div>
          </div>
          <div className="section-card">
            <CardHead w={130} />
            <div className="section-body flush">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
                  <Sk w={36} h={36} r={9} /><div style={{ flex: 1 }}><Sk w="35%" h={13} style={{ marginBottom: 6 }} /><Sk w="55%" h={11} /></div><Sk w={80} h={22} r={99} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="section-card">
              <CardHead w={120} />
              <div className="section-body">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Sk w={40} h={40} r={11} /><div style={{ flex: 1 }}><Sk w="60%" h={13} style={{ marginBottom: 6 }} /><Sk w="40%" h={11} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
