jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import VendorPoDashboard from "./VendorPoDashboard";

const item = (over) => ({ id: 1, po_number: "138859", buyer_name: "Phileein", total_value: 10, ...over });
const mount = (attention) =>
  render(<VendorPoDashboard data={{ attention }} loading={false} />);

test("attention items carry the RFQ / ARC reference line", () => {
  mount([
    item({ rfq_no: "536894", rfq_title: "Bath &amp; Body" }),
    item({ id: 2, po_number: "138861", is_call_off: true, arc_number: "77", arc_title: "Linen", mr_number: "MR-5" }),
  ]);
  expect(screen.getByText("RFQ #536894")).toBeInTheDocument();
  expect(screen.getByText("Bath & Body")).toBeInTheDocument();
  expect(screen.getByText("ARC 77")).toBeInTheDocument();
  expect(screen.getByText("MR MR-5")).toBeInTheDocument();
});

test("older backend: no reference line, no 'undefined'", () => {
  mount([item({})]);
  expect(document.body.textContent).not.toMatch(/undefined|RFQ #/);
});
