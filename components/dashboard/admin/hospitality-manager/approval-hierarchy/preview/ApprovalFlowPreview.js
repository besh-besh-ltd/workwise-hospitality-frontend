import React from "react";
import { BsCheckCircleFill, BsPeopleFill, BsPersonFill, BsExclamationTriangle, BsEnvelope } from "react-icons/bs";
import { DS } from "../constants";
import s from "./ApprovalFlowPreview.module.scss";

const ApprovalFlowPreview = ({ steps = [], getApproverDisplayInfo, selectedDepartmentId, compact = false }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <BsPeopleFill size={compact ? 28 : 48} className={`mb-2 d-block mx-auto ${s.emptyIcon}`} />
        <p className="mb-1" style={{ fontSize: compact ? 12 : 14 }}>No approvers configured</p>
        {!compact && <small>Add approvers to see the approval flow</small>}
      </div>
    );
  }

  return (
    <div className={compact ? s.wrapCompact : s.wrap}>
      {steps.map((step, index) => {
        const info = getApproverDisplayInfo(step, selectedDepartmentId);
        const isLast = index === steps.length - 1;
        const hasUsers = info.users && info.users.length > 0;
        return (
          <div key={step.id || index}>
            <div className={`${s.stepCard} ${compact ? s.stepCardCompact : s.stepCardFull}`}>
              <div className="d-flex align-items-start gap-3">
                <div className={`${s.stepCircle} ${compact ? s.stepCircleSm : s.stepCircleLg}`}>{step.step_order || index + 1}</div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fw-semibold" style={{ fontSize: compact ? 13 : 15, color: "#1a1a1a" }}>{info.name}</span>
                  </div>
                  {info.email && !compact && (
                    <div className="text-muted d-flex align-items-center gap-1 mt-1" style={{ fontSize: 12 }}><BsEnvelope size={11} /> {info.email}</div>
                  )}
                  <div className="d-flex gap-2 flex-wrap mt-2">
                    <span className={`${s.decisionBadge} ${compact ? s.decisionBadgeSm : s.decisionBadgeLg} ${step.decision_rule === "ALL" ? s.decisionAll : s.decisionAny}`}>
                      {step.decision_rule === "ALL" ? "All Must Approve" : "Any One Can Approve"}
                    </span>
                    <span className={`${s.typeBadge} ${compact ? s.typeBadgeSm : s.typeBadgeLg}`}>
                      {info.type === "User" ? <BsPersonFill size={10} /> : <BsPeopleFill size={10} />}
                      {info.typeLabel}
                    </span>
                  </div>
                  {!compact && info.type === "Role" && hasUsers && (
                    <div className={s.roleUsersList}>
                      <small className="text-muted fw-semibold d-block mb-1">{info.users.length} user{info.users.length === 1 ? "" : "s"} with this role:</small>
                      {info.users.map((user, idx) => (
                        <div key={user.user_id || idx} className={s.roleUserItem}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name}</div>
                            {user.email && <div className="text-muted" style={{ fontSize: 11 }}>{user.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!compact && info.type === "Role" && !hasUsers && (
                    <div className="d-flex align-items-center gap-1 mt-2" style={{ fontSize: 12, color: "#d97706" }}>
                      <BsExclamationTriangle size={12} /> No users found with this role
                    </div>
                  )}
                </div>
              </div>
            </div>
            {!isLast && (
              <div className={`${s.connector} ${compact ? s.connectorSm : s.connectorLg}`}>
                <div className={`${s.connectorLine} ${compact ? s.connectorLineSm : s.connectorLineLg}`} />
                {!compact && <span className={s.connectorLabel}>Then</span>}
              </div>
            )}
          </div>
        );
      })}
      {steps.length > 0 && !compact && (
        <div className="text-center mt-3 pt-2 border-top">
          <small className="text-muted d-flex align-items-center justify-content-center gap-1">
            <BsCheckCircleFill className="text-success" size={13} /> Approval workflow complete
          </small>
        </div>
      )}
    </div>
  );
};

export default ApprovalFlowPreview;
