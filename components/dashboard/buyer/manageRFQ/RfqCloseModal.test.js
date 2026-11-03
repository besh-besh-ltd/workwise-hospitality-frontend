// RfqCloseModal — Close RFQ, and Close remaining items (closed without award).
// The dialog reads GET /rfq/:id/close-preview and must say what the server will
// do: which items close, and which POs / award approvals a Close RFQ cancels.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqClosePreview: jest.fn(),
  closeRfqItems: jest.fn(),
  closeRFQ: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRfqClosePreview, closeRfqItems, closeRFQ } from "@/services/rfq";
import RfqCloseModal from "./RfqCloseModal";

const RFQ = { id: 720, rfq_no: "536621", is_tender: 0 };

const preview = (over = {}) => ({
  status: 1,
  data: {
    rfq: { id: 720, rfq_no: "536621", status: 1, is_published: 1, bid_ended: true },
    items: [
      { rfq_product_id: 11, product_name: "Basin mixer", state: "awarded", closable: false, blockers: ["awarded"], suggested_reason: null, quoted_vendor_count: 2 },
      { rfq_product_id: 12, product_name: "Towel rail", state: "open", closable: true, blockers: [], suggested_reason: "no_quotes_received", quoted_vendor_count: 0 },
      { rfq_product_id: 13, product_name: "Shower head", state: "open", closable: true, blockers: [], suggested_reason: "no_quotes_received", quoted_vendor_count: 0 },
      { rfq_product_id: 14, product_name: "Soap dish", state: "open", closable: false, blockers: ["negotiation_round"], suggested_reason: null, quoted_vendor_count: 1 },
    ],
    summary: { total: 4, awarded: 1, award_pending: 0, closed_no_award: 0, open: 3 },
    award_outcome: "in_progress",
    on_close_rfq: {
      can_close: true,
      items_to_close: [12, 13, 14],
      pending_po_approvals_cancelled: [{ po_id: 1425, po_number: "PO-1425" }],
      pending_award_approvals_cancelled: 0,
      active_rounds_cancelled: 1,
      draft_pos_kept: [],
    },
    ...over,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  getRfqClosePreview.mockResolvedValue(preview());
});

describe("Close remaining items", () => {
  it("offers only closable items, preselects them and the shared reason, and closes them", async () => {
    closeRfqItems.mockResolvedValue({ status: 1, message: "2 items closed without award" });
    const onDone = jest.fn();
    render(<RfqCloseModal isOpen mode="items" rfq={RFQ} onClose={jest.fn()} onDone={onDone} />);

    expect(await screen.findByText("Towel rail")).toBeInTheDocument();
    expect(screen.getByText("Shower head")).toBeInTheDocument();
    // Awarded and blocked items are not offered; the blocked one says why.
    expect(screen.queryByLabelText(/Basin mixer/)).not.toBeInTheDocument();
    expect(screen.getByText(/Soap dish \(negotiation round open\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Reason/)).toHaveValue("no_quotes_received");

    // Untick one, then close.
    fireEvent.click(document.getElementById("item_close_pick_13-rfq_close_modal"));
    fireEvent.click(screen.getByRole("button", { name: "Close 1 item" }));

    await waitFor(() => expect(closeRfqItems).toHaveBeenCalledWith(720, {
      rfq_product_ids: [12], reason_code: "no_quotes_received", remarks: undefined,
    }));
    expect(onDone).toHaveBeenCalled();
  });

  it("needs remarks when the reason is Other", async () => {
    render(<RfqCloseModal isOpen mode="items" rfq={RFQ} onClose={jest.fn()} onDone={jest.fn()} />);
    await screen.findByText("Towel rail");
    fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: "other" } });
    expect(screen.getByRole("button", { name: "Close 2 items" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Remarks/), { target: { value: "Bought locally" } });
    expect(screen.getByRole("button", { name: "Close 2 items" })).toBeEnabled();
  });

  it("shows the server's refusal", async () => {
    closeRfqItems.mockRejectedValue({ message: { response: { data: { message: '"Towel rail" can\'t be closed: already awarded.' } } } });
    const onDone = jest.fn();
    render(<RfqCloseModal isOpen mode="items" rfq={RFQ} onClose={jest.fn()} onDone={onDone} />);
    await screen.findByText("Towel rail");
    fireEvent.click(screen.getByRole("button", { name: "Close 2 items" }));
    expect(await screen.findByText(/can't be closed: already awarded/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("Close RFQ", () => {
  it("lists the items closed without award and warns about the PO it cancels", async () => {
    closeRFQ.mockResolvedValue({ status: 1 });
    const onDone = jest.fn();
    render(<RfqCloseModal isOpen mode="rfq" rfq={RFQ} onClose={jest.fn()} onDone={onDone} />);

    expect(await screen.findByText("Towel rail")).toBeInTheDocument();
    expect(screen.getByText("Soap dish")).toBeInTheDocument();
    expect(screen.getByTestId("rfq-close-po-warning")).toHaveTextContent("PO-1425");
    expect(screen.getByText(/1 negotiation round/)).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "Close RFQ" });
    expect(confirm).toBeDisabled(); // a reason for closing is required
    fireEvent.change(screen.getByLabelText(/Reason for closing/), { target: { value: "Sourcing done" } });
    fireEvent.change(screen.getByLabelText(/Reason for the items not awarded/), { target: { value: "requirement_cancelled" } });
    fireEvent.click(confirm);

    await waitFor(() => expect(closeRFQ).toHaveBeenCalledWith(720, "Sourcing done", {
      item_reason_code: "requirement_cancelled", item_remarks: undefined,
    }));
    expect(onDone).toHaveBeenCalled();
  });

  it("without an item reason the server's default applies", async () => {
    closeRFQ.mockResolvedValue({ status: 1 });
    render(<RfqCloseModal isOpen mode="rfq" rfq={RFQ} onClose={jest.fn()} onDone={jest.fn()} />);
    await screen.findByText("Towel rail");
    fireEvent.change(screen.getByLabelText(/Reason for closing/), { target: { value: "Done" } });
    fireEvent.click(screen.getByRole("button", { name: "Close RFQ" }));
    await waitFor(() => expect(closeRFQ).toHaveBeenCalledWith(720, "Done", {}));
  });

  it("still lets the creator close when the preview cannot load", async () => {
    getRfqClosePreview.mockRejectedValue({ message: { response: { data: { message: "Only the RFQ creator can close or reopen its items" } } } });
    closeRFQ.mockResolvedValue({ status: 1 });
    render(<RfqCloseModal isOpen mode="rfq" rfq={RFQ} onClose={jest.fn()} onDone={jest.fn()} />);
    expect(await screen.findByText(/Only the RFQ creator/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Reason for closing/), { target: { value: "Done" } });
    fireEvent.click(screen.getByRole("button", { name: "Close RFQ" }));
    await waitFor(() => expect(closeRFQ).toHaveBeenCalled());
  });
});
