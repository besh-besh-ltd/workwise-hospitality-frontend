// RateContractGuestGate (mounted by the dashboard layout around every page) and its
// notice (Task 26). Once a rate-contract request was refused to an emailed-link guest
// session (403 GUEST_SESSION), a rate-contract page is replaced by a notice saying why,
// with a Sign in button: it ends the guest session and opens the sign-in modal with the
// vendor's email prefilled (the pendingSignIn hand-off).

let mockPathname = "/dashboard/vendor/rate-contracts/[contractId]";
const mockReplace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: mockPathname, asPath: mockPathname, query: {}, push: jest.fn(), replace: mockReplace }),
}));
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => mockDispatch }));
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: jest.fn(() => Promise.resolve()) } }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("@/utils/pendingSignIn", () => ({ __esModule: true, setPendingSignIn: jest.fn() }));
const mockHardNavigate = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardNavigate: (...a) => mockHardNavigate(...a), hardReload: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { setPendingSignIn } from "@/utils/pendingSignIn";
import { clearUserProfile } from "@/redux/slice";
import { noteArcGuestRefusal, clearArcGuestRefusal, isArcGuestRefused } from "@/utils/arcGuestRefusal";
import RateContractGuestGate, { GUEST_NOTICE_TEXT } from "./RateContractGuestGate";

const GUEST = { response: { status: 403, data: { status: 0, reason: "GUEST_SESSION" } } };
const page = <div data-testid="page">Contract not found</div>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/dashboard/vendor/rate-contracts/[contractId]";
  clearArcGuestRefusal();
  window.localStorage.clear();
});

test("the copy is the agreed sentence", () => {
  expect(GUEST_NOTICE_TEXT).toBe(
    "Rate contracts need a full sign-in. You opened Workwise from an RFQ email link, which only covers that RFQ. Sign in with your email and password to continue."
  );
});

test("after a guest refusal, a rate-contract page shows the notice and a Sign in button instead of itself", () => {
  render(<RateContractGuestGate>{page}</RateContractGuestGate>);
  expect(screen.getByTestId("page")).toBeInTheDocument();

  act(() => {
    noteArcGuestRefusal(GUEST);
  });
  expect(screen.queryByTestId("page")).toBeNull();
  expect(screen.queryByText("Contract not found")).toBeNull();
  const notice = screen.getByRole("region", { name: "Sign in to open rate contracts" });
  expect(notice).toHaveTextContent(GUEST_NOTICE_TEXT);
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("without a refusal, or outside rate contracts, the page renders as usual", () => {
  render(<RateContractGuestGate>{page}</RateContractGuestGate>);
  expect(screen.getByTestId("page")).toBeInTheDocument();
});

test("a refusal noted on another page does not hide a non-rate-contract page", () => {
  mockPathname = "/dashboard/vendor/network/assigned";
  noteArcGuestRefusal(GUEST);
  render(<RateContractGuestGate>{page}</RateContractGuestGate>);
  expect(screen.getByTestId("page")).toBeInTheDocument();
});

test("Sign in ends the guest session and opens the sign-in modal prefilled with the vendor's email", async () => {
  for (const [k, v] of Object.entries({
    token: "guest.jwt.token",
    "current-user-type": "vendor",
    "current-user-name": "Alpha West",
    "current-user-email": "alpha.west@example.com",
    "guest-session": "true",
  })) {
    window.localStorage.setItem(k, v);
  }
  noteArcGuestRefusal(GUEST);
  render(<RateContractGuestGate>{page}</RateContractGuestGate>);
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

  // A full page load (fix round 1), never a client-side replace that re-renders the page.
  await waitFor(() => expect(mockHardNavigate).toHaveBeenCalledWith("/?login=true"));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(setPendingSignIn).toHaveBeenCalledWith({
    email: "alpha.west@example.com",
    message: "Sign in with your email and password to open your rate contracts.",
  });
  expect(mockDispatch).toHaveBeenCalledWith(clearUserProfile());
  for (const k of ["token", "current-user-type", "current-user-name", "current-user-email", "guest-session"]) {
    expect(window.localStorage.getItem(k)).toBeNull();
  }
  // The refusal stays noted until the page is left, so the notice stays up meanwhile.
  expect(isArcGuestRefused()).toBe(true);
  expect(screen.getByRole("region", { name: "Sign in to open rate contracts" })).toBeInTheDocument();
});

test("moving to another page clears the refusal (the next request decides again)", () => {
  noteArcGuestRefusal(GUEST);
  const { rerender } = render(<RateContractGuestGate>{page}</RateContractGuestGate>);
  expect(screen.queryByTestId("page")).toBeNull();
  mockPathname = "/dashboard/vendor/rate-contracts/active";
  rerender(<RateContractGuestGate>{page}</RateContractGuestGate>);
  expect(isArcGuestRefused()).toBe(false);
  expect(screen.getByTestId("page")).toBeInTheDocument();
});
