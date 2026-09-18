// Sub-categories are free and narrow nothing: a vendor who holds ENGINEERING
// receives every ENGINEERING product whether or not they tick ELECTRICAL ITEMS.
// The drawer never said so, and a vendor who read the multi-select as "what I
// supply" removed a sub-category expecting a tidier list.
//
// Until the backend fix (2026-09-17) that removal silently deleted every
// product mapping under it — vendor 908 lost 1,296 products and saw 2 of the
// 11 on RFQ 536603. The behaviour is fixed; this line makes the intent legible
// so the same misreading does not send vendors hunting for missing RFQs.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("@/services/products", () => ({ nestedCategoryData: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ getAllHotels: jest.fn() }));
jest.mock("./hooks/useSubscriptionPreview", () => ({
  __esModule: true,
  default: () => ({ preview: null, loading: false, error: null }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { nestedCategoryData } from "@/services/products";
import { getAllHotels } from "@/services/hospitality";
import EditSubscriptionDrawer from "./EditSubscriptionDrawer";

const CATEGORIES = [
  {
    id: 237,
    title: "ENGINEERING",
    fee_amount: 3000,
    subcategories: [{ id: 238, title: "ELECTRICAL ITEMS" }],
  },
];

const HOTELS = [{ id: 6, name: "The Orchid Mumbai", city: "Mumbai" }];

const CURRENT = {
  subscription: {
    categories: [
      {
        id: 237,
        name: "ENGINEERING",
        sub_categories: [{ id: 238, name: "ELECTRICAL ITEMS" }],
      },
    ],
    hotels: [{ id: 6, name: "The Orchid Mumbai" }],
  },
};

beforeEach(() => {
  nestedCategoryData.mockResolvedValue({ data: CATEGORIES });
  getAllHotels.mockResolvedValue({ data: HOTELS });
});

it("tells the vendor that sub-categories do not limit the products they receive", async () => {
  render(
    <EditSubscriptionDrawer
      open
      onClose={jest.fn()}
      currentData={CURRENT}
      onSubmit={jest.fn()}
    />
  );

  await waitFor(() =>
    expect(screen.getByText("Sub-categories (Free)")).toBeInTheDocument()
  );
  expect(
    screen.getByText(/do not limit the products you receive/i)
  ).toBeInTheDocument();
});
