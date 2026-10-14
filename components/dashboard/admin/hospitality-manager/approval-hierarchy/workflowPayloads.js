// What the approval workflow wizard saves, per workflow type.
//
//   PROCESS    — RFQ / Tender: tied to a process at this business unit; every
//                stage is saved.
//   ARC        — single-hotel rate contracts: process-free at this business
//                unit; optional stages left empty fall back to the base ARC
//                policy, so they are skipped (and a saved one deleted).
//   PR         — purchase requisitions: process-free, one hotel or company-wide;
//                steps carry an optional min_amount string.
//   ARC_GROUP  — group rate contracts: process-free and COMPANY-WIDE
//                (hotel_id = null), same optional-stage rule with ARC_GROUP as
//                the base.

import { FLOW_TYPE } from "./constants";
import { normalizeMinAmount } from "./minAmount";

const BASE_STAGE = { [FLOW_TYPE.ARC]: "ARC", [FLOW_TYPE.ARC_GROUP]: "ARC_GROUP", [FLOW_TYPE.PR]: "PR" };

// Only PR steps carry a threshold; other flows never send min_amount.
const buildStep = (st, idx, isPr) => {
  const { min_amount: minAmount, ...rest } = st;
  return isPr ? { ...rest, step_order: idx + 1, min_amount: normalizeMinAmount(minAmount) } : { ...rest, step_order: idx + 1 };
};

export function buildWorkflowStagePayloads({ flowType, stages = [], editingPolicies = [], companyId, hotelId, processId = null, companyWide = false }) {
  const processFree = flowType === FLOW_TYPE.ARC || flowType === FLOW_TYPE.ARC_GROUP || flowType === FLOW_TYPE.PR;
  const isPr = flowType === FLOW_TYPE.PR;
  const base = {
    hospitality_company_id: parseInt(companyId),
    hotel_id: flowType === FLOW_TYPE.ARC_GROUP || (isPr && companyWide) ? null : parseInt(hotelId),
    process_id: processFree ? null : processId,
    department_id: null,
    is_master: true,
    is_active: true,
  };
  const policyIdByEntity = {};
  (editingPolicies || []).forEach((p) => { policyIdByEntity[p.entity_type] = p.id; });
  const payloads = [];
  const toDelete = [];
  (stages || []).forEach((stage) => {
    const hasSteps = (stage.steps?.length || 0) > 0;
    const existingId = policyIdByEntity[stage.entity_type];
    if (processFree && !hasSteps && stage.entity_type !== BASE_STAGE[flowType]) {
      if (existingId) toDelete.push(existingId);
      return;
    }
    const payload = { ...base, entity_type: stage.entity_type, steps: (stage.steps || []).map((st, idx) => buildStep(st, idx, isPr)) };
    if (existingId) payload.id = existingId;
    payloads.push(payload);
  });
  return { payloads, toDelete };
}
