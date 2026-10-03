// Vendor dashboard refresh. Was: every 30 s, never paused, and restarted (with
// an extra fetch) whenever the userProfile object was re-dispatched. Now:
// 2 min, paused while hidden, keyed on the user id rather than the object.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/vendorDashboard", () => ({
  getVendorOpportunities: jest.fn(),
  getVendorPerformance: jest.fn(),
  getVendorInsights: jest.fn(),
  getVendorStatusBanner: jest.fn(() => new Promise(() => {})),
}));
jest.mock("react-chartjs-2", () => ({ Line: () => null, Bar: () => null }));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }) => <a href={href}>{children}</a>,
}));
jest.mock("@/components/shared/InfoTip", () => ({ __esModule: true, default: () => null }));

let mockProfile = { id: 908, name: "Asha Vendor" };
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (sel) => sel({ userProfile: mockProfile }),
}));

import React from "react";
import { render, act } from "@testing-library/react";
import { getVendorOpportunities, getVendorPerformance, getVendorInsights } from "@/services/vendorDashboard";
import Vendor from "./index";

let hidden = false;
Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
const setHidden = (value) => {
  hidden = value;
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
};
const flush = () => act(async () => {});
const advance = (ms) => act(async () => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  jest.useFakeTimers();
  hidden = false;
  mockProfile = { id: 908, name: "Asha Vendor" };
  [getVendorOpportunities, getVendorPerformance, getVendorInsights].forEach((fn) =>
    fn.mockReset().mockResolvedValue({ data: null })
  );
});
afterEach(() => jest.useRealTimers());

test("fetches on mount, then every 2 min, not 30 s", async () => {
  render(<Vendor />);
  await flush();
  expect(getVendorOpportunities).toHaveBeenCalledTimes(1);
  expect(getVendorPerformance).toHaveBeenCalledTimes(1);
  expect(getVendorInsights).toHaveBeenCalledTimes(1);

  await advance(100 * 1000);
  expect(getVendorOpportunities).toHaveBeenCalledTimes(1);
  await advance(40 * 1000);
  expect(getVendorOpportunities).toHaveBeenCalledTimes(2);
});

test("a re-dispatched profile object for the same user does not restart or refetch", async () => {
  const { rerender } = render(<Vendor />);
  await flush();
  for (let i = 0; i < 5; i += 1) {
    mockProfile = { id: 908, name: "Asha Vendor", has_valid_hospitality_subscription: i };
    rerender(<Vendor />);
    await flush();
  }
  expect(getVendorOpportunities).toHaveBeenCalledTimes(1);
});

test("no calls while hidden; one round on tab return", async () => {
  render(<Vendor />);
  await flush();
  setHidden(true);
  await advance(60 * 60 * 1000);
  expect(getVendorOpportunities).toHaveBeenCalledTimes(1);
  setHidden(false);
  await flush();
  expect(getVendorOpportunities).toHaveBeenCalledTimes(2);
});

test("waits for the profile before fetching", async () => {
  mockProfile = null;
  const { rerender } = render(<Vendor />);
  await flush();
  expect(getVendorOpportunities).not.toHaveBeenCalled();
  mockProfile = { id: 908, name: "Asha Vendor" };
  rerender(<Vendor />);
  await flush();
  expect(getVendorOpportunities).toHaveBeenCalledTimes(1);
});
