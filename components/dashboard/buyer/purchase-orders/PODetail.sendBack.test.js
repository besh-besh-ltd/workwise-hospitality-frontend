// PODetail — approvers ask a named person for information, or reject with a
// reason; the person answers; the history shows as a thread.
//
// The services are mocked at the module boundary; everything else is the real
// page, dialogs and thread.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "605" },
    asPath: "/dashboard/buyer/purchase-orders/605",
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
const mockUser = { id: 125, hospitality_mappings: [{ hospitality_hotel_id: 1 }] };
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: mockUser }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
const mockPerms = { canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false };
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => mockPerms,
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(),
  handlePOInitialization: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/poSendBack", () => ({
  __esModule: true,
  getSendBacks: jest.fn(),
  getSendBackTargets: jest.fn(),
  createSendBack: jest.fn(),
  respondToSendBack: jest.fn(),
  withdrawSendBack: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve(null)),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODetailFull, handlePOApproval } from "@/services/po";
import {
  getSendBacks,
  getSendBackTargets,
  createSendBack,
  respondToSendBack,
  withdrawSendBack,
} from "@/services/poSendBack";
import { toast } from "react-toastify";
import PODetail from "./PODetail";

const TARGETS = {
  targets: [
    { target_role: "RFQ_CREATOR", user: { id: 11, name: "Rhea Rao" }, available: true },
    { target_role: "PO_INITIATOR", user: { id: 12, name: "Pavan Patil" }, available: true },
    { target_role: "COMMERCIAL_EVALUATOR", user: { id: 13, name: "Chitra Chawla" }, available: true },
    {
      target_role: "TECHNICAL_EVALUATOR",
      user: { id: 14, name: "Tara Tiwari" },
      available: false,
      unavailable_reason: "Account is deactivated",
    },
  ],
};

const po = (over = {}) => ({
  id: 605,
  po_number: "138877",
  status: "pending_approval",
  status_label: "Pending Approval",
  awaiting_me: true,
  current_step_label: "L3",
  current_approvers: [{ name: "Vishal Kamat" }],
  total_value: 1555004,
  pricing: { total: 1555004 },
  vendor: { name: "PHILEEIN HOSPITALITY PRIVATE LIMITED" },
  rfq: { number: "536263", id: 719 },
  items: [{ name: "INDUCTION BRATT PAN SS", quantity: 2, unit: "NOS", unit_price: 330000, gst: 18 }],
  workflow: [],
  docs: [],
  comparison: [],
  payment_terms: [],
  tech_eval: [],
  key_dates: [],
  activity: [],
  decision_checks: [],
  ...over,
});

const hold = (over = {}) => ({
  id: 7,
  route: "INFO_REQUEST",
  reason_category: "PRICE_TAX_QUERY",
  comment: "Why is GST 28 percent here?",
  requested_by: { id: 125, name: "Me" },
  target_role: "COMMERCIAL_EVALUATOR",
  target: { id: 13, name: "Chitra Chawla" },
  status: "OPEN",
  response_text: null,
  created_at: "2026-10-20T10:00:00Z",
  files: [],
  ...over,
});

const mount = async (over = {}) => {
  getPODetailFull.mockResolvedValue(po(over));
  const utils = render(<PODetail id="605" />);
  await screen.findByText("Items & pricing");
  await waitFor(() => expect(getSendBacks).toHaveBeenCalled());
  return utils;
};

const pick = (label) => fireEvent.click(screen.getByRole("radio", { name: label }));
const firstBtn = (name) => screen.getAllByRole("button", { name })[0];
const openAsk = async () => {
  fireEvent.click(firstBtn(/^Ask for info$/));
  await screen.findByText("Ask for information");
  await screen.findByRole("radio", { name: /Rhea Rao/ });
};
const openReject = async () => {
  fireEvent.click(firstBtn(/^Reject$/));
  await screen.findByText("Reject this purchase order?");
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockPerms, { canApprove: true });
  mockUser.id = 125;
  getSendBacks.mockResolvedValue([]);
  getSendBackTargets.mockResolvedValue(TARGETS);
  createSendBack.mockResolvedValue({ message: "Sent" });
  respondToSendBack.mockResolvedValue({});
  withdrawSendBack.mockResolvedValue({});
  handlePOApproval.mockResolvedValue({ message: "PO rejected" });
});

describe("who sees Ask for info and Reject", () => {
  it("shows them wherever Approve shows", async () => {
    await mount();
    expect(screen.getAllByRole("button", { name: /^Ask for info$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Reject$/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Approve PO/ })).toBeInTheDocument();
  });

  it("hides them when the viewer cannot approve", async () => {
    mockPerms.canApprove = false;
    await mount();
    expect(screen.queryByRole("button", { name: /^Ask for info$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reject$/ })).not.toBeInTheDocument();
  });

  it("hides them when the PO is not awaiting this viewer", async () => {
    await mount({ awaiting_me: false });
    expect(screen.queryByRole("button", { name: /^Ask for info$/ })).not.toBeInTheDocument();
  });

  it("mirrors Ask for information in the phone action bar", async () => {
    await mount();
    const region = await screen.findByRole("region", { name: "PO decision" });
    expect(within(region).getByRole("button", { name: "Ask for information on purchase order" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Reject purchase order" })).toBeInTheDocument();
  });
});

describe("Ask for info dialog", () => {
  it("fetches the people when it opens and offers the six reasons", async () => {
    await mount();
    await openAsk();
    expect(getSendBackTargets).toHaveBeenCalledWith("605");
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelectorAll('input[name="sendback-reason"]')).toHaveLength(6);
    expect(within(dialog).queryByRole("radio", { name: "Not needed any more" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("radio", { name: "Re-negotiate or change the vendor" })).not.toBeInTheDocument();
  });

  it.each([
    ["Photos or documents missing", /Rhea Rao/],
    ["Need more details or justification", /Rhea Rao/],
    ["Question on price, GST or calculation", /Chitra Chawla/],
    ["Quantity or specification needs a change", /Pavan Patil/],
  ])("%s preselects its default person", async (reason, person) => {
    await mount();
    await openAsk();
    pick(reason);
    expect(screen.getByRole("radio", { name: person })).toBeChecked();
  });

  it("Something else preselects nobody", async () => {
    await mount();
    await openAsk();
    pick("Photos or documents missing");
    pick("Something else");
    screen.getAllByRole("radio", { name: /\(/ }).forEach((r) => expect(r).not.toBeChecked());
  });

  it("shows an unavailable person disabled, with the reason visible", async () => {
    await mount();
    await openAsk();
    expect(screen.getByRole("radio", { name: /Tara Tiwari/ })).toBeDisabled();
    expect(screen.getByText("Account is deactivated")).toBeVisible();
  });

  it("does not preselect an unavailable default (technical question)", async () => {
    await mount();
    await openAsk();
    pick("Question on the technical evaluation");
    screen.getAllByRole("radio", { name: /\(/ }).forEach((r) => expect(r).not.toBeChecked());
  });

  it("states the consequence with the level and the person's name", async () => {
    await mount();
    await openAsk();
    pick("Question on price, GST or calculation");
    expect(
      screen.getByText(
        "The PO waits with you at Level 3. Approvals already given stay. Chitra Chawla gets an email and a notification.",
        { normalizer: (t) => t.replace(/\s+/g, " ").trim() }
      )
    ).toBeInTheDocument();
  });

  it("validates reason, person and message before sending", async () => {
    await mount();
    await openAsk();
    const dialog = screen.getByRole("dialog");
    const send = () => fireEvent.click(within(dialog).getByRole("button", { name: "Ask for info" }));

    send();
    expect(createSendBack).not.toHaveBeenCalled();
    expect(screen.getByText("Choose what this is about.")).toBeInTheDocument();
    expect(screen.getByText("Choose who to ask.")).toBeInTheDocument();
    expect(screen.getByText("Write your question for them.")).toBeInTheDocument();

    pick("Question on price, GST or calculation"); // person defaulted
    send();
    expect(createSendBack).not.toHaveBeenCalled();
    expect(screen.queryByText("Choose who to ask.")).not.toBeInTheDocument();
    expect(screen.getByText("Write your question for them.")).toBeInTheDocument();
  });

  it("sends the question, then reloads the PO and the thread", async () => {
    await mount();
    await openAsk();
    pick("Question on price, GST or calculation");
    fireEvent.change(screen.getByLabelText(/Your question/), { target: { value: " Why 28 percent? " } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Ask for info" }));

    await waitFor(() =>
      expect(createSendBack).toHaveBeenCalledWith("605", {
        target_role: "COMMERCIAL_EVALUATOR",
        reason_category: "PRICE_TAX_QUERY",
        comment: "Why 28 percent?",
        files: [],
      })
    );
    await waitFor(() => expect(getSendBacks).toHaveBeenCalledTimes(2));
    expect(getPODetailFull).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith("Sent");
  });
});

describe("when the people cannot be loaded", () => {
  it("Ask shows an error instead of loading forever, and cannot send", async () => {
    getSendBackTargets.mockRejectedValue(new Error("500"));
    await mount();
    fireEvent.click(firstBtn(/^Ask for info$/));
    await screen.findByText("Couldn't load the people for this PO. Close and try again.");
    expect(screen.queryByText("Loading people…")).not.toBeInTheDocument();
    const send = within(screen.getByRole("dialog")).getByRole("button", { name: "Ask for info" });
    expect(send).toBeDisabled();
    expect(createSendBack).not.toHaveBeenCalled();
  });
});

// The people fetch is guarded like every other action: a stale page (the step
// moved on, the PO went away) gets the server's words, a reload and no dialog.
describe("when the people fetch says the page is stale", () => {
  it("a 409 toasts the server's message, closes the dialog and reloads", async () => {
    getSendBackTargets.mockRejectedValue({
      response: { status: 409, data: { message: "This step is no longer waiting on you.", code: "STEP_NOT_PENDING" } },
    });
    await mount();
    fireEvent.click(firstBtn(/^Ask for info$/));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This step is no longer waiting on you."));
    await waitFor(() => expect(getPODetailFull).toHaveBeenCalledTimes(2));
    expect(getSendBacks).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByText("Ask for information")).not.toBeInTheDocument());
  });

  it("a 404 from the Reject dialog does the same", async () => {
    getSendBackTargets.mockRejectedValue({ response: { status: 404, data: { message: "Purchase order not found." } } });
    await mount();
    fireEvent.click(firstBtn(/^Reject$/));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Purchase order not found."));
    await waitFor(() => expect(getPODetailFull).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Reject this purchase order?")).not.toBeInTheDocument());
  });
});

describe("Reject dialog on the page", () => {
  it("shows the RFQ creator and PO creator names from the targets call", async () => {
    await mount();
    await openReject();
    await waitFor(() => expect(getSendBackTargets).toHaveBeenCalledWith("605"));
    pick("Re-negotiate or change the vendor");
    await screen.findByText(/Rhea Rao, Pavan Patil and the commercial evaluators will be told/);
  });

  it("falls back to role words when the targets call fails", async () => {
    getSendBackTargets.mockRejectedValue(new Error("403"));
    await mount();
    await openReject();
    pick("Re-negotiate or change the vendor");
    expect(
      screen.getByText(/The RFQ creator, the PO creator and the commercial evaluators will be told/)
    ).toBeInTheDocument();
  });

  it("sends the reason, and no route, for a re-award rejection", async () => {
    await mount();
    await openReject();
    pick("Re-negotiate or change the vendor");
    fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "Find another vendor" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    await waitFor(() => expect(handlePOApproval).toHaveBeenCalledTimes(1));
    expect(handlePOApproval).toHaveBeenCalledWith("605", {
      decision: "rejected",
      type: "approval",
      remarks: "Find another vendor",
      reason_category: "RENEGOTIATE",
    });
  });

  it("sends route CANCEL when the reason is Not needed any more", async () => {
    await mount();
    await openReject();
    pick("Not needed any more");
    fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "Event cancelled" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    await waitFor(() => expect(handlePOApproval).toHaveBeenCalledTimes(1));
    expect(handlePOApproval.mock.calls[0][1]).toEqual({
      decision: "rejected",
      type: "approval",
      remarks: "Event cancelled",
      reason_category: "NOT_REQUIRED",
      route: "CANCEL",
    });
  });

  it("the nudge switches to Ask for info with the reason and the comment carried over", async () => {
    await mount();
    await openReject();
    pick("Question on price, GST or calculation");
    fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "GST looks too high" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask for info instead" }));

    await screen.findByText("Ask for information");
    expect(screen.queryByText("Reject this purchase order?")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Question on price, GST or calculation" })).toBeChecked();
    expect(screen.getByLabelText(/Your question/)).toHaveValue("GST looks too high");
    await waitFor(() => expect(screen.getByRole("radio", { name: /Chitra Chawla/ })).toBeChecked());
    expect(handlePOApproval).not.toHaveBeenCalled();
  });
});

describe("while the PO is held", () => {
  it("disables Approve, Ask for info and Reject, with the wait written on the page", async () => {
    getSendBacks.mockResolvedValue([hold()]);
    await mount();
    await screen.findAllByText("Waiting on Chitra Chawla (Commercial evaluator)");
    screen.getAllByRole("button", { name: /^Reject$/ }).forEach((b) => expect(b).toBeDisabled());
    screen.getAllByRole("button", { name: /^Ask for info$/ }).forEach((b) => expect(b).toBeDisabled());
    expect(screen.getByRole("button", { name: /Approve PO/ })).toBeDisabled();
    const region = await screen.findByRole("region", { name: "PO decision" });
    expect(within(region).getByText("Waiting on Chitra Chawla (Commercial evaluator)")).toBeVisible();
    expect(within(region).getByRole("button", { name: "Reject purchase order" })).toBeDisabled();
  });

  // A held PO cannot be approved, so the hero must not tell the step approver
  // it is waiting on them; the hold line says who it is waiting on instead.
  it("drops the hero's 'Waiting on you for approval' and keeps the hold line", async () => {
    getSendBacks.mockResolvedValue([hold()]);
    await mount();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    await within(hero).findByText("Waiting on Chitra Chawla (Commercial evaluator)");
    expect(hero).not.toHaveTextContent(/Waiting on you for approval/);
  });

  it("says the same to a step approver whose roles lack the approve grant", async () => {
    mockPerms.canApprove = false;
    getSendBacks.mockResolvedValue([hold()]);
    await mount();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    await within(hero).findByText("Waiting on Chitra Chawla (Commercial evaluator)");
    expect(hero).not.toHaveTextContent(/Waiting on you for approval/);
  });

  it("keeps 'Waiting on you for approval' when nothing is held", async () => {
    await mount();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero).toHaveTextContent("Waiting on you for approval — review the details and take action.");
    expect(within(hero).queryByText(/Waiting on Chitra/)).not.toBeInTheDocument();
  });

  it("only an OPEN row counts as a hold", async () => {
    getSendBacks.mockResolvedValue([hold({ status: "ANSWERED" })]);
    await mount();
    await screen.findByText("Questions and rejections");
    expect(screen.queryByText(/Waiting on Chitra/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve PO/ })).toBeEnabled();
  });

  it("leaves the actions as they are when the thread cannot be loaded", async () => {
    getSendBacks.mockRejectedValue(new Error("500"));
    await mount();
    expect(screen.queryByText("Questions and rejections")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve PO/ })).toBeEnabled();
  });
});

// The hold names the person asked to everyone. The person asked is told it is
// theirs to answer; nobody is told "currently with" an approver who cannot act.
describe("who the page says a held PO is waiting on", () => {
  const ASKED = "You were asked for information. Answer below.";

  it("tells the person asked that it is theirs to answer, in the summary and the side card", async () => {
    mockUser.id = 13; // Chitra Chawla, the target; not an approver
    mockPerms.canApprove = false;
    getSendBacks.mockResolvedValue([hold()]);
    await mount({ awaiting_me: false });
    await screen.findByLabelText("Your answer");
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(within(hero).getByText(ASKED)).toBeInTheDocument();
    expect(screen.getAllByText(ASKED)).toHaveLength(2);
    expect(screen.queryByText(/No action is required from you right now/)).not.toBeInTheDocument();
    expect(screen.queryByText(/currently with/i)).not.toBeInTheDocument();
  });

  it("shows anyone else the hold's waiting text, not the approver it is 'currently with'", async () => {
    mockUser.id = 500;
    mockPerms.canApprove = false;
    getSendBacks.mockResolvedValue([hold()]);
    await mount({ awaiting_me: false });
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    await within(hero).findByText(/Waiting on Chitra Chawla \(Commercial evaluator\)/);
    expect(screen.queryByText(/currently with/i)).not.toBeInTheDocument();
    expect(screen.queryByText(ASKED)).not.toBeInTheDocument();
    expect(screen.getByText(/No action is required from you right now/)).toBeInTheDocument();
  });

  it("still says 'currently with' when nothing is held", async () => {
    mockUser.id = 500;
    mockPerms.canApprove = false;
    await mount({ awaiting_me: false });
    expect(screen.getByText(/Pending approval — currently with L3: Vishal Kamat/)).toBeInTheDocument();
  });

  it("heads a held approver's card 'On hold', not 'Your action required'", async () => {
    getSendBacks.mockResolvedValue([hold()]);
    await mount();
    await screen.findAllByText("Waiting on Chitra Chawla (Commercial evaluator)");
    expect(screen.queryByText("Your action required")).not.toBeInTheDocument();
    expect(screen.getByText("On hold")).toBeInTheDocument();
  });

  it("keeps 'Your action required' when nothing is held", async () => {
    await mount();
    expect(screen.getByText("Your action required")).toBeInTheDocument();
  });

  it("keeps the phone bar's hold line to one line, with the full text in its title", async () => {
    getSendBacks.mockResolvedValue([hold()]);
    await mount();
    const region = await screen.findByRole("region", { name: "PO decision" });
    const line = within(region).getByText("Waiting on Chitra Chawla (Commercial evaluator)");
    expect(line).toHaveAttribute("title", "Waiting on Chitra Chawla (Commercial evaluator)");
    expect(line.className).toMatch(/waitingBar/);
  });
});

// Until the thread has loaded the page cannot know whether the PO is held, so
// it must not offer Approve or say the PO is waiting on this viewer yet.
describe("before the thread has loaded", () => {
  it("keeps the decision buttons disabled and says nothing about waiting on you", async () => {
    getSendBacks.mockReturnValue(new Promise(() => {}));
    getPODetailFull.mockResolvedValue(po());
    render(<PODetail id="605" />);
    await screen.findByText("Items & pricing");
    expect(screen.getByRole("button", { name: /Approve PO/ })).toBeDisabled();
    screen.getAllByRole("button", { name: /^Reject$/ }).forEach((b) => expect(b).toBeDisabled());
    screen.getAllByRole("button", { name: /^Ask for info$/ }).forEach((b) => expect(b).toBeDisabled());
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero).not.toHaveTextContent(/Waiting on you for approval/);
  });

  it("enables them once the thread is in", async () => {
    await mount();
    await waitFor(() => expect(screen.getByRole("button", { name: /Approve PO/ })).toBeEnabled());
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero).toHaveTextContent(/Waiting on you for approval/);
  });
});

describe("the thread on the page", () => {
  it("shows the respond box to the named target only", async () => {
    mockUser.id = 13;
    mockPerms.canApprove = false;
    getSendBacks.mockResolvedValue([hold()]);
    await mount({ awaiting_me: false });
    expect(await screen.findByLabelText("Your answer")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Corrected" } });
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    await waitFor(() => expect(respondToSendBack).toHaveBeenCalledWith(7, { response_text: "Corrected", files: [] }));
    await waitFor(() => expect(getSendBacks).toHaveBeenCalledTimes(2));
  });

  it("does not show the respond box to the requester or an approver", async () => {
    getSendBacks.mockResolvedValue([hold()]);
    await mount();
    await screen.findByText("Questions and rejections");
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
  });

  it("offers Withdraw to the requester and calls the service", async () => {
    mockPerms.canApprove = false;
    getSendBacks.mockResolvedValue([hold()]);
    await mount({ awaiting_me: false });
    fireEvent.click(await screen.findByRole("button", { name: "Withdraw this request" }));
    await waitFor(() => expect(withdrawSendBack).toHaveBeenCalledWith(7));
  });

  it("offers Withdraw to another pending approver, but not to a bystander", async () => {
    getSendBacks.mockResolvedValue([hold({ requested_by: { id: 999, name: "Someone Else" } })]);
    const { unmount } = await mount();
    expect(await screen.findByRole("button", { name: "Withdraw this request" })).toBeInTheDocument();
    unmount();

    mockPerms.canApprove = false;
    getSendBacks.mockResolvedValue([hold({ requested_by: { id: 999, name: "Someone Else" } })]);
    await mount({ awaiting_me: false });
    await screen.findByText("Questions and rejections");
    expect(screen.queryByRole("button", { name: "Withdraw this request" })).not.toBeInTheDocument();
  });
});

describe("a stale page", () => {
  it.each([403, 404, 409])("a %i reloads the PO and the thread and toasts the server's words", async (status) => {
    await mount();
    createSendBack.mockRejectedValue({
      response: { status, data: { message: "This PO is already on hold.", code: "PO_ON_HOLD" } },
    });
    await openAsk();
    pick("Question on price, GST or calculation");
    fireEvent.change(screen.getByLabelText(/Your question/), { target: { value: "Why?" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Ask for info" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This PO is already on hold."));
    await waitFor(() => expect(getPODetailFull).toHaveBeenCalledTimes(2));
    expect(getSendBacks).toHaveBeenCalledTimes(2);
  });

  it("a 409 on Reject refetches both and toasts", async () => {
    await mount();
    handlePOApproval.mockRejectedValue({
      response: { status: 409, data: { message: "Waiting on Chitra Chawla.", code: "PO_ON_HOLD" } },
    });
    await openReject();
    pick("Something else");
    fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Waiting on Chitra Chawla."));
    await waitFor(() => expect(getPODetailFull).toHaveBeenCalledTimes(2));
    expect(getSendBacks).toHaveBeenCalledTimes(2);
  });

  it("a 409 from the phone Approve confirmation closes the confirmation and refetches", async () => {
    await mount();
    handlePOApproval.mockRejectedValue({ response: { status: 409, data: { message: "On hold." } } });
    const region = await screen.findByRole("region", { name: "PO decision" });
    fireEvent.click(within(region).getByRole("button", { name: "Approve purchase order" }));
    await screen.findByText("Approve this purchase order?");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve PO" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("On hold."));
    await waitFor(() => expect(screen.queryByText("Approve this purchase order?")).not.toBeInTheDocument());
    expect(getSendBacks).toHaveBeenCalledTimes(2);
  });

  it("keeps the last good thread when a refetch after a mutation fails", async () => {
    getSendBacks.mockResolvedValueOnce([hold({ status: "ANSWERED" })]);
    await mount();
    await screen.findByText("Questions and rejections");
    getSendBacks.mockRejectedValue(new Error("500"));
    handlePOApproval.mockRejectedValue({ response: { status: 409, data: { message: "On hold." } } });
    fireEvent.click(screen.getByRole("button", { name: /Approve PO/ }));
    await waitFor(() => expect(getSendBacks).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Questions and rejections")).toBeInTheDocument();
  });

  it("a 409 on Approve refetches both and toasts", async () => {
    await mount();
    handlePOApproval.mockRejectedValue({ response: { status: 409, data: { message: "On hold." } } });
    fireEvent.click(screen.getByRole("button", { name: /Approve PO/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("On hold."));
    await waitFor(() => expect(getSendBacks).toHaveBeenCalledTimes(2));
  });
});

describe("a replacement PO", () => {
  it("says which rejected PO it replaces, and why", async () => {
    await mount({
      replaces: { po_id: 590, po_number: "138800", reason_category: "RENEGOTIATE", comment: "Price too high" },
    });
    const note = screen.getByText(/Replaces/, { selector: "div" });
    expect(note).toHaveTextContent("Replaces PO #138800, rejected: Re-negotiate or change the vendor. “Price too high”");
    expect(within(note).getByRole("link")).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/590");
  });
});

describe("no vendor-notification copy anywhere", () => {
  const FORBIDDEN = /vendor (will be|is|was|has been) notified|vendor notified|will be notified|notify the vendor|amend (it )?and raise|raise it again|sent back to you/i;

  it("on a pending PO, in the page, the reject dialog and the ask dialog", async () => {
    await mount();
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
    await openReject();
    for (const r of [
      "Photos or documents missing",
      "Re-negotiate or change the vendor",
      "Not needed any more",
      "Something else",
    ]) {
      pick(r);
      expect(document.body.textContent).not.toMatch(FORBIDDEN);
    }
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await openAsk();
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it("on a rejected PO and with a thread", async () => {
    getSendBacks.mockResolvedValue([
      hold({ status: "CLOSED", route: "COMMERCIAL", resolution: "REJECTED", reason_category: "RENEGOTIATE" }),
    ]);
    await mount({
      status: "rejected",
      status_label: "Rejected",
      awaiting_me: false,
      initiated_by: 125,
      raised_by: { id: 125, name: "Me" },
      workflow: [{ status: "rejected", title: "Commercial approval", by: "A", reason: "Too dear" }],
    });
    await screen.findByText("Questions and rejections");
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it("in the toast after rejecting when the server sends no message", async () => {
    handlePOApproval.mockResolvedValue({});
    await mount();
    await openReject();
    pick("Something else");
    fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("PO rejected"));
  });
});
