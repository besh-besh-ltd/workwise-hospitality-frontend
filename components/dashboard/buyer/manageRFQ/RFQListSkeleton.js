import React from "react";

const shimmer = {
  background: "linear-gradient(90deg, #ebebe6 25%, #f4f4f1 50%, #ebebe6 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s ease-in-out infinite",
  borderRadius: 6,
};

const RFQListSkeleton = ({ count = 12 }) => {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid #ebebe6",
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              padding: "13px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            {/* Row 1: type + status + title + rfq# */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ ...shimmer, width: 54, height: 18, borderRadius: 999 }} />
              <div style={{ ...shimmer, width: 78, height: 18, borderRadius: 999 }} />
              <div style={{ ...shimmer, width: 170, height: 13, flexShrink: 1 }} />
              <div style={{ flex: 1 }} />
              <div style={{ ...shimmer, width: 84, height: 18, borderRadius: 5 }} />
            </div>
            {/* Row 2: metadata chips */}
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ ...shimmer, width: 86, height: 11 }} />
              <div style={{ ...shimmer, width: 110, height: 11 }} />
              <div style={{ ...shimmer, width: 94, height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default RFQListSkeleton;
