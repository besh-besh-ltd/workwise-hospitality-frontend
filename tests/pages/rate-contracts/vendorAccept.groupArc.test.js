// Vendor — accepting a GROUP rate contract. The award names the hotels the
// vendor supplies and each line's quantity per hotel. The committed quantity
// of a group award is not open to clarification (it is a sum across hotels),
// so it is not offered.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetContract: jest.fn(),
  vendorRequestOtp: jest.fn(),
  vendorVerifyOtp: jest.fn(),
  vendorDeclineContract: jest.fn(),
  vendorRequestClarification: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "77" }, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import VendorAcceptPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/accept";

test("a group award names its hotels, splits each line by hotel and keeps quantity out of disputes", async () => {
  ArcApi.vendorGetContract.mockResolvedValue({
    data: {
      contract: { id: 77, status: "awaiting_acceptance", vendor_name: "Alpha Linen" },
      arc: { arc_number: "ARC-1", title: "Linen group", is_group: true, hotel_name: "Goa Resort" },
      hotels: [
        { hotel_id: 3, name: "Goa Resort", city: "Goa", state: "Goa" },
        { hotel_id: 4, name: "Mumbai Suites", city: "Mumbai", state: "Maharashtra" },
      ],
      lines: [{
        id: 501, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5, committed_qty: 650,
        hotels: [
          { hotel_id: 3, committed_qty: 400, consumed_qty: 0 },
          { hotel_id: 4, committed_qty: 250, consumed_qty: 0 },
        ],
      }],
      clarifications: [],
    },
  });

  render(<VendorAcceptPage />);

  expect(await screen.findByText("2 hotels")).toBeInTheDocument();
  expect(screen.getByTitle("Goa Resort")).toHaveTextContent("400");
  expect(screen.getByTitle("Mumbai Suites")).toHaveTextContent("250");

  fireEvent.click(screen.getByText("Flag for clarification"));
  const select = screen.getByRole("combobox");
  expect(within(select).queryByRole("option", { name: "Committed quantity" })).not.toBeInTheDocument();
  expect(within(select).getByRole("option", { name: "Base price / unit rate" })).toBeInTheDocument();
});
