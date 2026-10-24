// Receive page: one receipt, one post. The session key, dropped replies,
// retries in the same session and after a reload, the device copy, blur
// saves, double taps, scans in a converted unit, and the draft / dispatch
// notices. services/inventory, the scanner and the IndexedDB device copy
// (draftStore) are mocked; the store survives an unmount like the real one.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/inventory/receive/[poId]", push: jest.fn(), replace: jest.fn() }),
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
    success: jest.fn(), error: jest.fn(), unlock: jest.fn(), installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false), setMuted: jest.fn(),
  },
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
// The scanner's props, to feed it resolved scans (ReceivePage.test.js drives the real one).
let mockScanner = null;
jest.mock("@/components/inventory/scan/ScanInput", () => ({
  __esModule: true,
  default: (props) => {
    mockScanner = props;
    return <div data-testid="stub-scanner" />;
  },
}));
let mockPerms = { loading: false, canUpdate: true };
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canApprove: true, hasPermission: () => true, ...mockPerms }),
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
jest.mock("../draftStore", () => {
  const store = new Map();
  const copy = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return {
    __esModule: true,
    __store: store,
    grnDraftKey: (poId, hotelId) => `grn-draft:${poId}:${hotelId}`,
    loadLocalDraft: jest.fn(async (key) => copy(store.get(key))),
    saveLocalDraft: jest.fn(async (key, value) => {
      store.set(key, copy(value));
      return null;
    }),
    clearLocalDraft: jest.fn(async (key) => {
      store.delete(key);
      return null;
    }),
  };
});

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getReceiveContext, createGrn, updateGrn, postGrn, discardGrn, getGrn } from "@/services/inventory";
import * as draftStore from "../draftStore";
import ReceivePage from "../ReceivePage";

const store = draftStore.__store;
const KEY = "grn-draft:52:46";
const K1 = "11111111-1111-4111-8111-111111111111";

const RICE = {
  poLineId: 11, productVariantId: 501, productName: "Basmati rice 25kg", unit: "bag",
  invItemId: 9, stockUom: "bag", uomFactor: 1, needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 24, openAtHotel: 24, maxAcceptable: 24, defaultMarkOutOnArrival: false, costPerPoUnit: 1800, barcodes: [],
};
const SOAP_BOX = {
  poLineId: 13, productVariantId: 503, productName: "Dish soap", unit: "box",
  invItemId: 11, stockUom: "piece", uomFactor: 12, needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 10, openAtHotel: 10, maxAcceptable: 10, defaultMarkOutOnArrival: false, costPerPoUnit: 640, barcodes: [],
};
const SOAP_UNSET = { ...SOAP_BOX, uomFactor: null, needsUomFactor: true };

const ctx = (over = {}) => ({
  po: { id: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms", isCallOff: false, departmentId: 7 },
  hotel: { id: 46, name: "Orchid Mumbai" },
  hotelChoices: [{ id: 46, name: "Orchid Mumbai" }],
  lines: [RICE, SOAP_BOX],
  dispatches: [],
  departments: [{ id: 7, title: "Kitchen" }],
  itemSuggestions: {},
  draft: null,
  ...over,
});

const draftGrn = (over = {}) => ({
  id: 900, grnNumber: null, status: "draft", docType: "RECEIPT", poId: 52, hotelId: 46,
  clientEventId: K1, lines: [], attachments: [], updatedAt: "2026-10-24T05:00:00.000Z", ...over,
});
/** A fresh post: the server adds warnings[]. */
const postedGrn = (over = {}) => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", status: "posted", docType: "RECEIPT", poId: 52, hotelId: 46,
  postedAt: new Date().toISOString(), lines: [], attachments: [], warnings: [], ...over,
});
/** A replayed clientEventId: the original GRN, no warnings key. */
const replayedGrn = (over = {}) => {
  const g = postedGrn(over);
  delete g.warnings;
  return g;
};

const networkError = () => {
  const err = new Error("Network Error");
  err.isAxiosError = true;
  err.code = "ERR_NETWORK";
  err.request = {};
  return err;
};

// POST /grn: post:false saves a draft keyed by the request; post:true answers
// from `postReplies` (Error → reject, function → called at reply time).
let postReplies = [];
const replyToPosts = (...replies) => postReplies.push(...replies);
const postCalls = () => createGrn.mock.calls.map((c) => c[0]).filter((input) => input.post === true);
const draftCalls = () => createGrn.mock.calls.map((c) => c[0]).filter((input) => input.post === false);
const answerPosts = () =>
  createGrn.mockImplementation((input) => {
    if (!input.post) return Promise.resolve(draftGrn({ clientEventId: input.clientEventId }));
    let next = postReplies.length ? postReplies.shift() : postedGrn();
    if (typeof next === "function") next = next(input);
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });

const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

const mount = async (context = ctx(), props = {}) => {
  getReceiveContext.mockResolvedValue(context);
  const view = render(<ReceivePage poId="52" {...props} />);
  await screen.findByText(context.lines[0].productName);
  return view;
};

const postAndConfirm = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Post receipt" }));
  const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm and post" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Post this receipt?" })).toBeNull());
};

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  postReplies = [];
  mockScanner = null;
  mockPerms = { loading: false, canUpdate: true };
  answerPosts();
  updateGrn.mockImplementation((id, input) => Promise.resolve(draftGrn({ id, clientEventId: input.clientEventId })));
});

describe("posting once per session key", () => {
  it("a reply lost after the draft posted: the next day's reload says so, and today's receipt posts once", async () => {
    // Day 1: save a draft, post it; the post lands but the reply is lost.
    replyToPosts(networkError());
    const day1 = await mount();
    type("Received qty for Basmati rice 25kg", "6");
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(store.get(KEY)).toMatchObject({ draftId: 900 }));
    await postAndConfirm();
    expect(await screen.findByRole("button", { name: /Retry posting/ })).toBeInTheDocument();
    const lostKey = postCalls()[0].clientEventId;
    expect(lostKey).toBe(draftCalls()[0].clientEventId); // the post carries the draft's key
    expect(store.get(KEY)).toMatchObject({ draftId: 900, sessionKey: lostKey });
    expect(screen.queryByText("Receipt posted")).toBeNull();
    day1.unmount();

    // Day 2: the server has no draft any more; draft 900 is GRN …00012.
    createGrn.mockClear();
    getGrn.mockResolvedValue(replayedGrn({ id: 900, postedAt: "2026-10-24T12:00:00.000Z" }));
    replyToPosts(postedGrn({ id: 901, grnNumber: "GRN/46/2026-27/00013" }));
    await mount(ctx({ draft: null }));

    expect(
      await screen.findByText("Your earlier receipt for this order was already posted (GRN/46/2026-27/00012).")
    ).toBeInTheDocument();
    expect(getGrn).toHaveBeenCalledWith(900);
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue(""); // yesterday's qty is in stock already
    expect(store.has(KEY)).toBe(false);

    type("Received qty for Basmati rice 25kg", "4");
    await postAndConfirm();
    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    expect(screen.getByText("GRN/46/2026-27/00013")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(1);
    expect(postCalls()[0].clientEventId).not.toBe(lostKey);
    expect(postCalls()[0].lines).toEqual([expect.objectContaining({ poLineId: 11, receivedQty: 4 })]);
    expect(updateGrn).not.toHaveBeenCalled();
    expect(postGrn).not.toHaveBeenCalled();
  });

  it("a key restored from the device that was posted earlier: no false success, entries kept, a new key posts", async () => {
    // Yesterday's one-request post landed unheard before any draft existed.
    store.set(KEY, { savedAt: Date.now(), draftId: null, sessionKey: K1, header: {}, entries: { 11: { received: "6" } } });
    replyToPosts(
      replayedGrn({ id: 900, postedAt: "2026-10-24T09:00:00.000Z" }),
      postedGrn({ id: 901, grnNumber: "GRN/46/2026-27/00013" })
    );
    await mount();
    expect(await screen.findByText("Restored the entries you had not saved yet on this device.")).toBeInTheDocument();
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("6");

    type("Received qty for Basmati rice 25kg", "8"); // today's delivery
    await postAndConfirm();
    expect(await screen.findByText(/This receipt was already posted as GRN\/46\/2026-27\/00012/)).toBeInTheDocument();
    expect(screen.queryByText("Receipt posted")).toBeNull();
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("8");
    expect(postCalls()[0].clientEventId).toBe(K1);

    await postAndConfirm();
    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    expect(screen.getByText("GRN/46/2026-27/00013")).toBeInTheDocument();
    const second = postCalls()[1];
    expect(second.clientEventId).not.toBe(K1);
    expect(second.lines).toEqual([expect.objectContaining({ poLineId: 11, receivedQty: 8 })]);
  });

  it("retry after a dropped reply in the same session posts once and shows that GRN", async () => {
    await mount(
      ctx({ draft: draftGrn({ lines: [{ poLineId: 11, receivedQty: 5, acceptedQty: 5, rejectedQty: 0 }] }) })
    );
    replyToPosts(networkError(), () => replayedGrn({ grnNumber: "GRN/46/2026-27/00012" }));
    await postAndConfirm();

    expect(await screen.findByRole("alert")).toHaveTextContent("The connection dropped before the server answered");
    fireEvent.click(screen.getByRole("button", { name: /Retry posting/ }));

    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    expect(screen.getByText("GRN/46/2026-27/00012")).toBeInTheDocument();
    // The same key both times (the draft's): the server posted it once and replayed it.
    expect(postCalls().map((c) => c.clientEventId)).toEqual([K1, K1]);
    // No "save the draft first": that PUT would 409 once the post had landed.
    expect(updateGrn).not.toHaveBeenCalled();
    expect(postGrn).not.toHaveBeenCalled();
  });

  it("edits after a dropped reply: the replay is reported, never shown as this receipt", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "5");
    replyToPosts(networkError(), () => replayedGrn({ grnNumber: "GRN/46/2026-27/00012" }));
    await postAndConfirm();
    await screen.findByRole("button", { name: /Retry posting/ });

    type("Received qty for Basmati rice 25kg", "7"); // changed after the lost reply
    await postAndConfirm();
    expect(await screen.findByText(/This receipt was already posted as GRN\/46\/2026-27\/00012/)).toBeInTheDocument();
    expect(screen.queryByText("Receipt posted")).toBeNull();
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("7");
    const [lost, retried] = postCalls();
    expect(retried.clientEventId).toBe(lost.clientEventId);
  });

  it("a double tap on Post and on Confirm posts once", async () => {
    await mount();
    let answer;
    createGrn.mockImplementation((input) =>
      input.post ? new Promise((resolve) => { answer = resolve; }) : Promise.resolve(draftGrn())
    );
    type("Received qty for Basmati rice 25kg", "3");
    const post = screen.getByRole("button", { name: "Post receipt" });
    fireEvent.click(post);
    fireEvent.click(post);
    const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
    const confirm = within(dialog).getByRole("button", { name: "Confirm and post" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(postCalls()).toHaveLength(1));
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);

    await act(async () => answer(postedGrn()));
    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(1);
    expect(screen.queryByRole("dialog", { name: "Post this receipt?" })).toBeNull();
  });
});

describe("the device copy and background saves", () => {
  it("restores unsaved entries, posts them with the restored key, then clears the copy", async () => {
    store.set(KEY, {
      savedAt: Date.now(), draftId: null, sessionKey: K1, header: { vendorChallanNo: "CH-9" }, entries: { 11: { received: "7" } },
    });
    await mount();
    expect(await screen.findByText("Restored the entries you had not saved yet on this device.")).toBeInTheDocument();
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("7");
    expect(field("Challan no.")).toHaveValue("CH-9");

    await postAndConfirm();
    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    // The earlier create's outcome was unknown, so the same key goes out.
    expect(postCalls()[0].clientEventId).toBe(K1);
    expect(draftStore.clearLocalDraft).toHaveBeenCalledWith(KEY);
    expect(store.has(KEY)).toBe(false);
  });

  it("a clean copy of the server draft doesn't count as unsaved entries", async () => {
    store.set(KEY, { savedAt: Date.now(), clean: true, draftId: 900, sessionKey: K1, header: {}, entries: { 11: { received: "1" } } });
    await mount(ctx({ draft: draftGrn({ lines: [{ poLineId: 11, receivedQty: 4, acceptedQty: 4, rejectedQty: 0 }] }) }));
    await waitFor(() => expect(draftStore.loadLocalDraft).toHaveBeenCalled());
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("4");
    expect(screen.queryByText(/Restored the entries/)).toBeNull();
  });

  it("saves the draft shortly after focus leaves a field", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "3");
    fireEvent.focusOut(field("Received qty for Basmati rice 25kg"));
    await waitFor(
      () => expect(draftCalls()).toEqual([
        expect.objectContaining({ post: false, clientEventId: expect.any(String), lines: [expect.objectContaining({ receivedQty: 3 })] }),
      ]),
      { timeout: 2000 }
    );
    expect(await screen.findByText("Draft saved")).toBeInTheDocument();
  });

  it("Discard draft deletes the server draft and starts a new receipt", async () => {
    discardGrn.mockResolvedValue({ deleted: true });
    await mount(ctx({ draft: draftGrn({ lines: [{ poLineId: 11, receivedQty: 4, acceptedQty: 4, rejectedQty: 0 }] }) }));
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("4");

    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    const dialog = await screen.findByRole("dialog", { name: "Discard this draft?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Discard draft" }));

    expect(await screen.findByText("Draft discarded.")).toBeInTheDocument();
    expect(discardGrn).toHaveBeenCalledWith(900);
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Discard draft" })).toBeNull();

    type("Received qty for Basmati rice 25kg", "2");
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(draftCalls()).toHaveLength(1));
    expect(draftCalls()[0].clientEventId).not.toBe(K1);
  });
});

describe("scanning in a converted unit", () => {
  const pieceScan = {
    kind: "item", code: "SOAP-PC", gs1: null,
    item: { invItemId: 11, displayName: "Dish soap", stockUom: "piece", packFactor: 1, poLineId: 13 },
  };

  it("twelve single-piece scans of a 12-piece box make exactly 1 box", async () => {
    await mount();
    expect(mockScanner.context).toBe("po:52");
    for (let i = 0; i < 6; i++) act(() => mockScanner.onResolved(pieceScan));
    expect(field("Received qty for Dish soap")).toHaveValue("0.5");
    for (let i = 0; i < 6; i++) act(() => mockScanner.onResolved(pieceScan));
    expect(field("Received qty for Dish soap")).toHaveValue("1");

    act(() => mockScanner.onResolved({ ...pieceScan, item: { ...pieceScan.item, packFactor: 6 } }));
    expect(field("Received qty for Dish soap")).toHaveValue("1.5");

    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postCalls()[0].lines).toEqual([expect.objectContaining({ poLineId: 13, receivedQty: 1.5 })]);
  });

  it("typing a qty restarts the count from what was typed", async () => {
    await mount();
    for (let i = 0; i < 5; i++) act(() => mockScanner.onResolved(pieceScan));
    expect(field("Received qty for Dish soap")).toHaveValue("0.4167");
    type("Received qty for Dish soap", "2");
    for (let i = 0; i < 12; i++) act(() => mockScanner.onResolved(pieceScan));
    expect(field("Received qty for Dish soap")).toHaveValue("3");
  });
});

describe("notices instead of silent skips", () => {
  const dispatch = {
    id: 31, dispatchNumber: "DSP/46/2026-27/00003", hotelId: 46, deliveryId: 5, phaseNo: 1, status: "in_transit",
    challanNo: "CH-778", expectedDeliveryDate: "2026-10-25", lines: [{ poLineId: 11, productName: "Basmati rice 25kg", qty: 12 }],
  };

  it("a saved draft wins over ?dispatch= and says so", async () => {
    await mount(
      ctx({ dispatches: [dispatch], draft: draftGrn({ lines: [{ poLineId: 11, receivedQty: 4, acceptedQty: 4, rejectedQty: 0 }] }) }),
      { dispatchId: "31" }
    );
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("4");
    expect(screen.getByText(/You have a saved draft at Orchid Mumbai, so DSP\/46\/2026-27\/00003 wasn't filled in/)).toBeInTheDocument();
  });

  it("a dispatch note for another hotel fills nothing and says so", async () => {
    await mount(ctx({ dispatches: [] }), { dispatchId: "31" });
    expect(field("Received qty for Basmati rice 25kg")).toHaveValue("");
    expect(screen.getByText(/That dispatch note isn't on its way to Orchid Mumbai/)).toBeInTheDocument();
  });

  it("nothing that needs inventory.update shows while permissions load", async () => {
    mockPerms = { loading: true, canUpdate: false };
    await mount(ctx({ lines: [RICE, SOAP_UNSET] }));
    expect(screen.queryByRole("button", { name: /Set unit conversion/ })).toBeNull();
    expect(screen.getByText("No unit conversion yet")).toBeInTheDocument();
  });
});
