// Buyer dashboard refresh cadence. Was: 8 widgets each polling every 10 s,
// hidden tabs included (48 aggregate queries/min per open dashboard). Now:
// fetch on mount, filter change, manual refresh (_refresh) and tab return;
// otherwise every 5 min, and nothing while hidden.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/dashboard", () => ({
  getNegotiationSavings: jest.fn(),
  getCostIntelligence: jest.fn(),
}));
jest.mock("@/components/shared/InfoTip", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, act } from "@testing-library/react";
import { getNegotiationSavings, getCostIntelligence } from "@/services/dashboard";
import { DASHBOARD_POLL_MS } from "@/components/dashboard/shared";
import NegotiationSavings from "./dashboard-components/NegotiationSavings";
import CostIntelligence from "./dashboard-components/CostIntelligence";
import PersonaCard from "./persona-widgets/PersonaCard";

let hidden = false;
Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
const setHidden = (value) => {
  hidden = value;
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
};
const flush = () => act(async () => {});
const advance = (ms) => act(async () => { jest.advanceTimersByTime(ms); });

const base = { hotel_ids: [3], start_date: "2026-04-01", end_date: "2026-10-03", _refresh: 0 };

beforeEach(() => {
  jest.useFakeTimers();
  hidden = false;
  getNegotiationSavings.mockReset().mockResolvedValue({ data: { market_baseline: 0 } });
  getCostIntelligence.mockReset().mockResolvedValue({ data: { top_products: [] } });
});
afterEach(() => jest.useRealTimers());

test("the cadence is 5 minutes", () => {
  expect(DASHBOARD_POLL_MS).toBe(5 * 60 * 1000);
});

describe.each([
  ["NegotiationSavings", NegotiationSavings, () => getNegotiationSavings],
  ["CostIntelligence", CostIntelligence, () => getCostIntelligence],
])("%s", (_name, Widget, api) => {
  test("one fetch on mount, none for the next 4 minutes, one at ~5 min", async () => {
    render(<Widget filters={base} />);
    await flush();
    expect(api()).toHaveBeenCalledTimes(1);
    await advance(4 * 60 * 1000);
    expect(api()).toHaveBeenCalledTimes(1);
    await advance(2 * 60 * 1000);
    expect(api()).toHaveBeenCalledTimes(2);
  });

  test("nothing while hidden; one fetch on tab return", async () => {
    render(<Widget filters={base} />);
    await flush();
    setHidden(true);
    await advance(60 * 60 * 1000);
    expect(api()).toHaveBeenCalledTimes(1);
    setHidden(false);
    await flush();
    expect(api()).toHaveBeenCalledTimes(2);
  });

  test("manual refresh and filter changes still fetch immediately", async () => {
    const { rerender } = render(<Widget filters={base} />);
    await flush();
    rerender(<Widget filters={{ ...base, _refresh: 1 }} />);
    await flush();
    expect(api()).toHaveBeenCalledTimes(2);
    rerender(<Widget filters={{ ...base, _refresh: 1, hotel_ids: [3, 4] }} />);
    await flush();
    expect(api()).toHaveBeenCalledTimes(3);
    expect(api()).toHaveBeenLastCalledWith(expect.objectContaining({ hotel_ids: [3, 4] }));
  });

  test("a new filters object with the same values does not refetch", async () => {
    const { rerender } = render(<Widget filters={base} />);
    await flush();
    rerender(<Widget filters={{ ...base, hotel_ids: [3] }} />);
    await flush();
    expect(api()).toHaveBeenCalledTimes(1);
  });
});

test("PersonaCard polls at the dashboard cadence, paused while hidden", async () => {
  const fetcher = jest.fn().mockResolvedValue({ data: [1] });
  const { rerender } = render(
    <PersonaCard title="t" filters={base} fetcher={fetcher}>{() => null}</PersonaCard>
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

  rerender(
    <PersonaCard title="t" filters={{ ...base, _refresh: 9 }} fetcher={fetcher}>{() => null}</PersonaCard>
  );
  await flush();
  expect(fetcher).toHaveBeenCalledTimes(4);
});
