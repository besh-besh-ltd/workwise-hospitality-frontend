// ARC create wizard — Group rate contracts (one contract, several hotels).
//
// Observable behaviour only: what the buyer sees on each step and what the
// wizard sends to the server.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getContractDetail: jest.fn(),
  listRootCategories: jest.fn(),
  listAccessibleHotels: jest.fn(),
  getSubCategories: jest.fn(),
  getDepartmentsForHotel: jest.fn(),
  searchVariants: jest.fn(),
  listEligibleVendors: jest.fn(),
  getUniversalTechEval: jest.fn(),
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  publish: jest.fn(),
  setupTechEval: jest.fn(),
  setupUniversalTechEval: jest.fn(),
}));
jest.mock("@/services/units", () => ({
  __esModule: true,
  getUnits: jest.fn(),
  addCustomUnit: jest.fn(),
}));

const push = jest.fn();
const replace = jest.fn();
let query = {};
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    query,
    pathname: "/dashboard/buyer/rate-contracts/create",
    push,
    replace,
    beforePopState: jest.fn(),
  }),
}));

import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import { getUnits } from "@/services/units";
import CreateRateContractPage from "@/pages/dashboard/buyer/rate-contracts/create";

const HOTELS = [
  { id: 3, name: "Goa Resort", city: "Goa" },
  { id: 4, name: "Head Office", city: "Mumbai", is_head_office: true },
  { id: 5, name: "Delhi Towers", city: "Delhi" },
];

const groupDraft = () => ({
  arc: {
    id: 42,
    title: "Group towels",
    type: "product",
    category_id: 7,
    hotel_id: 4,
    department_id: 9,
    eligibility_type: "open",
    technical_response_required: false,
    submission_start_at: "2026-10-01 11:00:00",
    submission_end_at: "2026-10-10 11:00:00",
    contract_start_at: "2026-11-01 00:00:00",
    contract_end_at: "2027-10-31 00:00:00",
    is_group: true,
    hotels: [
      { hotel_id: 4, name: "Head Office", is_lead: true },
      { hotel_id: 3, name: "Goa Resort", is_lead: false },
    ],
  },
  items: [{
    id: 101,
    product_variant_id: 11,
    variant_name: "Bath towel",
    variant_slug: "bath-towel",
    uom: "pcs",
    spec_text: "White, 600 gsm",
    indicative_qty: 750,
    hotel_qtys: [{ hotel_id: 3, indicative_qty: 400 }, { hotel_id: 4, indicative_qty: 350 }],
    tech_eval: null,
  }],
  invitations: [],
});

beforeEach(() => {
  query = {};
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  ArcApi.listRootCategories.mockResolvedValue({ data: { categories: [{ id: 7, title: "Linen" }] } });
  ArcApi.listAccessibleHotels.mockResolvedValue({ data: { hotels: HOTELS } });
  ArcApi.getSubCategories.mockResolvedValue({ data: { sub_categories: [] } });
  ArcApi.getDepartmentsForHotel.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }] } });
  ArcApi.searchVariants.mockResolvedValue({ data: { variants: [], total: 0 } });
  ArcApi.listEligibleVendors.mockResolvedValue({ data: { vendors: [] } });
  ArcApi.getUniversalTechEval.mockResolvedValue({ data: { clauses: [] } });
  ArcApi.updateDraft.mockResolvedValue({ data: { arc: { id: 42 }, items: [{ id: 101, product_variant_id: 11 }] } });
  getUnits.mockResolvedValue({ data: [{ id: 1, name: "pcs" }] });
});
afterEach(() => jest.clearAllMocks());

describe("create wizard — group rate contract", () => {
  test("choosing a group on the Business unit step: pick hotels, the Head Office leads, departments are shared ones", async () => {
    render(<CreateRateContractPage />);

    fireEvent.change(await screen.findByPlaceholderText("e.g. F&B Staples · BAB · Q3 2026"), { target: { value: "Group towels" } });
    fireEvent.click(await screen.findByText("Linen"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.click(await screen.findByText("Group of hotels"));
    const continueBtn = screen.getByRole("button", { name: /continue/i });

    fireEvent.click(screen.getByRole("checkbox", { name: /Goa Resort/ }));
    expect(continueBtn).toBeDisabled(); // one hotel is not a group

    fireEvent.click(screen.getByRole("checkbox", { name: /Head Office/ }));
    await waitFor(() =>
      expect(ArcApi.getDepartmentsForHotel).toHaveBeenLastCalledWith({ hotel_ids: [3, 4] })
    );
    expect(within(screen.getByRole("checkbox", { name: /Head Office/ })).getByText("Lead hotel")).toBeInTheDocument();
    await waitFor(() => expect(continueBtn).not.toBeDisabled());

    // Eligible vendors are looked up across every selected hotel.
    await waitFor(() =>
      expect(ArcApi.listEligibleVendors).toHaveBeenLastCalledWith({ category_id: 7, hotel_ids: [3, 4] })
    );
  });

  test("a resumed group draft reviews its hotels and saves the per-hotel split", async () => {
    query = { c: "42" };
    ArcApi.getContractDetail.mockResolvedValue({ data: groupDraft() });
    render(<CreateRateContractPage />);

    expect(await screen.findByText("Review & publish")).toBeInTheDocument();
    const review = screen.getByText("Review & publish").closest("section");
    expect(within(review).getByText(/Group · 2 hotels/)).toBeInTheDocument();
    expect(within(review).getByText(/Head Office/)).toBeInTheDocument();
    expect(within(review).getByText(/Goa Resort/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(ArcApi.updateDraft).toHaveBeenCalled());
    const [id, payload] = ArcApi.updateDraft.mock.calls[0];
    expect(id).toBe(42);
    expect(payload).toMatchObject({
      is_group: true,
      hotel_id: 4,
      hotel_ids: [3, 4],
      department_id: 9,
      items: [{
        product_variant_id: 11,
        uom: "pcs",
        hotel_qtys: [{ hotel_id: 3, qty: 400 }, { hotel_id: 4, qty: 350 }],
      }],
    });
    expect(payload.items[0]).not.toHaveProperty("indicative_qty");
  });

  test("the Items step takes a quantity per hotel and shows the total", async () => {
    query = { c: "42" };
    ArcApi.getContractDetail.mockResolvedValue({ data: groupDraft() });
    render(<CreateRateContractPage />);
    await screen.findByText("Review & publish");

    fireEvent.click(screen.getByRole("button", { name: /Items/ }));
    const goa = await screen.findByLabelText("Goa Resort quantity");
    const ho = screen.getByLabelText("Head Office quantity");
    expect(goa).toHaveValue(400);
    expect(ho).toHaveValue(350);
    expect(screen.getByText("750")).toBeInTheDocument();

    fireEvent.change(goa, { target: { value: "" } });
    fireEvent.change(ho, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();

    fireEvent.change(goa, { target: { value: "120" } });
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
  });
});
