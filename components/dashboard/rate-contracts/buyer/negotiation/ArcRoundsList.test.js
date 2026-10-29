// ArcRoundsList.test.js — the round cards on the ARC commercial stage.
//
// THE TICKET (Phileein, 22 Oct 2026): approvers opening a round awaiting their
// approval read "No revised quotes submitted yet." and no target. The card read
// only the legacy target_price column (NULL on every production ARC round —
// the targets live in products[].vendor_targets[].fields) and printed the same
// empty-quotes line whatever the round's state, including rounds no vendor had
// been shown yet. Production ARC-2026-27-0006 had 8 rounds; 7 lapsed before
// approval and not one reached a vendor.

const pushMock = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ push: (...a) => pushMock(...a), query: {}, isReady: true }),
}));

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getArcNegotiationRoundQuotes: jest.fn(() => Promise.resolve({ data: { quotes: [] } })),
  closeArcNegotiationRound: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ArcRoundsList from "./ArcRoundsList";

const ARC_ID = 8;
const PANEER = 31;
const VENDOR = 807;
const items = [{ id: PANEER, variant_name: "PANEER TABELA" }];

const round = (over = {}) => ({
  id: 8,
  round_number: 8,
  status: "PENDING_APPROVAL",
  effective_status: "PENDING_APPROVAL",
  end_date: "2026-10-25T06:30:00.000Z",
  vendor_ids: [VENDOR],
  target_price: null,
  arc_item_id: null,
  approved_at: null,
  published_at: null,
  products: [
    { arc_item_id: PANEER, vendor_targets: [{ vendor_id: VENDOR, fields: [{ name: "base_price", target: "200" }] }] },
  ],
  ...over,
});

const renderList = (r, vendors = []) =>
  render(<ArcRoundsList rounds={[r]} arcId={ARC_ID} items={items} vendors={vendors} canEvaluate onAfterChange={jest.fn()} />);

const expand = () => fireEvent.click(screen.getByRole("button", { name: /view quotes/i }));

beforeEach(() => jest.clearAllMocks());

describe("the targets on the card", () => {
  it("reads them from the round's products, per item", () => {
    renderList(round());
    expect(screen.getByText("PANEER TABELA · Base price ₹200")).toBeInTheDocument();
  });

  it("still reads a legacy single-item round's target_price", () => {
    renderList(round({ products: null, arc_item_id: PANEER, arc_item_name: "PANEER TABELA", target_price: "150.00" }));
    expect(screen.getByText("PANEER TABELA · Base price ₹150")).toBeInTheDocument();
  });

  it("names an ask on the whole rate contract", () => {
    renderList(round({
      products: [{ is_arc_level: true, vendor_targets: [{ vendor_id: VENDOR, fields: [{ name: "payment_terms", target: "45 days" }] }] }],
    }));
    expect(screen.getByText("Whole rate contract · Payment terms 45 days")).toBeInTheDocument();
  });

  it("names the vendor when the round asks more than one", () => {
    renderList(round({
      vendor_ids: [VENDOR, 808],
      products: [{
        arc_item_id: PANEER,
        vendor_targets: [
          { vendor_id: VENDOR, fields: [{ name: "base_price", target: "200" }] },
          { vendor_id: 808, fields: [{ name: "base_price", target: "210" }] },
        ],
      }],
    }), [{ vendor_id: VENDOR, vendor_name: "Shree Dairy" }, { vendor_id: 808, vendor_name: "Gokul Milk" }]);
    expect(screen.getByText("PANEER TABELA · Shree Dairy · Base price ₹200")).toBeInTheDocument();
    expect(screen.getByText("PANEER TABELA · Gokul Milk · Base price ₹210")).toBeInTheDocument();
  });
});

describe("what the expanded card says when there are no revised quotes", () => {
  it("awaiting approval: vendors have not been shown the round", async () => {
    renderList(round());
    expand();
    expect(await screen.findByText("Vendors see this round once it is approved.")).toBeInTheDocument();
    expect(screen.queryByText(/No revised quotes submitted yet/)).not.toBeInTheDocument();
    expect(ArcApi.getArcNegotiationRoundQuotes).not.toHaveBeenCalled();
  });

  it("live: waiting for vendors, with the closing time", async () => {
    renderList(round({ status: "ACTIVE", effective_status: "ACTIVE", approved_at: "2026-10-24T06:00:00.000Z" }));
    expand();
    expect(await screen.findByText(/Waiting for vendors — closes 25 Oct 2026, 12:00 PM IST/)).toBeInTheDocument();
  });

  it("closed after going live: nobody responded", async () => {
    renderList(round({ status: "ENDED", effective_status: "ENDED", approved_at: "2026-10-24T06:00:00.000Z" }));
    expand();
    expect(await screen.findByText("No vendor responded before the round closed.")).toBeInTheDocument();
  });

  it("lapsed while awaiting approval: no vendor ever saw it", async () => {
    renderList(round({ status: "EXPIRED", effective_status: "EXPIRED" }));
    expand();
    expect(await screen.findByText("This round lapsed before it was approved, so no vendor saw it.")).toBeInTheDocument();
    expect(ArcApi.getArcNegotiationRoundQuotes).not.toHaveBeenCalled();
  });

  it("rejected: no vendor saw it", async () => {
    renderList(round({ status: "CANCELLED", effective_status: "CANCELLED" }));
    expand();
    expect(await screen.findByText("This round was rejected, so no vendor saw it.")).toBeInTheDocument();
    expect(ArcApi.getArcNegotiationRoundQuotes).not.toHaveBeenCalled();
  });
});

describe("the round page", () => {
  it("links to the round in the negotiation command center", () => {
    renderList(round());
    expect(screen.getByRole("link", { name: /open round/i })).toHaveAttribute(
      "href",
      "/dashboard/buyer/negotiation/round/8"
    );
  });
});
