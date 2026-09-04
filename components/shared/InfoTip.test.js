import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import InfoTip from "./InfoTip";

/**
 * These lock in the reasons InfoTip exists rather than its internals: a term
 * an admin does not understand has to be explainable without a mouse.
 */
describe("<InfoTip>", () => {
  it("renders nothing when there is no text to explain", () => {
    const { container } = render(<InfoTip text="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains the term on hover", () => {
    render(<InfoTip text="Coverage is the share of permissions selected." />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Coverage is the share of permissions selected."
    );

    fireEvent.mouseLeave(screen.getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("explains the term on keyboard focus, not only on hover", () => {
    render(<InfoTip text="Explained." />);
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("closes on Escape so it cannot trap a keyboard user", () => {
    render(<InfoTip text="Explained." />);
    const trigger = screen.getByRole("button");
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("toggles on tap, for touch screens that have no hover", () => {
    render(<InfoTip text="Explained." />);
    const trigger = screen.getByRole("button");

    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("points a screen reader at the explanation only while it is showing", () => {
    render(<InfoTip text="Explained." label="What coverage means" />);
    const trigger = screen.getByRole("button", { name: "What coverage means" });
    expect(trigger).not.toHaveAttribute("aria-describedby");

    fireEvent.focus(trigger);
    expect(trigger).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").getAttribute("id")
    );
  });

  it("is a real button, so it is reachable by Tab", () => {
    render(<InfoTip text="Explained." />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("type", "button");
    expect(trigger).not.toHaveAttribute("tabindex", "-1");
  });
});
