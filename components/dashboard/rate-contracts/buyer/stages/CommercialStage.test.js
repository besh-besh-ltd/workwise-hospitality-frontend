// ARC v2 — CommercialStage split-allocation % <-> Qty editor (client feedback #2).
//
// The qty<->pct conversion logic (setShareByQty re-balance + residue absorb,
// the derived-value line, the mid-edit mode re-seed, and the indicative_qty<=0
// guard) lives in non-exported closures inside CommercialStage/ItemRow, so we
// exercise it through the REAL component and assert OBSERVABLE behavior:
//   • the allocation payload the component would POST (∑ allocated_qty must
//     equal indicative_qty EXACTLY — the server invariant), and
//   • what the widget renders (derived %/qty line, re-seeded input, OQ6 guard).
// These are product-level assertions, not internal call-count checks.

// Child components + the API service are stubbed so the render is deterministic
// and no network/axios is touched. Factories return React nodes without JSX to
// stay valid under jest.mock hoisting.
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

// One quote row per vendor for the single item.
const quote = (vid, name, lineId, rate) => ({
  vendor_id: vid, vendor_name: name, quote_id: 100 + vid,
  quote_line_id: lineId, arc_item_id: ITEM,
  rate, gst_pct: 5, charges: 0, lead_time_days: 7, moq: null,
  line_pricing: null, technically_disqualified: false,
});
const award = (vid, lineId, qty) => ({
  arc_item_id: ITEM, awarded_vendor_id: vid, awarded_quote_line_id: lineId,
  allocated_qty: qty,
});

// Builds a getCommEval payload with a single item split across the given awards.
function payload({ indicative, uom = "litre", name, vendors, awards }) {
  return {
    comm_evaluation: { id: 1, status: "in_progress" },
    items: [{ id: ITEM, indicative_qty: indicative, uom, variant_name: name }],
    quotes: vendors.map((v) => quote(v.vid, v.name, v.lineId, v.rate)),
    clarifications: [],
    qualified_by_item: {}, // no technical restriction -> every vendor awardable
    awards,
  };
}

function renderStage(pl, { editable = true } = {}) {
  ArcApi.getCommEval.mockResolvedValue({ data: pl });
  ArcApi.saveAllocation.mockResolvedValue({ data: { comm_evaluation: {}, awards: [] } });
  const onRefresh = jest.fn().mockResolvedValue(undefined);
  render(
    <CommercialStage
      arc={{ id: 555 }}
      lifecycle={{ stages: [{ key: "technical", state: "skipped" }] }}
      stage={{ state: editable ? "active" : "complete", reason: null }}
      permissions={{ "arc-comm": ["read", "evaluate"], arc: [] }}
      onRefresh={onRefresh}
    />
  );
  return { onRefresh };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CommercialStage — qty split residue-absorb (∑ qty must equal indicative exactly)", () => {
  test("editing a vendor's qty on an indivisible 3-way split keeps ∑ == indicative and preserves the typed qty", async () => {
    // 3 vendors on an indivisible total of 100 (equal split = 33.34/33.33/33.33).
    const pl = payload({
      indicative: 100,
      name: "Cola Syrup",
      vendors: [
        { vid: 1, name: "Alpha", lineId: 101, rate: 90 },
        { vid: 2, name: "Beta", lineId: 102, rate: 95 },
        { vid: 3, name: "Gamma", lineId: 103, rate: 98 },
      ],
      awards: [award(1, 101, 33.34), award(2, 102, 33.33), award(3, 103, 33.33)],
    });
    renderStage(pl);
    await screen.findByText("Cola Syrup");

    // Open Alpha's split editor (first "Adjust share" = first vendor column).
    fireEvent.click(screen.getAllByRole("button", { name: "Adjust share" })[0]);

    // Default mode is Qty (OQ5) and indicative > 0, so the numeric input is a qty.
    const input = screen.getByRole("spinbutton");
    // Type a qty that forces a 2-dp rounding residue on the re-balanced others.
    fireEvent.change(input, { target: { value: "33.33" } });
    fireEvent.click(screen.getByTitle("Apply — others re-balance pro-rata"));

    await waitFor(() => expect(ArcApi.saveAllocation).toHaveBeenCalled());
    const body = ArcApi.saveAllocation.mock.calls[0][1];
    expect(body.item_id).toBe(ITEM);
    expect(body.allocations).toHaveLength(3);

    // THE server invariant: quantities reconcile EXACTLY to the indicative qty.
    const sum = body.allocations.reduce((s, a) => s + Number(a.allocated_qty), 0);
    expect(sum).toBeCloseTo(100, 6);

    // The edited vendor keeps exactly the typed qty; the rounding residue was
    // absorbed by one of the OTHER shares (not the edited one).
    const alpha = body.allocations.find((a) => Number(a.awarded_vendor_id) === 1);
    expect(Number(alpha.allocated_qty)).toBeCloseTo(33.33, 6);
    // No 0-qty rows leaked (would be silently dropped server-side).
    body.allocations.forEach((a) => expect(Number(a.allocated_qty)).toBeGreaterThan(0));
  });

  test("qty below the 0.01..indicative-0.01 bound is rejected client-side and never POSTs", async () => {
    const pl = payload({
      indicative: 100,
      name: "Cola Syrup",
      vendors: [
        { vid: 1, name: "Alpha", lineId: 101, rate: 90 },
        { vid: 2, name: "Beta", lineId: 102, rate: 95 },
      ],
      awards: [award(1, 101, 50), award(2, 102, 50)],
    });
    renderStage(pl);
    await screen.findByText("Cola Syrup");

    fireEvent.click(screen.getAllByRole("button", { name: "Adjust share" })[0]);
    const input = screen.getByRole("spinbutton");
    // 0 is out of bounds -> guard toasts and returns; nothing reaches the server.
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByTitle("Apply — others re-balance pro-rata"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(ArcApi.saveAllocation).not.toHaveBeenCalled();
  });
});

describe("CommercialStage — derived value display + mid-edit mode re-seed", () => {
  test("qty->pct derived line reads correctly, and switching mode re-seeds the box (no half-typed carry-over)", async () => {
    // 240/160 of 400 -> Alpha holds 60%.
    const pl = payload({
      indicative: 400,
      name: "Sugar",
      vendors: [
        { vid: 1, name: "Alpha", lineId: 201, rate: 90 },
        { vid: 2, name: "Beta", lineId: 202, rate: 95 },
      ],
      awards: [award(1, 201, 240), award(2, 202, 160)],
    });
    renderStage(pl);
    await screen.findByText("Sugar");

    fireEvent.click(screen.getAllByRole("button", { name: "Adjust share" })[0]);

    // Qty mode: box seeds to the current allocated qty (240), derived shows 60%.
    const input = screen.getByRole("spinbutton");
    expect(input.value).toBe("240");
    expect(screen.getByText(/≈\s*60% of 400/)).toBeInTheDocument();

    // Switch to % mode: the box must RE-SEED from the current allocation in the
    // new unit (60), NOT reinterpret the 240 that was in the qty box.
    fireEvent.click(screen.getByRole("button", { name: "%" }));
    const input2 = screen.getByRole("spinbutton");
    expect(input2.value).toBe("60");
    // pct mode derived line converts back to qty: 60% of 400 = 240.
    expect(screen.getByText(/≈\s*240 of 400/)).toBeInTheDocument();
  });
});

describe("CommercialStage — OQ6 degenerate indicative_qty<=0 guard", () => {
  test("an item with indicative_qty=0 forces % mode and disables the Qty toggle (no divide-by-zero)", async () => {
    const pl = payload({
      indicative: 0,
      name: "Zero Item",
      vendors: [
        { vid: 1, name: "Alpha", lineId: 301, rate: 90 },
        { vid: 2, name: "Beta", lineId: 302, rate: 95 },
      ],
      awards: [award(1, 301, 5), award(2, 302, 5)],
    });
    renderStage(pl);
    await screen.findByText("Zero Item");

    fireEvent.click(screen.getAllByRole("button", { name: "Adjust share" })[0]);

    // Qty toggle disabled, % forced active, input capped at the pct max (99.99).
    expect(screen.getByRole("button", { name: "Qty" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "%" })).toHaveClass("is-active");
    expect(screen.getByRole("spinbutton")).toHaveAttribute("max", "99.99");
  });
});
