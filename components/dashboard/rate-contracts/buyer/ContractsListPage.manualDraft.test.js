// ARC v2 — a Manual ARC draft card must open the Manual ARC workspace.
//
// The client's report: saving a Manual ARC as a draft and coming back to it
// dropped them on an Item search screen they could not get past. Cause: every
// draft card linked to the create wizard (…/create?c=<id>) because nothing in
// the payload said which kind of draft it was. The two wizards do not line up —
// the manual one's step 3 is Vendors, the create one's is Item search — so the
// user landed on a page that could not represent their record, and a save there
// would have reconciled the manually entered rate schedule away.
//
// Product-level: render the REAL list page against a stubbed list-view response
// and assert the href the card actually carries.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getContractsListView: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn(), isReady: true }),
}));
jest.mock("@/components/shared/FyFilter", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ContractsListPage from "./ContractsListPage";

const row = (over = {}) => ({
  id: 1,
  arc_number: "ARC-2026-27-0001",
  title: "Untitled draft",
  status: "draft",
  category_title: "KST",
  hotel_name: "The Orchid Panchgani",
  created_at: "2026-09-01T10:00:00",
  item_names: [],
  product_variant_ids: [],
  awarded_vendors: [],
  invited_count: 0,
  committed_value: 0,
  consumed_value: 0,
  requested_amendments: 0,
  active_amendments: 0,
  ...over,
});

function respond(rows) {
  ArcApi.getContractsListView.mockResolvedValue({
    data: { rows, facets: {}, tab_counts: { all: rows.length }, total: rows.length, limit: 20 },
  });
}

// The card is the <a> wrapping the row title.
const cardFor = async (title) =>
  (await screen.findByText(title)).closest("a");

describe("ARC contracts list — routing a draft to the wizard that owns it", () => {
  afterEach(() => jest.clearAllMocks());

  test("a manual draft opens the Manual ARC workspace, not the create wizard", async () => {
    respond([row({ id: 42, title: "Manual backfill", is_manual: true })]);
    render(<ContractsListPage filterPreset="drafts" />);

    const card = await cardFor("Manual backfill");
    expect(card).toHaveAttribute(
      "href",
      "/dashboard/buyer/rate-contracts/manual-entry?d=42"
    );
  });

  test("an ordinary draft still opens the create wizard", async () => {
    respond([row({ id: 43, title: "Wizard draft" })]);
    render(<ContractsListPage filterPreset="drafts" />);

    const card = await cardFor("Wizard draft");
    expect(card).toHaveAttribute(
      "href",
      "/dashboard/buyer/rate-contracts/create?c=43"
    );
  });

  test("a finalised manual ARC reads on the lifecycle page like any other contract", async () => {
    respond([row({ id: 44, title: "Historical contract", status: "contract_active", is_manual: true })]);
    render(<ContractsListPage filterPreset="all" />);

    const card = await cardFor("Historical contract");
    expect(card).toHaveAttribute(
      "href",
      "/dashboard/buyer/rate-contracts/44?stage=active"
    );
  });

  test("the card says which wizard it opens before the click", async () => {
    respond([
      row({ id: 42, title: "Manual backfill", is_manual: true }),
      row({ id: 43, title: "Wizard draft" }),
    ]);
    render(<ContractsListPage filterPreset="drafts" />);

    const manual = await cardFor("Manual backfill");
    expect(within(manual).getByText("Manual entry")).toBeInTheDocument();

    const wizard = await cardFor("Wizard draft");
    expect(within(wizard).queryByText("Manual entry")).toBeNull();
  });
});
