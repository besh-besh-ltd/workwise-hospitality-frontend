// Incident RFQ #536894: the stuck screen told the buyer to "extend the
// deadline and refresh vendors" (which could not work), hid a vendor who had
// answered but not quoted, and warned nobody before submit/approve.
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  TechEvalStatusBanner,
  UnquotedResponderLabel,
  HiddenRespondersNotice,
  ProductSubmitButton,
} from "./TechEvalReopenParts";
import UnifiedSubmitForApproval from "./UnifiedSubmitForApproval";
import TechEvalVendorStatusDisplay from "./TechEvalVendorStatusDisplay";

describe("TechEvalStatusBanner", () => {
  it("stuck: explains the real way out and links Extend deadline to the restricted edit page", () => {
    render(<TechEvalStatusBanner isStuck extendHref="/dashboard/buyer/rfq-management-edit?id=536894" />);
    expect(screen.getByText("No vendor passed technical evaluation")).toBeInTheDocument();
    expect(screen.getByText(/Extend the bid deadline to let more vendors quote/)).toBeInTheDocument();
    expect(screen.getByText(/Or close this RFQ\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Extend deadline" })).toHaveAttribute(
      "href",
      "/dashboard/buyer/rfq-management-edit?id=536894"
    );
    expect(screen.queryByText(/refresh vendors/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 of/)).not.toBeInTheDocument();
  });

  it("reopened with the window open: shows the new deadline", () => {
    render(<TechEvalStatusBanner reopened bidWindowOpen bidEndDate="2026-10-30T18:00" isStuck={false} />);
    expect(screen.getByText("Technical evaluation reopened")).toBeInTheDocument();
    expect(screen.getByText("Bidding is open until 2026-10-30 18:00. Vendors who quote can be evaluated after bidding closes.")).toBeInTheDocument();
  });

  it("reopened with the window open but no deadline known: no dangling 'until .'", () => {
    render(<TechEvalStatusBanner reopened bidWindowOpen isStuck={false} />);
    expect(screen.getByText("Bidding is open. Vendors who quote can be evaluated after bidding closes.")).toBeInTheDocument();
  });

  it("reopened, window closed, one eligible vendor: says new vendors are ready (not stuck)", () => {
    render(<TechEvalStatusBanner reopened recoverable bidWindowOpen={false} eligibleUnscoredCount={1} nextRound={2} isStuck={false} />);
    expect(screen.getByText("New vendors ready for evaluation")).toBeInTheDocument();
    expect(screen.getByText("1 vendor(s) quoted since the last round. Evaluate them and submit Round 2.")).toBeInTheDocument();
    expect(screen.queryByText("No vendor passed technical evaluation")).not.toBeInTheDocument();
  });

  it("eligible vendors but not recoverable (ordinary eval after bidding closes): no banner", () => {
    const { container } = render(<TechEvalStatusBanner bidWindowOpen={false} eligibleUnscoredCount={2} isStuck={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when nothing is wrong", () => {
    const { container } = render(<TechEvalStatusBanner isStuck={false} reopened={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("unquoted responders", () => {
  it("labels the cell instead of a locked score", () => {
    render(<UnquotedResponderLabel />);
    expect(screen.getByText("Hasn't quoted — can't be evaluated")).toBeInTheDocument();
  });

  it("notice names how many are hidden by Quoted Vendors Only", () => {
    render(<HiddenRespondersNotice count={1} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      `1 vendor(s) answered the technical questions but haven't quoted, so they're hidden. Turn off "Quoted Vendors Only" to see them.`
    );
  });

  it("notice is absent when nobody is hidden", () => {
    const { container } = render(<HiddenRespondersNotice count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("submit warnings", () => {
  const warning = "1 vendor(s) who answered won't be in this round: Hotel Kappa. Continue?";

  it("per-product submit asks first when a responder is left out, and only submits on confirm", async () => {
    const onSubmit = jest.fn();
    render(<ProductSubmitButton leftOutWarning={warning} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit for Approval" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/Hotel Kappa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("per-product submit goes straight through when nobody is left out", () => {
    const onSubmit = jest.fn();
    render(<ProductSubmitButton leftOutWarning={null} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit for Approval" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Submit All confirmation lists the responders left out", async () => {
    render(
      <UnifiedSubmitForApproval
        canWrite
        permissionsLoading={false}
        hasAnyPendingApproval={false}
        showUnifiedSubmitModal
        onSubmitClick={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
        productCount={1}
        evaluatedProductCount={1}
        isBidExpired
        leftOutWarning={warning}
      />
    );
    expect(await screen.findByText(/1 vendor\(s\) who answered won't be in this round: Hotel Kappa\. Continue\?/)).toBeInTheDocument();
  });
});

describe("approver warning", () => {
  it("warns when the round being approved has nobody passing", () => {
    render(
      <TechEvalVendorStatusDisplay
        warnWhenNonePass
        vendors={[{ vendor_id: 1, is_passed: false, calculated_score: 80 }]}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No vendor in this round passes. Approving blocks this line until the bid deadline is extended."
    );
  });

  it("does not warn when someone passes, or when not asked to (history)", () => {
    const { rerender } = render(
      <TechEvalVendorStatusDisplay warnWhenNonePass vendors={[{ vendor_id: 1, is_passed: true, calculated_score: 90 }]} />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<TechEvalVendorStatusDisplay vendors={[{ vendor_id: 1, is_passed: false, calculated_score: 10 }]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
