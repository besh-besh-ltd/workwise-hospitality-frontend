import React, { useState, useMemo } from "react";
import {
  BsXLg,
  BsBuilding,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsPersonFill,
  BsPeopleFill,
  BsChevronRight,
  BsSkipForwardFill,
  BsArrowRight,
  BsDiagram3Fill,
  BsShieldFillCheck,
  BsLightningFill,
} from "react-icons/bs";
import { Collapse } from "react-bootstrap";
import { getEntityTypeConfig, BRAND_TEAL, BRAND_TEAL_LIGHT } from "../constants";

const DepartmentSubGraphPreview = ({ policy, previewData, loading, onClose }) => {
  const [expandedDepts, setExpandedDepts] = useState({});

  const entityConfig = useMemo(
    () => (policy ? getEntityTypeConfig(policy.entity_type) : null),
    [policy]
  );

  const summaryStats = useMemo(() => {
    if (!previewData?.department_subgraphs) return { total: 0, autoApprove: 0 };
    const subs = previewData.department_subgraphs;
    return {
      total: subs.length,
      autoApprove: subs.filter((s) => s.will_auto_approve).length,
    };
  }, [previewData]);

  const masterSteps = previewData?.master_policy?.steps || policy?.steps || [];

  const toggleDept = (id) => {
    setExpandedDepts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!policy) return null;

  const EntityIcon = entityConfig?.icon;

  return (
    <>
      <style jsx>{`
        /* ===== OVERLAY ===== */
        .dsg-overlay {
          position: fixed;
          inset: 0;
          z-index: 1055;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: dsg-fade-in 0.2s ease-out;
        }
        @keyframes dsg-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ===== MODAL ===== */
        .dsg-modal {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 16px;
          width: 100%;
          max-width: 880px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.18),
            0 0 0 1px rgba(255, 255, 255, 0.3) inset;
          animation: dsg-slide-up 0.25s ease-out;
        }
        @keyframes dsg-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ===== HEADER ===== */
        .dsg-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .dsg-header-title {
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }
        .dsg-header-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .dsg-entity-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .dsg-step-count {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        .dsg-close-btn {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.06);
          padding: 8px;
          cursor: pointer;
          border-radius: 10px;
          color: #64748b;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dsg-close-btn:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #0f172a;
          transform: scale(1.05);
        }

        /* ===== MASTER PIPELINE ===== */
        .dsg-master-strip {
          padding: 16px 24px;
          background: linear-gradient(135deg, ${BRAND_TEAL_LIGHT} 0%, rgba(232, 245, 246, 0.4) 100%);
          border-bottom: 1px solid rgba(21, 137, 147, 0.1);
        }
        .dsg-master-label {
          font-size: 11px;
          font-weight: 600;
          color: ${BRAND_TEAL};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dsg-pipeline {
          display: flex;
          align-items: center;
          gap: 0;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
          scrollbar-color: rgba(21, 137, 147, 0.2) transparent;
        }
        .dsg-pipeline::-webkit-scrollbar {
          height: 4px;
        }
        .dsg-pipeline::-webkit-scrollbar-track {
          background: transparent;
        }
        .dsg-pipeline::-webkit-scrollbar-thumb {
          background: rgba(21, 137, 147, 0.2);
          border-radius: 2px;
        }
        .dsg-pipe-node {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(21, 137, 147, 0.18);
          border-radius: 10px;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .dsg-pipe-node:hover {
          background: #fff;
          box-shadow: 0 2px 8px rgba(21, 137, 147, 0.12);
        }
        .dsg-pipe-num {
          width: 26px;
          height: 26px;
          min-width: 26px;
          border-radius: 50%;
          background: ${BRAND_TEAL};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(21, 137, 147, 0.3);
        }
        .dsg-pipe-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dsg-pipe-type {
          font-size: 10px;
          color: #64748b;
          white-space: nowrap;
        }
        .dsg-pipe-connector {
          display: flex;
          align-items: center;
          padding: 0 6px;
          color: ${BRAND_TEAL};
          flex-shrink: 0;
          opacity: 0.5;
        }

        /* ===== BODY ===== */
        .dsg-body {
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }
        .dsg-body::-webkit-scrollbar {
          width: 6px;
        }
        .dsg-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .dsg-body::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .dsg-description {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        /* ===== DEPARTMENT CARDS ===== */
        .dsg-dept-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
          background: #fff;
        }
        .dsg-dept-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        }
        .dsg-dept-card.accent-all {
          border-left: 4px solid #16a34a;
        }
        .dsg-dept-card.accent-individual {
          border-left: 4px solid #4f46e5;
        }
        .dsg-dept-head {
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          background: #fafbfd;
          transition: background 0.15s ease;
          gap: 12px;
        }
        .dsg-dept-head:hover {
          background: #f1f5f9;
        }
        .dsg-dept-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .dsg-dept-chevron {
          color: #94a3b8;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .dsg-dept-chevron.open {
          transform: rotate(90deg);
        }
        .dsg-dept-icon {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dsg-dept-icon.all {
          background: #f0fdf4;
          color: #16a34a;
        }
        .dsg-dept-icon.individual {
          background: #eef2ff;
          color: #4f46e5;
        }
        .dsg-dept-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dsg-access-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.01em;
          flex-shrink: 0;
        }
        .dsg-access-badge.all {
          background: #dcfce7;
          color: #15803d;
        }
        .dsg-access-badge.individual {
          background: #e0e7ff;
          color: #4338ca;
        }
        .dsg-auto-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #166534;
          flex-shrink: 0;
        }
        .dsg-dept-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .dsg-progress-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .dsg-progress-bar-track {
          width: 48px;
          height: 5px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }
        .dsg-progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          background: ${BRAND_TEAL};
          transition: width 0.3s ease;
        }
        .dsg-progress-text {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          white-space: nowrap;
        }

        /* ===== STEP ROWS ===== */
        .dsg-dept-body {
          padding: 4px 18px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fff;
        }
        .dsg-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 12px 0;
        }
        .dsg-step + .dsg-step {
          border-top: 1px solid #f1f5f9;
        }
        .dsg-step-circle {
          width: 30px;
          height: 30px;
          min-width: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          transition: all 0.15s ease;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .dsg-step-circle.active {
          background: ${BRAND_TEAL};
          box-shadow: 0 2px 8px rgba(21, 137, 147, 0.3);
        }
        .dsg-step-circle.skipped {
          background: #cbd5e1;
          box-shadow: none;
        }
        .dsg-step-content {
          flex: 1;
          min-width: 0;
        }
        .dsg-step-top {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dsg-step-source-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }
        .dsg-step-source-name.skipped {
          color: #94a3b8;
          text-decoration: line-through;
          text-decoration-color: #cbd5e1;
        }
        .dsg-type-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          background: #f1f5f9;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .dsg-decision-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .dsg-decision-pill.any {
          background: #dcfce7;
          color: #166534;
        }
        .dsg-decision-pill.all-rule {
          background: #fef3c7;
          color: #92400e;
        }
        .dsg-skip-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }
        .dsg-approvers {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .dsg-approver-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: #f8fafc;
          color: #334155;
          border: 1px solid #e2e8f0;
          transition: all 0.15s ease;
        }
        .dsg-approver-chip:hover {
          background: ${BRAND_TEAL_LIGHT};
          border-color: rgba(21, 137, 147, 0.2);
        }
        .dsg-approver-dept {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
          margin-left: 1px;
        }
        .dsg-no-approvers {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-style: italic;
        }

        /* ===== FOOTER ===== */
        .dsg-footer {
          padding: 14px 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 0 0 16px 16px;
        }
        .dsg-footer-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #475569;
          font-weight: 500;
        }
        .dsg-footer-stat-value {
          font-weight: 700;
          color: #0f172a;
        }
        .dsg-footer-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #cbd5e1;
        }

        /* ===== ALL-ACCESS BANNER ===== */
        .dsg-all-access-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          margin-bottom: 14px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #bbf7d0;
          font-size: 13px;
          color: #166534;
          line-height: 1.45;
        }
        .dsg-all-access-banner-icon {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 7px;
          background: #dcfce7;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #16a34a;
        }
        .dsg-all-access-dept-name {
          font-weight: 700;
        }

        /* ===== LOADING SKELETON ===== */
        .dsg-skeleton-strip {
          height: 64px;
          border-radius: 10px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: dsg-shimmer 1.5s ease-in-out infinite;
          margin-bottom: 12px;
        }
        .dsg-skeleton-card {
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: dsg-shimmer 1.5s ease-in-out infinite;
          margin-bottom: 10px;
        }
        .dsg-skeleton-card:nth-child(2) {
          animation-delay: 0.15s;
        }
        .dsg-skeleton-card:nth-child(3) {
          animation-delay: 0.3s;
        }
        .dsg-skeleton-card:nth-child(4) {
          animation-delay: 0.45s;
        }
        @keyframes dsg-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ===== EMPTY / ERROR ===== */
        .dsg-empty {
          text-align: center;
          padding: 48px 24px;
        }
        .dsg-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .dsg-empty-title {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 4px;
        }
        .dsg-empty-desc {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .dsg-overlay {
            padding: 12px;
          }
          .dsg-modal {
            max-height: 95vh;
            border-radius: 14px;
          }
          .dsg-header {
            padding: 16px 18px;
          }
          .dsg-master-strip {
            padding: 14px 18px;
          }
          .dsg-body {
            padding: 16px 18px;
          }
          .dsg-footer {
            padding: 12px 18px;
          }
          .dsg-pipe-name {
            max-width: 100px;
          }
          .dsg-dept-name {
            font-size: 13px;
          }
          .dsg-dept-head {
            padding: 12px 14px;
          }
          .dsg-dept-body {
            padding: 4px 14px 14px;
          }
          .dsg-progress-bar-track {
            width: 36px;
          }
        }
      `}</style>

      <div className="dsg-overlay" onClick={onClose}>
        <div className="dsg-modal" onClick={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <div className="dsg-header">
            <div>
              <h5 className="dsg-header-title">
                <BsDiagram3Fill
                  size={15}
                  style={{ color: BRAND_TEAL, marginRight: 8, verticalAlign: "-1px" }}
                />
                Department Mapping Preview
              </h5>
              <div className="dsg-header-meta">
                {EntityIcon && (
                  <span
                    className="dsg-entity-badge"
                    style={{
                      backgroundColor: `${entityConfig.color}12`,
                      color: entityConfig.color,
                    }}
                  >
                    <EntityIcon size={12} />
                    {entityConfig.label}
                  </span>
                )}
                <span className="dsg-step-count">
                  {masterSteps.length} master {masterSteps.length === 1 ? "step" : "steps"}
                </span>
              </div>
            </div>
            <button className="dsg-close-btn" onClick={onClose} aria-label="Close preview">
              <BsXLg size={15} />
            </button>
          </div>

          {/* MASTER PIPELINE */}
          {!loading && previewData && masterSteps.length > 0 && (
            <div className="dsg-master-strip">
              <div className="dsg-master-label">
                <BsLightningFill size={11} />
                Master Approval Pipeline
              </div>
              <div className="dsg-pipeline">
                {masterSteps.map((step, idx) => (
                  <React.Fragment key={step.step_order || idx}>
                    <div className="dsg-pipe-node">
                      <div className="dsg-pipe-num">{step.step_order || idx + 1}</div>
                      <div>
                        <div className="dsg-pipe-name">
                          {step.approver_source_name || step.approver_user_name || step.approver_role_name || `Step ${idx + 1}`}
                        </div>
                        <div className="dsg-pipe-type">
                          {step.approver_source_type || "USER"} / {step.decision_rule || "ANY"}
                        </div>
                      </div>
                    </div>
                    {idx < masterSteps.length - 1 && (
                      <div className="dsg-pipe-connector">
                        <BsArrowRight size={14} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* BODY */}
          <div className="dsg-body">
            {loading ? (
              <>
                <div className="dsg-skeleton-strip" />
                <div className="dsg-skeleton-card" />
                <div className="dsg-skeleton-card" />
                <div className="dsg-skeleton-card" />
                <div className="dsg-skeleton-card" />
              </>
            ) : !previewData ? (
              <div className="dsg-empty">
                <div
                  className="dsg-empty-icon"
                  style={{ background: "#fef2f2", color: "#dc2626" }}
                >
                  <BsExclamationTriangleFill size={24} />
                </div>
                <div className="dsg-empty-title">Unable to load preview</div>
                <p className="dsg-empty-desc">
                  Try again or check if the workflow is still active.
                </p>
              </div>
            ) : previewData.department_subgraphs?.length === 0 ? (
              <div className="dsg-empty">
                <div
                  className="dsg-empty-icon"
                  style={{ background: "#f1f5f9", color: "#94a3b8" }}
                >
                  <BsBuilding size={24} />
                </div>
                <div className="dsg-empty-title">No departments found</div>
                <p className="dsg-empty-desc">
                  There are no departments linked to this approval policy.
                </p>
              </div>
            ) : (
              <>
                <div className="dsg-description">
                  Shows how the master approval workflow resolves for each department based on
                  role scope assignments.
                </div>
                {previewData.department_subgraphs.map((sg) => (
                  <DeptCard
                    key={sg.department.id}
                    subgraph={sg}
                    expanded={!!expandedDepts[sg.department.id]}
                    onToggle={() => toggleDept(sg.department.id)}
                  />
                ))}
              </>
            )}
          </div>

          {/* FOOTER */}
          {!loading && previewData && previewData.department_subgraphs?.length > 0 && (
            <div className="dsg-footer">
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span className="dsg-footer-stat">
                  <BsBuilding size={13} style={{ color: BRAND_TEAL }} />
                  <span className="dsg-footer-stat-value">{summaryStats.total}</span>
                  {summaryStats.total === 1 ? "department" : "departments"}
                </span>
                <span className="dsg-footer-dot" />
                <span className="dsg-footer-stat">
                  <BsShieldFillCheck size={13} style={{ color: "#16a34a" }} />
                  <span className="dsg-footer-stat-value">{summaryStats.autoApprove}</span>
                  auto-approve
                </span>
              </div>
              <span className="dsg-footer-stat" style={{ color: "#94a3b8", fontSize: 12 }}>
                {masterSteps.length} {masterSteps.length === 1 ? "step" : "steps"} in master
                policy
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ===================================================================
   DEPARTMENT CARD
   =================================================================== */
const DeptCard = ({ subgraph, expanded, onToggle }) => {
  const { department, steps, active_steps, will_auto_approve } = subgraph;
  const progressPct = steps.length > 0 ? (active_steps / steps.length) * 100 : 0;

  return (
    <div className="dsg-dept-card accent-individual">
      <div className="dsg-dept-head" onClick={onToggle}>
        <div className="dsg-dept-left">
          <BsChevronRight
            size={12}
            className={`dsg-dept-chevron${expanded ? " open" : ""}`}
          />
          <div className="dsg-dept-icon individual">
            <BsBuilding size={15} />
          </div>
          <span className="dsg-dept-name">{department.title}</span>
          {will_auto_approve && (
            <span className="dsg-auto-badge">
              <BsCheckCircleFill size={10} />
              Auto-approve
            </span>
          )}
        </div>
        <div className="dsg-dept-right">
          <div className="dsg-progress-mini">
            <div className="dsg-progress-bar-track">
              <div
                className="dsg-progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="dsg-progress-text">
              {active_steps}/{steps.length}
            </span>
          </div>
        </div>
      </div>

      <Collapse in={expanded}>
        <div>
          <div className="dsg-dept-body">
            {steps.map((step) => (
              <StepRow key={step.step_order} step={step} />
            ))}
          </div>
        </div>
      </Collapse>
    </div>
  );
};

/* ===================================================================
   STEP ROW
   =================================================================== */
const StepRow = ({ step }) => {
  const isSkipped = step.will_skip;
  const hasApprovers = step.approvers && step.approvers.length > 0;

  return (
    <div className="dsg-step">
      <div className={`dsg-step-circle ${isSkipped ? "skipped" : "active"}`}>
        {step.step_order}
      </div>
      <div className="dsg-step-content">
        <div className="dsg-step-top">
          <span className={`dsg-step-source-name${isSkipped ? " skipped" : ""}`}>
            {step.approver_source_name || "Unknown"}
          </span>
          <span className="dsg-type-pill">
            {step.approver_source_type === "USER" ? (
              <BsPersonFill size={9} />
            ) : step.approver_source_type === "DEPARTMENT" ? (
              <BsBuilding size={9} />
            ) : (
              <BsPeopleFill size={9} />
            )}
            {step.approver_source_type}
          </span>
          <span
            className={`dsg-decision-pill ${step.decision_rule === "ALL" ? "all-rule" : "any"}`}
          >
            {step.decision_rule === "ALL" ? "All must approve" : "Any one"}
          </span>
          {isSkipped && (
            <span className="dsg-skip-pill">
              <BsSkipForwardFill size={9} />
              Will skip
            </span>
          )}
        </div>

        {hasApprovers && (
          <div className="dsg-approvers">
            {step.approvers.map((approver) => (
              <span key={approver.id} className="dsg-approver-chip">
                <BsPersonFill size={11} style={{ color: BRAND_TEAL, flexShrink: 0 }} />
                {approver.name}
                {approver.department_name && (
                  <span className="dsg-approver-dept">({approver.department_name})</span>
                )}
              </span>
            ))}
            {step.approver_count > step.approvers.length && (
              <span className="dsg-approver-chip" style={{ color: "#94a3b8", fontStyle: "italic" }}>
                +{step.approver_count - step.approvers.length} more
              </span>
            )}
          </div>
        )}

        {isSkipped && !hasApprovers && (
          <div className="dsg-no-approvers">
            <BsExclamationTriangleFill size={11} style={{ color: "#d97706" }} />
            No matching approvers for this department
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentSubGraphPreview;
