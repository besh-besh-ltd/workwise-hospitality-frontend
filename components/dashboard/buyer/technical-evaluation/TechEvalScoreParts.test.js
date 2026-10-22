import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PassingScoreLabel, VendorScoreValue } from "./TechEvalScoreParts";

describe("TechEvalScoreParts (used by the ClauseProductItem grid)", () => {
  it("labels the threshold as a percentage", () => {
    render(<PassingScoreLabel minimumPassingScore={100} />);
    expect(screen.getByText(/Minimum passing score:/)).toBeInTheDocument();
    expect(screen.getByText(/Minimum passing score:/).parentElement).toHaveTextContent("Minimum passing score: 100%");
  });
  it("renders a scored vendor's real score", () => {
    render(<VendorScoreValue score={80} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
});
