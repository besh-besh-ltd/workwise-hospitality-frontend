// Legacy quote page (/dashboard/vendor/send-quote, still reachable by URL) for a
// vendor-network member entity (Task 25 fix round 1): while the RFQ waits for the
// member's reply it shows the inquiry page's routing banner instead of the form; the
// server refuses a quote or regret until then (ROUTING_REQUIRED).

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  extractQuotation: jest.fn(), fetchQuoteHistory: jest.fn(() => Promise.resolve({ data: [] })),
  sendQuotation: jest.fn(), updateQuotation: jest.fn(), createTenderPaymentOrder: jest.fn(), verifyTenderPayment: jest.fn(),
  getChargeNames: jest.fn(() => Promise.resolve({ data: [] })), createChargeName: jest.fn(), updateChargeName: jest.fn(),
  deleteChargeName: jest.fn(), deleteQuoteFile: jest.fn(),
}));
jest.mock("@/services/vendorNetwork", () => ({ __esModule: true, respondToAssignment: jest.fn() }));
jest.mock("@/services/clarification", () => ({ __esModule: true, checkOpenClarification: jest.fn(() => Promise.resolve({ data: {} })) }));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getAllVendorNegotiationStatus: jest.fn(() => Promise.resolve({ status: 1, data: [] })),
  getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
}));
jest.mock("@/hooks/usePreviewTotals", () => ({ __esModule: true, default: () => ({ totals: null, isLoading: false, error: null }) }));
jest.mock("react-placeholder-loading", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "4242" },
    pathname: "/dashboard/vendor/send-quote",
    push: mockPush,
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import { respondToAssignment } from "@/services/vendorNetwork";
import SendQuotePage from "./send-quote";

const pendingAssignment = { id: 901, status: "PENDING", due_at: "2099-01-01T06:30:00.000Z", principal_name: "Daikin India HQ" };
const mkRfq = (over = {}) => ({
  id: 4242, rfq_no: 536999, is_tender: 0, status: 1, is_published: 1, bid_end_date: "2099-01-01 12:00:00",
  quotations: [], terms: [], products: [], ...over,
});

// The legacy page logs "EXTRACTED DATA" on every render, and its full form (rendered
// after Accept with this minimal fixture) warns about a null input value: its own noise.
let quiet = [];
beforeEach(() => {
  jest.clearAllMocks();
  getRFQById.mockReset();
  respondToAssignment.mockReset();
  quiet = [jest.spyOn(console, "log").mockImplementation(() => {}), jest.spyOn(console, "error").mockImplementation(() => {})];
});
afterEach(() => quiet.forEach((spy) => spy.mockRestore()));

test("a PENDING member gets the routing banner instead of the quote form", async () => {
  getRFQById.mockResolvedValue({ data: mkRfq({ network_assignment: pendingAssignment }) });
  render(<SendQuotePage />);
  const banner = await screen.findByRole("region", { name: "RFQ assignment" });
  expect(banner).toHaveTextContent("Daikin India HQ has routed this RFQ to you. Accept it to quote, or decline so it can go to someone else.");
  expect(screen.queryByRole("button", { name: /regret/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back to the RFQ" }));
  expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/inquiries-details?id=4242");
});

test("Accept loads the RFQ again; the banner goes once it is ACCEPTED", async () => {
  respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment accepted", data: {} });
  getRFQById
    .mockResolvedValueOnce({ data: mkRfq({ network_assignment: pendingAssignment }) })
    .mockResolvedValueOnce({ data: mkRfq({ network_assignment: { ...pendingAssignment, status: "ACCEPTED" } }) });
  render(<SendQuotePage />);
  fireEvent.click(within(await screen.findByRole("region", { name: "RFQ assignment" })).getByRole("button", { name: "Accept" }));
  await waitFor(() => expect(respondToAssignment).toHaveBeenCalledWith(901, { decision: "ACCEPT" }));
  await waitFor(() => expect(screen.queryByRole("region", { name: "RFQ assignment" })).toBeNull());
  expect(getRFQById).toHaveBeenCalledTimes(2);
});
