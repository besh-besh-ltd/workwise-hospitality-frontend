import { renderHook, waitFor } from "@testing-library/react";
import { useTechEvalWorkflow } from "./useTechEvalWorkflow";
import { getTechEvalStatus } from "@/services/rfq";
import { TECH_EVAL_WORKFLOW_STATES } from "@/utils/constants/techEvalWorkflow";

jest.mock("@/services/rfq", () => ({ getTechEvalStatus: jest.fn() }));

const blockedRoundOne = {
  tech_evaluation_id: 1,
  current_round: 1,
  blocked_insufficient_vendors: true,
  total_passed_verified: 0,
  required_passed_vendors: 5,
  rounds: [{ status: "APPROVED" }],
  vendors: { selected: [{}, {}], passed_verified: [], failed_verified: [{}, {}], pending_evaluation: [] },
};

const load = async (payload) => {
  getTechEvalStatus.mockResolvedValue({ data: { data: payload } });
  const hook = renderHook(() => useTechEvalWorkflow({ rfq_product_id: 10 }));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook.result.current;
};

describe("useTechEvalWorkflow stuck / reopened", () => {
  it("old backend: blocked with nobody passed is stuck, state unchanged", async () => {
    const r = await load({ ...blockedRoundOne, is_complete: true });
    expect(r.isStuck).toBe(true);
    expect(r.reopened).toBe(false);
    expect(r.workflowState).toBe(TECH_EVAL_WORKFLOW_STATES.COMPLETED);
  });

  it("reopened eval is not COMPLETED even though every earlier vendor has a verdict", async () => {
    const r = await load({
      ...blockedRoundOne, is_complete: false, reopened: true, is_stuck: false,
      bid_window_open: false, eligible_unscored_vendors: [{ vendor_id: 738, vendor_name: "V738" }],
    });
    expect(r.workflowState).toBe(TECH_EVAL_WORKFLOW_STATES.EVALUATING);
    expect(r.isStuck).toBe(false);
    expect(r.eligibleUnscoredVendors).toHaveLength(1);
    expect(r.bidWindowOpen).toBe(false);
  });

  it("new backend is_stuck false suppresses the stuck banner while the window is open", async () => {
    const r = await load({ ...blockedRoundOne, is_complete: false, reopened: true, is_stuck: false, bid_window_open: true });
    expect(r.isStuck).toBe(false);
    expect(r.bidWindowOpen).toBe(true);
  });

  const l2 = {
    ...blockedRoundOne, is_complete: true, reopened: false, is_stuck: false,
    bid_window_open: false, eligible_unscored_vendors: [{ vendor_id: 738, vendor_name: "V738" }],
  };

  it("L2: locked-before-reopen-rule eval with eligible unscored vendors and closed window is EVALUATING", async () => {
    const r = await load(l2);
    expect(r.workflowState).toBe(TECH_EVAL_WORKFLOW_STATES.EVALUATING);
  });

  it("L2 with an empty eligible list stays COMPLETED", async () => {
    const r = await load({ ...l2, eligible_unscored_vendors: [] });
    expect(r.workflowState).toBe(TECH_EVAL_WORKFLOW_STATES.COMPLETED);
  });

  it("is_complete with the new fields absent stays COMPLETED", async () => {
    const r = await load({ ...blockedRoundOne, is_complete: true });
    expect(r.workflowState).toBe(TECH_EVAL_WORKFLOW_STATES.COMPLETED);
  });

  it("eligible vendors but window still open stays COMPLETED", async () => {
    const r = await load({ ...l2, bid_window_open: true });
    expect(r.workflowState).toBe(TECH_EVAL_WORKFLOW_STATES.COMPLETED);
  });
});
