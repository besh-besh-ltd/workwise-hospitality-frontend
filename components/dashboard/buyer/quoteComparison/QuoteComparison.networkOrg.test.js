// QuoteComparison — a vendor quoting as an entity of a vendor network carries
// "via {org}" under its name (Vendor Networks spec §6.3, §9). The view sends
// `org_name` only for such vendors; every other column is unchanged.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/quote-comparison?rfq=363",
    pathname: "/dashboard/buyer/quote-comparison",
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({ __esModule: true, default: () => <div>access denied</div> }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
}));
jest.mock("@/services/pricing", () => ({ __esModule: true, getQuoteComparisonView: jest.fn() }));
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
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison from "./QuoteComparison";
import VendorOrgLabel, { viaOrgText } from "../VendorOrgLabel";

const MEMBER = 501; // Daikin UP, an entity of the Daikin India network
const PLAIN = 502; // a vendor with no network

const cell = (vendorId, base) => ({
  base, subtotal: base * 10, tax_amt: 0, delivery_charges: 0, total: base * 10,
  other_charges: [], global_charges: [], history: [], negotiation: null,
  finalize: { vendor_id: vendorId, quote_id: vendorId, quote_item_id: vendorId, unit_price: base, total_value: base * 10, charges_meta: {} },
});

const view = {
  rfq: { id: 363, rfq_no: "536700", title: "Chillers", status: "OPEN", project_id: null, quotes_invited: 2, quotes_received: 2 },
  quotes_locked: false,
  bid_end_date: "2026-10-25T10:00:00.000Z",
  vendors: [
    { id: MEMBER, name: "Daikin UP", short: "DU", org_name: "Daikin India" },
    { id: PLAIN, name: "Cool Traders", short: "CT", org_name: null },
  ],
  categories: [{ id: 1, name: "HVAC" }],
  products: [{
    id: 9001, name: "CHILLER", qty: 10, unit: "nos", category: 1, state: "open", awaiting_me: false,
    finalized_vendor: null, finalized_by: null, negotiation: null, reject_info: null, quoted_count: 2,
    tech: { configured: false, scores: {} },
    quotes: { [MEMBER]: cell(MEMBER, 900), [PLAIN]: cell(PLAIN, 950) },
    quotes_absence: {}, approval: { current_approvers: [] },
  }],
  approval_chain: [],
  has_delivery_charges: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

test("the network entity's column says which network it quotes via; the plain vendor's says nothing", async () => {
  getQuoteComparisonView.mockResolvedValue(view);
  render(<QuoteComparison rfqId="363" embedded />);
  await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
  await screen.findByText("CHILLER");

  const header = screen.getAllByText("Daikin UP")[0].closest("th");
  expect(header).toHaveTextContent("via Daikin India");
  const plain = screen.getAllByText("Cool Traders")[0].closest("th");
  expect(plain).not.toHaveTextContent(/via /);
  expect(screen.getAllByText("via Daikin India")).toHaveLength(1);
});

describe("VendorOrgLabel", () => {
  test("renders 'via {org}' only for a non-blank org name", () => {
    expect(viaOrgText("Daikin India")).toBe("via Daikin India");
    expect(viaOrgText("  ")).toBeNull();
    expect(viaOrgText(null)).toBeNull();
    expect(viaOrgText(undefined)).toBeNull();

    const { container, rerender } = render(<VendorOrgLabel orgName="Daikin India" />);
    expect(container).toHaveTextContent("via Daikin India");
    rerender(<VendorOrgLabel orgName={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
