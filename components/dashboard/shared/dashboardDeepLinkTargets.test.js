// Target pages honour dashboard deep links (behaviour, not grep).
//
// Before: the RFQ list read only ?ended_no_quotes, the negotiation list read
// nothing, the PO dashboard read nothing — so every "View all" on the
// dashboard landed on an unfiltered page. These tests render each target page
// with a dashboard-built URL and assert the request it sends to the server.

let mockQuery = {};
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: mockQuery,
    pathname: "/dashboard/buyer/x",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 80011, name: "Test Buyer", hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, loading: false }),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqListView: jest.fn(() => Promise.resolve({ data: { rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 } })),
  deleteDraft: jest.fn(),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationListView: jest.fn(() => Promise.resolve({ status: 1, data: { rows: [], facets: {}, tab_counts: {}, source_counts: { all: 0, RFQ: 0, ARC: 0 }, total: 0, limit: 20 } })),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPOKpis: jest.fn(() => Promise.resolve({})),
  getPOAwaiting: jest.fn(() => Promise.resolve({ data: [] })),
  getPODashboardList: jest.fn(() => Promise.resolve({ data: [], total_items: 0, status_counts: {}, vendors: [] })),
  downloadPOListExcel: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRfqListView } from "@/services/rfq";
import { getNegotiationListView } from "@/services/negotiation";
import { getPODashboardList } from "@/services/po";
import RfqListPage, { parseRfqListDeepLink } from "@/components/dashboard/buyer/manageRFQ/RfqListPage";
import NegotiationListPage, { parseNegotiationListDeepLink } from "@/components/dashboard/buyer/negotiation/NegotiationListPage";
import PODashboard, { parsePoListDeepLink } from "@/components/dashboard/buyer/purchase-orders/PODashboard";
import { parsePoTrackingDeepLink } from "@/components/dashboard/buyer/purchase-orders/POTracking";
import { rfqList, rfqListView, approvalQueue, negotiationList, poList } from "./dashboardLinks";

/** Turn a builder URL into the router.query object Next would produce. */
const queryOf = (url) => {
  const q = {};
  new URL(url, "http://x").searchParams.forEach((v, k) => { q[k] = v; });
  return q;
};
const lastCall = (fn) => fn.mock.calls[fn.mock.calls.length - 1][0];

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
});

describe("RFQ list deep links", () => {
  test("RFQ approvals queue opens 'Pending for me' filtered to RFQ approval, across all years", async () => {
    mockQuery = queryOf(approvalQueue("RFQ"));
    render(<RfqListPage />);
    await waitFor(() => {
      const req = lastCall(getRfqListView);
      expect(req.tab).toBe("pending");
      expect(req.filters.status).toEqual(["RFQ_APPROVAL"]);
      // The queue is not hidden behind the current-FY default.
      expect(req.filters.dateFrom).toBe("");
      expect(req.filters.dateTo).toBe("");
    });
  });

  test("closing-soon view sends the status set and deadline sort", async () => {
    mockQuery = queryOf(rfqListView("closing_soon"));
    render(<RfqListPage />);
    await waitFor(() => {
      const req = lastCall(getRfqListView);
      expect(req.tab).toBe("ongoing");
      expect(req.filters.status).toEqual(["AWAITING_QUOTES", "TECHNICAL_AWAITING_QUOTES"]);
      expect(req.sort).toBe("deadline");
    });
  });

  test("business unit + search are applied", async () => {
    mockQuery = queryOf(rfqList({ bu: [10, 12], search: "LOCKS" }));
    render(<RfqListPage />);
    await waitFor(() => {
      const req = lastCall(getRfqListView);
      expect(req.filters.buId).toEqual(["10", "12"]);
      expect(req.search).toBe("LOCKS");
    });
  });

  test("legacy ?ended_no_quotes=1 still works", async () => {
    mockQuery = { ended_no_quotes: "1" };
    render(<RfqListPage />);
    await waitFor(() => expect(lastCall(getRfqListView).filters.status).toEqual(["RFQ_STUCK_COMMERCIAL"]));
  });

  test("plain navigation keeps the current-FY default", async () => {
    render(<RfqListPage />);
    await waitFor(() => expect(getRfqListView).toHaveBeenCalled());
    const req = lastCall(getRfqListView);
    expect(req.tab).toBe("all");
    expect(req.filters.status).toEqual([]);
    expect(req.filters.dateFrom).not.toBe("");
  });

  test("parser drops unknown tabs and status keys", () => {
    expect(parseRfqListDeepLink({ tab: "manage-rfq" })).toBeNull();
    expect(parseRfqListDeepLink({ status: "BOGUS,CLOSED", bu: "10,x" })).toEqual({ tab: "all", status: ["CLOSED"], bu: ["10"], search: "", sort: null });
  });
});

describe("Negotiation list deep links", () => {
  test("'needs my approval' queue turns the toggle on", async () => {
    mockQuery = queryOf(approvalQueue("NEGOTIATION"));
    render(<NegotiationListPage />);
    await waitFor(() => expect(lastCall(getNegotiationListView).needsMyApproval).toBe(true));
  });

  test("tab + search are applied", async () => {
    mockQuery = queryOf(negotiationList({ tab: "closed", search: "536299" }));
    render(<NegotiationListPage />);
    await waitFor(() => {
      const req = lastCall(getNegotiationListView);
      expect(req.tab).toBe("closed");
      expect(req.search).toBe("536299");
    });
  });

  test("parser ignores an unknown tab", () => {
    expect(parseNegotiationListDeepLink({ tab: "bogus" })).toBeNull();
    expect(parseNegotiationListDeepLink({ needs_my_approval: "1" })).toEqual({ tab: null, needsMyApproval: true, search: "" });
  });
});

describe("PO dashboard deep links", () => {
  test("PO approvals queue opens 'Pending for me'", async () => {
    mockQuery = queryOf(approvalQueue("PO"));
    render(<PODashboard />);
    await waitFor(() => expect(lastCall(getPODashboardList).status).toBe("action-required"));
  });

  test("rejected + search", async () => {
    mockQuery = queryOf(poList({ status: "rejected", search: "PO-12" }));
    render(<PODashboard />);
    await waitFor(() => {
      const req = lastCall(getPODashboardList);
      expect(req.status).toBe("rejected");
      expect(req.search).toBe("PO-12");
    });
  });

  test("parsers only accept tabs the pages render", () => {
    expect(parsePoListDeepLink({ status: "pending" })).toBeNull();
    expect(parsePoListDeepLink({ status: "draft" })).toEqual({ status: "draft", search: "" });
    expect(parsePoTrackingDeepLink({ tab: "awaiting-grn" })).toEqual({ tab: "awaiting-grn", search: "" });
    expect(parsePoTrackingDeepLink({ tab: "nope" })).toBeNull();
  });
});
