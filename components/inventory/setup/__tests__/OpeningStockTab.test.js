// Opening stock import: upload → preview (no side effects) → post.

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  Object.assign(toast, { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), dismiss: jest.fn() });
  return { __esModule: true, toast };
});
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  previewOpeningStock: jest.fn(),
  postOpeningStock: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { previewOpeningStock, postOpeningStock } from "@/services/inventory";
import OpeningStockTab from "../OpeningStockTab";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const okRow = (over = {}) => ({
  rowNo: 2, invItemId: 9, willCreate: false, productVariantId: null, stockUom: null, displayName: "Basmati rice",
  qty: 24, uom: "bag", factor: 1, stockQty: 24, unitCost: 1800, binLabel: "A-01", error: null, ...over,
});
const createRow = okRow({
  rowNo: 3, invItemId: null, willCreate: true, productVariantId: 502, stockUom: "kg", displayName: "Paneer 1kg",
  qty: 10, uom: "kg", stockQty: 10, unitCost: 320, binLabel: null,
});
const badRow = okRow({
  rowNo: 4, invItemId: null, displayName: "Saffron", qty: 1, uom: "g", stockQty: null, unitCost: null, binLabel: null,
  error: "No matching item",
});

const upload = () => {
  const file = new File(["xlsx"], "opening.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  fireEvent.change(screen.getByLabelText("Opening stock file"), { target: { files: [file] } });
  return file;
};

const apiError = (status, code, details, message = "Refused") => {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { status: 0, message, code, details } };
  return err;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OpeningStockTab", () => {
  test("opening stock preview shows row errors and disables post", async () => {
    previewOpeningStock.mockResolvedValue({ rows: [okRow(), badRow], okCount: 1, errorCount: 1 });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    expect(screen.getByText(/cost is per stock unit/i)).toBeInTheDocument();
    const file = upload();
    await waitFor(() => expect(previewOpeningStock).toHaveBeenCalledWith(46, file));

    const table = await screen.findByRole("table", { name: "Opening stock preview" });
    const bad = within(table).getByText("Saffron").closest("tr");
    expect(within(bad).getByText("No matching item")).toBeInTheDocument();
    expect(screen.getByText(/1 row has a problem/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Post opening stock/ })).toBeDisabled();
    expect(postOpeningStock).not.toHaveBeenCalled();
  });

  test("a clean preview posts every row, creating new items from their variant", async () => {
    previewOpeningStock.mockResolvedValue({ rows: [okRow(), createRow], okCount: 2, errorCount: 0 });
    postOpeningStock.mockResolvedValue({ adjustmentId: 41, adjustmentNumber: "ADJ/46/2026-27/00001" });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    const table = await screen.findByRole("table", { name: "Opening stock preview" });
    expect(within(within(table).getByText("Paneer 1kg").closest("tr")).getByText("New item")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Post opening stock/ }));
    await waitFor(() => expect(postOpeningStock).toHaveBeenCalledTimes(1));
    const [hotelId, body] = postOpeningStock.mock.calls[0];
    expect(hotelId).toBe(46);
    expect(body.clientEventId).toMatch(UUID);
    expect(body.rows).toEqual([
      { invItemId: 9, stockQty: 24, unitCost: 1800, binLabel: "A-01" },
      { invItemId: null, productVariantId: 502, stockUom: "kg", stockQty: 10, unitCost: 320, binLabel: null },
    ]);
    expect(await screen.findByText("ADJ/46/2026-27/00001")).toBeInTheDocument();
  });

  test("row errors from the post are put back on their rows", async () => {
    previewOpeningStock.mockResolvedValue({ rows: [okRow(), createRow], okCount: 2, errorCount: 0 });
    postOpeningStock.mockRejectedValue(
      apiError(400, "VALIDATION", { rows: [{ index: 1, invItemId: null, error: "Already has an item: preview again" }] })
    );
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    fireEvent.click(screen.getByRole("button", { name: /Post opening stock/ }));
    const table = screen.getByRole("table", { name: "Opening stock preview" });
    const paneer = within(table).getByText("Paneer 1kg").closest("tr");
    expect(await within(paneer).findByText("Already has an item: preview again")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Post opening stock/ })).toBeDisabled();
  });

  test("without inventory.admin the import is not offered", () => {
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin={false} />);
    expect(screen.queryByLabelText("Opening stock file")).toBeNull();
    expect(screen.getByText(/inventory admin/i)).toBeInTheDocument();
  });
});
