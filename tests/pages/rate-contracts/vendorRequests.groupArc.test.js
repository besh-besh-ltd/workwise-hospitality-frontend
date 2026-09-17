// Vendor — rate contract requests list marks a GROUP rate contract and how
// many hotels the vendor was invited for.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorListRequests: jest.fn(),
  vendorListPendingAcceptance: jest.fn(),
  vendorListActiveContracts: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import VendorRequestsPage from "@/pages/dashboard/vendor/rate-contracts/requests";

const future = new Date(Date.now() + 7 * 864e5).toISOString();

test("a group invitation says it covers the hotels the vendor was invited for", async () => {
  ArcApi.vendorListRequests.mockResolvedValue({
    data: {
      requests: [
        { id: 1, arc_number: "ARC-1", title: "Linen group", status: "floated", submission_end_at: future, is_group: true, invited_hotel_ids: [3, 4] },
        { id: 2, arc_number: "ARC-2", title: "Linen single", status: "floated", submission_end_at: future, is_group: false, invited_hotel_ids: [5] },
      ],
    },
  });
  ArcApi.vendorListPendingAcceptance.mockResolvedValue({ data: { contracts: [] } });
  ArcApi.vendorListActiveContracts.mockResolvedValue({ data: { contracts: [] } });

  render(<VendorRequestsPage />);

  expect(await screen.findByText("Linen group")).toBeInTheDocument();
  expect(screen.getByText("Group · 2 hotels")).toBeInTheDocument();
  expect(screen.getAllByText(/Group ·/)).toHaveLength(1);
});
