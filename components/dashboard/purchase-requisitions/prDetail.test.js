import { approvalRows, headerProgress, nowWithLabel } from "./prDetail";
import { errorBody, errorStatus } from "./prFormat";

const pr = (over = {}) => ({ status: "draft", raised_by: 7, raised_by_name: "Asha Rao", now_with: "You", ...over });

describe("nowWithLabel (R34)", () => {
  test("draft / returned: 'You' only for the requester", () => {
    expect(nowWithLabel(pr(), 7)).toBe("You");
    expect(nowWithLabel(pr(), "7")).toBe("You");
    expect(nowWithLabel(pr({ status: "returned" }), 7)).toBe("You");
  });
  test("draft / returned: everyone else sees the requester's name", () => {
    expect(nowWithLabel(pr(), 8)).toBe("Asha Rao (requester)");
    expect(nowWithLabel(pr({ status: "returned" }), 8)).toBe("Asha Rao (requester)");
    expect(nowWithLabel(pr({ raised_by_name: null }), 8)).toBe("The requester");
  });
  test("an unknown viewer is never told it is with them", () => {
    expect(nowWithLabel(pr(), null)).toBe("Asha Rao (requester)");
    expect(nowWithLabel(pr(), undefined)).toBe("Asha Rao (requester)");
  });
  test("other statuses use the server's label", () => {
    expect(nowWithLabel(pr({ status: "pending_approval", now_with: "Approval step 1: Hari" }), 7)).toBe("Approval step 1: Hari");
    expect(nowWithLabel(pr({ status: "rejected", now_with: null }), 7)).toBeNull();
  });
});

describe("headerProgress", () => {
  const lines = [{ progress: "in_sourcing" }, { progress: "in_pool" }];
  test("uses the server's header_progress when present, even null", () => {
    expect(headerProgress(pr({ status: "approved", header_progress: "ordered" }), lines)).toBe("ordered");
    expect(headerProgress(pr({ status: "approved", header_progress: null }), lines)).toBeNull();
  });
  test("falls back to the list rule when the server does not send it", () => {
    expect(headerProgress(pr({ status: "approved" }), lines)).toBe("partly_in_sourcing");
    expect(headerProgress(pr({ status: "pending_approval" }), lines)).toBeNull();
  });
});

describe("approvalRows", () => {
  const step = (n, extra = {}) => ({ id: 3000 + n, step_order: n, status: "PENDING", approvers: [], ...extra });
  const approval = (steps, skipped) => ({
    id: 900, status: "PENDING", current_step: 1, total_steps: steps.length, steps,
    metadata: { approval_diagnostics: { skipped_steps: skipped } },
  });
  const started = (map) => [{ id: 1, event_type: "approval_started", payload: { instance_id: 900, steps: map } }];
  const keys = (rows) => rows.map((r) => r.key);

  test("maps each real step to its policy order", () => {
    const rows = approvalRows(
      approval([step(1), step(2)], [{ step_order: 2, reason: "below_threshold", min_amount: "100000.00" }]),
      started([{ step_order: 1, policy_step_order: 1 }, { step_order: 2, policy_step_order: 3 }]),
    );
    expect(keys(rows)).toEqual(["step-1", "skip-2", "step-2"]);
  });

  test("falls back only for the steps the event does not map (a step added mid-flight)", () => {
    // Step 1 is policy step 3 (after the skipped policy step 2). An all-or-nothing
    // fallback would wrongly put it in slot 1, ahead of the skipped step.
    const rows = approvalRows(
      approval([step(1), step(2, { added_mid_flight: true })], [{ step_order: 2, reason: "below_threshold", min_amount: "5.00" }]),
      started([{ step_order: 1, policy_step_order: 3 }]),
    );
    expect(keys(rows)).toEqual(["skip-2", "step-1", "step-2"]);
  });

  test("an unmapped step never jumps ahead of a later mapped one", () => {
    const rows = approvalRows(
      approval([step(1), step(2)], [{ step_order: 1, reason: "sod_self" }, { step_order: 2, reason: "sod_self" }]),
      started([{ step_order: 2, policy_step_order: 3 }]),
    );
    expect(keys(rows)).toEqual(["skip-1", "skip-2", "step-1", "step-2"]);
  });

  test("without the event, real steps fill the slots the skipped ones left", () => {
    const rows = approvalRows(approval([step(1), step(2)], [{ step_order: 2, reason: "below_threshold", min_amount: "5.00" }]), []);
    expect(keys(rows)).toEqual(["step-1", "skip-2", "step-2"]);
  });

  test("ignores an approval_started event of another instance", () => {
    const events = [{ id: 1, event_type: "approval_started", payload: { instance_id: 111, steps: [{ step_order: 1, policy_step_order: 9 }] } }];
    const rows = approvalRows(approval([step(1)], [{ step_order: 2, reason: "sod_self" }]), events);
    expect(keys(rows)).toEqual(["step-1", "skip-2"]);
  });
});

describe("errorBody / errorStatus", () => {
  const axiosErr = (status, data) => ({ isAxiosError: true, response: { status, data } });
  test("read the body and HTTP status whether or not the service wrapped the error", () => {
    const e = axiosErr(409, { code: "PR_STATE_CONFLICT" });
    expect(errorBody(e)).toEqual({ code: "PR_STATE_CONFLICT" });
    expect(errorBody({ message: e })).toEqual({ code: "PR_STATE_CONFLICT" });
    expect(errorStatus(e)).toBe(409);
    expect(errorStatus({ message: e })).toBe(409);
    expect(errorStatus(new Error("x"))).toBeNull();
  });
});
