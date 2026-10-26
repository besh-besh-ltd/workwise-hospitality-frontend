// Mark out against D3's real outbox (components/inventory/offline/outbox.js,
// with fake-indexeddb): what the page says about a queued session comes from
// the outbox's own word, never from an event going missing. Only state and the
// page's own labels are asserted; the outbox's messages are its own.
//
// The outbox's owner check reads redux (mocked @/redux/store), the token and
// redux-persist's copy of the profile, so signIn() sets all three.

const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
require("fake-indexeddb/auto");
const { IDBFactory } = require("fake-indexeddb");

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, pathname: "/dashboard/buyer/inventory/out", push: jest.fn(), replace: jest.fn() }),
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
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false,
    error: null, refetch: jest.fn(), hasPermission: () => true,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  getStockItem: jest.fn(),
  postOut: jest.fn(),
  resolveScan: jest.fn(),
  createGrn: jest.fn(),
  saveCountLines: jest.fn(),
}));
jest.mock("@/services/rbac", () => ({ __esModule: true, getDepartments: jest.fn() }));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: mockUserId } }),
}));
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: { id: mockUserId } }), subscribe: () => () => {}, dispatch: jest.fn() },
}));

let mockUserId = "21";

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getStock, getStockItem, postOut, resolveScan } from "@/services/inventory";
import { getDepartments } from "@/services/rbac";
import * as outbox from "@/components/inventory/offline/outbox";
import MarkOutPage from "../MarkOutPage";
import * as sessions from "../outSession";

const signIn = (id) => {
  mockUserId = id;
  window.localStorage.setItem("token", `t-${id}`);
  window.localStorage.setItem("persist:root", JSON.stringify({ userProfile: JSON.stringify({ id: Number(id) }) }));
};
const axiosError = (status, data = {}) => {
  const e = new Error(status ? `Request failed with status code ${status}` : "Network Error");
  e.isAxiosError = true;
  if (status) e.response = { status, data };
  else e.request = {};
  return e;
};
const noAnswer = () => axiosError(null);

const SCANS = {
  "RICE-6PK": { kind: "item", code: "RICE-6PK", gs1: null, item: { invItemId: 9, displayName: "Basmati rice", stockUom: "bag", packFactor: 6, poLineId: null, stockedAtHotel: true } },
  SOAP: { kind: "item", code: "SOAP", gs1: null, item: { invItemId: 11, displayName: "Dish soap", stockUom: "piece", packFactor: 1, poLineId: null, stockedAtHotel: true } },
};
const scan = async (code) => {
  const box = await screen.findByLabelText("Scan or type a code");
  await waitFor(() => expect(box).toBeEnabled());
  fireEvent.change(box, { target: { value: code } });
  fireEvent.keyDown(box, { key: "Enter" });
};
const qtyOf = (name) => screen.findByLabelText(`Qty of ${name}`);
const REOPEN = { timeout: 4000 };

/** Post Basmati rice x6 to Kitchen; the send gets no answer, so the outbox holds it. */
const queueRice = async () => {
  postOut.mockRejectedValue(noAnswer());
  const view = render(<MarkOutPage />);
  await scan("RICE-6PK");
  await qtyOf("Basmati rice");
  await screen.findByRole("option", { name: "Kitchen" });
  fireEvent.change(screen.getByLabelText("Department"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Post mark out" }));
  const card = await screen.findByRole("region", { name: "Waiting to sync" });
  await waitFor(() => expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull());
  const key = postOut.mock.calls[0][0].clientEventId;
  await waitFor(() => expect(outbox.getOutboxStatus("out_post", key)).toBe("pending"));
  return { view, card, key, sent: postOut.mock.calls[0][0] };
};

beforeEach(async () => {
  jest.clearAllMocks();
  window.localStorage.clear();
  signIn("21");
  // A fresh device for the outbox (it reloads what IndexedDB holds); the
  // draft store keeps its open handle, and its copies are cleared below.
  await outbox._resetOutboxForTests();
  globalThis.indexedDB = new IDBFactory();
  getStock.mockResolvedValue({
    hotelId: 46, stockStartedAt: "2026-10-01T00:00:00.000Z", hotels: [{ id: 46, name: "Orchid Mumbai" }],
    totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
  });
  getStockItem.mockResolvedValue(undefined);
  getDepartments.mockResolvedValue({ status: true, data: [{ id: 7, title: "Kitchen" }] });
  resolveScan.mockImplementation((code) => Promise.resolve(SCANS[code] || { kind: "unknown", code, gs1: null, item: null }));
  for (const u of ["21", "22"]) {
    await sessions.clearOutSession(u, 46);
    for (const e of await sessions.listQueuedOuts(u)) await sessions.clearQueuedOut(u, e.clientEventId);
  }
});

describe("MarkOutPage with the real outbox", () => {
  test("a refusal dismissed from the sync badge is never read as synced: it reopens locked", async () => {
    const { view, key, sent } = await queueRice();
    view.unmount();

    // refused while the page was closed, then dismissed from the badge
    postOut.mockRejectedValue(axiosError(409, { code: "NEGATIVE_STOCK", details: { lines: [] }, message: "Refused" }));
    await act(async () => {
      await outbox.flush({ force: true });
    });
    expect(outbox.getOutboxStatus("out_post", key)).toBe("failed");
    await act(async () => {
      await outbox.dismissFailed(`out_post:${key}`);
    });
    expect(outbox.getOutboxStatus("out_post", key)).toBe("dismissed");

    render(<MarkOutPage />);
    expect(await screen.findByText(/can't confirm whether this session was recorded/, {}, REOPEN)).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Post again" })).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/synced/)).toBeNull();
    expect((await sessions.loadOutSession("21", 46))?.sentPayload).toEqual(sent);
  });

  test("another user on the device never sees, or settles, the first user's waiting session", async () => {
    const { view, key } = await queueRice();
    view.unmount();

    signIn("22");
    const other = render(<MarkOutPage />);
    await screen.findByLabelText("Scan or type a code");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(screen.queryByRole("region", { name: "Waiting to sync" })).toBeNull();
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    other.unmount();
    expect(outbox.getOutboxStatus("out_post", key)).toBe("unknown"); // not user 22's to know
    expect(await sessions.listQueuedOuts("21")).toEqual([expect.objectContaining({ clientEventId: key })]);

    signIn("21");
    render(<MarkOutPage />);
    const card = await screen.findByRole("region", { name: "Waiting to sync" });
    expect(within(card).getByRole("listitem", { name: "Mark out · Kitchen" })).toHaveTextContent(/Waiting to sync/);
    expect(outbox.getOutboxStatus("out_post", key)).toBe("pending");
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("Discard current and open, when the waiting session's send goes through first, keeps the current session", async () => {
    const { key } = await queueRice();
    await scan("SOAP");
    await qtyOf("Dish soap");

    // a retry is out when the user asks to open the waiting session in place of the current one
    let answer;
    postOut.mockImplementationOnce(() => new Promise((res) => { answer = res; }));
    let flushing;
    act(() => {
      flushing = outbox.flush({ force: true });
    });
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(2));
    const card = screen.getByRole("region", { name: "Waiting to sync" });
    fireEvent.click(within(card).getByRole("button", { name: "Discard from this device" }));
    fireEvent.click(within(card).getByRole("button", { name: "Open" }));
    fireEvent.click(within(card).getByRole("button", { name: "Discard current and open" }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
      answer({ docId: 501, docNo: "OUT-501", replayed: false, lines: [{ invItemId: 9, qty: 6 }] });
      await flushing;
    });

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/before it could be opened/)), REOPEN);
    expect(outbox.getOutboxStatus("out_post", key)).toBe("sent");
    // the session in progress is still on screen, and still on the device
    expect(screen.getByLabelText("Qty of Dish soap")).toBeEnabled();
    expect(screen.queryByLabelText("Qty of Basmati rice")).toBeNull();
    expect((await sessions.loadOutSession("21", 46))?.lines).toEqual([expect.objectContaining({ invItemId: 11 })]);
  });

  test("an outbox give-up reads Not confirmed, never Refused, and reopens locked", async () => {
    const { key, sent } = await queueRice();
    // a session in progress keeps the slot busy, so the give-up is listed
    postOut.mockReset();
    await scan("SOAP");
    await qtyOf("Dish soap");

    // the server keeps failing until the outbox gives up
    postOut.mockRejectedValue(axiosError(500, { message: "Internal error" }));
    const realNow = Date.now.bind(Date);
    let skew = 0;
    const clock = jest.spyOn(Date, "now").mockImplementation(() => realNow() + skew);
    try {
      for (let i = 0; i < outbox.MAX_SERVER_ATTEMPTS + 5 && outbox.getOutboxStatus("out_post", key) === "pending"; i += 1) {
        skew += 60 * 60 * 1000; // each retry is due, and the give-up's minimum time passes
        await act(async () => {
          await outbox.flush();
        });
      }
    } finally {
      clock.mockRestore();
    }
    expect(outbox.getOutboxStatus("out_post", key)).toBe("failed");

    const card = screen.getByRole("region", { name: "Waiting to sync" });
    const row = await within(card).findByText(/^Not confirmed/);
    expect(row).toBeInTheDocument();
    expect(within(card).queryByText(/Refused/)).toBeNull();
    expect(screen.getByLabelText("Qty of Dish soap")).toBeEnabled();

    fireEvent.click(within(card).getByRole("button", { name: "Open" }));
    fireEvent.click(within(card).getByRole("button", { name: "Discard current and open" }));
    expect(await screen.findByText(/may or may not be recorded/, {}, REOPEN)).toBeInTheDocument();
    expect(await qtyOf("Basmati rice")).toBeDisabled();
    expect(screen.queryByText(/refused/i)).toBeNull();
    await waitFor(async () => expect((await sessions.loadOutSession("21", 46))?.sentPayload).toEqual(sent));
  });
});
