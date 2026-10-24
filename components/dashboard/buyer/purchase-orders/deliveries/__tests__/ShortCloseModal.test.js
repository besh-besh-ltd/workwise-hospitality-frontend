import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShortCloseModal from "../ShortCloseModal";

const line = (id, poLineId, productName, unit, openQty, extra = {}) => ({
  id, poLineId, productName, unit, plannedQty: openQty, acceptedQty: 0, rejectedQty: 0,
  returnedReplaceQty: 0, returnedCreditQty: 0, shortClosedQty: 0, openQty, status: "open", ...extra,
});

const deliveries = [
  { id: 21, hotelId: 1, hotelName: "Hotel A-1", phaseNo: 1, dueDate: "2026-11-02", status: "partial",
    overdue: false, hasReceipts: true,
    lines: [line(201, 11, "Basmati rice", "kg", 2, { acceptedQty: 3, status: "partial" }), line(202, 12, "Olive oil", "litre", 0, { status: "received" })] },
  { id: 22, hotelId: 2, hotelName: "Hotel A-2", phaseNo: 1, dueDate: "2026-11-09", status: "open",
    overdue: false, hasReceipts: false,
    lines: [line(203, 11, "Basmati rice", "kg", 5), line(204, 12, "Olive oil", "litre", 3)] },
];
const hotels = [{ id: 1, name: "Hotel A-1" }, { id: 2, name: "Hotel A-2" }];

function mount(onSubmit = jest.fn(() => Promise.resolve())) {
  render(<ShortCloseModal show onHide={jest.fn()} deliveries={deliveries} hotels={hotels} onSubmit={onSubmit} />);
  return onSubmit;
}

const submit = () => screen.getByRole("button", { name: "Short-close" });
const preview = () => screen.getByTestId("short-close-preview");

test("short-close modal sends target and reason", async () => {
  const onSubmit = mount();

  // Whole PO by default: every open qty, per item.
  expect(preview()).toHaveTextContent("Basmati rice: 7 kg");
  expect(preview()).toHaveTextContent("Olive oil: 3 litre");

  fireEvent.click(screen.getByRole("radio", { name: "One phase" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Phase" }), { target: { value: "22" } });
  expect(preview()).toHaveTextContent("Basmati rice: 5 kg");

  // No reason yet: nothing is sent.
  expect(submit()).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Reason" }), { target: { value: "vendor_cannot_supply" } });
  fireEvent.click(submit());

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
    target: { type: "delivery", deliveryId: 22 },
    reasonCode: "vendor_cannot_supply",
    remarks: "",
  }));
});

test("remarks are required when the reason is other", () => {
  mount();
  fireEvent.change(screen.getByRole("combobox", { name: "Reason" }), { target: { value: "other" } });
  expect(submit()).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: /Remarks/ }), { target: { value: "Menu changed" } });
  expect(submit()).toBeEnabled();
});

test("selected rows sends the chosen delivery lines", async () => {
  const onSubmit = mount();
  fireEvent.click(screen.getByRole("radio", { name: "Selected rows" }));
  // Received rows have nothing open and can't be picked.
  expect(screen.queryByRole("checkbox", { name: /Olive oil · Hotel A-1 · Phase 1/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /Basmati rice · Hotel A-1 · Phase 1/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Olive oil · Hotel A-2 · Phase 1/ }));
  expect(preview()).toHaveTextContent("Basmati rice: 2 kg");
  expect(preview()).toHaveTextContent("Olive oil: 3 litre");
  fireEvent.change(screen.getByRole("combobox", { name: "Reason" }), { target: { value: "substituted" } });
  fireEvent.click(submit());
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
    target: { type: "lines", deliveryLineIds: [201, 204] }, reasonCode: "substituted", remarks: "",
  }));
});

test("one hotel targets that hotel's rows", async () => {
  const onSubmit = mount();
  fireEvent.click(screen.getByRole("radio", { name: "One hotel" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Hotel" }), { target: { value: "1" } });
  expect(preview()).toHaveTextContent("Basmati rice: 2 kg");
  expect(preview()).not.toHaveTextContent("Olive oil");
  fireEvent.change(screen.getByRole("combobox", { name: "Reason" }), { target: { value: "no_longer_needed" } });
  fireEvent.click(submit());
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
    target: { type: "hotel", hotelId: 1 }, reasonCode: "no_longer_needed", remarks: "",
  }));
});

test("shows the server's refusal in the dialog", async () => {
  mount(jest.fn(() => Promise.reject({
    response: { status: 422, data: { message: "Short-close is available once the vendor accepts the PO" } },
  })));
  fireEvent.change(screen.getByRole("combobox", { name: "Reason" }), { target: { value: "price_dispute" } });
  fireEvent.click(submit());
  expect(await screen.findByRole("alert")).toHaveTextContent("Short-close is available once the vendor accepts the PO");
});
