import React from "react";
import { BsDiagram3, BsPlus, BsArrowRight } from "react-icons/bs";
import { DS } from "../constants";

const EmptyState = ({ onCreateWorkflow, title, subtitle, compact = false }) => {
  const pad = compact ? "24px 16px" : "48px 24px";
  return (
    <div style={{ textAlign: "center", padding: pad }}>
      <div style={{ position: "relative", display: "inline-flex", marginBottom: 16 }}>
        <div style={{ width: compact ? 56 : 76, height: compact ? 56 : 76, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${DS.blueTint}, ${DS.blueLight})` }}>
          <BsDiagram3 size={compact ? 22 : 30} style={{ color: DS.primary }} />
        </div>
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: DS.primary }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: DS.secondary }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: DS.accent }} />
        </div>
      )}
      <div style={{ fontSize: compact ? 15 : 18, fontWeight: 700, color: DS.dark, marginBottom: 6, fontFamily: "'Poppins', sans-serif" }}>
        {title || "No Approval Workflows"}
      </div>
      <p style={{ fontSize: compact ? 12 : 13, maxWidth: 360, margin: "0 auto 20px", color: DS.muted, lineHeight: 1.6, fontFamily: "'Poppins', sans-serif" }}>
        {subtitle || "Create an approval workflow to define who needs to approve documents for this business unit."}
      </p>
      {onCreateWorkflow && (
        <button onClick={onCreateWorkflow} style={{ background: `linear-gradient(135deg, ${DS.primary}, ${DS.primary}dd)`, border: "none", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px rgba(46,91,168,0.2)`, fontFamily: "'Poppins', sans-serif", transition: "all 0.2s ease" }}>
          <BsPlus size={18} /> Create Workflow <BsArrowRight size={13} />
        </button>
      )}
    </div>
  );
};

export default EmptyState;
