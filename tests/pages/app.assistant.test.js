// _app renders the floating assistant (WizardChat) on every page except the
// site-rep receive link, which is for someone with no account.

const mockRouter = { pathname: "/", asPath: "/", events: { on: jest.fn(), off: jest.fn() } };

jest.mock("next/router", () => ({ __esModule: true, useRouter: () => mockRouter }));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => function MockAssistant() {
    return <a href="https://assist.letsworkwise.com/login">Assistant</a>;
  },
}));
jest.mock("@/lib/otel", () => ({ __esModule: true, initOtel: jest.fn(), sendLog: jest.fn(), SeverityNumber: {} }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { identify: jest.fn() }, initAnalytics: jest.fn() }));
jest.mock("@/components/layout", () => ({ __esModule: true, default: ({ children }) => <>{children}</> }));
jest.mock("@/redux/provider", () => ({ __esModule: true, Providers: ({ children }) => <>{children}</> }));
jest.mock("@react-oauth/google", () => ({ __esModule: true, GoogleOAuthProvider: ({ children }) => <>{children}</> }));
jest.mock("react-toastify", () => ({ __esModule: true, ToastContainer: () => null }));
jest.mock("@/services/Auth", () => ({ __esModule: true, getUserDetails: jest.fn(() => null) }));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../../pages/_app";

const Page = () => <p>page body</p>;

test.each([
  ["/dashboard/buyer/inventory", true],
  ["/receive/token", false],
])("on %s the assistant shows: %s", (pathname, shown) => {
  mockRouter.pathname = pathname;
  mockRouter.asPath = pathname;
  render(<App Component={Page} pageProps={{}} />);
  expect(screen.getByText("page body")).toBeInTheDocument();
  if (shown) expect(screen.getByRole("link", { name: "Assistant" })).toBeInTheDocument();
  else expect(screen.queryByRole("link", { name: "Assistant" })).toBeNull();
});
