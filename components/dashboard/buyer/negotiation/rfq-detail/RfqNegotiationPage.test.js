// Level 2 — one RFQ's negotiation.
//
// The listing collapses 886 rounds into 124 cards. This page is where the
// rounds went, and the thing it must never do is hand them all back at once:
// RFQ 512 has 138 of them.
//
// Both calls go to the SAME endpoint at two grains, so the stub answers on
// `groupBy` — which also proves the page asks for the right grain twice.

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationListView: jest.fn(),
}));

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getNegotiationListView } from "@/services/negotiation";
import RfqNegotiationPage from "./RfqNegotiationPage";

const counts = (over = {}) => ({
  awaiting_approval: 0,
  open_with_vendors: 0,
  ready_for_decision: 0,
  no_vendor_response: 0,
  concluded: 0,
  lapsed: 0,
  cancelled: 0,
  ...over,
});

const parentRow = (over = {}) => ({
  parent_key: "RFQ:512",
  source_type: "RFQ",
  rfq_id: 512,
  arc_id: null,
  rfq_no: 536058,
  title: "Housekeeping consumables",
  is_tender: 0,
  hotel_id: 10101,
  hotel_name: "Taj Palace",
  department_id: 7,
  department_title: "Housekeeping",
  round_count: 12,
  state_counts: counts({ ready_for_decision: 1, concluded: 9, lapsed: 2 }),
  neg_status: "ready_for_decision",
  ready_for_decision_count: 1,
  open_with_vendors_count: 0,
  awaiting_approval_count: 0,
  action_required: false,
  action_label: null,
  vendors: [{ id: 91, name: "Orchid Supplies" }, { id: 92, name: "Bharat Textiles" }],
  vendor_count: 2,
  item_names: ["Bath towel 500gsm", "Hand towel"],
  product_count: 2,
  quotes_received: 7,
  first_round_at: "2026-01-04 10:00:00",
  last_activity_at: "2026-07-02 09:00:00",
  next_deadline: null,
  baseline_total: 80414576,
  achieved_total: 70568937,
  saved_value: 9845639,
  saved_pct: 12.2437,
  savings_pairs_counted: 214,
  baseline_total_awarded: 62664916,
  achieved_total_awarded: 56196950,
  saved_value_awarded: 6467966,
  saved_pct_awarded: 10.3216,
  savings_pairs_counted_awarded: 118,
  ...over,
});

const roundRow = (n, over = {}) => ({
  round_id: 9000 + n,
  round_number: n,
  stored_round_number: 1,
  round_created_at: "2026-06-01 08:00:00",
  total_rounds: 12,
  rounds_on_parent: 12,
  rounds_on_products: 3,
  rfq_id: 512,
  rfq_no: 536058,
  title: "Housekeeping consumables",
  is_tender: 0,
  hotel_id: 10101,
  hotel_name: "Taj Palace",
  department_id: 7,
  department_title: "Housekeeping",
  round_status: "ENDED",
  end_date: "2026-06-08 12:00:00",
  closed_at: null,
  invited_count: 3,
  neg_status: "ready_for_decision",
  has_approved_quote: false,
  quotes_received: 2,
  item_names: ["Bath towel 500gsm"],
  vendors: [{ id: 91, name: "Orchid Supplies" }],
  source_type: "RFQ",
  arc_id: null,
  action_required: false,
  action_label: null,
  ...over,
});

/**
 * Answer each call by the grain it asked for. `rounds` is a function of the
 * page number so pagination can be asserted on real slices.
 */
const stub = ({ parent = parentRow(), rounds = [], total = rounds.length, limit = 20 } = {}) => {
  getNegotiationListView.mockImplementation((body = {}) => {
    if (body.groupBy === "parent") {
      return Promise.resolve({
        status: 1,
        data: {
          rows: parent ? [parent] : [],
          facets: {}, tab_counts: {}, source_counts: { all: 1, RFQ: 1, ARC: 0 },
          total: parent ? 1 : 0, page: 1, limit: 1, group_by: "parent",
        },
      });
    }
    const page = Number(body.page) > 0 ? Number(body.page) : 1;
    const source = body.needsMyApproval ? rounds.filter((r) => r.action_required) : rounds;
    return Promise.resolve({
      status: 1,
      data: {
        rows: source.slice((page - 1) * limit, page * limit),
        facets: {}, tab_counts: {}, source_counts: { all: source.length, RFQ: source.length, ARC: 0 },
        total: body.needsMyApproval ? source.length : total,
        page, limit, group_by: "round",
      },
    });
  });
};

const renderPage = async (opts) => {
  stub(opts);
  const utils = render(<RfqNegotiationPage rfqId="512" />);
  await screen.findByTestId("rfq-negotiation-page");
  return utils;
};

const bodyFor = (grain) =>
  getNegotiationListView.mock.calls.map((c) => c[0]).find((b) => b?.groupBy === grain);

beforeEach(() => {
  getNegotiationListView.mockReset();
});

// ── the two calls ──────────────────────────────────────────────────────────

describe("data", () => {
  it("asks one endpoint twice — once per grain — scoped to this RFQ", async () => {
    await renderPage({ rounds: [roundRow(12)] });

    expect(bodyFor("parent")).toEqual(
      expect.objectContaining({ filters: { parentKey: ["RFQ:512"] }, limit: 1 })
    );
    expect(bodyFor("round")).toEqual(
      expect.objectContaining({ filters: { parentKey: ["RFQ:512"] }, sort: "recent", page: 1 })
    );
  });
});

// ── hero ───────────────────────────────────────────────────────────────────

describe("hero", () => {
  it("names the RFQ, its roll-up state and how many rounds it took", async () => {
    await renderPage({ rounds: [roundRow(12)] });
    const hero = document.querySelector(".arc-hero");

    expect(hero).toHaveTextContent("Housekeeping consumables");
    expect(hero).toHaveTextContent("#536058");
    expect(hero).toHaveTextContent("Ready for your decision");
    expect(within(hero).getByTestId("hero-rounds")).toHaveTextContent("12 rounds");
  });

  it("goes back to the listing", async () => {
    await renderPage({ rounds: [] });
    expect(screen.getByRole("link", { name: /Back to negotiations/i })).toHaveAttribute(
      "href",
      "/dashboard/buyer/negotiation"
    );
  });
});

// ── the gist ───────────────────────────────────────────────────────────────

describe("gist tiles", () => {
  it("carries both savings figures", async () => {
    await renderPage({ rounds: [roundRow(12)] });
    const saved = screen.getByTestId("gist-saved");
    expect(saved).toHaveTextContent("₹98.46L");
    expect(saved).toHaveTextContent(/₹64\.68L on awarded vendors/i);
  });

  it("says 'not yet awarded' when no quote has been approved", async () => {
    await renderPage({
      parent: parentRow({
        baseline_total_awarded: 0,
        achieved_total_awarded: 0,
        saved_value_awarded: 0,
        saved_pct_awarded: null,
        savings_pairs_counted_awarded: 0,
      }),
      rounds: [roundRow(12)],
    });
    expect(screen.getByTestId("gist-saved-awarded")).toHaveTextContent(/not yet awarded/i);
  });

  it("breaks the round count down by state", async () => {
    await renderPage({ rounds: [roundRow(12)] });
    const rounds = screen.getByTestId("gist-rounds");
    expect(rounds).toHaveTextContent("12");
    const strip = within(rounds).getByTestId("gist-state-strip");
    expect(strip).toHaveTextContent(/1\s*ready for your decision/i);
    expect(strip).toHaveTextContent(/9\s*concluded/i);
    expect(strip).toHaveTextContent(/2\s*lapsed/i);
  });

  it("counts the products actually negotiated and the vendors invited", async () => {
    await renderPage({ rounds: [roundRow(12)] });
    expect(screen.getByTestId("gist-products")).toHaveTextContent("2");
    expect(screen.getByTestId("gist-vendors")).toHaveTextContent("2");
    expect(screen.getByTestId("gist-vendors")).toHaveTextContent(/7 vendor responses/i);
  });

  it("deep-links to the round that is waiting on this user", async () => {
    await renderPage({
      parent: parentRow({ action_required: true, action_label: "Approval needed" }),
      rounds: [
        roundRow(12, { action_required: true, action_label: "Approval needed", neg_status: "awaiting_approval" }),
        roundRow(11),
      ],
    });
    const link = screen.getByTestId("needs-you-link");
    expect(link).toHaveAttribute("href", "/dashboard/buyer/negotiation/round/9012");
    expect(screen.getByTestId("gist-needs-you")).toHaveTextContent("Round 12");
  });

  it("says so plainly when nothing is waiting on this user", async () => {
    await renderPage({ rounds: [roundRow(12)] });
    expect(screen.getByTestId("gist-needs-you")).toHaveTextContent(/Nothing needs you right now/i);
  });
});

// ── the rounds table ───────────────────────────────────────────────────────

describe("rounds table", () => {
  it("renders rounds as table rows, each linking to the round itself", async () => {
    await renderPage({ rounds: [roundRow(12), roundRow(11), roundRow(10)] });

    const table = await screen.findByTestId("rounds-table");
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + 3

    expect(within(table).getByRole("link", { name: /Round 12/ })).toHaveAttribute(
      "href",
      "/dashboard/buyer/negotiation/round/9012"
    );
  });

  it("carries no savings column, because a round has no savings of its own", async () => {
    // The round grain returns no money at all — savings are computed per RFQ
    // across its rounds. A column that could only ever render an em dash would
    // teach the reader the figure does not exist, when the Saved tile above
    // holds it and the round's own numbers are one click away.
    await renderPage({ rounds: [roundRow(12)] });
    const table = await screen.findByTestId("rounds-table");
    const headers = within(table).getAllByRole("columnheader").map((th) => th.textContent.trim());
    expect(headers).toEqual(["Round", "Products", "Vendors", "Window", "State"]);
  });

  it("shows each round's own participation, window and state", async () => {
    await renderPage({ rounds: [roundRow(12, { quotes_received: 2, invited_count: 3 })] });
    const row = await screen.findByTestId("round-row-9012");
    expect(row).toHaveTextContent("2");
    expect(row).toHaveTextContent("/ 3");
    expect(row).toHaveTextContent(/Ended|Ends/);
    expect(row).toHaveTextContent("Ready for your decision");
  });

  it("renders the round numbers the server sent, unchanged", async () => {
    // They are already RFQ-wide positions. The stored column restarts at 1 per
    // product, which is why recomputing them client-side is not an option.
    await renderPage({ rounds: [roundRow(138), roundRow(137)] });
    const table = await screen.findByTestId("rounds-table");
    expect(within(table).getByText("Round 138")).toBeInTheDocument();
    expect(within(table).getByText("Round 137")).toBeInTheDocument();
    expect(within(table).queryByText("Round 1")).not.toBeInTheDocument();
  });

  it("pages a 138-round RFQ instead of rendering 138 rows", async () => {
    const rounds = Array.from({ length: 138 }, (_, i) => roundRow(138 - i));
    await renderPage({ rounds, total: 138 });

    const table = await screen.findByTestId("rounds-table");
    expect(within(table).getAllByRole("row")).toHaveLength(21); // header + 20
    expect(screen.getByTestId("rounds-pager")).toHaveTextContent("Page 1 of 7");

    fireEvent.click(screen.getByRole("button", { name: "›" }));
    await waitFor(() => expect(screen.getByTestId("rounds-pager")).toHaveTextContent("Page 2 of 7"));
    // Page 2 starts at the 21st most recent round.
    expect(await screen.findByTestId("round-row-9118")).toBeInTheDocument();
  });

  it("can narrow to the rounds waiting on this user", async () => {
    await renderPage({
      rounds: [
        roundRow(12, { action_required: true, action_label: "Approval needed" }),
        roundRow(11),
        roundRow(10),
      ],
    });
    await screen.findByTestId("round-row-9012");

    fireEvent.click(within(screen.getByTestId("rounds-only-mine")).getByRole("checkbox"));

    await waitFor(() => {
      const table = screen.getByTestId("rounds-table");
      expect(within(table).getAllByRole("row")).toHaveLength(2); // header + 1
    });
  });
});

// ── nothing to show ────────────────────────────────────────────────────────

describe("empty states", () => {
  it("explains an RFQ with no visible negotiation instead of rendering a bare shell", async () => {
    await stub({ parent: null });
    render(<RfqNegotiationPage rfqId="999" />);
    expect(await screen.findByTestId("rfq-negotiation-error")).toHaveTextContent(
      "No negotiation on this RFQ"
    );
    expect(screen.getByRole("link", { name: /Back to negotiations/i })).toHaveAttribute(
      "href",
      "/dashboard/buyer/negotiation"
    );
  });
});
