// VendorCommercialStage — a vendor enters tax (GST) as a percentage only.
//
// The ₹ option next to every tax field was removed: the line GST, the tax on an
// item's other charges and the tax on a document-level charge. ₹ stays where it
// means money (a charge's amount). A charge saved earlier with a ₹ tax still
// shows its ₹ (selected, not clickable) so the saved figure reads correctly;
// pressing % moves it to a percentage and clears the old rupee figure.
//
// The line GST had a second reason to go: its ₹/% mode is never stored, so a
// ₹ GST came back on reload as the same number read as a percentage.
//
// The GST boxes are dropdowns now (REQ-2026-0098), so a box is found by the
// text of its selected option: "18%", or "₹36 (saved)" for an old ₹ tax.

import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import VendorCommercialStage from "./VendorCommercialStage";

const blankLine = () => ({
  rate: "", gst_pct: "", gstMode: "%", charges: [], lead_time_days: "", moq: "",
  validity_notes: "", pricing_method: "TRADITIONAL", entered_mrp: "", mrp_discount: "",
  mrp_discount_mode: "percentage",
});

const ITEM = { id: 11, variant_name: "LOBBY MAT RED", indicative_qty: 100, uom: "pcs" };

const renderStage = ({ line = {}, chargesOpen = null, globalCharges = [], globalChargesOpen = false } = {}) => {
  const price = { [ITEM.id]: { ...blankLine(), rate: "500", gst_pct: "18", ...line } };
  const setPrice = jest.fn();
  const updateGlobalCharge = jest.fn();
  const updateLine = jest.fn();
  render(
    <VendorCommercialStage
      arc={{ is_group: false, hotel_name: "Goa Resort", hotel_code: "GR" }}
      items={[ITEM]}
      price={price}
      priceLine={(id) => price[id] || blankLine()}
      updateLine={updateLine}
      addChargeOfType={jest.fn()}
      removeCharge={jest.fn()}
      productChargesTotal={() => 0}
      lineTotal={() => 0}
      totals={{ subtotal: 0, gst: 0, charges: 0, grand: 0, globalChargesTotal: 0 }}
      globals={{ paymentTerms: [], comment: "" }}
      paymentTotal={0}
      chargesOpen={chargesOpen}
      setChargesOpen={jest.fn()}
      globalCharges={globalCharges}
      setGlobalCharges={jest.fn()}
      globalChargesOpen={globalChargesOpen}
      setGlobalChargesOpen={jest.fn()}
      addGlobalCharge={jest.fn()}
      removeGlobalCharge={jest.fn()}
      updateGlobalCharge={updateGlobalCharge}
      lineChargeTypes={[]}
      globalChargeTypes={[]}
      termStart="01 Oct 26"
      termEnd="30 Sep 27"
      submissionEnd="15 Sep 26"
      saveState="idle"
      readOnly={false}
      setPrice={setPrice}
      blankLine={blankLine}
      onFieldBlur={jest.fn()}
    />
  );
  return { price, setPrice, updateGlobalCharge, updateLine };
};

// The %/₹ segment that sits beside a given input.
const segFor = (input) => within(input.closest(".input-group"));

const charge = (over = {}) => ({ name: "Freight", amount: "200", amountMode: "₹", tax: "", taxMode: "%", note: "", ...over });

test("line GST offers % only — no ₹ button", () => {
  renderStage();
  const gst = screen.getByDisplayValue("18%");
  const seg = segFor(gst);
  expect(seg.getByRole("button", { name: "%" })).toHaveClass("is-active");
  expect(seg.queryByRole("button", { name: "₹" })).not.toBeInTheDocument();
});

test("tax on an item's other charge offers % only; the charge amount keeps ₹", () => {
  renderStage({ chargesOpen: ITEM.id, line: { charges: [charge({ tax: "5" })] } });
  const amountSeg = segFor(screen.getByDisplayValue("200"));
  expect(amountSeg.getByRole("button", { name: "₹" })).toBeInTheDocument();

  const taxSeg = segFor(screen.getByDisplayValue("5%"));
  expect(taxSeg.getByRole("button", { name: "%" })).toHaveClass("is-active");
  expect(taxSeg.queryByRole("button", { name: "₹" })).not.toBeInTheDocument();
});

test("a charge saved earlier with a ₹ tax shows ₹ (not clickable); pressing % clears the old figure", () => {
  const { price, setPrice } = renderStage({ chargesOpen: ITEM.id, line: { charges: [charge({ tax: "36", taxMode: "₹" })] } });
  const taxSeg = segFor(screen.getByDisplayValue("₹36 (saved)"));
  const rupee = taxSeg.getByRole("button", { name: "₹" });
  expect(rupee).toBeDisabled();
  expect(rupee).toHaveClass("is-active");

  fireEvent.click(taxSeg.getByRole("button", { name: "%" }));
  const next = setPrice.mock.calls[0][0](price);
  expect(next[ITEM.id].charges[0]).toMatchObject({ taxMode: "%", tax: "" });
});

test("pressing % on a charge already in % keeps its rate", () => {
  const { price, setPrice } = renderStage({ chargesOpen: ITEM.id, line: { charges: [charge({ tax: "12" })] } });
  fireEvent.click(segFor(screen.getByDisplayValue("12%")).getByRole("button", { name: "%" }));
  const next = setPrice.mock.calls[0][0](price);
  expect(next[ITEM.id].charges[0]).toMatchObject({ taxMode: "%", tax: "12" });
});

test("tax on a document-level charge offers % only; a saved ₹ tax is cleared on %", () => {
  const { updateGlobalCharge } = renderStage({
    globalChargesOpen: true,
    globalCharges: [charge({ name: "Insurance", amount: "300", tax: "9" }), charge({ name: "TCS", amount: "400", tax: "40", taxMode: "₹" })],
  });
  const fresh = segFor(screen.getByDisplayValue("9%"));
  expect(fresh.queryByRole("button", { name: "₹" })).not.toBeInTheDocument();
  expect(segFor(screen.getByDisplayValue("300")).getByRole("button", { name: "₹" })).toBeInTheDocument();

  const legacy = segFor(screen.getByDisplayValue("₹40 (saved)"));
  expect(legacy.getByRole("button", { name: "₹" })).toBeDisabled();
  fireEvent.click(legacy.getByRole("button", { name: "%" }));
  expect(updateGlobalCharge).toHaveBeenCalledWith(1, { taxMode: "%", tax: "" });
});

// REQ-2026-0098 — GST is picked from 5 / 12 / 18 / 28 / 40 %. A rate saved before the
// dropdown (e.g. 2%, or 0% on a charge) is shown as an extra option until changed.
describe("GST dropdown", () => {
  const optionsOf = (select) => within(select).getAllByRole("option").map((o) => o.textContent);

  test("line GST saved at 2% shows 2%; picking 12% updates the line as a %", () => {
    const { updateLine } = renderStage({ line: { gst_pct: "2" } });
    const box = screen.getByDisplayValue("2%");
    expect(optionsOf(box)).toEqual(["Select", "2%", "5%", "12%", "18%", "28%", "40%"]);
    fireEvent.change(box, { target: { value: "12" } });
    expect(updateLine).toHaveBeenCalledWith(ITEM.id, { gst_pct: "12", gstMode: "%" });
  });

  test("a blank line GST shows Select, which can't be picked (GST stays mandatory)", () => {
    renderStage({ line: { gst_pct: "" } });
    const box = screen.getByRole("combobox", { name: "GST" });
    expect(box).toHaveDisplayValue("Select");
    expect(within(box).getByRole("option", { name: "Select" })).toBeDisabled();
  });

  test("a charge saved at 0% (no tax) shows 0%; Inherit can be picked back", () => {
    const { price, setPrice } = renderStage({ chargesOpen: ITEM.id, line: { charges: [charge({ tax: "0" })] } });
    const box = screen.getByDisplayValue("0%");
    expect(optionsOf(box)).toEqual(["Inherit", "0%", "5%", "12%", "18%", "28%", "40%"]);
    fireEvent.change(box, { target: { value: "" } });
    const next = setPrice.mock.calls[0][0](price);
    expect(next[ITEM.id].charges[0]).toMatchObject({ tax: "", taxMode: "%" });
  });

  test("a document-level charge picks a rate (40%) as a %", () => {
    const { updateGlobalCharge } = renderStage({
      globalChargesOpen: true,
      globalCharges: [charge({ name: "Insurance", amount: "300", tax: "" })],
    });
    const box = screen.getByRole("combobox", { name: "GST on this charge" });
    expect(box).toHaveDisplayValue("Inherit");
    fireEvent.change(box, { target: { value: "40" } });
    expect(updateGlobalCharge).toHaveBeenCalledWith(0, { tax: "40", taxMode: "%" });
  });
});
