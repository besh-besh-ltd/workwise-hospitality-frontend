import React from "react";
import { BsCheckCircleFill, BsDiagram3 } from "react-icons/bs";
import ApprovalFlowGraph from "../preview/ApprovalFlowGraph";
import { DS, PROCESS_TYPE_COLORS } from "../constants";
import s from "./StepReviewSave.module.scss";

const StepReviewSave = ({ process, stages, hotel, getApproverDisplayInfo }) => {
  const processName = process?.name || "Unknown Process";
  const processType = (process?.process_type || "RFQ").toUpperCase();
  const isRfqRoute = processType === "RFQ";
  const flowLabel = isRfqRoute ? "RFQ > Technical > Negotiation > Neg. Quote > PO" : "Tender > Technical > Negotiation > Neg. Quote > ARC";
  const typeColor = PROCESS_TYPE_COLORS[processType] || DS.primary;
  const totalLevels = (stages || []).reduce((sum, st) => sum + (st.steps?.length || 0), 0);
  const configuredStages = (stages || []).filter((st) => st.steps?.length > 0).length;

  return (
    <div>
      <h4 className={s.heading}>Review your workflow</h4>
      <p className={s.subtext}>Verify the process and approval stages before saving.</p>
      <div className={s.summaryGrid}>
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Process</div>
          <div className={s.summaryValue}>{processName}<span className={s.typePill} style={{ backgroundColor: typeColor + "15", color: typeColor }}>{processType}</span></div>
        </div>
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Flow</div>
          <div className={s.summaryValue} style={{ fontSize: 12 }}>{flowLabel}</div>
        </div>
        {hotel && <div className={s.summaryCard}><div className={s.summaryLabel}>Business Unit</div><div className={s.summaryValue} style={{ fontSize: 13 }}>{hotel.name}</div></div>}
        <div className={s.summaryCard}>
          <div className={s.summaryLabel}>Configuration</div>
          <div className={s.summaryValue} style={{ fontSize: 13 }}>{configuredStages} stage{configuredStages !== 1 ? "s" : ""}, {totalLevels} level{totalLevels !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className={s.flowContainer}>
        <div className={s.flowHeader}><BsDiagram3 size={14} style={{ color: DS.primary }} /> Approval Flow</div>
        <div className={s.flowBody}><ApprovalFlowGraph stages={stages} getApproverDisplayInfo={getApproverDisplayInfo} /></div>
      </div>
      <div className={s.infoBanner}>
        <BsCheckCircleFill size={18} style={{ color: DS.secondary, flexShrink: 0 }} />
        <p>Once saved, this workflow will apply to the <strong>{processName}</strong> process for this business unit.</p>
      </div>
    </div>
  );
};

export default StepReviewSave;
