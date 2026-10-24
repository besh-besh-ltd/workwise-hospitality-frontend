// GRN detail: header, lines with allocations by phase, documents, labels, and
// the Reverse / Return-to-vendor actions gated on grn.approve at the GRN's
// hotel. Server refusals are shown where they happen.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/inventory/grn/[id]", push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  Object.assign(toast, { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), dismiss: jest.fn() });
  return { __esModule: true, toast };
});
let mockPerms = { canRead: true, canUpdate: true, canApprove: true };
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: ({ hotelIds = [] }) => ({
    ...mockPerms,
    loading: false,
    hotelIdsSeen: hotelIds,
    hasPermission: (a) => !!mockPerms[`can${a[0].toUpperCase()}${a.slice(1)}`],
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getGrn: jest.fn(),
  getGrnPdf: jest.fn(),
  printGrnLabels: jest.fn(),
  reverseGrn: jest.fn(),
  uploadGrnAttachment: jest.fn(),
  deleteGrnAttachment: jest.fn(),
  getPoDeliveries: jest.fn(),
  createRtv: jest.fn(),
  dispatchRtv: jest.fn(),
  closeRtv: jest.fn(),
  cancelRtv: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import {
  getGrn, printGrnLabels, getGrnPdf, reverseGrn, getPoDeliveries, createRtv, dispatchRtv,
} from "@/services/inventory";
import GrnDetail from "../GrnDetail";

const grn = (over = {}) => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", status: "posted", docType: "RECEIPT",
  hotelId: 46, hotelName: "Orchid Mumbai", poId: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms",
  receivedAt: "2026-10-24", postedAt: "2026-10-24T06:30:00.000Z", postedByName: "Asha Menon",
  vendorChallanNo: "CH-778", vendorChallanDate: "2026-10-23", vendorInvoiceNo: "INV-55", vendorInvoiceDate: null,
  ewayBillNo: null, vehicleNo: "MH01AB1234", remarks: null, reversesGrnId: null,
  lines: [
    {
      id: 7001, poLineId: 11, productName: "Basmati rice 25kg", poUom: "bag", stockUom: "bag",
      receivedQty: 12, acceptedQty: 10, rejectedQty: 2, rejectionReason: "damaged", uomFactor: 1, stockQty: 10,
      unitCost: 1800, markOutDepartmentName: null, batchNo: null, expiryDate: null, reversedQty: 0,
      allocations: [
        { deliveryId: 5, phaseNo: 1, hotelId: 46, acceptedQty: 6, rejectedQty: 2 },
        { deliveryId: 6, phaseNo: 2, hotelId: 46, acceptedQty: 4, rejectedQty: 0 },
      ],
    },
    {
      id: 7002, poLineId: 12, productName: "Paneer", invItemId: 10, itemName: "Paneer", poUom: "kg", stockUom: "kg",
      receivedQty: 5, acceptedQty: 5, rejectedQty: 0, rejectionReason: null, uomFactor: 1, stockQty: 5,
      unitCost: 320, markOutDepartmentName: "Kitchen", batchNo: "LOT-9", expiryDate: "2026-10-30", reversedQty: 0,
      allocations: [{ deliveryId: 5, phaseNo: 1, hotelId: 46, acceptedQty: 5, rejectedQty: 0 }],
    },
  ],
  attachments: [{ id: 3, fileName: "challan.jpg", kind: "CHALLAN", url: "https://files/challan.jpg" }],
  reversals: [],
  reverses: null,
  pdfUrl: null,
  ...over,
});

const apiError = (status, code, details, message) => {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { status: 0, message, code, details } };
  return err;
};

const mount = async (g = grn()) => {
  getGrn.mockResolvedValue(g);
  render(<GrnDetail id="900" />);
  await screen.findByRole("heading", { name: /GRN\/46\/2026-27\/00012/ });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPerms = { canRead: true, canUpdate: true, canApprove: true };
  getPoDeliveries.mockRejectedValue(apiError(501, "NOT_IMPLEMENTED", {}, "Not implemented"));
  window.open = jest.fn();
});

describe("GrnDetail", () => {
  it("GRN detail shows Reverse only when can.reverse", async () => {
    mockPerms = { canRead: true, canUpdate: true, canApprove: false };
    await mount();
    expect(screen.queryByRole("button", { name: "Reverse" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Return to vendor" })).toBeNull();
  });

  it("shows Reverse and Return to vendor to a GRN approver on a posted receipt", async () => {
    await mount();
    expect(screen.getByRole("button", { name: "Reverse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return to vendor" })).toBeInTheDocument();
  });

  it("never offers Reverse on a reversal or a fully reversed receipt", async () => {
    await mount(grn({ docType: "REVERSAL", status: "posted", reverses: { id: 899, grnNumber: "GRN/46/2026-27/00011" } }));
    expect(screen.queryByRole("button", { name: "Reverse" })).toBeNull();
    expect(screen.getByRole("link", { name: "GRN/46/2026-27/00011" })).toHaveAttribute("href", "/dashboard/buyer/inventory/grn/899");
  });

  it("lists lines with their allocations by phase", async () => {
    await mount();
    const rice = screen.getByText("Basmati rice 25kg").closest("tr");
    expect(rice.querySelector("[data-label='Accepted']")).toHaveTextContent("10 bag");
    expect(rice.querySelector("[data-label='Rejected']")).toHaveTextContent("2 bag");
    expect(within(rice).getByText("Damaged")).toBeInTheDocument();
    expect(within(rice).getByText("Phase 1")).toBeInTheDocument();
    expect(within(rice).getByText("Phase 2")).toBeInTheDocument();
    const paneer = screen.getByText("Paneer").closest("tr");
    expect(within(paneer).getByText(/LOT-9/)).toBeInTheDocument();
    expect(within(paneer).getByText(/Marked out to Kitchen/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /challan.jpg/ })).toHaveAttribute("href", "https://files/challan.jpg");
    expect(screen.getByRole("link", { name: "PO/2026/0052" })).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/52");
  });

  it("PDF and Print labels open the generated documents", async () => {
    getGrnPdf.mockResolvedValue({ url: "https://files/grn.pdf" });
    printGrnLabels.mockResolvedValue({ url: "https://files/labels.pdf" });
    await mount();

    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://files/grn.pdf", "_blank", "noopener"));

    fireEvent.click(screen.getByRole("button", { name: "Print labels" }));
    const dialog = await screen.findByRole("dialog", { name: "Print labels" });
    fireEvent.change(within(dialog).getByLabelText("Layout"), { target: { value: "THERMAL_50x25" } });
    fireEvent.click(within(dialog).getByLabelText("One label per pack"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Print" }));
    await waitFor(() => expect(printGrnLabels).toHaveBeenCalledWith(900, { layout: "THERMAL_50x25", mode: "per_pack" }));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://files/labels.pdf", "_blank", "noopener"));
  });

  it("reverse sends the reason; NEGATIVE_STOCK names the item and the shortfall", async () => {
    await mount();
    reverseGrn.mockRejectedValueOnce(
      apiError(409, "NEGATIVE_STOCK", { invItemId: 10, itemName: "Paneer", shortfall: 3, available: 2, requested: 5 },
        "Cannot reverse: 3 of Paneer has already left the store (2 in stock, 5 to reverse)")
    );
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    const dialog = await screen.findByRole("dialog", { name: "Reverse this receipt" });
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Posted against the wrong PO" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reverse receipt" }));

    await waitFor(() =>
      expect(reverseGrn).toHaveBeenCalledWith(900, { reason: "Posted against the wrong PO", lines: "all" })
    );
    // In the item's stock unit.
    expect(await within(dialog).findByText("3 kg of Paneer has already left the store")).toBeInTheDocument();
    expect(within(dialog).getByText(/2 kg in stock, 5 kg to reverse/)).toBeInTheDocument();
  });

  it("reversing some lines sends per-line qty; RTV_COVERED shows what was returned", async () => {
    await mount();
    reverseGrn.mockRejectedValueOnce(
      apiError(409, "CONFLICT", { reason: "RTV_COVERED", grnLineId: 7001, returnedQty: 3, maxReversible: 7 },
        "Some of this was returned to vendor")
    );
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    const dialog = await screen.findByRole("dialog", { name: "Reverse this receipt" });
    fireEvent.click(within(dialog).getByLabelText("Only some lines"));
    fireEvent.change(within(dialog).getByLabelText("Qty to reverse for Basmati rice 25kg"), { target: { value: "8" } });
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Counted twice" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reverse receipt" }));

    await waitFor(() =>
      expect(reverseGrn).toHaveBeenCalledWith(900, { reason: "Counted twice", lines: [{ grnLineId: 7001, qty: 8 }] })
    );
    expect(await within(dialog).findByText("3 already returned to vendor · up to 7 can be reversed")).toBeInTheDocument();
  });

  it("a successful reversal refreshes the GRN", async () => {
    await mount();
    reverseGrn.mockResolvedValueOnce(grn({ id: 901, grnNumber: "GRN/46/2026-27/00013", docType: "REVERSAL" }));
    getGrn.mockResolvedValueOnce(
      grn({ status: "reversed", reversals: [{ id: 901, grnNumber: "GRN/46/2026-27/00013", status: "posted", docType: "REVERSAL" }] })
    );
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    const dialog = await screen.findByRole("dialog", { name: "Reverse this receipt" });
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Wrong PO" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reverse receipt" }));

    expect(await screen.findByRole("link", { name: "GRN/46/2026-27/00013" })).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Reverse" })).toBeNull();
  });

  it("RTV modal creates a CREDIT return and shows a dispatch conflict verbatim", async () => {
    await mount();
    createRtv.mockResolvedValue({
      id: 70, rtvNumber: null, grnId: 900, disposition: "CREDIT", status: "draft",
      lines: [{ grnLineId: 7001, productName: "Basmati rice 25kg", qty: 2, reason: "quality" }],
    });
    dispatchRtv.mockRejectedValueOnce(
      apiError(409, "CONFLICT", { rtvId: 70, grnId: 900 },
        "Later returns on this receipt were dispatched first. Cancel this draft and raise it again to dispatch it.")
    );

    fireEvent.click(screen.getByRole("button", { name: "Return to vendor" }));
    const dialog = await screen.findByRole("dialog", { name: "Return to vendor" });
    fireEvent.click(within(dialog).getByLabelText(/Credit note/));
    fireEvent.change(within(dialog).getByLabelText("Qty to return for Basmati rice 25kg"), { target: { value: "2" } });
    fireEvent.change(within(dialog).getByLabelText("Reason for Basmati rice 25kg"), { target: { value: "quality" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create return" }));

    await waitFor(() =>
      expect(createRtv).toHaveBeenCalledWith({
        grnId: 900, disposition: "CREDIT", remarks: "",
        lines: [{ grnLineId: 7001, qty: 2, reason: "quality" }],
      })
    );
    fireEvent.change(await within(dialog).findByLabelText("Return challan no."), { target: { value: "RC-1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Dispatch now" }));
    await waitFor(() => expect(dispatchRtv).toHaveBeenCalledWith(70, { challanNo: "RC-1" }));
    expect(
      await within(dialog).findByText(
        "Later returns on this receipt were dispatched first. Cancel this draft and raise it again to dispatch it."
      )
    ).toBeInTheDocument();
  });

  it("a draft GRN links back to Receive instead of offering actions", async () => {
    getGrn.mockResolvedValue(grn({ status: "draft", grnNumber: null }));
    render(<GrnDetail id="900" />);
    await screen.findByRole("heading", { name: /GRN draft #900/ });
    expect(screen.getByRole("link", { name: "Continue receiving" })).toHaveAttribute(
      "href", "/dashboard/buyer/inventory/receive/52?hotelId=46"
    );
    expect(screen.queryByRole("button", { name: "Reverse" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Print labels" })).toBeNull();
  });
});
