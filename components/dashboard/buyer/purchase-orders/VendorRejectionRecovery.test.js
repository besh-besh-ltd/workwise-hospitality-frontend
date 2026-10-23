jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPoReinstateState: jest.fn(),
  reinstatePo: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getPoReinstateState, reinstatePo } from "@/services/po";
import VendorRejectionRecovery, { SendBackLink } from "./VendorRejectionRecovery";

// Real post-interceptor envelope: { status, data: {...} } (payload is res.data).
const state = (over = {}) => ({
  status: 1,
  data: {
    permitted: true,
    available: true,
    blockers: [],
    rejection: { reason: "Wrong quantity", rejected_at: "2026-10-22T10:30:00.000Z", vendor_name: "Acme Linen" },
    ...over,
  },
});

const mount = (props = {}) => {
  const onReinstated = jest.fn();
  render(<VendorRejectionRecovery poId={626} poNumber="138898" onReinstated={onReinstated} {...props} />);
  return onReinstated;
};

beforeEach(() => jest.clearAllMocks());

const NOTE_LABEL = "Note for your team";

describe("VendorRejectionRecovery", () => {
  test("shows the vendor's reason and the Send back button when available", async () => {
    getPoReinstateState.mockResolvedValue(state());
    mount();
    expect(await screen.findByText(/Acme Linen rejected this order on/)).toBeInTheDocument();
    expect(screen.getByText(/“Wrong quantity”/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "If the vendor rejected it by mistake, you can send this same order back to them to accept. Its number, prices and approvals stay as they are."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send back to vendor" })).toBeInTheDocument();
  });

  test("falls back to 'The vendor' and omits the reason when none", async () => {
    getPoReinstateState.mockResolvedValue(
      state({ rejection: { reason: null, rejected_at: "2026-10-22T10:30:00.000Z", vendor_name: null } })
    );
    mount();
    expect(await screen.findByText(/The vendor rejected this order on/)).toBeInTheDocument();
    expect(screen.queryByText(/“/)).not.toBeInTheDocument();
  });

  test("blank note blocks submit with the inline error", async () => {
    getPoReinstateState.mockResolvedValue(state());
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Send back to vendor" }));
    expect(screen.getByText("Send PO #138898 back to the vendor?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Vendor called — they rejected it by mistake.")).toHaveAttribute("maxlength", "1000");
    expect(screen.getByText("The vendor won't see this note.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(NOTE_LABEL), { target: { value: "   " } });
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    expect(await screen.findByText("Add a note saying why the order is being sent back.")).toBeInTheDocument();
    expect(reinstatePo).not.toHaveBeenCalled();
  });

  test("submits trimmed note and calls onReinstated", async () => {
    getPoReinstateState.mockResolvedValue(state());
    reinstatePo.mockResolvedValue({ status: 1, message: "ok" });
    const onReinstated = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Send back to vendor" }));
    fireEvent.change(screen.getByLabelText(NOTE_LABEL), { target: { value: "  Vendor called  " } });
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    await waitFor(() => expect(onReinstated).toHaveBeenCalledTimes(1));
    expect(reinstatePo).toHaveBeenCalledTimes(1);
    expect(reinstatePo).toHaveBeenCalledWith(626, "Vendor called");
    expect(toast.success).toHaveBeenCalledWith("PO #138898 sent back to the vendor.");
  });

  test("a server failure toasts the message and does not call onReinstated", async () => {
    getPoReinstateState.mockResolvedValue(state());
    reinstatePo.mockRejectedValue({ response: { data: { status: 0, code: "PRODUCT_REAWARDED", message: "Re-awarded." } } });
    const onReinstated = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Send back to vendor" }));
    fireEvent.change(screen.getByLabelText(NOTE_LABEL), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Re-awarded."));
    expect(onReinstated).not.toHaveBeenCalled();
  });

  test("blocked state shows the blocker copy", async () => {
    getPoReinstateState.mockResolvedValue(state({ available: false, blockers: ["PRODUCT_REAWARDED"] }));
    mount();
    expect(
      await screen.findByText("This order can't be sent back: Some items on this order have been awarded to another vendor.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send back to vendor" })).not.toBeInTheDocument();
  });

  test("not permitted shows the permission line and no button", async () => {
    getPoReinstateState.mockResolvedValue(state({ permitted: false, available: false }));
    mount();
    expect(
      await screen.findByText("Only users with quote-compare · create on this business unit can send it back to the vendor.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send back to vendor" })).not.toBeInTheDocument();
  });

  test("not permitted on a call-off PO names the material-requisition permission", async () => {
    getPoReinstateState.mockResolvedValue(state({ permitted: false, available: false }));
    mount({ isCallOff: true });
    expect(
      await screen.findByText(
        "Only users with material-requisition · create on the requisition's hotel can send it back to the vendor."
      )
    ).toBeInTheDocument();
  });

  test("the send-back dialog has an accessible name and the note is described by help text and error", async () => {
    getPoReinstateState.mockResolvedValue(state());
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Send back to vendor" }));
    expect(screen.getByRole("dialog", { name: "Send PO #138898 back to the vendor" })).toBeInTheDocument();
    const ta = screen.getByLabelText(NOTE_LABEL);
    expect(ta).toHaveAttribute("aria-describedby", "po-send-back-help");
    fireEvent.change(ta, { target: { value: " " } });
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    await screen.findByRole("alert");
    expect(ta).toHaveAttribute("aria-invalid", "true");
    expect(ta).toHaveAttribute("aria-describedby", "po-send-back-help po-send-back-error");
    expect(document.getElementById("po-send-back-help")).toHaveTextContent("The vendor won't see this note.");
    expect(document.getElementById("po-send-back-error")).toHaveTextContent("Add a note saying why");
  });

  test("a 400 keeps the modal open and the note, and shows the server message inline", async () => {
    getPoReinstateState.mockResolvedValue(state());
    reinstatePo.mockRejectedValue({
      response: { status: 400, data: { status: 0, code: "NOTE_TOO_LONG", message: "Note is too long." } },
    });
    const onReinstated = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Send back to vendor" }));
    fireEvent.change(screen.getByLabelText(NOTE_LABEL), { target: { value: "my careful note" } });
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Note is too long.");
    expect(screen.getByRole("dialog", { name: "Send PO #138898 back to the vendor" })).toBeInTheDocument();
    expect(screen.getByLabelText(NOTE_LABEL)).toHaveValue("my careful note");
    expect(toast.error).not.toHaveBeenCalled();
    expect(onReinstated).not.toHaveBeenCalled();
  });

  test("a non-400 failure toasts, closes the modal and reloads state", async () => {
    getPoReinstateState.mockResolvedValue(state());
    reinstatePo.mockRejectedValue({ response: { status: 409, data: { status: 0, code: "PRODUCT_REAWARDED", message: "Re-awarded." } } });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Send back to vendor" }));
    fireEvent.change(screen.getByLabelText(NOTE_LABEL), { target: { value: "x" } });
    fireEvent.click(screen.getByTestId("send-back-confirm"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Re-awarded."));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(getPoReinstateState).toHaveBeenCalledTimes(2);
  });

  test("renders nothing when the state fails to load", async () => {
    getPoReinstateState.mockRejectedValue(new Error("x"));
    const { container } = render(<VendorRejectionRecovery poId={1} poNumber="1" onReinstated={() => {}} />);
    await waitFor(() => expect(getPoReinstateState).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SendBackLink (Quote Compare rejection banner)", () => {
  test("links to the PO when the rejection carries a po_id", () => {
    render(<SendBackLink poId={77} />);
    expect(screen.getByRole("link", { name: "Rejected by mistake? Open the PO to send it back" })).toHaveAttribute(
      "href",
      "/dashboard/buyer/purchase-orders/77"
    );
  });
  test("renders nothing without a po_id", () => {
    const { container } = render(<SendBackLink poId={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
