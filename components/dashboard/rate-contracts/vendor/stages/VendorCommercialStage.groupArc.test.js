// VendorCommercialStage — pricing a GROUP rate contract. The vendor quotes
// one price per item for every hotel it was invited for, so the page says so
// and names those hotels instead of a single business unit.

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import VendorCommercialStage from "./VendorCommercialStage";

const props = (arc) => ({
  arc,
  items: [],
  price: {},
  totals: { subtotal: 0, gst: 0, charges: 0, grand: 0 },
  globals: { paymentTerms: [], comment: "" },
  paymentTotal: 0,
  globalCharges: [],
  lineChargeTypes: [],
  globalChargeTypes: [],
  termStart: "01 Oct 26",
  termEnd: "30 Sep 27",
  submissionEnd: "15 Sep 26",
  saveState: "idle",
  readOnly: true,
});

test("a group contract asks for one price that covers every invited hotel", () => {
  render(<VendorCommercialStage {...props({
    is_group: true,
    hotels: [{ hotel_id: 3, name: "Goa Resort" }, { hotel_id: 4, name: "Mumbai Suites" }],
  })} />);

  expect(screen.getByText(/same price applies at every hotel you were invited for/i)).toBeInTheDocument();
  expect(screen.getByText("Goa Resort, Mumbai Suites")).toBeInTheDocument();
  expect(screen.queryByText(/Single-BU/)).not.toBeInTheDocument();
});

test("a single-hotel contract keeps its business unit", () => {
  render(<VendorCommercialStage {...props({ is_group: false, hotel_name: "Goa Resort", hotel_code: "GR" })} />);

  expect(screen.getByText(/Single-BU contract/)).toBeInTheDocument();
});
