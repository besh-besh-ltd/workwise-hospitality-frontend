// ARC v2 — the create wizard must hand a Manual ARC back to its own workspace.
//
// Belt-and-braces for the routing fix: an old link, a bookmark or a pasted URL
// can still point …/create?c=<id> at a manual draft. Hydrating one here puts the
// user on a wizard that cannot represent their record — the backdated date chain
// lives on the manual-entry row, not on the ARC's date columns, so the resume
// heuristic lands on Items with nothing to continue past — and a save would
// reconcile the manually entered rate schedule away.

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

const replace = jest.fn();
const push = jest.fn();
let query = { c: "42" };
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
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import { getUnits } from "@/services/units";
import CreateRateContractPage from "@/pages/dashboard/buyer/rate-contracts/create";

const arc = (over = {}) => ({
  id: 42,
  title: "Manual backfill",
  type: "product",
  category_id: 7,
  hotel_id: 3,
  department_id: 9,
  eligibility_type: "open",
  // A manual draft's date columns are NULL — the backdated chain lives on
  // tbl_arc_manual_entry.backdated_dates.
  submission_start_at: null,
  submission_end_at: null,
  contract_start_at: null,
  contract_end_at: null,
  ...over,
});

beforeEach(() => {
  query = { c: "42" };
  // jsdom has no scrollTo; the wizard calls it on every step change.
  window.scrollTo = jest.fn();
  ArcApi.listRootCategories.mockResolvedValue({ data: { categories: [{ id: 7, title: "KST" }] } });
  ArcApi.listAccessibleHotels.mockResolvedValue({ data: { hotels: [{ id: 3, name: "The Orchid Panchgani" }] } });
  ArcApi.getSubCategories.mockResolvedValue({ data: { sub_categories: [] } });
  ArcApi.getDepartmentsForHotel.mockResolvedValue({ data: { departments: [{ id: 9, title: "Engineering" }] } });
  ArcApi.searchVariants.mockResolvedValue({ data: { variants: [], total: 0 } });
  ArcApi.listEligibleVendors.mockResolvedValue({ data: { vendors: [] } });
  ArcApi.getUniversalTechEval.mockResolvedValue({ data: { clauses: [] } });
  getUnits.mockResolvedValue({ data: [] });
});
afterEach(() => jest.clearAllMocks());

describe("create wizard — a Manual ARC is handed back to its own workspace", () => {
  test("?c=<manual draft> redirects to the Manual ARC workspace", async () => {
    ArcApi.getContractDetail.mockResolvedValue({
      data: { arc: arc({ is_manual: true, manual_target_stage: "draft" }), items: [], invitations: [] },
    });

    render(<CreateRateContractPage />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/dashboard/buyer/rate-contracts/manual-entry?d=42")
    );
    // Never repaints as a create-wizard draft on the way out.
    expect(screen.queryByText("Resume Rate Contract draft")).toBeNull();
  });

  test("?c=<ordinary draft> still hydrates here", async () => {
    ArcApi.getContractDetail.mockResolvedValue({
      data: {
        arc: arc({
          is_manual: false,
          submission_start_at: "2026-10-01 11:00:00",
          submission_end_at: "2026-10-10 11:00:00",
          contract_start_at: "2026-11-01 00:00:00",
          contract_end_at: "2027-10-31 00:00:00",
        }),
        items: [],
        invitations: [],
      },
    });

    render(<CreateRateContractPage />);

    expect(await screen.findByText("Resume Rate Contract draft")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
