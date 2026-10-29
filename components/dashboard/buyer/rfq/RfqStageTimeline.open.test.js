// The `open` stage state: a stage the user may open (it holds work, e.g. draft
// POs on a partially awarded RFQ) without being the stage the RFQ is "at".
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RfqStageTimeline from "./RfqStageTimeline";

const stages = (po = {}) => [
  { key: "overview", label: "Overview", state: "complete", reason: "x", summary: null, action: null },
  { key: "negotiation-award", label: "Negotiation & Award", state: "active", reason: "in_progress", summary: null, action: null },
  { key: "purchase-order", label: "Purchase Order", state: "open", reason: "partial_award", draft_count: 2, summary: null, action: null, ...po },
];

describe("RfqStageTimeline — open state", () => {
  test("an open stage is clickable, not locked", () => {
    const onSelect = jest.fn();
    render(<RfqStageTimeline stages={stages()} selectedKey="negotiation-award" onSelect={onSelect} />);
    const tab = screen.getByRole("tab", { name: /purchase order/i });
    expect(tab).toHaveAttribute("aria-disabled", "false");
    expect(tab).not.toHaveClass("is-locked");
    fireEvent.click(tab);
    expect(onSelect).toHaveBeenCalledWith("purchase-order");
  });

  test("it shows a '{n} draft' badge, singular and plural", () => {
    const { rerender } = render(<RfqStageTimeline stages={stages()} selectedKey="x" onSelect={() => {}} />);
    expect(screen.getByText("2 drafts")).toBeInTheDocument();
    rerender(<RfqStageTimeline stages={stages({ draft_count: 1 })} selectedKey="x" onSelect={() => {}} />);
    expect(screen.getByText("1 draft")).toBeInTheDocument();
  });

  test("an open stage never becomes the current stage", () => {
    const { container } = render(<RfqStageTimeline stages={stages()} selectedKey="negotiation-award" onSelect={() => {}} />);
    expect(screen.getByRole("tab", { name: /purchase order/i })).not.toHaveClass("is-here");
    expect(screen.getByText(/Stage 2 of 3/)).toBeInTheDocument();
    expect(container.querySelectorAll(".is-here")).toHaveLength(1);
  });

  test("with no draft_count it still reads sensibly", () => {
    render(<RfqStageTimeline stages={stages({ draft_count: undefined })} selectedKey="x" onSelect={() => {}} />);
    expect(screen.queryByText(/NaN|undefined/)).not.toBeInTheDocument();
  });

  test("a locked stage is still not clickable", () => {
    const onSelect = jest.fn();
    render(<RfqStageTimeline stages={stages({ state: "locked", reason: "not_started" })} selectedKey="x" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("tab", { name: /purchase order/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
