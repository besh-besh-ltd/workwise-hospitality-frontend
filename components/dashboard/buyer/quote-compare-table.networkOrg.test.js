// Legacy quote comparison (/dashboard/buyer/quote-compare-table): a vendor that
// quotes as an entity of a vendor network carries "via {org}" under its name
// (Vendor Networks spec §6.3, §9). The column data is /rfq/quote-compare's
// quote_details.vendor_details, which has org_name (null without a network).

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { rfq: "363" }, push: jest.fn(), replace: jest.fn(), asPath: "/" }),
}));
jest.mock("next/image", () => ({ __esModule: true, default: (props) => <img alt={props.alt} /> }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getQuoteApprovalStatus: jest.fn(() => Promise.resolve({ status: 0 })),
  approveNegotiationQuotes: jest.fn(),
  rejectNegotiationQuotes: jest.fn(),
}));
jest.mock("@/services/general", () => ({
  __esModule: true,
  getAvailableHierarchies: jest.fn(() => Promise.resolve({ data: [] })),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getQuoteApprovalStatus } from "@/services/negotiation";
import QuoteCompareTable from "./quote-compare-table";

const quote = (quoteId, vendor, unitPrice) => ({
  quote_id: quoteId,
  unit_price: unitPrice,
  total_price: unitPrice * 10,
  quantity: 10,
  previous_quotes: [],
  quote_details: { created_by: vendor.id, is_regret: 0, vendor_details: vendor },
});

const quotations = [
  quote(1, { id: 501, name: "Daikin UP", org_name: "Daikin India" }, 900),
  quote(2, { id: 502, name: "Cool Traders", org_name: null }, 950),
];

test("the network entity's column says which network it quotes via; the plain vendor's says nothing", async () => {
  render(
    <QuoteCompareTable
      quotations={quotations}
      originalQuotations={quotations}
      quantity={10}
      handleFinalize={jest.fn()}
      proditem={{ id: 9001, finalization_history: [], product_details: [{ rfq_details: [{ title: "Quantity", value: 10 }] }] }}
      alreadyFinalized={false}
    />
  );
  await waitFor(() => expect(getQuoteApprovalStatus).toHaveBeenCalled());

  const member = screen.getByText("Daikin UP").closest("span");
  expect(member).toHaveTextContent("via Daikin India");
  const plain = screen.getByText("Cool Traders").closest("span");
  expect(plain).not.toHaveTextContent(/via /);
  expect(screen.getAllByText("via Daikin India")).toHaveLength(1);
});
