import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FinalizeVendorModal from "./FinalizeVendorModal";

const base = (rej) => ({
  show: true, onHide: () => {}, onConfirm: () => {}, vendorName: "Acme", vendorId: 11, quotedPrice: 100,
  productDetails: [{ product_name: "Sofa" }], alreadyFinalized: [], rfqId: 536263, vendorRejections: rej ? [rej] : [],
});
const REJ = { vendor_id: 11, po_number: "1387", rejection_type: "approver", reason_category: "RENEGOTIATE", rejected_by_name: "Vishal", rejected_at: "2026-09-11T07:43:06Z", rejection_reason: "too dear" };

describe("FinalizeVendorModal: approver rejection reason", () => {
  test("shows the reason label and the create-round link for RENEGOTIATE", () => {
    render(<FinalizeVendorModal {...base(REJ)} />);
    expect(screen.getByText(/Re-negotiate or change the vendor/)).toBeInTheDocument();
    expect(screen.getByText("too dear")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create negotiation round" })).toHaveAttribute("href", "/dashboard/buyer/negotiation/536263/create");
  });

  test("another reason shows its label but no link", () => {
    render(<FinalizeVendorModal {...base({ ...REJ, reason_category: "NOT_REQUIRED" })} />);
    expect(screen.getByText(/Not needed any more/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create negotiation round" })).toBeNull();
  });

  test("null reason_category renders today's panel", () => {
    render(<FinalizeVendorModal {...base({ ...REJ, reason_category: null })} />);
    expect(screen.getByText("Last PO rejected by approver")).toBeInTheDocument();
    expect(screen.queryByText(/Rejected for/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Create negotiation round" })).toBeNull();
  });

  test("a vendor rejection is unchanged even if reason_category is RENEGOTIATE", () => {
    render(<FinalizeVendorModal {...base({ ...REJ, rejection_type: "vendor" })} />);
    expect(screen.getByText("Last PO rejected by vendor")).toBeInTheDocument();
    expect(screen.queryByText(/Rejected for/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Create negotiation round" })).toBeNull();
  });
});

describe("FinalizeVendorModal: a PO cancelled as not needed", () => {
  const CANCEL = { ...REJ, route: "CANCEL", reason_category: "NOT_REQUIRED", rejection_reason: "Event called off" };

  test("reads as cancelled, never rejected, and offers no negotiation round", () => {
    render(<FinalizeVendorModal {...base(CANCEL)} />);
    expect(screen.getByText("PO #1387 cancelled: not needed any more")).toBeInTheDocument();
    expect(screen.getByText(/Make sure it is still needed before re-awarding/)).toBeInTheDocument();
    expect(screen.getByText("Event called off")).toBeInTheDocument();
    expect(screen.queryByText(/reject/i)).toBeNull();
    expect(screen.queryByRole("link", { name: "Create negotiation round" })).toBeNull();
  });
});
