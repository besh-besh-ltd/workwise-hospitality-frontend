// Reported by the client: "while edit on Subscription error massage showing
// (Something went wrong)". That screen is the app-level ErrorBoundary, not an
// API outage.
//
// 11 production vendors hold an active subscription to hotel 33 ("Demo Business
// Unit"), which is soft-deleted. The summary endpoint still lists it (its query
// LEFT JOINs without an is_deleted filter) so the drawer pre-selects it, but
// the preview endpoint validates hotels with `is_deleted = 0` and answers 400.
//
// services/subscription.js rejects that 400 as `{ message: axiosError }`, so
// useSubscriptionPreview's `err?.response?.data?.message || err?.message`
// resolved to the AxiosError OBJECT and the drawer rendered it in a <p>.
// React: "Objects are not valid as a React child (found: [object Error])".
//
// The vendor must instead be told why, and keep the page.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/products", () => ({ nestedCategoryData: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ getAllHotels: jest.fn() }));
jest.mock("@/services/subscription", () => ({
  previewSubscriptionModification: jest.fn(),
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AxiosError } from "axios";
import { nestedCategoryData } from "@/services/products";
import { getAllHotels } from "@/services/hospitality";
import { previewSubscriptionModification } from "@/services/subscription";
import EditSubscriptionDrawer from "./EditSubscriptionDrawer";

const SERVER_MSG = "One or more selected business units are no longer available.";

// Exactly what productModel.getNestedCategoryList returns for parent_id = 0:
// a flat list. No children, no fee_amount.
const CATEGORIES = [
  { id: 237, title: "ENGINEERING", parent_id: 0, slug: "engineering" },
  { id: 240, title: "HOUSEKEEPING", parent_id: 0, slug: "housekeeping" },
];
const SUBCATEGORIES = [{ id: 238, title: "ELECTRICAL ITEMS", parent_id: 237, slug: "electrical" }];

const CURRENT = {
  subscription: {
    categories: [
      { id: 237, name: "ENGINEERING", fee_amount: 500, sub_categories: [{ id: 238, name: "ELECTRICAL ITEMS" }] },
    ],
    hotels: [{ id: 6, name: "The Orchid Mumbai" }],
  },
};

// Add a category via the first react-select, so a preview is actually
// requested. Opening the drawer alone is no longer a change.
const addACategory = async () => {
  await waitFor(() => expect(screen.getByText("Categories")).toBeInTheDocument());
  const input = document.querySelector('input[id^="react-select"]');
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowDown", code: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
};

beforeEach(() => {
  jest.clearAllMocks();
  nestedCategoryData.mockImplementation((parentId) =>
    Promise.resolve({ data: parentId === 237 ? SUBCATEGORIES : CATEGORIES })
  );
  getAllHotels.mockResolvedValue({ data: [{ id: 6, name: "The Orchid Mumbai", city: "Mumbai" }] });
  // How services/subscription.js really rejects a 400.
  const axiosError = new AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", {}, {});
  axiosError.response = { status: 400, data: { status: 0, message: SERVER_MSG } };
  previewSubscriptionModification.mockRejectedValue({ message: axiosError });
});

it("shows the server's reason instead of crashing when the preview is rejected", async () => {
  render(
    <EditSubscriptionDrawer open onClose={jest.fn()} currentData={CURRENT} onSubmit={jest.fn()} />
  );
  await addACategory();

  await waitFor(() => expect(previewSubscriptionModification).toHaveBeenCalled(), { timeout: 3000 });

  // The drawer is still on screen — no ErrorBoundary takeover.
  await waitFor(() => expect(screen.getByText("Edit Subscription")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText(SERVER_MSG)).toBeInTheDocument(), { timeout: 3000 });
});

it("falls back to readable text when the failure carries no server message", async () => {
  previewSubscriptionModification.mockRejectedValue({
    message: new AxiosError("Network Error", "ERR_NETWORK", {}, {}),
  });

  render(
    <EditSubscriptionDrawer open onClose={jest.fn()} currentData={CURRENT} onSubmit={jest.fn()} />
  );
  await addACategory();

  await waitFor(() => expect(previewSubscriptionModification).toHaveBeenCalled(), { timeout: 3000 });
  await waitFor(() => expect(screen.getByText(/Preview failed/i)).toBeInTheDocument(), { timeout: 3000 });
  expect(screen.getByText("Edit Subscription")).toBeInTheDocument();
});
