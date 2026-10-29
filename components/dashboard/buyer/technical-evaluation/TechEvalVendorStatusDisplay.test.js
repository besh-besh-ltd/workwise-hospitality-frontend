// Incident RFQ #536894: the round results card said "Failed Vendors:
// VEN-507983 (100%) VEN-508033 (100%)" although the real scores were 80% and
// 72%. The component painted 100 whenever the (never-passed) threshold prop
// was falsy.
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TechEvalVendorStatusDisplay from "./TechEvalVendorStatusDisplay";
import TechEvalPassedVendors from "./TechEvalPassedVendors";

describe("TechEvalVendorStatusDisplay", () => {
  it("shows each failed vendor's real score, not 100%", () => {
    render(
      <TechEvalVendorStatusDisplay
        vendors={[
          { vendor_id: 1, rfq_product_vendor_id: 507983, is_passed: false, calculated_score: 80 },
          { vendor_id: 2, rfq_product_vendor_id: 508033, is_passed: false, calculated_score: 72 },
        ]}
      />
    );
    expect(screen.getByText("(80%)")).toBeInTheDocument();
    expect(screen.getByText("(72%)")).toBeInTheDocument();
    expect(screen.queryByText("(100%)")).not.toBeInTheDocument();
  });

  it("shows a passed vendor's real score", () => {
    render(
      <TechEvalVendorStatusDisplay
        vendors={[{ vendor_id: 3, is_passed: true, calculated_score: 91 }]}
      />
    );
    expect(screen.getByText("(91%)")).toBeInTheDocument();
  });
});

describe("TechEvalPassedVendors", () => {
  it("shows the real score when the threshold is 0", () => {
    render(
      <TechEvalPassedVendors
        minimumPassingScore={0}
        vendors={[{ vendor_id: 4, vendor_name: "Acme", calculated_score: 64, evaluation_round: 1 }]}
      />
    );
    expect(screen.getByText("64%")).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });
});
