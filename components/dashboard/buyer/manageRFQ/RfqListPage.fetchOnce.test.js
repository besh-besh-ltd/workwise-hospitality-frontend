// The RFQ list sends one request per distinct filter state.
//
// Before: opening the list from a dashboard link fired a request with the
// current-FY default before the URL was read, then the filtered one — so the
// heavy list endpoint ran for a result nobody sees, and a slow default response
// could race the filtered one.

let mockRouter = { query: {}, isReady: false };
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: mockRouter.query,
    isReady: mockRouter.isReady,
    pathname: "/dashboard/buyer/rfq-management",
    push: jest.fn(),
    replace: jest.fn(),
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
  getRfqListView: jest.fn(),
  deleteDraft: jest.fn(),
}));

import React from "react";
import { render, waitFor, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRfqListView } from "@/services/rfq";
import RfqListPage from "./RfqListPage";

const EMPTY = { data: { rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 } };
const rowsOf = (title) => ({ data: { rows: [{ id: 1, title, rfq_no: "R-1" }], facets: {}, tab_counts: {}, total: 1, limit: 20 } });

beforeEach(() => {
  jest.clearAllMocks();
  getRfqListView.mockImplementation(() => Promise.resolve(EMPTY));
});

test("a deep link fetches exactly once, with the URL filters, even when the router is not ready on first render", async () => {
  mockRouter = { query: { tab: "drafts", mine: "1" }, isReady: false };
  const { rerender } = render(<RfqListPage />);
  expect(getRfqListView).not.toHaveBeenCalled();

  mockRouter = { ...mockRouter, isReady: true };
  rerender(<RfqListPage />);

  await waitFor(() => expect(getRfqListView).toHaveBeenCalledTimes(1));
  const req = getRfqListView.mock.calls[0][0];
  expect(req.tab).toBe("drafts");
  expect(req.filters.mine).toBe(true);
  expect(req.filters.dateFrom).toBeFalsy(); // deep links open across all years

  // The search debounce settling must not trigger a duplicate request.
  await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
  expect(getRfqListView).toHaveBeenCalledTimes(1);
});

test("a deep link with a search term sends it in the single first request", async () => {
  mockRouter = { query: { search: "KEYBOARD" }, isReady: true };
  render(<RfqListPage />);
  await waitFor(() => expect(getRfqListView).toHaveBeenCalled());
  await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
  expect(getRfqListView).toHaveBeenCalledTimes(1);
  expect(getRfqListView.mock.calls[0][0].search).toBe("KEYBOARD");
});

test("without a deep link the page fetches once with the current-FY default", async () => {
  mockRouter = { query: {}, isReady: true };
  render(<RfqListPage />);
  await waitFor(() => expect(getRfqListView).toHaveBeenCalledTimes(1));
  expect(getRfqListView.mock.calls[0][0].filters.dateFrom).toBeTruthy();
  await act(async () => { await new Promise((r) => setTimeout(r, 450)); });
  expect(getRfqListView).toHaveBeenCalledTimes(1);
});

test("an older response arriving after a newer one never overwrites it", async () => {
  let resolveFirst;
  getRfqListView
    .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
    .mockImplementationOnce(() => Promise.resolve(rowsOf("Newest result")));

  mockRouter = { query: { tab: "drafts" }, isReady: true };
  const { rerender } = render(<RfqListPage />);
  await waitFor(() => expect(getRfqListView).toHaveBeenCalledTimes(1));

  // A second dashboard link opened while the page is mounted.
  mockRouter = { query: { tab: "pending" }, isReady: true };
  rerender(<RfqListPage />);
  await waitFor(() => expect(getRfqListView).toHaveBeenCalledTimes(2));
  await screen.findByText("Newest result");

  await act(async () => { resolveFirst(rowsOf("Stale result")); });
  expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
  expect(screen.getByText("Newest result")).toBeInTheDocument();
});
