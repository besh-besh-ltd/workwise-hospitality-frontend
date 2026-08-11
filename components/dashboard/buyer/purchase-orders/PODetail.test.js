// PODetail — the five things a buyer complained about on /purchase-orders/29.
//
// 1. A "Send back" button that had no onClick at all. There is no PO send-back
//    endpoint anywhere in the codebase; the control was decoration.
// 2. Reject demanded a reason it never showed you: the top-right Reject read
//    the aside's comment textarea, which is not on screen next to it, so the
//    click produced a toast pointing at a field the user could not see.
// 3. The same Reject action was white-on-black in the aside and danger-red in
//    the header.
// 4. The audit trail named ONE person per level and captioned it "7 approvers".
//    A level where 1 of 7 had approved looked identical to a level where one
//    approver had been removed and six were never asked to act.
// 5. Only the Amount column was totalled; Qty / Unit price / GST % ended in
//    blank cells.
//
// Fixtures are the real record: PO 29 (#108194), instance 253, L1 ANY / 1
// approver, L2 ALL / 1, L3 ALL / 7 with one approved, and one KEYBOARD line
// (58 @ ₹500, GST 0%, ₹29,000 + ₹2,900 other + ₹1,595 global = ₹33,495).

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "29" },
    asPath: "/dashboard/buyer/purchase-orders/29",
    pathname: "/dashboard/buyer/purchase-orders/[id]",
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 408, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canApprove: true,
    loading: false,
  }),
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(() => Promise.resolve({ message: "PO rejected · vendor notified" })),
  handlePOInitialization: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODetailFull, handlePOApproval } from "@/services/po";
import { previewTotals } from "@/services/pricing";
import { toast } from "react-toastify";
import PODetail from "./PODetail";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const approver = (over = {}) => ({
  user_id: 407,
  name: "Siddharth Kothari",
  designation: null,
  department: null,
  status: "PENDING",
  acted_at: null,
  comment: null,
  removed_at: null,
  removal_reason: null,
  added_mid_flight: false,
  ...over,
});

// L3 as it actually stands on instance 253: ALL rule, 7 approvers, one of them
// (Vineet I) has approved, the step is still open.
const L3_APPROVERS = [
  approver({ user_id: 408, name: "Vineet I", status: "APPROVED", acted_at: "2026-07-02T09:30:00.000Z", effective_status: "APPROVED" }),
  approver({ user_id: 407, name: "Siddharth Kothari", effective_status: "PENDING" }),
  approver({ user_id: 412, name: "Vineet II", effective_status: "PENDING" }),
  approver({ user_id: 424, name: "Sarvesh", effective_status: "PENDING" }),
  approver({ user_id: 426, name: "Kushal Shah", effective_status: "PENDING" }),
  approver({ user_id: 435, name: "Vineet III", effective_status: "PENDING" }),
  approver({ user_id: 436, name: "QA-Vineet", effective_status: "PENDING" }),
];

const WORKFLOW_NEW = [
  { step: 1, status: "done", title: "PO created", by: "Prashant Joshi", when: "2026-07-01T05:00:00.000Z", policy: null },
  { step: 2, status: "done", title: "PO initiated", by: "Prashant Joshi", when: "2026-07-01T05:05:00.000Z", policy: null },
  {
    step: 3,
    status: "done",
    title: "L1 approval",
    by: "Vineet I",
    when: "2026-07-01T06:00:00.000Z",
    policy: null,
    level: 1,
    decision_rule: "ANY",
    approvers: [approver({ user_id: 408, name: "Vineet I", status: "APPROVED", acted_at: "2026-07-01T06:00:00.000Z", effective_status: "APPROVED" })],
    approver_summary: { total_active: 1, approved: 1, rejected: 0, pending: 0, removed: 0 },
    step_added_mid_flight: false,
    step_removed_mid_flight: false,
  },
  {
    step: 4,
    status: "done",
    title: "L2 approval",
    by: "Vineet II",
    when: "2026-07-01T07:00:00.000Z",
    policy: null,
    level: 2,
    decision_rule: "ALL",
    approvers: [approver({ user_id: 412, name: "Vineet II", status: "APPROVED", acted_at: "2026-07-01T07:00:00.000Z", effective_status: "APPROVED" })],
    approver_summary: { total_active: 1, approved: 1, rejected: 0, pending: 0, removed: 0 },
    step_added_mid_flight: false,
    step_removed_mid_flight: false,
  },
  {
    step: 5,
    status: "current",
    title: "L3 approval",
    by: "Vineet I",
    when: null,
    policy: "7 approvers",
    level: 3,
    decision_rule: "ALL",
    approvers: L3_APPROVERS,
    approver_summary: { total_active: 7, approved: 1, rejected: 0, pending: 6, removed: 0 },
    step_added_mid_flight: false,
    step_removed_mid_flight: false,
  },
];

// Exactly what the backend sends TODAY — no level / decision_rule / approvers.
const WORKFLOW_OLD = WORKFLOW_NEW.map(({ level, decision_rule, approvers, approver_summary, step_added_mid_flight, step_removed_mid_flight, ...rest }) => rest);

const KEYBOARD = { name: "KEYBOARD", quantity: 58, unit_price: 500, gst: 0, unit: "nos", charges_meta: { other_charges: [{ name: "Freight", amount: 2900, amount_mode: "fixed" }] } };

const po = (over = {}) => ({
  id: 29,
  po_number: "108194",
  status: "pending",
  status_label: "Pending approval",
  awaiting_me: true,
  current_step_label: "L3",
  current_approvers: [{ name: "Siddharth Kothari" }],
  total_value: 33495,
  pricing: { total: 33495 },
  vendor: { name: "NovaTech Hospitality Solutions" },
  rfq: { number: "535789", id: 235 },
  items: [KEYBOARD],
  workflow: WORKFLOW_NEW,
  docs: [],
  comparison: [],
  payment_terms: [],
  tech_eval: [],
  key_dates: [],
  activity: [],
  decision_checks: [],
  global_charges: [{ name: "Handling", amount: 1595, mode: "fixed" }],
  ...over,
});

const previewFor = (lines, globalTotal = 1595, globalCharges = [{ name: "Handling", amount: 1595, mode: "fixed", additional_tax: 0 }]) => ({
  lines,
  global_charges: globalCharges,
  global_charges_total: globalTotal,
});

const PO29_PREVIEW = previewFor([
  { base: 29000, base_tax: 0, charges_total: 2900, charges: [{ name: "Freight", amount: 2900, tax: 0 }] },
]);

const mount = async (overrides = {}, preview = PO29_PREVIEW) => {
  getPODetailFull.mockResolvedValue(po(overrides));
  previewTotals.mockResolvedValue(preview);
  const utils = render(<PODetail id="29" />);
  await screen.findByText("Items & pricing");
  return utils;
};

/* Read a <tfoot> row by its leftmost label, as a list of cell texts. */
const footCells = (label) => {
  const row = Array.from(document.querySelectorAll("tfoot tr")).find(
    (tr) => tr.cells[0] && tr.cells[0].textContent.trim() === label
  );
  if (!row) throw new Error(`no tfoot row labelled "${label}"`);
  return Array.from(row.cells).map((c) => c.textContent.trim());
};

/* The audit-trail step whose title matches. */
const trailStep = (title) => screen.getByText(title).closest("div[class*='wfStep']");
/* Just the approver roster inside that step — scoped so per-approver status
   chips can't be confused with the step's own right-hand chip. */
const rosterOf = (title) => trailStep(title).querySelector("div[class~='roster']");

beforeEach(() => {
  jest.clearAllMocks();
  handlePOApproval.mockResolvedValue({ message: "PO rejected · vendor notified" });
});

/* ── 2a — the dead Send back control ────────────────────────────────────── */

describe("Send back", () => {
  it("is gone from the header actions", async () => {
    await mount();
    expect(screen.queryByRole("button", { name: /send back/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/send back/i)).not.toBeInTheDocument();
  });

  it("does not take the Reject or Approve buttons with it", async () => {
    await mount();
    expect(screen.getAllByRole("button", { name: /^Reject$/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Approve PO/ })).toBeInTheDocument();
  });
});

/* ── 2b — Reject asks for its reason where you clicked ──────────────────── */

describe("Reject confirmation", () => {
  it("opens the modal instead of submitting when Reject is clicked", async () => {
    await mount();
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);

    expect(await screen.findByText("Reject this purchase order?")).toBeInTheDocument();
    expect(handlePOApproval).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("spells out the consequence — vendor notified, cannot be undone", async () => {
    await mount();
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);
    await screen.findByText("Reject this purchase order?");

    const body = document.body.textContent;
    expect(body).toMatch(/NovaTech Hospitality Solutions will be notified/);
    expect(body).toMatch(/cannot be undone/i);
  });

  // ConfirmationModal renders `description` through dangerouslySetInnerHTML.
  // Every other call site on that prop interpolates buyer-authored text; this
  // page is the first to interpolate a VENDOR-authored string (a vendor types
  // their own company name), which without escaping is a stored-XSS path from a
  // vendor into a buyer's browser. The modal is shared by ~37 call sites and is
  // not ours to change, so the escaping is done on this side of the prop.
  it("renders a vendor name containing markup as text, never as an element", async () => {
    const evil = '<img src=x onerror="window.__xss=1">Nova & Sons';
    await mount({ vendor: { name: evil } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);
    await screen.findByText("Reject this purchase order?");

    const desc = document.querySelector("p[class~='desc']");
    expect(desc).not.toBeNull();
    // The payload never becomes a node — not in the modal, not anywhere else
    // on the page (the hero and vendor card render the same string as JSX).
    expect(desc.querySelector("img")).toBeNull();
    expect(document.querySelectorAll("img")).toHaveLength(0);
    expect(window.__xss).toBeUndefined();
    // …and it is still shown, verbatim, as the text it is.
    expect(desc.textContent).toContain(`${evil} will be notified`);
  });

  it("keeps confirm disabled until a reason is typed", async () => {
    await mount();
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);
    await screen.findByText("Reject this purchase order?");

    const confirm = screen.getByRole("button", { name: "Reject PO" });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Why is this PO being rejected/), {
      target: { value: "Rate above the approved budget" },
    });
    expect(confirm).toBeEnabled();
  });

  it("submits the modal's reason as the rejection remark", async () => {
    await mount();
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);
    await screen.findByText("Reject this purchase order?");

    fireEvent.change(screen.getByPlaceholderText(/Why is this PO being rejected/), {
      target: { value: "Rate above the approved budget" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));

    await waitFor(() => expect(handlePOApproval).toHaveBeenCalledTimes(1));
    expect(handlePOApproval).toHaveBeenCalledWith("29", {
      decision: "rejected",
      type: "approval",
      remarks: "Rate above the approved budget",
    });
  });

  it("closes without submitting on Cancel", async () => {
    await mount();
    fireEvent.click(screen.getAllByRole("button", { name: /^Reject$/ })[0]);
    await screen.findByText("Reject this purchase order?");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Reject this purchase order?")).not.toBeInTheDocument());
    expect(handlePOApproval).not.toHaveBeenCalled();
  });

  it("leaves Approve submitting directly — it is not gated behind the modal", async () => {
    await mount();
    fireEvent.click(screen.getByRole("button", { name: /Approve PO/ }));
    await waitFor(() => expect(handlePOApproval).toHaveBeenCalledTimes(1));
    expect(handlePOApproval.mock.calls[0][1].decision).toBe("approved");
  });
});

/* ── 2c — one Reject action, one theme ──────────────────────────────────── */

describe("Reject button theming", () => {
  it("renders both Reject controls in the danger theme", async () => {
    await mount();
    const buttons = screen.getAllByRole("button", { name: /^Reject$/ });
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => {
      expect(b.className).toContain("btnDangerStrong");
      expect(b.className).not.toContain("btnSecondary");
    });
  });

  it("routes the aside's Reject through the same modal", async () => {
    await mount();
    const asideReject = screen.getAllByRole("button", { name: /^Reject$/ })[1];
    fireEvent.click(asideReject);

    expect(await screen.findByText("Reject this purchase order?")).toBeInTheDocument();
    expect(handlePOApproval).not.toHaveBeenCalled();
  });
});

/* ── 2d — the audit trail names everybody ───────────────────────────────── */

describe("Audit trail roster", () => {
  it("names all seven approvers on L3, not just one", async () => {
    await mount();
    const l3 = trailStep("L3 approval");
    ["Vineet I", "Siddharth Kothari", "Vineet II", "Sarvesh", "Kushal Shah", "Vineet III", "QA-Vineet"].forEach((n) => {
      expect(within(l3).getByText(n)).toBeInTheDocument();
    });
  });

  it("gives each approver their own status and the time they acted", async () => {
    await mount();
    const roster = rosterOf("L3 approval");
    expect(within(roster).getAllByText("Approved")).toHaveLength(1);
    expect(within(roster).getAllByText("Awaiting")).toHaveLength(6);
    // Vineet I's approval carries its timestamp; nobody else has one.
    expect(within(roster).getAllByText(/02 Jul 2026/)).toHaveLength(1);
  });

  it("states the decision rule and the state fraction on the level", async () => {
    await mount();
    const l3 = trailStep("L3 approval");
    expect(within(l3).getByText("All must approve")).toBeInTheDocument();
    expect(within(l3).getByText(/1 of 7 approved/)).toBeInTheDocument();
    expect(within(l3).getByText(/6 awaiting/)).toBeInTheDocument();
    // The bare "7 approvers" caption is replaced, not duplicated.
    expect(within(l3).queryByText("7 approvers")).not.toBeInTheDocument();
  });

  it("distinguishes 'never had to act' from 'still owes an action' under ANY", async () => {
    // A closed ANY level: one approved, the other six are stored as PENDING
    // forever. Calling those six "pending" is the lie the user reported.
    const anyLevel = {
      ...WORKFLOW_NEW[4],
      status: "done",
      decision_rule: "ANY",
      when: "2026-07-02T09:30:00.000Z",
      approvers: L3_APPROVERS.map((a) =>
        a.status === "APPROVED" ? a : { ...a, effective_status: "NOT_REQUIRED" }
      ),
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), anyLevel] });

    const roster = rosterOf("L3 approval");
    expect(within(roster).getByText("Any one approves")).toBeInTheDocument();
    expect(within(roster).getAllByText("Not required")).toHaveLength(6);
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
    expect(within(roster).getAllByText(/cleared by Vineet I/).length).toBe(6);
    expect(within(roster).getByText(/6 not required/)).toBeInTheDocument();
  });

  it("derives 'not required' itself when the backend sends no effective_status", async () => {
    // Deploy skew: FE ships before the BE field exists. The six leftover
    // PENDING rows must still not read as outstanding actions.
    const anyLevel = {
      ...WORKFLOW_NEW[4],
      status: "done",
      decision_rule: "ANY",
      approvers: L3_APPROVERS.map(({ effective_status, ...a }) => a),
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), anyLevel] });

    const roster = rosterOf("L3 approval");
    expect(within(roster).getAllByText("Not required")).toHaveLength(6);
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
  });

  it("marks approvers the step never reached on a rejected level", async () => {
    const rejected = {
      ...WORKFLOW_NEW[4],
      status: "rejected",
      reason: "Budget exceeded",
      approvers: [
        approver({ user_id: 408, name: "Vineet I", status: "REJECTED", acted_at: "2026-07-02T09:30:00.000Z", comment: "Budget exceeded", effective_status: "REJECTED" }),
        approver({ user_id: 407, name: "Siddharth Kothari", effective_status: "NOT_REACHED" }),
        approver({ user_id: 412, name: "Vineet II", effective_status: "NOT_REACHED" }),
      ],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), rejected] });

    const roster = rosterOf("L3 approval");
    expect(within(roster).getByText("Rejected")).toBeInTheDocument();
    expect(within(roster).getAllByText("Not reached")).toHaveLength(2);
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
    expect(within(roster).getByText(/2 not reached/)).toBeInTheDocument();
    // The reason shows once, attributed to the person who gave it — not twice,
    // once unattributed at step level and once on the roster row.
    const reasons = within(trailStep("L3 approval")).getAllByText(/Budget exceeded/);
    expect(reasons).toHaveLength(1);
    expect(reasons[0].closest("div[class~='rosterRow']")).toContainElement(
      within(roster).getByText("Vineet I")
    );
  });

  it("keeps the step-level reason when the roster carries no comment", async () => {
    const rejected = {
      ...WORKFLOW_NEW[4],
      status: "rejected",
      reason: "Budget exceeded",
      approvers: [
        approver({ user_id: 408, name: "Vineet I", status: "REJECTED", acted_at: "2026-07-02T09:30:00.000Z", effective_status: "REJECTED" }),
      ],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), rejected] });
    expect(within(trailStep("L3 approval")).getByText(/Reason: “Budget exceeded”/)).toBeInTheDocument();
  });

  it("shows a removed approver with why and when, and excludes them from the count", async () => {
    const withRemoved = {
      ...WORKFLOW_NEW[4],
      approvers: [
        approver({ user_id: 408, name: "Vineet I", status: "APPROVED", acted_at: "2026-07-02T09:30:00.000Z", effective_status: "APPROVED" }),
        approver({ user_id: 407, name: "Siddharth Kothari", effective_status: "PENDING" }),
        approver({
          user_id: 426,
          name: "Kushal Shah",
          status: "REMOVED",
          effective_status: "REMOVED",
          removed_at: "2026-07-03T04:00:00.000Z",
          removal_reason: "role_removed",
        }),
      ],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), withRemoved] });

    const l3 = trailStep("L3 approval");
    // Named, with the mapped reason and the removal time — not silently dropped.
    expect(within(l3).getByText("Kushal Shah")).toBeInTheDocument();
    expect(within(l3).getByText(/Removed · Role Change/)).toBeInTheDocument();
    expect(within(l3).getByText(/03 Jul 2026/)).toBeInTheDocument();
    // …and out of every total: 2 active, not 3.
    expect(within(l3).getByText(/1 of 2 approved/)).toBeInTheDocument();
    expect(within(l3).getByText(/1 removed/)).toBeInTheDocument();
    // Never reads as live.
    expect(within(l3).queryByText("Kushal Shah").className).not.toContain("rsPending");
  });

  it("labels approvers added mid-flight", async () => {
    const withAdded = {
      ...WORKFLOW_NEW[4],
      step_added_mid_flight: true,
      approvers: [approver({ user_id: 440, name: "Late Arrival", added_mid_flight: true, effective_status: "PENDING" })],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), withAdded] });

    const l3 = trailStep("L3 approval");
    expect(within(l3).getByText("Added mid-flight")).toBeInTheDocument();
    expect(within(l3).getByText("Level added mid-flight")).toBeInTheDocument();
  });

  it("collapses a very long roster but keeps the state summary visible", async () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      approver({ user_id: 900 + i, name: `Approver ${i + 1}`, effective_status: "PENDING" })
    );
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), { ...WORKFLOW_NEW[4], approvers: many }] });

    const l3 = trailStep("L3 approval");
    expect(within(l3).getByText(/0 of 20 approved/)).toBeInTheDocument();
    expect(within(l3).queryByText("Approver 20")).not.toBeInTheDocument();

    fireEvent.click(within(l3).getByRole("button", { name: /Show all 20 approvers/ }));
    expect(within(l3).getByText("Approver 20")).toBeInTheDocument();
    expect(within(l3).getByText(/0 of 20 approved/)).toBeInTheDocument();
  });

  it("renders a cancelled step with its own chip, not as pending", async () => {
    // The server derives `effective_status` FROM the step's status, so on a
    // cancelled step every still-PENDING row comes back as NOT_REACHED. Reusing
    // the live-L3 roster verbatim would model a payload the backend cannot
    // produce, and would only prove the client second-guesses the server.
    const cancelled = {
      ...WORKFLOW_NEW[4],
      status: "cancelled",
      approvers: L3_APPROVERS.map((a) =>
        a.status === "PENDING" ? { ...a, effective_status: "NOT_REACHED" } : a
      ),
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), cancelled] });

    const l3 = trailStep("L3 approval");
    expect(l3.className).toContain("wfCancelled");
    expect(within(l3).getByText("Cancelled")).toBeInTheDocument();
    // A cancelled step will never be acted on — nobody on it is "Awaiting",
    // even though the six rows are still literally PENDING in the database.
    const roster = rosterOf("L3 approval");
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
    expect(within(roster).getAllByText("Not reached")).toHaveLength(6);
    // And it drops out of the header fraction on both sides.
    expect(screen.getByText(/4 of 4 done · 1 cancelled step/)).toBeInTheDocument();
  });

  // Deploy skew: the frontend ships before the backend, so the roster arrives
  // with no `effective_status` at all. The local fallback must reach the same
  // answer the server would have — nobody on a cancelled step is "Awaiting".
  it("derives not-reached on a cancelled step when the server sent no effective_status", async () => {
    const cancelled = {
      ...WORKFLOW_NEW[4],
      status: "cancelled",
      approvers: L3_APPROVERS.map(({ effective_status, ...rest }) => rest),
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), cancelled] });

    const roster = rosterOf("L3 approval");
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
    expect(within(roster).getAllByText("Not reached")).toHaveLength(6);
  });

  // The RFQ stage panel (PurchaseOrderStage.effectiveApproverStatus) folds
  // SKIPPED into NOT_REQUIRED. This page had no case for it, so the lookup
  // missed, the PENDING default ran, and the same approver read "Not required"
  // on one page and "Awaiting" on the other — this page claiming someone still
  // owes an action they can no longer take.
  it("labels a SKIPPED approver 'Not required', exactly as the RFQ stage panel does", async () => {
    const withSkipped = {
      ...WORKFLOW_NEW[4],
      approvers: [
        approver({ user_id: 408, name: "Vineet I", status: "APPROVED", acted_at: "2026-07-02T09:30:00.000Z", effective_status: "APPROVED" }),
        approver({ user_id: 426, name: "Kushal Shah", status: "SKIPPED", effective_status: "SKIPPED" }),
      ],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), withSkipped] });

    const roster = rosterOf("L3 approval");
    expect(within(roster).getByText("Not required")).toBeInTheDocument();
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
    expect(within(roster).getByText(/1 not required/)).toBeInTheDocument();
    expect(roster.innerHTML).not.toContain("undefined");
  });

  it("reads a raw SKIPPED status the same way when no effective_status is sent", async () => {
    // Deploy skew in the other direction: the backend normalisation ships after
    // this build. The raw stored value must not come out as "Awaiting" either.
    const withSkipped = {
      ...WORKFLOW_NEW[4],
      approvers: [
        approver({ user_id: 408, name: "Vineet I", status: "APPROVED", acted_at: "2026-07-02T09:30:00.000Z" }),
        approver({ user_id: 426, name: "Kushal Shah", status: "SKIPPED" }),
      ],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), withSkipped] });

    const roster = rosterOf("L3 approval");
    expect(within(roster).getByText("Not required")).toBeInTheDocument();
    expect(within(roster).queryByText("Awaiting")).not.toBeInTheDocument();
    // The stored token is still recoverable — the chip renames it, it does not
    // pretend the database says something else.
    expect(within(roster).getByText("Not required")).toHaveAttribute("title", "Recorded status: SKIPPED");
  });

  it("keeps the safe default for an approver status this build has never heard of", async () => {
    const alien = {
      ...WORKFLOW_NEW[4],
      approvers: [approver({ user_id: 426, name: "Kushal Shah", status: "PENDING", effective_status: "QUANTUM_SUPERPOSITION" })],
    };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), alien] });

    const roster = rosterOf("L3 approval");
    // Still outstanding as far as anyone can tell, and rendered as such — never
    // a blank chip, never `undefined` in a className.
    const chip = within(roster).getByText("Awaiting");
    expect(chip.className).toContain("rsPending");
    expect(chip.className).not.toContain("undefined");
    expect(roster.innerHTML).not.toContain("undefined");
  });

  it("never renders an undefined class or a blank chip for an unknown status", async () => {
    const alien = { ...WORKFLOW_NEW[4], status: "quantum_superposition", approvers: L3_APPROVERS };
    await mount({ workflow: [...WORKFLOW_NEW.slice(0, 4), alien] });

    const l3 = trailStep("L3 approval");
    expect(l3.className).not.toContain("undefined");
    expect(within(l3).getByText("Quantum superposition")).toBeInTheDocument();
  });

  it("still renders against the OLD payload with none of the new fields", async () => {
    await mount({ workflow: WORKFLOW_OLD });

    const l3 = trailStep("L3 approval");
    // Falls straight back to today's single name + policy caption.
    expect(within(l3).getByText("Vineet I")).toBeInTheDocument();
    expect(within(l3).getByText("7 approvers")).toBeInTheDocument();
    expect(within(l3).queryByText("Siddharth Kothari")).not.toBeInTheDocument();
    expect(within(l3).queryByText("All must approve")).not.toBeInTheDocument();
    expect(screen.getByText("4 of 5 done")).toBeInTheDocument();
  });
});

/* ── 2e — every column gets the aggregate that column deserves ──────────── */

describe("Items & pricing totals", () => {
  it("puts the Subtotal label leftmost and totals every column", async () => {
    await mount();
    const cells = footCells("Subtotal");
    // [label(colSpan 2), qty, unit price, gst, amount]
    expect(cells[0]).toBe("Subtotal");
    expect(cells[1]).toBe("58nos");
    expect(cells[2]).toBe("₹500.00 avg");
    expect(cells[3]).toBe("0.00% avg (₹0.00)");
    expect(cells[4]).toBe("₹29,000.00");
  });

  it("puts the Grand total label leftmost and leaves undefinable columns blank", async () => {
    await mount();
    const cells = footCells("Grand total");
    expect(cells[0]).toBe("Grand total");
    expect(cells[1]).toBe("₹33,495.00");
    // Grand total adds charges that carry no qty / rate / line GST.
    expect(cells).toHaveLength(2);
  });

  it("weights the GST average so it reconciles with the Amount total", async () => {
    // 10 × ₹100 @ 18% and 5 × ₹200 @ 5%: base 2,000, tax 230.
    // Summing the GST column would print 23%. The honest figure is 11.50%,
    // which is the only one that turns ₹2,000 into the ₹2,230 subtotal.
    const items = [
      { name: "Widget", quantity: 10, unit_price: 100, gst: 18, unit: "nos" },
      { name: "Gadget", quantity: 5, unit_price: 200, gst: 5, unit: "nos" },
    ];
    await mount(
      { items, pricing: { total: 2230 }, total_value: 2230, global_charges: [] },
      previewFor(
        [
          { base: 1000, base_tax: 180, charges_total: 0, charges: [] },
          { base: 1000, base_tax: 50, charges_total: 0, charges: [] },
        ],
        0,
        []
      )
    );

    const cells = footCells("Subtotal");
    expect(cells[1]).toBe("15nos");
    expect(cells[2]).toBe("₹133.33 avg"); // 2,000 ÷ 15, not 100 + 200
    expect(cells[3]).toBe("11.50% avg (₹230.00)"); // not 23%
    expect(cells[4]).toBe("₹2,230.00");

    // Reconciliation: base × (1 + weighted GST) === the Amount subtotal.
    const base = 15 * 133.3333333;
    expect(Math.round(base * 1.115)).toBe(2230);
  });

  it("drops the unit from the qty total when the lines do not share one", async () => {
    const items = [
      { name: "Widget", quantity: 10, unit_price: 100, gst: 0, unit: "nos" },
      { name: "Cement", quantity: 5, unit_price: 200, gst: 0, unit: "kg" },
    ];
    await mount(
      { items, pricing: { total: 2000 }, total_value: 2000, global_charges: [] },
      previewFor(
        [
          { base: 1000, base_tax: 0, charges_total: 0, charges: [] },
          { base: 1000, base_tax: 0, charges_total: 0, charges: [] },
        ],
        0,
        []
      )
    );

    // Never "15 nos", which would silently claim 5 kg were 5 nos — and the sum
    // says out loud that it is adding up things that are not the same thing.
    expect(footCells("Subtotal")[1]).toBe("15 mixed units");
  });

  it("prints no average rate at all when the lines are measured in different units", async () => {
    // PO 31, live on stage: 45.799 nos @ ₹150 · 566 pieces @ ₹10 · 13 cm @ ₹250.
    // ₹15,779.85 ÷ 624.799 "units" printed "₹25.26 avg" — a rate lower than
    // every number in the column above it, because the divisor adds nos to
    // pieces to cm. Dropping the unit LABEL fixed the caption and kept the lie.
    const items = [
      { name: "Bolt", quantity: 45.799, unit_price: 150, gst: 0, unit: "nos" },
      { name: "Tile", quantity: 566, unit_price: 10, gst: 0, unit: "pieces" },
      { name: "Trim", quantity: 13, unit_price: 250, gst: 0, unit: "cm" },
    ];
    await mount(
      { items, pricing: { total: 15779.85 }, total_value: 15779.85, global_charges: [] },
      previewFor(
        [
          { base: 6869.85, base_tax: 0, charges_total: 0, charges: [] },
          { base: 5660, base_tax: 0, charges_total: 0, charges: [] },
          { base: 3250, base_tax: 0, charges_total: 0, charges: [] },
        ],
        0,
        []
      )
    );

    const cells = footCells("Subtotal");
    // The per-column total the user asked for survives — flagged for what it is.
    expect(cells[1]).toBe("624.799 mixed units");
    // …and the cell that would have divided rupees by it is empty, like the
    // Grand total row's. A blank beats a rate per nothing.
    expect(cells[2]).toBe("");
    expect(document.body.textContent).not.toMatch(/25\.26/);
    // The Amount column still totals, and GST% — tax ÷ base, dimensionless —
    // is unaffected by any of this.
    expect(cells[4]).toBe("₹15,779.85");
  });

  it("still prints the average rate when every line shares a unit", async () => {
    const items = [
      { name: "Widget", quantity: 10, unit_price: 100, gst: 0, unit: "nos" },
      { name: "Gizmo", quantity: 5, unit_price: 200, gst: 0, unit: "NOS" },
    ];
    await mount(
      { items, pricing: { total: 2000 }, total_value: 2000, global_charges: [] },
      previewFor(
        [
          { base: 1000, base_tax: 0, charges_total: 0, charges: [] },
          { base: 1000, base_tax: 0, charges_total: 0, charges: [] },
        ],
        0,
        []
      )
    );

    const cells = footCells("Subtotal");
    // Case is not a difference in unit — "NOS" and "nos" are the same thing.
    expect(cells[1]).toBe("15nos");
    expect(cells[1]).not.toMatch(/mixed/);
    expect(cells[2]).toBe("₹133.33 avg");
  });

  it("prints the average rate when no line names a unit at all", async () => {
    // An unlabelled column is one unspecified unit, not several. Suppressing
    // the rate here would blank it on every PO whose items carry no `unit`.
    const items = [
      { name: "Widget", quantity: 10, unit_price: 100, gst: 0 },
      { name: "Gizmo", quantity: 5, unit_price: 200, gst: 0 },
    ];
    await mount(
      { items, pricing: { total: 2000 }, total_value: 2000, global_charges: [] },
      previewFor(
        [
          { base: 1000, base_tax: 0, charges_total: 0, charges: [] },
          { base: 1000, base_tax: 0, charges_total: 0, charges: [] },
        ],
        0,
        []
      )
    );

    const cells = footCells("Subtotal");
    expect(cells[1]).toBe("15");
    expect(cells[2]).toBe("₹133.33 avg");
  });

  it("keeps the Other / Global charges accordions working", async () => {
    await mount();
    expect(footCells("Other charges")[1]).toBe("₹2,900.00");
    expect(footCells("Global charges")[1]).toBe("₹1,595.00");

    fireEvent.click(screen.getByText("Other charges"));
    expect(screen.getByText(/KEYBOARD — Freight/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Global charges"));
    expect(screen.getByText("Handling")).toBeInTheDocument();
  });

  it("falls back to item math when the pricing preview is unavailable", async () => {
    getPODetailFull.mockResolvedValue(po());
    previewTotals.mockRejectedValue(new Error("pricing down"));
    render(<PODetail id="29" />);
    await screen.findByText("Items & pricing");

    const cells = footCells("Subtotal");
    expect(cells[1]).toBe("58nos");
    expect(cells[2]).toBe("₹500.00 avg");
    expect(cells[4]).toBe("₹29,000.00");
  });
});

/* ── Documents ──────────────────────────────────────────────────────────────
 *
 * Client report: approvers were rejecting POs for "no documents" while the
 * files sat in two cards at the very bottom of the right-hand aside, below the
 * activity feed and off-screen. The prominent mid-page card showed only the PO
 * pdf / GRN / invoice, so the two surfaces were NOT duplicates — they were
 * different document classes, one of them effectively invisible.
 *
 * The fix consolidates all of them into the one mid-page card, grouped by
 * provenance (the grouping is decided server-side and arrives as
 * document_groups). These tests pin the two things that can regress: every
 * class is reachable from the prominent card, and nothing is left in the aside.
 */
const DOC_GROUPS = [
  {
    key: "po",
    title: "PO documents",
    files: [{ url: "https://s3.test/po-108194.pdf", name: "po-108194.pdf", label: "PO", product: null }],
  },
  {
    key: "rfq",
    title: "RFQ documents (buyer-issued)",
    files: [
      { url: "https://s3.test/terms.pdf", name: "terms.pdf", label: "T&C", product: null },
      { url: "https://s3.test/kb-datasheet.pdf", name: "kb-datasheet.pdf", label: "TDS", product: "KEYBOARD" },
    ],
  },
  {
    key: "vendor_quote",
    title: "Vendor quote documents",
    files: [{ url: "https://s3.test/quote-terms.pdf", name: "quote-terms.pdf", label: "T&C", product: null }],
  },
  {
    key: "technical",
    title: "Technical evaluation documents",
    files: [
      { url: "https://s3.test/clause-brief.pdf", name: "clause-brief.pdf", label: "Buyer clause", product: "KEYBOARD" },
      { url: "https://s3.test/vendor-cert.pdf", name: "vendor-cert.pdf", label: "Vendor response", product: "KEYBOARD" },
    ],
  },
];

/* The documents card, located by its heading's section ancestor. */
const docsCard = () => screen.getByText("Documents & attachments").closest("section");

describe("Documents & attachments", () => {
  it("shows every document class in the one prominent card, under its own heading", async () => {
    await mount({ document_groups: DOC_GROUPS });

    const card = within(docsCard());

    // The four groups an approver has to be able to tell apart.
    expect(card.getByText("PO documents")).toBeInTheDocument();
    expect(card.getByText("RFQ documents (buyer-issued)")).toBeInTheDocument();
    expect(card.getByText("Vendor quote documents")).toBeInTheDocument();
    expect(card.getByText("Technical evaluation documents")).toBeInTheDocument();

    // …and every file inside them, including the vendor-supplied ones that used
    // to be the easiest to miss.
    expect(card.getByText("po-108194.pdf")).toBeInTheDocument();
    expect(card.getByText("kb-datasheet.pdf")).toBeInTheDocument();
    expect(card.getByText("quote-terms.pdf")).toBeInTheDocument();
    expect(card.getByText("vendor-cert.pdf")).toBeInTheDocument();
  });

  it("counts every grouped file in the header pill, not just the PO documents", async () => {
    await mount({ document_groups: DOC_GROUPS });
    expect(within(docsCard()).getByText("6 files")).toBeInTheDocument();
  });

  it("labels each file with its kind and the product it belongs to", async () => {
    await mount({ document_groups: DOC_GROUPS });
    const card = within(docsCard());

    // A datasheet is only meaningful next to the product it describes.
    expect(card.getByText("TDS · KEYBOARD")).toBeInTheDocument();
    // Technical evaluation mixes buyer-issued and vendor-submitted files, so
    // the label — not the group heading — has to say which is which.
    expect(card.getByText("Buyer clause · KEYBOARD")).toBeInTheDocument();
    expect(card.getByText("Vendor response · KEYBOARD")).toBeInTheDocument();
    // An RFQ-level file has no product; the separator must not be left dangling
    // ("T&C · " with nothing after it).
    const rfqTerms = card.getByText("terms.pdf").closest("a");
    expect(within(rfqTerms).getByText("T&C")).toBeInTheDocument();
  });

  it("links each file to its own url", async () => {
    await mount({ document_groups: DOC_GROUPS });
    expect(within(docsCard()).getByText("vendor-cert.pdf").closest("a")).toHaveAttribute(
      "href",
      "https://s3.test/vendor-cert.pdf"
    );
  });

  it("leaves no second documents surface in the aside", async () => {
    await mount({ document_groups: DOC_GROUPS });

    // The two aside cards this consolidation removed. Their headings must not
    // come back — a vendor document shown twice is what started this.
    expect(screen.queryByText("Vendor documents")).not.toBeInTheDocument();
    expect(screen.queryByText("Buyer documents")).not.toBeInTheDocument();

    // Every rendered link to a document lives inside the one card.
    const card = docsCard();
    for (const group of DOC_GROUPS) {
      for (const f of group.files) {
        const links = screen.getAllByText(f.name);
        expect(links).toHaveLength(1);
        expect(card.contains(links[0])).toBe(true);
      }
    }
  });

  // `docs` survives in the payload because the hero's "Download PO" control
  // reads the po-typed entry out of it. It is no longer a rendering source:
  // rendering it here is what produced a second, ungrouped document list.
  it("renders from document_groups only — never from the legacy flat docs array", async () => {
    await mount({
      document_groups: [],
      docs: [{ name: "PO 108194.pdf", type: "po", kind: "po", size: null, url: "https://s3.test/po.pdf" }],
    });

    expect(screen.queryByText("Documents & attachments")).not.toBeInTheDocument();
    expect(screen.queryByText("PO 108194.pdf")).not.toBeInTheDocument();
  });

  it("renders a call-off PO that only has PO documents without empty headings", async () => {
    await mount({ document_groups: [DOC_GROUPS[0]] });
    const card = within(docsCard());

    expect(card.getByText("PO documents")).toBeInTheDocument();
    expect(card.getByText("1 file")).toBeInTheDocument();
    // No heading for a class this PO has nothing in.
    expect(card.queryByText("RFQ documents (buyer-issued)")).not.toBeInTheDocument();
    expect(card.queryByText("Technical evaluation documents")).not.toBeInTheDocument();
  });
});
