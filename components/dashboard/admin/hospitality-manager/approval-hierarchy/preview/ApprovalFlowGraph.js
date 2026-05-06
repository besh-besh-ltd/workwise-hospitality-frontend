import React, { useState, useCallback } from "react";
import { BsChevronDown, BsPeopleFill, BsPersonFill, BsEnvelope, BsPlayFill, BsFlagFill } from "react-icons/bs";
import { RFQ_PROCESS_STAGES, getEntityTypeConfig, DS } from "../constants";
import s from "./ApprovalFlowGraph.module.scss";

const ApprovalFlowGraph = ({ stages = [], getApproverDisplayInfo, compact = false, selectedDepartmentId = null }) => {
  const [openAccordions, setOpenAccordions] = useState({});
  const toggleAccordion = useCallback((key) => { setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] })); }, []);

  const shortLabels = { RFQ: "RFQ", TECHNICAL: "Tech", NEGOTIATION: "Negotiation", NEGOTIATION_QUOTE: "Neg. Quote", PO: "PO", TENDER: "Tender", ARC: "ARC" };
  const stageConfigs = stages.length
    ? stages.map((st) => ({ ...getEntityTypeConfig(st.entity_type), shortLabel: shortLabels[st.entity_type], steps: st.steps || [] }))
    : RFQ_PROCESS_STAGES.map((st) => ({ ...getEntityTypeConfig(st.value), shortLabel: st.shortLabel, steps: [] }));

  return (
    <div className={`${s.wrap} ${compact ? s.wrapCompact : ""}`}>
      <div className={`${s.flow} ${compact ? s.flowCompact : ""}`}>
        {!compact && (
          <>
            <div className={s.endpoint}>
              <div className={`${s.endpointDot}`} style={{ background: `linear-gradient(135deg, ${DS.secondary}, ${DS.secondary}cc)`, color: "#fff" }}><BsPlayFill /></div>
              <span className={s.endpointLabel}>Submitted</span>
            </div>
            <div className={s.connector} />
          </>
        )}

        {stageConfigs.map((stage, index) => {
          const Icon = stage.icon;
          const steps = stage.steps || [];
          const hasApprovers = steps.length > 0;
          const isLast = index === stageConfigs.length - 1;

          return (
            <React.Fragment key={stage.value || index}>
              <div className={`${s.stage} ${compact ? s.stageCompact : ""}`}>
                <div
                  className={`${s.stageDot} ${compact ? s.stageDotCompact : ""} ${hasApprovers ? s.stageDotFilled : s.stageDotEmpty}`}
                  style={hasApprovers ? { background: `linear-gradient(135deg, ${stage.color}, ${stage.color}cc)`, color: "#fff" } : { color: DS.muted }}
                >
                  <Icon size={compact ? 10 : 12} />
                </div>
                <div className={`${s.stageContent} ${compact ? s.stageContentCompact : ""} ${hasApprovers ? s.stageContentActive : ""}`}>
                  <div className={s.stageTop}>
                    <span className={`${s.stageName} ${compact ? s.stageNameCompact : ""}`}>{stage.shortLabel || stage.label}</span>
                    <span className={s.stageCount}>{steps.length > 0 ? `${steps.length} lvl${steps.length !== 1 ? "s" : ""}` : "—"}</span>
                  </div>
                  {steps.length > 0 && (
                    <div className={`${s.levels} ${compact ? s.levelsCompact : ""}`}>
                      {steps.map((step, stepIndex) => {
                        // Per-stage entity_type goes into displayInfo so the
                        // BU wizard's preview reads the BU-scope-filtered slice
                        // (matches the picker on the left). Without this the
                        // legacy fallback runs and a network-scope holder
                        // leaks into the live preview's user count even though
                        // the picker correctly shows "No users available".
                        const info = getApproverDisplayInfo(step, stage.value || selectedDepartmentId);
                        const hasUsers = info?.users && info.users.length > 0;
                        const isRole = info?.type === "Role";
                        const accKey = `afg-${index}-${stepIndex}`;
                        const isOpen = openAccordions[accKey];
                        return (
                          <div key={stepIndex}>
                            <div className={s.level}>
                              <span className={s.lBadge}>L{stepIndex + 1}</span>
                              <span className={`${s.lName} ${compact ? s.lNameCompact : ""}`}>
                                {isRole ? <BsPeopleFill size={9} style={{ color: DS.muted }} /> : <BsPersonFill size={9} style={{ color: DS.muted }} />}
                                {info?.name || "—"}
                              </span>
                              <span className={`${s.lRule} ${step.decision_rule === "ALL" ? s.lRuleAll : s.lRuleAny}`}>{step.decision_rule === "ALL" ? "ALL" : "ANY"}</span>
                            </div>
                            {!compact && isRole && hasUsers && (
                              <>
                                <button type="button" className={s.accBtn} onClick={() => toggleAccordion(accKey)}>
                                  <span>{info.users.length} user{info.users.length !== 1 ? "s" : ""}</span>
                                  <BsChevronDown size={10} className={`${s.accChevron} ${isOpen ? s.accChevronOpen : s.accChevronClosed}`} />
                                </button>
                                <div className={s.accBody} style={{ maxHeight: isOpen ? "none" : 0 }}>
                                  <div className={s.users}>
                                    {info.users.map((user, idx) => (
                                      <div key={user.user_id || idx} className={s.user}>
                                        <span className={s.userName}>{user.name}</span>
                                        {user.email && <span className={s.userEmail}>{user.email}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                            {!compact && isRole && !hasUsers && <div className={s.noUsers}>No users with this role</div>}
                            {!compact && info?.type === "User" && info?.email && <div className={s.emailLine}><BsEnvelope size={8} /> {info.email}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {!isLast && <div className={`${s.connector} ${compact ? s.connectorCompact : ""}`} />}
            </React.Fragment>
          );
        })}

        {!compact && (
          <>
            <div className={s.connector} />
            <div className={s.endpoint}>
              <div className={s.endpointDot} style={{ background: `linear-gradient(135deg, ${DS.primary}, ${DS.primary}cc)`, color: "#fff" }}><BsFlagFill /></div>
              <span className={s.endpointLabel}>Approved</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovalFlowGraph;
