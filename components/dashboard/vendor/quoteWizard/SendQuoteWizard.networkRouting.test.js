// SendQuoteWizard (/dashboard/vendor/quote) for a vendor-network member entity
// (Task 25 fix round 1). A member that reaches the quote page while the RFQ is routed to
// it and waits for its reply (network_assignment PENDING) gets the inquiry page's banner,
// with Accept and Decline, instead of a form the server would refuse; accepting loads the
// RFQ again and the form opens. A regret the server refuses (ROUTING_REQUIRED) shows the
// server's sentence rather than a generic error.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  sendQuotation: jest.fn(),
  updateQuotation: jest.fn(),
  fetchVendorAgreement: jest.fn(() => Promise.resolve({ data: [] })),
  addVendorAgreement: jest.fn(),
  fetchQuoteHistory: jest.fn(() => Promise.resolve({ data: [] })),
  fetchDeviationPreviews: jest.fn(() => Promise.resolve({ data: [] })),
  handleUploadFile: jest.fn(),
  createTenderPaymentOrder: jest.fn(),
  verifyTenderPayment: jest.fn(),
  getChargeNames: jest.fn(() => Promise.resolve({ data: [] })),
}));
jest.mock("@/services/vendorNetwork", () => ({ __esModule: true, respondToAssignment: jest.fn() }));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getAllVendorNegotiationStatus: jest.fn(() => Promise.resolve({ status: 1, data: [] })),
}));
jest.mock("@/services/clarification", () => ({ __esModule: true, getClarifications: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/hooks/usePreviewTotals", () => ({ __esModule: true, default: () => ({ totals: null, isLoading: false, error: null }) }));
jest.mock("@/utils/quoteExcel", () => ({ __esModule: true, downloadQuoteExcel: jest.fn() }));
jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({
  __esModule: true,
  default: (p) =>
    p.showModal ? (
      <div role="dialog" aria-label="Regret reason">
        <button type="button" onClick={() => p.handleRegretReason({ reqret_reason: "No stock" })}>Submit regret</button>
      </div>
    ) : null,
}));
jest.mock("@/components/shared/QuoteMethodModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null,
}));
jest.mock("./ClauseChatDrawer", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "4242" },
    pathname: "/dashboard/vendor/quote",
    push: mockPush,
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 90210, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";

import { getRFQById, sendQuotation } from "@/services/rfq";
import { respondToAssignment } from "@/services/vendorNetwork";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import SendQuoteWizard from "./SendQuoteWizard";

const DUE = "2099-01-01T06:30:00.000Z";
const pendingAssignment = { id: 901, status: "PENDING", due_at: DUE, principal_name: "Daikin India HQ" };
const SERVER_REASON = "Your network admin has not routed this RFQ to you, or you have not accepted it yet";

const mkRfq = (over = {}) => ({
  id: 4242,
  rfq_no: 536999,
  title: "Room door locks",
  is_tender: 0,
  company_name: "Orchid Passaros Goa",
  hotel_name: "Orchid Passaros Goa",
  bid_end_date: "2099-01-01 12:00:00",
  comment: "",
  terms: [{ id: 7, term_content: "Delivery within 30 days of the purchase order." }],
  quotations: [],
  products: [
    {
      id: 11,
      product_id: 12248,
      variant: "standard",
      product_details: [{ name: "Room door lock", description: "" }],
      product_specs: [{ title: "Quantity", value: "40" }, { title: "Unit", value: "nos" }],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  ...over,
});

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => {
  jest.clearAllMocks();
  getRFQById.mockReset();
  respondToAssignment.mockReset();
  sendQuotation.mockReset();
});

test("a PENDING member reaching the quote page gets the routing banner, not the form", async () => {
  getRFQById.mockResolvedValue({ data: mkRfq({ network_assignment: pendingAssignment }) });
  render(<SendQuoteWizard />);

  const banner = await screen.findByRole("region", { name: "RFQ assignment" });
  expect(banner).toHaveTextContent(
    `Daikin India HQ has routed this RFQ to you. Accept it to quote, or decline so it can go to someone else. Reply by ${formatDisplayDate(DUE, { includeTime: true })}.`
  );
  expect(screen.queryByText("Inquiry overview")).toBeNull();
  expect(screen.queryByRole("button", { name: /Regret quote/i })).toBeNull();
  expect(toast.error).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Back to the RFQ" }));
  expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/inquiries-details?id=4242");
});

test("Accept loads the RFQ again and the quote form opens", async () => {
  respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment accepted", data: {} });
  getRFQById
    .mockResolvedValueOnce({ data: mkRfq({ network_assignment: pendingAssignment }) })
    .mockResolvedValueOnce({ data: mkRfq({ network_assignment: { ...pendingAssignment, status: "ACCEPTED" } }) });
  render(<SendQuoteWizard />);

  fireEvent.click(within(await screen.findByRole("region", { name: "RFQ assignment" })).getByRole("button", { name: "Accept" }));
  await waitFor(() => expect(respondToAssignment).toHaveBeenCalledWith(901, { decision: "ACCEPT" }));
  expect((await screen.findAllByText("Inquiry overview")).length).toBeGreaterThan(0);
  expect(screen.queryByRole("region", { name: "RFQ assignment" })).toBeNull();
  expect(getRFQById).toHaveBeenCalledTimes(2);
  expect(screen.getAllByRole("button", { name: /Regret quote/i }).length).toBeGreaterThan(0);
});

test("Decline asks for a reason and returns to Assigned to me", async () => {
  respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment declined", data: {} });
  getRFQById.mockResolvedValue({ data: mkRfq({ network_assignment: pendingAssignment }) });
  render(<SendQuoteWizard />);

  fireEvent.click(within(await screen.findByRole("region", { name: "RFQ assignment" })).getByRole("button", { name: "Decline" }));
  const dialog = await screen.findByRole("dialog", { name: "Decline assignment" });
  expect(dialog).toHaveTextContent("RFQ #536999");
  fireEvent.click(within(dialog).getByLabelText("Can't meet the deadline"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  await waitFor(() =>
    expect(respondToAssignment).toHaveBeenCalledWith(901, { decision: "DECLINE", reason: "CANNOT_MEET_DEADLINE", note: null })
  );
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/network/assigned"));
});

test("a regret the server refuses (ROUTING_REQUIRED) shows the server's reason", async () => {
  sendQuotation.mockRejectedValue({ response: { status: 403, data: { status: 0, message: SERVER_REASON, reason: "ROUTING_REQUIRED" } } });
  getRFQById.mockResolvedValue({ data: mkRfq() });
  render(<SendQuoteWizard />);
  await screen.findAllByText("Inquiry overview");

  fireEvent.click(screen.getAllByRole("button", { name: /Regret quote/i })[0]);
  fireEvent.click(within(await screen.findByRole("dialog", { name: "Regret reason" })).getByRole("button", { name: "Submit regret" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SERVER_REASON));
});
