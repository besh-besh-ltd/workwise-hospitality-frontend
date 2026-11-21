// PO edit — a line's Tax (GST) is picked from the GST list, as a %.
//
// It used to be a free number box with a %/₹ switch, so a buyer could type any
// rate (13, 7, 180 …). A PO saved before the list keeps reading as saved: an odd
// rate (13%) or a flat ₹ tax ("₹150 (saved)") is shown until a listed rate is
// picked, and picking one stores it as a % — the same rule as the vendor quote.

jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { previewTotals } from "@/services/pricing";
import PurchaseOrderEditView from "./PurchaseOrderEditView";

const po = (charges) => ({
  id: 77,
  po_number: "PO-77",
  status: "pending",
  terms_and_conditions: "Net 30",
  hsn_codes: [],
  product_details: [
    {
      id: 1,
      rfq_item_id: 11,
      product_id: 501,
      name: "Pillow cover",
      quantity: 10,
      unit: "Nos",
      unit_price: 100,
      total_price: 1000,
      charges_meta: charges,
    },
  ],
});

const renderEdit = (charges) => {
  const handleUpdatePO = jest.fn().mockResolvedValue({});
  render(
    <PurchaseOrderEditView
      data={po(charges)}
      onCancel={jest.fn()}
      onSaved={jest.fn()}
      handleBack={jest.fn()}
      handleUpdatePO={handleUpdatePO}
    />
  );
  return handleUpdatePO;
};

const taxBox = () => screen.getByLabelText("Tax (GST)");
const shown = (sel) => sel.options[sel.selectedIndex].text;
const optionTexts = (sel) => [...sel.options].map((o) => o.text);

const save = async (handleUpdatePO) => {
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(handleUpdatePO).toHaveBeenCalledTimes(1));
  return handleUpdatePO.mock.calls[0][0];
};

beforeEach(() => {
  previewTotals.mockResolvedValue({ data: { lines: [{ total: 1000 }] } });
});
afterEach(() => jest.clearAllMocks());

test("a line saved at 18% shows 18% and only the listed rates", () => {
  renderEdit({ tax: 18, tax_mode: "percentage" });
  const sel = taxBox();
  expect(sel.tagName).toBe("SELECT");
  expect(shown(sel)).toBe("18%");
  expect(optionTexts(sel)).toEqual(["Select", "5%", "12%", "18%", "28%", "40%"]);
});

test("the %/₹ switch is gone from Tax (GST); Freight and Packing keep theirs", () => {
  renderEdit({ tax: 18, tax_mode: "percentage" });
  const modeSwitches = screen
    .getAllByRole("combobox")
    .filter((s) => optionTexts(s).join("|") === "%|₹");
  expect(modeSwitches).toHaveLength(2);
});

test("a line saved at 13% keeps showing 13%; picking 12% saves 12 as a %", async () => {
  const handleUpdatePO = renderEdit({ tax: 13, tax_mode: "percentage" });
  const sel = taxBox();
  expect(shown(sel)).toBe("13%");
  expect(optionTexts(sel)).toEqual(["Select", "5%", "12%", "13%", "18%", "28%", "40%"]);

  fireEvent.change(sel, { target: { value: "12" } });
  expect(shown(taxBox())).toBe("12%");

  const payload = await save(handleUpdatePO);
  expect(payload.updated_po.product_details[0].charges_meta).toMatchObject({ tax: "12", tax_mode: "percentage" });
  expect(payload.changes).toEqual([
    expect.objectContaining({ path: "product[11].charges_meta.tax", oldValue: 13, newValue: "12" }),
  ]);
});

test("a line saved with a flat ₹150 tax shows ₹150 (saved); picking 18% moves it to a %", async () => {
  const handleUpdatePO = renderEdit({ tax: 150, tax_mode: "absolute" });
  const sel = taxBox();
  expect(shown(sel)).toBe("₹150 (saved)");

  fireEvent.change(sel, { target: { value: "18" } });

  const payload = await save(handleUpdatePO);
  expect(payload.updated_po.product_details[0].charges_meta).toMatchObject({ tax: "18", tax_mode: "percentage" });
  expect(payload.changes.map((c) => [c.path, c.oldValue, c.newValue])).toEqual([
    ["product[11].charges_meta.tax", 150, "18"],
    ["product[11].charges_meta.tax_mode", "absolute", "percentage"],
  ]);
});

test("re-picking the saved ₹ figure changes nothing", async () => {
  const handleUpdatePO = renderEdit({ tax: 150, tax_mode: "absolute" });
  fireEvent.change(taxBox(), { target: { value: "inr:150" } });
  const payload = await save(handleUpdatePO);
  expect(payload.changes).toEqual([]);
  expect(payload.updated_po.product_details[0].charges_meta).toMatchObject({ tax: 150, tax_mode: "absolute" });
});

test("a line saved at 0% shows 0%", () => {
  renderEdit({ tax: 0, tax_mode: "percentage" });
  expect(shown(taxBox())).toBe("0%");
});

test("a line with no tax saved shows Select, which can't be picked", () => {
  renderEdit({});
  const sel = taxBox();
  expect(shown(sel)).toBe("Select");
  expect(sel.options[0].disabled).toBe(true);
});
