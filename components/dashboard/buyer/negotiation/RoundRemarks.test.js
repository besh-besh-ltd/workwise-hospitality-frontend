import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RoundRemarks from "./RoundRemarks";

describe("RoundRemarks", () => {
  it.each([[null], [undefined], [""], ["   \n  "]])("renders nothing for %p", (value) => {
    const { container } = render(<RoundRemarks remarks={value} creatorName="Asha" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the heading, creator and the text", () => {
    render(<RoundRemarks remarks="Vendor quoted high" creatorName="Asha Menon" />);
    expect(screen.getByText("Creator's remarks")).toBeInTheDocument();
    expect(screen.getByText(/— Asha Menon/)).toBeInTheDocument();
    expect(screen.getByText("Vendor quoted high")).toBeInTheDocument();
  });

  it("omits the creator when not given", () => {
    render(<RoundRemarks remarks="Hello" />);
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it("renders text with line breaks and does not interpret HTML", () => {
    const { container } = render(<RoundRemarks remarks={"line one\n<img src=x>"} />);
    expect(screen.getByText(/<img src=x>/)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/line one/).textContent).toBe("line one\n<img src=x>");
  });
});
