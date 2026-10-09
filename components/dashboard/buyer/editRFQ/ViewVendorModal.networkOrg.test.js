// The buyer's RFQ vendor list (View vendors on Edit RFQ / Create RFQ in edit mode):
// a vendor that is an entity of a vendor network carries "via {org}" under its name
// (Vendor Networks spec §6.3, §9). The rows are getRfqById?includeVendors=true's
// products[].vendor_details, which carry org_name (null without a network).


import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ViewVendorModal from "./ViewVendorModal";

const vendor = (user_id, company_name, org_name) => ({
  id: user_id,
  user_id,
  variant: 0,
  org_name,
  user_details: { user_id, name: company_name, company_name, email: `${user_id}@example.com`, mobile: "9000000000", address: null },
});

const renderModal = (vendors) =>
  render(
    <ViewVendorModal
      isOpen
      productData={{ product: { id: 5, name: "Split AC" }, vendors }}
      onClose={jest.fn()}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
      onSelectAll={jest.fn()}
      updatableData={{ vendors: {} }}
    />
  );

test("a networked vendor shows 'via {org}' under its name; a vendor in no network shows nothing extra", () => {
  renderModal([vendor(11, "Daikin UP", "Daikin India"), vendor(12, "Solo Traders", null)]);
  const up = screen.getByText("Daikin UP").closest("td");
  expect(within(up).getByText("via Daikin India")).toBeInTheDocument();
  const solo = screen.getByText("Solo Traders").closest("td");
  expect(within(solo).queryByText(/^via /)).toBeNull();
});
