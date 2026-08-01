// Negotiation listing — the seven-state taxonomy, as the buyer sees it.
//
// Asserted through the real page over a stubbed list-view response. What
// matters here is what the row SAYS and what the tab strip offers, because the
// whole point of the change is that the previous five labels collapsed states
// that call for completely different actions:
//
//   • "Cancelled" covered both a round somebody withdrew on purpose (88 in
//     production) and one that simply never got approved in time (171) —
//     the latter never reached a vendor at all.
//   • "Awaiting Decision" covered rounds nobody replied to, rounds waiting on
//     a decision, and rounds whose decision was taken weeks ago.
//   • "Pending for me" sat in the same row as if it were a state of the round,
//     rather than a fact about whoever is logged in.

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationListView: jest.fn(),
}));

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getNegotiationListView } from "@/services/negotiation";
import NegotiationListPage from "./NegotiationListPage";

const mkRow = (over = {}) => ({
  round_id: 1,
  rfq_id: 512,
  rfq_no: 536299,
  title: "Housekeeping consumables",
  source_type: "RFQ",
  hotel_id: 10101,
  hotel_name: "Taj Palace",
  department_title: "Housekeeping",
  round_status: "ENDED",
  neg_status: "ready_for_decision",
  invited_count: 3,
  quotes_received: 2,
  // Position and total are both RFQ-wide; rounds_on_products is context only.
  round_number: 7,
  stored_round_number: 4,
  total_rounds: 138,
  rounds_on_parent: 138,
  rounds_on_products: 4,
  item_names: [],
  vendors: [],
  action_required: false,
  action_label: null,
  ...over,
});

const mkResponse = (rows, over = {}) => ({
  status: 1,
  data: {
    rows,
    facets: {},
    tab_counts: { all: rows.length, for_me: 0 },
    source_counts: { all: rows.length, RFQ: rows.length, ARC: 0 },
    total: rows.length,
    page: 1,
    limit: 20,
    ...over,
  },
});

const renderList = async (response) => {
  getNegotiationListView.mockResolvedValue(response);
  const utils = render(<NegotiationListPage />);
  await screen.findByText("Negotiations");
  await waitFor(() => expect(getNegotiationListView).toHaveBeenCalled());
  return utils;
};

/** The most recent request body the page sent. */
const lastRequest = () =>
  getNegotiationListView.mock.calls[getNegotiationListView.mock.calls.length - 1][0];

/**
 * The row itself. Every state label also appears on a tab, so assertions have
 * to be scoped to the card or they match the tab strip instead.
 */
const rowCard = async () => {
  const title = await screen.findByText("Housekeeping consumables");
  return title.closest("a");
};

beforeEach(() => {
  getNegotiationListView.mockReset();
});

describe("status labels", () => {
  it.each([
    ["awaiting_approval", "Awaiting your approval"],
    ["open_with_vendors", "Open with vendors"],
    ["ready_for_decision", "Ready for your decision"],
    ["no_vendor_response", "Closed — no vendor response"],
    ["concluded", "Concluded"],
    ["lapsed", "Lapsed — never approved"],
    ["cancelled", "Cancelled"],
  ])("renders %s as its own label", async (state, label) => {
    await renderList(mkResponse([mkRow({ neg_status: state })]));
    expect(await rowCard()).toHaveTextContent(label);
  });

  it("does not label a lapsed round as cancelled", async () => {
    await renderList(mkResponse([mkRow({ round_id: 7, neg_status: "lapsed" })]));
    const card = await rowCard();
    expect(card).toHaveTextContent("Lapsed — never approved");
    // The two used to share the single "Cancelled" bucket.
    expect(within(card).queryByText("Cancelled")).not.toBeInTheDocument();
  });

  it("offers one tab per state, and no status tab for 'pending for me'", async () => {
    await renderList(mkResponse([]));
    const tabLabels = [
      "Awaiting your approval",
      "Open with vendors",
      "Ready for your decision",
      "Closed — no vendor response",
      "Concluded",
      "Lapsed — never approved",
      "Cancelled",
    ];
    for (const label of tabLabels) {
      expect(screen.getByRole("button", { name: new RegExp(label.replace(/[—]/g, "."), "i") })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /pending for me/i })).not.toBeInTheDocument();
  });
});

describe("explanatory text", () => {
  it("carries a legend describing every state", async () => {
    await renderList(mkResponse([]));
    const legend = screen.getByTestId("state-legend");
    fireEvent.click(within(legend).getByText("Show"));

    expect(legend).toHaveTextContent("Waiting for an internal approver before vendors are notified.");
    expect(legend).toHaveTextContent("Window closed, no vendor replied. Nothing to evaluate.");
    expect(legend).toHaveTextContent(
      "The approval deadline passed before anyone approved it, so this round never reached vendors."
    );
  });

  it("explains each state on its own row via the status pill", async () => {
    await renderList(mkResponse([mkRow({ neg_status: "concluded" })]));
    const card = await rowCard();
    expect(
      within(card).getByTitle("Quotes from this round were selected and approved.")
    ).toBeInTheDocument();
  });
});

describe("needs-my-approval is a filter, not a status", () => {
  it("renders as a toggle rather than a tab", async () => {
    await renderList(mkResponse([]));
    expect(screen.getByTestId("needs-my-approval-toggle")).toBeInTheDocument();
  });

  it("sends needsMyApproval to the server and composes with a status tab", async () => {
    await renderList(mkResponse([]));

    fireEvent.click(within(screen.getByTestId("needs-my-approval-toggle")).getByRole("checkbox"));
    await waitFor(() => expect(lastRequest().needsMyApproval).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: /Ready for your decision/i }));
    await waitFor(() => {
      const req = lastRequest();
      // Both survive — a round's state and whether it is waiting on YOU are
      // different questions and must be answerable at the same time.
      expect(req.tab).toBe("ready_for_decision");
      expect(req.needsMyApproval).toBe(true);
    });
  });
});

describe("round number", () => {
  it("numbers the round across the whole RFQ", async () => {
    // Product definition: "round_number means the number of the current round
    // in the whole RFQ, not product-wise." The server sends the computed
    // position; the stored column (4, this product's own sequence) is not shown.
    await renderList(mkResponse([mkRow()]));
    const card = await rowCard();
    expect(card).toHaveTextContent("Round 7 of 138");
    expect(card).not.toHaveTextContent("Round 4");
  });

  it("explains how many of those rounds touched these items", async () => {
    await renderList(mkResponse([mkRow()]));
    const card = await rowCard();
    expect(
      within(card).getByTitle(/4 of these 138 rounds negotiated the same items/)
    ).toBeInTheDocument();
  });
});

describe("participation", () => {
  it("does not show a participation bar on a round that never reached vendors", async () => {
    await renderList(mkResponse([mkRow({ neg_status: "lapsed", invited_count: 3, quotes_received: 0 })]));
    const card = await rowCard();
    // "0 of 3 vendors quoted" would be a lie: those vendors were never told.
    expect(within(card).queryByText(/vendors quoted/)).not.toBeInTheDocument();
  });

  it("shows it while the round is open with vendors", async () => {
    await renderList(mkResponse([mkRow({ neg_status: "open_with_vendors" })]));
    const card = await rowCard();
    expect(within(card).getByText(/vendors quoted/)).toBeInTheDocument();
  });
});
