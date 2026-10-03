// The login/register modal is code-split out of the shared bundle and only
// mounted once it is first opened. These tests pin the user-visible contract:
// nothing is mounted for a visitor who never opens it, it opens from the
// "?auth=login" deep link and from the header's own buttons, and it stays
// mounted after closing (LoginContainer hosts the follow-up
// "logged in on another device" modal).

// A stable router object, as Next provides — Header has effects keyed on it.
const mockRouter = { pathname: "/for-vendors", query: {}, asPath: "/for-vendors", push: jest.fn(), events: { on: jest.fn(), off: jest.fn() } };
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => mockRouter }));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: null }),
  useDispatch: () => jest.fn(),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/Auth", () => ({ __esModule: true, getUserDetails: () => null }));
jest.mock("@/hooks/usePendingApprovalIndicators", () => ({
  __esModule: true,
  default: () => ({ hasPendingApproval: () => false, countFor: () => 0, hasAnyPending: false }),
}));
jest.mock("@/components/hospitality/HospitalityContextModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/AuthContainer/LoginContainer", () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="login-container" data-open={String(props.openAuthModal)} data-tab={props.activeAuthTab}>
      <button type="button" onClick={() => props.setOpenAuthModal(false)}>close auth</button>
    </div>
  ),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Header from "./index";

beforeEach(() => {
  mockRouter.query = {};
  localStorage.clear();
});

test("the auth modal is not mounted until someone opens it", async () => {
  render(<Header />);
  // Give a dynamic import every chance to resolve.
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByTestId("login-container")).not.toBeInTheDocument();
});

test("?auth=login opens it on the login tab", async () => {
  mockRouter.query = { auth: "login" };
  render(<Header />);
  const modal = await screen.findByTestId("login-container");
  expect(modal).toHaveAttribute("data-open", "true");
  expect(modal).toHaveAttribute("data-tab", "login");
});

test("a header CTA opens it, and it stays mounted (closed) afterwards", async () => {
  render(<Header />);
  fireEvent.click(screen.getAllByRole("button", { name: /book a call/i })[0]);
  const modal = await screen.findByTestId("login-container");
  expect(modal).toHaveAttribute("data-open", "true");

  fireEvent.click(screen.getByRole("button", { name: "close auth" }));
  expect(screen.getByTestId("login-container")).toHaveAttribute("data-open", "false");
});
