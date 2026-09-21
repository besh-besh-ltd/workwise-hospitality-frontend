// Opening the Edit drawer must not, by itself, propose throwing away the
// vendor's sub-categories.
//
// The drawer asks products/nested-category-list for parent_id=0, and
// productModel.getNestedCategoryList answers with a FLAT list —
// `SELECT id, title, parent_id, slug`. There is no `subcategories` key and no
// `children` key, so the drawer's `c.subcategories || c.children` parse never
// matched and allSubcategories stayed empty for every vendor.
//
// Two things followed. The "Sub-categories (Free)" control never rendered
// (production has 184 of them). And the cleanup effect, which drops any
// selected sub it cannot resolve, dropped ALL of them — so the drawer's target
// state disagreed with the vendor's real subscription the instant it opened.
// hasChanges went true with nobody touching anything, and the live preview
// offered to remove every sub-category the vendor had: 154 production vendors,
// 864 rows, priced at zero and therefore not even gated behind the removal
// confirmation.
//
// A gap in category metadata must never be read as "the vendor asked to delete
// this".

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/products", () => ({ nestedCategoryData: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ getAllHotels: jest.fn() }));

const previewCalls = [];
jest.mock("./hooks/useSubscriptionPreview", () => ({
  __esModule: true,
  default: (cats, subs, hotels, enabled) => {
    previewCalls.push({ cats, subs, hotels, enabled });
    return { preview: null, loading: false, error: null };
  },
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { nestedCategoryData } from "@/services/products";
import { getAllHotels } from "@/services/hospitality";
import EditSubscriptionDrawer from "./EditSubscriptionDrawer";

// Exactly what the API returns today.
const TOP_LEVEL = [
  { id: 237, title: "ENGINEERING", parent_id: 0, slug: "engineering" },
  { id: 240, title: "HOUSEKEEPING", parent_id: 0, slug: "housekeeping" },
];
const ENGINEERING_CHILDREN = [
  { id: 238, title: "ELECTRICAL ITEMS", parent_id: 237, slug: "electrical" },
  { id: 239, title: "PLUMBING", parent_id: 237, slug: "plumbing" },
];

const HOTELS = [{ id: 6, name: "The Orchid Mumbai", city: "Mumbai" }];

const CURRENT = {
  subscription: {
    categories: [
      {
        id: 237,
        name: "ENGINEERING",
        fee_amount: 500,
        sub_categories: [
          { id: 238, name: "ELECTRICAL ITEMS" },
          { id: 239, name: "PLUMBING" },
        ],
      },
    ],
    hotels: [{ id: 6, name: "The Orchid Mumbai" }],
  },
};

const lastCall = () => previewCalls[previewCalls.length - 1];

beforeEach(() => {
  previewCalls.length = 0;
  jest.clearAllMocks();
  nestedCategoryData.mockImplementation((parentId) =>
    Promise.resolve({ data: Number(parentId) === 237 ? ENGINEERING_CHILDREN : TOP_LEVEL })
  );
  getAllHotels.mockResolvedValue({ data: HOTELS });
});

const openDrawer = () =>
  render(
    <EditSubscriptionDrawer open onClose={jest.fn()} currentData={CURRENT} onSubmit={jest.fn()} />
  );

it("keeps the vendor's sub-categories in the target state when the drawer opens", async () => {
  openDrawer();

  await waitFor(() => expect(lastCall()?.cats).toEqual([237]));
  await waitFor(() => expect([...(lastCall()?.subs || [])].sort()).toEqual([238, 239]));
});

it("does not report a change when the vendor has touched nothing", async () => {
  openDrawer();

  await waitFor(() => expect(lastCall()?.cats).toEqual([237]));
  // Let every settling effect run before judging.
  await new Promise((r) => setTimeout(r, 50));
  expect(lastCall().enabled).toBe(false);
});

it("offers the sub-category picker for the categories the vendor holds", async () => {
  openDrawer();

  await waitFor(() => expect(screen.getByText("Sub-categories (Free)")).toBeInTheDocument());
});
