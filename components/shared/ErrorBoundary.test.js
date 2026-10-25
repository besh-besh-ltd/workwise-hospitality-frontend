// The error boundary logs the page URL with a crash. On the site-rep receive
// link that URL can still hold the link's credential (#t= or ?t=): it must be
// redacted before it leaves the browser.

jest.mock("@/lib/otel", () => ({
  __esModule: true,
  sendLog: jest.fn(),
  SeverityNumber: { ERROR: 17 },
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { sendLog } from "@/lib/otel";
import ErrorBoundary from "./ErrorBoundary";

const Boom = () => {
  throw new Error("render failed");
};

test("a render crash is logged with the URL's token stripped", () => {
  window.history.replaceState({}, "", "/receive/token?t=s3cret&po=52#t=s3cret");
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary fallback={<p>Something went wrong</p>}>
      <Boom />
    </ErrorBoundary>
  );
  spy.mockRestore();
  window.history.replaceState({}, "", "/");
  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  expect(sendLog).toHaveBeenCalledTimes(1);
  const { attributes } = sendLog.mock.calls[0][0];
  expect(attributes["browser.url"]).toBe("http://localhost/receive/token?po=52");
  expect(JSON.stringify(sendLog.mock.calls)).not.toContain("s3cret");
});
