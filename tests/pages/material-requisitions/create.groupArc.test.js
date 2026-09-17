// MR create — ordering against a GROUP rate contract.
//
// A hotel orders against the group contract from its own share. The share is
// soft: the hotel may order past it while the group total has room (head
// office is told). The group's remaining quantity stays the hard cap.

jest.mock("@/services/mr", () => ({
  __esModule: true,
  getFormHotels: jest.fn(),
  getFormDepartments: jest.fn(),
  searchContractedItems: jest.fn(),
  getApprovalPreview: jest.fn(),
  createDraft: jest.fn(),
  submit: jest.fn(),
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: () => ({ hospitality_company_id: 4, hospitality_hotel_id: 12 }),
}));
const push = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, push, replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as MrApi from "@/services/mr";
import CreateMrPage from "@/pages/dashboard/buyer/material-requisitions/create";

const groupLine = {
  arc_contract_line_id: 81, arc_contract_id: 7, arc_id: 5, arc_number: "ARC-5", arc_title: "Linen group",
  product_variant_id: 300, variant_name: "Bath towel", variant_slug: "bath-towel", uom: "pcs",
  vendor_id: 1, vendor_name: "Alpha Linen", current_rate: 100,
  committed_qty: 650, consumed_qty: 100, remaining_qty: 550,
  is_group: true, hotel_committed_qty: 250, hotel_consumed_qty: 220, hotel_remaining_qty: 30,
};

async function pickTowel() {
  render(<CreateMrPage />);
  const selects = await screen.findAllByRole("combobox");
  await waitFor(() => expect(screen.getByRole("option", { name: "Housekeeping" })).toBeInTheDocument());
  fireEvent.change(selects[1], { target: { value: "9" } });
  await waitFor(() => expect(MrApi.searchContractedItems).toHaveBeenCalled());
  fireEvent.focus(screen.getByPlaceholderText("Search by name or code…"));
  fireEvent.mouseDown(await screen.findByText("Bath towel"));
}

beforeEach(() => {
  jest.clearAllMocks();
  MrApi.getFormHotels.mockResolvedValue({ data: { hotels: [{ id: 12, name: "Mumbai Suites" }] } });
  MrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }] } });
  MrApi.searchContractedItems.mockResolvedValue({ data: { items: [groupLine] } });
  MrApi.getApprovalPreview.mockResolvedValue({ data: null });
  MrApi.createDraft.mockResolvedValue({ data: { mr: { id: 900 } } });
});

test("a group line shows what is left for this hotel and for the group", async () => {
  await pickTowel();

  expect(screen.getByText(/30 pcs left for this hotel/)).toBeInTheDocument();
  expect(screen.getByText(/550 pcs left in the group/)).toBeInTheDocument();
});

test("ordering past the hotel's share warns but still submits, and says head office will be told", async () => {
  MrApi.submit.mockResolvedValue({
    data: { warnings: [{ arc_contract_line_id: 81, hotel_id: 12, quantity: 40, hotel_remaining_qty: 30, message: "Item 1: 40 is more than this hotel's remaining share (30)." }] },
  });
  await pickTowel();

  fireEvent.change(screen.getByPlaceholderText("e.g. Restock Basmati Rice · BAB"), { target: { value: "Towels" } });
  const date = document.querySelector('input[type="date"]');
  fireEvent.change(date, { target: { value: "2030-01-15" } });
  fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "40" } });

  expect(screen.getByText(/more than this hotel's share/i)).toBeInTheDocument();
  const submit = screen.getByRole("button", { name: /submit for approval/i });
  expect(submit).toBeEnabled();
  fireEvent.click(submit);

  await waitFor(() => expect(MrApi.submit).toHaveBeenCalledWith(900));
  expect(await screen.findByText(/1 item is over this hotel's share — head office will be told/i)).toBeInTheDocument();
});

test("the group's remaining quantity is still the hard cap", async () => {
  await pickTowel();

  fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "600" } });

  expect(screen.getByRole("button", { name: /submit for approval/i })).toBeDisabled();
  expect(screen.getByText(/Max 550 pcs left on this contract/)).toBeInTheDocument();
});
