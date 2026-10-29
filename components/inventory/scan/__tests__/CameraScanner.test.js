// The camera half of scanning, with the browser parts stood in: jsdom has no
// getUserMedia, no media playback and no decoder. What is pinned is what a
// receiver sees and what happens to the camera (the stream must always be
// released: a leaked stream keeps the camera light on and the battery draining).
jest.mock("../loadDetector", () => ({ __esModule: true, loadDetector: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { loadDetector } from "../loadDetector";
import CameraScanner, { MAX_FAILED_FRAMES } from "../CameraScanner";

const makeStream = () => {
  const track = { stop: jest.fn(), getCapabilities: () => ({}), applyConstraints: jest.fn() };
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } };
};

let detect;
class FakeDetector {
  constructor(opts) {
    this.opts = opts;
  }
  detect(source) {
    return detect(source);
  }
}

const getUserMedia = jest.fn();
const realPlay = window.HTMLMediaElement.prototype.play;

beforeAll(() => {
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  Object.defineProperty(window.navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  Object.defineProperty(window.HTMLMediaElement.prototype, "readyState", { get: () => 4, configurable: true });
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
});

afterAll(() => {
  window.HTMLMediaElement.prototype.play = realPlay;
  delete window.HTMLMediaElement.prototype.readyState;
});

beforeEach(() => {
  jest.clearAllMocks();
  getUserMedia.mockReset();
  detect = jest.fn(() => Promise.resolve([]));
  loadDetector.mockResolvedValue({ BarcodeDetector: FakeDetector });
});

describe("CameraScanner", () => {
  it("hands every decoded code to onDetected; paused keeps the camera open but stops decoding", async () => {
    const { track, stream } = makeStream();
    getUserMedia.mockResolvedValue(stream);
    detect = jest.fn(() => Promise.resolve([{ rawValue: "8901234567897", format: "ean_13" }]));
    const onDetected = jest.fn();
    const { rerender } = render(<CameraScanner onDetected={onDetected} />);

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith("8901234567897", "ean_13"));
    expect(screen.getByText("Point the camera at a barcode or QR label.")).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));

    rerender(<CameraScanner onDetected={onDetected} paused />);
    await screen.findByText(/Scanning paused/);
    const reads = detect.mock.calls.length;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(detect.mock.calls.length).toBe(reads);
    expect(track.stop).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    rerender(<CameraScanner onDetected={onDetected} />);
    await waitFor(() => expect(detect.mock.calls.length).toBeGreaterThan(reads));
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("paused with onSeenWhilePaused: what stays in frame is reported there, never read", async () => {
    const { stream } = makeStream();
    getUserMedia.mockResolvedValue(stream);
    detect = jest.fn(() => Promise.resolve([{ rawValue: "8901234567897", format: "ean_13" }]));
    const onDetected = jest.fn();
    const onSeenWhilePaused = jest.fn();
    const { rerender } = render(<CameraScanner onDetected={onDetected} onSeenWhilePaused={onSeenWhilePaused} />);
    await waitFor(() => expect(onDetected).toHaveBeenCalled());
    expect(onSeenWhilePaused).not.toHaveBeenCalled();

    rerender(<CameraScanner onDetected={onDetected} onSeenWhilePaused={onSeenWhilePaused} paused />);
    await screen.findByText(/Scanning paused/);
    // A frame already in flight may still land; after it, nothing is read.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    const reads = onDetected.mock.calls.length;
    await waitFor(() => expect(onSeenWhilePaused).toHaveBeenCalledWith("8901234567897", "ean_13"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(onDetected.mock.calls.length).toBe(reads);
    expect(onSeenWhilePaused.mock.calls.length).toBeGreaterThan(1);
  });

  it("a refused permission says how to allow it, and can be retried", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    render(<CameraScanner onDetected={jest.fn()} />);
    expect(await screen.findByText(/Camera access is blocked/)).toBeInTheDocument();

    const { stream } = makeStream();
    getUserMedia.mockResolvedValueOnce(stream);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Point the camera at a barcode or QR label.")).toBeInTheDocument();
  });

  it("unmounting releases the camera, even while the permission prompt is still open", async () => {
    const first = makeStream();
    getUserMedia.mockResolvedValueOnce(first.stream);
    const view = render(<CameraScanner onDetected={jest.fn()} />);
    await screen.findByText("Point the camera at a barcode or QR label.");
    view.unmount();
    expect(first.track.stop).toHaveBeenCalled();

    // The user answers the prompt after the screen has gone.
    let grant;
    getUserMedia.mockReturnValueOnce(new Promise((resolve) => { grant = resolve; }));
    const late = makeStream();
    const view2 = render(<CameraScanner onDetected={jest.fn()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    view2.unmount();
    await act(async () => {
      grant(late.stream);
    });
    expect(late.track.stop).toHaveBeenCalled();
  });

  it("a decoder that will not load shows an error and releases the camera; retry loads it again", async () => {
    const { track, stream } = makeStream();
    getUserMedia.mockResolvedValue(stream);
    loadDetector.mockRejectedValueOnce(new Error("wasm fetch failed"));
    render(<CameraScanner onDetected={jest.fn()} />);

    expect(await screen.findByText(/The scanner could not load/)).toBeInTheDocument();
    expect(track.stop).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Point the camera at a barcode or QR label.")).toBeInTheDocument();
    expect(loadDetector).toHaveBeenCalledTimes(2);
  });

  it("frames that keep failing to decode end in the error state, not a silent viewfinder", async () => {
    jest.useFakeTimers();
    try {
      const { track, stream } = makeStream();
      getUserMedia.mockResolvedValue(stream);
      detect = jest.fn(() => Promise.reject(new Error("decoder crashed")));
      render(<CameraScanner onDetected={jest.fn()} />);
      expect(MAX_FAILED_FRAMES).toBe(20);
      // A frame every 150 ms from t=0: 19 failures by t=2.7 s, the 20th at 2.85 s.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(150 * 18 + 100);
      });
      expect(detect).toHaveBeenCalledTimes(19);
      expect(screen.queryByText(/stopped reading/)).not.toBeInTheDocument();
      expect(track.stop).not.toHaveBeenCalled();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(150 * 4);
      });
      expect(screen.getByText(/stopped reading/)).toBeInTheDocument();
      expect(detect).toHaveBeenCalledTimes(20);
      expect(track.stop).toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
