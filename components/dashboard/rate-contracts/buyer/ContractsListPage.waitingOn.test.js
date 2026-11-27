// ARC v2 — the rate contract card says who it is waiting on (REQ-2026-0094).
//
// The client's report: a floated rate contract whose window had closed with
// every quote in still read "Floated · 2 of 2 responses", with nothing saying
// who had to act next. The list-view rows now carry `waiting_on` (worked out on
// the server) and `submission_window_closed`; the card words them.
//
// Product-level: render the REAL list page against a stubbed list-view response.

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
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ContractsListPage from "./ContractsListPage";

const row = (over = {}) => ({
  id: 1,
  arc_number: "ARC-2026-27-0001",
  title: "Untitled",
  status: "floated",
  category_title: "Packing Material",
  hotel_name: "Hotel One",
  created_at: "2026-11-01T10:00:00",
  submission_end_at: "2026-11-17 17:00:00",
  item_names: [],
  product_variant_ids: [],
  awarded_vendors: [],
  invited_count: 2,
  submitted_count: 2,
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

const cardFor = async (title) => (await screen.findByText(title)).closest("a");

describe("ARC contracts list — Waiting on", () => {
  afterEach(() => jest.clearAllMocks());

  test("the client's case: window closed, all quotes in → 'Submissions closed', waiting on the technical evaluators", async () => {
    respond([row({
      id: 20, title: "Double vendor", submission_window_closed: true,
      waiting_on: {
        kind: "evaluators", role: "Technical evaluators",
        action: "Score the vendor responses and submit the technical evaluation",
        step: null, people: [{ name: "Ravi Kumar" }, { name: "Meera Shah" }], unreachable: 0,
      },
    })]);
    render(<ContractsListPage filterPreset="all" />);

    const card = await cardFor("Double vendor");
    expect(within(card).getByText("Submissions closed")).toBeInTheDocument();
    expect(within(card).queryByText("Floated")).toBeNull();
    expect(within(card).getByTestId("arc-waiting-on")).toHaveTextContent("Waiting on Ravi Kumar +1");
    expect(within(card).getByText(/closed/, { selector: ".progress-label" })).toBeInTheDocument();
    expect(within(card).queryByText(/closes/)).toBeNull();
  });

  test("hovering lists everyone, with the role and what they need to do", async () => {
    respond([row({
      id: 21, title: "Committee case", status: "committee_review",
      waiting_on: {
        kind: "approval", role: "Committee approval", action: "Approve the awards",
        step: { level: 1, of: 2, rule: "ALL" },
        people: [{ name: "Asha Rao" }, { name: "Vikram Iyer" }], unreachable: 1,
      },
    })]);
    render(<ContractsListPage filterPreset="all" />);

    const card = await cardFor("Committee case");
    fireEvent.mouseEnter(within(card).getByTestId("arc-waiting-on"));
    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Waiting on · Committee approval");
    expect(tip).toHaveTextContent("Level 1 of 2 · all must approve");
    expect(tip).toHaveTextContent("Approve the awards");
    expect(tip).toHaveTextContent("Asha Rao");
    expect(tip).toHaveTextContent("Vikram Iyer");
    expect(tip).toHaveTextContent("1 inactive approver not shown");
  });

  test("window still open → 'Awaiting Quotes', waiting on the vendors yet to respond", async () => {
    respond([row({
      id: 22, title: "Open window", submitted_count: 1, submission_window_closed: false,
      waiting_on: {
        kind: "vendors", role: "Vendors yet to respond", action: "Submit a quote before the window closes",
        step: null, people: [{ name: "Vendor Beta", company: "Beta Foods" }], unreachable: 0,
      },
    })]);
    render(<ContractsListPage filterPreset="all" />);

    const card = await cardFor("Open window");
    expect(within(card).getByText("Awaiting Quotes")).toBeInTheDocument();
    expect(within(card).getByTestId("arc-waiting-on")).toHaveTextContent("Waiting on Vendor Beta");
    expect(within(card).getByText(/closes/, { selector: ".progress-label" })).toBeInTheDocument();
  });

  test("everyone has responded but the window is open → waiting for the window", async () => {
    respond([row({
      id: 23, title: "All in", submission_window_closed: false,
      waiting_on: { kind: "window", role: "Submission window", action: "x", step: null, people: [], unreachable: 0 },
    })]);
    render(<ContractsListPage filterPreset="all" />);
    const card = await cardFor("All in");
    expect(within(card).getByTestId("arc-waiting-on")).toHaveTextContent("Waiting for the window to close");
  });

  test("contract copies with the buyer read 'Contract review', not 'Awaiting Vendor'", async () => {
    respond([row({
      id: 24, title: "Copies drafted", status: "contract_generated",
      waiting_on: {
        kind: "evaluators", role: "Commercial evaluators",
        action: "Review the contract copies and send them to the vendors",
        step: null, people: [{ name: "Ravi Kumar" }], unreachable: 0,
      },
    })]);
    render(<ContractsListPage filterPreset="all" />);
    const card = await cardFor("Copies drafted");
    expect(within(card).getByText("Contract review")).toBeInTheDocument();
    expect(within(card).queryByText("Awaiting Vendor")).toBeNull();
    expect(within(card).getByTestId("arc-waiting-on")).toHaveTextContent("Waiting on Ravi Kumar");
  });

  test("awaiting signatures still reads 'Awaiting Vendor' and names the vendor", async () => {
    respond([row({
      id: 25, title: "Signing", status: "awaiting_vendor_acceptance",
      waiting_on: {
        kind: "vendors", role: "Vendors yet to sign", action: "Sign the contract",
        step: null, people: [{ name: "Vendor Alpha", company: "Alpha Dairy" }], unreachable: 0,
      },
    })]);
    render(<ContractsListPage filterPreset="all" />);
    const card = await cardFor("Signing");
    expect(within(card).getByText("Awaiting Vendor")).toBeInTheDocument();
    expect(within(card).getByTestId("arc-waiting-on")).toHaveTextContent("Waiting on Vendor Alpha");
  });

  test("nobody to name: says so instead of going blank", async () => {
    respond([
      row({
        id: 26, title: "No evaluator", status: "submission_closed",
        waiting_on: { kind: "evaluators", role: "Technical evaluators", action: "x", step: null, people: [], unreachable: 0 },
      }),
      row({
        id: 27, title: "Inactive approver", status: "committee_review",
        waiting_on: { kind: "approval", role: "Committee approval", action: "x", step: { level: 1, of: 1, rule: "ANY" }, people: [], unreachable: 1 },
      }),
    ]);
    render(<ContractsListPage filterPreset="all" />);
    expect(within(await cardFor("No evaluator")).getByTestId("arc-waiting-on"))
      .toHaveTextContent("Waiting on Technical evaluators · none assigned");
    expect(within(await cardFor("Inactive approver")).getByTestId("arc-waiting-on"))
      .toHaveTextContent("Waiting on Committee approval · approver inactive");
  });

  test("a row without waiting_on (live contract, or an older API) renders exactly as before", async () => {
    respond([
      row({ id: 28, title: "Live one", status: "contract_active", waiting_on: null }),
      row({ id: 29, title: "Older payload", status: "floated" }),
      row({ id: 30, title: "Publish pending", status: "pending_publish_approval" }),
    ]);
    render(<ContractsListPage filterPreset="all" />);
    expect(within(await cardFor("Live one")).queryByTestId("arc-waiting-on")).toBeNull();
    const older = await cardFor("Older payload");
    expect(within(older).queryByTestId("arc-waiting-on")).toBeNull();
    expect(within(older).getByText("Awaiting Quotes")).toBeInTheDocument();
    expect(within(older).getByText(/closes/, { selector: ".progress-label" })).toBeInTheDocument();
    expect(within(await cardFor("Publish pending")).getByText("Pending approval")).toBeInTheDocument();
  });
});
