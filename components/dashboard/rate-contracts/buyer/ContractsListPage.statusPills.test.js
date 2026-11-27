// ARC v2 — the rate contract card's status pill uses the RFQ list's names
// (REQ-2026-0094): "Awaiting Quotes", "Ended · No Quotes", "Technical
// Evaluation", "Technical Approval", "Technical Rejected", "Commercial
// Evaluation", "Negotiation Rounds". Pill only: the bucket, tabs, Status filter
// and the Waiting on line are unchanged.
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
import { render, screen, within } from "@testing-library/react";
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

const approval = (role) => ({ kind: "approval", role, action: "x", step: { level: 1, of: 1, rule: "ANY" }, people: [{ name: "Approver One" }], unreachable: 0 });
const evaluators = (role) => ({ kind: "evaluators", role, action: "x", step: null, people: [{ name: "Evaluator One" }], unreachable: 0 });

function respond(rows) {
  ArcApi.getContractsListView.mockResolvedValue({
    data: { rows, facets: {}, tab_counts: { all: rows.length }, total: rows.length, limit: 20 },
  });
}

const pillOf = async (title) => (await screen.findByText(title)).closest("a").querySelector(".status-pill");

describe("ARC contracts list — status pill names", () => {
  afterEach(() => jest.clearAllMocks());

  test("bidding: open → Awaiting Quotes; closed with quotes → Submissions closed; closed with none → Ended · No Quotes", async () => {
    respond([
      row({ id: 1, title: "Open", submitted_count: 1, submission_window_closed: false }),
      row({ id: 2, title: "Open, older payload", submitted_count: 0 }),
      row({ id: 3, title: "Closed with quotes", submission_window_closed: true }),
      row({ id: 4, title: "Closed status with quotes", status: "submission_closed" }),
      row({ id: 5, title: "Closed, no quotes", submitted_count: 0, submission_window_closed: true }),
      row({ id: 6, title: "Closed status, no quotes", status: "submission_closed", submitted_count: 0 }),
    ]);
    render(<ContractsListPage filterPreset="all" />);

    expect(await pillOf("Open")).toHaveTextContent("Awaiting Quotes");
    expect(await pillOf("Open, older payload")).toHaveTextContent("Awaiting Quotes");
    expect(await pillOf("Closed with quotes")).toHaveTextContent("Submissions closed");
    expect(await pillOf("Closed status with quotes")).toHaveTextContent("Submissions closed");
    const none = await pillOf("Closed, no quotes");
    expect(none).toHaveTextContent("Ended · No Quotes");
    expect(none).toHaveClass("expiring");
    expect(await pillOf("Closed status, no quotes")).toHaveTextContent("Ended · No Quotes");
    expect(screen.queryByText("Floated")).toBeNull();
  });

  test("technical steps: evaluation, approval pending, rejected", async () => {
    respond([
      row({ id: 11, title: "Scoring", status: "tech_eval_in_progress", waiting_on: evaluators("Technical evaluators") }),
      row({ id: 12, title: "Scoring, no waiting_on", status: "tech_eval_in_progress" }),
      row({ id: 13, title: "Tech approval", status: "tech_eval_in_progress", waiting_on: approval("Technical approval") }),
      row({ id: 14, title: "Tech rejected", status: "tech_eval_rejected", waiting_on: evaluators("Technical evaluators") }),
    ]);
    render(<ContractsListPage filterPreset="all" />);

    expect(await pillOf("Scoring")).toHaveTextContent("Technical Evaluation");
    expect(await pillOf("Scoring, no waiting_on")).toHaveTextContent("Technical Evaluation");
    expect(await pillOf("Tech approval")).toHaveTextContent("Technical Approval");
    expect(await pillOf("Tech rejected")).toHaveTextContent("Technical Rejected");
    expect(screen.queryByText("In Evaluation")).toBeNull();
  });

  test("commercial step, and a negotiation round live or waiting for approval", async () => {
    respond([
      row({ id: 21, title: "Allocating", status: "comm_eval_in_progress", waiting_on: evaluators("Commercial evaluators") }),
      row({ id: 22, title: "Tech approved", status: "tech_eval_approved", waiting_on: evaluators("Commercial evaluators") }),
      row({ id: 23, title: "Round live", status: "comm_eval_in_progress", negotiation_in_progress: true, waiting_on: evaluators("Commercial evaluators") }),
      row({ id: 24, title: "Round approval", status: "tech_eval_approved", waiting_on: approval("Negotiation round approval") }),
    ]);
    render(<ContractsListPage filterPreset="all" />);

    expect(await pillOf("Allocating")).toHaveTextContent("Commercial Evaluation");
    expect(await pillOf("Tech approved")).toHaveTextContent("Commercial Evaluation");
    expect(await pillOf("Round live")).toHaveTextContent("Negotiation Rounds");
    expect(await pillOf("Round approval")).toHaveTextContent("Negotiation Rounds");
  });

  test("the Waiting on line is unchanged under the new names", async () => {
    respond([
      row({ id: 31, title: "Scoring", status: "tech_eval_in_progress", waiting_on: evaluators("Technical evaluators") }),
    ]);
    render(<ContractsListPage filterPreset="all" />);
    const card = (await screen.findByText("Scoring")).closest("a");
    expect(within(card).getByTestId("arc-waiting-on")).toHaveTextContent("Waiting on Evaluator One");
  });

  test("other stages keep their pills", async () => {
    respond([
      row({ id: 41, title: "A draft", status: "draft" }),
      row({ id: 42, title: "Publish pending", status: "pending_publish_approval" }),
      row({ id: 43, title: "Committee", status: "committee_review" }),
      row({ id: 44, title: "Copies", status: "contract_generated" }),
      row({ id: 45, title: "Signing", status: "awaiting_vendor_acceptance" }),
      row({ id: 46, title: "Live", status: "contract_active" }),
      row({ id: 47, title: "Done", status: "expired" }),
    ]);
    render(<ContractsListPage filterPreset="all" />);
    expect(await pillOf("A draft")).toHaveTextContent("Draft");
    expect(await pillOf("Publish pending")).toHaveTextContent("Pending approval");
    expect(await pillOf("Committee")).toHaveTextContent("Committee Review");
    expect(await pillOf("Copies")).toHaveTextContent("Contract review");
    expect(await pillOf("Signing")).toHaveTextContent("Awaiting Vendor");
    expect(await pillOf("Live")).toHaveTextContent("Active");
    expect(await pillOf("Done")).toHaveTextContent("Ended");
  });
});
