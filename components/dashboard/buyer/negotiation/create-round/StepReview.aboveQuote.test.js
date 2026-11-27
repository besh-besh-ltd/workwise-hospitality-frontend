// REQ-2026-0104 — the review step (and the approver's read-only copy of it)
// says plainly when a round asks a vendor to RAISE a price: the target row is
// marked "above quote", a banner explains it, and the remarks box is required
// in the wizard.

jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import StepReview from "./StepReview";
import { getVendorPriceData } from "./negotiationHelpers";

const product = {
  id: 11,
  quantity: 5,
  product_details: [{ name: "PVC gland" }],
  product_vendors: [{ id: 7 }],
  quotations: [{
    id: 511,
    vendor_id: 7,
    vendor_details: { id: 7, name: "KEEC" },
    quote_details: [{ unit_price: 100, quantity: 5, tax: 18, tax_mode: "percentage", total_price: 590, other_charges: [] }],
  }],
};

const common = {
  products: [product],
  chargeNamesList: [],
  mode: "product",
  step3Errors: [],
};

const renderWizard = (target, extra = {}) =>
  render(
    <StepReview
      {...common}
      product={product}
      productPriceData={getVendorPriceData(product)}
      selectedVendorIds={[7]}
      vendorTargets={{}}
      effectiveFields={["base_price"]}
      formData={{ end_date: "2026-11-27T18:30", negotiation_fields: ["base_price"], target_base_price: target }}
      queuedRounds={[]}
      remarks=""
      onRemarksChange={() => {}}
      {...extra}
    />
  );

test("a target above the quote is marked, explained, and remarks are required", () => {
  renderWizard("110", { remarksRequired: true });
  expect(screen.getByText("+₹10 above quote")).toBeInTheDocument();
  expect(screen.getByTestId("review-above-quote-banner")).toHaveTextContent("asks a vendor to raise a price");
  expect(screen.getByTestId("remarks-required-hint")).toBeInTheDocument();
  expect(screen.getByLabelText(/Remarks for approvers/)).toHaveAttribute("aria-required", "true");
});

test("a lower target looks as before: no banner, no required hint", () => {
  renderWizard("95", { remarksRequired: false });
  expect(screen.getByText("−₹5")).toBeInTheDocument();
  expect(screen.queryByTestId("review-above-quote-banner")).toBeNull();
  expect(screen.queryByTestId("remarks-required-hint")).toBeNull();
});

test("the approver's read-only review shows the same marking", () => {
  render(
    <StepReview
      {...common}
      product={null}
      productPriceData={{ vendors: [], l1: null }}
      selectedVendorIds={[]}
      vendorTargets={{}}
      effectiveFields={[]}
      formData={{ end_date: "2026-11-27 13:00:00", negotiation_fields: [] }}
      queuedRounds={[{
        mode: "product",
        rfq_product_id: 11,
        productName: "PVC gland",
        vendor_targets: [{ vendor_id: 7, fields: [{ name: "base_price", target: 110 }] }],
      }]}
      readOnly
    />
  );
  expect(screen.getByText("+₹10 above quote")).toBeInTheDocument();
  expect(screen.getByTestId("review-above-quote-banner")).toBeInTheDocument();
  expect(screen.queryByTestId("remarks-required-hint")).toBeNull();
});
