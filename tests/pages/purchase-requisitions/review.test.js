jest.mock("@/services/pr", () => ({ __esModule: true, getReviewQueue: jest.fn() }));
jest.mock("@/services/rbac", () => ({ __esModule: true, getBulkPermissions: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as PrApi from "@/services/pr";
import { getBulkPermissions } from "@/services/rbac";
import PrReviewPage from "@/pages/dashboard/buyer/purchase-requisitions/review";

const item = (over = {}) => ({
  review_id: 9, pr_id: 55, pr_number: "PR-2026-0055", title: "Lobby towels", hotel_name: "Orchid Mumbai",
  department_title: "Housekeeping", requester_name: "Asha", line_count: 3, submitted_at: "2026-10-10T05:00:00Z", age_days: 4, ...over,
});

// POST /rbac/me/permissions/bulk { key: "pr", hotel_ids: [] } — Shape A.
const prPerms = (actions) => ({ status: true, data: { permissions: { pr: { actions, scope: {} } } } });

beforeEach(() => {
  jest.clearAllMocks();
  getBulkPermissions.mockResolvedValue(prPerms(["read", "evaluate"]));
});

test("renders queue rows with age and links to the detail", async () => {
  PrApi.getReviewQueue.mockResolvedValue({ status: 1, data: { count: 2, items: [item(), item({ review_id: 10, pr_id: 56, pr_number: "PR-2026-0056", title: "Chairs", age_days: 0 })] } });
  render(<PrReviewPage />);
  expect(await screen.findByText("Lobby towels")).toBeInTheDocument();
  expect(screen.getByText("PR-2026-0055")).toBeInTheDocument();
  expect(screen.getByText("4 days")).toBeInTheDocument();
  expect(screen.getByText("Today")).toBeInTheDocument();
  expect(screen.getAllByText("Asha")).toHaveLength(2);
  expect(screen.getAllByText("Orchid Mumbai")).toHaveLength(2);
  expect(screen.getByText("Lobby towels").closest("a")).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions/55");
});

test("empty queue says nothing is waiting", async () => {
  PrApi.getReviewQueue.mockResolvedValue({ status: 1, data: { count: 0, items: [] } });
  render(<PrReviewPage />);
  expect(await screen.findByText(/Nothing is waiting for your review/)).toBeInTheDocument();
});

test("403 shows the friendly not-a-reviewer state", async () => {
  PrApi.getReviewQueue.mockRejectedValue({ response: { status: 403, data: { status: 0, code: "PR_FORBIDDEN", message: "x" } } });
  render(<PrReviewPage />);
  expect(await screen.findByText("You're not a technical reviewer")).toBeInTheDocument();
});

// Final review C-M3: GET /pr/review-queue never answers 403 — a user with no
// pr.evaluate grant just gets an empty queue and read "Nothing is waiting for
// your review", as if they were a reviewer. The grant is read from the user's
// own permissions (all their hotels) instead.
test("an empty queue for someone with no pr.evaluate anywhere says they are not a reviewer", async () => {
  PrApi.getReviewQueue.mockResolvedValue({ status: 1, data: { count: 0, items: [] } });
  getBulkPermissions.mockResolvedValue(prPerms(["read", "create"]));
  render(<PrReviewPage />);
  expect(await screen.findByText("You're not a technical reviewer")).toBeInTheDocument();
  expect(screen.getByText(/PR Technical Reviewer role/)).toBeInTheDocument();
  expect(screen.queryByText(/Nothing is waiting for your review/)).not.toBeInTheDocument();
  expect(getBulkPermissions).toHaveBeenCalledWith("pr", []);
});

test("an empty queue with the grant unknown (lookup failed) keeps the neutral empty state", async () => {
  PrApi.getReviewQueue.mockResolvedValue({ status: 1, data: { count: 0, items: [] } });
  getBulkPermissions.mockRejectedValue({ message: new Error("offline") });
  render(<PrReviewPage />);
  expect(await screen.findByText(/Nothing is waiting for your review/)).toBeInTheDocument();
  expect(screen.queryByText("You're not a technical reviewer")).not.toBeInTheDocument();
});

test("other failures show copy with retry", async () => {
  PrApi.getReviewQueue.mockRejectedValueOnce({ response: { status: 500, data: { status: 3, code: "PR_INTERNAL", message: "Something went wrong" } } });
  PrApi.getReviewQueue.mockResolvedValueOnce({ status: 1, data: { count: 1, items: [item()] } });
  render(<PrReviewPage />);
  expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Lobby towels")).toBeInTheDocument();
});
