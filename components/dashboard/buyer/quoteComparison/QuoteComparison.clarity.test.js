// QuoteComparison — award clarity, negotiation in-row, delivery-charge toggle.
//
// Three client-reported problems, all defended here.
//
// 1. "Difficulty in identifying the finalized vendor, the color scheme is not
//    working here clearly." The cell said "APPROVED", never "Finalized" — and
//    a merely-cheapest L1 cell is ALSO green (a pale tint), so award and
//    cheapness looked alike. The word and the finalizer's name now appear on a
//    SOLID badge.
//
// 2. Negotiation state lived in a separate panel fed by a different endpoint.
//    It now renders on the product rows, including RFQ-level asks that belong
//    to no single product.
//
// 3. The "Landed cost (with freight)" toggle did nothing: the backend flag was
//    dead AND these components re-added freight regardless AND the line
//    labelled "landed" rendered the pre-charge price. All three are fixed; the
//    toggle is also hidden on the 76% of RFQs that carry no delivery charge at
//    all, so it can never again look broken.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/rfq-management-details?id=536264",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparisonView: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  finalizeQuotation: jest.fn(() => Promise.resolve({})),
  getRFQById: jest.fn(() => Promise.resolve({ data: { hotel_ids: [1], department_id: 2 } })),
  getRfqs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  approveNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison from "./QuoteComparison";

const RFQ_ID = "720";
const SHARMA = 5512;
const METRO = 5513;

// base 1000 x qty 10 = 10,000 subtotal; 18% tax = 1,800; delivery 500.
// with charges    -> 12,300   (per unit 1,230)
// ex-delivery     -> 11,800   (per unit 1,180)
const quote = ({ base = 1000, delivery = 500, negotiation = null } = {}) => ({
  base,
  subtotal: base * 10,
  tax_amt: Math.round(base * 10 * 0.18),
  delivery_charges: delivery,
  total: Math.round(base * 10 * 1.18) + delivery,
  other_charges: delivery ? [{ label: "Freight", amount: delivery }] : [],
  history: [],
  negotiation,
  finalize: { vendor_id: SHARMA, quote_id: 1, quote_item_id: 1, unit_price: base, total_value: 0, charges_meta: {} },
});

const product = (over = {}) => ({
  id: 8801,
  name: "WINDOW A",
  qty: 10,
  unit: "nos",
  category: 1,
  state: "approved",
  awaiting_me: false,
  finalized_vendor: SHARMA,
  finalized_by: { name: "Nitin Rajenimbalkar", at: "2026-07-31T10:00:00.000Z", comment: null },
  negotiation: null,
  quoted_count: 2,
  quotes: { [SHARMA]: quote(), [METRO]: quote({ base: 1100 }) },
  approval: { current_approvers: [{ name: "Prashant Joshi" }] },
  ...over,
});

const payload = ({ products = [product()], hasDelivery = true } = {}) => ({
  rfq: { id: 720, rfq_no: "536264", title: "Window fittings", status: "OPEN", project_id: null },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [
    { id: SHARMA, name: "Sharma Glassworks", short: "SG" },
    { id: METRO, name: "Metro Fittings", short: "MF" },
  ],
  categories: [{ id: 1, name: "Fittings" }],
  products,
  approval_chain: [],
  has_delivery_charges: hasDelivery,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

// The sheet refetches when the toggle flips, and the server returns totals with
// delivery already removed. Mirror that here rather than replaying one fixed
// payload — otherwise the vendor grand total (which reads the server's q.total)
// would look stuck, and the test would be lying about what production does.
const renderSheet = async (view) => {
  getQuoteComparisonView.mockImplementation((_rfq, opts = {}) => {
    const on = opts.freight !== false && opts.freight !== 0 && opts.freight !== "0";
    if (on) return Promise.resolve(view);
    // Mirror the real contract: the server both reduces `total` AND strips the
    // delivery entries out of other_charges, so the client needs no flag.
    return Promise.resolve({
      ...view,
      products: view.products.map((p) => ({
        ...p,
        quotes: Object.fromEntries(
          Object.entries(p.quotes).map(([vid, q]) => [
            vid,
            q
              ? {
                  ...q,
                  total: q.total - (q.delivery_charges || 0),
                  other_charges: (q.other_charges || []).filter((c) => c.label !== "Freight"),
                }
              : q,
          ])
        ),
      })),
    });
  });
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
  await screen.findByText("WINDOW A");
  return utils;
};

const toggle = () => screen.queryByText(/include delivery charges/i);

// ===========================================================================

describe("QuoteComparison — the finalized vendor is unmistakable", () => {
  it("names the finalizer on the awarded cell", async () => {
    await renderSheet(payload());

    const badge = await screen.findByTestId("finalized-badge");
    expect(badge).toHaveTextContent(/finalized/i);
    expect(badge).toHaveTextContent("Nitin R.");
    expect(badge.getAttribute("title")).toMatch(/Finalized by Nitin Rajenimbalkar/);
  });

  it("says FINALIZED even while the approval is still pending", async () => {
    await renderSheet(payload({ products: [product({ state: "pending" })] }));

    expect(await screen.findByTestId("finalized-badge")).toHaveTextContent(/finalized/i);
  });

  it("keeps the approval state out of the finalized badge", async () => {
    await renderSheet(payload());

    const badge = await screen.findByTestId("finalized-badge");
    // Award and sign-off are different facts and must not be conflated.
    expect(badge).not.toHaveTextContent(/approved/i);
  });

  it("renders no finalized badge on a merely-cheapest cell", async () => {
    await renderSheet(payload({ products: [product({ finalized_vendor: null, finalized_by: null, state: "open" })] }));

    expect(screen.queryByTestId("finalized-badge")).toBeNull();
  });

  it("still renders the badge when the finalizer name is missing", async () => {
    await renderSheet(payload({ products: [product({ finalized_by: null })] }));

    const badge = await screen.findByTestId("finalized-badge");
    expect(badge).toHaveTextContent(/finalized/i);
  });
});

describe("QuoteComparison — delivery-charge toggle", () => {
  it("is hidden when the RFQ carries no delivery charge anywhere", async () => {
    await renderSheet(payload({
      products: [product({ quotes: { [SHARMA]: quote({ delivery: 0 }), [METRO]: quote({ base: 1100, delivery: 0 }) } })],
      hasDelivery: false,
    }));

    expect(toggle()).toBeNull();
  });

  it("is shown when a delivery charge exists", async () => {
    await renderSheet(payload());

    expect(toggle()).toBeInTheDocument();
  });

  it("subtracts the delivery charge from the displayed price when switched off", async () => {
    await renderSheet(payload());

    // The figure appears in the cell and again in the vendor column total.
    expect(await screen.findAllByText("₹12,300")).not.toHaveLength(0);

    fireEvent.click(toggle());

    // The cell recomputes instantly on the client; the vendor grand total
    // follows once the refetch lands. Wait for both to settle.
    expect(await screen.findAllByText("₹11,800")).not.toHaveLength(0);
    // Nowhere on the sheet should the delivery-inclusive figure survive — this
    // is what caught the "Best price per product" summary row, which computed
    // through l1TotalFor and was not threaded.
    await waitFor(() => expect(screen.queryAllByText("₹12,300")).toHaveLength(0));
  });

  it("labels the per-unit line to match the toggle state", async () => {
    await renderSheet(payload());

    expect(await screen.findAllByText(/with charges/i)).not.toHaveLength(0);

    fireEvent.click(toggle());

    expect(await screen.findAllByText(/ex-delivery/i)).not.toHaveLength(0);
  });

  it("moves the per-unit figure too, not just the label", async () => {
    // The line used to render q.base — the PRE-charge price — while calling
    // itself "landed", so it never moved in either direction.
    await renderSheet(payload());

    expect(await screen.findByText("₹1,230/nos")).toBeInTheDocument();

    fireEvent.click(toggle());

    expect(await screen.findByText("₹1,180/nos")).toBeInTheDocument();
  });
});

describe("QuoteComparison — negotiation on the product rows", () => {
  const withNegotiation = (over = {}) =>
    product({
      negotiation: {
        state: "open_with_vendors",
        round_position: 2,
        round_id: 91,
        ends_at: "2026-07-22T11:30:00.000Z",
        invited_count: 3,
        responded_count: 1,
        asks: [{ field: "base_price", label: "Base price", target: "950", mode: null, demand: null, is_text: false }],
        rfq_level_asks: [],
        ...over,
      },
    });

  it("shows the derived state, round position and reply count", async () => {
    await renderSheet(payload({ products: [withNegotiation()] }));

    const row = await screen.findByTestId("neg-state");
    expect(row).toHaveTextContent(/open with vendors/i);
    expect(row).toHaveTextContent("R2");
    expect(row).toHaveTextContent(/1 of 3 replied/i);
  });

  it("renders a numeric ask with a currency figure", async () => {
    await renderSheet(payload({ products: [withNegotiation()] }));

    expect(await screen.findByTestId("ask-base_price")).toHaveTextContent("Base price ₹950");
  });

  it("renders a text ask with no currency figure", async () => {
    await renderSheet(payload({
      products: [withNegotiation({
        asks: [{ field: "payment_terms", label: "Payment terms", target: "100% Credit 21 days", mode: null, demand: null, is_text: true }],
      })],
    }));

    const chip = await screen.findByTestId("ask-payment_terms");
    expect(chip).toHaveTextContent("Payment terms");
    expect(chip).not.toHaveTextContent("₹");
  });

  it("renders a documents ask that carries only a demand", async () => {
    await renderSheet(payload({
      products: [withNegotiation({
        asks: [{ field: "documents", label: "Documents", target: [], mode: null, demand: "Need photos", is_text: true }],
      })],
    }));

    expect(await screen.findByTestId("ask-documents")).toHaveTextContent("Documents: Need photos");
  });

  it("repeats an RFQ-wide ask on every product row, visually distinct", async () => {
    const rfqAsk = [{ field: "payment_terms", label: "Payment terms", target: "100% Credit 21 days", mode: null, demand: null, is_text: true }];
    await renderSheet(payload({
      products: [
        withNegotiation({ rfq_level_asks: rfqAsk }),
        product({ id: 8802, name: "WINDOW B", negotiation: { ...withNegotiation({ rfq_level_asks: rfqAsk }).negotiation } }),
      ],
    }));

    const chips = await screen.findAllByTestId("rfq-wide-ask");
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent(/RFQ-wide: Payment terms/i);
  });

  it("marks which vendors replied in the round and which have not", async () => {
    await renderSheet(payload({
      products: [product({
        negotiation: {
          state: "open_with_vendors", round_position: 1, round_id: 91, ends_at: null,
          invited_count: 2, responded_count: 1, asks: [], rfq_level_asks: [],
        },
        quotes: {
          [SHARMA]: quote({ negotiation: { responded: true, quoted_price: 11800, amount_basis: "line_total", quoted_at: "2026-07-21T00:00:00.000Z", asks: [] } }),
          [METRO]: quote({ base: 1100, negotiation: { responded: false, quoted_price: null, amount_basis: "line_total", quoted_at: null, asks: [{ field: "base_price", label: "Base price", target: "950", mode: null, demand: null, is_text: false }] } }),
        },
      })],
    }));

    expect(await screen.findByTestId(`vendor-neg-${SHARMA}`)).toHaveTextContent(/replied/i);
    const pending = screen.getByTestId(`vendor-neg-${METRO}`);
    expect(pending).toHaveTextContent(/awaiting reply/i);
    expect(pending).toHaveTextContent(/asked Base price ₹950/i);
  });

  it("never renders 'N of 0 replied'", async () => {
    // 71 legacy rounds have a NULL vendor_ids array and empty vendor_approvals,
    // so invited resolves to 0 while responses exist — 23 production product
    // rows would have rendered the literal nonsense "1 of 0 replied".
    await renderSheet(payload({
      products: [product({
        negotiation: {
          state: "ready_for_decision", round_position: 1, round_id: 91, ends_at: null,
          invited_count: 0, responded_count: 1, asks: [], rfq_level_asks: [],
        },
      })],
    }));

    const row = await screen.findByTestId("neg-state");
    expect(row).not.toHaveTextContent(/of 0 replied/i);
    expect(row).toHaveTextContent(/1 reply/i);
  });

  it("shows no counter at all when nobody was invited and nobody replied", async () => {
    await renderSheet(payload({
      products: [product({
        negotiation: {
          state: "lapsed", round_position: 1, round_id: 91, ends_at: null,
          invited_count: 0, responded_count: 0, asks: [], rfq_level_asks: [],
        },
      })],
    }));

    const row = await screen.findByTestId("neg-state");
    expect(row).not.toHaveTextContent(/replied/i);
    expect(row).not.toHaveTextContent(/repl/i);
  });

  it("renders nothing negotiation-related when no round covers the product", async () => {
    await renderSheet(payload());

    expect(screen.queryByTestId("neg-state")).toBeNull();
    expect(screen.queryByTestId("rfq-wide-ask")).toBeNull();
  });
});
