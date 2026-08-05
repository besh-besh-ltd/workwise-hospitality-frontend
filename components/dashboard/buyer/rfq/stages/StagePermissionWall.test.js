// The RFQ stage panels must not render a stage the server marked unreadable.
//
// These panels are unusual: they render straight from the lifecycle payload —
// the PO list with vendor names and ₹ totals, per-product finalization and
// negotiation prices — rather than fetching from separately-gated endpoints the
// way the ARC page's stages do. The server therefore strips that detail before
// it leaves the API (rfqLifecycleShaper.redactUnreadableStages) and marks the
// stage can_read=false; this panel is the visible half of that gate.
//
// Guarding it here because ViewRFQ.test.js mocks these three components away.

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import PurchaseOrderStage from "./PurchaseOrderStage";
import TechnicalStage from "./TechnicalStage";
import NegotiationAwardStage from "./NegotiationAwardStage";

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ asPath: "/dashboard/buyer/rfq-management-details?id=1", query: {}, push: jest.fn() }),
}));

const RFQ = { id: 1, rfq_no: "536299" };

// What a redacted stage actually looks like on the wire: the detail is already
// gone, so the panel has nothing to render even if it tried.
const redacted = (key, label) => ({
  key, label, state: "active", reason: "in_progress",
  summary: null, action: null, can_read: false,
  phase: { key, label, status: "current" },
});

describe("RFQ stage panels — permission wall", () => {
  test("Purchase Order stage refuses to render when the server redacted it", () => {
    render(<PurchaseOrderStage rfq={RFQ} stage={redacted("purchase-order", "Purchase Order")} />);
    expect(screen.getByRole("heading", { name: /no permission to view/i })).toBeInTheDocument();
  });

  test("Technical stage refuses to render when the server redacted it", () => {
    render(<TechnicalStage rfq={RFQ} stage={redacted("technical", "Technical Evaluation")} />);
    expect(screen.getByRole("heading", { name: /no permission to view/i })).toBeInTheDocument();
  });

  test("Negotiation & Award stage refuses to render when the server redacted it", () => {
    render(<NegotiationAwardStage rfq={RFQ} stage={redacted("negotiation-award", "Negotiation & Award")} />);
    expect(screen.getByRole("heading", { name: /no permission to view/i })).toBeInTheDocument();
  });

  test("a readable stage renders normally — the wall is not on by default", () => {
    // can_read omitted entirely: older payloads and every non-redacted stage.
    // The gate is strictly `=== false`, so absence must not wall the stage.
    render(
      <PurchaseOrderStage
        rfq={RFQ}
        stage={{
          key: "purchase-order", label: "Purchase Order", state: "active",
          reason: "in_progress", summary: null, action: null,
          phase: { key: "purchase_order", label: "Purchase Order", status: "current", purchase_orders: [] },
        }}
      />
    );
    expect(screen.queryByRole("heading", { name: /no permission to view/i })).not.toBeInTheDocument();
  });
});
