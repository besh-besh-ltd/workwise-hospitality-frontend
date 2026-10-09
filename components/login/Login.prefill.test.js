// Task 20 / D6: after activating a vendor-network invite, the sign-in modal opens with a
// confirmation and the sign-in email filled in (handed over through sessionStorage by
// the accept page, never through the URL). Without a hand-off it opens empty as before.

jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../services/Auth", () => ({
  __esModule: true,
  forgetPasswordService: jest.fn(),
  forgetPasswordValiationService: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "./index";
import { setPendingSignIn, takePendingSignIn } from "@/utils/pendingSignIn";

const baseProps = {
  loginSubmitHandler: jest.fn(),
  loading: false,
  setEmail: jest.fn(),
  setPassword: jest.fn(),
  setloading: jest.fn(),
  loginWithGoogle: jest.fn(),
  setEmployeeCode: jest.fn(),
  loginError: "",
};

test("prefills the identifier and shows the hand-off notice", () => {
  render(<Login {...baseProps} prefillIdentifier="ravi@daikin.example" notice="Account activated — sign in with ravi@daikin.example and your new password." />);
  expect(screen.getByRole("status")).toHaveTextContent("Account activated — sign in with ravi@daikin.example");
  expect(screen.getByPlaceholderText("name@example.com or EMP1234")).toHaveValue("ravi@daikin.example");
});

test("without a hand-off the form is empty and shows no notice", () => {
  render(<Login {...baseProps} />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByPlaceholderText("name@example.com or EMP1234")).toHaveValue("");
});

test("the pending sign-in is read once, then gone", () => {
  setPendingSignIn({ email: "a@b.example", message: "hi" });
  expect(takePendingSignIn()).toEqual({ email: "a@b.example", message: "hi" });
  expect(takePendingSignIn()).toBeNull();
});
