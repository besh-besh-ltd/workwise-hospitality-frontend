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
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: mockUserId == null ? null : { id: mockUserId } }),
}));
// The outbox with D3's API (ready flag, per-event status, pending and failed
// items, discard, outcomes), driven from the tests through a small store.
// Items: {id, kind, clientEventId, status, payload, summary, createdAt, error, lastError}.
jest.mock("@/components/inventory/offline/outbox", () => {
  const { useMemo, useSyncExternalStore } = require("react");
  const store = { ready: true, items: [], listeners: new Set(), outcomes: new Set() };
  const emit = () => store.listeners.forEach((l) => l());
  const subscribe = (l) => {
    store.listeners.add(l);
    return () => store.listeners.delete(l);
  };
  const setItem = (id, patch) => {
    store.items = store.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    emit();
  };
  const useItems = () => useSyncExternalStore(subscribe, () => store.items);
  return {
    __esModule: true,
    submitOrQueue: jest.fn(),
    useOutboxReady: () => useSyncExternalStore(subscribe, () => store.ready),
    outboxReady: jest.fn(() => Promise.resolve()),
    getOutboxStatus: jest.fn((kind, cid) => store.items.find((i) => i.kind === kind && i.clientEventId === cid)?.status || "unknown"),
    usePendingItems: (kind) => {
      const items = useItems();
      return useMemo(() => items.filter((i) => i.status === "pending" && (!kind || i.kind === kind)), [items, kind]);
    },
    useFailedItems: (kind) => {
      const items = useItems();
      return useMemo(() => items.filter((i) => i.status === "failed" && (!kind || i.kind === kind)), [items, kind]);
    },
    dismissFailed: jest.fn(async (id) => setItem(id, { status: "dismissed" })),
    discardPending: jest.fn(async (id) => {
      const item = store.items.find((i) => i.id === id);
      if (!item || item.status !== "pending") return false;
      setItem(id, { status: "dismissed" });
      return true;
    }),
    mayBeRecorded: (item) => item?.mayBeRecorded === true || item?.error?.uncertain === true,
    onOutboxOutcome: (listener) => {
      store.outcomes.add(listener);
      return () => store.outcomes.delete(listener);
    },
    __store: store,
    __emit: emit,
    __setItem: setItem,
  };
});

// A slow device: when set, a clear of the open slot lands this many ms after it is asked for.
let mockSlowClearMs = 0;
jest.mock("../outSession", () => {
  const real = jest.requireActual("../outSession");
  return {
    __esModule: true,
    ...real,
    clearOutSession: (...args) =>
      mockSlowClearMs
        ? new Promise((r) => setTimeout(r, mockSlowClearMs)).then(() => real.clearOutSession(...args))
        : real.clearOutSession(...args),
  };
});

let mockQuery = {};
let mockUserId = "21";
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
import * as sessions from "../outSession";
import { RESULT_GRACE_MS } from "../useQueuedOuts";

const USER = "21";
const loadOutSession = (hotelId, userId = USER) => sessions.loadOutSession(userId, hotelId);
const saveOutSession = (hotelId, value, userId = USER) => sessions.saveOutSession(userId, hotelId, value);
const clearOutSession = (hotelId, userId = USER) => sessions.clearOutSession(userId, hotelId);

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
/** submitOrQueue as D3 answers when there is no connection: the event waits in the outbox. */
const queueInOutbox = () =>
  submitOrQueue.mockImplementation(async ({ kind, clientEventId, payload, summary }) => {
    outbox.__store.items = [
      ...outbox.__store.items.filter((i) => i.clientEventId !== clientEventId),
      { id: `${kind}:${clientEventId}`, kind, clientEventId, status: "pending", payload, summary, createdAt: "2026-10-25T05:00:00.000Z", attempts: 0, lastError: null },
    ];
    outbox.__emit();
    return { queued: true, persisted: true };
  });
// Reopening a queued session is several device reads and writes in a row
// (slot, index, copy): give it longer than one render under a busy test run.
const REOPEN = { timeout: 4000 };
/** submitOrQueue with a connection: sent at once. */
const sendNow = () =>
  submitOrQueue.mockImplementation(async ({ send, payload }) => ({ queued: false, result: await send(payload) }));

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
  mockSlowClearMs = 0;
  mockMobile = false;
  mockCanCreate = true;
  mockPermError = null;
  mockUserId = USER;
  outbox.__store.ready = true;
  outbox.__store.items = [];
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
  sendNow();
  for (const u of [USER, "22"]) {
    await clearOutSession(46, u);
    await clearOutSession(47, u);
    for (const e of await sessions.listQueuedOuts(u)) await sessions.clearQueuedOut(u, e.clientEventId);
  }
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
    // Discard asks first: it may have gone through
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    let ask = screen.getByRole("alertdialog", { name: "Discard this session?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByLabelText("Qty of Basmati rice")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    ask = screen.getByRole("alertdialog", { name: "Discard this session?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Discard session" }));
    await waitFor(() => expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull());
    expect(postButton()).toBeInTheDocument();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
    expect(postOut).toHaveBeenCalledTimes(1);
  });

  test("a queued post frees the hotel at once and is listed under Waiting to sync until the outbox says sent", async () => {
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/Saved on this device/)));
    expect(within(card).getByText("Waiting to sync. If it's refused you'll see it here and can fix it.")).toBeInTheDocument();
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    expect(submitOrQueue.mock.calls[0][0]).toMatchObject({ kind: "out_post", summary: "Mark out · Kitchen · 1 item" });

    // the open slot is free: a new session starts at once, under a new key
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
    await scan("SOAP");
    await qtyOf("Dish soap");

    // the waiting session: summary, count, when, View
    const row = within(card).getByRole("listitem", { name: "Mark out · Kitchen" });
    expect(within(row).getByText("1 item")).toBeInTheDocument();
    expect(within(row).getByText("Waiting to sync")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "View" }));
    expect(within(within(row).getByRole("list", { name: "Items in Mark out · Kitchen" })).getByText("Basmati rice")).toBeInTheDocument();

    // its own device copy, owned by this user
    const copy = await sessions.loadQueuedOut(USER, key);
    expect(copy).toEqual(expect.objectContaining({ userId: USER, hotelId: 46, clientEventId: key, departmentName: "Kitchen" }));
    expect(copy.lines).toEqual([expect.objectContaining({ invItemId: 9, qty: "6" })]);
    expect(copy.sentPayload).toEqual(submitOrQueue.mock.calls[0][0].payload);
    expect(await sessions.listQueuedOuts(USER)).toEqual([expect.objectContaining({ clientEventId: key, hotelId: 46 })]);

    // the outbox says sent: the copy goes, the new session stays
    act(() => outbox.__setItem(`out_post:${key}`, { status: "sent" }));
    emitOutcome({ id: `out_post:${key}`, clientEventId: key, kind: "out_post", outcome: "sent", result: outDoc() });
    await waitFor(() => expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull());
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Mark out · Kitchen · 1 item synced as OUT\/46\/2026-27\/00007/));
    expect(screen.getByText(/synced as OUT\/46\/2026-27\/00007 at Orchid Mumbai/)).toBeInTheDocument();
    expect(screen.getByLabelText("Qty of Dish soap")).toBeInTheDocument();
    await waitFor(async () => expect(await sessions.loadQueuedOut(USER, key)).toBeNull());
    expect(await sessions.listQueuedOuts(USER)).toEqual([]);
  });

  test("a queued session that syncs as a replay with other lines is flagged", async () => {
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    act(() => outbox.__setItem(`out_post:${key}`, { status: "sent" }));
    emitOutcome({
      id: `out_post:${key}`, clientEventId: key, kind: "out_post", outcome: "sent",
      result: { ...outDoc({ lines: [{ id: 1, invItemId: 11, displayName: "Dish soap", qty: 2, stockUom: "piece" }] }), replayed: true },
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/already recorded as OUT\/46\/2026-27\/00007, with different lines/);
    expect(toast.warn).toHaveBeenCalledWith(expect.stringMatching(/different lines/), { autoClose: false });
  });

  test("a refusal while the page was closed reopens editable in the empty slot", async () => {
    queueInOutbox();
    const first = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    first.unmount();

    outbox.__setItem(`out_post:${key}`, {
      status: "failed",
      error: { httpStatus: 409, code: "NEGATIVE_STOCK", message: "Not enough stock",
        details: { lines: [{ index: 0, invItemId: 9, available: 4, requested: 6 }] } },
    });
    render(<MarkOutPage />);
    expect(await screen.findByText(/This session was refused when it synced/, {}, REOPEN)).toBeInTheDocument();
    const rice = lineOf("Basmati rice");
    expect(within(rice).getByText("Only 4 bag in stock; this session marks out 6.")).toBeInTheDocument();
    expect(within(rice).getByLabelText("Qty of Basmati rice")).toBeEnabled();
    expect(screen.getByLabelText("Department")).toHaveValue("7");
    expect(outbox.dismissFailed).toHaveBeenCalledWith(`out_post:${key}`);
    expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull();
    await waitFor(async () => expect((await loadOutSession(46))?.status).toBe("open"));
    expect(await sessions.loadQueuedOut(USER, key)).toBeNull();

    // fixed and posted again under the same key, with the connection back
    sendNow();
    fireEvent.change(within(rice).getByLabelText("Qty of Basmati rice"), { target: { value: "4" } });
    postOut.mockResolvedValue(outDoc());
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0]).toMatchObject({ clientEventId: key, lines: [{ invItemId: 9, qty: 4 }] });
  });

  test("a slot left behind by a session the outbox already holds gives way to the queued copy", async () => {
    // the page went while the slot was being freed: both copies are on the device
    const lines = [{ invItemId: 9, displayName: "Basmati rice", stockUom: "bag", qty: "6", exact: 6, available: 10 }];
    const sentPayload = { hotelId: 46, docType: "OUT", departmentId: 7, clientEventId: "k-1", lines: [{ invItemId: 9, qty: 6 }] };
    await saveOutSession(46, { savedAt: 1, hotelId: 46, sessionKey: "k-1", docType: "OUT", departmentId: "7", requestedByName: "", lines, status: "open" });
    await sessions.saveQueuedOut(USER, {
      hotelId: 46, clientEventId: "k-1", sessionKey: "k-1", docType: "OUT", departmentId: "7", departmentName: "Kitchen",
      requestedByName: "", queuedAt: 1, lines, sentPayload, status: "queued",
    });
    outbox.__store.items = [{
      id: "out_post:k-1", kind: "out_post", clientEventId: "k-1", status: "failed", payload: sentPayload,
      error: { httpStatus: 409, code: "NEGATIVE_STOCK", message: "Not enough stock", details: { lines: [{ index: 0, invItemId: 9, available: 4, requested: 6 }] } },
    }];
    render(<MarkOutPage />);
    expect(await screen.findByText(/This session was refused when it synced/, {}, REOPEN)).toBeInTheDocument();
    expect(within(lineOf("Basmati rice")).getByText("Only 4 bag in stock; this session marks out 6.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull();
    await waitFor(async () => expect(await sessions.listQueuedOuts(USER)).toEqual([]));
    expect(await loadOutSession(46)).toEqual(expect.objectContaining({ sessionKey: "k-1", status: "open" }));
  });

  test("a refusal with a session in progress is listed with Open, which asks before replacing it", async () => {
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    sendNow();
    await scan("SOAP");
    await qtyOf("Dish soap");

    act(() => outbox.__setItem(`out_post:${key}`, {
      status: "failed",
      error: { httpStatus: 409, code: "NEGATIVE_STOCK", message: "Not enough stock",
        details: { lines: [{ index: 0, invItemId: 9, available: 4, requested: 6 }] } },
    }));
    const card = screen.getByRole("region", { name: "Waiting to sync" });
    const row = await within(card).findByText("Refused: Not enough stock");
    expect(row).toBeInTheDocument();
    // the session in progress is untouched
    expect(screen.getByLabelText("Qty of Dish soap")).toBeEnabled();

    fireEvent.click(within(card).getByRole("button", { name: "Open" }));
    let ask = within(card).getByRole("alertdialog", { name: "Open this session?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Keep current" }));
    expect(screen.getByLabelText("Qty of Dish soap")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Open" }));
    ask = within(card).getByRole("alertdialog", { name: "Open this session?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Discard current and open" }));
    expect(await screen.findByText(/This session was refused when it synced/, {}, REOPEN)).toBeInTheDocument();
    expect(screen.queryByLabelText("Qty of Dish soap")).toBeNull();
    expect(within(lineOf("Basmati rice")).getByText("Only 4 bag in stock; this session marks out 6.")).toBeInTheDocument();
    await waitFor(async () => expect((await loadOutSession(46))?.lines).toEqual([expect.objectContaining({ invItemId: 9 })]));
  });

  test("never synced by absence: an event the outbox no longer has reopens locked, not as recorded", async () => {
    queueInOutbox();
    const first = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    const sent = submitOrQueue.mock.calls[0][0].payload;
    first.unmount();

    // the refusal was dismissed from the sync badge: the outbox only says "dismissed"
    outbox.__setItem(`out_post:${key}`, { status: "dismissed" });
    render(<MarkOutPage />);
    expect(await screen.findByText(/can't confirm whether this session was recorded/, {}, REOPEN)).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/synced/)).toBeNull();
    await waitFor(async () => expect((await loadOutSession(46))?.status).toBe("uncertain"));

    // Post again sends the same session under the same key
    sendNow();
    postOut.mockResolvedValue({ ...outDoc(), replayed: true });
    fireEvent.click(screen.getByRole("button", { name: "Post again" }));
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0]).toEqual(sent);
    expect(await screen.findByText(/already recorded/i)).toBeInTheDocument();
  });

  /** Post Basmati rice x6 to Kitchen with no connection; the outbox holds it. */
  const queueRice = async () => {
    queueInOutbox();
    const view = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/Saved on this device/)));
    const { clientEventId: key, payload: sent } = submitOrQueue.mock.calls[0][0];
    return { view, key, sent };
  };

  test.each([
    ["out of server retries, tagged", { httpStatus: 503, code: "GAVE_UP", uncertain: true, details: {}, message: "The server could not record this after 10 tries (503): Service Unavailable" }, /could not record this after 10 tries/],
    ["no answer for 3 days, tagged", { httpStatus: null, code: "NO_ANSWER", uncertain: true, details: {}, message: "Not sent: no answer from the server for 3 days" }, /no answer from the server for 3 days/],
  ])("an outbox give-up (%s) reopens locked as not confirmed, never as a refusal", async (_, error, said) => {
    const { view, key, sent } = await queueRice();
    view.unmount();
    outbox.__setItem(`out_post:${key}`, { status: "failed", error });

    render(<MarkOutPage />);
    const alert = await screen.findByText(/The sync queue gave up on this session/, {}, REOPEN);
    expect(alert).toHaveTextContent(said);
    expect(alert).toHaveTextContent(/may or may not be recorded/);
    expect(screen.queryByText(/refused/i)).toBeNull();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
    expect(outbox.dismissFailed).toHaveBeenCalledWith(`out_post:${key}`);
    await waitFor(async () => expect(await loadOutSession(46)).toEqual(expect.objectContaining({
      status: "uncertain", sentPayload: sent, lastError: expect.objectContaining({ gaveUp: true, httpStatus: error.httpStatus }),
    })));

    // Post again: the same session under the same key
    sendNow();
    postOut.mockResolvedValue({ ...outDoc(), replayed: true });
    fireEvent.click(screen.getByRole("button", { name: "Post again" }));
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0]).toEqual(sent);
  });

  test("give-ups the outbox doesn't tag yet (a 5xx last answer, or NO_ANSWER alone) read as not confirmed too", async () => {
    const first = await queueRice();
    await scan("SOAP");
    await qtyOf("Dish soap");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await waitFor(() => expect(submitOrQueue).toHaveBeenCalledTimes(2));
    const second = submitOrQueue.mock.calls[1][0].clientEventId;
    await waitFor(() => expect(screen.queryByLabelText("Qty of Dish soap")).toBeNull());
    sendNow();
    await scan("PANEER-2.5");
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Add 2.5 kg" }));
    await qtyOf("Paneer");

    act(() => {
      outbox.__setItem(`out_post:${first.key}`, {
        status: "failed",
        error: { httpStatus: 503, code: null, details: {}, message: "The server could not record this after 10 tries (503): Service Unavailable" },
      });
      outbox.__setItem(`out_post:${second}`, {
        status: "failed",
        error: { httpStatus: null, code: "NO_ANSWER", details: {}, message: "Not sent: no answer from the server for 3 days" },
      });
    });
    const card = screen.getByRole("region", { name: "Waiting to sync" });
    const rows = within(card).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/Not confirmed: The server could not record this after 10 tries/);
    expect(rows[1]).toHaveTextContent(/Not confirmed: Not sent: no answer from the server for 3 days/);
    expect(within(card).queryByText(/Refused/)).toBeNull();
    expect(within(card).getAllByRole("button", { name: "Open" })).toHaveLength(2);
    // the session in progress is untouched
    expect(screen.getByLabelText("Qty of Paneer")).toBeEnabled();
  });

  test("Discard current and open keeps the reopened locked session on the device, even when the cleared screen's write lands late", async () => {
    const { key, sent } = await queueRice();
    await scan("SOAP");
    await qtyOf("Dish soap");
    act(() => outbox.__setItem(`out_post:${key}`, {
      status: "failed",
      error: { httpStatus: 503, code: "GAVE_UP", uncertain: true, details: {}, message: "gave up" },
    }));
    const card = screen.getByRole("region", { name: "Waiting to sync" });
    await within(card).findByText(/^Not confirmed/);

    // a slow device: every clear of the open slot lands 50 ms after it is asked for
    mockSlowClearMs = 50;
    fireEvent.click(within(card).getByRole("button", { name: "Open" }));
    fireEvent.click(within(card).getByRole("button", { name: "Discard current and open" }));
    expect(await screen.findByText(/may or may not be recorded/, {}, REOPEN)).toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    mockSlowClearMs = 0;
    // its queued copy is gone, so the slot is the only copy left on the device
    expect(await sessions.listQueuedOuts(USER)).toEqual([]);
    expect(await loadOutSession(46)).toEqual(expect.objectContaining({ status: "uncertain", sentPayload: sent }));
  });

  test("a reload while the first send was out keeps the session queued, not as a draft to send again", async () => {
    // the slot as it stood when Post was pressed; the outbox took the event
    const lines = [{ invItemId: 9, displayName: "Basmati rice", stockUom: "bag", qty: "6", exact: 6, available: 10 }];
    const payload = { hotelId: 46, docType: "OUT", departmentId: 7, clientEventId: "k-mid", lines: [{ invItemId: 9, qty: 6 }] };
    await saveOutSession(46, {
      savedAt: 5, hotelId: 46, sessionKey: "k-mid", docType: "OUT", departmentId: "7", departmentName: "Kitchen", requestedByName: "", lines, status: "open",
    });
    outbox.__store.items = [{ id: "out_post:k-mid", kind: "out_post", clientEventId: "k-mid", status: "pending", payload, summary: "Mark out · Kitchen · 1 item", attempts: 1, lastError: null }];

    render(<MarkOutPage />);
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    expect(within(card).getByRole("listitem", { name: "Mark out · Kitchen" })).toHaveTextContent("Waiting to sync");
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
    expect(await sessions.loadQueuedOut(USER, "k-mid")).toEqual(expect.objectContaining({ sentPayload: payload, hotelId: 46 }));
    // a new session starts under a new key
    await scan("SOAP");
    await qtyOf("Dish soap");
    await waitFor(async () => expect((await loadOutSession(46))?.sessionKey).not.toBe("k-mid"));
  });

  test("a reload after the first send went through counts it synced", async () => {
    const lines = [{ invItemId: 9, displayName: "Basmati rice", stockUom: "bag", qty: "6", exact: 6, available: 10 }];
    await saveOutSession(46, {
      savedAt: 5, hotelId: 46, sessionKey: "k-done", docType: "OUT", departmentId: "7", departmentName: "Kitchen", requestedByName: "", lines, status: "open",
    });
    outbox.__store.items = [{ id: "out_post:k-done", kind: "out_post", clientEventId: "k-done", status: "sent" }];
    render(<MarkOutPage />);
    expect(
      await screen.findByText(/Mark out · Kitchen · 1 item synced at Orchid Mumbai/, {}, { timeout: RESULT_GRACE_MS + 2000 })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    await waitFor(async () => expect(await loadOutSession(46)).toBeNull());
    await waitFor(async () => expect(await sessions.listQueuedOuts(USER)).toEqual([]));
  });

  test("with a session on screen that may be recorded, Open asks to settle it first instead of discarding it", async () => {
    const { key } = await queueRice();
    // the next session gets no answer: it is locked, uncertain
    sendNow();
    await scan("SOAP");
    await qtyOf("Dish soap");
    await chooseDepartment("7");
    const dropped = new Error("Network Error");
    dropped.isAxiosError = true;
    postOut.mockRejectedValue(dropped);
    fireEvent.click(postButton());
    expect(await screen.findByRole("button", { name: "Post again" })).toBeInTheDocument();

    act(() => outbox.__setItem(`out_post:${key}`, {
      status: "failed", error: { httpStatus: 409, code: "NEGATIVE_STOCK", message: "Not enough stock", details: {} },
    }));
    const card = screen.getByRole("region", { name: "Waiting to sync" });
    fireEvent.click(await within(card).findByRole("button", { name: "Open" }));
    const ask = within(card).getByRole("alertdialog", { name: "Open this session?" });
    expect(ask).toHaveTextContent(/may or may not be recorded\. Post it again to find out/);
    expect(within(ask).queryByRole("button", { name: "Discard current and open" })).toBeNull();
    fireEvent.click(within(ask).getByRole("button", { name: "OK" }));
    expect(screen.getByLabelText("Qty of Dish soap")).toBeDisabled();
    expect((await loadOutSession(46))?.status).toBe("uncertain");
  });

  test("a queued session the outbox can only keep in memory says so", async () => {
    submitOrQueue.mockImplementation(async ({ kind, clientEventId, payload, summary }) => {
      outbox.__store.items = [
        { id: `${kind}:${clientEventId}`, kind, clientEventId, status: "pending", payload, summary, attempts: 0, lastError: null, persisted: false },
      ];
      outbox.__emit();
      return { queued: true, persisted: false };
    });
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    await waitFor(() =>
      expect(toast.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^Kept only while this page stays open: don't close or reload until it syncs/),
        { autoClose: false }
      )
    );
    expect(toast.info).not.toHaveBeenCalledWith(expect.stringMatching(/Saved on this device/));
    expect(within(card).getByText("Waiting to sync (only while this page stays open)")).toBeInTheDocument();
  });

  test("an event the outbox has never heard of is uncertain too, and waits for the stored queue first", async () => {
    await sessions.saveQueuedOut(USER, {
      hotelId: 46, clientEventId: "k-lost", docType: "OUT", departmentId: "7", departmentName: "Kitchen",
      requestedByName: "", queuedAt: 1, lines: [{ invItemId: 9, displayName: "Basmati rice", stockUom: "bag", qty: "6", exact: 6, available: 10 }],
      sentPayload: { hotelId: 46, docType: "OUT", departmentId: 7, clientEventId: "k-lost", lines: [{ invItemId: 9, qty: 6 }] },
    });
    outbox.__store.ready = false;
    render(<MarkOutPage />);
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    expect(within(card).getByText("Checking…")).toBeInTheDocument();
    expect(outbox.getOutboxStatus).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    await setOutbox({ ready: true });
    expect(await screen.findByText(/can't confirm whether this session was recorded/, {}, REOPEN)).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
  });

  test("Discard from this device asks first, then drops the waiting session", async () => {
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/Saved on this device/)));

    fireEvent.click(within(card).getByRole("button", { name: "Discard from this device" }));
    let ask = within(card).getByRole("alertdialog", { name: "Discard from this device?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Keep it" }));
    expect(outbox.discardPending).not.toHaveBeenCalled();

    // the outbox marks it dismissed a moment before it answers
    outbox.discardPending.mockImplementationOnce(async (id) => {
      outbox.__setItem(id, { status: "dismissed" });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return true;
    });
    fireEvent.click(within(card).getByRole("button", { name: "Discard from this device" }));
    ask = within(card).getByRole("alertdialog", { name: "Discard from this device?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Discard it" }));
    expect(await within(card).findByText("Discarding…")).toBeInTheDocument();
    await waitFor(() => expect(outbox.discardPending).toHaveBeenCalledWith(`out_post:${key}`));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull());
    await waitFor(() => expect(toast.info).toHaveBeenLastCalledWith(expect.stringMatching(/discarded from this device/)));
    // never reopened as unaccounted-for while the outbox answered
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    expect(screen.queryByText(/can't confirm whether this session was recorded/)).toBeNull();
    await waitFor(async () => expect(await sessions.loadQueuedOut(USER, key)).toBeNull());
    expect(await loadOutSession(46)).toBeNull();
  });

  test("a waiting session a try got no answer for warns before Discard and offers Open, which reopens it locked", async () => {
    const { key, sent } = await queueRice();
    // a send went out and no answer came: the server may already have it
    act(() => outbox.__setItem(`out_post:${key}`, { mayBeRecorded: true, attempts: 1 }));
    const card = screen.getByRole("region", { name: "Waiting to sync" });
    const row = within(card).getByRole("listitem", { name: "Mark out · Kitchen" });
    expect(row).toHaveTextContent("a try got no answer: it may already be recorded");

    fireEvent.click(within(row).getByRole("button", { name: "Discard from this device" }));
    const ask = within(row).getByRole("alertdialog", { name: "Discard from this device?" });
    expect(ask).toHaveTextContent(/It may already have been recorded/);
    expect(ask).not.toHaveTextContent(/It won't be sent/);
    fireEvent.click(within(ask).getByRole("button", { name: "Open" }));

    // taken back from the outbox, then reopened locked under its key
    await waitFor(() => expect(outbox.discardPending).toHaveBeenCalledWith(`out_post:${key}`));
    expect(await screen.findByText(/may or may not be recorded/, {}, REOPEN)).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
    expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull();
    await waitFor(async () => expect(await loadOutSession(46)).toEqual(expect.objectContaining({ status: "uncertain", sentPayload: sent })));
    sendNow();
    postOut.mockResolvedValue({ ...outDoc(), replayed: true });
    fireEvent.click(screen.getByRole("button", { name: "Post again" }));
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0]).toEqual(sent);
  });

  test("a discard that loses the race to a send shows it as synced", async () => {
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/Saved on this device/)));
    outbox.discardPending.mockImplementationOnce(async (id) => {
      outbox.__setItem(id, { status: "sent" });
      return false;
    });
    fireEvent.click(within(card).getByRole("button", { name: "Discard from this device" }));
    fireEvent.click(within(card).getByRole("button", { name: "Discard it" }));
    await waitFor(() => expect(toast.info).toHaveBeenLastCalledWith(expect.stringMatching(/was sent \(or settled\)/)));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull());
    // no outcome event carried the server's answer: synced (the outbox said so), after the grace wait
    expect(
      await screen.findByText(/Mark out · Kitchen · 1 item synced at Orchid Mumbai/, {}, { timeout: RESULT_GRACE_MS + 2000 })
    ).toBeInTheDocument();
    await waitFor(async () => expect(await sessions.loadQueuedOut(USER, key)).toBeNull());
  });

  test("another user on this device never sees, posts or clears someone else's sessions", async () => {
    queueInOutbox();
    const first = render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    await scan("SOAP");
    await qtyOf("Dish soap");
    await waitFor(async () => expect((await loadOutSession(46))?.lines).toHaveLength(1));
    first.unmount();

    mockUserId = "22";
    render(<MarkOutPage />);
    await scan("PANEER-2.5");
    const pad = await screen.findByRole("dialog");
    fireEvent.click(within(pad).getByRole("button", { name: "Add 2.5 kg" }));
    expect(await qtyOf("Paneer")).toHaveValue("2.5");
    expect(screen.queryByLabelText("Qty of Dish soap")).toBeNull();
    expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull();
    await waitFor(async () => expect((await loadOutSession(46, "22"))?.lines).toEqual([expect.objectContaining({ invItemId: 10 })]));
    // user 21's open session and queued copy are untouched
    expect((await loadOutSession(46))?.lines).toEqual([expect.objectContaining({ invItemId: 11 })]);
    expect(await sessions.listQueuedOuts(USER)).toHaveLength(1);
    expect(await sessions.listQueuedOuts("22")).toEqual([]);
  });

  test("an outcome for a session from another hotel only updates its stored copy", async () => {
    twoHotels();
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    sendNow();

    await waitFor(() => expect(screen.getByLabelText("Hotel")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    await waitFor(() => expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull());
    // refused at 46 while Pune is shown (and empty): Pune's slot stays empty
    act(() => outbox.__setItem(`out_post:${key}`, { status: "failed", error: { httpStatus: 409, code: "NEGATIVE_STOCK", message: "Not enough stock", details: {} } }));
    await act(async () => {});
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    expect(await loadOutSession(47)).toBeNull();
    await scan("SOAP");
    await qtyOf("Dish soap");

    // back at Mumbai it reopens there
    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "46" } });
    expect(await screen.findByText(/This session was refused when it synced/, {}, REOPEN)).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeEnabled();
  });

  test("a session from another hotel that syncs is cleared without touching the one on screen", async () => {
    twoHotels();
    queueInOutbox();
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    await screen.findByRole("region", { name: "Waiting to sync" });
    const key = submitOrQueue.mock.calls[0][0].clientEventId;
    await waitFor(() => expect(screen.getByLabelText("Hotel")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    await scan("SOAP");
    await qtyOf("Dish soap");
    act(() => outbox.__setItem(`out_post:${key}`, { status: "sent" }));
    emitOutcome({ id: `out_post:${key}`, clientEventId: key, kind: "out_post", outcome: "sent", result: outDoc() });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/synced as OUT\/46\/2026-27\/00007 at Orchid Mumbai/)));
    expect(screen.getByLabelText("Qty of Dish soap")).toBeEnabled();
    expect(screen.queryByText("Marked out")).toBeNull();
    await waitFor(async () => expect(await sessions.loadQueuedOut(USER, key)).toBeNull());
    expect((await loadOutSession(47))?.lines).toEqual([expect.objectContaining({ invItemId: 11 })]);
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

  test("a post answered 404 (C3: a hotel you can't see, or one that's gone) says the hotel isn't available", async () => {
    postOut.mockRejectedValue(apiError(404, "NOT_FOUND", {}, "Hotel not found"));
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    expect(await screen.findByText("This hotel isn't available to you, or no longer exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Qty of Basmati rice")).toBeEnabled();
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

  test("a big return is never held for a confirm", async () => {
    getStockItem.mockResolvedValue({ item: { id: 11 }, balance: { qty: 4 } });
    render(<MarkOutPage />);
    fireEvent.click(await screen.findByRole("radio", { name: "Return to stock" }));
    await scan("SOAP");
    const soap = await waitFor(() => {
      const line = lineOf("Dish soap");
      expect(within(line).getByText("in stock", { exact: false })).toBeInTheDocument();
      return line;
    });
    fireEvent.change(within(soap).getByLabelText("Qty of Dish soap"), { target: { value: "500" } });
    expect(within(soap).queryByText(/far more than/)).toBeNull();
    expect(within(soap).queryByRole("button", { name: /is right/ })).toBeNull();
    await chooseDepartment("7");
    postOut.mockResolvedValue(outDoc({ docType: "RETURN" }));
    fireEvent.click(postButton("Post return"));
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0]).toMatchObject({ docType: "RETURN", lines: [{ invItemId: 11, qty: 500 }] });
  });

  test("a qty over 100 waits for the on-hand check before it can post, then asks", async () => {
    let answer;
    getStockItem.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    render(<MarkOutPage />);
    await scan("SOAP");
    const soap = await waitFor(() => lineOf("Dish soap"));
    fireEvent.change(within(soap).getByLabelText("Qty of Dish soap"), { target: { value: "500" } });
    expect(within(soap).getByRole("status")).toHaveTextContent("Checking what's in stock before 500 can be marked out");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    expect(await screen.findByText("Still checking what's in stock for the highlighted qty. Post again in a moment.")).toBeInTheDocument();
    expect(postOut).not.toHaveBeenCalled();

    await act(async () => answer({ item: { id: 11 }, balance: { qty: 4 } }));
    expect(await within(soap).findByText(/500 piece is far more than the 4 in stock/)).toBeInTheDocument();
    fireEvent.click(postButton());
    expect(await screen.findByText("Check the highlighted qty, then post.")).toBeInTheDocument();
    expect(postOut).not.toHaveBeenCalled();
  });

  test("with no stock figure, a qty over 100 needs a confirm", async () => {
    getStockItem.mockRejectedValue(apiError(503, "UNAVAILABLE", {}, "Down"));
    render(<MarkOutPage />);
    await scan("SOAP");
    const soap = await waitFor(() => lineOf("Dish soap"));
    await waitFor(() => expect(getStockItem).toHaveBeenCalledWith(46, 11));
    fireEvent.change(within(soap).getByLabelText("Qty of Dish soap"), { target: { value: "500" } });
    expect(await within(soap).findByText("Couldn't check what's in stock. Is 500 piece right?")).toBeInTheDocument();
    await chooseDepartment("7");
    fireEvent.click(postButton());
    expect(await screen.findByText("Check the highlighted qty, then post.")).toBeInTheDocument();
    expect(postOut).not.toHaveBeenCalled();

    fireEvent.click(within(soap).getByRole("button", { name: "Yes, 500 is right" }));
    postOut.mockResolvedValue(outDoc());
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(1));
    expect(postOut.mock.calls[0][0].lines).toEqual([{ invItemId: 11, qty: 500 }]);
  });

  test("an item added again after Remove checks what's in stock again", async () => {
    getStockItem.mockResolvedValue({ item: { id: 11 }, balance: { qty: 4 } });
    render(<MarkOutPage />);
    await scan("SOAP");
    await waitFor(() => expect(within(lineOf("Dish soap")).getByText("in stock", { exact: false })).toBeInTheDocument());
    expect(getStockItem).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Dish soap" }));
    expect(screen.queryByLabelText("Qty of Dish soap")).toBeNull();

    getStockItem.mockResolvedValue({ item: { id: 11 }, balance: { qty: 3 } });
    await scan("SOAP");
    await waitFor(() => expect(getStockItem).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(lineOf("Dish soap")).getByText("3")).toBeInTheDocument());
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

// M-2: on a phone the scan bar is sticky (receive.module.scss phone layer), but
// a sticky element only sticks inside its own parent box, and not at all when
// an ancestor is a scroll box (.card has overflow: hidden). The bar therefore
// lives in the items card, the box the list grows in, and that card clips
// without becoming a scroll box on a phone.
describe("MarkOutPage scan bar on a phone (M-2)", () => {
  test("the scan bar sits in the items card, above the list it stays with", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    const items = screen.getByRole("region", { name: "Session items" });
    expect(items).toContainElement(screen.getByLabelText("Scan or type a code"));
    expect(items).toContainElement(lineOf("Basmati rice"));
    expect(items).toHaveClass("dockCard");
  });

  test("on a phone the items card clips instead of hiding overflow, so the bar can stick", () => {
    const fs = jest.requireActual("fs");
    const path = jest.requireActual("path");
    const css = fs.readFileSync(path.join(__dirname, "..", "stock.module.scss"), "utf8");
    const layer = css.slice(css.indexOf("Phone layer"));
    const at = layer.indexOf("@media (max-width: 768px)");
    expect(at).toBeGreaterThanOrEqual(0);
    let depth = 0;
    let i = layer.indexOf("{", at);
    const start = i;
    for (; i < layer.length; i++) {
      if (layer[i] === "{") depth++;
      else if (layer[i] === "}" && --depth === 0) break;
    }
    const phone = layer.slice(start, i + 1);
    // section.dockCard outranks receive.module.scss's single-class .card.
    expect(phone).toMatch(/section\.dockCard\s*{[^}]*overflow:\s*clip;/);
    // Desktop keeps the card as it was: no rule outside the phone layer.
    expect(css.slice(0, css.indexOf("Phone layer"))).not.toMatch(/\.dockCard/);
  });
});
