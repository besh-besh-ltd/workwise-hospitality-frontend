// ARC v2 — Manual ARC Entry: a saved draft must come back whole, and open
// somewhere useful.
//
// Two halves of the client's report live here:
//
//   1. "my vendors are gone" — group D is a click-only step, so there was no
//      blur to hang the existing per-section autosave on, and saveDraft() sent
//      items + the scalar patch but never the vendors section (only finalize()
//      did). The vendor panel therefore lived in local state until finalize and
//      was dropped on save → exit → resume.
//
//   2. "it opens the wrong page" — resuming always landed on step 1 (Stage) and
//      made the user click through everything they had already filled. It now
//      opens the first step that still needs input.
//
// Product-level: drive the REAL page and assert what it sends / what it shows.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getManualDraft: jest.fn(),
  createManualDraft: jest.fn(),
  patchManualDraft: jest.fn(),
  saveManualSection: jest.fn(),
  finalizeManualArc: jest.fn(),
  uploadManualContractDoc: jest.fn(),
  listRootCategories: jest.fn(),
  listAccessibleHotels: jest.fn(),
  getSubCategories: jest.fn(),
  getDepartmentsForHotel: jest.fn(),
  searchVariants: jest.fn(),
  listEligibleVendors: jest.fn(),
  listAllVendors: jest.fn(),
}));

const replace = jest.fn();
let query = { d: "42" };
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    query,
    pathname: "/dashboard/buyer/rate-contracts/manual-entry",
    push: jest.fn(),
    replace,
  }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ManualArcEntryPage from "@/pages/dashboard/buyer/rate-contracts/manual-entry";

const HOTEL = { id: 3, name: "The Orchid Panchgani" };
const CATEGORY = { id: 7, title: "KST" };
const DEPT = { id: 9, title: "Engineering" };
const VENDOR = { id: 501, name: "Alpha Supplies", email: "alpha@example.com" };

// A draft saved at the Vendors step of a Draft-stage (S0) manual ARC: header,
// scope and provenance filled, nothing else yet.
const draft = (over = {}) => ({
  arc: {
    id: 42,
    arc_number: "ARC-2026-27-0007",
    title: "Manual backfill",
    description: "",
    type: "product",
    eligibility_type: "open",
    technical_response_required: false,
    sample_required: false,
    hotel_id: HOTEL.id,
    category_id: CATEGORY.id,
    department_id: DEPT.id,
    sub_category_ids: [],
    status: "draft",
    created_at: "2026-04-01 00:00:00",
    // A manual draft has no ARC-level date columns — the chain lives on
    // manual_entry.backdated_dates.
    submission_start_at: null,
    submission_end_at: null,
    contract_start_at: null,
    contract_end_at: null,
    payment_terms_expected: "",
    delivery_expected: "",
    penalty_clause: "",
  },
  manual_entry: {
    target_stage: "draft",
    eligibility_overridden: false,
    backdated_dates: { created_at: "2026-04-01T00:00" },
  },
  items: [],
  invitations: [],
  quotes: [],
  awards: [],
  contracts: [],
  ...over,
});

beforeEach(() => {
  query = { d: "42" };
  window.scrollTo = jest.fn();
  window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  ArcApi.listRootCategories.mockResolvedValue({ data: { categories: [CATEGORY] } });
  ArcApi.listAccessibleHotels.mockResolvedValue({ data: { hotels: [HOTEL] } });
  ArcApi.getSubCategories.mockResolvedValue({ data: { sub_categories: [] } });
  ArcApi.getDepartmentsForHotel.mockResolvedValue({ data: { departments: [DEPT] } });
  ArcApi.searchVariants.mockResolvedValue({ data: { variants: [], total: 0 } });
  ArcApi.listEligibleVendors.mockResolvedValue({ data: { vendors: [VENDOR] } });
  ArcApi.listAllVendors.mockResolvedValue({ data: { vendors: [VENDOR] } });
  ArcApi.saveManualSection.mockResolvedValue({ data: { ok: true } });
  ArcApi.patchManualDraft.mockResolvedValue({ data: { arc: {} } });
  ArcApi.getManualDraft.mockResolvedValue({ data: draft() });
});
afterEach(() => jest.clearAllMocks());

const sectionCalls = (name) =>
  ArcApi.saveManualSection.mock.calls.filter((c) => c[1] === name);

describe("Manual ARC Entry — resuming a saved draft", () => {
  test("opens the first step that still needs input, not step 1", async () => {
    render(<ManualArcEntryPage />);
    // Header/scope/provenance are filled, so Details is done; the Draft stage
    // needs at least one line item, so that is where the user belongs.
    expect(await screen.findByText("Resume Manual ARC Entry")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Rate schedule / line items")).toBeInTheDocument()
    );
    // The Stage step's own content is not what we opened on.
    expect(screen.queryByText(/Your choice tailors the rest of the steps/)).toBeNull();
  });

  test("a new entry is not mislabelled as a resume", async () => {
    query = {};
    render(<ManualArcEntryPage />);
    expect(await screen.findByText("Manual ARC Entry")).toBeInTheDocument();
    expect(screen.queryByText("Resume Manual ARC Entry")).toBeNull();
    expect(ArcApi.getManualDraft).not.toHaveBeenCalled();
  });

  test("the vendor panel comes back on resume", async () => {
    ArcApi.getManualDraft.mockResolvedValue({
      data: draft({ invitations: [{ vendor_id: VENDOR.id }] }),
    });
    render(<ManualArcEntryPage />);
    await screen.findByText("Resume Manual ARC Entry");

    // Hydrating what the server already holds must not write it straight back.
    await waitFor(() => expect(ArcApi.getManualDraft).toHaveBeenCalled());
    expect(sectionCalls("vendors")).toHaveLength(0);
  });
});

describe("Manual ARC Entry — the vendor panel is persisted", () => {
  test("picking a vendor autosaves group D", async () => {
    render(<ManualArcEntryPage />);
    await screen.findByText("Resume Manual ARC Entry");

    // Jump to the Vendors step in the rail and pick the vendor.
    fireEvent.click(await screen.findByText("Vendors"));
    fireEvent.click(await screen.findByText(VENDOR.name));

    // Real timers: the autosave is debounced by 600 ms.
    await waitFor(() => expect(sectionCalls("vendors")).toHaveLength(1), { timeout: 3000 });
    expect(sectionCalls("vendors")[0][2]).toEqual({
      vendors: [{ vendor_id: VENDOR.id, eligibility_overridden: undefined }],
    });
  });

  test("Save draft sends the vendor section, not just items", async () => {
    ArcApi.getManualDraft.mockResolvedValue({
      data: draft({ invitations: [{ vendor_id: VENDOR.id }] }),
    });
    render(<ManualArcEntryPage />);
    await screen.findByText("Resume Manual ARC Entry");

    fireEvent.click(screen.getByText("Save draft"));

    await waitFor(() => expect(sectionCalls("vendors")).toHaveLength(1));
    expect(sectionCalls("vendors")[0][2]).toEqual({
      vendors: [{ vendor_id: VENDOR.id, eligibility_overridden: undefined }],
    });
    expect(sectionCalls("items")).toHaveLength(1);
  });
});
