import React from "react";

const shimmer = {
  background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s ease-in-out infinite",
  borderRadius: 6,
};

const RFQListSkeleton = ({ count = 4 }) => {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 10,
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Top row: title + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...shimmer, width: 180, height: 14 }} />
              <div style={{ ...shimmer, width: 60, height: 20, borderRadius: 999 }} />
              <div style={{ flex: 1 }} />
              <div style={{ ...shimmer, width: 80, height: 12 }} />
            </div>
            {/* Middle row: details */}
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ ...shimmer, width: 100, height: 11 }} />
              <div style={{ ...shimmer, width: 120, height: 11 }} />
              <div style={{ ...shimmer, width: 90, height: 11 }} />
            </div>
            {/* Bottom row: actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <div style={{ ...shimmer, width: 70, height: 10 }} />
              <div style={{ flex: 1 }} />
              <div style={{ ...shimmer, width: 90, height: 30, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default RFQListSkeleton;
