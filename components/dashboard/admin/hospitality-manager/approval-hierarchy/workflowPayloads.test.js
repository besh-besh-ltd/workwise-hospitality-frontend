// Approval workflow wizard — what each workflow type saves.
//
// RFQ / Tender workflows belong to a process at one business unit. The ARC
// workflow is process-free at one business unit. The GROUP ARC workflow is
// process-free and COMPANY-WIDE (hotel_id null): one approval hierarchy governs
// every group rate contract in the company, whichever hotel leads it.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import { buildWorkflowStagePayloads } from "./workflowPayloads";
import { FLOW_TYPE } from "./constants";

const step = (id) => ({ approver_source_type: "USER", approver_source_id: id, decision_rule: "ANY" });

describe("buildWorkflowStagePayloads", () => {
  test("a Group ARC workflow saves company-wide, process-free policies of the group types", () => {
    const { payloads, toDelete } = buildWorkflowStagePayloads({
      flowType: FLOW_TYPE.ARC_GROUP,
      stages: [
        { entity_type: "ARC_GROUP", steps: [step(7)] },
        { entity_type: "ARC_GROUP_TECH", steps: [] },
        { entity_type: "ARC_GROUP_COMMITTEE", steps: [step(8), step(9)] },
      ],
      editingPolicies: [],
      companyId: "4",
      hotelId: "12",
      processId: 55,
    });
    expect(toDelete).toEqual([]);
    expect(payloads).toEqual([
      expect.objectContaining({ entity_type: "ARC_GROUP", hospitality_company_id: 4, hotel_id: null, process_id: null, department_id: null }),
      expect.objectContaining({ entity_type: "ARC_GROUP_COMMITTEE", hotel_id: null, process_id: null }),
    ]);
    expect(payloads[1].steps.map((s) => s.step_order)).toEqual([1, 2]);
  });

  test("clearing an optional group stage deletes its saved policy; the base stage is always saved", () => {
    const { payloads, toDelete } = buildWorkflowStagePayloads({
      flowType: FLOW_TYPE.ARC_GROUP,
      stages: [
        { entity_type: "ARC_GROUP", steps: [step(7)] },
        { entity_type: "ARC_GROUP_TECH", steps: [] },
      ],
      editingPolicies: [{ id: 91, entity_type: "ARC_GROUP" }, { id: 92, entity_type: "ARC_GROUP_TECH" }],
      companyId: 4,
      hotelId: 12,
    });
    expect(toDelete).toEqual([92]);
    expect(payloads).toEqual([expect.objectContaining({ id: 91, entity_type: "ARC_GROUP" })]);
  });

  test("a single-hotel ARC workflow still saves against the business unit", () => {
    const { payloads } = buildWorkflowStagePayloads({
      flowType: FLOW_TYPE.ARC,
      stages: [{ entity_type: "ARC", steps: [step(7)] }],
      editingPolicies: [],
      companyId: 4,
      hotelId: "12",
      processId: 55,
    });
    expect(payloads[0]).toMatchObject({ entity_type: "ARC", hotel_id: 12, process_id: null });
  });

  test("a process workflow keeps its process and business unit, and saves empty stages", () => {
    const { payloads } = buildWorkflowStagePayloads({
      flowType: FLOW_TYPE.PROCESS,
      stages: [{ entity_type: "RFQ", steps: [step(7)] }, { entity_type: "TECHNICAL", steps: [] }],
      editingPolicies: [],
      companyId: 4,
      hotelId: 12,
      processId: 55,
    });
    expect(payloads.map((p) => [p.entity_type, p.hotel_id, p.process_id])).toEqual([
      ["RFQ", 12, 55],
      ["TECHNICAL", 12, 55],
    ]);
  });
});
