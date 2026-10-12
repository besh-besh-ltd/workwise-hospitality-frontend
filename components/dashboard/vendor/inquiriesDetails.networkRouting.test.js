// Vendor inquiry page (/dashboard/vendor/inquiries-details) for a member entity of a
// vendor network (Task 25 fix round 1). When the RFQ is routed to the acting member and
// waits for its reply (the RFQ detail's network_assignment is PENDING), the page says so
// in a banner with Accept and Decline (the shared reason dialog); Send Quote, Regret and
// Raise Clarification are disabled with the reason until it accepts. A refusal the
// server sends anyway (ROUTING_REQUIRED) shows the server's sentence.

const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  Router: {},
  useRouter: () => ({
    query: { id: "918" },
    pathname: "/dashboard/vendor/inquiries-details",
    push: mockPush,
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock("next/dynamic", () => ({ __esModule: true, default: () => () => null }));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 872, user_type: 3, name: "Vendor" } }),
}));
jest.mock("@/services/rfq", () => {
  const ok = () => Promise.resolve({ data: [] });
  return {
    __esModule: true,
    getRFQById: jest.fn(),
    closeRFQ: jest.fn(), withdrawPublish: jest.fn(), terminateRFQ: jest.fn(), forcePublishRFQ: jest.fn(),
    getAllClauses: jest.fn(ok), sendQuotation: jest.fn(ok), fetchVendorAgreement: jest.fn(ok),
    getTechClearedVendorsResult: jest.fn(ok), submitRFQApprovalAction: jest.fn(ok),
    getTechEvalStatus: jest.fn(() => Promise.resolve({ data: {} })),
  };
});
jest.mock("@/services/vendorNetwork", () => ({ __esModule: true, respondToAssignment: jest.fn() }));
jest.mock("@/services/clarification", () => ({ __esModule: true, getClarifications: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/services/negotiation", () => ({ __esModule: true, getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/hooks/useApprovalWorkflow", () => ({ __esModule: true, default: () => ({}) }));
jest.mock("@/hooks/usePreviewTotals", () => ({ __esModule: true, default: () => ({ totals: null, isLoading: false }) }));
jest.mock("@/components/dashboard/buyer/approval", () => ({ __esModule: true, ApprovalPendingBanner: () => null }));
jest.mock("@/components/dashboard/buyer/manageRFQ/RFQLifecycleJourney/RFQLifecycleJourney", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/manageRFQ/RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/negotiation/NegotiationColumnCell", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  ClarificationBlockingBanner: () => null, RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null, ClarificationListModal: () => null,
}));
jest.mock("@/components/AuthContainer/LoginContainer", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({
  __esModule: true,
  default: (p) =>
    p.showModal ? (
      <div role="dialog" aria-label="Regret reason">
        <button type="button" onClick={() => p.handleRegretReason({ regret_reason: "No stock" }, () => {})}>Submit regret</button>
      </div>
    ) : null,
}));
jest.mock("react-placeholder-loading", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";

import { getRFQById, sendQuotation } from "@/services/rfq";
import { respondToAssignment } from "@/services/vendorNetwork";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import RfqManagementPreview from "./inquiries-details";

const DUE = "2099-01-01T06:30:00.000Z";
const ROUTING_REQUIRED = {
  response: {
    status: 403,
    data: { status: 0, message: "Your network admin has not routed this RFQ to you, or you have not accepted it yet", reason: "ROUTING_REQUIRED" },
  },
};
const pendingAssignment = { id: 901, status: "PENDING", due_at: DUE, principal_name: "Daikin India HQ" };

const rfq = (over = {}) => ({
  id: 918, rfq_no: 536457, is_tender: 0, status: 1, is_published: 1,
  company_name: "Buyer Co", bid_end_date: "2099-01-01 17:00:00",
  quotations: [], terms: [], unseen_query_count: 0,
  products: [{ id: 1, rfq_product_id: 1, finalization_status: "Not Finalized", product_details: [{ product_name: "Bath towel" }], quantity: 10 }],
  ...over,
});

const headerButton = (name) => {
  const bar = screen.queryByRole("region", { name: "Quote actions" });
  return screen.getAllByRole("button", { name }).find((b) => !bar || !bar.contains(b));
};

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => {
  jest.clearAllMocks();
  getRFQById.mockReset();
  respondToAssignment.mockReset();
});

describe("a member whose RFQ assignment is PENDING", () => {
  test("sees who routed it and the reply deadline, with Accept and Decline", async () => {
    getRFQById.mockResolvedValue({ data: rfq({ network_assignment: pendingAssignment }) });
    render(<RfqManagementPreview />);
    const banner = await screen.findByRole("region", { name: "RFQ assignment" });
    expect(banner).toHaveTextContent(
      `Daikin India HQ has routed this RFQ to you. Accept it to quote, or decline so it can go to someone else. Reply by ${formatDisplayDate(DUE, { includeTime: true })}.`
    );
    expect(within(banner).getByRole("button", { name: "Accept" })).toBeEnabled();
    expect(within(banner).getByRole("button", { name: "Decline" })).toBeEnabled();
  });

  test("Send Quote and Regret are disabled with the reason, on the header and the phone bar", async () => {
    getRFQById.mockResolvedValue({ data: rfq({ network_assignment: pendingAssignment }) });
    render(<RfqManagementPreview />);
    await screen.findByRole("region", { name: "RFQ assignment" });
    await screen.findByRole("region", { name: "Quote actions" });

    const send = headerButton("Send Quote");
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(mockPush).not.toHaveBeenCalled();
    expect(headerButton("Regret Quote")).toBeDisabled();
    expect(screen.getAllByText("Accept this RFQ to quote, regret or raise a clarification").length).toBeGreaterThan(0);

    const bar = await screen.findByRole("region", { name: "Quote actions" });
    expect(within(bar).getByRole("button", { name: "Send Quote" })).toBeDisabled();
    expect(within(bar).queryByRole("button", { name: "Regret" })).toBeNull();
    expect(bar).toHaveTextContent("Accept this RFQ to quote, regret or raise a clarification");
  });

  test("Raise Clarification is disabled with the reason; reading clarifications is not", async () => {
    getRFQById.mockResolvedValue({
      data: rfq({ network_assignment: pendingAssignment, vendor_clarification_date: "2099-01-01 10:00:00" }),
    });
    render(<RfqManagementPreview />);
    await screen.findByRole("region", { name: "RFQ assignment" });
    const raise = screen.getByRole("button", { name: "Raise Clarification" });
    expect(raise).toBeDisabled();
    expect(raise).toHaveAttribute("title", "Accept this RFQ to quote, regret or raise a clarification");
  });

  test("Accept replies for the assignment, re-reads the RFQ, and Send Quote then opens the quote page", async () => {
    respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment accepted", data: {} });
    getRFQById
      .mockResolvedValueOnce({ data: rfq({ network_assignment: pendingAssignment }) })
      .mockResolvedValueOnce({ data: rfq({ network_assignment: { ...pendingAssignment, status: "ACCEPTED" } }) });
    render(<RfqManagementPreview />);

    fireEvent.click(within(await screen.findByRole("region", { name: "RFQ assignment" })).getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(respondToAssignment).toHaveBeenCalledWith(901, { decision: "ACCEPT" }));
    expect(toast.success).toHaveBeenCalledWith("Assignment accepted");
    await waitFor(() => expect(screen.queryByRole("region", { name: "RFQ assignment" })).toBeNull());
    expect(getRFQById).toHaveBeenCalledTimes(2);

    const send = headerButton("Send Quote");
    expect(send).toBeEnabled();
    fireEvent.click(send);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/quote?id=918&showTechEvalRestrictions=false");
    expect(headerButton("Regret Quote")).toBeEnabled();
  });

  test("Decline asks for a reason in the shared dialog and returns to Assigned to me", async () => {
    respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment declined", data: {} });
    getRFQById.mockResolvedValue({ data: rfq({ network_assignment: pendingAssignment }) });
    render(<RfqManagementPreview />);

    fireEvent.click(within(await screen.findByRole("region", { name: "RFQ assignment" })).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog", { name: "Decline assignment" });
    expect(dialog).toHaveTextContent("RFQ #536457");
    fireEvent.click(within(dialog).getByLabelText("No stock"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
    await waitFor(() =>
      expect(respondToAssignment).toHaveBeenCalledWith(901, { decision: "DECLINE", reason: "NO_STOCK", note: null })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/network/assigned"));
  });
});

describe("no reply pending", () => {
  test.each([
    ["an ACCEPTED member", { network_assignment: { ...pendingAssignment, status: "ACCEPTED" } }],
    ["the principal", { network_assignment: null }],
    ["a vendor in no network", {}],
  ])("%s: no banner, Send Quote and Regret as before", async (_label, over) => {
    getRFQById.mockResolvedValue({ data: rfq(over) });
    render(<RfqManagementPreview />);
    await screen.findByRole("region", { name: "Quote actions" });
    expect(screen.queryByRole("region", { name: "RFQ assignment" })).toBeNull();
    expect(headerButton("Send Quote")).toBeEnabled();
    expect(headerButton("Regret Quote")).toBeEnabled();
  });

  test("a regret the server refuses (ROUTING_REQUIRED) shows the server's reason", async () => {
    sendQuotation.mockRejectedValueOnce(ROUTING_REQUIRED);
    getRFQById.mockResolvedValue({ data: rfq() });
    render(<RfqManagementPreview />);
    await screen.findByRole("region", { name: "Quote actions" });
    fireEvent.click(headerButton("Regret Quote"));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Regret reason" })).getByRole("button", { name: "Submit regret" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Your network admin has not routed this RFQ to you, or you have not accepted it yet")
    );
  });
});
