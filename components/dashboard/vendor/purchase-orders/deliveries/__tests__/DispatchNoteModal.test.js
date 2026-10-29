// The vendor's dispatch note (inventory spec §5.2, task C4). "Mark
// dispatched" used to flip the PO's status and say nothing about what was on
// the truck. The note now says where it is going (hotel and phase, both
// optional), what is on it (line quantities, which start at what that phase
// still needs) and the paperwork (challan, e-way bill, vehicle, transporter,
// expected date). The server caps each quantity at what is open at that hotel
// (its own phases plus the share not yet split by hotel), or on the PO line
// when no hotel is named; the dialog checks the same before posting.
// Open counts receipts only, so the starting quantities leave out what earlier
// notes still have on the road (the fixture's DSP/47/…/00004: 10 POUFFE to
// Lotus Puri, phase 1).

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
jest.mock("@/services/po", () => ({
  __esModule: true,
  handleMarkDispatched: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { createDispatch } from "@/services/inventory";
import { handleMarkDispatched } from "@/services/po";
import DispatchNoteModal from "../DispatchNoteModal";
import { vendorDeliveries } from "../__fixtures__/vendorDeliveries.fixture";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const mount = (props = {}) => {
  const handlers = { onClose: jest.fn(), onDone: jest.fn() };
  render(<DispatchNoteModal show poId={626} data={vendorDeliveries()} initial={null} {...handlers} {...props} />);
  return { ...handlers, dialog: screen.getByRole("dialog", { name: "Dispatch note" }) };
};

const qty = (dialog, product) => within(dialog).getByLabelText(`Dispatch quantity for ${product}`);
/* Item | Open | On the road | Dispatch now, for one item's row. */
const cells = (dialog, product) => within(qty(dialog, product).closest("tr")).getAllByRole("cell").map((c) => c.textContent);
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
        clientEventId: expect.stringMatching(UUID),
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

  it("a save whose answer was lost is saved again with the same key, and a replayed answer says nothing new was added", async () => {
    const lost = Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK", request: {} });
    createDispatch.mockRejectedValueOnce(lost);
    const { dialog, onDone } = mount();
    set(within(dialog).getByLabelText("Hotel"), "46");
    set(within(dialog).getByLabelText("Phase"), "902");
    fillPaperwork(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    expect(await within(dialog).findByText(/Please try again|Network Error/)).toBeInTheDocument();

    const replayed = { id: 80, dispatchNumber: "DSP/46/2026-27/00005", status: "in_transit", replayed: true };
    createDispatch.mockResolvedValueOnce(replayed);
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(replayed));

    const [first, second] = createDispatch.mock.calls.map(([, body]) => body.clientEventId);
    expect(first).toMatch(UUID);
    expect(second).toBe(first);
    expect(toast.info).toHaveBeenCalledWith("This dispatch was already recorded as DSP/46/2026-27/00005. Nothing new was added.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("each opening of the dialog is a new dispatch with its own key", async () => {
    createDispatch.mockResolvedValue({ id: 80, dispatchNumber: "DSP/46/2026-27/00005" });
    const handlers = { onClose: jest.fn(), onDone: jest.fn() };
    const props = { poId: 626, data: vendorDeliveries(), initial: { hotelId: 46, deliveryId: 902 }, ...handlers };
    const { rerender } = render(<DispatchNoteModal show {...props} />);
    const record = async () => {
      const dialog = screen.getByRole("dialog", { name: "Dispatch note" });
      fillPaperwork(dialog);
      fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
      await waitFor(() => expect(handlers.onDone).toHaveBeenCalledTimes(createDispatch.mock.calls.length));
    };
    await record();
    rerender(<DispatchNoteModal show={false} {...props} />);
    rerender(<DispatchNoteModal show {...props} />);
    await record();
    const [first, second] = createDispatch.mock.calls.map(([, body]) => body.clientEventId);
    expect(second).toMatch(UUID);
    expect(second).not.toBe(first);
  });

  it("with only a hotel, starts at what is open there, its unsplit share included", () => {
    const { dialog } = mount();
    set(within(dialog).getByLabelText("Hotel"), "46");
    // POUFFE: phases 9 + 8. SIDE TABLE: phases 10 + 5, plus 2.5 not yet split.
    expect(qty(dialog, "POUFFE")).toHaveValue("17");
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("17.5");
  });

  it("with no hotel, starts at what is open on each PO line, less what is on the road", () => {
    const { dialog } = mount();
    // POUFFE: 27 open on the PO, 10 of them already on the road to Puri.
    expect(qty(dialog, "POUFFE")).toHaveValue("17");
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("17.5");
    expect(within(dialog).getByRole("columnheader", { name: "On the road" })).toBeInTheDocument();
    expect(cells(dialog, "POUFFE").slice(1, 3)).toEqual(["27", "10"]);
    expect(cells(dialog, "SIDE TABLE").slice(1, 3)).toEqual(["17.5", "—"]);
  });

  it("opens on the phase picked from the plan, net of the goods already on their way to it", async () => {
    createDispatch.mockResolvedValue({ id: 82, dispatchNumber: "DSP/47/2026-27/00007" });
    const { dialog } = mount({ initial: { hotelId: 47, deliveryId: 903 } });
    expect(within(dialog).getByLabelText("Hotel")).toHaveValue("47");
    expect(within(dialog).getByLabelText("Phase")).toHaveValue("903");
    // Puri's phase 1 needs 10 POUFFE and 10 are on the road: nothing to add.
    expect(qty(dialog, "POUFFE")).toHaveValue("");
    expect(cells(dialog, "POUFFE").slice(1, 3)).toEqual(["10", "10"]);
    // Nothing of Puri's phase 1 side tables is open (short-closed), so it
    // starts empty; the unsplit 2.5 could still go.
    expect(qty(dialog, "SIDE TABLE")).toHaveValue("");

    // The default is a suggestion: the server's cap (Open) is the only limit.
    set(qty(dialog, "POUFFE"), "4");
    fillPaperwork(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Record dispatch" }));
    await waitFor(() => expect(createDispatch).toHaveBeenCalledTimes(1));
    expect(createDispatch.mock.calls[0][1].lines).toEqual([{ poLineId: 501, qty: "4" }]);
  });

  it("shows no On the road column when nothing is on the road there", () => {
    const { dialog } = mount({ initial: { hotelId: 46, deliveryId: 902 } });
    expect(within(dialog).queryByRole("columnheader", { name: "On the road" })).not.toBeInTheDocument();
    expect(qty(dialog, "POUFFE")).toHaveValue("8");
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
    expect(payload.lines).toEqual([{ poLineId: 501, qty: "17" }]);
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

  it("when the plan will not load, can still mark the order dispatched without details", async () => {
    handleMarkDispatched.mockResolvedValue({ status: 1, message: "Marked as Dispatched for this PO." });
    const onRetry = jest.fn();
    const { dialog, onDone } = mount({ data: null, loading: false, error: "Network down", onRetry });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Network down");
    expect(within(dialog).getByRole("button", { name: "Record dispatch" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Mark dispatched without details" }));
    await waitFor(() => expect(handleMarkDispatched).toHaveBeenCalledWith(626));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/^Marked dispatched/));
    expect(createDispatch).not.toHaveBeenCalled();
  });

  it("says why when marking dispatched without details is refused", async () => {
    handleMarkDispatched.mockRejectedValue({
      response: { status: 403, data: { status: 0, message: "Your subscription has expired. Please renew to continue." } },
    });
    const { dialog, onDone } = mount({ data: null, loading: false, error: "Network down", onRetry: jest.fn() });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark dispatched without details" }));
    expect(await within(dialog).findByText("Your subscription has expired. Please renew to continue.")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Mark dispatched without details" })).toBeEnabled();
  });
});
