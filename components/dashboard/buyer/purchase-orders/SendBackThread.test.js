import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SendBackThread from "./SendBackThread";

const open = (over = {}) => ({
  id: 7,
  route: "INFO_REQUEST",
  reason_category: "PRICE_TAX_QUERY",
  comment: "Why is GST 28 percent here?",
  requested_by: { id: 100, name: "Anil Approver" },
  target_role: "COMMERCIAL_EVALUATOR",
  target: { id: 200, name: "Chitra Chawla" },
  status: "OPEN",
  response_text: null,
  responded_by: null,
  responded_at: null,
  resolution: null,
  created_at: "2026-10-20T10:00:00Z",
  closed_at: null,
  files: [{ id: 1, side: "REQUEST", name: "quote.pdf", url: "https://files/quote.pdf" }],
  ...over,
});

const setup = (rows, props = {}) => {
  const onRespond = jest.fn(() => Promise.resolve());
  const onWithdraw = jest.fn();
  render(
    <SendBackThread
      rows={rows}
      currentUserId={999}
      canWithdraw={false}
      stepLabel="L3"
      onRespond={onRespond}
      onWithdraw={onWithdraw}
      {...props}
    />
  );
  return { onRespond, onWithdraw };
};

describe("SendBackThread", () => {
  it("renders nothing when there is nothing to show", () => {
    const { container } = render(<SendBackThread rows={[]} currentUserId={1} />);
    expect(container).toBeEmptyDOMElement();
    const again = render(<SendBackThread rows={null} currentUserId={1} />);
    expect(again.container).toBeEmptyDOMElement();
  });

  it("shows the question, who asked whom, and the attachment", () => {
    setup([open()]);
    expect(screen.getByText("Asked for information: Question on price, GST or calculation")).toBeInTheDocument();
    expect(screen.getByText("Why is GST 28 percent here?")).toBeInTheDocument();
    expect(screen.getByText(/Anil Approver asked Chitra Chawla \(Commercial evaluator\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "quote.pdf" })).toHaveAttribute("href", "https://files/quote.pdf");
  });

  it("lists request files and response files under their own side, by exact value", () => {
    setup([
      open({
        status: "ANSWERED",
        response_text: "See attached",
        files: [
          { id: 1, side: "REQUEST", name: "ask.pdf", url: "https://f/ask.pdf" },
          { id: 2, side: "RESPONSE", name: "answer.png", url: "https://f/answer.png" },
        ],
      }),
    ]);
    const answer = screen.getByText("See attached");
    const askLink = screen.getByRole("link", { name: "ask.pdf" });
    const ansLink = screen.getByRole("link", { name: "answer.png" });
    // request files come before the answer text, response files after it
    expect(askLink.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(answer.compareDocumentPosition(ansLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("treats any route but INFO_REQUEST as a rejection: CANCEL is a cancellation, COMMERCIAL a rejection", () => {
    setup([
      open({ id: 10, route: "CANCEL", status: "CLOSED", resolution: "CANCELLED", reason_category: "NOT_REQUIRED", comment: "Not needed" }),
      open({ id: 11, route: "COMMERCIAL", status: "CLOSED", resolution: null, reason_category: "RENEGOTIATE" }),
      open({ id: 12, status: "CLOSED", resolution: "REJECTED", reason_category: "OTHER" }),
    ]);
    expect(screen.getByText("Cancelled: Not needed any more")).toBeInTheDocument();
    expect(screen.getByText("Rejected: Re-negotiate or change the vendor")).toBeInTheDocument();
    // resolution alone never turns an info request into a rejection
    expect(screen.getByText("Asked for information: Something else")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/REJECTED|CANCELLED|INFO_REQUEST/);
  });

  it("shows no status text for an unmapped status, never the raw code", () => {
    setup([open({ status: "SOMETHING_NEW" })]);
    expect(document.body.textContent).not.toMatch(/SOMETHING_NEW/);
  });

  it("shows the answer once given, and a rejection as a rejection", () => {
    setup([
      open({
        id: 8,
        status: "ANSWERED",
        response_text: "It is a typo, corrected.",
        responded_by: { id: 200, name: "Chitra Chawla" },
        responded_at: "2026-10-21T10:00:00Z",
      }),
      open({
        id: 9,
        route: "COMMERCIAL",
        status: "CLOSED",
        resolution: "REJECTED",
        reason_category: "RENEGOTIATE",
        comment: "Go back to negotiation",
      }),
    ]);
    expect(screen.getByText("It is a typo, corrected.")).toBeInTheDocument();
    expect(screen.getByText("Rejected: Re-negotiate or change the vendor")).toBeInTheDocument();
  });

  describe("the respond box", () => {
    it("is shown to the named target only", () => {
      setup([open()], { currentUserId: 200 });
      expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
      expect(
        screen.getByText("Editing the PO restarts approval from Level 1. Answering without editing keeps it at Level 3.")
      ).toBeInTheDocument();
    });

    it("is not shown to anyone else, including the requester", () => {
      setup([open()], { currentUserId: 100 });
      expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    });

    it("is not shown once the request is no longer open", () => {
      setup([open({ status: "ANSWERED" })], { currentUserId: 200 });
      expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    });

    it("needs text or a file", () => {
      const { onRespond } = setup([open()], { currentUserId: 200 });
      fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
      expect(onRespond).not.toHaveBeenCalled();
      expect(screen.getByText("Write an answer or attach a file.")).toBeInTheDocument();
    });

    it("sends the answer", async () => {
      const { onRespond } = setup([open()], { currentUserId: 200 });
      fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: " Fixed " } });
      fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
      await waitFor(() => expect(onRespond).toHaveBeenCalledWith(7, { response_text: "Fixed", files: [] }));
    });
  });

  describe("withdraw", () => {
    it("is offered to the requester", () => {
      const { onWithdraw } = setup([open()], { currentUserId: 100 });
      fireEvent.click(screen.getByRole("button", { name: "Withdraw this request" }));
      expect(onWithdraw).toHaveBeenCalledWith(7);
    });

    it("is offered to a pending approver on the step", () => {
      setup([open()], { currentUserId: 555, canWithdraw: true });
      expect(screen.getByRole("button", { name: "Withdraw this request" })).toBeInTheDocument();
    });

    it("is not offered to anyone else, or on a closed request", () => {
      setup([open(), open({ id: 8, status: "ANSWERED" })], { currentUserId: 555, canWithdraw: false });
      expect(screen.queryByRole("button", { name: "Withdraw this request" })).not.toBeInTheDocument();
      const closed = render(
        <SendBackThread rows={[open({ status: "WITHDRAWN" })]} currentUserId={100} canWithdraw stepLabel="L3" />
      );
      expect(within(closed.container).queryByRole("button", { name: "Withdraw this request" })).not.toBeInTheDocument();
    });
  });
});
