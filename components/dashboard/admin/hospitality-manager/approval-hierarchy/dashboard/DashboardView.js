import React, { useMemo, useState } from "react";
import { BsPlus, BsDiagram3, BsLayers, BsShieldCheck } from "react-icons/bs";
import ProcessManageBar from "./ProcessManageBar";
import WorkflowCardV2 from "./WorkflowCardV2";
import EmptyState from "./EmptyState";
import DepartmentSubGraphPreview from "../preview/DepartmentSubGraphPreview";
import { DS, getStageEntityOrder, ARC_ENTITY_ORDER, isArcEntityType } from "../constants";
import s from "./DashboardView.module.scss";

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
      const entityOrder = getStageEntityOrder(proc.process_type);
      groups.push({ process: proc, policies: policies.filter((p) => p.process_id === proc.id && entityOrder.includes(p.entity_type)) });
    });
    // ARC flow: process-free policies whose entity_type is an ARC stage group
    // into one editable "ARC" card (kept separate from true orphans).
    const arcPolicies = policies.filter((p) => !p.process_id && isArcEntityType(p.entity_type));
    if (arcPolicies.length > 0) groups.push({ process: ARC_FLOW_PROCESS, policies: arcPolicies, isArc: true });
    const orphans = policies.filter((p) => !p.process_id && !isArcEntityType(p.entity_type));
    if (orphans.length > 0) groups.push({ process: { id: null, name: "Uncategorized", process_type: "RFQ" }, policies: orphans, isOrphan: true });
    return groups;
  }, [policies, processes]);

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
        </>
      )}
      {previewPolicy && <DepartmentSubGraphPreview policy={previewPolicy} previewData={previewData} loading={previewLoading} onClose={handleClosePreview} />}
    </div>
  );
};

export default DashboardView;
