// ProductComparisonTab — the list of per-product comparison cards, and the
// only place a vendor finalization can actually be approved.
//
// REGRESSION GUARD. Finalization approvals are raised per product, but the
// approval email linked per RFQ and this list ignored the product entirely.
// Production RFQ #536255 has 47 pending finalization approvals across 47
// products: the approver got 47 identical links and had to find 47 different
// cards by eye.
//
// Product-level: what the approver sees when they follow their link — is the
// right card identified and brought into view — and that the list is unchanged
// for everyone who arrives without those params.

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProductComparisonTab, { productCardAnchorId } from "./ProductComparisonTab";

// The matrix owns the Approve control and pulls in the whole negotiation /
// approval stack; stub it so this file tests the card list, not that subtree.
jest.mock(
  "@/components/dashboard/buyer/quoteCompare/tables/ProductComparisonMatrix",
  () => ({
    __esModule: true,
    default: ({ proditem }) => <div data-testid={`matrix-${proditem.id}`} />,
  })
);
jest.mock("@/components/dashboard/buyer/negotiation/NegotiationModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/shared/LPRModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
}));

const product = (id, name) => ({
  id,
  product_variant_id: id * 10,
  variant: "v1",
  product_details: [{ product_name: name, rfq_details: [] }],
  product_specs: [],
  quotations: [{ id: id * 100, finalization: null }],
  rfq: [{ status: 1, project_id: -1 }],
  aggregates: {},
});

// A small slice of RFQ #536255's shape: many products, one of them the target.
const QUOTES = [
  product(8890, "Bath towel 500 GSM"),
  product(8891, "Bed linen 300 TC"),
  product(8892, "Face towel 400 GSM"),
];

const baseProps = {
  quotesLoading: false,
  quotes: QUOTES,
  rfq: "711",
  openModals: {},
  openModalForVariant: () => {},
  closeModalForVariant: () => {},
  handleFinalize: () => {},
  originalQuotes: QUOTES,
  productSummaryMap: {},
  quoteVisibility: { locked: false },
};

let scrolledInto;

beforeEach(() => {
  scrolledInto = [];
  jest.useFakeTimers();
  // jsdom has no layout engine, so scrollIntoView is not implemented.
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoViewStub(opts) {
    scrolledInto.push({ id: this.id, opts });
  };
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("approval deep link (?rfq_product_id=…&focus=approval)", () => {
  it("scrolls the linked product's card into view", () => {
    render(
      <ProductComparisonTab {...baseProps} focusProductId="8891" focusReason="approval" />
    );

    jest.runAllTimers();

    expect(scrolledInto).toHaveLength(1);
    expect(scrolledInto[0].id).toBe(productCardAnchorId(8891));
  });

  it("marks that card out from its neighbours", () => {
    const { container } = render(
      <ProductComparisonTab {...baseProps} focusProductId="8891" focusReason="approval" />
    );

    const focused = container.querySelector(`#${productCardAnchorId(8891)}`);
    const sibling = container.querySelector(`#${productCardAnchorId(8890)}`);

    // The focused card carries a class its neighbours do not — scrolling alone
    // leaves the approver guessing which of the cards on screen is theirs.
    expect(focused.className).not.toBe(sibling.className);
    expect(focused.className.split(" ").length).toBeGreaterThan(
      sibling.className.split(" ").length
    );
  });

  it("tells the approver why they are on this card", () => {
    render(
      <ProductComparisonTab {...baseProps} focusProductId="8891" focusReason="approval" />
    );

    expect(screen.getByText(/approval request is for this product/i)).toBeInTheDocument();
  });

  it("finds the card when the matrix loads after first paint", () => {
    // Real sequence: quotes start empty (loading), then arrive.
    const { rerender } = render(
      <ProductComparisonTab
        {...baseProps}
        quotes={[]}
        quotesLoading
        focusProductId="8891"
        focusReason="approval"
      />
    );
    jest.runAllTimers();
    expect(scrolledInto).toHaveLength(0);

    rerender(
      <ProductComparisonTab {...baseProps} focusProductId="8891" focusReason="approval" />
    );
    jest.runAllTimers();

    expect(scrolledInto).toHaveLength(1);
    expect(scrolledInto[0].id).toBe(productCardAnchorId(8891));
  });

  it("does not yank the viewport again when the list refetches", () => {
    // Approving/finalizing refetches the products — the user has scrolled on
    // by then and must not be dragged back.
    const { rerender } = render(
      <ProductComparisonTab {...baseProps} focusProductId="8891" focusReason="approval" />
    );
    jest.runAllTimers();
    expect(scrolledInto).toHaveLength(1);

    rerender(
      <ProductComparisonTab
        {...baseProps}
        quotes={[...QUOTES]}
        focusProductId="8891"
        focusReason="approval"
      />
    );
    jest.runAllTimers();

    expect(scrolledInto).toHaveLength(1);
  });

  it("does nothing when the linked product is not in this RFQ", () => {
    render(
      <ProductComparisonTab {...baseProps} focusProductId="999999" focusReason="approval" />
    );
    jest.runAllTimers();

    expect(scrolledInto).toHaveLength(0);
    expect(screen.getByText("Bath towel 500 GSM")).toBeInTheDocument();
  });
});

describe("without the deep-link params", () => {
  it("renders every product and scrolls nowhere", () => {
    render(<ProductComparisonTab {...baseProps} />);
    jest.runAllTimers();

    expect(screen.getByText("Bath towel 500 GSM")).toBeInTheDocument();
    expect(screen.getByText("Bed linen 300 TC")).toBeInTheDocument();
    expect(screen.getByText("Face towel 400 GSM")).toBeInTheDocument();
    expect(scrolledInto).toHaveLength(0);
    expect(screen.queryByText(/approval request is for this product/i)).not.toBeInTheDocument();
  });

  it("still shows the empty state when there are no quotes", () => {
    render(<ProductComparisonTab {...baseProps} quotes={[]} />);
    expect(screen.getByText(/don't have any quotes/i)).toBeInTheDocument();
  });
});
