// Item picker: the manual fallback next to every scan box. What it hands back
// carries trackExpiry, so labels and receipts can ask for batch and expiry.

jest.mock("@/services/inventory", () => ({ __esModule: true, getStock: jest.fn(), listItems: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getStock, listItems } from "@/services/inventory";
import ItemPicker from "../ItemPicker";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ItemPicker", () => {
  test("from the item master, a picked item says whether it tracks expiry", async () => {
    listItems.mockResolvedValue({
      rows: [
        { id: 21, displayName: "Milk 1L", itemCode: "MILK-1", stockUom: "packet", trackExpiry: true },
        { id: 9, displayName: "Basmati rice", itemCode: null, stockUom: "bag" },
      ],
      total: 2,
    });
    const onPick = jest.fn();
    render(<ItemPicker source="items" hotelId={46} onPick={onPick} />);
    fireEvent.change(screen.getByLabelText("Find an item"), { target: { value: "m" } });
    fireEvent.click(await screen.findByRole("button", { name: "Add Milk 1L" }));
    expect(listItems).toHaveBeenCalledWith({ search: "m", hotelId: 46, page: 1 });
    expect(onPick).toHaveBeenLastCalledWith({
      invItemId: 21, displayName: "Milk 1L", itemCode: "MILK-1", stockUom: "packet", qty: null, trackExpiry: true,
    });

    fireEvent.change(screen.getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await screen.findByRole("button", { name: "Add Basmati rice" }));
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ invItemId: 9, trackExpiry: false }));
  });

  test("from hotel stock, the qty on hand and trackExpiry come along", async () => {
    getStock.mockResolvedValue({
      hotelId: 46,
      rows: [{ invItemId: 21, displayName: "Milk 1L", itemCode: "MILK-1", stockUom: "packet", qty: 14, trackExpiry: true }],
      total: 1,
    });
    const onPick = jest.fn();
    render(<ItemPicker source="stock" hotelId={46} onPick={onPick} exclude={new Set()} />);
    fireEvent.change(screen.getByLabelText("Find an item"), { target: { value: "milk" } });
    fireEvent.click(await screen.findByRole("button", { name: "Add Milk 1L" }));
    await waitFor(() => expect(getStock).toHaveBeenCalledWith({ hotelId: 46, search: "milk", page: 1 }));
    expect(onPick).toHaveBeenCalledWith({
      invItemId: 21, displayName: "Milk 1L", itemCode: "MILK-1", stockUom: "packet", qty: 14, trackExpiry: true,
    });
  });

  test("a search at a hotel that answers 404 (C3) says the hotel isn't available", async () => {
    const gone = new Error("nf");
    gone.isAxiosError = true;
    gone.response = { status: 404, data: { status: 2, code: "NOT_FOUND", message: "Hotel not found", details: {} } };
    getStock.mockRejectedValue(gone);
    render(<ItemPicker source="stock" hotelId={46} onPick={jest.fn()} exclude={new Set()} />);
    fireEvent.change(screen.getByLabelText("Find an item"), { target: { value: "milk" } });
    expect(await screen.findByText("This hotel isn't available to you, or no longer exists.")).toBeInTheDocument();
  });

  test("an item already picked is shown but can't be added twice", async () => {
    listItems.mockResolvedValue({ rows: [{ id: 9, displayName: "Basmati rice", stockUom: "bag" }], total: 1 });
    render(<ItemPicker source="items" onPick={jest.fn()} exclude={new Set([9])} />);
    fireEvent.change(screen.getByLabelText("Find an item"), { target: { value: "rice" } });
    const button = await screen.findByRole("button", { name: "Add Basmati rice" });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Added");
  });
});
