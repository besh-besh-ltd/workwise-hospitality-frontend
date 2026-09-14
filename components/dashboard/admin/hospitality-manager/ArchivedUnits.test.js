// Archived business units — the way back.
//
// Reported by the testers: "after archive a business unit, how and where to
// view that business unit?" The answer was nowhere. Archiving set is_deleted
// = 1, every list query hard-coded is_deleted = 0, no endpoint took a flag to
// include them, and the frontend's restoreHotel service had zero call sites.
// The confirmation copy promised archiving "hides it everywhere without
// touching any of them", which was true, and omitted that it was a one-way
// door.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ArchivedUnits from "./ArchivedUnits";

const UNITS = [
  { id: 10101, name: "The Orchid Pune", city: "Pune", is_deleted: 1 },
  { id: 10102, name: "Seasonal Annexe", city: "Goa", is_deleted: 1 },
];

describe("the archived units section", () => {
  it("renders nothing at all when there is nothing archived", () => {
    const { container } = render(<ArchivedUnits units={[]} onRestore={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names every archived unit", () => {
    render(<ArchivedUnits units={UNITS} onRestore={() => {}} />);
    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.getByText("Seasonal Annexe")).toBeInTheDocument();
  });

  it("says how many, so the section is worth opening", () => {
    render(<ArchivedUnits units={UNITS} onRestore={() => {}} />);
    expect(screen.getByText(/2 archived business units/i)).toBeInTheDocument();
  });

  it("offers a restore for each one", () => {
    const onRestore = jest.fn();
    render(<ArchivedUnits units={UNITS} onRestore={onRestore} />);

    const buttons = screen.getAllByRole("button", { name: /restore/i });
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);
    expect(onRestore).toHaveBeenCalledWith(UNITS[0]);
  });

  it("shows the one being restored as busy, and does not let it be clicked twice", () => {
    const onRestore = jest.fn();
    render(<ArchivedUnits units={UNITS} onRestore={onRestore} restoringId={10101} />);

    const busy = screen.getByRole("button", { name: /restoring/i });
    expect(busy).toBeDisabled();

    fireEvent.click(busy);
    expect(onRestore).not.toHaveBeenCalled();

    // The other one is still usable.
    expect(screen.getByRole("button", { name: /^restore$/i })).toBeEnabled();
  });

  it("explains what archived means rather than leaving it to be guessed", () => {
    render(<ArchivedUnits units={UNITS} onRestore={() => {}} />);
    expect(screen.getByText(/hidden from every list/i)).toBeInTheDocument();
  });
});
