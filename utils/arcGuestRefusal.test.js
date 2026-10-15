// A rate-contract request refused to an emailed-link guest session (BE 403
// { reason: "GUEST_SESSION" }, Task 26) is noted once, for the gate the dashboard
// layout mounts to show the sign-in notice. Both error shapes the services produce
// are read: the raw AxiosError, and services/*.js's `reject({ message: error })`.

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  isGuestSessionRefusal,
  isArcGuestRefused,
  noteArcGuestRefusal,
  clearArcGuestRefusal,
  useArcGuestRefusal,
} from "./arcGuestRefusal";

const guest = { response: { status: 403, data: { status: 0, reason: "GUEST_SESSION", message: "Sign in…" } } };

afterEach(() => clearArcGuestRefusal());

test("reads a GUEST_SESSION 403, raw or wrapped, and nothing else", () => {
  expect(isGuestSessionRefusal(guest)).toBe(true);
  expect(isGuestSessionRefusal({ message: guest })).toBe(true);
  expect(isGuestSessionRefusal({ response: { status: 403, data: { reason: "ROUTING_REQUIRED" } } })).toBe(false);
  expect(isGuestSessionRefusal({ response: { status: 401, data: { reason: "GUEST_SESSION" } } })).toBe(false);
  expect(isGuestSessionRefusal(undefined)).toBe(false);
  expect(isGuestSessionRefusal(new Error("Network Error"))).toBe(false);
});

function Probe() {
  return <span data-testid="refused">{String(useArcGuestRefusal())}</span>;
}

test("noting a guest refusal flips the hook; other errors do not; clearing resets it", () => {
  render(<Probe />);
  expect(screen.getByTestId("refused")).toHaveTextContent("false");

  act(() => {
    expect(noteArcGuestRefusal({ response: { status: 500, data: {} } })).toBe(false);
  });
  expect(screen.getByTestId("refused")).toHaveTextContent("false");

  act(() => {
    expect(noteArcGuestRefusal({ message: guest })).toBe(true);
  });
  expect(screen.getByTestId("refused")).toHaveTextContent("true");

  expect(isArcGuestRefused()).toBe(true);

  act(() => clearArcGuestRefusal());
  expect(screen.getByTestId("refused")).toHaveTextContent("false");
  expect(isArcGuestRefused()).toBe(false);
});
