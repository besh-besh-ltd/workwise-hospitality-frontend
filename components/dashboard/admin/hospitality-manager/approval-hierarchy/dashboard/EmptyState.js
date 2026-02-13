import React from "react";
import { BsDiagram3 } from "react-icons/bs";
import { BRAND_TEAL } from "../constants";

const EmptyState = ({ onCreateWorkflow, title, subtitle, compact = false }) => {
  return (
    <div className="text-center" style={{ padding: compact ? "30px 20px" : "60px 20px" }}>
      <div
        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
        style={{
          width: compact ? "56px" : "80px",
          height: compact ? "56px" : "80px",
          backgroundColor: "#f3f4f6",
        }}
      >
        <BsDiagram3 size={compact ? 24 : 36} style={{ color: "#9ca3af" }} />
      </div>
      <h5 className={`${compact ? "h6" : "h5"} mb-2`} style={{ color: "#374151" }}>
        {title || "No Approval Workflows"}
      </h5>
      <p className="text-muted mb-4" style={{ fontSize: compact ? "13px" : "14px", maxWidth: "400px", margin: "0 auto 16px" }}>
        {subtitle || "Create an approval workflow to define who needs to approve documents for this hotel."}
      </p>
      {onCreateWorkflow && (
        <button
          className="btn btn-sm"
          onClick={onCreateWorkflow}
          style={{
            backgroundColor: BRAND_TEAL,
            borderColor: BRAND_TEAL,
            color: "#fff",
            padding: "8px 20px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Create Workflow
        </button>
      )}
    </div>
  );
};

export default EmptyState;
