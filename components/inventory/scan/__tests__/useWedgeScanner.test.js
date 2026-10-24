import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useWedgeScanner } from "../useWedgeScanner";

// Keyboard-mode scanners "type" a whole code in a few milliseconds and end it
// with Enter or Tab; people type an order of magnitude slower.
function Harness({ onCode, ...opts }) {
  useWedgeScanner({ onCode, ...opts });
  return (
    <div>
      <input data-testid="scan" data-scan-input="true" />
      <input data-testid="qty" />
    </div>
  );
}

const type = (target, text, gapMs) => {
  for (const key of text) {
    fireEvent.keyDown(target, { key });
    act(() => {
      jest.advanceTimersByTime(gapMs);
    });
  }
};

describe("useWedgeScanner", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("wedge: fast keystrokes + Enter emit one code; slow typing does not", () => {
    const onCode = jest.fn();
    render(<Harness onCode={onCode} />);

    // Fast burst ending in Enter: one code, and the Enter is swallowed.
    type(document.body, "8901234567897", 8);
    const enter = fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onCode).toHaveBeenCalledTimes(1);
    expect(onCode).toHaveBeenCalledWith("8901234567897");
    expect(enter).toBe(false); // default prevented

    // A person typing the same thing: nothing.
    onCode.mockClear();
    type(document.body, "8901234567897", 120);
    expect(fireEvent.keyDown(document.body, { key: "Enter" })).toBe(true);
    expect(onCode).not.toHaveBeenCalled();
  });

  it("Tab also ends a code, and two scans in a row give two codes", () => {
    const onCode = jest.fn();
    const { getByTestId } = render(<Harness onCode={onCode} />);
    const scan = getByTestId("scan");

    type(scan, "RICE-1", 5);
    expect(fireEvent.keyDown(scan, { key: "Tab" })).toBe(false);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    type(scan, "RICE-1", 5);
    fireEvent.keyDown(scan, { key: "Enter" });
    expect(onCode.mock.calls).toEqual([["RICE-1"], ["RICE-1"]]);
  });

  it("ignores short bursts, stale terminators, other fields and a disabled hook", () => {
    const onCode = jest.fn();
    const { getByTestId, rerender } = render(<Harness onCode={onCode} />);

    // Below minLength.
    type(document.body, "AB", 5);
    fireEvent.keyDown(document.body, { key: "Enter" });

    // A fast burst with no terminator, then a person presses Enter much later.
    type(document.body, "ABCDEF", 5);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    fireEvent.keyDown(document.body, { key: "Enter" });

    // Typing into another input (a quantity field) is that field's business.
    const qty = getByTestId("qty");
    type(qty, "123456", 5);
    fireEvent.keyDown(qty, { key: "Enter" });

    // Modifier chords are not scanner input.
    type(document.body, "ABCDEF", 5);
    fireEvent.keyDown(document.body, { key: "Enter", ctrlKey: true });

    expect(onCode).not.toHaveBeenCalled();

    rerender(<Harness onCode={onCode} enabled={false} />);
    type(document.body, "ABCDEF", 5);
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onCode).not.toHaveBeenCalled();

    // Shift between characters (upper-case codes) does not break a burst.
    rerender(<Harness onCode={onCode} />);
    for (const key of ["Shift", "A", "Shift", "B", "1", "2"]) {
      fireEvent.keyDown(document.body, { key });
      act(() => {
        jest.advanceTimersByTime(4);
      });
    }
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onCode).toHaveBeenCalledWith("AB12");
  });
});
