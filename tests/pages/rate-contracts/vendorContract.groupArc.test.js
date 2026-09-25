// Vendor — a live GROUP rate contract names the hotels it supplies and shows
// each line's committed and consumed quantity per hotel.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetContract: jest.fn(),
  vendorDeclineAddendum: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "77" }, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import VendorContractPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/index";

test("the hero and the consumption table show the group's hotels", async () => {
  ArcApi.vendorGetContract.mockResolvedValue({
    data: {
      contract: { id: 77, status: "active", vendor_name: "Alpha Linen", arc_number: "ARC-1" },
      arc: { arc_number: "ARC-1", title: "Linen group", is_group: true, hotel_name: "Goa Resort" },
      hotels: [
        { hotel_id: 3, name: "Goa Resort", city: "Goa", state: "Goa" },
        { hotel_id: 4, name: "Mumbai Suites", city: "Mumbai", state: "Maharashtra" },
      ],
      lines: [{
        id: 501, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5, committed_qty: 650, consumed_qty: 50,
        hotels: [
          { hotel_id: 3, committed_qty: 400, consumed_qty: 50 },
          { hotel_id: 4, committed_qty: 250, consumed_qty: 0 },
        ],
      }],
      callOffs: [],
      amendments: [],
      clarifications: [],
    },
  });

  render(<VendorContractPage />);

  expect(await screen.findByText("Group award · 2 hotels")).toBeInTheDocument();
  expect(screen.queryByText("Single-BU award")).not.toBeInTheDocument();
  expect(screen.getByText("Goa Resort, Mumbai Suites")).toBeInTheDocument();
  expect(screen.getAllByTitle("Goa Resort")[0]).toHaveTextContent("50 / 400");
  expect(screen.getAllByTitle("Mumbai Suites")[0]).toHaveTextContent("0 / 250");
});
