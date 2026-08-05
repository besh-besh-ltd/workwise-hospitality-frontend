import React from "react";

// Skeleton that mirrors the actual Create/Edit RFQ page structure:
// context strip + stepper row + section card with field placeholders +
// sticky action bar. Replaces the legacy full-screen black overlay loader
// so the user sees the page taking shape instead of being blocked.

const shimmerBg = {
  background:
    "linear-gradient(90deg, #eef0f4 0%, #f5f6f8 50%, #eef0f4 100%)",
  backgroundSize: "200% 100%",
  animation: "rfq-skel-shimmer 1.4s ease-in-out infinite",
  borderRadius: 6,
};

const Bar = ({ w = "100%", h = 12, r = 6, style = {} }) => (
  <div
    style={{
      ...shimmerBg,
      width: w,
      height: h,
      borderRadius: r,
      ...style,
    }}
  />
);

const Circle = ({ size = 26, style = {} }) => (
  <div
    style={{
      ...shimmerBg,
      width: size,
      height: size,
      borderRadius: "50%",
      ...style,
    }}
  />
);

const sectionCard = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const fieldRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const CreateRFQSkeleton = () => {
  return (
    <div className="create-rfq-page" aria-busy="true" aria-live="polite">
      <style>{`
        @keyframes rfq-skel-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Context strip (matches .rfq-page-header in the live UI) */}
      <div style={{ display: "flex", marginBottom: 14 }}>
        <Bar w={210} h={26} r={999} />
      </div>

      {/* Stepper row — mirrors the live layout: justify-content
          space-between with a single gray rail behind the circles. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
          margin: "24px 0 14px 0",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 13,
            right: 13,
            height: 2,
            background: "#eef0f4",
            borderRadius: 999,
            zIndex: 0,
          }}
        />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              position: "relative",
              zIndex: 1,
            }}
          >
            <Circle size={26} />
            <Bar w={56} h={10} />
          </div>
        ))}
      </div>

      {/* Section card (mirrors .rfq-section) */}
      <div style={sectionCard}>
        {/* Section header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Bar w={180} h={16} />
          <Bar w={320} h={11} />
        </div>

        {/* Two-column field rows */}
        {Array.from({ length: 3 }).map((_, r) => (
          <div key={r} style={fieldRow}>
            {[0, 1].map((c) => (
              <div
                key={c}
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <Bar w={90} h={10} />
                <Bar w="100%" h={38} r={8} />
              </div>
            ))}
          </div>
        ))}

        {/* Wide row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Bar w={110} h={10} />
          <Bar w="100%" h={80} r={8} />
        </div>
      </div>

      {/* Smaller secondary card */}
      <div style={{ ...sectionCard, marginBottom: 80 }}>
        <Bar w={150} h={14} />
        <div style={fieldRow}>
          {[0, 1].map((c) => (
            <div
              key={c}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <Bar w={90} h={10} />
              <Bar w="100%" h={38} r={8} />
            </div>
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div
        style={{
          position: "sticky",
          bottom: 12,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          boxShadow:
            "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Bar w={92} h={32} r={8} />
        <div style={{ display: "flex", gap: 8 }}>
          <Bar w={108} h={32} r={8} />
          <Bar w={130} h={32} r={8} />
        </div>
      </div>
    </div>
  );
};

export default CreateRFQSkeleton;
