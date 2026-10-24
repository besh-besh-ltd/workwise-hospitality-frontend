// A vendor invoice per delivery (inventory spec §5.2, task C4). The old
// "Attach Invoice" dialog took one file and nothing else, and the server
// refused a second invoice on the same PO. An invoice now carries its number,
// date and amount, and may name the dispatch note it bills; a PO takes as many
// as it has deliveries.

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  handleRaiseInvoice: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  handleUploadFile: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { handleRaiseInvoice } from "@/services/po";
import { handleUploadFile } from "@/services/rfq";
import InvoiceModal from "../InvoiceModal";
import { vendorDeliveries } from "../__fixtures__/vendorDeliveries.fixture";

const FILE_URL = "https://bucket.s3.ap-south-1.amazonaws.com/uploads/inv-131.pdf";

const mount = (props = {}) => {
  const handlers = { onClose: jest.fn(), onDone: jest.fn() };
  render(
    <InvoiceModal
      show
      poId={626}
      poNumber="138898"
      dispatches={vendorDeliveries().dispatches}
      defaultDispatchId={72}
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, dialog: screen.getByRole("dialog", { name: "Raise invoice" }) };
};

const set = (el, value) => fireEvent.change(el, { target: { value } });

const attach = async (dialog) => {
  handleUploadFile.mockResolvedValue({ data: [{ file_path: FILE_URL }] });
  const file = new File(["%PDF"], "inv-131.pdf", { type: "application/pdf" });
  fireEvent.change(within(dialog).getByLabelText("Invoice file"), { target: { files: [file] } });
  expect(await within(dialog).findByText(/inv-131\.pdf/)).toBeInTheDocument();
};

const fill = (dialog, { number = "INV-2026-131", date = "2026-10-01", amount = "4500.5" } = {}) => {
  set(within(dialog).getByLabelText("Invoice number"), number);
  set(within(dialog).getByLabelText("Invoice date"), date);
  set(within(dialog).getByLabelText(/Invoice amount/), amount);
};

beforeEach(() => jest.clearAllMocks());

describe("InvoiceModal", () => {
  it("raises an invoice with its number, date, amount and the dispatch it bills", async () => {
    handleRaiseInvoice.mockResolvedValue({ status: 1, data: { id: 3003 } });
    const { dialog, onDone } = mount();

    // Only dispatch notes that went out can be billed; the default is the one picked.
    const delivery = within(dialog).getByLabelText("Delivery");
    expect(delivery).toHaveValue("72");
    expect(within(delivery).getAllByRole("option").map((o) => o.value)).toEqual(["", "71", "72"]);

    await attach(dialog);
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Raise invoice" }));

    await waitFor(() =>
      expect(handleRaiseInvoice).toHaveBeenCalledWith(626, FILE_URL, {
        invoiceNumber: "INV-2026-131",
        invoiceDate: "2026-10-01",
        invoiceAmount: "4500.5",
        dispatchId: 72,
      })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("checks the number, date and amount before sending", async () => {
    const { dialog } = mount();
    fireEvent.click(within(dialog).getByRole("button", { name: "Raise invoice" }));
    expect(await within(dialog).findByText("Attach the invoice file")).toBeInTheDocument();
    expect(within(dialog).getByText("Invoice number is required")).toBeInTheDocument();
    expect(within(dialog).getByText("Invoice date is required")).toBeInTheDocument();
    expect(within(dialog).getByText("Invoice amount is required")).toBeInTheDocument();

    await attach(dialog);
    fill(dialog, { amount: "12.345", date: "2999-01-01" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Raise invoice" }));
    expect(await within(dialog).findByText("More than zero, with at most 2 decimals")).toBeInTheDocument();
    expect(within(dialog).getByText("The invoice date cannot be in the future")).toBeInTheDocument();
    expect(handleRaiseInvoice).not.toHaveBeenCalled();
  });

  it("puts the server's refusal under the field it names", async () => {
    handleRaiseInvoice.mockRejectedValue({
      response: {
        status: 409,
        data: { status: 0, message: "Invoice INV-2026-131 is already on this purchase order", code: "CONFLICT", details: { field: "invoice_number" } },
      },
    });
    const { dialog, onDone } = mount({ defaultDispatchId: null });
    expect(within(dialog).getByLabelText("Delivery")).toHaveValue("");
    await attach(dialog);
    fill(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Raise invoice" }));

    const msg = await within(dialog).findByText("Invoice INV-2026-131 is already on this purchase order");
    expect(within(dialog).getByLabelText("Invoice number")).toHaveAttribute("aria-invalid", "true");
    expect(msg).toBeInTheDocument();
    expect(handleRaiseInvoice.mock.calls[0][2].dispatchId).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("says so when the file upload fails, and keeps the form", async () => {
    handleUploadFile.mockRejectedValue({ message: { isAxiosError: true, response: { data: { message: "File too large" } } } });
    const { dialog } = mount();
    const file = new File(["%PDF"], "big.pdf", { type: "application/pdf" });
    fireEvent.change(within(dialog).getByLabelText("Invoice file"), { target: { files: [file] } });
    expect(await within(dialog).findByText("File too large")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Raise invoice" })).toBeEnabled();
  });
});
