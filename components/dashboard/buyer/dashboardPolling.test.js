// Buyer dashboard refresh cadence (portal policy, hooks/usePolling.js).
// Was: 8 widgets each polling every 10 s, hidden tabs included (48 aggregate
// queries/min per open dashboard). Now: every widget fetches on mount, filter
// change and manual refresh (_refresh). Queue widgets (the action centre and
// persona queues) also poll every 5 min while visible and refetch once on tab
// return; analytics widgets never poll. Nothing runs while the tab is hidden.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/dashboard", () => ({
  getNegotiationSavings: jest.fn(),
  getActionCenterData: jest.fn(),
}));
jest.mock("@/components/shared/InfoTip", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, act } from "@testing-library/react";
import { getNegotiationSavings, getActionCenterData } from "@/services/dashboard";
import { DASHBOARD_POLL_MS } from "@/components/dashboard/shared";
import NegotiationSavings from "./dashboard-components/NegotiationSavings";
import ActionCenter from "./dashboard-components/ActionCenter";
import PersonaCard from "./persona-widgets/PersonaCard";

let hidden = false;
Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
Object.defineProperty(document, "visibilityState", {
  configurable: true,
  get: () => (hidden ? "hidden" : "visible"),
});
const setHidden = (value) => {
  hidden = value;
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
};
const flush = () => act(async () => {});
const advance = (ms) => act(async () => { jest.advanceTimersByTime(ms); });

const base = { hotel_ids: "3", start_date: "2026-04-01", end_date: "2026-10-03", _refresh: 0 };

beforeEach(() => {
  jest.useFakeTimers();
  hidden = false;
  getNegotiationSavings.mockReset().mockResolvedValue({ data: { awarded: {}, all_vendors: {} } });
  getActionCenterData.mockReset().mockResolvedValue({ data: {} });
});
afterEach(() => jest.useRealTimers());

test("the cadence is 5 minutes", () => {
  expect(DASHBOARD_POLL_MS).toBe(5 * 60 * 1000);
});

describe("queue widget (ActionCenter)", () => {
  test("one fetch on mount, none for the next 4 minutes, one at ~5 min", async () => {
    render(<ActionCenter filters={base} />);
    await flush();
    expect(getActionCenterData).toHaveBeenCalledTimes(1);
    await advance(4 * 60 * 1000);
    expect(getActionCenterData).toHaveBeenCalledTimes(1);
    await advance(2 * 60 * 1000);
    expect(getActionCenterData).toHaveBeenCalledTimes(2);
  });

  test("nothing while hidden; one fetch on tab return", async () => {
    render(<ActionCenter filters={base} />);
    await flush();
    setHidden(true);
    await advance(60 * 60 * 1000);
    expect(getActionCenterData).toHaveBeenCalledTimes(1);
    setHidden(false);
    await flush();
    expect(getActionCenterData).toHaveBeenCalledTimes(2);
  });
});

describe("analytics widget (NegotiationSavings)", () => {
  test("never polls, not even after an hour", async () => {
    render(<NegotiationSavings filters={base} />);
    await flush();
    await advance(60 * 60 * 1000);
    expect(getNegotiationSavings).toHaveBeenCalledTimes(1);
  });

  test("manual refresh and filter changes still fetch immediately", async () => {
    const { rerender } = render(<NegotiationSavings filters={base} />);
    await flush();
    rerender(<NegotiationSavings filters={{ ...base, _refresh: 1 }} />);
    await flush();
    expect(getNegotiationSavings).toHaveBeenCalledTimes(2);
    rerender(<NegotiationSavings filters={{ ...base, _refresh: 1, hotel_ids: "3,4" }} />);
    await flush();
    expect(getNegotiationSavings).toHaveBeenCalledTimes(3);
    expect(getNegotiationSavings).toHaveBeenLastCalledWith(
      expect.objectContaining({ hotel_ids: "3,4" }),
      expect.anything()
    );
  });

  test("a new filters object with the same values does not refetch", async () => {
    const { rerender } = render(<NegotiationSavings filters={base} />);
    await flush();
    rerender(<NegotiationSavings filters={{ ...base }} />);
    await flush();
    expect(getNegotiationSavings).toHaveBeenCalledTimes(1);
  });
});

test("a queue PersonaCard polls at the dashboard cadence, paused while hidden", async () => {
  const fetcher = jest.fn().mockResolvedValue({ data: [1] });
  render(
    <PersonaCard title="t" filters={base} fetcher={fetcher} poll>{() => null}</PersonaCard>
  );
  await flush();
  expect(fetcher).toHaveBeenCalledTimes(1);
  await advance(60 * 1000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await advance(5 * 60 * 1000);
  expect(fetcher).toHaveBeenCalledTimes(2);

  setHidden(true);
  await advance(60 * 60 * 1000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  setHidden(false);
  await flush();
  expect(fetcher).toHaveBeenCalledTimes(3);
});
