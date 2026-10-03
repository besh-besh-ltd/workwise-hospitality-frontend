// usePolling: the shared cadence primitive. Each test pins one guarantee
// the hand-written setInterval pollers got wrong in prod: running in hidden
// tabs, double-firing on tab return, overlapping slow requests, and restarting
// whenever a callback identity changed.

import React from "react";
import { render, act } from "@testing-library/react";
import usePolling from "./usePolling";

let hidden = false;
Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
Object.defineProperty(document, "visibilityState", {
  configurable: true,
  get: () => (hidden ? "hidden" : "visible"),
});

const setHidden = (value) => {
  hidden = value;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
};

const Probe = ({ fn, opts, onApi }) => {
  const api = usePolling(fn, opts);
  if (onApi) onApi(api);
  return null;
};

// Promise-returning fn whose resolution the test controls.
const deferredFn = () => {
  const pending = [];
  const fn = jest.fn(
    () =>
      new Promise((resolve) => {
        pending.push(resolve);
      })
  );
  const resolveAll = async () => {
    await act(async () => {
      while (pending.length) pending.shift()();
    });
  };
  return { fn, resolveAll, pending };
};

const flush = () => act(async () => {});

beforeEach(() => {
  jest.useFakeTimers();
  hidden = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("cadence", () => {
  it("runs on mount, then once per interval", async () => {
    const fn = jest.fn(() => Promise.resolve());
    render(<Probe fn={fn} opts={{ interval: 60000, jitter: 0 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(59999); });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(2);
    // Promise settles between ticks, so advance one interval at a time.
    for (let i = 0; i < 3; i += 1) {
      await act(async () => { jest.advanceTimersByTime(60000); });
    }
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("skips the mount run when immediate is false", async () => {
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0, immediate: false }} />);
    await flush();
    expect(fn).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("keeps jittered delays inside +/- jitter of the interval", async () => {
    const spy = jest.spyOn(Math, "random");
    spy.mockReturnValue(0); // factor = 1 - 0.1
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 10000, jitter: 0.1 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(8999); });
    expect(fn).toHaveBeenCalledTimes(1);
    spy.mockReturnValue(0.999999); // next delay: factor ~ 1 + 0.1
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(2);

    await act(async () => { jest.advanceTimersByTime(10999); });
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(2); });
    expect(fn).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  it("does nothing while disabled, and starts when enabled", async () => {
    const fn = jest.fn();
    const { rerender } = render(<Probe fn={fn} opts={{ interval: 1000, enabled: false }} />);
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(fn).not.toHaveBeenCalled();
    rerender(<Probe fn={fn} opts={{ interval: 1000, enabled: true, jitter: 0 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("hidden tabs", () => {
  it("makes no calls while the tab is hidden", async () => {
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    setHidden(true);
    await act(async () => { jest.advanceTimersByTime(60 * 60 * 1000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("refetches exactly once on return, then resumes the interval", async () => {
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 60000, jitter: 0 }} />);
    await flush();
    setHidden(true);
    await act(async () => { jest.advanceTimersByTime(10 * 60000); });
    expect(fn).toHaveBeenCalledTimes(1);

    setHidden(false);
    expect(fn).toHaveBeenCalledTimes(2);
    // focus also fires on a tab switch; it must not cause a second call.
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(fn).toHaveBeenCalledTimes(2);

    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throttles rapid hide/show flips (minGapMs)", async () => {
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 60000, jitter: 0, minGapMs: 5000 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i += 1) {
      setHidden(true);
      setHidden(false);
    }
    expect(fn).toHaveBeenCalledTimes(1);
    // The remaining interval still fires on schedule.
    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a component mounted in a background tab fetches when first shown", async () => {
    hidden = true;
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0 }} />);
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(fn).not.toHaveBeenCalled();
    setHidden(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("keeps polling when pauseWhenHidden is false", async () => {
    const fn = jest.fn();
    render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0, pauseWhenHidden: false }} />);
    await flush();
    setHidden(true);
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

describe("in-flight protection", () => {
  it("never starts a second call while one is pending", async () => {
    const { fn, resolveAll } = deferredFn();
    render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
    // A slow server: many intervals pass, no new calls stack up.
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(fn).toHaveBeenCalledTimes(1);

    await resolveAll();
    // The next tick is scheduled from settle, one interval later.
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("queues ONE trailing run for refetches that arrive mid-flight", async () => {
    const { fn, resolveAll } = deferredFn();
    let api;
    render(<Probe fn={fn} opts={{ interval: 60000, jitter: 0 }} onApi={(a) => { api = a; }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => { api.refetch(); api.refetch(); api.refetch(); });
    expect(fn).toHaveBeenCalledTimes(1);

    await resolveAll();
    expect(fn).toHaveBeenCalledTimes(2);
    await resolveAll();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("survives a rejected promise and a thrown error", async () => {
    let n = 0;
    const fn = jest.fn(() => {
      n += 1;
      if (n === 1) return Promise.reject(new Error("boom"));
      if (n === 2) throw new Error("sync boom");
      return undefined;
    });
    render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0 }} />);
    await flush();
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("stability", () => {
  it("a new fn identity on every render does not restart the timer, and the latest fn is used", async () => {
    const calls = [];
    const { rerender } = render(
      <Probe fn={() => calls.push("a")} opts={{ interval: 1000, jitter: 0 }} />
    );
    await flush();
    expect(calls).toEqual(["a"]);
    for (let i = 0; i < 10; i += 1) {
      rerender(<Probe fn={() => calls.push("b")} opts={{ interval: 1000, jitter: 0 }} />);
    }
    await flush();
    expect(calls).toEqual(["a"]);
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(calls).toEqual(["a", "b"]);
  });

  it("an equal-by-value resetKey does not restart; a changed one runs now", async () => {
    const fn = jest.fn();
    const { rerender } = render(
      <Probe fn={fn} opts={{ interval: 60000, jitter: 0, resetKey: { hotel: [1], r: 0 } }} />
    );
    await flush();
    rerender(<Probe fn={fn} opts={{ interval: 60000, jitter: 0, resetKey: { hotel: [1], r: 0 } }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    rerender(<Probe fn={fn} opts={{ interval: 60000, jitter: 0, resetKey: { hotel: [1], r: 1 } }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("changing the interval does not refetch; the new cadence applies from the next tick", async () => {
    const fn = jest.fn();
    const { rerender } = render(<Probe fn={fn} opts={{ interval: 60000, jitter: 0 }} />);
    await flush();
    rerender(<Probe fn={fn} opts={{ interval: 120000, jitter: 0 }} />);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
    // Tick already scheduled at the old cadence...
    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(fn).toHaveBeenCalledTimes(2);
    // ...then the new one.
    await act(async () => { jest.advanceTimersByTime(119999); });
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("refetch runs now and resets the interval", async () => {
    const fn = jest.fn();
    let api;
    render(<Probe fn={fn} opts={{ interval: 10000, jitter: 0 }} onApi={(a) => { api = a; }} />);
    await flush();
    await act(async () => { jest.advanceTimersByTime(9000); });
    act(() => api.refetch());
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(9999); });
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("cleans up timers and listeners on unmount", async () => {
    const fn = jest.fn();
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0 }} />);
    await flush();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    await act(async () => { jest.advanceTimersByTime(10000); });
    setHidden(true);
    setHidden(false);
    expect(fn).toHaveBeenCalledTimes(1);
    removeSpy.mockRestore();
  });

  it("a call that settles after unmount schedules nothing", async () => {
    const { fn, resolveAll } = deferredFn();
    const { unmount } = render(<Probe fn={fn} opts={{ interval: 1000, jitter: 0 }} />);
    await flush();
    unmount();
    await resolveAll();
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
