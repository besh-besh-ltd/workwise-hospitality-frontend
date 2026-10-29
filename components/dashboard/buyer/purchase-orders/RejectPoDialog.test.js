import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RejectPoDialog from "./RejectPoDialog";

const TARGETS = [
  { target_role: "RFQ_CREATOR", user: { id: 11, name: "Rhea Rao" }, available: true },
  { target_role: "PO_INITIATOR", user: { id: 12, name: "Pavan Patil" }, available: true },
  { target_role: "COMMERCIAL_EVALUATOR", user: { id: 13, name: "Chitra Chawla" }, available: true },
  { target_role: "TECHNICAL_EVALUATOR", user: { id: 14, name: "Tara Tiwari" }, available: true },
];

const setup = (props = {}) => {
  const onSubmit = jest.fn(() => Promise.resolve());
  const onAskInstead = jest.fn();
  render(
    <RejectPoDialog
      isOpen
      onClose={jest.fn()}
      poNumber="138877"
      targets={TARGETS}
      onSubmit={onSubmit}
      onAskInstead={onAskInstead}
      {...props}
    />
  );
  return { onSubmit, onAskInstead };
};

const pick = (label) => fireEvent.click(screen.getByRole("radio", { name: label }));

describe("RejectPoDialog", () => {
  it("offers all eight reasons as real radios with the exact labels", () => {
    setup();
    [
      "Photos or documents missing",
      "Need more details or justification",
      "Question on the technical evaluation",
      "Question on price, GST or calculation",
      "Quantity or specification needs a change",
      "Re-negotiate or change the vendor",
      "Not needed any more",
      "Something else",
    ].forEach((l) => expect(screen.getByRole("radio", { name: l })).toBeInTheDocument());
    expect(screen.getAllByRole("radio")).toHaveLength(8);
  });

  it("validates: no reason and no comment means nothing is sent and both are flagged", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Choose a reason.")).toBeInTheDocument();
    expect(screen.getByText("Write why you are rejecting this PO.")).toBeInTheDocument();
  });

  it("validates: a reason without a comment is still refused", () => {
    const { onSubmit } = setup();
    pick("Re-negotiate or change the vendor");
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Write why you are rejecting this PO.")).toBeInTheDocument();
  });

  it("re-award reasons say it goes back to commercial evaluation and name the people", () => {
    setup();
    pick("Re-negotiate or change the vendor");
    expect(
      screen.getByText(
        "Back to commercial evaluation for re-award. Rhea Rao, Pavan Patil and the commercial evaluators will be told."
      )
    ).toBeInTheDocument();
  });

  it("Not needed any more says the PO is cancelled and names the RFQ creator", () => {
    setup();
    pick("Not needed any more");
    expect(screen.getByText("The PO is cancelled. Rhea Rao will be asked to close the RFQ.")).toBeInTheDocument();
  });

  it("falls back to role words when names are unavailable, never a blank", () => {
    setup({ targets: null });
    pick("Re-negotiate or change the vendor");
    expect(
      screen.getByText(
        "Back to commercial evaluation for re-award. The RFQ creator, the PO creator and the commercial evaluators will be told."
      )
    ).toBeInTheDocument();
    pick("Not needed any more");
    expect(screen.getByText("The PO is cancelled. The RFQ creator will be asked to close the RFQ.")).toBeInTheDocument();
  });

  it("submits the reason and comment", async () => {
    const { onSubmit } = setup();
    pick("Something else");
    fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "  Freight is double  " } });
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ reason_category: "OTHER", comment: "Freight is double" }));
  });

  describe("the nudge towards asking instead", () => {
    it.each([
      ["Photos or documents missing", "Rhea Rao"],
      ["Need more details or justification", "Rhea Rao"],
      ["Question on the technical evaluation", "Tara Tiwari"],
      ["Question on price, GST or calculation", "Chitra Chawla"],
      ["Quantity or specification needs a change", "Pavan Patil"],
    ])("%s suggests %s", (label, name) => {
      setup();
      pick(label);
      expect(
        screen.getByText(`This sounds like a question. Ask ${name} instead? The PO keeps its approvals.`)
      ).toBeInTheDocument();
    });

    it.each(["Re-negotiate or change the vendor", "Not needed any more", "Something else"])(
      "is not shown for %s",
      (label) => {
        setup();
        pick(label);
        expect(screen.queryByText(/This sounds like a question/)).not.toBeInTheDocument();
      }
    );

    it("switches to Ask for info carrying the reason and the typed comment", () => {
      const { onAskInstead, onSubmit } = setup();
      pick("Question on price, GST or calculation");
      fireEvent.change(screen.getByLabelText(/Reason for rejection/), { target: { value: "GST looks off" } });
      fireEvent.click(screen.getByRole("button", { name: "Ask for info instead" }));
      expect(onAskInstead).toHaveBeenCalledWith({ reason: "PRICE_TAX_QUERY", comment: "GST looks off" });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("uses role words when the default person's name is unknown", () => {
      setup({ targets: null });
      pick("Photos or documents missing");
      expect(
        screen.getByText("This sounds like a question. Ask the RFQ creator instead? The PO keeps its approvals.")
      ).toBeInTheDocument();
    });
  });
});
