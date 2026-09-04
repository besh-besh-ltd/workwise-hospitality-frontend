import React, { useMemo, useState } from "react";
import { BsPlus, BsDiagram3, BsLayers, BsShieldCheck, BsExclamationTriangle } from "react-icons/bs";
import ProcessManageBar from "./ProcessManageBar";
import WorkflowCardV2 from "./WorkflowCardV2";
import EmptyState from "./EmptyState";
import DepartmentSubGraphPreview from "../preview/DepartmentSubGraphPreview";
import { DS, isArcEntityType, getMisroutedArcPolicies, getEntityTypeConfig } from "../constants";
import s from "./DashboardView.module.scss";

/** Ids may arrive as numbers or strings depending on the endpoint. */
const sameId = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && Number(a) === Number(b);

// Synthetic "process" representing the process-free ARC flow so ARC policies
// (process_id = NULL, entity_type ARC_*) group into one editable card.
export const ARC_FLOW_PROCESS = { id: "__ARC__", name: "ARC (Rate Contracts)", process_type: "ARC", is_arc: true };

const DashboardView = ({ policies, processes, departments, onCreateWorkflow, onEditWorkflow, onDeleteWorkflow, onDeletePolicy, onCreateProcess, onUpdateProcess, onDeleteProcess, getApproverDisplayInfo, getDeptSubGraphPreview }) => {
  const [previewPolicy, setPreviewPolicy] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const stats = useMemo(() => ({
    totalProcesses: (processes || []).length,
    totalPolicies: policies.length,
    totalLevels: policies.reduce((sum, p) => sum + (p.steps?.length || 0), 0),
  }), [policies, processes]);

  const processGroups = useMemo(() => {
    const groups = [];
    (processes || []).forEach((proc) => {
      // Every policy routed through this process, whatever its entity_type. The
      // filter used to also intersect with getStageEntityOrder(proc.process_type),
      // which silently discarded any stage outside the process type's canonical
      // route — in production the RFQ-typed process 2 owns a TENDER policy too,
      // so the card showed 5 of 6 stages while the KPI row above it counted all
      // 6. WorkflowCardV2 appends the reachable extras; the ARC-flow ones it
      // cannot show are reported by the misroutedArc diagnostic below.
      groups.push({ process: proc, policies: policies.filter((p) => sameId(p.process_id, proc.id)) });
    });
    // ARC flow: process-free policies whose entity_type is an ARC stage group
    // into one editable "ARC" card (kept separate from true orphans).
    const arcPolicies = policies.filter((p) => !p.process_id && isArcEntityType(p.entity_type));
    if (arcPolicies.length > 0) groups.push({ process: ARC_FLOW_PROCESS, policies: arcPolicies, isArc: true });
    const orphans = policies.filter((p) => !p.process_id && !isArcEntityType(p.entity_type));
    if (orphans.length > 0) groups.push({ process: { id: null, name: "Uncategorized", process_type: "RFQ" }, policies: orphans, isOrphan: true });
    return groups;
  }, [policies, processes]);

  // ARC-flow policies pinned to a process whose route does not name them. The
  // ARC flow is process-free — an ARC contract carries process_id = NULL and
  // findBestMatchingPolicyTx matches `process_id = $4 OR process_id IS NULL`, so
  // a NULL entity process can only ever select a NULL-process policy. These rows
  // can never be chosen. They used to be drawn into the process card as ordinary
  // stages, which read as "this RFQ route has a rate-contract gate" — it does
  // not. getCardStageOrder drops them; this names them, because a policy the KPI
  // row counts must never vanish from the page without a word.
  const misroutedArc = useMemo(
    () =>
      processGroups
        .filter((g) => !g.isArc && !g.isOrphan && g.process?.id)
        .map((g) => ({
          process: g.process,
          policies: getMisroutedArcPolicies(g.process?.process_type, g.policies),
        }))
        .filter((g) => g.policies.length > 0),
    [processGroups]
  );

  // Policies routed through a process that is not in the loaded process list.
  // They belong to no group, so nothing above renders them — and because the KPI
  // row counts every policy, the page would otherwise claim N workflow stages
  // and show none of them. That is exactly how the company-id mismatch on
  // GET /approval/processes (hospitality id sent where a buyer id was wanted)
  // surfaced: a blank list under a "7 Workflow Stages" headline, with nothing on
  // screen to suggest why. Surface it instead of dropping it.
  const unmatchedPolicies = useMemo(
    () => policies.filter((p) => p.process_id && !(processes || []).some((proc) => sameId(p.process_id, proc.id))),
    [policies, processes]
  );
  const unmatchedProcessIds = useMemo(
    () => [...new Set(unmatchedPolicies.map((p) => Number(p.process_id)))].sort((a, b) => a - b),
    [unmatchedPolicies]
  );

  const hasAnyWorkflows = policies.length > 0;

  const handleClosePreview = () => { setPreviewPolicy(null); setPreviewData(null); };

  const STAT_CARDS = [
    { label: "Processes", value: stats.totalProcesses, icon: BsDiagram3, color: DS.primary, bg: DS.blueTint },
    { label: "Workflow Stages", value: stats.totalPolicies, icon: BsLayers, color: DS.secondary, bg: DS.greenTint },
    { label: "Approval Levels", value: stats.totalLevels, icon: BsShieldCheck, color: DS.accent, bg: DS.orangeTint },
  ];

  return (
    <div>
      {(hasAnyWorkflows || (processes || []).length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: card.bg, color: card.color, flexShrink: 0 }}><Icon size={18} /></div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: DS.dark, fontFamily: "'Poppins', sans-serif", lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: DS.muted, fontFamily: "'Poppins', sans-serif", marginTop: 1 }}>{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={s.topBar}>
        <div className="flex-grow-1"><ProcessManageBar processes={processes} onCreateProcess={onCreateProcess} onUpdateProcess={onUpdateProcess} onDeleteProcess={onDeleteProcess} /></div>
        <button className={s.createBtn} onClick={onCreateWorkflow}><BsPlus size={18} /> Create Workflow</button>
      </div>

      {!hasAnyWorkflows && (processes || []).length === 0 ? (
        <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: 16 }}><EmptyState onCreateWorkflow={onCreateWorkflow} /></div>
      ) : (
        <>
          {processGroups.some((g) => g.policies.length > 0) && <div className={s.sectionLabel}>Workflows</div>}
          {processGroups.map((group) => {
            if (group.policies.length === 0) return null;
            if (group.isOrphan) return group.policies.map((policy) => (
              <WorkflowCardV2 key={policy.id} process={{ id: null, name: `${policy.entity_type} Approval`, process_type: "RFQ" }} policies={[policy]} onEdit={() => onDeletePolicy?.(policy.id)} onDelete={() => onDeletePolicy?.(policy.id)} getApproverDisplayInfo={getApproverDisplayInfo} />
            ));
            return <WorkflowCardV2 key={group.process.id} process={group.process} policies={group.policies} onEdit={onEditWorkflow} onDelete={onDeleteWorkflow} getApproverDisplayInfo={getApproverDisplayInfo} />;
          })}
          {processGroups.filter((g) => !g.isOrphan && g.policies.length === 0).length > 0 && (
            <>
              <div className={s.sectionLabel} style={{ marginTop: 10 }}>Unconfigured</div>
              {processGroups.filter((g) => !g.isOrphan && g.policies.length === 0).map((group) => (
                <div key={`empty-${group.process.id}`} className={s.emptyProc}>
                  <div><div className={s.emptyProcName}>{group.process.name}</div><div className={s.emptyProcSub}>No workflows configured</div></div>
                  <button className={s.configureBtn} onClick={() => onEditWorkflow(group.process)}><BsPlus size={14} /> Configure</button>
                </div>
              ))}
            </>
          )}

          {misroutedArc.length > 0 && (
            <div className={s.diagnostic} data-testid="arc-misrouted-diagnostic">
              <BsExclamationTriangle size={16} className={s.diagnosticIcon} />
              <div>
                <div className={s.diagnosticTitle}>
                  {misroutedArc.reduce((n, g) => n + g.policies.length, 0)} ARC stage
                  {misroutedArc.reduce((n, g) => n + g.policies.length, 0) !== 1 ? "s are" : " is"} attached to a
                  process and will never be used
                </div>
                <div className={s.diagnosticBody}>
                  Rate contract approvals are <b>process-free</b> — an ARC never carries a process, so a policy saved
                  against one can never be matched to it. These stages are counted in the totals above but are not shown
                  on the process cards, because they do not gate anything.
                </div>
                {misroutedArc.map((g) => (
                  <div key={g.process.id} className={s.diagnosticBody}>
                    <b>{g.process.name}</b> ({(g.process.process_type || "RFQ").toUpperCase()}):{" "}
                    {g.policies.map((p) => getEntityTypeConfig(p.entity_type).label).join(", ")}.
                  </div>
                ))}
                <div className={s.diagnosticBody}>
                  Configure them on the <b>ARC (Rate Contracts)</b> card instead, then delete these.
                </div>
              </div>
            </div>
          )}

          {unmatchedPolicies.length > 0 && (
            <div className={s.diagnostic} data-testid="workflow-diagnostic">
              <BsExclamationTriangle size={16} className={s.diagnosticIcon} />
              <div>
                <div className={s.diagnosticTitle}>
                  {unmatchedPolicies.length} workflow stage{unmatchedPolicies.length !== 1 ? "s" : ""} could not be displayed
                </div>
                <div className={s.diagnosticBody}>
                  {unmatchedPolicies.length !== 1 ? "They are" : "It is"} configured against process{" "}
                  {unmatchedProcessIds.length !== 1 ? "IDs" : "ID"}{" "}
                  <b>{unmatchedProcessIds.join(", ")}</b>, which {unmatchedProcessIds.length !== 1 ? "are" : "is"} not in
                  this company&apos;s process list ({(processes || []).length} process
                  {(processes || []).length !== 1 ? "es" : ""} loaded). The stages are still active — they are counted in
                  the totals above and continue to gate approvals; only this list cannot group them.
                </div>
                <div className={s.diagnosticBody}>
                  Affected stages: {[...new Set(unmatchedPolicies.map((p) => p.entity_type))].join(", ")}.
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {previewPolicy && <DepartmentSubGraphPreview policy={previewPolicy} previewData={previewData} loading={previewLoading} onClose={handleClosePreview} />}
    </div>
  );
};

export default DashboardView;
