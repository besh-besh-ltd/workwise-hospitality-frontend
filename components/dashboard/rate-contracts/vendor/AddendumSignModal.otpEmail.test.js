// AddendumSignModal — the signing code is emailed (REQ-2026-0092).
//
// The backend used to create the code and send it nowhere in production. It now
// emails it and answers with where it went (`sent_to`, masked) and when Resend
// unlocks (`resend_after_seconds`); a second request inside that minute is 429.

const mockRequest = jest.fn();
const mockVerify = jest.fn();
jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorRequestAddendumOtp: (...a) => mockRequest(...a),
  vendorVerifyAddendumOtp: (...a) => mockVerify(...a),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddendumSignModal from "./AddendumSignModal";

const addendum = { id: 41, addendum_number: 2, amendment_type: "term", arc_number: "ARC-2026-27-0019" };
const axiosError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

test("says where the code was emailed and holds Resend for the minute the server asks", async () => {
  jest.useFakeTimers();
  mockRequest.mockResolvedValue({ status: 1, data: { sent_to: ["pu*****@phileeinhospitality.com"], resend_after_seconds: 60 } });
  render(<AddendumSignModal addendum={addendum} onClose={jest.fn()} onDone={jest.fn()} />);

  fireEvent.click(screen.getByText("Send OTP to sign"));
  expect(await screen.findByText("We emailed the code to pu*****@phileeinhospitality.com")).toBeInTheDocument();
  const resend = screen.getByRole("button", { name: /Resend in 60s/ });
  expect(resend).toBeDisabled();

  // The countdown re-arms one timer a second, so step the clock a second at a time.
  const tick = (seconds) => { for (let i = 0; i < seconds; i++) act(() => { jest.advanceTimersByTime(1000); }); };
  tick(3);
  expect(screen.getByRole("button", { name: /Resend in 57s/ })).toBeDisabled();
  tick(57);
  expect(screen.getByRole("button", { name: "Resend" })).toBeEnabled();
});

test("a 429 keeps the code box open (the earlier code still works) and shows the wait", async () => {
  mockRequest.mockRejectedValue(axiosError(429, {
    status: 0,
    message: "A code was sent less than a minute ago. You can ask for a new one in 42 seconds.",
    data: { retry_after_seconds: 42 },
  }));
  render(<AddendumSignModal addendum={addendum} onClose={jest.fn()} onDone={jest.fn()} />);

  fireEvent.click(screen.getByText("Send OTP to sign"));
  expect(await screen.findByText(/ask for a new one in 42 seconds/)).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Enter 6-digit OTP")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Resend in 42s/ })).toBeDisabled();
});

test("a failed send shows the server's reason and stays on Send", async () => {
  mockRequest.mockRejectedValue(axiosError(502, { status: 3, message: "We couldn't email the signing code. Please try again." }));
  render(<AddendumSignModal addendum={addendum} onClose={jest.fn()} onDone={jest.fn()} />);

  fireEvent.click(screen.getByText("Send OTP to sign"));
  expect(await screen.findByText("We couldn't email the signing code. Please try again.")).toBeInTheDocument();
  expect(screen.getByText("Send OTP to sign")).toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Enter 6-digit OTP")).not.toBeInTheDocument();
});

test("the emailed code still signs", async () => {
  mockRequest.mockResolvedValue({ status: 1, data: { sent_to: ["al***@vendor.test"], resend_after_seconds: 60 } });
  mockVerify.mockResolvedValue({ status: 1 });
  const onDone = jest.fn();
  render(<AddendumSignModal addendum={addendum} onClose={jest.fn()} onDone={onDone} />);

  fireEvent.click(screen.getByText("Send OTP to sign"));
  fireEvent.change(await screen.findByPlaceholderText("Enter 6-digit OTP"), { target: { value: "482913" } });
  fireEvent.click(screen.getByText("Verify & sign"));
  await waitFor(() => expect(onDone).toHaveBeenCalled());
  expect(mockVerify).toHaveBeenCalledWith(41, "482913");
});
