// Receive page over the REAL offline outbox (fake-indexeddb): a receipt posted
// with no connection waits on the device, posts once the device is back
// online, and a refusal on replay becomes a failed item that keeps the
// receipt. services/inventory, the scanner and the draft copy are mocked as
// in ReceivePage.session.test.js; the outbox and its database are not.

const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
const { IDBFactory } = require("fake-indexeddb");

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
jest.mock("@/components/inventory/scan/ScanInput", () => ({
  __esModule: true,
  default: () => <div data-testid="stub-scanner" />,
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ loading: false, canRead: true, canCreate: true, canUpdate: true, canApprove: true, hasPermission: () => true }),
}));
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: { id: 407 } }), subscribe: () => () => {} },
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
  postOut: jest.fn(),
  saveCountLines: jest.fn(),
}));
jest.mock("../draftStore", () => {
  const store = new Map();
  const copy = (v) => (v == null ? null : JSON.parse(JSON.stringify(v)));
  return {
    __esModule: true,
    __store: store,
    // Same rules as the real module: per-user keys, another owner's copy ignored.
    draftOwnerId: () => "407",
    grnDraftKey: (userId, poId, hotelId) => (userId == null ? null : `grn-draft:${userId}:${poId}:${hotelId}`),
    loadLocalDraft: jest.fn(async (key, ownerId) => {
      const value = copy(store.get(key));
      return value && String(value.ownerId) === String(ownerId) ? value : null;
    }),
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
import { act, cleanup, configure, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";

// The real outbox does several IndexedDB round trips per step: wait for each
// state, with room for a loaded CI machine (each wait still ends as soon as
// the state shows).
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(20000);
import "@testing-library/jest-dom";
import { createGrn, getReceiveContext } from "@/services/inventory";
import { _resetOutboxForTests, flush, getOutboxStatus, useFailedItems } from "@/components/inventory/offline/outbox";
import * as draftStore from "../draftStore";
import ReceivePage from "../ReceivePage";

let online = true;
Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });

const RICE = {
  poLineId: 11, productVariantId: 501, productName: "Basmati rice 25kg", unit: "bag",
  invItemId: 9, stockUom: "bag", uomFactor: 1, needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 24, openAtHotel: 24, maxAcceptable: 24, defaultMarkOutOnArrival: false, costPerPoUnit: 1800, barcodes: [],
};
const ctx = () => ({
  po: { id: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms", isCallOff: false, departmentId: 7 },
  hotel: { id: 46, name: "Orchid Mumbai" },
  hotelChoices: [{ id: 46, name: "Orchid Mumbai" }],
  lines: [RICE],
  dispatches: [],
  departments: [{ id: 7, title: "Kitchen" }],
  itemSuggestions: {},
  draft: null,
});
const postedGrn = () => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", status: "posted", docType: "RECEIPT", poId: 52, hotelId: 46,
  postedAt: new Date().toISOString(), lines: [], attachments: [], warnings: [],
});
const apiError = (status, code, details, message) =>
  Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { status: 0, message, code, details } },
  });

const postCalls = () => createGrn.mock.calls.map((c) => c[0]).filter((input) => input.post === true);

const postOffline = async () => {
  getReceiveContext.mockResolvedValue(ctx());
  render(<ReceivePage poId="52" />);
  await screen.findByText("Basmati rice 25kg");
  fireEvent.change(screen.getByLabelText("Received qty for Basmati rice 25kg"), { target: { value: "6" } });
  online = false;
  fireEvent.click(screen.getByRole("button", { name: "Post receipt" }));
  const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm and post" }));
  expect(await screen.findByText("Waiting to sync")).toBeInTheDocument();
  expect(screen.getByText(/posts by itself as soon as there is a connection \(1 waiting\)/)).toBeInTheDocument();
  expect(postCalls()).toHaveLength(0); // nothing went out while offline
  return draftStore.__store.get("grn-draft:407:52:46").sessionKey;
};

beforeEach(async () => {
  await _resetOutboxForTests();
  globalThis.indexedDB = new IDBFactory();
  online = true;
  localStorage.clear();
  localStorage.setItem("token", "tok-407");
  localStorage.setItem("persist:root", JSON.stringify({ userProfile: JSON.stringify({ id: 407 }), _persist: "{}" }));
  jest.clearAllMocks();
  draftStore.__store.clear();
  createGrn.mockImplementation((input) =>
    Promise.resolve(input.post ? postedGrn() : { id: 900, status: "draft", clientEventId: input.clientEventId, lines: [], attachments: [] })
  );
});

it("a receipt posted offline waits on the device and posts once the device is back online", async () => {
  const key = await postOffline();
  expect(getOutboxStatus("grn_post", key)).toBe("pending");

  online = true;
  await act(() => flush({ force: true }));

  expect(postCalls()).toEqual([
    expect.objectContaining({ poId: 52, hotelId: 46, post: true, clientEventId: key, lines: [expect.objectContaining({ poLineId: 11, receivedQty: 6 })] }),
  ]);
  expect(getOutboxStatus("grn_post", key)).toBe("sent");
  await waitFor(() => expect(screen.queryByText(/\(1 waiting\)/)).toBeNull());
});

it("a receipt the server refuses on replay becomes a failed item that keeps the receipt", async () => {
  const key = await postOffline();
  createGrn.mockImplementation((input) =>
    input.post
      ? Promise.reject(apiError(409, "PO_CLOSED", { poId: 52 }, "This order is closed: nothing more can be received"))
      : Promise.resolve({ id: 900, status: "draft", lines: [], attachments: [] })
  );

  online = true;
  await act(() => flush({ force: true }));

  expect(postCalls()).toHaveLength(1);
  expect(getOutboxStatus("grn_post", key)).toBe("failed");
  const { result } = renderHook(() => useFailedItems("grn_post"));
  expect(result.current).toEqual([
    expect.objectContaining({
      clientEventId: key,
      summary: "Receipt for PO #52 · 1 line",
      payload: expect.objectContaining({
        clientEventId: key,
        input: expect.objectContaining({ poId: 52, hotelId: 46, lines: [expect.objectContaining({ poLineId: 11, receivedQty: 6 })] }),
      }),
      error: expect.objectContaining({ httpStatus: 409, code: "PO_CLOSED", message: "This order is closed: nothing more can be received" }),
    }),
  ]);
});

it("reopening a receipt the outbox already sent and posting it again with edits says it was posted before, not 'Receipt posted'", async () => {
  const key = await postOffline();
  online = true;
  await act(() => flush({ force: true }));
  expect(getOutboxStatus("grn_post", key)).toBe("sent");
  cleanup();

  // The device copy still holds the entries and the spent key: the page brings them back.
  render(<ReceivePage poId="52" />);
  await screen.findByText("Basmati rice 25kg");
  await waitFor(() => expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("6"));
  fireEvent.change(screen.getByLabelText("Received qty for Basmati rice 25kg"), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Post receipt" }));
  const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm and post" }));

  expect(await screen.findByText(/This receipt was already posted as GRN\/46\/2026-27\/00012/)).toBeInTheDocument();
  expect(screen.queryByText("Receipt posted")).toBeNull();
  // The 8 stays on screen under a new key for the receiver to check and post.
  expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("8");
  expect(postCalls()).toHaveLength(1);
  expect(draftStore.__store.get("grn-draft:407:52:46").sessionKey).not.toBe(key);
});
