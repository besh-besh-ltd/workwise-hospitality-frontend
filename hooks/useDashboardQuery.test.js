import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import useDashboardQuery, {
  toApiParams,
  backoffDelay,
  DashboardActivityContext,
} from "./useDashboardQuery";

// A controllable fetcher: every call returns a deferred the test resolves.
const makeFetcher = () => {
  const calls = [];
  const fn = jest.fn((params, opts) => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    calls.push({ params, signal: opts?.signal, resolve, reject });
    return promise;
  });
  fn.calls = calls;
  return fn;
};

const Probe = ({ fetcher, filters, options }) => {
  const q = useDashboardQuery(fetcher, filters, options);
  return (
    <div>
      <span data-testid="state">
        {q.loading ? "loading" : q.error && !q.stale ? "error" : "ready"}
      </span>
      <span data-testid="data">{q.data ? JSON.stringify(q.data) : "none"}</span>
      <span data-testid="stale">{q.stale ? "stale" : "fresh"}</span>
      <span data-testid="refreshing">{q.refreshing ? "yes" : "no"}</span>
      <button onClick={q.refetch}>retry</button>
    </div>
  );
};

const flush = () => act(async () => {});

const setHidden = (hidden) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("toApiParams", () => {
  it("drops page-only keys and empty values", () => {
    expect(
      toApiParams({
        hotel_ids: "",
        start_date: "2026-04-01",
        end_date: "2026-09-28",
        duration_type: "fy",
        _refresh: 3,
        dimension: null,
      })
    ).toEqual({ start_date: "2026-04-01", end_date: "2026-09-28" });
  });
});

describe("backoffDelay", () => {
  it("doubles from 5s and caps at 5 minutes", () => {
    expect(backoffDelay(1)).toBe(5000);
    expect(backoffDelay(2)).toBe(10000);
    expect(backoffDelay(3)).toBe(20000);
    expect(backoffDelay(20)).toBe(300000);
  });
});

describe("useDashboardQuery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setHidden(false);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends only API params plus a signal, and unwraps the envelope", async () => {
    const fetcher = makeFetcher();
    render(<Probe fetcher={fetcher} filters={{ start_date: "2026-04-01", _refresh: 0, duration_type: "fy" }} />);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.calls[0].params).toEqual({ start_date: "2026-04-01" });
    expect(fetcher.calls[0].signal).toBeDefined();
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: { n: 1 } }));
    expect(screen.getByTestId("data")).toHaveTextContent('{"n":1}');
  });

  it("discards a stale response that resolves after a newer one", async () => {
    const fetcher = makeFetcher();
    const { rerender } = render(<Probe fetcher={fetcher} filters={{ hotel_ids: "1" }} />);
    rerender(<Probe fetcher={fetcher} filters={{ hotel_ids: "2" }} />);
    expect(fetcher).toHaveBeenCalledTimes(2);
    // First request was aborted when the second started.
    expect(fetcher.calls[0].signal.aborted).toBe(true);
    await act(async () => fetcher.calls[1].resolve({ status: 1, data: { hotel: 2 } }));
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: { hotel: 1 } }));
    expect(screen.getByTestId("data")).toHaveTextContent('{"hotel":2}');
  });

  it("keeps the last good data on a failed refresh and marks it stale", async () => {
    const fetcher = makeFetcher();
    const { rerender } = render(<Probe fetcher={fetcher} filters={{ _refresh: 0 }} />);
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: { n: 1 } }));
    rerender(<Probe fetcher={fetcher} filters={{ _refresh: 1 }} />);
    expect(screen.getByTestId("refreshing")).toHaveTextContent("yes");
    expect(screen.getByTestId("state")).toHaveTextContent("ready");
    await act(async () => fetcher.calls[1].reject({ message: "boom" }));
    expect(screen.getByTestId("data")).toHaveTextContent('{"n":1}');
    expect(screen.getByTestId("stale")).toHaveTextContent("stale");
  });

  it("drops data from different params when the new params fail", async () => {
    const fetcher = makeFetcher();
    const { rerender } = render(<Probe fetcher={fetcher} filters={{ hotel_ids: "1" }} />);
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: { n: 1 } }));
    rerender(<Probe fetcher={fetcher} filters={{ hotel_ids: "2" }} />);
    await act(async () => fetcher.calls[1].reject({ message: "boom" }));
    expect(screen.getByTestId("data")).toHaveTextContent("none");
    expect(screen.getByTestId("state")).toHaveTextContent("error");
  });

  it("ignores cancellation errors", async () => {
    const fetcher = makeFetcher();
    render(<Probe fetcher={fetcher} filters={{}} />);
    await act(async () => fetcher.calls[0].reject({ message: "canceled", canceled: true }));
    // No error surfaces and no retry is scheduled for a cancelled request.
    expect(screen.getByTestId("state")).not.toHaveTextContent("error");
    await act(async () => jest.advanceTimersByTime(60000));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("analytics widgets never poll", async () => {
    const fetcher = makeFetcher();
    render(<Probe fetcher={fetcher} filters={{}} />);
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: {} }));
    await act(async () => jest.advanceTimersByTime(10 * 60 * 1000));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("queue widgets poll while visible and pause while hidden", async () => {
    const fetcher = makeFetcher();
    render(<Probe fetcher={fetcher} filters={{}} options={{ poll: true, pollMs: 1000 }} />);
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: {} }));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => fetcher.calls[1].resolve({ status: 1, data: {} }));

    act(() => setHidden(true));
    await act(async () => jest.advanceTimersByTime(5000));
    expect(fetcher).toHaveBeenCalledTimes(2);

    act(() => setHidden(false));
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("backs off after errors and gives analytics up after 3 retries", async () => {
    const fetcher = makeFetcher();
    render(<Probe fetcher={fetcher} filters={{}} />);
    await act(async () => fetcher.calls[0].reject({ message: "x" }));
    await act(async () => jest.advanceTimersByTime(4999));
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(1));
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => fetcher.calls[1].reject({ message: "x" }));
    await act(async () => jest.advanceTimersByTime(10000));
    expect(fetcher).toHaveBeenCalledTimes(3);
    await act(async () => fetcher.calls[2].reject({ message: "x" }));
    await act(async () => jest.advanceTimersByTime(20000));
    expect(fetcher).toHaveBeenCalledTimes(4);
    await act(async () => fetcher.calls[3].reject({ message: "x" }));
    await act(async () => jest.advanceTimersByTime(10 * 60 * 1000));
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("reports in-flight requests to the page activity tracker", async () => {
    const fetcher = makeFetcher();
    const begin = jest.fn();
    const end = jest.fn();
    render(
      <DashboardActivityContext.Provider value={{ begin, end }}>
        <Probe fetcher={fetcher} filters={{}} />
      </DashboardActivityContext.Provider>
    );
    expect(begin).toHaveBeenCalledTimes(1);
    expect(end).not.toHaveBeenCalled();
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: {} }));
    expect(end).toHaveBeenCalledTimes(1);
  });

  it("a scheduled poll never fires once the query is disabled", async () => {
    const fetcher = makeFetcher();
    const { rerender } = render(
      <Probe fetcher={fetcher} filters={{}} options={{ poll: true, pollMs: 1000 }} />
    );
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: {} }));
    rerender(
      <Probe fetcher={fetcher} filters={{}} options={{ poll: true, pollMs: 1000, enabled: false }} />
    );
    await act(async () => jest.advanceTimersByTime(10 * 1000));
    act(() => setHidden(true));
    act(() => setHidden(false));
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("a pending backoff retry never fires once the query is disabled", async () => {
    const fetcher = makeFetcher();
    const { rerender } = render(<Probe fetcher={fetcher} filters={{}} />);
    await act(async () => fetcher.calls[0].reject({ message: "x" }));
    rerender(<Probe fetcher={fetcher} filters={{}} options={{ enabled: false }} />);
    await act(async () => jest.advanceTimersByTime(60 * 1000));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("disabling aborts the in-flight request and ignores its late response", async () => {
    const fetcher = makeFetcher();
    const { rerender } = render(<Probe fetcher={fetcher} filters={{}} />);
    rerender(<Probe fetcher={fetcher} filters={{}} options={{ enabled: false }} />);
    expect(fetcher.calls[0].signal.aborted).toBe(true);
    await act(async () => fetcher.calls[0].resolve({ status: 1, data: { late: true } }));
    expect(screen.getByTestId("data")).toHaveTextContent("none");
  });

  it("aborts the in-flight request on unmount", () => {
    const fetcher = makeFetcher();
    const { unmount } = render(<Probe fetcher={fetcher} filters={{}} />);
    unmount();
    expect(fetcher.calls[0].signal.aborted).toBe(true);
  });
});
