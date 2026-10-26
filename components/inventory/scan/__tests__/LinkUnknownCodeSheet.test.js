jest.mock("@/services/inventory", () => ({
  __esModule: true,
  listItems: jest.fn(),
  addItemBarcode: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { listItems, addItemBarcode } from "@/services/inventory";
import { toast } from "react-toastify";
import LinkUnknownCodeSheet from "../LinkUnknownCodeSheet";

beforeEach(() => jest.clearAllMocks());

describe("LinkUnknownCodeSheet", () => {
  it("on a receive screen, links the code to one of the PO's lines with a pack factor", async () => {
    const onLinked = jest.fn();
    addItemBarcode.mockResolvedValueOnce({ id: 3, code: "8901234567897", packFactor: 24, source: "MANUFACTURER" });
    render(
      <LinkUnknownCodeSheet
        show
        code="8901234567897"
        onHide={jest.fn()}
        onLinked={onLinked}
        poLines={[
          { poLineId: 1, productName: "Basmati rice 25kg", invItemId: 5, stockUom: "kg" },
          { poLineId: 2, productName: "Unmapped line", invItemId: null, stockUom: null },
          { poLineId: 3, productName: "Toor dal", invItemId: 9, stockUom: "kg" },
        ]}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("8901234567897")).toBeInTheDocument();
    // Lines with no inventory item cannot take a barcode.
    expect(within(dialog).queryByLabelText("Unmapped line")).not.toBeInTheDocument();

    const save = within(dialog).getByRole("button", { name: "Link code" });
    expect(save).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText("Toor dal"));
    fireEvent.change(within(dialog).getByLabelText("Stock units per scan"), { target: { value: "24" } });
    fireEvent.click(save);

    await waitFor(() => expect(onLinked).toHaveBeenCalledTimes(1));
    expect(addItemBarcode).toHaveBeenCalledWith(9, { code: "8901234567897", packFactor: 24, source: "MANUFACTURER" });
    expect(onLinked).toHaveBeenCalledWith({
      invItemId: 9, displayName: "Toor dal", stockUom: "kg", packFactor: 24, code: "8901234567897", poLineId: 3,
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("elsewhere, searches the item master; a refused link shows the server's reason", async () => {
    listItems.mockResolvedValue({
      rows: [{ id: 41, displayName: "Olive oil 1L", itemCode: "OIL-1", stockUom: "bottle", barcodes: [] }],
      total: 1,
    });
    addItemBarcode.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { status: 0, message: "Code already linked to Sunflower oil" } },
    });
    const onLinked = jest.fn();
    render(<LinkUnknownCodeSheet show code="ABC" hotelId={46} onHide={jest.fn()} onLinked={onLinked} />);

    fireEvent.change(screen.getByLabelText("Find item"), { target: { value: "olive" } });
    await waitFor(() => expect(listItems).toHaveBeenCalledWith({ search: "olive", hotelId: 46 }));
    fireEvent.click(await screen.findByLabelText(/Olive oil 1L/));
    expect(screen.getByLabelText("Stock units per scan")).toHaveValue(1);

    fireEvent.click(screen.getByRole("button", { name: "Link code" }));
    expect(await screen.findByText("Code already linked to Sunflower oil")).toBeInTheDocument();
    expect(addItemBarcode).toHaveBeenCalledWith(41, { code: "ABC", packFactor: 1, source: "MANUFACTURER" });
    expect(onLinked).not.toHaveBeenCalled();
  });

  it("cannot be closed while the link is being saved", async () => {
    let finish;
    addItemBarcode.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const onHide = jest.fn();
    render(
      <LinkUnknownCodeSheet
        show
        code="X1"
        onHide={onHide}
        onLinked={jest.fn()}
        poLines={[{ poLineId: 1, productName: "Rice", invItemId: 5, stockUom: "kg" }]}
      />
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    fireEvent.click(screen.getByLabelText("Rice"));
    fireEvent.click(screen.getByRole("button", { name: "Link code" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onHide).not.toHaveBeenCalled();
    await act(async () => {
      finish({ id: 1 });
    });
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
  });

  it("a pack factor must be a positive number", () => {
    render(
      <LinkUnknownCodeSheet
        show
        code="X1"
        onHide={jest.fn()}
        onLinked={jest.fn()}
        poLines={[{ poLineId: 1, productName: "Rice", invItemId: 5, stockUom: "kg" }]}
      />
    );
    fireEvent.click(screen.getByLabelText("Rice"));
    fireEvent.change(screen.getByLabelText("Stock units per scan"), { target: { value: "0" } });
    expect(screen.getByRole("button", { name: "Link code" })).toBeDisabled();
  });
});
