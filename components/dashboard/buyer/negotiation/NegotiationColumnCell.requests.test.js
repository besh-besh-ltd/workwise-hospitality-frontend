// NegotiationColumnCell is rendered once per product row of the RFQ table
// (inquiries-details, buyer and vendor views). Each cell used to request
// GET /negotiation/rounds/:rfq?rfq_product_id=<its product> — N requests per
// table. The cells mounting together now share ONE request for the whole RFQ
// and keep the rounds covering their own product.

jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn(), query: {} }) }));
const mockGet = jest.fn();
jest.mock("@/lib/axios", () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import NegotiationColumnCell from "./NegotiationColumnCell";
import { clearRequestCache } from "@/utils/requestCache";

const ROUNDS = [
  { id: 1, rfq_product_id: 11, round_number: 1, status: "COMPLETED", created_by_name: "Asha" },
  { id: 2, rfq_product_id: 11, round_number: 2, status: "COMPLETED", created_by_name: "Asha" },
  { id: 3, rfq_product_id: null, round_number: 3, status: "COMPLETED", created_by_name: "Vineet",
    products: [{ rfq_product_id: 11 }, { rfq_product_id: 12 }] },
];

const Table = ({ ids, token }) => (
  <table><tbody>
    {ids.map((id) => (
      <tr key={id}><NegotiationColumnCell rfq_id={720} rfq_product_id={id} token={token} /></tr>
    ))}
  </tbody></table>
);

beforeEach(() => {
  clearRequestCache();
  mockGet.mockReset().mockResolvedValue({ status: 1, data: ROUNDS, vendors: {} });
});

it("N cells → one rounds request, each cell showing its own product's rounds", async () => {
  const onLoaded = jest.fn();
  render(
    <table><tbody>
      {[11, 12, 13].map((id) => (
        <tr key={id}><NegotiationColumnCell rfq_id={720} rfq_product_id={id} onStatusLoaded={(has) => onLoaded(id, has)} /></tr>
      ))}
    </tbody></table>
  );

  await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(3));
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0][0]).toBe("/negotiation/rounds/720");

  // Product 11: three rounds (two legacy + the multi round); 12: the multi
  // round only; 13: none.
  expect(onLoaded).toHaveBeenCalledWith(11, true);
  expect(onLoaded).toHaveBeenCalledWith(12, true);
  expect(onLoaded).toHaveBeenCalledWith(13, false);
  expect(screen.getByText("3")).toBeInTheDocument(); // "3 Rounds" on product 11
  expect(screen.getAllByText("R3")).toHaveLength(2);
  expect(screen.getByText("N/A")).toBeInTheDocument();
});

it("carries the vendor magic-link token on the shared request", async () => {
  render(<Table ids={[11, 12]} token="tok-abc" />);
  await waitFor(() => expect(screen.getAllByText("R3")).toHaveLength(2));
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0][0]).toBe("/negotiation/rounds/720?token=tok-abc");
});

it("a later remount asks again (nothing is kept after the request settles)", async () => {
  const { unmount } = render(<Table ids={[11]} />);
  await waitFor(() => expect(screen.getByText("R3")).toBeInTheDocument());
  unmount();
  render(<Table ids={[11]} />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
});
