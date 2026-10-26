// Receive page (desktop): hotel choice, scanning, line entry, posting and the
// inline error map. services/inventory is mocked; ScanInput is the real one
// (only the camera and the beeps are stubbed), so a typed code goes through
// the same pipeline a hardware scanner would.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/inventory/receive/[poId]", push: mockPush, replace: jest.fn() }),
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
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => function MockCamera() { return <div data-testid="camera" />; },
}));
jest.mock("@/components/inventory/scan/scanFeedback", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    unlock: jest.fn(),
    installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false),
    setMuted: jest.fn(),
  },
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false, hasPermission: () => true,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getReceiveContext: jest.fn(),
  createGrn: jest.fn(),
  updateGrn: jest.fn(),
  postGrn: jest.fn(),
  discardGrn: jest.fn(),
  getGrn: jest.fn(),
  uploadGrnAttachment: jest.fn(),
  deleteGrnAttachment: jest.fn(),
  resolveScan: jest.fn(),
  addItemBarcode: jest.fn(),
  listItems: jest.fn(() => Promise.resolve({ rows: [] })),
}));

const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getReceiveContext, createGrn, updateGrn, postGrn, resolveScan } from "@/services/inventory";
import ReceivePage from "../ReceivePage";

const RICE = {
  poLineId: 11, productVariantId: 501, productName: "Basmati rice 25kg", unit: "bag",
  invItemId: 9, stockUom: "bag", uomFactor: 1, needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 24, openAtHotel: 24, maxAcceptable: 24, defaultMarkOutOnArrival: false, costPerPoUnit: 1800,
  barcodes: [{ code: "RICE-6PK", packFactor: 6 }],
};
const PANEER = {
  poLineId: 12, productVariantId: 502, productName: "Paneer", unit: "kg",
  invItemId: 10, stockUom: "kg", uomFactor: 1, needsUomFactor: false, trackExpiry: true, minShelfLifeDays: 3,
  plannedAtHotel: 100, openAtHotel: 100, maxAcceptable: 100, defaultMarkOutOnArrival: false, costPerPoUnit: 320,
  barcodes: [],
};
const SOAP = {
  poLineId: 13, productVariantId: 503, productName: "Dish soap", unit: "box",
  invItemId: 11, stockUom: "piece", uomFactor: null, needsUomFactor: true, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 10, openAtHotel: 10, maxAcceptable: 10, defaultMarkOutOnArrival: false, costPerPoUnit: 600,
  barcodes: [],
};

const ctx = (over = {}) => ({
  po: { id: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms", isCallOff: false, departmentId: 7 },
  hotel: { id: 46, name: "Orchid Mumbai" },
  hotelChoices: [{ id: 46, name: "Orchid Mumbai" }],
  lines: [RICE, PANEER, SOAP],
  dispatches: [],
  departments: [{ id: 7, title: "Kitchen" }, { id: 8, title: "Housekeeping" }],
  itemSuggestions: {},
  draft: null,
  ...over,
});

const draftGrn = (over = {}) => ({
  id: 900, grnNumber: null, status: "draft", docType: "RECEIPT", poId: 52, hotelId: 46,
  clientEventId: "11111111-1111-4111-8111-111111111111", lines: [], attachments: [], ...over,
});
const postedGrn = (over = {}) => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", status: "posted", docType: "RECEIPT", poId: 52, hotelId: 46,
  lines: [], attachments: [], warnings: [], ...over,
});

const apiError = (status, code, details, message = "Refused") => {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { status: 0, message, code, details } };
  return err;
};

const rowFor = (name) => screen.getByText(name).closest("tr");
const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

const mount = async (context = ctx(), props = {}) => {
  getReceiveContext.mockResolvedValue(context);
  const view = render(<ReceivePage poId="52" {...props} />);
  await screen.findByText(context.lines[0]?.productName || "Which hotel is receiving?");
  return view;
};

const postAndConfirm = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Post receipt" }));
  const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm and post" }));
  return dialog;
};

// POST /grn: post:false saves a draft; post:true answers from `postReplies`
// (an Error rejects), else a fresh posted GRN.
let postReplies = [];
const replyToPosts = (...replies) => postReplies.push(...replies);
const postCalls = () => createGrn.mock.calls.map((c) => c[0]).filter((input) => input.post === true);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  jest.clearAllMocks();
  postReplies = [];
  createGrn.mockImplementation((input) => {
    if (!input.post) return Promise.resolve(draftGrn());
    const next = postReplies.length ? postReplies.shift() : postedGrn();
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  updateGrn.mockResolvedValue(draftGrn());
});

describe("ReceivePage", () => {
  it("renders lines with open qty for chosen hotel", async () => {
    getReceiveContext.mockResolvedValueOnce(
      ctx({ hotel: null, hotelChoices: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }], lines: [] })
    );
    getReceiveContext.mockResolvedValueOnce(
      ctx({ hotel: { id: 47, name: "Orchid Pune" }, hotelChoices: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }] })
    );
    render(<ReceivePage poId="52" />);

    await screen.findByText("Which hotel is receiving?");
    expect(getReceiveContext).toHaveBeenLastCalledWith("52", undefined);
    fireEvent.click(screen.getByRole("button", { name: /Orchid Pune/ }));

    await screen.findByText("Basmati rice 25kg");
    expect(getReceiveContext).toHaveBeenLastCalledWith("52", 47);
    expect(rowFor("Basmati rice 25kg").querySelector("[data-label='Open']")).toHaveTextContent("24 bag");
    expect(rowFor("Paneer").querySelector("[data-label='Open']")).toHaveTextContent("100 kg");
    expect(screen.getByText(/Orchid Pune/, { selector: "[data-testid='receiving-hotel']" })).toBeInTheDocument();
  });

  it("scan increments received by pack factor and shows undo toast", async () => {
    await mount();
    resolveScan.mockResolvedValue({
      kind: "item", code: "RICE-6PK", gs1: null,
      item: { invItemId: 9, displayName: "Basmati rice 25kg", stockUom: "bag", packFactor: 6, poLineId: 11 },
    });

    type("Scan or type a code", "RICE-6PK");
    fireEvent.keyDown(field("Scan or type a code"), { key: "Enter" });

    await waitFor(() => expect(field("Received qty for Basmati rice 25kg")).toHaveValue("6"));
    expect(resolveScan).toHaveBeenCalledWith("RICE-6PK", "po:52");
    expect(field("Accepted qty for Basmati rice 25kg")).toHaveValue("6");

    // "+6 (now 6)" with an Undo button.
    expect(toast).toHaveBeenCalled();
    const content = toast.mock.calls[toast.mock.calls.length - 1][0];
    const shown = render(<div>{content}</div>);
    expect(shown.container).toHaveTextContent("+6 (now 6)");
    fireEvent.click(within(shown.container).getByRole("button", { name: "Undo" }));
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("0");
  });

  it("decimal units open the qty pad prefilled with the open qty", async () => {
    await mount();
    resolveScan.mockResolvedValue({
      kind: "item", code: "PANEER", gs1: null,
      item: { invItemId: 10, displayName: "Paneer", stockUom: "kg", packFactor: 1, poLineId: 12 },
    });
    type("Scan or type a code", "PANEER");
    fireEvent.keyDown(field("Scan or type a code"), { key: "Enter" });

    const pad = await screen.findByRole("dialog", { name: /Paneer/ });
    expect(within(pad).getByLabelText("Qty in kg")).toHaveValue("100");
    fireEvent.click(within(pad).getByRole("button", { name: "Clear" }));
    for (const k of ["9", "8", ".", "5"]) fireEvent.click(within(pad).getByRole("button", { name: k }));
    fireEvent.click(within(pad).getByRole("button", { name: "Add 98.5 kg" }));

    await waitFor(() => expect(field("Received qty for Paneer")).toHaveValue("98.5"));
  });

  it("rejected qty requires reason before post", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "10");
    type("Rejected qty for Basmati rice 25kg", "2");
    expect(field("Accepted qty for Basmati rice 25kg")).toHaveValue("8");

    fireEvent.click(screen.getByRole("button", { name: "Post receipt" }));
    expect(within(rowFor("Basmati rice 25kg").parentElement).getByText("Pick a reason for the rejected qty")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Post this receipt?" })).toBeNull();
    expect(createGrn).not.toHaveBeenCalled();

    fireEvent.change(field("Rejection reason for Basmati rice 25kg"), { target: { value: "damaged" } });
    await postAndConfirm();

    // One request records and posts the receipt, keyed by the session.
    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    expect(postCalls()).toEqual([
      expect.objectContaining({
        poId: 52, hotelId: 46, post: true, clientEventId: expect.stringMatching(UUID),
        lines: [expect.objectContaining({ poLineId: 11, receivedQty: 10, acceptedQty: 8, rejectedQty: 2, rejectionReason: "damaged" })],
      }),
    ]);
    expect(postGrn).not.toHaveBeenCalled();
    expect(updateGrn).not.toHaveBeenCalled();
    expect(screen.getByText("GRN/46/2026-27/00012")).toBeInTheDocument();
  });

  it("OVER_RECEIPT error shows max acceptable on the line", async () => {
    await mount();
    replyToPosts(
      apiError(409, "OVER_RECEIPT", { poLineId: 11, maxAcceptable: 24, requested: 30 }, "Only 24 bag more can be accepted here")
    );
    type("Received qty for Basmati rice 25kg", "30");
    await postAndConfirm();
    // The confirmation stays open (busy) until the server answers.
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Post this receipt?" })).toBeNull());

    const row = rowFor("Basmati rice 25kg").parentElement;
    expect(await within(row).findByText(/Max acceptable 24 bag/)).toBeInTheDocument();
    expect(screen.queryByText("Receipt posted")).toBeNull();
  });

  it("UOM factor prompt appears and resubmits with uomFactor", async () => {
    await mount();
    replyToPosts(apiError(400, "VALIDATION", { code_detail: "UOM_FACTOR_REQUIRED", poLineId: 13, poUnit: "box", stockUom: "piece" }));
    type("Received qty for Dish soap", "2");
    await postAndConfirm();

    const prompt = await screen.findByRole("dialog", { name: "Unit conversion needed" });
    fireEvent.change(within(prompt).getByLabelText("How many piece in one box?"), { target: { value: "12" } });
    expect(prompt).toHaveTextContent("2 box = 24 piece");
    fireEvent.click(within(prompt).getByRole("button", { name: "Save and post" }));

    await screen.findByText("Receipt posted");
    const [first, second] = postCalls();
    expect(first.lines).toEqual([expect.objectContaining({ poLineId: 13, receivedQty: 2, uomFactor: null })]);
    expect(second.lines).toEqual([expect.objectContaining({ poLineId: 13, receivedQty: 2, uomFactor: 12 })]);
    // The refused attempt recorded nothing, so the same key posts the receipt.
    expect(second.clientEventId).toBe(first.clientEventId);
    expect(postCalls()).toHaveLength(2);
    expect(updateGrn).not.toHaveBeenCalled();
  });

  it("UOM_FACTOR_MISMATCH: \"Use F and post\" sends no factor, so the stored one applies", async () => {
    await mount();
    // The receiver sets 10 ahead of posting; the item already has 12.
    fireEvent.click(within(rowFor("Dish soap")).getByRole("button", { name: /Set unit conversion/ }));
    const setPrompt = await screen.findByRole("dialog", { name: "Unit conversion needed" });
    fireEvent.change(within(setPrompt).getByLabelText("How many piece in one box?"), { target: { value: "10" } });
    fireEvent.click(within(setPrompt).getByRole("button", { name: "Use this conversion" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Unit conversion needed" })).toBeNull());

    replyToPosts(apiError(400, "VALIDATION", { code_detail: "UOM_FACTOR_MISMATCH", poLineId: 13, currentFactor: 12, suppliedFactor: 10 }));
    type("Received qty for Dish soap", "1");
    await postAndConfirm();

    const prompt = await screen.findByRole("dialog", { name: "Unit conversion needed" });
    expect(prompt).toHaveTextContent("already set to 12 piece per box");
    fireEvent.click(within(prompt).getByRole("button", { name: "Use 12 and post" }));

    await screen.findByText("Receipt posted");
    const [first, second] = postCalls();
    expect(first.lines).toEqual([expect.objectContaining({ poLineId: 13, uomFactor: 10 })]);
    expect(second.lines).toEqual([expect.objectContaining({ poLineId: 13, uomFactor: null })]);
    expect(postCalls()).toHaveLength(2);
  });

  it("a 0.083333 factor goes out at 6 dp and a mismatch on it settles in one more post", async () => {
    await mount();
    fireEvent.click(within(rowFor("Dish soap")).getByRole("button", { name: /Set unit conversion/ }));
    const setPrompt = await screen.findByRole("dialog", { name: "Unit conversion needed" });
    fireEvent.change(within(setPrompt).getByLabelText("How many piece in one box?"), { target: { value: "0.083333" } });
    fireEvent.click(within(setPrompt).getByRole("button", { name: "Use this conversion" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Unit conversion needed" })).toBeNull());
    expect(within(rowFor("Dish soap")).getByRole("button", { name: /1 box = 0.083333 piece/ })).toBeInTheDocument();

    // The server's stored factor differs only past 4 dp: one "use it" ends it.
    replyToPosts(
      apiError(400, "VALIDATION", { code_detail: "UOM_FACTOR_MISMATCH", poLineId: 13, currentFactor: 0.083334, suppliedFactor: 0.083333 })
    );
    type("Received qty for Dish soap", "24");
    await postAndConfirm();

    const prompt = await screen.findByRole("dialog", { name: "Unit conversion needed" });
    fireEvent.click(within(prompt).getByRole("button", { name: "Use 0.083334 and post" }));
    await screen.findByText("Receipt posted");

    const [first, second] = postCalls();
    expect(first.lines[0].uomFactor).toBe(0.083333);
    expect(second.lines[0].uomFactor).toBeNull();
    expect(postCalls()).toHaveLength(2);
  });

  it("mark-out-on-arrival sends markOutDepartmentId", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "5");
    fireEvent.click(field("Mark out on arrival for Basmati rice 25kg"));
    // Defaults to the PO's department, then the receiver picks another.
    expect(field("Department for Basmati rice 25kg")).toHaveValue("7");
    fireEvent.change(field("Department for Basmati rice 25kg"), { target: { value: "8" } });
    await postAndConfirm();

    await screen.findByText("Receipt posted");
    expect(postCalls()[0].lines).toEqual([
      expect.objectContaining({ poLineId: 11, receivedQty: 5, acceptedQty: 5, rejectedQty: 0, markOutDepartmentId: 8 }),
    ]);
  });

  it("the confirmation summarises accepted, rejected and remaining per line", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "10");
    type("Rejected qty for Basmati rice 25kg", "1");
    fireEvent.change(field("Rejection reason for Basmati rice 25kg"), { target: { value: "damaged" } });
    fireEvent.click(screen.getByRole("button", { name: "Post receipt" }));
    const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
    const row = within(dialog).getByText("Basmati rice 25kg").closest("tr");
    expect(row.querySelector("[data-label='Accepted']")).toHaveTextContent("9 bag");
    expect(row.querySelector("[data-label='Rejected']")).toHaveTextContent("1 bag");
    expect(row.querySelector("[data-label='Remaining']")).toHaveTextContent("15 bag");
  });

  it("post warnings show on the line, never as errors", async () => {
    await mount();
    replyToPosts(
      postedGrn({
        warnings: [{ code: "SHORT_SHELF_LIFE", poLineId: 12, message: "Paneer has 2 days of shelf life left (minimum 3)" }],
      })
    );
    type("Received qty for Paneer", "5");
    type("Expiry date for Paneer", "2026-10-27");
    await postAndConfirm();

    await screen.findByText("Receipt posted");
    expect(screen.getByText("Paneer has 2 days of shelf life left (minimum 3)")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("expiry fields appear only for expiry-tracked items", async () => {
    await mount();
    expect(screen.getByLabelText("Expiry date for Paneer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Expiry date for Basmati rice 25kg")).toBeNull();
  });

  it("a fully received PO shows a calm state with a link to its GRNs", async () => {
    getReceiveContext.mockRejectedValue(
      apiError(409, "CONFLICT", { reason: "PO_NOT_RECEIVABLE", status: "GRN", receiptStatus: "received" },
        "Nothing is left to receive on this purchase order")
    );
    render(<ReceivePage poId="52" />);
    expect(await screen.findByText("Everything on this PO has been received")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View its GRNs" })).toHaveAttribute(
      "href", "/dashboard/buyer/inventory/grn?poId=52"
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("?dispatch= prefills received qty and the challan from the dispatch note", async () => {
    await mount(
      ctx({
        dispatches: [{
          id: 31, dispatchNumber: "DSP/46/2026-27/00003", hotelId: 46, deliveryId: 5, phaseNo: 1, status: "in_transit",
          challanNo: "CH-778", expectedDeliveryDate: "2026-10-25",
          lines: [{ poLineId: 11, productName: "Basmati rice 25kg", qty: 12 }],
        }],
      }),
      { dispatchId: "31" }
    );
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("12");
    expect(field("Challan no.")).toHaveValue("CH-778");
    expect(field("Against dispatch")).toHaveValue("31");
  });

  it("resumes the server draft and saves edits with updateGrn", async () => {
    await mount(
      ctx({
        draft: draftGrn({
          vendorChallanNo: "CH-1",
          lines: [{ poLineId: 11, receivedQty: 4, acceptedQty: 4, rejectedQty: 0, markOutDepartmentId: null }],
        }),
      })
    );
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("4");
    type("Received qty for Basmati rice 25kg", "6");
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(updateGrn).toHaveBeenCalledWith(
        900,
        expect.objectContaining({ post: false, vendorChallanNo: "CH-1", lines: [expect.objectContaining({ poLineId: 11, receivedQty: 6 })] })
      )
    );
    expect(createGrn).not.toHaveBeenCalled();
  });

  it("autosaves a dirty draft every 10 s", async () => {
    jest.useFakeTimers();
    try {
      await act(async () => {
        getReceiveContext.mockResolvedValue(ctx());
        render(<ReceivePage poId="52" />);
      });
      await act(async () => {});
      type("Received qty for Basmati rice 25kg", "3");
      expect(createGrn).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(10000); });
      expect(createGrn).toHaveBeenCalledWith(
        expect.objectContaining({ post: false, clientEventId: expect.any(String), lines: [expect.objectContaining({ receivedQty: 3 })] })
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("offers a camera-capture attachment input under Delivery documents", async () => {
    await mount();
    const input = screen.getByLabelText("Take photo");
    expect(input).toHaveAttribute("accept", "image/*,application/pdf");
    expect(input).toHaveAttribute("capture", "environment");
    expect(screen.getByText("Delivery documents")).toBeInTheDocument();
  });
});

// A scanner trigger pulled while a qty box still has focus: the keyboard-mode
// scanner "types" the code into that box a few ms a key and ends it with
// Enter. That is a scan of the next item, never a quantity.
describe("a scanner read while a qty box has focus", () => {
  const DAL = { ...RICE, poLineId: 14, productVariantId: 504, productName: "Toor dal", invItemId: 12, barcodes: [] };
  let now;
  let clock;
  beforeEach(() => {
    now = 40_000_000;
    clock = jest.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => clock.mockRestore());

  /** Keys land in the focused box (keydown, then its value changes). */
  const press = (input, key, gapMs) => {
    now += gapMs;
    fireEvent.keyDown(input, { key });
    fireEvent.change(input, { target: { value: `${input.value}${key}` } });
  };
  const personTypes = (input, text) => {
    input.focus();
    for (const key of text) press(input, key, 400);
    now += 1000;
  };
  const wedgeInto = (input, code) => {
    for (const key of code) press(input, key, 5);
    now += 5;
    return fireEvent.keyDown(input, { key: "Enter" });
  };
  const dalScan = () => resolveScan.mockResolvedValue({
    kind: "item", code: "8901234567897", gs1: null,
    item: { invItemId: 12, displayName: "Toor dal", stockUom: "bag", packFactor: 1, poLineId: 14 },
  });

  it("a burst into Received is a scan of the next item: the typed qty stays and the scan counts", async () => {
    await mount(ctx({ lines: [RICE, DAL, PANEER] }));
    dalScan();
    const rice = field("Received qty for Basmati rice 25kg");
    personTypes(rice, "5");
    expect(rice).toHaveValue("5");

    expect(wedgeInto(rice, "8901234567897")).toBe(false); // the scanner's Enter was taken
    expect(rice).toHaveValue("5");
    await waitFor(() => expect(field("Received qty for Toor dal")).toHaveValue("1"));
    expect(resolveScan).toHaveBeenCalledWith("8901234567897", "po:52");
    expect(rice).toHaveValue("5");

    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postCalls()[0].lines).toEqual([
      expect.objectContaining({ poLineId: 11, receivedQty: 5, acceptedQty: 5 }),
      expect.objectContaining({ poLineId: 14, receivedQty: 1, acceptedQty: 1 }),
    ]);
  });

  it("a burst into a kg line's qty can't turn 2.5 into 2.589…", async () => {
    await mount(ctx({ lines: [RICE, DAL, PANEER] }));
    dalScan();
    const paneer = field("Received qty for Paneer");
    personTypes(paneer, "2.5");
    wedgeInto(paneer, "8901234567897");
    expect(paneer).toHaveValue("2.5");
    await waitFor(() => expect(field("Received qty for Toor dal")).toHaveValue("1"));
    expect(paneer).toHaveValue("2.5");
  });

  it("Accepted and Rejected boxes put back what they held, too", async () => {
    await mount(ctx({ lines: [RICE, DAL, PANEER] }));
    dalScan();
    personTypes(field("Received qty for Basmati rice 25kg"), "6");

    const accepted = field("Accepted qty for Basmati rice 25kg");
    personTypes(accepted, "");
    wedgeInto(accepted, "8901234567897");
    expect(accepted).toHaveValue("6");
    expect(field("Rejected qty for Basmati rice 25kg")).toHaveValue("");

    const rejected = field("Rejected qty for Basmati rice 25kg");
    personTypes(rejected, "1");
    wedgeInto(rejected, "8901234567897");
    expect(rejected).toHaveValue("1");
    expect(accepted).toHaveValue("5");
    await waitFor(() => expect(field("Received qty for Toor dal")).toHaveValue("2"));
    expect(resolveScan).toHaveBeenCalledTimes(2);
  });

  it("a person's Enter finishes the edit; the box takes digits and one point, at most 13 characters", async () => {
    await mount(ctx({ lines: [RICE, DAL, PANEER] }));
    const rice = field("Received qty for Basmati rice 25kg");
    expect(rice).toHaveAttribute("maxLength", "13");
    personTypes(rice, "1,2a");
    expect(rice).toHaveValue("12");
    expect(rice).toHaveFocus();
    expect(fireEvent.keyDown(rice, { key: "Enter" })).toBe(false);
    expect(rice).not.toHaveFocus();
    expect(resolveScan).not.toHaveBeenCalled();
  });
});
