import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useWedgeScanner } from "../useWedgeScanner";
import { parseScan } from "../parseScan";

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

  // A GS1-128 carton label: GTIN, expiry, a variable-length batch that must
  // be ended by a GS (FNC1), then a serial. A keyboard can't type GS, so a
  // scanner sends it as Ctrl+] (or Alt+029 on the numeric keypad).
  const GS1_HEAD = "0109501101530003172612311" + "0BATCH7";
  const GS1_TAIL = "21SER1";
  const GS1_READ = `${GS1_HEAD}\x1d${GS1_TAIL}`;

  it("GS1: Ctrl+] inside a burst is the GS separator, so the whole read comes through", () => {
    const onCode = jest.fn();
    render(<Harness onCode={onCode} />);

    type(document.body, GS1_HEAD, 4);
    fireEvent.keyDown(document.body, { key: "Control", code: "ControlLeft", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "]", code: "BracketRight", ctrlKey: true });
    act(() => {
      jest.advanceTimersByTime(4);
    });
    type(document.body, GS1_TAIL, 4);
    expect(fireEvent.keyDown(document.body, { key: "Enter" })).toBe(false);

    expect(onCode.mock.calls).toEqual([[GS1_READ]]);
    // Every element survives (the expiry's century follows the fake 1970 clock).
    expect(parseScan(onCode.mock.calls[0][0])).toEqual({
      type: "gs1",
      code: GS1_READ,
      gs1: { gtin: "09501101530003", batch: "BATCH7", expiry: expect.stringMatching(/26-12-31$/), serial: "SER1" },
    });
  });

  it("GS1: Alt+029 on the numeric keypad inside a burst is the GS separator too", () => {
    const onCode = jest.fn();
    const { getByTestId } = render(<Harness onCode={onCode} />);
    const scan = getByTestId("scan");

    type(scan, GS1_HEAD, 4);
    fireEvent.keyDown(scan, { key: "Alt", code: "AltLeft", altKey: true });
    for (const d of ["0", "2", "9"]) {
      fireEvent.keyDown(scan, { key: d, code: `Numpad${d}`, altKey: true });
      act(() => {
        jest.advanceTimersByTime(4);
      });
    }
    fireEvent.keyUp(scan, { key: "Alt", code: "AltLeft" });
    type(scan, GS1_TAIL, 4);
    expect(fireEvent.keyDown(scan, { key: "Enter" })).toBe(false);

    expect(onCode.mock.calls).toEqual([[GS1_READ]]);
  });

  it("a shortcut chord in a burst still ends it, and a lone Ctrl+] is not a scan", () => {
    const onCode = jest.fn();
    render(<Harness onCode={onCode} />);

    // Ctrl+V (paste) is not a GS: the burst before it is dropped.
    type(document.body, "ABCDEF", 4);
    fireEvent.keyDown(document.body, { key: "v", code: "KeyV", ctrlKey: true });
    type(document.body, "12", 4);
    fireEvent.keyDown(document.body, { key: "Enter" });

    // Alt with other keypad digits is some other character: not a GS.
    type(document.body, "ABCDEF", 4);
    fireEvent.keyDown(document.body, { key: "Alt", code: "AltLeft", altKey: true });
    fireEvent.keyDown(document.body, { key: "6", code: "Numpad6", altKey: true });
    fireEvent.keyDown(document.body, { key: "5", code: "Numpad5", altKey: true });
    fireEvent.keyUp(document.body, { key: "Alt", code: "AltLeft" });
    type(document.body, "12", 4);
    fireEvent.keyDown(document.body, { key: "Enter" });

    // Ctrl+] typed by a person, then Enter much later.
    fireEvent.keyDown(document.body, { key: "]", code: "BracketRight", ctrlKey: true });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(onCode).not.toHaveBeenCalled();
  });
});
