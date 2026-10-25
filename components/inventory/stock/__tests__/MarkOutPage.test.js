// Mark out / return to stock: one scan session per hotel, kept on the device
// (IndexedDB, fake-indexeddb here) until it is posted. services/inventory and
// the department list are mocked; ScanInput is the real one (camera and beeps
// stubbed), so a typed code goes through the same pipeline a scanner would.

// jsdom has no structuredClone, which fake-indexeddb needs for every write;
// Node's v8 serializer is the same structured-clone algorithm.
const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
require("fake-indexeddb/auto");

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, pathname: "/dashboard/buyer/inventory/out", push: mockPush, replace: jest.fn() }),
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
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => mockMobile }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: mockCanCreate, canUpdate: true, canApprove: true, loading: false,
    error: mockPermError, refetch: mockRefetch, hasPermission: () => true,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  getStockItem: jest.fn(),
  postOut: jest.fn(),
  resolveScan: jest.fn(),
}));
jest.mock("@/services/rbac", () => ({ __esModule: true, getDepartments: jest.fn() }));
// The outbox as D3 will expose it (pending count, failed items, outcomes),
// driven from the tests through a small store.
jest.mock("@/components/inventory/offline/outbox", () => {
  const { useSyncExternalStore } = require("react");
  const store = { pending: 0, failed: [], listeners: new Set(), outcomes: new Set() };
  const emit = () => store.listeners.forEach((l) => l());
  const subscribe = (l) => {
    store.listeners.add(l);
    return () => store.listeners.delete(l);
  };
  return {
    __esModule: true,
    submitOrQueue: jest.fn(),
    usePendingCount: () => useSyncExternalStore(subscribe, () => store.pending),
    useFailedItems: () => useSyncExternalStore(subscribe, () => store.failed),
    dismissFailed: jest.fn((id) => {
      store.failed = store.failed.filter((f) => f.id !== id);
      emit();
    }),
    onOutboxOutcome: (listener) => {
      store.outcomes.add(listener);
      return () => store.outcomes.delete(listener);
    },
    __store: store,
    __emit: emit,
  };
});

let mockQuery = {};
let mockMobile = false;
let mockCanCreate = true;
let mockPermError = null;
const mockRefetch = jest.fn();
const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getStock, getStockItem, postOut, resolveScan } from "@/services/inventory";
import { getDepartments } from "@/services/rbac";
import * as outbox from "@/components/inventory/offline/outbox";
import MarkOutPage from "../MarkOutPage";
import { loadOutSession, clearOutSession, saveOutSession } from "../outSession";

const { submitOrQueue } = outbox;
const setOutbox = (patch) =>
  act(() => {
    Object.assign(outbox.__store, patch);
    outbox.__emit();
  });
const emitOutcome = (event) =>
  act(() => {
    outbox.__store.outcomes.forEach((l) => l(event));
  });

const HOTELS = [{ id: 46, name: "Orchid Mumbai" }];
const itemScan = (invItemId, displayName, stockUom, packFactor = 1, extra = {}) => ({
  kind: "item",
  code: `C-${invItemId}`,
  gs1: null,
  item: { invItemId, displayName, stockUom, packFactor, poLineId: null, stockedAtHotel: true, ...extra },
});
const SCANS = {
  "RICE-6PK": itemScan(9, "Basmati rice", "bag", 6),
  SOAP: itemScan(11, "Dish soap", "piece", 1),
  PANEER: itemScan(10, "Paneer", "kg", 1),
  "PANEER-2.5": itemScan(10, "Paneer", "kg", 2.5),
  NEWOIL: itemScan(12, "Olive oil", "bottle", 1, { stockedAtHotel: false }),
  "PO-52": { kind: "po", code: "PO-52", gs1: null, item: null, poId: 52 },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const apiError = (status, code, details, message = "Refused") => {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { status: 0, message, code, details } };
  return err;
};

const outDoc = (over = {}) => ({
  id: 301,
  outNumber: "OUT/46/2026-27/00007",
  docType: "OUT",
  hotelId: 46,
  hotelName: "Orchid Mumbai",
  departmentId: 7,
  departmentName: "Kitchen",
  requestedByName: null,
  lines: [{ id: 1, invItemId: 9, displayName: "Basmati rice", itemCode: "RICE", qty: 6, stockUom: "bag", unitCost: 100, value: 600 }],
  totalValue: 600,
  postedAt: "2026-10-25T05:00:00.000Z",
  postedByName: "Asha Menon",
  ...over,
});

const scan = async (code) => {
  const box = await screen.findByLabelText("Scan or type a code");
  // the box takes reads once the device copy of the session has loaded
  await waitFor(() => expect(box).toBeEnabled());
  fireEvent.change(box, { target: { value: code } });
  fireEvent.keyDown(box, { key: "Enter" });
};
const qtyOf = (name) => screen.findByLabelText(`Qty of ${name}`);
const lineOf = (name) => screen.getByRole("listitem", { name });
const chooseDepartment = async (value) => {
  await screen.findByRole("option", { name: "Kitchen" });
  fireEvent.change(screen.getByLabelText("Department"), { target: { value } });
};
const postButton = (name = "Post mark out") => screen.getByRole("button", { name });

const HOTELS2 = [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }];
const twoHotels = () =>
  getStock.mockResolvedValue({
    hotelId: 46, stockStartedAt: null, hotels: HOTELS2, totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
  });

/** The toast content last shown, rendered on its own so its buttons can be pressed. */
const lastToast = () => {
  const calls = toast.mock.calls;
  const { container } = render(calls[calls.length - 1][0]);
  return within(container);
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockQuery = {};
  mockMobile = false;
  mockCanCreate = true;
  mockPermError = null;
  outbox.__store.pending = 0;
  outbox.__store.failed = [];
  outbox.__store.outcomes.clear();
  getStockItem.mockResolvedValue(undefined);
  getStock.mockResolvedValue({
    hotelId: 46, stockStartedAt: "2026-10-01T00:00:00.000Z", hotels: HOTELS,
    totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
  });
  getDepartments.mockResolvedValue({ status: true, data: [{ id: 7, title: "Kitchen" }, { id: 8, title: "Housekeeping" }] });
  resolveScan.mockImplementation((code) =>
    Promise.resolve(SCANS[code] || { kind: "unknown", code, gs1: null, item: null })
  );
  submitOrQueue.mockImplementation(async ({ send, payload }) => ({ queued: false, result: await send(payload) }));
  await clearOutSession(46);
  await clearOutSession(47);
});

describe("MarkOutPage scan session", () => {
  test("scan same item twice adds pack factor", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    expect(await qtyOf("Basmati rice")).toHaveValue("6");
    expect(resolveScan).toHaveBeenCalledWith("RICE-6PK", "hotel:46");

    await scan("RICE-6PK");
    await waitFor(() => expect(screen.getByLabelText("Qty of Basmati rice")).toHaveValue("12"));
    // one line, not two
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    // the scan toast offers Undo
    expect(toast).toHaveBeenCalled();
  });

  test("Undo takes the last scan back off the line", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await scan("RICE-6PK");
    await waitFor(() => expect(screen.getByLabelText("Qty of Basmati rice")).toHaveValue("12"));

    fireEvent.click(screen.getByRole("button", { name: "Undo last scan" }));
    expect(screen.getByLabelText("Qty of Basmati rice")).toHaveValue("6");
    fireEvent.click(screen.getByRole("button", { name: "Undo last scan" }));
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
  });

  test("a weighed item opens the qty pad", async () => {
    render(<MarkOutPage />);
    await scan("PANEER");
    const pad = await screen.findByRole("dialog");
    fireEvent.change(within(pad).getByLabelText("Qty in kg"), { target: { value: "2.5" } });
    fireEvent.click(within(pad).getByRole("button", { name: "Add 2.5 kg" }));
    expect(await qtyOf("Paneer")).toHaveValue("2.5");
  });

  test("an item not stocked at the hotel is not added", async () => {
    render(<MarkOutPage />);
    await scan("NEWOIL");
    await waitFor(() => expect(toast.warn).toHaveBeenCalledWith(expect.stringMatching(/Olive oil isn't stocked at Orchid Mumbai/)));
    expect(screen.queryByLabelText("Qty of Olive oil")).toBeNull();
  });

  test("mark out requires department", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");

    fireEvent.click(postButton());
    expect(await screen.findByText("Choose the department before posting.")).toBeInTheDocument();
    expect(screen.getByLabelText("Department")).toHaveAttribute("aria-invalid", "true");
    expect(postOut).not.toHaveBeenCalled();

    await chooseDepartment("7");
    fireEvent.change(screen.getByLabelText("Requested by"), { target: { value: "Chef Rao" } });
    postOut.mockResolvedValue(outDoc());
    fireEvent.click(postButton());

    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    const body = postOut.mock.calls[0][0];
    expect(body).toMatchObject({
      hotelId: 46, docType: "OUT", departmentId: 7, requestedByName: "Chef Rao", lines: [{ invItemId: 9, qty: 6 }],
    });
    expect(body.clientEventId).toMatch(UUID);
    expect(submitOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "out_post", clientEventId: body.clientEventId, payload: body })
    );
    expect(await screen.findByText("OUT/46/2026-27/00007")).toBeInTheDocument();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
  });

  test("NEGATIVE_STOCK highlights short lines", async () => {
    render(<MarkOutPage />);
    await scan("SOAP");
    await qtyOf("Dish soap");
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");

    postOut.mockRejectedValue(
      apiError(409, "NEGATIVE_STOCK", {
        hotelId: 46, invItemId: 9, itemName: "Basmati rice", available: 4, requested: 6,
        lines: [{ index: 0, hotelId: 46, invItemId: 9, sourceLineId: null, itemName: "Basmati rice", available: 4, requested: 6 }],
      }, "Not enough stock")
    );
    fireEvent.click(postButton());

    const rice = await waitFor(() => lineOf("Basmati rice"));
    expect(await within(rice).findByText("Only 4 bag in stock; this session marks out 6.")).toBeInTheDocument();
    expect(within(rice).getByLabelText("Qty of Basmati rice")).toHaveAttribute("aria-invalid", "true");
    const soap = lineOf("Dish soap");
    expect(within(soap).queryByText(/in stock/)).toBeNull();
    expect(within(soap).getByLabelText("Qty of Dish soap")).not.toHaveAttribute("aria-invalid", "true");
    // the session stays, ready to fix and post again
    expect(screen.getByLabelText("Qty of Basmati rice")).toHaveValue("6");
  });

  test("a frozen hotel names the open count", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    postOut.mockRejectedValue(apiError(409, "LOCKED", { countId: 5, countNumber: "CNT/46/2026-27/00002" }));
    fireEvent.click(postButton());
    expect(
      await screen.findByText(/Stock is frozen while count CNT\/46\/2026-27\/00002 is open: marking out and returns are refused/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the count" })).toHaveAttribute("href", "/dashboard/buyer/inventory/counts/5");
  });

  test("a return over the department's issued qty shows the cap on the line", async () => {
    render(<MarkOutPage />);
    fireEvent.click(await screen.findByRole("radio", { name: "Return to stock" }));
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    postOut.mockRejectedValue(
      apiError(400, "VALIDATION", { field: "lines", index: 0, invItemId: 9, maxReturnable: 4 },
        "Only 4 bag of Basmati rice was marked out to Kitchen here")
    );
    fireEvent.click(postButton("Post return"));

    const rice = await waitFor(() => lineOf("Basmati rice"));
    expect(await within(rice).findByText("Only 4 bag of Basmati rice was marked out to Kitchen here")).toBeInTheDocument();
    expect(postOut.mock.calls[0][0]).toMatchObject({ docType: "RETURN" });
    fireEvent.click(within(rice).getByRole("button", { name: "Return 4 instead" }));
    expect(screen.getByLabelText("Qty of Basmati rice")).toHaveValue("4");
  });

  test("a replayed session counts as posted", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    postOut.mockResolvedValue({ ...outDoc(), replayed: true, no_op: true });
    fireEvent.click(postButton());
    expect(await screen.findByText("OUT/46/2026-27/00007")).toBeInTheDocument();
    expect(screen.getByText(/already recorded/i)).toBeInTheDocument();
  });

  test("a dropped connection locks the lines under the same key: Post again or Discard", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    const dropped = new Error("Network Error");
    dropped.isAxiosError = true;
    postOut.mockRejectedValueOnce(dropped).mockResolvedValueOnce(outDoc());
    fireEvent.click(postButton());
    expect(await screen.findByText(/connection dropped/i)).toBeInTheDocument();

    // locked: nothing can change what was (maybe) recorded
    expect(screen.getByLabelText("Qty of Basmati rice")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Basmati rice" })).toBeDisabled();
    expect(screen.getByLabelText("Department")).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Return to stock" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Post mark out" })).toBeNull();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    const saved = await waitFor(async () => {
      const copy = await loadOutSession(46);
      expect(copy).toEqual(expect.objectContaining({ status: "uncertain" }));
      return copy;
    });
    expect(saved.sentPayload.clientEventId).toBe(postOut.mock.calls[0][0].clientEventId);

    fireEvent.click(screen.getByRole("button", { name: "Post again" }));
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(2));
    expect(postOut.mock.calls[1][0]).toEqual(postOut.mock.calls[0][0]);
    expect(await screen.findByText("OUT/46/2026-27/00007")).toBeInTheDocument();
  });

  test("a 503 is uncertain too; the locked session survives a reload and Discard clears it", async () => {
    const first = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    postOut.mockRejectedValueOnce(apiError(503, null, {}, "Service Unavailable"));
    fireEvent.click(postButton());
    expect(await screen.findByText(/server had a problem/i)).toBeInTheDocument();
    await waitFor(async () => expect((await loadOutSession(46))?.status).toBe("uncertain"));
    first.unmount();

    render(<MarkOutPage />);
    expect(await screen.findByRole("button", { name: "Post again" })).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull());
    expect(postButton()).toBeInTheDocument();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
    expect(postOut).toHaveBeenCalledTimes(1);
  });

  test("a queued post keeps the session on the device, read-only, until it syncs", async () => {
    submitOrQueue.mockResolvedValue({ queued: true });
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    expect(await screen.findByText(/Saved on this device/)).toBeInTheDocument();
    expect(screen.getByText("Waiting to sync. If it's refused you'll see it here and can fix it.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    expect(within(screen.getByRole("list", { name: "Waiting items" })).getByText("Basmati rice")).toBeInTheDocument();

    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    const saved = await waitFor(async () => {
      const copy = await loadOutSession(46);
      expect(copy).toEqual(expect.objectContaining({ status: "queued", queuedAs: key }));
      return copy;
    });
    expect(saved.lines).toEqual([expect.objectContaining({ invItemId: 9, qty: "6" })]);

    // the outbox reports it sent: the device copy goes, the result shows
    emitOutcome({ clientEventId: key, kind: "out_post", outcome: "sent", result: outDoc() });
    expect(await screen.findByText("OUT/46/2026-27/00007")).toBeInTheDocument();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
  });

  test("a queued session refused on sync reopens editable with the refusal", async () => {
    submitOrQueue.mockResolvedValue({ queued: true });
    const first = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByText(/Waiting to sync/);
    const call = submitOrQueue.mock.calls[0][0];
    await waitFor(async () => expect((await loadOutSession(46))?.status).toBe("queued"));
    first.unmount();

    // reopened later: the outbox now holds a refusal for it
    outbox.__store.pending = 0;
    outbox.__store.failed = [{
      id: "f1", kind: "out_post", clientEventId: call.clientEventId, payload: call.payload,
      error: { httpStatus: 409, code: "NEGATIVE_STOCK", message: "Not enough stock",
        details: { lines: [{ index: 0, invItemId: 9, available: 4, requested: 6 }] } },
    }];
    render(<MarkOutPage />);
    expect(await screen.findByText(/This session was refused when it synced/)).toBeInTheDocument();
    const rice = lineOf("Basmati rice");
    expect(within(rice).getByText("Only 4 bag in stock; this session marks out 6.")).toBeInTheDocument();
    expect(within(rice).getByLabelText("Qty of Basmati rice")).toBeEnabled();
    expect(outbox.dismissFailed).toHaveBeenCalledWith("f1");
    await waitFor(async () => expect((await loadOutSession(46))?.status).toBe("open"));
  });

  test("with no outcome event, a drained queue counts as synced", async () => {
    submitOrQueue.mockImplementation(async () => {
      outbox.__store.pending = 1;
      return { queued: true };
    });
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByText(/Waiting to sync/);
    setOutbox({ pending: 0 });
    expect(await screen.findByText(/has synced/, {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
  });

  test("a second tap on Post while the first is in flight sends nothing", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    let release;
    postOut.mockReturnValue(new Promise((res) => { release = res; }));
    fireEvent.click(postButton());
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postButton()).toBeDisabled();
    // the scan toast's Undo is locked while the post is in flight
    expect(lastToast().getByRole("button", { name: "Undo" })).toBeDisabled();
    await act(async () => release(outDoc()));
    expect(await screen.findByText("OUT/46/2026-27/00007")).toBeInTheDocument();
    expect(postOut).toHaveBeenCalledTimes(1);
  });

  test("a replay whose lines differ from this session is flagged", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    postOut.mockResolvedValue({ ...outDoc({ lines: [{ id: 1, invItemId: 11, displayName: "Dish soap", qty: 2, stockUom: "piece" }] }), replayed: true });
    fireEvent.click(postButton());
    expect(await screen.findByText(/with different lines from the ones on this device/)).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Recorded items" })).getByText("Dish soap")).toBeInTheDocument();
  });

  test("a CONFLICT on the session key starts a new key", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    postOut
      .mockRejectedValueOnce(apiError(409, "CONFLICT", { field: "clientEventId" }, "That session key was used at another hotel."))
      .mockResolvedValueOnce(outDoc());
    fireEvent.click(postButton());
    expect(await screen.findByText(/Post again to record it as a new session/)).toBeInTheDocument();
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(2));
    expect(postOut.mock.calls[1][0].clientEventId).toMatch(UUID);
    expect(postOut.mock.calls[1][0].clientEventId).not.toBe(postOut.mock.calls[0][0].clientEventId);
  });

  test("a department refused by the server shows on the field", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("8");
    postOut.mockRejectedValue(apiError(400, "VALIDATION", { field: "departmentId" }, "That department is inactive"));
    fireEvent.click(postButton());
    const dept = screen.getByLabelText("Department");
    await waitFor(() => expect(dept).toHaveAttribute("aria-invalid", "true"));
    expect(dept).toHaveAccessibleDescription("That department is inactive");
    expect(dept).toBeRequired();
  });

  test("Remove takes a line off, and the toast's Undo puts it back in place", async () => {
    render(<MarkOutPage />);
    await scan("SOAP");
    await qtyOf("Dish soap");
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    fireEvent.click(screen.getByRole("button", { name: "Remove Basmati rice" }));
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    fireEvent.click(lastToast().getByRole("button", { name: "Undo" }));
    expect(await qtyOf("Basmati rice")).toHaveValue("6");
    const names = within(screen.getByRole("list", { name: "Items in this session" }))
      .getAllByRole("listitem").map((li) => li.getAttribute("aria-label"));
    expect(names).toEqual(["Basmati rice", "Dish soap"]);
  });

  test("a typed qty keeps 4 decimals and 8 whole digits, and posts what it shows", async () => {
    render(<MarkOutPage />);
    await scan("SOAP");
    const qty = await qtyOf("Dish soap");
    expect(qty).toHaveAttribute("maxLength", "13");
    fireEvent.change(qty, { target: { value: "1.23456" } });
    expect(qty).toHaveValue("1.2345");
    fireEvent.change(qty, { target: { value: "8901234567890" } });
    expect(qty).toHaveValue("89012345");
    fireEvent.change(qty, { target: { value: "2.50009" } });
    expect(qty).toHaveValue("2.5000");
    // Enter (a wedge scanner's terminator) ends the edit
    qty.focus();
    fireEvent.keyDown(qty, { key: "Enter" });
    expect(qty).not.toHaveFocus();
    await chooseDepartment("7");
    postOut.mockResolvedValue(outDoc());
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0].lines).toEqual([{ invItemId: 11, qty: 2.5 }]);
  });

  test("a qty far above what is on hand needs a confirm before posting", async () => {
    getStockItem.mockResolvedValue({ item: { id: 11 }, balance: { qty: 4 } });
    render(<MarkOutPage />);
    await scan("SOAP");
    const rice = await waitFor(() => {
      const line = lineOf("Dish soap");
      expect(within(line).getByText("in stock", { exact: false })).toBeInTheDocument();
      return line;
    });
    expect(getStockItem).toHaveBeenCalledWith(46, 11);
    fireEvent.change(within(rice).getByLabelText("Qty of Dish soap"), { target: { value: "500" } });
    expect(within(rice).getByText(/500 piece is far more than the 4 in stock/)).toBeInTheDocument();
    expect(within(rice).getByLabelText("Qty of Dish soap")).toHaveAccessibleDescription(/far more than the 4 in stock/);
    await chooseDepartment("7");
    fireEvent.click(postButton());
    expect(await screen.findByText("Check the highlighted qty, then post.")).toBeInTheDocument();
    expect(postOut).not.toHaveBeenCalled();

    fireEvent.click(within(rice).getByRole("button", { name: "Yes, 500 is right" }));
    postOut.mockResolvedValue(outDoc());
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0].lines).toEqual([{ invItemId: 11, qty: 500 }]);
  });

  test("the qty pad for a weighed item opens at the scanned pack and speaks mark-out", async () => {
    render(<MarkOutPage />);
    await scan("PANEER-2.5");
    const pad = await screen.findByRole("dialog");
    expect(within(pad).getByText("Qty to mark out")).toBeInTheDocument();
    expect(within(pad).getByLabelText("Qty in kg")).toHaveValue("2.5");
    expect(within(pad).queryByText(/Received so far/)).toBeNull();
    fireEvent.click(within(pad).getByRole("button", { name: "Add 2.5 kg" }));
    expect(await qtyOf("Paneer")).toHaveValue("2.5");
  });

  test("without create rights at the hotel, Post is off and says why", async () => {
    mockCanCreate = false;
    render(<MarkOutPage />);
    expect(await screen.findByText(/marking out there needs inventory create rights/)).toBeInTheDocument();
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    expect(postButton()).toBeDisabled();
  });

  test("a failed rights check offers a retry, not a refusal", async () => {
    mockPermError = "Failed to fetch permissions";
    render(<MarkOutPage />);
    expect(await screen.findByText(/Couldn't check your rights at Orchid Mumbai/)).toBeInTheDocument();
    expect(screen.queryByText(/needs inventory create rights/)).toBeNull();
    expect(postButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  test("Return to stock from the URL wins over an earlier empty visit", async () => {
    await saveOutSession(46, { savedAt: 1, hotelId: 46, sessionKey: "x", docType: "OUT", departmentId: "", lines: [] });
    render(<MarkOutPage initialMode="RETURN" />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    expect(screen.getByRole("radio", { name: "Return to stock" })).toHaveAttribute("aria-checked", "true");
    await chooseDepartment("7");
    postOut.mockResolvedValue(outDoc({ docType: "RETURN" }));
    fireEvent.click(postButton("Post return"));
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0]).toMatchObject({ docType: "RETURN" });
    expect(await screen.findByText("Returned to stock")).toBeInTheDocument();
  });

  test("a session with no lines is never kept on the device", async () => {
    render(<MarkOutPage />);
    await chooseDepartment("7");
    fireEvent.click(screen.getByRole("radio", { name: "Return to stock" }));
    await scan("SOAP");
    await qtyOf("Dish soap");
    await waitFor(async () => expect(await loadOutSession(46)).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Remove Dish soap" }));
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
  });

  test("switching hotel mid-session keeps each hotel's session and clears the toasts", async () => {
    twoHotels();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await waitFor(async () => expect(await loadOutSession(46)).not.toBeNull());

    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    await waitFor(() => expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull());
    expect(toast.dismiss).toHaveBeenCalledWith("out-scan-1");
    await scan("SOAP");
    await qtyOf("Dish soap");
    expect(resolveScan).toHaveBeenLastCalledWith("SOAP", "hotel:47");

    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "46" } });
    expect(await qtyOf("Basmati rice")).toHaveValue("6");
    expect(screen.queryByLabelText("Qty of Dish soap")).toBeNull();
  });

  test("the hotel picker and mode switch are locked while posting", async () => {
    twoHotels();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    let release;
    postOut.mockReturnValue(new Promise((res) => { release = res; }));
    fireEvent.click(postButton());
    await waitFor(() => expect(screen.getByLabelText("Hotel")).toBeDisabled());
    expect(screen.getByRole("radio", { name: "Return to stock" })).toBeDisabled();
    await act(async () => release(outDoc()));
    await screen.findByText("OUT/46/2026-27/00007");
  });

  test("session restored from IndexedDB after reload", async () => {
    const first = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");

    let saved;
    await waitFor(async () => {
      saved = await loadOutSession(46);
      expect(saved).toEqual(
        expect.objectContaining({
          docType: "OUT",
          departmentId: "7",
          lines: [expect.objectContaining({ invItemId: 9, displayName: "Basmati rice", qty: "6" })],
        })
      );
    });
    expect(saved.sessionKey).toMatch(UUID);
    first.unmount();

    render(<MarkOutPage />);
    expect(await qtyOf("Basmati rice")).toHaveValue("6");
    await waitFor(() => expect(screen.getByLabelText("Department")).toHaveValue("7"));

    // the restored session posts under the key it was saved with
    postOut.mockResolvedValue(outDoc());
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0].clientEventId).toBe(saved.sessionKey);
  });

  test("a hotel picked from the server's list scopes the scan", async () => {
    getStock.mockResolvedValue({
      hotelId: 46, stockStartedAt: null, hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }],
      totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
    });
    render(<MarkOutPage initialHotelId="47" />);
    await waitFor(() => expect(screen.getByLabelText("Hotel")).toHaveValue("47"));
    await scan("SOAP");
    await qtyOf("Dish soap");
    expect(resolveScan).toHaveBeenCalledWith("SOAP", "hotel:47");
  });

  test("a non-item scan is explained, not added", async () => {
    render(<MarkOutPage />);
    await scan("PO-52");
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  test("mobile puts Post in the sticky action bar", async () => {
    mockMobile = true;
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    const bar = await screen.findByRole("region", { name: "Mark out actions" });
    expect(within(bar).getByRole("button", { name: "Post mark out" })).toBeInTheDocument();
    expect(within(bar).getByText(/1 item/)).toBeInTheDocument();
  });
});
