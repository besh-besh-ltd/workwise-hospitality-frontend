// ARC v2 contracts list — a GROUP rate contract card says it covers several
// hotels (lead first) instead of reading like a single-hotel contract.

jest.mock("@/services/arc_v2", () => ({ __esModule: true, getContractsListView: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn(), isReady: true }),
}));
jest.mock("@/components/shared/FyFilter", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ContractsListPage from "./ContractsListPage";

const row = (over = {}) => ({
  id: 1, arc_number: "ARC-1", title: "Linen", status: "floated", category_title: "Housekeeping",
  hotel_name: "Goa Resort", created_at: "2026-09-01T10:00:00",
  item_names: [], product_variant_ids: [], awarded_vendors: [], invited_count: 0,
  committed_value: 0, consumed_value: 0, requested_amendments: 0, active_amendments: 0,
  ...over,
});

test("a group card names the lead hotel and how many hotels it covers", async () => {
  const rows = [
    row({ id: 1, title: "Linen group", is_group: true, hotel_ids: [3, 4, 5], hotel_names: ["Goa Resort", "Delhi Inn", "Mumbai Suites"] }),
    row({ id: 2, title: "Linen single", is_group: false, hotel_ids: [3], hotel_names: ["Goa Resort"] }),
  ];
  ArcApi.getContractsListView.mockResolvedValue({
    data: { rows, facets: {}, tab_counts: { all: rows.length }, total: rows.length, limit: 20 },
  });
  render(<ContractsListPage />);

  const group = (await screen.findByText("Linen group")).closest("a");
  expect(within(group).getByText("Group · 3 hotels")).toBeInTheDocument();
  expect(within(group).getByTitle("Goa Resort, Delhi Inn, Mumbai Suites")).toHaveTextContent("Goa Resort +2 more");

  const single = screen.getByText("Linen single").closest("a");
  expect(within(single).queryByText(/Group ·/)).not.toBeInTheDocument();
});
