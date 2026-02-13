import React from "react";
import { BsCheckCircleFill, BsPeopleFill, BsPersonFill, BsExclamationTriangle, BsEnvelope } from "react-icons/bs";
import { BRAND_TEAL } from "../constants";

const ApprovalFlowPreview = ({ steps = [], getApproverDisplayInfo, selectedDepartmentId, compact = false }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <BsPeopleFill size={compact ? 28 : 48} className="mb-2 d-block mx-auto" style={{ opacity: 0.3 }} />
        <p className="mb-1" style={{ fontSize: compact ? "12px" : "14px" }}>No approvers configured</p>
        {!compact && <small>Add approvers to see the approval flow</small>}
      </div>
    );
  }

  return (
    <div className="approval-flow-preview">
      <style jsx>{`
        .approval-flow-preview {
          padding: ${compact ? "8px 0" : "16px 0"};
        }
        .flow-step-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-left: 4px solid ${BRAND_TEAL};
          border-radius: 8px;
          padding: ${compact ? "10px 12px" : "16px 20px"};
          transition: all 0.2s ease;
          position: relative;
        }
        .flow-step-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .step-number-circle {
          width: ${compact ? "24px" : "36px"};
          height: ${compact ? "24px" : "36px"};
          min-width: ${compact ? "24px" : "36px"};
          border-radius: 50%;
          background: ${BRAND_TEAL};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${compact ? "11px" : "14px"};
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(21, 137, 147, 0.3);
        }
        .flow-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: ${compact ? "4px 0" : "8px 0"};
        }
        .connector-line {
          width: 2px;
          height: ${compact ? "16px" : "24px"};
          background: ${BRAND_TEAL};
          position: relative;
        }
        .connector-line::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${BRAND_TEAL};
        }
        .connector-label {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 6px;
          font-weight: 500;
        }
        .decision-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: ${compact ? "10px" : "11px"};
          font-weight: 500;
        }
        .decision-badge.any {
          background: #dcfce7;
          color: #166534;
        }
        .decision-badge.all {
          background: #fef3c7;
          color: #92400e;
        }
        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: ${compact ? "10px" : "11px"};
          font-weight: 500;
          background: #f3f4f6;
          color: #374151;
        }
        .role-users-list {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 10px;
          margin-top: 8px;
        }
        .role-user-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }
        .role-user-item + .role-user-item {
          border-top: 1px solid #f3f4f6;
        }
      `}</style>

      {steps.map((step, index) => {
        const info = getApproverDisplayInfo(step, selectedDepartmentId);
        const isLast = index === steps.length - 1;
        const hasUsers = info.users && info.users.length > 0;

        return (
          <div key={step.id || index}>
            <div className="flow-step-card">
              <div className="d-flex align-items-start gap-3">
                <div className="step-number-circle">{step.step_order || index + 1}</div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fw-semibold" style={{ fontSize: compact ? "13px" : "15px", color: "#1a1a1a" }}>
                      {info.name}
                    </span>
                  </div>
                  {info.email && !compact && (
                    <div className="text-muted d-flex align-items-center gap-1 mt-1" style={{ fontSize: "12px" }}>
                      <BsEnvelope size={11} /> {info.email}
                    </div>
                  )}
                  <div className="d-flex gap-2 flex-wrap mt-2">
                    <span className={`decision-badge ${step.decision_rule === "ALL" ? "all" : "any"}`}>
                      {step.decision_rule === "ALL" ? "All Must Approve" : "Any One Can Approve"}
                    </span>
                    <span className="type-badge">
                      {info.type === "User" ? <BsPersonFill size={10} /> : <BsPeopleFill size={10} />}
                      {info.typeLabel}
                    </span>
                  </div>

                  {!compact && info.type === "Role" && hasUsers && (
                    <div className="role-users-list">
                      <small className="text-muted fw-semibold d-block mb-1">
                        {info.users.length} {info.users.length === 1 ? "user" : "users"} with this role:
                      </small>
                      {info.users.map((user, idx) => (
                        <div key={user.user_id || idx} className="role-user-item">
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600 }}>{user.name}</div>
                            {user.email && (
                              <div className="text-muted" style={{ fontSize: "11px" }}>{user.email}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!compact && info.type === "Role" && !hasUsers && (
                    <div className="d-flex align-items-center gap-1 mt-2" style={{ fontSize: "12px", color: "#d97706" }}>
                      <BsExclamationTriangle size={12} />
                      No users found with this role
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isLast && (
              <div className="flow-connector">
                <div className="connector-line" />
                {!compact && <span className="connector-label">Then</span>}
              </div>
            )}
          </div>
        );
      })}

      {steps.length > 0 && !compact && (
        <div className="text-center mt-3 pt-2 border-top">
          <small className="text-muted d-flex align-items-center justify-content-center gap-1">
            <BsCheckCircleFill className="text-success" size={13} />
            Approval workflow complete
          </small>
        </div>
      )}
    </div>
  );
};

export default ApprovalFlowPreview;
