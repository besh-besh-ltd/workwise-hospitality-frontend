// Negotiation listing — one row per RFQ, in the seven-state taxonomy.
//
// Asserted through the real page over a stubbed list-view response. Two things
// are being defended here.
//
// 1. THE GRAIN. The list used to render one row per negotiation ROUND: 886
//    rows over 124 RFQs, 138 of them belonging to RFQ 512 alone, all reading
//    as different RFQs. It now renders the server's parent grain
//    (`groupBy: 'parent'`) — one card per RFQ, carrying the round count, the
//    roll-up status, the mix of states underneath it and the savings.
//
// 2. THE VOCABULARY. The previous five labels collapsed states that call for
//    completely different actions:
//      • "Cancelled" covered both a round somebody withdrew on purpose (88 in
//        production) and one that simply never got approved in time (171) —
//        the latter never reached a vendor at all.
//      • "Awaiting Decision" covered rounds nobody replied to, rounds waiting
//        on a decision, and rounds whose decision was taken weeks ago.
//      • "Pending for me" sat in the same row as if it were a state of the
//        round, rather than a fact about whoever is logged in.

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationListView: jest.fn(),
}));

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getNegotiationListView } from "@/services/negotiation";
import NegotiationListPage from "./NegotiationListPage";

/** All seven keys are ALWAYS present on the wire; only the named ones are set. */
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

const mkParent = (over = {}) => ({
  parent_key: "RFQ:512",
  source_type: "RFQ",
  rfq_id: 512,
  arc_id: null,
  arc_number: null,
  rfq_no: 536299,
  title: "Housekeeping consumables",
  is_tender: 0,
  hotel_id: 10101,
  hotel_name: "Taj Palace",
  department_id: 7,
  department_title: "Housekeeping",
  round_count: 12,
  state_counts: counts({ ready_for_decision: 12 }),
  neg_status: "ready_for_decision",
  ready_for_decision_count: 12,
  open_with_vendors_count: 0,
  awaiting_approval_count: 0,
  action_required: false,
  action_label: null,
  vendors: [{ id: 91, name: "Orchid Supplies" }],
  vendor_count: 1,
  item_names: ["Bath towel 500gsm"],
  product_count: 1,
  quotes_received: 4,
  first_round_at: "2026-01-04 10:00:00",
  last_activity_at: "2026-07-02 09:00:00",
  next_deadline: null,
  // No comparable baseline by default — savings are opted into per test.
  baseline_total: 0,
  achieved_total: 0,
  saved_value: 0,
  saved_pct: null,
  baseline_total_awarded: 0,
  achieved_total_awarded: 0,
  saved_value_awarded: 0,
  saved_pct_awarded: null,
  savings_pairs_counted: 0,
  savings_pairs_counted_awarded: 0,
  baseline_sources: null,
  ...over,
});

/** Production's real totals, to the rupee. */
const withSavings = (over = {}) => ({
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
    group_by: "parent",
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
 * The card itself. Every state label also appears on a tab, so assertions have
 * to be scoped to the card or they match the tab strip instead.
 */
const rowCard = async () => {
  const title = await screen.findByText("Housekeeping consumables");
  return title.closest("a");
};

const allCards = () => screen.queryAllByTestId(/^parent-card-/);

beforeEach(() => {
  getNegotiationListView.mockReset();
});

// ── the grain ──────────────────────────────────────────────────────────────

describe("one row per RFQ", () => {
  it("asks the server for parent rows", async () => {
    await renderList(mkResponse([]));
    // The server defaults to 'parent', but the page states it: a page that
    // renders parent cards must never be at the mercy of a default flipping.
    expect(lastRequest().groupBy).toBe("parent");
  });

  it("renders ONE card for an RFQ with twelve rounds", async () => {
    await renderList(mkResponse([mkParent({ round_count: 12 })]));
    expect(allCards()).toHaveLength(1);
    expect(await rowCard()).toHaveTextContent("12 rounds");
  });

  it("renders one card per RFQ, not one per round", async () => {
    await renderList(
      mkResponse([
        mkParent(),
        mkParent({ parent_key: "RFQ:640", rfq_id: 640, rfq_no: 536401, title: "Kitchen equipment" }),
      ])
    );
    expect(allCards()).toHaveLength(2);
    expect(screen.getByText("Housekeeping consumables")).toBeInTheDocument();
    expect(screen.getByText("Kitchen equipment")).toBeInTheDocument();
  });

  it("links an RFQ card to that RFQ's negotiation page", async () => {
    await renderList(mkResponse([mkParent()]));
    expect(await rowCard()).toHaveAttribute("href", "/dashboard/buyer/negotiation/512");
  });

  it("links an ARC card to the rate contract, which already lists its rounds", async () => {
    // ARC parents carry rfq_id = NULL by construction; the link must come off
    // arc_id or it points at /negotiation/null.
    await renderList(
      mkResponse([
        mkParent({
          parent_key: "ARC:88",
          source_type: "ARC",
          rfq_id: null,
          arc_id: 88,
          arc_number: "ARC/2026/0088",
          rfq_no: "ARC/2026/0088",
          title: "Annual linen contract",
        }),
      ])
    );
    const card = screen.getByText("Annual linen contract").closest("a");
    expect(card).toHaveAttribute("href", "/dashboard/buyer/rate-contracts/88?stage=commercial");
  });
});

// ── status vocabulary ──────────────────────────────────────────────────────

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
    await renderList(
      mkResponse([mkParent({ neg_status: state, state_counts: counts({ [state]: 12 }) })])
    );
    expect(await rowCard()).toHaveTextContent(label);
  });

  it("does not label a lapsed RFQ as cancelled", async () => {
    await renderList(
      mkResponse([mkParent({ neg_status: "lapsed", state_counts: counts({ lapsed: 3 }) })])
    );
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

  it("explains the roll-up on the pill itself", async () => {
    await renderList(
      mkResponse([mkParent({ neg_status: "concluded", state_counts: counts({ concluded: 12 }) })])
    );
    const card = await rowCard();
    const pill = within(card).getByTestId("rollup-pill");
    // The state's own meaning, PLUS why one RFQ carrying rounds in four states
    // gets exactly one pill.
    expect(pill).toHaveAttribute(
      "title",
      expect.stringContaining("Quotes from this round were selected and approved.")
    );
    expect(pill).toHaveAttribute("title", expect.stringContaining("needs attention soonest"));
  });
});

// ── the state strip ────────────────────────────────────────────────────────

describe("state strip", () => {
  it("breaks the rounds down when they are in more than one state", async () => {
    await renderList(
      mkResponse([
        mkParent({
          round_count: 12,
          neg_status: "ready_for_decision",
          state_counts: counts({ ready_for_decision: 1, concluded: 9, lapsed: 2 }),
        }),
      ])
    );
    const strip = within(await rowCard()).getByTestId("state-strip");
    expect(strip).toHaveTextContent("12 rounds");
    expect(strip).toHaveTextContent(/1\s*ready for your decision/i);
    expect(strip).toHaveTextContent(/9\s*concluded/i);
    expect(strip).toHaveTextContent(/2\s*lapsed/i);
  });

  it("stays out of the way when every round is in the same state", async () => {
    await renderList(
      mkResponse([mkParent({ round_count: 4, state_counts: counts({ concluded: 4 }), neg_status: "concluded" })])
    );
    const card = await rowCard();
    // Repeating the pill and the round count in a second row would be noise.
    expect(within(card).queryByTestId("state-strip")).not.toBeInTheDocument();
    expect(within(card).getByTestId("round-count")).toHaveTextContent("4 rounds");
  });
});

// ── savings ────────────────────────────────────────────────────────────────

describe("savings", () => {
  it("shows the all-vendor total with the awarded share named inside it", async () => {
    await renderList(mkResponse([mkParent(withSavings())]));
    const savings = within(await rowCard()).getByTestId("savings");
    expect(savings).toHaveTextContent("₹98.46L");
    expect(savings).toHaveTextContent(/across all vendors/i);
    expect(savings).toHaveTextContent(/₹64\.68L on awarded vendors/i);
  });

  it("says 'not yet awarded' rather than '₹0' when no quote has been approved", async () => {
    // 36 of the 124 production parents. Their awarded figure is zero because
    // nothing has been awarded — not because the awarded vendor saved nothing.
    await renderList(
      mkResponse([
        mkParent(
          withSavings({
            baseline_total_awarded: 0,
            achieved_total_awarded: 0,
            saved_value_awarded: 0,
            saved_pct_awarded: null,
            savings_pairs_counted_awarded: 0,
          })
        ),
      ])
    );
    const savings = within(await rowCard()).getByTestId("savings");
    expect(savings).toHaveTextContent(/not yet awarded/i);
    expect(within(savings).queryByText(/₹0 on awarded vendors/)).not.toBeInTheDocument();
  });

  it("renders a negotiation that ended ABOVE its baseline as negative", async () => {
    // Prices genuinely go up. Clamping at zero would report a loss as a draw.
    await renderList(
      mkResponse([
        mkParent(withSavings({ saved_value: -120000, saved_pct: -1.4922 })),
      ])
    );
    const savings = within(await rowCard()).getByTestId("savings");
    expect(savings).toHaveTextContent("−₹1.2L");
    expect(savings).toHaveTextContent(/over baseline/i);
  });

  it("does not invent a savings figure for a rate contract", async () => {
    await renderList(
      mkResponse([
        mkParent({
          parent_key: "ARC:88",
          source_type: "ARC",
          rfq_id: null,
          arc_id: 88,
          arc_number: "ARC/2026/0088",
          title: "Annual linen contract",
          // The server sends these zeroed for ARC — it never ran the query.
          saved_value: 0,
          saved_pct: null,
          saved_value_awarded: 0,
          saved_pct_awarded: null,
        }),
      ])
    );
    const card = screen.getByText("Annual linen contract").closest("a");
    expect(within(card).getByTestId("savings")).toHaveTextContent(/tracked on the rate contract/i);
    expect(within(card).getByTestId("savings")).not.toHaveTextContent("₹0");
  });
});

// ── facets ─────────────────────────────────────────────────────────────────

describe("facets", () => {
  it("keeps the ones that narrow the list and drops the two that cannot", async () => {
    await renderList(
      mkResponse([mkParent()], {
        facets: {
          rfqId: [{ key: "512", label: "#536299 · Housekeeping consumables", count: 1 }],
          status: [{ key: "ready_for_decision", label: "Ready for your decision", count: 1 }],
          buId: [{ key: "10101", label: "Taj Palace", count: 1 }],
          departmentId: [{ key: "7", label: "Housekeeping", count: 1 }],
          productId: [{ key: "Bath towel 500gsm", label: "Bath towel 500gsm", count: 1 }],
          vendorId: [{ key: "91", label: "Orchid Supplies", count: 1 }],
        },
      })
    );
    const sidebar = document.querySelector(".filter-sidebar");
    expect(within(sidebar).getByText("Business unit")).toBeInTheDocument();
    expect(within(sidebar).getByText("Department")).toBeInTheDocument();
    expect(within(sidebar).getByText("Product")).toBeInTheDocument();
    expect(within(sidebar).getByText("Vendor")).toBeInTheDocument();
    // Every row IS an RFQ now, so an RFQ facet is 124 single-count options
    // beside 124 rows; the status facet duplicates the tab strip.
    expect(within(sidebar).queryByText("RFQ")).not.toBeInTheDocument();
    expect(within(sidebar).queryByText("Status")).not.toBeInTheDocument();
  });
});

// ── viewer-scoped filter ───────────────────────────────────────────────────

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
      // Both survive — an RFQ's state and whether it is waiting on YOU are
      // different questions and must be answerable at the same time.
      expect(req.tab).toBe("ready_for_decision");
      expect(req.needsMyApproval).toBe(true);
    });
  });
});

// ── search ─────────────────────────────────────────────────────────────────

describe("search", () => {
  it("leaves the badges to the server, which now counts the searched set", async () => {
    await renderList(
      mkResponse([
        mkParent(),
        mkParent({ parent_key: "RFQ:640", rfq_id: 640, rfq_no: 536401, title: "Kitchen equipment" }),
        mkParent({ parent_key: "RFQ:701", rfq_id: 701, rfq_no: 536500, title: "Laundry chemicals" }),
      ])
    );
    expect(allCards()).toHaveLength(3);

    // The server runs search BEFORE tab_counts and facets, so a searched
    // response carries badges that agree with its own rows. The page must
    // render those numbers rather than recomputing anything client-side.
    getNegotiationListView.mockResolvedValue(
      mkResponse([mkParent({ title: "Kitchen equipment", parent_key: "RFQ:640", rfq_id: 640 })], {
        tab_counts: { all: 1, for_me: 0, ready_for_decision: 1 },
      })
    );
    fireEvent.change(screen.getByPlaceholderText(/Search by title or number/i), {
      target: { value: "kitchen" },
    });

    await waitFor(() => expect(lastRequest().search).toBe("kitchen"));
    await waitFor(() => expect(allCards()).toHaveLength(1));

    // The status tab strip is the second .tab-row (the first selects the
    // source). Its "All" badge has to agree with what is on screen.
    const statusTabs = document.querySelectorAll(".tab-row")[1];
    expect(within(statusTabs).getByRole("button", { name: /^All/ })).toHaveTextContent("All 1");
  });
});
