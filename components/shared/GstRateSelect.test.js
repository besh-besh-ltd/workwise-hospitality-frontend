// GstRateSelect — REQ-2026-0098: vendors pick GST from 5 / 12 / 18 / 28 / 40 %.
// A value saved before the dropdown (2%, 0%, a ₹ tax) is still shown, as an
// extra option, until the vendor picks a listed rate and saves.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import GstRateSelect, { GST_RATES, isListedGstRate } from "./GstRateSelect";

const optionTexts = () => screen.getAllByRole("option").map((o) => o.textContent);
const box = () => screen.getByRole("combobox", { name: "GST rate" });

test("the list is 5, 12, 18, 28 and 40 %", () => {
  expect(GST_RATES).toEqual([5, 12, 18, 28, 40]);
  expect(isListedGstRate("18.00")).toBe(true);
  expect(isListedGstRate(2)).toBe(false);
  expect(isListedGstRate("")).toBe(false);
});

test("a blank box shows Select and only the listed rates; Select can't be picked", () => {
  render(<GstRateSelect value="" onChange={jest.fn()} />);
  expect(box()).toHaveDisplayValue("Select");
  expect(optionTexts()).toEqual(["Select", "5%", "12%", "18%", "28%", "40%"]);
  expect(screen.getByRole("option", { name: "Select" })).toBeDisabled();
});

test("picking a rate hands back its value as a string", () => {
  const onChange = jest.fn();
  render(<GstRateSelect value="" onChange={onChange} />);
  fireEvent.change(box(), { target: { value: "12" } });
  expect(onChange).toHaveBeenCalledWith("12");
});

test("a saved listed rate is selected as is, with no extra option", () => {
  render(<GstRateSelect value="18.00" onChange={jest.fn()} />);
  expect(box()).toHaveDisplayValue("18%");
  expect(optionTexts()).toEqual(["Select", "5%", "12%", "18%", "28%", "40%"]);
});

test("a saved rate outside the list (2%) is added, in order, and selected", () => {
  render(<GstRateSelect value={2} onChange={jest.fn()} />);
  expect(box()).toHaveDisplayValue("2%");
  expect(optionTexts()).toEqual(["Select", "2%", "5%", "12%", "18%", "28%", "40%"]);
});

test("decimals and 0 are shown too (7.5%, 0%)", () => {
  const { unmount } = render(<GstRateSelect value="7.50" onChange={jest.fn()} />);
  expect(box()).toHaveDisplayValue("7.5%");
  expect(optionTexts()).toEqual(["Select", "5%", "7.5%", "12%", "18%", "28%", "40%"]);
  unmount();
  render(<GstRateSelect value={0} onChange={jest.fn()} />);
  expect(box()).toHaveDisplayValue("0%");
  expect(optionTexts()[1]).toBe("0%");
});

test("after changing 2% to 5%, 2% stays offered until the box is opened again after a save", () => {
  const { rerender, unmount } = render(<GstRateSelect value="2" onChange={jest.fn()} />);
  rerender(<GstRateSelect value="5" onChange={jest.fn()} />);
  expect(box()).toHaveDisplayValue("5%");
  expect(optionTexts()).toContain("2%");
  unmount();

  // Saved as 5% → the next load starts from 5%: the extra option is gone.
  render(<GstRateSelect value="5" onChange={jest.fn()} />);
  expect(optionTexts()).toEqual(["Select", "5%", "12%", "18%", "28%", "40%"]);
});

test("a ₹ tax saved earlier shows as ₹N (saved) and picking it again does nothing", () => {
  const onChange = jest.fn();
  const { rerender } = render(<GstRateSelect value={900} rupees onChange={onChange} />);
  expect(box()).toHaveDisplayValue("₹900 (saved)");
  expect(optionTexts()).toEqual(["Select", "5%", "12%", "18%", "28%", "40%", "₹900 (saved)"]);
  fireEvent.change(box(), { target: { value: "inr:900" } });
  expect(onChange).not.toHaveBeenCalled();

  // Once the field is a percentage, the ₹ figure is never offered as a rate.
  rerender(<GstRateSelect value="18" rupees={false} onChange={onChange} />);
  expect(optionTexts()).toEqual(["Select", "5%", "12%", "18%", "28%", "40%"]);
});

test("a charge's blank option can be named and picked (Inherit / Base rate / No tax)", () => {
  const onChange = jest.fn();
  render(<GstRateSelect value="18" blankSelectable blankLabel="Inherit" onChange={onChange} />);
  expect(screen.getByRole("option", { name: "Inherit" })).not.toBeDisabled();
  fireEvent.change(box(), { target: { value: "" } });
  expect(onChange).toHaveBeenCalledWith("");
});

test("disabled and blur are passed through", () => {
  const onBlur = jest.fn();
  render(<GstRateSelect value="5" onChange={jest.fn()} onBlur={onBlur} disabled />);
  expect(box()).toBeDisabled();
  fireEvent.blur(box());
  expect(onBlur).toHaveBeenCalled();
});
