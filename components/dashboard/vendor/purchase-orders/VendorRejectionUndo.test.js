jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getVendorRejectionUndo: jest.fn(),
  withdrawVendorRejection: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getVendorRejectionUndo, withdrawVendorRejection } from "@/services/po";
import VendorRejectionUndo from "./VendorRejectionUndo";

const avail = (over = {}) => ({
  data: { status: 1, data: { available: true, deadline: "2026-10-24T10:30:00.000Z", blockers: [], ...over } },
});

const mount = (props = {}) => {
  const onDone = jest.fn();
  render(<VendorRejectionUndo poId={626} poNumber="138898" buyerName="Kamat Hotels" onDone={onDone} {...props} />);
  return onDone;
};

beforeEach(() => jest.clearAllMocks());

describe("VendorRejectionUndo", () => {
  it("rejected PO with undo available shows \"Accept this order instead\" and the deadline", async () => {
    getVendorRejectionUndo.mockResolvedValue(avail());
    mount();
    expect(await screen.findByText("Rejected by mistake?")).toBeInTheDocument();
    expect(screen.getByText(/You can still accept this order until .*2026/)).toBeInTheDocument();
    expect(screen.getByText(/as long as the buyer hasn't given it to someone else/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept this order instead" })).toBeInTheDocument();
    expect(getVendorRejectionUndo).toHaveBeenCalledWith(626);
  });

  it("confirming calls withdrawVendorRejection then onDone", async () => {
    getVendorRejectionUndo.mockResolvedValue(avail());
    withdrawVendorRejection.mockResolvedValue({ data: { status: 1 } });
    const onDone = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Accept this order instead" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Accept this order instead?");
    expect(dialog).toHaveTextContent("withdraws your rejection");
    expect(withdrawVendorRejection).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, accept PO" }));
    await waitFor(() => expect(withdrawVendorRejection).toHaveBeenCalledWith(626));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("PO #138898 accepted.");
  });

  it("undo unavailable shows the contact-the-buyer line", async () => {
    getVendorRejectionUndo.mockResolvedValue(avail({ available: false, deadline: null, blockers: ["UNDO_WINDOW_EXPIRED"] }));
    mount();
    expect(
      await screen.findByText("Rejected this by mistake? Contact Kamat Hotels — they can send the order back to you.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept this order instead" })).not.toBeInTheDocument();
  });

  it("falls back to 'the buyer' when no buyer name is known", async () => {
    getVendorRejectionUndo.mockResolvedValue(avail({ available: false, deadline: null }));
    mount({ buyerName: null });
    expect(await screen.findByText(/Contact the buyer — they can send/)).toBeInTheDocument();
  });

  it("renders nothing on fetch error", async () => {
    getVendorRejectionUndo.mockRejectedValue(new Error("boom"));
    mount();
    await waitFor(() => expect(getVendorRejectionUndo).toHaveBeenCalled());
    expect(screen.queryByText(/mistake/i)).not.toBeInTheDocument();
  });

  it("409 from withdraw shows the server message as an error toast and refetches", async () => {
    getVendorRejectionUndo.mockResolvedValueOnce(avail());
    getVendorRejectionUndo.mockResolvedValueOnce(avail({ available: false, deadline: null, blockers: ["PRODUCT_REAWARDED"] }));
    withdrawVendorRejection.mockRejectedValue({
      response: { status: 409, data: { status: 0, code: "PRODUCT_REAWARDED", message: "Items were awarded elsewhere." } },
    });
    const onDone = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Accept this order instead" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, accept PO" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Items were awarded elsewhere."));
    await waitFor(() => expect(getVendorRejectionUndo).toHaveBeenCalledTimes(2));
    expect(onDone).not.toHaveBeenCalled();
    expect(await screen.findByText(/Contact Kamat Hotels/)).toBeInTheDocument();
  });
});
