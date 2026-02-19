import React, { useState, useCallback } from "react";
import { BsChevronDown, BsPeopleFill, BsPersonFill, BsEnvelope } from "react-icons/bs";
import { RFQ_PROCESS_STAGES, getEntityTypeConfig, BRAND_TEAL } from "../constants";

/**
 * Vertical flow graph: stages stacked top to bottom.
 * Each stage shows label, level count, and for each level: role/user name + accordion list of users with that role.
 */
const ApprovalFlowGraph = ({
  stages = [],
  getApproverDisplayInfo,
  compact = false,
  selectedDepartmentId = null,
}) => {
  const [openAccordions, setOpenAccordions] = useState({});

  const toggleAccordion = useCallback((key) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const shortLabels = {
    RFQ: "RFQ",
    TECHNICAL: "Tech",
    NEGOTIATION_QUOTE: "Quote",
    PO: "PO",
    TENDER: "Tender",
    ARC: "ARC",
  };
  const stageConfigs = stages.length
    ? stages.map((s) => ({
        ...getEntityTypeConfig(s.entity_type),
        shortLabel: shortLabels[s.entity_type] || getEntityTypeConfig(s.entity_type)?.label,
        steps: s.steps || [],
      }))
    : RFQ_PROCESS_STAGES.map((s) => ({
        ...getEntityTypeConfig(s.value),
        shortLabel: s.shortLabel,
        steps: [],
      }));

  return (
    <div className="approval-flow-graph approval-flow-graph-vertical">
      <style jsx>{`
        .approval-flow-graph {
          padding: ${compact ? "8px 0" : "12px 0"};
        }
        .flow-column {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
        }
        .stage-node {
          background: #fff;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: ${compact ? "10px 12px" : "14px 16px"};
          transition: all 0.2s ease;
          text-align: left;
        }
        .stage-node.has-approvers {
          border-color: #a7f3f0;
          background: linear-gradient(180deg, #f0fdfa 0%, #fff 100%);
        }
        .stage-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: ${compact ? "6px" : "10px"};
        }
        .stage-icon-wrap {
          width: ${compact ? "28px" : "36px"};
          height: ${compact ? "28px" : "36px"};
          min-width: ${compact ? "28px" : "36px"};
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stage-label {
          font-size: ${compact ? "12px" : "14px"};
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.2;
        }
        .stage-count {
          font-size: 11px;
          color: #6b7280;
          margin-left: 6px;
        }
        .arrow-wrap {
          display: flex;
          justify-content: center;
          padding: 6px 0;
          color: ${BRAND_TEAL};
        }
        .level-block {
          margin-top: ${compact ? "6px" : "10px"};
          padding-top: ${compact ? "6px" : "10px"};
          border-top: 1px solid #f3f4f6;
        }
        .level-block:first-of-type {
          margin-top: 0;
          padding-top: 0;
          border-top: none;
        }
        .level-role-name {
          font-size: ${compact ? "11px" : "12px"};
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        .accordion-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 10px;
          margin-top: 6px;
          cursor: pointer;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          transition: background 0.2s, border-color 0.2s;
        }
        .accordion-trigger:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }
        .accordion-trigger .chevron {
          flex-shrink: 0;
          margin-left: 8px;
          transition: transform 0.2s;
          color: #6b7280;
        }
        .accordion-trigger.open .chevron {
          transform: rotate(0deg);
        }
        .accordion-trigger:not(.open) .chevron {
          transform: rotate(-90deg);
        }
        .accordion-body {
          overflow: hidden;
          transition: max-height 0.25s ease-out;
        }
        .role-users-list {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 6px 6px;
          padding: 8px 10px;
        }
        .role-user-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 5px 0;
        }
        .role-user-item + .role-user-item {
          border-top: 1px solid #f3f4f6;
        }
        .user-name {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .user-info-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px 6px;
        }
        .user-email {
          font-size: 11px;
          color: #6b7280;
        }
        .user-dept-badge {
          display: inline-block;
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          border-radius: 4px;
          padding: 0px 5px;
          font-size: 10px;
          font-weight: 500;
          line-height: 16px;
          white-space: nowrap;
        }
        .connector-line {
          width: 2px;
          height: 20px;
          background: ${BRAND_TEAL};
          margin: 0 auto;
          position: relative;
        }
        .connector-line::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${BRAND_TEAL};
        }
      `}</style>

      <div className="flow-column">
        {stageConfigs.map((stage, index) => {
          const Icon = stage.icon;
          const steps = stage.steps || [];
          const hasApprovers = steps.length > 0;
          const isLast = index === stageConfigs.length - 1;

          return (
            <React.Fragment key={stage.value || index}>
              <div
                className={`stage-node ${hasApprovers ? "has-approvers" : ""}`}
                style={{ borderColor: hasApprovers ? stage.color : undefined }}
              >
                <div className="stage-header">
                  <div
                    className="stage-icon-wrap"
                    style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                  >
                    <Icon size={compact ? 14 : 18} />
                  </div>
                  <span className="stage-label">{stage.shortLabel || stage.label}</span>
                  <span className="stage-count">
                    {steps.length} level{steps.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {steps.length > 0 && (
                  <div className="levels-list">
                    {steps.map((step, stepIndex) => {
                      const info = getApproverDisplayInfo(step, selectedDepartmentId);
                      const hasUsers = info?.users && info.users.length > 0;
                      const isRole = info?.type === "Role";
                      const accordionKey = `stage-${index}-step-${stepIndex}`;
                      const isOpen = openAccordions[accordionKey];

                      return (
                        <div key={stepIndex} className="level-block">
                          <div className="level-role-name">
                            {info?.type === "User" ? (
                              <BsPersonFill size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            ) : (
                              <BsPeopleFill size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            )}
                            {info?.name || "—"}
                          </div>
                          {!compact && isRole && hasUsers && (
                            <div className="accordion-wrapper">
                              <button
                                type="button"
                                className={`accordion-trigger ${isOpen ? "open" : ""}`}
                                onClick={() => toggleAccordion(accordionKey)}
                                aria-expanded={isOpen}
                              >
                                <span>
                                  {info.users.length} {info.users.length === 1 ? "user" : "users"} with this role
                                </span>
                                <BsChevronDown size={14} className="chevron" />
                              </button>
                              <div
                                className="accordion-body"
                                style={{ maxHeight: isOpen ? "none" : 0 }}
                              >
                                <div className="role-users-list">
                                  {info.users.map((user, idx) => (
                                    <div key={user.user_id || idx} className="role-user-item">
                                      <div style={{ minWidth: 0 }}>
                                        <div className="user-name">{user.name}</div>
                                        <div className="user-info-row">
                                          {user.email && <span className="user-email">{user.email}</span>}
                                          {user.departmentNames?.map((dept, di) => (
                                            <span key={di} className="user-dept-badge">{dept}</span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {!compact && isRole && info && !hasUsers && (
                            <div className="role-users-list" style={{ background: "#fef2f2", borderColor: "#fecaca", marginTop: 6, borderRadius: 6 }}>
                              <small style={{ fontSize: "11px", color: "#b91c1c" }}>No users found with this role</small>
                            </div>
                          )}
                          {!compact && info?.type === "User" && info?.email && (
                            <div className="user-email mt-1" style={{ paddingLeft: "18px" }}>
                              <BsEnvelope size={10} style={{ marginRight: 4 }} />
                              {info.email}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {!isLast && (
                <div className="arrow-wrap">
                  <div className="connector-line" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalFlowGraph;
