jest.mock("@/services/pr", () => ({ __esModule: true, getReviewQueue: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as PrApi from "@/services/pr";
import PrReviewPage from "@/pages/dashboard/buyer/purchase-requisitions/review";

const item = (over = {}) => ({
  review_id: 9, pr_id: 55, pr_number: "PR-2026-0055", title: "Lobby towels", hotel_name: "Orchid Mumbai",
  department_title: "Housekeeping", requester_name: "Asha", line_count: 3, submitted_at: "2026-10-10T05:00:00Z", age_days: 4, ...over,
});

beforeEach(() => jest.clearAllMocks());

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
  expect(await screen.findByText(/You don't review purchase requisitions/)).toBeInTheDocument();
});

test("other failures show copy with retry", async () => {
  PrApi.getReviewQueue.mockRejectedValueOnce({ response: { status: 500, data: { status: 3, code: "PR_INTERNAL", message: "Something went wrong" } } });
  PrApi.getReviewQueue.mockResolvedValueOnce({ status: 1, data: { count: 1, items: [item()] } });
  render(<PrReviewPage />);
  expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Lobby towels")).toBeInTheDocument();
});
