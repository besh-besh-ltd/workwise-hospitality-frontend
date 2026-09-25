// ARC v2 — CommercialStage for a GROUP rate contract (one ARC, several hotels).
//
// Vendors quote one rate per item for the whole group, but the award is made
// hotel by hotel: each hotel's expected quantity goes to a vendor that was
// invited for that hotel. A vendor can win only the hotels it was invited for.
// A hotel no invited vendor quoted for stays without a supplier; that does not
// block finalising, and the finalize response names it.
//
// Asserted through the real component: the allocation payload it posts and
// what it renders.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getCommEval: jest.fn(),
  saveAllocation: jest.fn(),
  finalizeCommEval: jest.fn(),
  sendBackCommEvalToTech: jest.fn(),
  reviseClarification: jest.fn(),
  upholdClarification: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("./StageShared", () => ({
  __esModule: true,
  StageNoPermission: () => null,
  StageReadOnlyBanner: (props) => props.children,
  StageSkeleton: () => null,
}));
jest.mock("./StageAside", () => ({
  __esModule: true,
  StageColumns: (props) => props.children,
  ActorFlowCard: () => null,
}));
jest.mock(
  "@/components/dashboard/rate-contracts/buyer/negotiation/ArcNegotiationPanel",
  () => ({ __esModule: true, default: () => null })
);

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import { toast } from "react-toastify";
import CommercialStage from "./CommercialStage";

const ITEM = 900;
const GOA = 3;
const MUMBAI = 4;

const quote = (vid, name, lineId, rate) => ({
  vendor_id: vid, vendor_name: name, quote_id: 100 + vid,
  quote_line_id: lineId, arc_item_id: ITEM,
  rate, gst_pct: 5, charges: 0, lead_time_days: 7, moq: null,
  line_pricing: null, technically_disqualified: false,
});

// Alpha (₹100) is invited for Goa and Mumbai; Beta (₹90) only for Mumbai.
function groupPayload({ invitationHotels = { 1: [GOA, MUMBAI], 2: [MUMBAI] }, awards = [] } = {}) {
  return {
    arc: { id: 555, is_group: true },
    comm_evaluation: { id: 1, status: "in_progress" },
    items: [{ id: ITEM, indicative_qty: 650, uom: "pcs", variant_name: "Bath towel" }],
    quotes: [quote(1, "Alpha Linen", 11, 100), quote(2, "Beta Textiles", 12, 90)],
    clarifications: [],
    qualified_by_item: {},
    awards,
    hotels: [
      { hotel_id: GOA, name: "Goa Resort", city: "Goa", state: "Goa", is_lead: true },
      { hotel_id: MUMBAI, name: "Mumbai Suites", city: "Mumbai", state: "Maharashtra", is_lead: false },
    ],
    item_hotel_qtys: {
      [ITEM]: [
        { hotel_id: GOA, indicative_qty: 400 },
        { hotel_id: MUMBAI, indicative_qty: 250 },
      ],
    },
    invitation_hotels: invitationHotels,
  };
}

function renderStage(pl) {
  ArcApi.getCommEval.mockResolvedValue({ data: pl });
  ArcApi.saveAllocation.mockResolvedValue({ data: { comm_evaluation: {}, awards: [] } });
  const onRefresh = jest.fn().mockResolvedValue(undefined);
  render(
    <CommercialStage
      arc={{ id: 555 }}
      lifecycle={{ stages: [{ key: "technical", state: "skipped" }] }}
      stage={{ state: "active", reason: null }}
      permissions={{ "arc-comm": ["read", "evaluate"], arc: [] }}
      onRefresh={onRefresh}
    />
  );
  return { onRefresh };
}

const allocationsPosted = () => ArcApi.saveAllocation.mock.calls[0][1].allocations;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CommercialStage — group rate contract", () => {
  test("shows each hotel's quantity and awards one hotel to a vendor invited for it", async () => {
    renderStage(groupPayload());
    await screen.findByText("Bath towel");

    expect(screen.getByText("Goa Resort")).toBeInTheDocument();
    expect(screen.getByText("Mumbai Suites")).toBeInTheDocument();
    // Beta was not invited for Goa, so it cannot be awarded Goa.
    expect(screen.queryByRole("button", { name: "Award Goa Resort to Beta Textiles" })).not.toBeInTheDocument();
    expect(screen.getByText("Not invited")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Award Goa Resort to Alpha Linen" }));

    await waitFor(() => expect(ArcApi.saveAllocation).toHaveBeenCalled());
    expect(ArcApi.saveAllocation.mock.calls[0][1].item_id).toBe(ITEM);
    expect(allocationsPosted()).toEqual([
      expect.objectContaining({ awarded_vendor_id: 1, awarded_quote_line_id: 11, allocated_qty: 400, hotel_id: GOA }),
    ]);
  });

  test("awarding a vendor on the item awards every hotel it was invited for, keeping other hotels' awards", async () => {
    renderStage(groupPayload({
      invitationHotels: { 1: [GOA, MUMBAI], 2: [GOA, MUMBAI] },
      awards: [{
        arc_item_id: ITEM, awarded_vendor_id: 2, awarded_quote_line_id: 12, allocated_qty: 250,
        hotels: [{ hotel_id: MUMBAI, allocated_qty: 250 }],
      }],
    }));
    await screen.findByText("Bath towel");

    // Alpha takes the whole group — both hotels.
    fireEvent.click(screen.getByRole("button", { name: "Award every invited hotel to Alpha Linen" }));

    await waitFor(() => expect(ArcApi.saveAllocation).toHaveBeenCalled());
    const posted = allocationsPosted();
    expect(posted).toHaveLength(2);
    expect(posted).toEqual(expect.arrayContaining([
      expect.objectContaining({ awarded_vendor_id: 1, hotel_id: GOA, allocated_qty: 400 }),
      expect.objectContaining({ awarded_vendor_id: 1, hotel_id: MUMBAI, allocated_qty: 250 }),
    ]));
  });

  test("auto-pick L1 takes the cheapest vendor invited for each hotel", async () => {
    renderStage(groupPayload());
    await screen.findByText("Bath towel");

    fireEvent.click(screen.getByRole("button", { name: /auto-pick l1/i }));

    await waitFor(() => expect(ArcApi.saveAllocation).toHaveBeenCalled());
    const posted = allocationsPosted();
    expect(posted).toHaveLength(2);
    // Beta is cheaper but only serves Mumbai; Goa goes to Alpha.
    expect(posted).toEqual(expect.arrayContaining([
      expect.objectContaining({ awarded_vendor_id: 1, hotel_id: GOA, allocated_qty: 400, l_rank: "L2" }),
      expect.objectContaining({ awarded_vendor_id: 2, hotel_id: MUMBAI, allocated_qty: 250, l_rank: "L1", is_l1_default: true }),
    ]));
  });

  test("a hotel awardable but not yet awarded blocks finalising", async () => {
    renderStage(groupPayload({
      awards: [{
        arc_item_id: ITEM, awarded_vendor_id: 1, awarded_quote_line_id: 11, allocated_qty: 400,
        hotels: [{ hotel_id: GOA, allocated_qty: 400 }],
      }],
    }));
    await screen.findByText("Bath towel");

    expect(screen.getByRole("button", { name: /finalize & send to committee/i })).toBeDisabled();
  });

  test("a hotel no invited vendor quoted for does not block finalising, and is reported", async () => {
    ArcApi.finalizeCommEval.mockResolvedValue({ data: { unawarded: [{ item_id: ITEM, hotel_id: MUMBAI }] } });
    const { onRefresh } = renderStage(groupPayload({
      invitationHotels: { 1: [GOA], 2: [GOA] },
      awards: [{
        arc_item_id: ITEM, awarded_vendor_id: 1, awarded_quote_line_id: 11, allocated_qty: 400,
        hotels: [{ hotel_id: GOA, allocated_qty: 400 }],
      }],
    }));
    await screen.findByText("Bath towel");

    expect(screen.getByText("No invited vendor quoted")).toBeInTheDocument();
    const finalize = screen.getByRole("button", { name: /finalize & send to committee/i });
    expect(finalize).toBeEnabled();
    fireEvent.click(finalize);

    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(toast.warn).toHaveBeenCalledWith(expect.stringMatching(/1 hotel.*without a supplier/i));
  });
});
