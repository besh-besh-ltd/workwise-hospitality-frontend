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
  getHotelSettings: jest.fn(),
  previewOpeningStock: jest.fn(),
  postOpeningStock: jest.fn(),
}));
jest.mock("@/utils/xlsx", () => ({ __esModule: true, loadXlsx: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getHotelSettings, previewOpeningStock, postOpeningStock } from "@/services/inventory";
import { loadXlsx } from "@/utils/xlsx";
import OpeningStockTab, { TEMPLATE_HEADERS } from "../OpeningStockTab";

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

const STARTED = "2026-10-24T19:00:00.000Z"; // 25 Oct 2026, 00:30 IST
const ACTIVITY = "Has stock activity since stock started on 25 Oct 2026: use a count or an adjustment";

// Preview, then confirm that rows SET on-hand, then post.
const postWithConfirm = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Post opening stock/ }));
  const confirm = await screen.findByRole("alertdialog", { name: "Confirm opening stock" });
  fireEvent.click(within(confirm).getByRole("button", { name: "Set on-hand and post" }));
  return confirm;
};

beforeEach(() => {
  jest.clearAllMocks();
  getHotelSettings.mockResolvedValue({ hotelId: 46, stockStartedAt: null });
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
    const confirm = await screen.findByRole("alertdialog", { name: "Confirm opening stock" });
    expect(confirm).toHaveTextContent(/sets the on-hand of each of the 2 items at Orchid Mumbai to its sheet qty/);
    expect(postOpeningStock).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: "Set on-hand and post" }));
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
    await postWithConfirm();
    const table = screen.getByRole("table", { name: "Opening stock preview" });
    const paneer = within(table).getByText("Paneer 1kg").closest("tr");
    expect(await within(paneer).findByText("Already has an item: preview again")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Post opening stock/ })).toBeDisabled();
  });

  test("the template has the columns the server reads, Item Code and Variant SKU apart", async () => {
    const book = {};
    const fake = {
      utils: {
        aoa_to_sheet: jest.fn((rows) => ({ rows })),
        book_new: jest.fn(() => book),
        book_append_sheet: jest.fn(),
      },
      writeFile: jest.fn(),
    };
    loadXlsx.mockResolvedValue(fake);
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /Template/ }));
    await waitFor(() => expect(fake.writeFile).toHaveBeenCalledWith(book, "opening-stock-template.xlsx"));
    const rows = fake.utils.aoa_to_sheet.mock.calls[0][0];
    expect(rows[0]).toEqual(["Item Code", "Variant SKU", "Item Name", "Qty", "Unit", "Unit Cost", "Bin"]);
    expect(TEMPLATE_HEADERS).toEqual(rows[0]);
    expect(rows.slice(1).every((row) => row.length === 7)).toBe(true);
    expect(screen.getByText(/Item Code, Variant SKU, Item Name, Qty, Unit, Unit Cost, Bin/)).toBeInTheDocument();
  });

  test("the file picker takes .xlsx only", () => {
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    const accept = screen.getByLabelText("Opening stock file").getAttribute("accept").split(",");
    expect(accept).toEqual([".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  });

  test("once stock has started, the banner says re-import sets on-hand and active items are refused", async () => {
    getHotelSettings.mockResolvedValue({ hotelId: 46, stockStartedAt: STARTED });
    previewOpeningStock.mockResolvedValue({
      rows: [okRow(), okRow({ rowNo: 3, invItemId: 11, displayName: "Dish soap", uom: "piece", error: ACTIVITY })],
      okCount: 1, errorCount: 1, stockStartedAt: STARTED, countFreeze: false,
    });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    const banner = await screen.findByRole("status", { name: "Stock already started" });
    expect(banner).toHaveTextContent(
      "Stock started on 25 Oct 2026. Items with stock activity since then can't be imported; use a count or an adjustment. Other rows set on-hand to the sheet quantity."
    );
    upload();
    const table = await screen.findByRole("table", { name: "Opening stock preview" });
    const soap = within(table).getByText("Dish soap").closest("tr");
    expect(within(soap).getByText(ACTIVITY)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Post opening stock/ })).toBeDisabled();
    expect(screen.getByText(/Remove the rows with stock activity from the sheet/)).toBeInTheDocument();
  });

  test("the started banner also comes from the preview", async () => {
    getHotelSettings.mockRejectedValue(new Error("offline"));
    previewOpeningStock.mockResolvedValue({ rows: [okRow()], okCount: 1, errorCount: 0, stockStartedAt: STARTED, countFreeze: false });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    expect(screen.getByRole("status", { name: "Stock already started" })).toHaveTextContent(/Stock started on 25 Oct 2026\./);
  });

  test("the total is labelled as the sheet value; what posts is the difference", async () => {
    previewOpeningStock.mockResolvedValue({ rows: [okRow(), createRow], okCount: 2, errorCount: 0 });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    expect(screen.getByText("Sheet value ₹46,400.00")).toBeInTheDocument();
    expect(screen.getByText(/What posts is the difference between each row and the item's current stock/)).toBeInTheDocument();
    const rice = within(screen.getByRole("table", { name: "Opening stock preview" })).getByText("Basmati rice").closest("tr");
    expect(within(rice).getByText("bag", { selector: "td[data-label='Stock qty'] span" })).toBeInTheDocument();
  });

  test("while a count is open the post is off and says why", async () => {
    previewOpeningStock.mockResolvedValue({ rows: [okRow()], okCount: 1, errorCount: 0, stockStartedAt: STARTED, countFreeze: true });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    const post = screen.getByRole("button", { name: /Post opening stock/ });
    expect(post).toBeDisabled();
    expect(post).toHaveAttribute("title", "A count is in progress");
    expect(screen.getByText(/A count is in progress at Orchid Mumbai/)).toBeInTheDocument();
  });

  test("a count opened after the preview: the post is refused and links the count", async () => {
    previewOpeningStock.mockResolvedValue({ rows: [okRow()], okCount: 1, errorCount: 0 });
    postOpeningStock.mockRejectedValue(apiError(409, "LOCKED", { countId: 7, countNumber: "CNT/46/2026-27/00002" }, "Locked"));
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    await postWithConfirm();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/CNT\/46\/2026-27\/00002.*opening stock is refused until it's submitted or cancelled/);
    expect(within(alert).getByRole("link", { name: "Open the count" })).toHaveAttribute("href", "/dashboard/buyer/inventory/counts/7");
    expect(screen.getByRole("button", { name: /Post opening stock/ })).toBeDisabled();
  });

  test("a dropped connection keeps the same key for the retry", async () => {
    const dropped = new Error("Network Error");
    dropped.isAxiosError = true;
    previewOpeningStock.mockResolvedValue({ rows: [okRow()], okCount: 1, errorCount: 0 });
    postOpeningStock
      .mockRejectedValueOnce(dropped)
      .mockResolvedValueOnce({ adjustmentId: 41, adjustmentNumber: "ADJ/46/2026-27/00001", replayed: true });
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    const confirm = await postWithConfirm();
    expect(await screen.findByText(/connection dropped before the server answered/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Set on-hand and post" }));
    await waitFor(() => expect(postOpeningStock).toHaveBeenCalledTimes(2));
    expect(postOpeningStock.mock.calls[1][1].clientEventId).toBe(postOpeningStock.mock.calls[0][1].clientEventId);
    expect(await screen.findByText("ADJ/46/2026-27/00001")).toBeInTheDocument();
  });

  test("the page is told while a post is in flight", async () => {
    let finish;
    previewOpeningStock.mockResolvedValue({ rows: [okRow()], okCount: 1, errorCount: 0 });
    postOpeningStock.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onBusyChange = jest.fn();
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin onBusyChange={onBusyChange} />);
    upload();
    await screen.findByRole("table", { name: "Opening stock preview" });
    await postWithConfirm();
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(true));
    finish({ adjustmentId: 41, adjustmentNumber: "ADJ/46/2026-27/00001" });
    await waitFor(() => expect(onBusyChange).toHaveBeenLastCalledWith(false));
  });

  test("without inventory.admin the import is not offered", () => {
    render(<OpeningStockTab hotelId={46} hotelName="Orchid Mumbai" canAdmin={false} />);
    expect(screen.queryByLabelText("Opening stock file")).toBeNull();
    expect(screen.getByText(/inventory admin/i)).toBeInTheDocument();
  });
});
