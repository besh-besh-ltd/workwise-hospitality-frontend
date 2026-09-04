import React, { useState, useCallback } from "react";
import { BsPencilSquare, BsTrash3, BsPeopleFill, BsPersonFill, BsChevronDown, BsEnvelope, BsBuilding } from "react-icons/bs";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { DS, PROCESS_TYPE_COLORS, getCardStageOrder, getEntityTypeConfig } from "../constants";
import s from "./WorkflowCardV2.module.scss";

/**
 * The departments an approver belongs to.
 *
 * A level names a person or a role and nothing else, which leaves an admin
 * auditing a chain unable to tell two same-named approvers apart, or to see
 * which part of the business a level actually answers for. useApprovalData
 * already attaches departmentNames to every resolved approver (from
 * /rbac/users/batch-departments) — this draws them. Nothing renders when the
 * user is mapped to no department, rather than an empty rail.
 */
const DeptList = ({ names }) => {
  if (!names || names.length === 0) return null;
  return (
    <div className={s.deptList}>
      <BsBuilding size={9} className={s.deptIcon} />
      {names.map((name) => (
        <span key={name} className={s.deptChip}>{name}</span>
      ))}
    </div>
  );
};

const STAGE_FULL_NAMES = { RFQ: "RFQ Approval", TECHNICAL: "Technical Evaluation", NEGOTIATION: "Negotiation Rounds", NEGOTIATION_QUOTE: "Quote Finalization", PO: "Purchase Order", TENDER: "Tender Submission", ARC: "ARC (Publish & Base)", ARC_TECH: "ARC Technical Evaluation", ARC_NEGOTIATION: "ARC Negotiation", ARC_COMMITTEE: "ARC Committee Award", ARC_AMENDMENT: "ARC Amendment" };
const STAGE_DESCRIPTIONS = { RFQ: "Triggered when a new RFQ is submitted for approval", TECHNICAL: "Approves technical evaluation markings", NEGOTIATION: "Approves negotiation rounds", NEGOTIATION_QUOTE: "Final approval on vendor quotes after negotiation", PO: "Final sign-off before purchase order is issued", TENDER: "Approval gate when a tender is submitted", ARC: "Required — gates publishing a rate contract; default for every ARC stage", ARC_TECH: "Approves rate contract technical evaluation", ARC_NEGOTIATION: "Approves rate contract negotiation rounds", ARC_COMMITTEE: "ARC committee approval of finalised awards", ARC_AMENDMENT: "Approves post-award rate contract amendments" };
const STAGE_SHORT = { RFQ: "RFQ", TECHNICAL: "Tech", NEGOTIATION: "Neg", NEGOTIATION_QUOTE: "NQ", PO: "PO", TENDER: "Tender", ARC: "ARC", ARC_TECH: "Tech", ARC_NEGOTIATION: "Neg", ARC_COMMITTEE: "Committee", ARC_AMENDMENT: "Amend" };

const WorkflowCardV2 = ({ process, policies, onEdit, onDelete, getApproverDisplayInfo }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedStage, setExpandedStage] = useState(null);
  const [openUsers, setOpenUsers] = useState({});

  const processType = (process?.process_type || "RFQ").toUpperCase();
  const isArc = !!process?.is_arc || processType === "ARC";
  // Canonical route first, then any reachable stage this process has a policy
  // for but its route does not name (an RFQ process carrying a TENDER policy,
  // say). ARC-flow stages are never appended — they are process-free and a
  // process-pinned ARC policy can never fire; DashboardView reports those.
  // Everything the card DOES show is counted in its own totals below.
  const stageOrder = getCardStageOrder(processType === "RFQ" ? "RFQ" : "TENDER", policies, isArc);
  const typeColor = PROCESS_TYPE_COLORS[processType] || DS.primary;
  const stages = stageOrder.map((et) => { const p = (policies || []).find((pol) => pol.entity_type === et); return { entity_type: et, steps: p?.steps || [] }; });
  const processName = process?.name || "Process";
  const totalLevels = stages.reduce((sum, st) => sum + (st.steps?.length || 0), 0);
  const configuredStages = stages.filter((st) => st.steps?.length > 0).length;

  const handleStageClick = useCallback((i) => {
    setExpandedStage((prev) => prev === i ? null : i);
  }, []);

  const toggleUsers = useCallback((key, e) => {
    e?.stopPropagation();
    setOpenUsers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const expandedData = expandedStage !== null ? stages[expandedStage] : null;
  const expandedConfig = expandedData ? getEntityTypeConfig(expandedData.entity_type) : null;

  return (
    <>
      <div className={s.card}>
        <div className={s.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <span className={s.title}>{processName}</span>
              <span className={s.typePill} style={{ backgroundColor: typeColor + "12", color: typeColor }}>{processType}</span>
            </div>
            <div className={s.meta}>
              <span className={s.stat}><b>{configuredStages}</b>/{stages.length} stages</span>
              <span className={s.dot} />
              <span className={s.stat}><b>{totalLevels}</b> level{totalLevels !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className={s.actions}>
            <button className={s.action} onClick={() => onEdit(process)} title="Edit"><BsPencilSquare size={14} /></button>
            <button className={`${s.action} ${s.actionDanger}`} onClick={() => setShowDeleteModal(true)} title="Delete"><BsTrash3 size={14} /></button>
          </div>
        </div>

        {/* Stage flow circles */}
        <div className={s.flow}>
          {stages.map((stage, i) => {
            const config = getEntityTypeConfig(stage.entity_type);
            const hasLevels = stage.steps?.length > 0;
            const nextHasLevels = stages[i + 1]?.steps?.length > 0;
            const isLast = i === stages.length - 1;
            const isExpanded = expandedStage === i;
            return (
              <React.Fragment key={stage.entity_type}>
                <div
                  className={`${s.stage} ${s.stageClickable}`}
                  data-edge={i === 0 ? "start" : isLast ? "end" : undefined}
                  onClick={() => handleStageClick(i)}
                >
                  {/* Hover tooltip */}
                  <div className={s.tooltip}>
                    <div className={s.tooltipInner}>
                      <div className={s.ttStage}>Stage {i + 1}</div>
                      <div className={s.ttName}>{STAGE_FULL_NAMES[stage.entity_type]}</div>
                      <div className={s.ttDesc}>{STAGE_DESCRIPTIONS[stage.entity_type]}</div>
                      <span className={s.ttLevels} style={{ background: hasLevels ? "rgba(66,139,65,0.2)" : "rgba(255,255,255,0.15)", color: hasLevels ? "#a3e6a0" : "rgba(255,255,255,0.6)" }}>
                        {hasLevels ? `${stage.steps.length} level${stage.steps.length !== 1 ? "s" : ""} — click to expand` : "Not configured"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`${s.stageCircle} ${hasLevels ? s.stageCircleConfigured : s.stageCircleEmpty}`}
                    style={hasLevels ? {
                      background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                      ...(isExpanded ? { boxShadow: `0 0 0 3px ${config.color}30, 0 2px 8px rgba(0,0,0,0.15)` } : {}),
                    } : isExpanded ? { borderColor: DS.primary, color: DS.primary } : undefined}
                  >
                    {i + 1}
                    {hasLevels && <span className={s.countBadge} style={{ color: config.color }}>{stage.steps.length}</span>}
                  </div>
                  <span className={s.stageLabel}>{STAGE_SHORT[stage.entity_type]}</span>
                </div>
                {!isLast && (
                  <div className={`${s.line} ${hasLevels && nextHasLevels ? s.lineDone : ""}`} style={hasLevels && nextHasLevels ? { "--from": config.color, "--to": getEntityTypeConfig(stages[i + 1].entity_type).color } : undefined} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Expanded detail panel */}
        {expandedData && expandedConfig && (
          <div className={s.detail}>
            <div className={s.detailHeader}>
              <expandedConfig.icon size={14} style={{ color: expandedConfig.color }} />
              <span className={s.detailTitle}>{STAGE_FULL_NAMES[expandedData.entity_type]}</span>
              <span className={s.detailCount}>
                {expandedData.steps.length > 0
                  ? `${expandedData.steps.length} level${expandedData.steps.length !== 1 ? "s" : ""}`
                  : "No levels"}
              </span>
            </div>
            {expandedData.steps.length === 0 ? (
              <div className={s.detailEmpty}>No approval levels configured for this stage</div>
            ) : (
              <div className={s.detailBody}>
                {expandedData.steps.map((step, stepIdx) => {
                  const info = getApproverDisplayInfo(step);
                  const isRole = info?.type === "Role";
                  const hasUsers = info?.users && info.users.length > 0;
                  const userKey = `${expandedStage}-${stepIdx}`;
                  const usersOpen = openUsers[userKey];

                  return (
                    <div key={stepIdx} className={s.level}>
                      <span className={s.levelNum}>{stepIdx + 1}</span>
                      <div className={s.levelContent}>
                        <div className={s.levelName}>
                          {isRole ? <BsPeopleFill size={11} style={{ color: DS.muted }} /> : <BsPersonFill size={11} style={{ color: DS.muted }} />}
                          {info?.name || "—"}
                        </div>
                        <div className={s.levelBadges}>
                          <span className={`${s.badge} ${step.decision_rule === "ALL" ? s.badgeAll : s.badgeAny}`}>
                            {step.decision_rule === "ALL" ? "All must approve" : "Any one"}
                          </span>
                          <span className={`${s.badge} ${s.badgeType}`}>
                            {info?.typeLabel || (isRole ? "Role" : "User")}
                          </span>
                        </div>
                        {info?.type === "User" && info?.email && (
                          <div className={s.emailLine}><BsEnvelope size={9} /> {info.email}</div>
                        )}
                        {info?.type === "User" && <DeptList names={info?.users?.[0]?.departmentNames} />}
                        {isRole && hasUsers && (
                          <>
                            <button className={s.usersToggle} onClick={(e) => toggleUsers(userKey, e)}>
                              {info.users.length} user{info.users.length !== 1 ? "s" : ""}
                              <BsChevronDown size={10} style={{ transform: usersOpen ? "rotate(0)" : "rotate(-90deg)", transition: "0.2s" }} />
                            </button>
                            {usersOpen && (
                              <div className={s.usersList}>
                                {info.users.map((user, idx) => (
                                  <div key={user.user_id || idx} className={s.userRow}>
                                    <div className={s.userIdentity}>
                                      <span className={s.userName}>{user.name}</span>
                                      {user.email && <span className={s.userEmail}>{user.email}</span>}
                                    </div>
                                    <DeptList names={user.departmentNames} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={async () => { await onDelete(process); setShowDeleteModal(false); }} title="Delete workflow" description={`Delete the entire approval workflow for <strong>${processName}</strong>?`} confirmButtonColor="danger" confirmButtonText="Delete" cancelButtonText="Cancel" />
    </>
  );
};

export default WorkflowCardV2;
