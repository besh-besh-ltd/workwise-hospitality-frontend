// LPRModal — the Retry button must actually retry, not crash.
//
// CONFIRMED DEFECT, found by `no-undef` after the negotiation P0 prompted
// adding ESLint. When the purchase-history fetch failed, the modal rendered an
// error strip with a Retry button wired to `setRetryCount`. No such state was
// ever declared, so clicking Retry threw
//
//     ReferenceError: setRetryCount is not defined
//
// …taking down the modal, on the one control whose entire purpose is recovering
// from the failure the user is looking at. Same shape as the P0: an identifier
// that was never defined, in a branch nothing tested.
//
// The fix declares `retryCount` and adds it to the fetch effect's deps, so
// pressing Retry re-runs the request. Both halves are asserted here — that it
// does not throw, and that it genuinely refetches.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getLastPurchaseDetails: jest.fn(),
}));

jest.mock("@/utils/sharedFunctions", () => ({
  __esModule: true,
  addCommasToNumber: (n) => String(n),
  formatDisplayDate: (d) => String(d),
  getEntityLabel: () => "Entity",
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getLastPurchaseDetails } from "@/services/rfq";
import LPRModal from "./LPRModal";

const renderModal = () =>
  render(<LPRModal show onHide={jest.fn()} variantId={42} RFQ_no={500001} />);

const retryButton = () => screen.getByRole("button", { name: /^Retry$/i });

beforeEach(() => {
  jest.clearAllMocks();
  // console.error is called by the component's own catch block.
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore?.();
});

describe("LPRModal retry", () => {
  test("clicking Retry does not throw, and refetches", async () => {
    getLastPurchaseDetails.mockRejectedValueOnce(new Error("network down"));
    renderModal();

    // The failure path renders the error strip and its Retry control.
    await screen.findByText(/Failed to load purchase history data/i);
    expect(getLastPurchaseDetails).toHaveBeenCalledTimes(1);

    // Pre-fix this threw ReferenceError and unmounted the modal.
    getLastPurchaseDetails.mockResolvedValueOnce([]);
    fireEvent.click(retryButton());

    // A second call is the whole point — a Retry that does not refetch is just
    // a button that clears an error message.
    await waitFor(() => expect(getLastPurchaseDetails).toHaveBeenCalledTimes(2));
  });

  test("a successful retry clears the error", async () => {
    getLastPurchaseDetails.mockRejectedValueOnce(new Error("network down"));
    renderModal();
    await screen.findByText(/Failed to load purchase history data/i);

    getLastPurchaseDetails.mockResolvedValueOnce([]);
    fireEvent.click(retryButton());

    await waitFor(() => {
      expect(
        screen.queryByText(/Failed to load purchase history data/i)
      ).not.toBeInTheDocument();
    });
  });
});
