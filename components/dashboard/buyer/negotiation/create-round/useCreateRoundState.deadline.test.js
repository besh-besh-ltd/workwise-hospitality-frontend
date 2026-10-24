// useCreateRoundState.deadline.test.js — step 3 refuses a deadline under 2 h.
//
// The create endpoints refuse a round whose deadline is less than 2 hours out:
// a round's deadline is fixed at creation but vendors only see it once every
// approver has signed off. Production ARC-2026-27-0006 opened eight rounds with
// deadlines 4–64 minutes out; seven lapsed before approval. The wizard (RFQ and
// ARC both run on this hook) now says so on the review step, before the POST.

import { renderHook, act } from "@testing-library/react";
import useCreateRoundState from "./useCreateRoundState";

const pad = (n) => String(n).padStart(2, "0");
const localIn = (ms) => {
  const d = new Date(Date.now() + ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const HOUR = 3600 * 1000;

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date(2026, 9, 24, 10, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

const withEndDate = (value) => {
  const { result } = renderHook(() => useCreateRoundState({ products: [] }));
  act(() => {
    result.current.setMode("rfq");
    result.current.updateFormData({ end_date: value });
  });
  return result;
};

it("refuses a deadline an hour out, and blocks submit", () => {
  const result = withEndDate(localIn(HOUR));
  expect(result.current.step3Errors).toContain("Pick a deadline at least 2 hours from now.");
  expect(result.current.canSubmit).toBe(false);
});

it("accepts a deadline three hours out", () => {
  const result = withEndDate(localIn(3 * HOUR));
  expect(result.current.step3Errors).not.toContain("Pick a deadline at least 2 hours from now.");
});

it("still asks for a deadline when there is none", () => {
  const result = withEndDate("");
  expect(result.current.step3Errors).toEqual(["Set an end date for the round."]);
});
