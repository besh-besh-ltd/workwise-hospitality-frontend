// PR list page — server-filtered, facet-invariant counts, debounced search,
// friendly 403, stale-response guard. Service layer mocked.

jest.mock("@/services/pr", () => ({
  __esModule: true,
  listPrs: jest.fn(),
  getPrKpis: jest.fn(),
  getFormHotels: jest.fn(),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7 } }),
}));
let mockQuery = {};
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as PrApi from "@/services/pr";
import PrListPage from "@/pages/dashboard/buyer/purchase-requisitions/index";

const row = (over = {}) => ({
  id: 55, pr_number: "PR-2026-0055", title: "Lobby towels", status: "pending_approval", header_progress: null,
  hotel_name: "Orchid Mumbai", department_name: "Housekeeping", raised_by_name: "Asha", raised_by: 9,
  estimated_total: "1250000.75", line_count: 2, required_by_date: "2026-11-20", urgency: "normal", pr_type: "goods",
  submitted_at: null, approved_at: null, created_at: "2026-10-01T00:00:00Z", now_with: "Vishal (approver)", ...over,
});
const list = (over = {}) => ({
  status: 1,
  data: {
    rows: [row()], total: 1,
    facets: {
      status: { pending_approval: 3, approved: 5 }, hotel: { 12: 6, 13: 2 }, department: { 4: 8 },
      pr_type: { goods: 7, service: 1 }, urgency: { normal: 8 },
    },
    facet_labels: { hotel: { 12: "Orchid Mumbai", 13: "Orchid Goa" }, department: { 4: "Housekeeping" } },
    ...over,
  },
});
const lastParams = () => PrApi.listPrs.mock.calls[PrApi.listPrs.mock.calls.length - 1][0];

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  PrApi.listPrs.mockResolvedValue(list());
  PrApi.getPrKpis.mockResolvedValue({ status: 1, data: { open: 4, awaiting_me: 2, in_purchase_queue: 6, avg_days_to_approval: 3.5 } });
  PrApi.getFormHotels.mockResolvedValue({ status: 1, data: { hotels: [{ id: 12, name: "Orchid Mumbai" }] } });
});

test("renders KPIs, rows with pills, money, now-with and links to detail", async () => {
  render(<PrListPage />);
  expect(await screen.findByText("Lobby towels")).toBeInTheDocument();
  expect(screen.getByText("PR-2026-0055")).toBeInTheDocument();
  expect(screen.getByText("Pending approval", { selector: ".status-pill span:last-child" })).toBeInTheDocument();
  expect(screen.getByText(/Orchid Mumbai · Housekeeping/)).toBeInTheDocument();
  expect(screen.getByText("₹12,50,000.75")).toBeInTheDocument();
  expect(screen.getByText(/Vishal \(approver\)/)).toBeInTheDocument();
  expect(screen.getByText("Lobby towels").closest("a")).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions/55");
  expect(await screen.findByText("3.5")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /New requisition/ })).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions/create");
  expect(lastParams()).toMatchObject({ tab: "mine", page: 1 });
});

test("Now with for a returned PR raised by someone else names the requester", async () => {
  PrApi.listPrs.mockResolvedValue(list({ rows: [row({ status: "returned", now_with: "You", raised_by: 9, raised_by_name: "Asha" })] }));
  render(<PrListPage />);
  expect(await screen.findByText("Asha (requester)")).toBeInTheDocument();
});

// Browser pass 19b: the tile used to open the technical-review queue, which only
// lists reviews — an approver with "Awaiting me: 1" found nothing there. It now
// opens the Waiting on me tab, which is exactly the set the KPI counts.
test("Awaiting me tile opens the Waiting on me tab (tab=awaiting)", async () => {
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  fireEvent.click((await screen.findByText("Awaiting me")).closest("button"));
  await waitFor(() => expect(lastParams()).toMatchObject({ tab: "awaiting", page: 1 }));
  expect(screen.getByRole("button", { name: "Waiting on me" })).toHaveClass("active");
});

test("the Waiting on me tab sends tab=awaiting", async () => {
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  fireEvent.click(screen.getByRole("button", { name: "Waiting on me" }));
  await waitFor(() => expect(lastParams().tab).toBe("awaiting"));
});

test("?tab=awaiting opens the list on the Waiting on me tab", async () => {
  mockQuery = { tab: "awaiting" };
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  expect(PrApi.listPrs.mock.calls.every(([p]) => p.tab === "awaiting")).toBe(true);
});

test("an unknown ?tab falls back to Mine", async () => {
  mockQuery = { tab: "bogus" };
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  expect(lastParams().tab).toBe("mine");
});

test("Awaiting me tile is plain when the number is zero", async () => {
  PrApi.getPrKpis.mockResolvedValue({ status: 1, data: { open: 0, awaiting_me: 0, in_purchase_queue: 0, avg_days_to_approval: null } });
  render(<PrListPage />);
  const label = await screen.findByText("Awaiting me");
  expect(label.closest("a")).toBeNull();
  expect(label.closest("button")).toBeNull();
});

test("a status facet click sends status= and the counts do not change", async () => {
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  fireEvent.click(screen.getByRole("button", { name: /Approved/ }));
  await waitFor(() => expect(lastParams()).toMatchObject({ status: "approved", page: 1 }));
  // server returns identical (facet-invariant) counts; the UI shows them as given
  expect(screen.getByRole("button", { name: /Approved\s*5/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Pending approval\s*3/ })).toBeInTheDocument();
});

test("sidebar facets use facet_labels and send hotel_id; any filter change resets page to 1", async () => {
  PrApi.listPrs.mockResolvedValue(list({ total: 45 }));
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(lastParams().page).toBe(2));
  fireEvent.click(screen.getByLabelText(/Orchid Goa/));
  await waitFor(() => expect(lastParams()).toMatchObject({ hotel_id: "13", page: 1 }));
  fireEvent.click(screen.getByLabelText(/Service/));
  await waitFor(() => expect(lastParams()).toMatchObject({ pr_type: "service", hotel_id: "13" }));
});

test("the All I can see tab sends tab=all", async () => {
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  fireEvent.click(screen.getByRole("button", { name: "All I can see" }));
  await waitFor(() => expect(lastParams().tab).toBe("all"));
});

test("search is debounced 300ms and resets the page", async () => {
  jest.useFakeTimers();
  try {
    render(<PrListPage />);
    await act(async () => { await Promise.resolve(); });
    const before = PrApi.listPrs.mock.calls.length;
    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: "tow" } });
    fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: "towel" } });
    act(() => { jest.advanceTimersByTime(250); });
    expect(PrApi.listPrs.mock.calls.length).toBe(before);
    await act(async () => { jest.advanceTimersByTime(60); });
    expect(PrApi.listPrs.mock.calls.length).toBe(before + 1);
    expect(lastParams()).toMatchObject({ q: "towel", page: 1 });
  } finally {
    jest.useRealTimers();
  }
});

test("empty state explains a PR and links to MR for contracted items", async () => {
  PrApi.listPrs.mockResolvedValue(list({ rows: [], total: 0, facets: {}, facet_labels: {} }));
  render(<PrListPage />);
  expect(await screen.findByText(/Request anything that isn't on a rate contract/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Material Requisition/ })).toHaveAttribute("href", "/dashboard/buyer/material-requisitions");
});

test("a 403 shows a friendly state, not an error", async () => {
  PrApi.listPrs.mockRejectedValue({ response: { status: 403, data: { status: 0, code: "PR_FORBIDDEN", message: "no" } } });
  render(<PrListPage />);
  expect(await screen.findByText(/don't have access to purchase requisitions/i)).toBeInTheDocument();
});

test("a failed load shows the error copy with a retry", async () => {
  PrApi.listPrs.mockRejectedValueOnce({ response: { status: 500, data: { status: 3, code: "PR_INTERNAL", message: "Something went wrong" } } });
  render(<PrListPage />);
  expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Lobby towels")).toBeInTheDocument();
});

test("a stale response never overwrites a newer one", async () => {
  let resolveFirst;
  PrApi.listPrs
    .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
    .mockResolvedValue(list({ rows: [row({ id: 70, pr_number: "PR-NEW", title: "Fresh result" })] }));
  render(<PrListPage />);
  fireEvent.click(await screen.findByRole("button", { name: "All I can see" }));
  expect(await screen.findByText("Fresh result")).toBeInTheDocument();
  await act(async () => { resolveFirst(list({ rows: [row({ id: 71, title: "Stale result" })] })); });
  expect(screen.queryByText("Stale result")).toBeNull();
  expect(screen.getByText("Fresh result")).toBeInTheDocument();
});

// Final review C-M3 + 19b: GET /pr never answers 403, so an approver with no
// pr.create grant saw "New requisition" and landed on an empty hotel picker.
// Whether they may raise one comes from GET /pr/form/hotels (empty = nowhere).
test("someone who can't raise a PR anywhere sees no New requisition button", async () => {
  PrApi.getFormHotels.mockResolvedValue({ status: 1, data: { hotels: [] } });
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  await waitFor(() => expect(PrApi.getFormHotels).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole("link", { name: /New requisition/ })).not.toBeInTheDocument());
});

test("the empty list tells a non-requester why there is no New requisition button", async () => {
  PrApi.getFormHotels.mockResolvedValue({ status: 1, data: { hotels: [] } });
  PrApi.listPrs.mockResolvedValue(list({ rows: [], total: 0, facets: {}, facet_labels: {} }));
  render(<PrListPage />);
  expect(await screen.findByText(/you need the PR Requester role/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /New requisition/ })).not.toBeInTheDocument();
});

test("if the hotel lookup fails the New requisition button stays (the create page explains)", async () => {
  PrApi.getFormHotels.mockRejectedValue(new Error("offline"));
  render(<PrListPage />);
  await screen.findByText("Lobby towels");
  await waitFor(() => expect(PrApi.getFormHotels).toHaveBeenCalled());
  expect(screen.getByRole("link", { name: /New requisition/ })).toBeInTheDocument();
});
