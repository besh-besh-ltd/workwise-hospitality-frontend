// ViewRFQ — items closed without award.
//
// A closed item must read as closed (reason, who, when), never as "Vendor
// finalized": the card used to call anything other than two known strings
// "finalized", and the server now sends "Closed without award". The creator
// gets "Close remaining items" while items are still open, before or after the
// bid deadline, and Reopen on a closed item.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "720" },
    asPath: "/dashboard/buyer/rfq-management-details?id=720",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 4, name: "Test Buyer" } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqLineage: jest.fn(() => Promise.resolve({ data: { copied_from: null, copies: [] } })),
  getTechEvalStatus: jest.fn(() => Promise.resolve({ data: null })),
  getRfqLifecycle: jest.fn(() => Promise.resolve({ data: null })),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getNegotiationRoundsByProduct: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(() => Promise.resolve({ status: 1, data: {} })),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({
  __esModule: true,
  default: () => ({ hasClauses: false, loading: false }),
}));
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/StageShared", () => ({
  __esModule: true,
  StageSkeleton: () => null,
  LifecycleContext: () => null,
}));

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ViewRFQ from "./ViewRFQ";

const product = (id, name, extra = {}) => ({
  id,
  product_id: id,
  product_details: [{ id, name }],
  product_specs: [{ title: "Quantity", value: "10" }, { title: "Unit", value: "NOS" }],
  finalization_status: "No vendor finalized yet",
  vendors_count: 3,
  participated_vendors_count: 0,
  ...extra,
});

const rfq = (over = {}) => ({
  id: 720,
  rfq_no: "536621",
  title: "Bathroom fittings",
  status: 1,
  is_published: 1,
  is_tender: 0,
  created_by: 4,
  bid_end_date: "2026-01-01 10:00",
  terms: [],
  company_name: "Test Hospitality",
  hotel_name: "Hotel One",
  timestamp: "2025-12-20T10:00:00.000Z",
  products: [
    product(11, "Basin mixer", {
      finalization_status: "Another vendor is finalized",
      finalized_vendor: { vendor_id: 9, vendor_name: "Vendor Alpha", finalized_amount: 12000 },
    }),
    product(12, "Towel rail", {
      finalization_status: "Closed without award",
      closed_at: "2026-11-02T09:00:00.000Z",
      close_reason_code: "no_quotes_received",
      close_remarks: "nobody stocks it",
      closed_by: { id: 4, name: "Test Buyer" },
    }),
    product(13, "Shower head"),
  ],
  award_outcome: "in_progress",
  items_summary: { total: 3, awarded: 1, award_pending: 0, closed_no_award: 1, open: 1 },
  ...over,
});

const cardOf = (name) => screen.getByText(name).closest(`[class*="productCard"]`);

describe("ViewRFQ — items closed without award", () => {
  it("shows a closed item as closed, with its reason, never as finalized", async () => {
    render(<ViewRFQ data={rfq()} isCreator onCloseRFQ={jest.fn()} onCloseItems={jest.fn()} onReopenItem={jest.fn()} />);
    const closedCard = await screen.findByText("Towel rail").then((el) => el.closest(`[class*="productCard"]`));
    const strip = within(closedCard).getByTestId("item-closed-strip");
    expect(strip).toHaveTextContent("Closed without award");
    expect(strip).toHaveTextContent("No quotes received — “nobody stocks it”");
    expect(strip).toHaveTextContent("by Test Buyer");
    expect(within(closedCard).queryByText("Vendor finalized")).not.toBeInTheDocument();
    expect(within(closedCard).queryByText("Vendor finalized for this product")).not.toBeInTheDocument();
    expect(within(closedCard).getByText("Closed without award", { selector: `[class*="negMeta"]` })).toBeInTheDocument();

    // The awarded item still reads as finalized; the open one has no strip.
    expect(within(cardOf("Basin mixer")).getByText("Vendor Alpha")).toBeInTheDocument();
    expect(within(cardOf("Shower head")).queryByTestId("item-closed-strip")).not.toBeInTheDocument();
  });

  it("offers Close remaining items and Reopen to the creator once bidding is over", async () => {
    const onCloseItems = jest.fn();
    const onReopenItem = jest.fn();
    render(<ViewRFQ data={rfq()} isCreator onCloseRFQ={jest.fn()} onCloseItems={onCloseItems} onReopenItem={onReopenItem} />);

    fireEvent.click(await screen.findByRole("button", { name: /Close remaining items/ }));
    expect(onCloseItems).toHaveBeenCalled();

    fireEvent.click(within(cardOf("Towel rail")).getByRole("button", { name: "Reopen" }));
    expect(onReopenItem).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
  });

  it("offers Close remaining items before the bid deadline too", async () => {
    render(
      <ViewRFQ
        data={rfq({ bid_end_date: "2999-01-01 10:00" })}
        isCreator onCloseRFQ={jest.fn()} onCloseItems={jest.fn()} onReopenItem={jest.fn()}
      />
    );
    expect(await screen.findByRole("button", { name: /Close remaining items/ })).toBeInTheDocument();
  });

  it("offers it when the only item left is awaiting award approval, so the dialog can say why", async () => {
    render(
      <ViewRFQ
        data={rfq({ items_summary: { total: 3, awarded: 1, award_pending: 1, closed_no_award: 1, open: 0 } })}
        isCreator onCloseRFQ={jest.fn()} onCloseItems={jest.fn()} onReopenItem={jest.fn()}
      />
    );
    expect(await screen.findByRole("button", { name: /Close remaining items/ })).toBeInTheDocument();
  });

  it("offers neither to someone who is not the creator, nor when nothing is left open", async () => {
    const { unmount } = render(
      <ViewRFQ data={rfq()} isCreator={false} onCloseRFQ={jest.fn()} onCloseItems={jest.fn()} onReopenItem={jest.fn()} />
    );
    await screen.findByText("Towel rail");
    expect(screen.queryByRole("button", { name: /Close remaining items/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
    unmount();

    render(
      <ViewRFQ
        data={rfq({ items_summary: { total: 3, awarded: 1, award_pending: 0, closed_no_award: 2, open: 0 }, award_outcome: "partially_awarded" })}
        isCreator onCloseRFQ={jest.fn()} onCloseItems={jest.fn()} onReopenItem={jest.fn()}
      />
    );
    await screen.findByText("Towel rail");
    expect(screen.queryByRole("button", { name: /Close remaining items/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("partial-award-banner")).toHaveTextContent("Partially awarded (1 of 3)");
  });

  it("names the outcome on a closed RFQ", async () => {
    render(
      <ViewRFQ
        data={rfq({ status: 2, award_outcome: "partially_awarded", items_summary: { total: 3, awarded: 1, award_pending: 0, closed_no_award: 2, open: 0 }, close_comment: "Reason: sourcing finished" })}
        isCreator onCloseRFQ={jest.fn()} onCloseItems={jest.fn()} onReopenItem={jest.fn()}
      />
    );
    expect(await screen.findByText(/RFQ is closed · Partially awarded \(1 of 3\)\./)).toBeInTheDocument();
    // A closed RFQ's items can no longer be reopened.
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });
});
