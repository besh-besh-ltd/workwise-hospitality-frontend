// ViewRFQ — the RFQ page must lead to the vendor clarifications, before and
// after the clarification window closes.
//
// Reported: "On the hotel user side, the clarification disappears once the
// clarification window is closed; no longer able to submit answers, documents
// or explanations." The clarification itself never went away — its page
// (/dashboard/buyer/clarification-management) keeps listing it and the creator
// can still reply and close it after the window. But the RFQ page had no way
// to get there: its only related button opened the Queries chat (labelled
// "Clarifications" on tenders), which never shows clarifications. The bell
// notification was the only way in.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "2386" },
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(), push: jest.fn(), back: jest.fn(),
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 426, name: "Kushal Shah" } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqLineage: jest.fn(() => Promise.resolve({ data: { copied_from: null, copies: [] } })),
  getTechEvalStatus: jest.fn(() => Promise.resolve({ data: null })),
  getRfqLifecycle: jest.fn(() => Promise.resolve({ data: { stages: [], action: null, approval_instances: [] } })),
}));
jest.mock("@/services/clarification", () => ({
  __esModule: true,
  getClarifications: jest.fn(),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getNegotiationRoundsByProduct: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({ __esModule: true, default: () => ({ hasClauses: false, loading: false }) }));
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getClarifications } from "@/services/clarification";
import ViewRFQ from "./ViewRFQ";

const RFQ = {
  id: 2386,
  rfq_no: "536631",
  title: "Housekeeping supplies",
  status: 1,
  is_published: 1,
  is_tender: 1,
  products: [],
  terms: [],
  company_name: "Workwise Hotels",
  timestamp: "2026-11-10 12:00:00",
  tender_publish_date: "2026-11-10 17:33:51",
  // The window has CLOSED (an hour in the past relative to the test run is
  // irrelevant: nothing on this page is meant to depend on it).
  vendor_clarification_date: "2026-11-10 18:08:51",
  bid_end_date: "2026-11-12T18:03:51",
};

const clarificationsResponse = (statuses) => ({
  status: 1,
  data: {
    clarifications: statuses.map((status, i) => ({ id: i + 1, status, subject: `Clarification ${i + 1}` })),
    has_open: statuses.includes("OPEN"),
    is_buyer: true,
  },
});

const renderRfq = async (over = {}) => {
  render(<ViewRFQ data={{ ...RFQ, ...over }} isCreator />);
  await screen.findByText("Buyer & inquiry details");
};

beforeEach(() => jest.clearAllMocks());

test("a Clarifications button opens the clarification page, with the open count", async () => {
  getClarifications.mockResolvedValue(clarificationsResponse(["OPEN", "CLOSED"]));
  await renderRfq();

  const link = screen.getByRole("link", { name: /Clarifications/ });
  expect(link).toHaveAttribute("href", "/dashboard/buyer/clarification-management?rfq_id=2386");
  expect(await within(link).findByText("1 open")).toBeInTheDocument();
  expect(getClarifications).toHaveBeenCalledWith(2386);
});

test("the Queries chat keeps its own button and is called Queries on a tender too", async () => {
  getClarifications.mockResolvedValue(clarificationsResponse([]));
  await renderRfq({ is_tender: 1 });

  const queries = screen.getByRole("link", { name: /Queries/ });
  expect(queries).toHaveAttribute("href", "/dashboard/buyer/query?rfq_id=2386&role=buyer");
  expect(queries).not.toHaveTextContent("Clarifications");
});

test("shows the button on a normal RFQ with a clarification window as well", async () => {
  getClarifications.mockResolvedValue(clarificationsResponse(["OPEN"]));
  await renderRfq({ is_tender: 0 });
  expect(screen.getByRole("link", { name: /Clarifications/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Queries/ })).toBeInTheDocument();
});

test("no open clarification: the button stays, without a badge", async () => {
  getClarifications.mockResolvedValue(clarificationsResponse(["CLOSED"]));
  await renderRfq();
  const link = screen.getByRole("link", { name: /Clarifications/ });
  await waitFor(() => expect(getClarifications).toHaveBeenCalled());
  expect(within(link).queryByText(/open/)).not.toBeInTheDocument();
});

test("if the count cannot load, the button is still there", async () => {
  getClarifications.mockRejectedValue({ message: "network" });
  await renderRfq();
  await waitFor(() => expect(getClarifications).toHaveBeenCalled());
  expect(screen.getByRole("link", { name: /Clarifications/ })).toHaveAttribute(
    "href", "/dashboard/buyer/clarification-management?rfq_id=2386");
});

test("an RFQ without a clarification window has no button and makes no call", async () => {
  await renderRfq({ vendor_clarification_date: null });
  expect(screen.queryByRole("link", { name: /Clarifications/ })).not.toBeInTheDocument();
  expect(getClarifications).not.toHaveBeenCalled();
});
