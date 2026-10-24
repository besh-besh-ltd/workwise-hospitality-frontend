// The vendor's dispatch note (inventory spec §5.2, task C4). "Mark
// dispatched" used to flip the PO's status and say nothing about what was on
// the truck. The note now says where it is going (hotel and phase, both
// optional), what is on it (line quantities, which start at what that phase
// still needs) and the paperwork (challan, e-way bill, vehicle, transporter,
// expected date). The server caps each quantity at what is open at that hotel
// (its own phases plus the share not yet split by hotel), or on the PO line
// when no hotel is named; the dialog checks the same before posting.

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getVendorPoDeliveries: jest.fn(),
  createDispatch: jest.fn(),
  cancelDispatch: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createDispatch } from "@/services/inventory";
import DispatchNoteModal from "../DispatchNoteModal";
import { vendorDeliveries } from "../__fixtures__/vendorDeliveries.fixture";

const mount = (props = {}) => {
  const handlers = { onClose: jest.fn(), onDone: jest.fn() };
  render(<DispatchNoteModal show poId={626} data={vendorDeliveries()} initial={null} {...handlers} {...props} />);
  return { ...handlers, dialog: screen.getByRole("dialog", { name: "Dispatch note" }) };
};

const qty = (dialog, product) => within(dialog).getByLabelText(`Dispatch quantity for ${product}`);
const set = (el, value) => fireEvent.change(el, { target: { value } });

const fillPaperwork = (dialog) => {
  set(within(dialog).getByLabelText(/Challan number/), "CH-200");
  set(within(dialog).getByLabelText(/Challan date/), "2026-10-25");
  set(within(dialog).getByLabelText(/Expected delivery/), "2026-12-01");
};

beforeEach(() => jest.clearAllMocks());

describe("DispatchNoteModal", () => {
  it("dispatch modal defaults qty to phase open qty and posts lines", async () => {
    const dispatch = { id: 80, dispatchNumber: "DSP/46/2026-27/00005", status: "in_transit" };
    createDispatch.mockResolvedValue(dispatch);
    const { dialog, onDone } = mount();

    set(within(dialog).getByLabelText("Hotel"), "46");
    set(within(dialog).getByLabelText("Phase"), "902");
    expect(qty(dialog, "POUFFE")).toHaveValue("8");
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("5");

    fillPaperwork(dialog);
    set(within(dialog).getByLabelText(/E-way bill/), "EWB-90210");
    set(within(dialog).getByLabelText(/Vehicle/), "OD02AB9999");
    set(within(dialog).getByLabelText(/Transporter/), "VRL Logistics");
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));

    await waitFor(() =>
      expect(createDispatch).toHaveBeenCalledWith(626, {
        hotelId: 46,
        deliveryId: 902,
        challanNo: "CH-200",
        challanDate: "2026-10-25",
        expectedDeliveryDate: "2026-12-01",
        ewayBillNo: "EWB-90210",
        vehicleNo: "OD02AB9999",
        transporter: "VRL Logistics",
        remarks: null,
        lines: [
          { poLineId: 501, qty: "8" },
          { poLineId: 502, qty: "5" },
        ],
      })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(dispatch));
  });

  it("with only a hotel, starts at what is open there, its unsplit share included", () => {
    const { dialog } = mount();
    set(within(dialog).getByLabelText("Hotel"), "46");
    // POUFFE: phases 9 + 8. SIDE TABLE: phases 10 + 5, plus 2.5 not yet split.
    expect(qty(dialog, "POUFFE")).toHaveValue("17");
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("17.5");
  });

  it("with no hotel, starts at what is open on each PO line", () => {
    const { dialog } = mount();
    expect(qty(dialog, "POUFFE")).toHaveValue("27");
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("17.5");
  });

  it("opens on the phase picked from the plan", () => {
    const { dialog } = mount({ initial: { hotelId: 47, deliveryId: 903 } });
    expect(within(dialog).getByLabelText("Hotel")).toHaveValue("47");
    expect(within(dialog).getByLabelText("Phase")).toHaveValue("903");
    expect(qty(dialog, "POUFFE")).toHaveValue("10");
    // Nothing of Puri's phase 1 side tables is open (short-closed), so it
    // starts empty; the unsplit 2.5 could still go.
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("");
  });

  it("does not post more than is open at the hotel, or nothing at all", async () => {
    const { dialog } = mount();
    set(within(dialog).getByLabelText("Hotel"), "46");
    fillPaperwork(dialog);

    set(qty(dialog, "POUFFE"), "18");
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    expect(await within(dialog).findByText("Only 17 Nos is still to be delivered here")).toBeInTheDocument();

    set(qty(dialog, "POUFFE"), "");
    set(qty(dialog, "SIDE TABLE"), "0");
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    expect(await within(dialog).findByText("Enter a quantity for at least one item")).toBeInTheDocument();

    set(qty(dialog, "SIDE TABLE"), "1.23456");
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    expect(await within(dialog).findByText("Up to 4 decimals")).toBeInTheDocument();
    expect(createDispatch).not.toHaveBeenCalled();
  });

  it("sends only the lines that carry a quantity, and asks for the challan", async () => {
    createDispatch.mockResolvedValue({ id: 81, dispatchNumber: "DSP/46/2026-27/00006" });
    const { dialog } = mount();
    set(qty(dialog, "SIDE TABLE"), "");
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    expect(await within(dialog).findByText("Challan number is required")).toBeInTheDocument();
    expect(createDispatch).not.toHaveBeenCalled();

    fillPaperwork(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    await waitFor(() => expect(createDispatch).toHaveBeenCalledTimes(1));
    const [, payload] = createDispatch.mock.calls[0];
    expect(payload.hotelId).toBeNull();
    expect(payload.deliveryId).toBeNull();
    expect(payload.lines).toEqual([{ poLineId: 501, qty: "27" }]);
  });

  it("keeps the dialog open with the server's reason when the dispatch is refused", async () => {
    createDispatch.mockRejectedValue({
      response: { status: 400, data: { status: 0, message: "That delivery has nothing left to send", code: "VALIDATION" } },
    });
    const { dialog, onDone } = mount({ initial: { hotelId: 46, deliveryId: 902 } });
    fillPaperwork(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    expect(await within(dialog).findByText("That delivery has nothing left to send")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
