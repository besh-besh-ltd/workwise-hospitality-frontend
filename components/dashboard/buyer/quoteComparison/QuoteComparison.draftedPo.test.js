// QuoteComparison — straight after a Commercial Approver approves quotes, say
// what happened to the purchase order.
//
// Approving the award is the moment the draft PO is created, and it is the same
// person who then forgets that initiating it is a separate step. POST
// /negotiation/quotes/:id/approve returns drafted_pos
// [{id, po_number, initiate_kind, can_initiate}]; the page names each draft and:
//   can_initiate true  -> "Draft PO {no} created. Initiate it now →" (a link)
//   can_initiate false -> "Draft PO {no} created. A PO initiator will initiate it."

const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/rfq-management-details?id=720",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: (...a) => mockPush(...a),
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
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
  approveNegotiationQuotes: jest.fn(),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import { approveNegotiationQuotes } from "@/services/negotiation";
import QuoteComparison from "./QuoteComparison";

const SHARMA = 5512;
const quote = (base) => ({
  base,
  subtotal: base * 10,
  tax_amt: 0,
  total: base * 10,
  other_charges: [],
  history: [],
  finalize: { vendor_id: SHARMA, quote_id: 1, quote_item_id: 1, unit_price: base, total_value: base * 10, charges_meta: {} },
});
const viewPayload = () => ({
  rfq: { id: 720, rfq_no: "536264", title: "Window fittings", status: "OPEN", project_id: null },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [{ id: SHARMA, name: "Sharma Glassworks", short: "SG" }],
  categories: [{ id: 1, name: "Fittings" }],
  products: [
    {
      id: 8802, name: "WINDOW B", qty: 10, unit: "nos", category: 1, state: "pending", awaiting_me: true,
      finalized_vendor: SHARMA, quoted_count: 1, quotes: { [SHARMA]: quote(1500) },
      approval: { current_approvers: [{ name: "Prashant Joshi" }] },
    },
  ],
  approval_chain: [],
  has_delivery_charges: false,
});

const approveAll = async () => {
  render(<QuoteComparison rfqId="720" embedded />);
  await screen.findByText("WINDOW B");
  fireEvent.click(await screen.findByRole("button", { name: /^approve$/i }));
  fireEvent.click(await screen.findByRole("button", { name: /review & confirm/i }));
  fireEvent.click(await screen.findByRole("button", { name: /confirm 1 decision/i }));
  await waitFor(() => expect(approveNegotiationQuotes).toHaveBeenCalledTimes(1));
};

beforeEach(() => {
  jest.clearAllMocks();
  getQuoteComparisonView.mockResolvedValue(viewPayload());
});

describe("after approving the award", () => {
  test("a draft the approver can initiate is offered as a link to the PO page, in guide mode", async () => {
    approveNegotiationQuotes.mockResolvedValue({
      data: { status: 1, data: { drafted_pos: [{ id: 139141, po_number: "139141", initiate_kind: "complete", can_initiate: true }] } },
    });
    await approveAll();

    const note = await screen.findByTestId("qc-drafted-po");
    expect(note).toHaveTextContent("Draft PO 139141 created.");
    expect(within(note).getByRole("link", { name: /initiate it now/i })).toHaveAttribute(
      "href",
      "/dashboard/buyer/purchase-orders/139141?action=initiate"
    );
  });

  test("a draft the approver cannot initiate says who will, and offers no link", async () => {
    approveNegotiationQuotes.mockResolvedValue({
      data: { status: 1, data: { drafted_pos: [{ id: 139141, po_number: "139141", initiate_kind: "complete", can_initiate: false }] } },
    });
    await approveAll();

    const note = await screen.findByTestId("qc-drafted-po");
    expect(note).toHaveTextContent("Draft PO 139141 created. A PO initiator will initiate it.");
    expect(within(note).queryByRole("link", { name: /initiate it now/i })).toBeNull();
  });

  test("an older backend (no drafted_pos) shows nothing extra", async () => {
    approveNegotiationQuotes.mockResolvedValue({ data: { status: 1, data: {} } });
    await approveAll();
    await screen.findByText("1 approved · 0 rejected · buyer notified");
    expect(screen.queryByTestId("qc-drafted-po")).toBeNull();
  });
});
