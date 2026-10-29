import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import PrStatusPill from "./PrStatusPill";
import PrProgressPill from "./PrProgressPill";

test("status pill shows label and tone", () => {
  const { container } = render(<PrStatusPill status="pending_approval" />);
  expect(screen.getByText("Pending approval")).toBeInTheDocument();
  expect(container.firstChild).toHaveClass("status-pill", "warn");
});
test("progress pill uses line or header labels", () => {
  const { rerender } = render(<PrProgressPill progress="in_pool" />);
  expect(screen.getByText("In purchase queue")).toBeInTheDocument();
  rerender(<PrProgressPill progress="partly_ordered" header />);
  expect(screen.getByText("Partly ordered")).toBeInTheDocument();
});
test("renders nothing without a value", () => {
  const { container } = render(<PrStatusPill />);
  expect(container).toBeEmptyDOMElement();
});
