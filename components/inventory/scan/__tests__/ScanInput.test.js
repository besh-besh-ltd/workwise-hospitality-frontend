// The camera itself (getUserMedia, the zxing wasm) is not available in jsdom:
// next/dynamic is replaced by a stand-in camera whose buttons "see" codes.
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () =>
    function MockCamera({ onDetected, paused }) {
      return (
        <div data-testid="camera" data-paused={String(Boolean(paused))}>
          <button type="button" onClick={() => onDetected("CAM-1")}>see CAM-1</button>
          <button type="button" onClick={() => onDetected("CAM-2")}>see CAM-2</button>
        </div>
      );
    },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  resolveScan: jest.fn(),
}));
jest.mock("../scanFeedback", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    unlock: jest.fn(),
    installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false),
    setMuted: jest.fn(),
  },
}));

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { resolveScan } from "@/services/inventory";
import scanFeedback from "../scanFeedback";
import ScanInput from "../ScanInput";

const item = (over = {}) => ({
  kind: "item",
  code: "ABC-1",
  gs1: null,
  item: { invItemId: 5, displayName: "Basmati rice", stockUom: "kg", packFactor: 1, poLineId: null },
  ...over,
});
const unknown = (code, gs1 = null) => ({ kind: "unknown", code, gs1, item: null });

const field = () => screen.getByLabelText("Scan or type a code");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ScanInput", () => {
  it("ScanInput: manual entry resolves; unknown code calls onUnknown; duplicate camera read within 1.5s ignored", async () => {
    const onResolved = jest.fn();
    const onUnknown = jest.fn();
    render(<ScanInput context="hotel:46" onResolved={onResolved} onUnknown={onUnknown} placeholder="Scan an item" />);
    expect(field()).toHaveAttribute("placeholder", "Scan an item");

    // 1. Typed by hand, then Enter.
    resolveScan.mockResolvedValueOnce(item());
    fireEvent.change(field(), { target: { value: "ABC-1" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
    expect(resolveScan).toHaveBeenCalledWith("ABC-1", "hotel:46");
    expect(onResolved).toHaveBeenCalledWith(item(), expect.objectContaining({ source: "manual" }));
    expect(field()).toHaveValue("");
    expect(scanFeedback.success).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Basmati rice");

    // 2. Unknown code: onUnknown gets the code to link, not onResolved.
    resolveScan.mockResolvedValueOnce(unknown("ZZZ-9"));
    fireEvent.change(field(), { target: { value: "ZZZ-9" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    await waitFor(() => expect(onUnknown).toHaveBeenCalledTimes(1));
    expect(onUnknown).toHaveBeenCalledWith("ZZZ-9", unknown("ZZZ-9"), expect.objectContaining({ source: "manual" }));
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(scanFeedback.error).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("ZZZ-9");

    // An unknown GS1 code hands over its GTIN, the code worth linking.
    const gs1 = { gtin: "09501101530003", batch: "L1", expiry: null, serial: null };
    resolveScan.mockResolvedValueOnce(unknown("]C1010950110153000310L1", gs1));
    fireEvent.change(field(), { target: { value: "]C1010950110153000310L1" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(onUnknown).toHaveBeenCalledTimes(2));
    expect(onUnknown.mock.calls[1][0]).toBe("09501101530003");

    // 3. The camera: the same code seen again within 1.5 s is the same scan.
    jest.useFakeTimers({ now: 5_000_000 });
    try {
      resolveScan.mockResolvedValue(item({ code: "CAM-1" }));
      fireEvent.click(screen.getByRole("button", { name: "Scan with camera" }));
      expect(screen.getByTestId("camera")).toBeInTheDocument();
      expect(scanFeedback.unlock).toHaveBeenCalled();

      fireEvent.click(screen.getByText("see CAM-1"));
      act(() => {
        jest.advanceTimersByTime(600);
      });
      fireEvent.click(screen.getByText("see CAM-1")); // still in frame: ignored
      act(() => {
        jest.advanceTimersByTime(600);
      });
      fireEvent.click(screen.getByText("see CAM-1")); // 600 ms after the last sighting: ignored
      act(() => {
        jest.advanceTimersByTime(400);
      });
      // 1.6 s after the first read but 0.4 s after the last: a code held in
      // front of the lens is one scan, not one every 1.5 s.
      fireEvent.click(screen.getByText("see CAM-1"));
      fireEvent.click(screen.getByText("see CAM-2")); // a different code counts
      act(() => {
        jest.advanceTimersByTime(1600);
      });
      fireEvent.click(screen.getByText("see CAM-1")); // out of frame for 1.6 s: counts again
      fireEvent.click(screen.getByText("see CAM-2")); // and CAM-2 was seen 1.6 s ago too
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(resolveScan).toHaveBeenCalledTimes(3 + 4));
    expect(resolveScan.mock.calls.slice(3).map((c) => c[0])).toEqual(["CAM-1", "CAM-2", "CAM-1", "CAM-2"]);
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1 + 4));
    expect(onResolved.mock.calls[4][1]).toEqual(expect.objectContaining({ source: "camera" }));

    fireEvent.click(screen.getByRole("button", { name: "Stop camera" }));
    expect(screen.queryByTestId("camera")).not.toBeInTheDocument();
  });

  it("a keyboard-mode scanner always counts, even for a repeated code", async () => {
    jest.useFakeTimers({ now: 9_000_000 });
    const onResolved = jest.fn();
    resolveScan.mockResolvedValue(item({ code: "8901234567897" }));
    try {
      render(<ScanInput context="po:12" onResolved={onResolved} onUnknown={jest.fn()} />);
      for (let n = 0; n < 2; n += 1) {
        for (const key of "8901234567897") {
          fireEvent.keyDown(field(), { key });
          act(() => {
            jest.advanceTimersByTime(5);
          });
        }
        // The scanner's keystrokes also land in the focused box.
        fireEvent.change(field(), { target: { value: "8901234567897" } });
        fireEvent.keyDown(field(), { key: "Enter" });
        // Taken as one wedge scan, not also submitted as typed text.
        expect(field()).toHaveValue("");
      }
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(2));
    expect(resolveScan.mock.calls).toEqual([["8901234567897", "po:12"], ["8901234567897", "po:12"]]);
    expect(onResolved.mock.calls[0][1]).toEqual(expect.objectContaining({ source: "wedge" }));
  });

  it("a scan ended by Tab is taken once and cleared from the box; a typed Tab just moves on", async () => {
    jest.useFakeTimers({ now: 12_000_000 });
    const onResolved = jest.fn();
    resolveScan.mockResolvedValue(item({ code: "RICE-0001" }));
    let tabbed;
    try {
      render(<ScanInput context="hotel:46" onResolved={onResolved} onUnknown={jest.fn()} />);
      for (const key of "RICE-0001") {
        fireEvent.keyDown(field(), { key });
        act(() => {
          jest.advanceTimersByTime(5);
        });
      }
      fireEvent.change(field(), { target: { value: "RICE-0001" } });
      tabbed = fireEvent.keyDown(field(), { key: "Tab" });
      expect(tabbed).toBe(false); // the wedge kept focus in the box
      expect(field()).toHaveValue("");

      // Typed by hand, then Tab: the person is moving to the next field.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      for (const key of "abc") {
        fireEvent.keyDown(field(), { key });
        act(() => {
          jest.advanceTimersByTime(150);
        });
      }
      fireEvent.change(field(), { target: { value: "abc" } });
      expect(fireEvent.keyDown(field(), { key: "Tab" })).toBe(true);
      expect(field()).toHaveValue("abc");
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
    expect(resolveScan.mock.calls).toEqual([["RICE-0001", "hotel:46"]]);
  });

  it("disabled keeps the camera running (no new permission prompt) but drops its reads", async () => {
    resolveScan.mockResolvedValue(item({ code: "CAM-1" }));
    const props = { context: "hotel:46", onResolved: jest.fn(), onUnknown: jest.fn() };
    const { rerender } = render(<ScanInput {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Scan with camera" }));
    expect(screen.getByTestId("camera")).toHaveAttribute("data-paused", "false");

    rerender(<ScanInput {...props} disabled />);
    expect(screen.getByTestId("camera")).toHaveAttribute("data-paused", "true");
    fireEvent.click(screen.getByText("see CAM-1"));
    // Still possible to switch the camera off while disabled.
    expect(screen.getByRole("button", { name: "Stop camera" })).toBeEnabled();

    rerender(<ScanInput {...props} />);
    expect(screen.getByTestId("camera")).toHaveAttribute("data-paused", "false");
    fireEvent.click(screen.getByText("see CAM-1"));
    await waitFor(() => expect(props.onResolved).toHaveBeenCalledTimes(1));
    expect(resolveScan).toHaveBeenCalledTimes(1);
  });

  it("a 404 lookup says the hotel or PO isn't available and plays the error tone", async () => {
    const onResolved = jest.fn();
    const onUnknown = jest.fn();
    resolveScan.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { status: 2, message: "Hotel not found" } },
    });
    render(<ScanInput context="hotel:999" onResolved={onResolved} onUnknown={onUnknown} />);
    fireEvent.change(field(), { target: { value: "X-1" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(
      await screen.findByText("This hotel or PO isn't available to you, or no longer exists.")
    ).toBeInTheDocument();
    expect(scanFeedback.error).toHaveBeenCalledTimes(1);
    expect(onResolved).not.toHaveBeenCalled();
    expect(onUnknown).not.toHaveBeenCalled();
  });

  it("any other failed lookup shows the server's message", async () => {
    resolveScan.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { status: 0, message: "That code is too long" } },
    });
    render(<ScanInput context="hotel:46" onResolved={jest.fn()} onUnknown={jest.fn()} />);
    fireEvent.change(field(), { target: { value: "X-1" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(await screen.findByText("That code is too long")).toBeInTheDocument();
  });

  it("mute is a toggle the user controls; disabled stops every source", () => {
    const { rerender } = render(<ScanInput context="hotel:46" onResolved={jest.fn()} onUnknown={jest.fn()} />);
    // A toggle button: one name, the pressed state says which way it is set.
    const mute = screen.getByRole("button", { name: "Mute scan sounds" });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mute);
    expect(scanFeedback.setMuted).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Mute scan sounds" })).toHaveAttribute("aria-pressed", "true");

    rerender(<ScanInput context="hotel:46" onResolved={jest.fn()} onUnknown={jest.fn()} disabled />);
    expect(field()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Scan with camera" })).toBeDisabled();
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(resolveScan).not.toHaveBeenCalled();
  });
});
