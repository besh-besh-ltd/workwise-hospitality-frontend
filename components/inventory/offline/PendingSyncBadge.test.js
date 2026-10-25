// The sync chip over the real outbox, on fake-indexeddb. services/inventory
// and the signed-in profile are mocked.
const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
const { IDBFactory } = require("fake-indexeddb");

let mockProfile = { id: 407 };
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: mockProfile }), subscribe: () => () => {} },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  createGrn: jest.fn(),
  postOut: jest.fn(),
  saveCountLines: jest.fn(),
}));

import React from "react";
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// The real outbox does several IndexedDB round trips per step: wait for each
// state, with room for a loaded CI machine (each wait still ends as soon as
// the state shows).
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(20000);
import "@testing-library/jest-dom";
import { postOut, saveCountLines } from "@/services/inventory";
import {
  NO_ANSWER_GAP_CAP_MS,
  NO_ANSWER_GIVE_UP_MS,
  OUTBOX_DB_NAME,
  _resetOutboxForTests,
  flush,
  getOutboxStatus,
  outboxReady,
  submitOrQueue,
} from "./outbox";
import PendingSyncBadge from "./PendingSyncBadge";

let online = true;
Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });

const networkError = () => Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK", request: {} });
const httpError = (status, data) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { status: 0, ...data } },
  });
const outEvent = (key) => ({
  kind: "out_post",
  clientEventId: key,
  payload: { hotelId: 46, docType: "OUT", departmentId: 3, clientEventId: key, lines: [{ invItemId: 8, qty: 2 }] },
  send: (p) => postOut(p),
});
const countEvent = (key) => ({
  kind: "count_lines",
  clientEventId: key,
  payload: { countId: 31, lines: [{ invItemId: 8, countedQty: 4, clientEventId: "l1" }] },
  send: jest.fn(),
});
const conflict = () =>
  httpError(409, { code: "CONFLICT", message: "This count was already submitted", details: { status: "submitted" } });

const queueOffline = async (event) => {
  online = false;
  await submitOrQueue(event);
  online = true;
};
const openPanel = () => fireEvent.click(screen.getByRole("button", { name: /Pending sync|not recorded|not be recorded/ }));

/** Write a row into the outbox's device database, as an earlier page left it. */
const putRaw = (row) =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("events", { keyPath: "id" });
    req.onsuccess = () => {
      const db = req.result;
      const t = db.transaction("events", "readwrite");
      t.objectStore("events").put(row);
      t.oncomplete = () => {
        db.close();
        resolve();
      };
      t.onerror = () => reject(t.error);
    };
    req.onerror = () => reject(req.error);
  });

/** Move the clock forward (Date.now only; timers stay real). */
let skew = 0;
const realNow = Date.now.bind(Date);

beforeEach(async () => {
  await _resetOutboxForTests();
  globalThis.indexedDB = new IDBFactory();
  online = true;
  mockProfile = { id: 407 };
  localStorage.clear();
  localStorage.setItem("token", "tok-407");
  localStorage.setItem("persist:root", JSON.stringify({ userProfile: JSON.stringify({ id: 407 }), _persist: "{}" }));
  jest.resetAllMocks();
  skew = 0;
  jest.spyOn(Date, "now").mockImplementation(() => realNow() + skew);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("shows nothing but an empty announcer when nothing is waiting", async () => {
  render(<PendingSyncBadge />);
  await act(() => outboxReady());
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

it('a collapsed "Pending sync (N)" chip opens to say why each entry waits; Sync now sends them', async () => {
  // Two mark-outs that got no answer: both wait (the first one's backoff is not due).
  postOut.mockRejectedValueOnce(networkError());
  await submitOrQueue(outEvent("a"));
  await submitOrQueue(outEvent("b"));

  render(<PendingSyncBadge autoSync={false} />);
  const chip = await screen.findByRole("button", { name: /Pending sync \(2\)/ });
  expect(chip).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("button", { name: /Sync now/ })).not.toBeInTheDocument();

  openPanel();
  expect(chip).toHaveAttribute("aria-expanded", "true");
  const waiting = screen.getByRole("region", { name: "Waiting to sync" });
  expect(within(waiting).getByText("No answer from the server yet: retrying")).toBeInTheDocument();
  expect(within(waiting).getByText("Waiting to send")).toBeInTheDocument();

  postOut.mockResolvedValue({ id: 1 });
  fireEvent.click(screen.getByRole("button", { name: /Sync now/ }));
  await waitFor(() => expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument());
  expect(postOut.mock.calls.map(([p]) => p.clientEventId)).toEqual(["a", "a", "b"]);
});

it("says what the server answered while it keeps retrying", async () => {
  postOut.mockRejectedValueOnce(httpError(503, { message: "Service Unavailable" }));
  await submitOrQueue(outEvent("a"));
  render(<PendingSyncBadge autoSync={false} />);
  await screen.findByRole("button", { name: /Pending sync \(1\)/ });
  openPanel();
  expect(screen.getByText("The server answered 503: retrying")).toBeInTheDocument();
});

it("sends what was queued offline as soon as the device is back online", async () => {
  await queueOffline(outEvent("a"));
  online = false;
  render(<PendingSyncBadge />);
  await screen.findByRole("button", { name: /Pending sync \(1\)/ });
  openPanel();
  expect(screen.getByText("Offline: sends when you are back online")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Sync now/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Retry now/ })).toBeDisabled();

  postOut.mockResolvedValue({ id: 1 });
  online = true;
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  await waitFor(() => expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument());
  expect(postOut).toHaveBeenCalledTimes(1);
});

it("Retry now sends one entry; Discard asks first and then never sends it", async () => {
  await queueOffline(outEvent("a"));
  await queueOffline(countEvent("c1"));
  render(<PendingSyncBadge autoSync={false} />);
  await screen.findByRole("button", { name: /Pending sync \(2\)/ });
  openPanel();

  postOut.mockResolvedValue({ id: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Retry now: Mark out · 1 line" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Pending sync \(1\)/ })).toBeInTheDocument());
  expect(getOutboxStatus("out_post", "a")).toBe("sent");

  fireEvent.click(screen.getByRole("button", { name: "Discard Count #31 · 1 line" }));
  expect(screen.getByText("Discard it? It will not be sent.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Keep" }));
  expect(getOutboxStatus("count_lines", "c1")).toBe("pending");

  fireEvent.click(screen.getByRole("button", { name: "Discard Count #31 · 1 line" }));
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  await waitFor(() => expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument());
  expect(getOutboxStatus("count_lines", "c1")).toBe("dismissed");
  await act(() => flush({ force: true }));
  expect(saveCountLines).not.toHaveBeenCalled();
});

it("a refusal while the page is open opens the panel, is announced, links back, and is discarded only after a confirm", async () => {
  await queueOffline(countEvent("c1"));
  saveCountLines.mockRejectedValue(conflict());

  render(<PendingSyncBadge />);
  expect(await screen.findByText("1 entry was not recorded")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /1 not recorded/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Not recorded: Count #31 · 1 line. This count was already submitted"
  );
  const failed = screen.getByRole("region", { name: "Not recorded" });
  expect(within(failed).getByText("Count")).toBeInTheDocument();
  expect(within(failed).getByText("This count was already submitted")).toBeInTheDocument();
  expect(within(failed).getByRole("link", { name: "Open Count #31 · 1 line" })).toHaveAttribute(
    "href",
    "/dashboard/buyer/inventory/counts/31"
  );
  expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument();

  fireEvent.click(within(failed).getByRole("button", { name: "Discard Count #31 · 1 line" }));
  expect(screen.getByText("Discard it? It was not recorded and will not be sent.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  await waitFor(() => expect(screen.queryByText(/not recorded/)).not.toBeInTheDocument());
  expect(getOutboxStatus("count_lines", "c1")).toBe("dismissed");
  expect(saveCountLines).toHaveBeenCalledTimes(1);
});

it("a refusal stored before the page loaded shows in the chip without opening or announcing", async () => {
  await queueOffline(countEvent("c1"));
  saveCountLines.mockRejectedValue(conflict());
  await flush();
  await _resetOutboxForTests(); // a later page load

  render(<PendingSyncBadge autoSync={false} />);
  const chip = await screen.findByRole("button", { name: /1 not recorded/ });
  expect(chip).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

it("says when an entry is kept on this page only", async () => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  globalThis.indexedDB = undefined;
  await queueOffline(outEvent("a"));
  online = false;
  render(<PendingSyncBadge autoSync={false} />);
  await screen.findByRole("button", { name: /Pending sync \(1\)/ });
  openPanel();
  expect(screen.getByText(/Kept on this page only: this browser could not save one entry on the device/)).toBeInTheDocument();
});

it("an entry given up on after days without an answer reads as maybe recorded: open it to check, or send it again", async () => {
  // A mark-out retried for almost 3 days with no answer.
  const now = Date.now();
  await putRaw({
    id: "out_post:a", kind: "out_post", clientEventId: "a", userId: "407", payload: outEvent("a").payload,
    summary: "Mark out · 1 line", seq: 1, createdAt: new Date(now).toISOString(), createdAtMs: now,
    status: "pending", inFlight: false, attempts: 700, serverAttempts: 0, nextAttemptAt: 0,
    lastError: { httpStatus: null, code: null, details: {}, message: "No answer from the server" },
    noAnswerTries: 700, lastNoAnswerTryAtMs: now, noAnswerRetryingMs: NO_ANSWER_GIVE_UP_MS - 60000, mayBeRecorded: true,
  });
  postOut.mockRejectedValue(networkError());
  render(<PendingSyncBadge autoSync={false} />);
  await screen.findByRole("button", { name: /Pending sync \(1\)/ });

  // A try got no answer: the server may have it, so Discard says so.
  openPanel();
  fireEvent.click(screen.getByRole("button", { name: "Discard Mark out · 1 line" }));
  expect(
    screen.getByText("Discard it? It may already have been recorded; this device will stop sending it.")
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Keep" }));

  skew += NO_ANSWER_GAP_CAP_MS;
  await act(() => flush());

  expect(await screen.findByText("1 entry may not have been recorded")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /1 may not be recorded/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByText(/not recorded\b/)).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "May not have been recorded: Mark out · 1 line. Open it to check, or send it again."
  );
  const unsure = screen.getByRole("region", { name: "May not have been recorded" });
  expect(within(unsure).getByText("May not have been recorded: open it to check, or send it again.")).toBeInTheDocument();
  expect(within(unsure).getByText("No answer from the server over 3 days of retrying")).toBeInTheDocument();
  expect(within(unsure).getByRole("link", { name: "Open Mark out · 1 line" })).toHaveAttribute(
    "href",
    "/dashboard/buyer/inventory/out?hotelId=46"
  );

  fireEvent.click(within(unsure).getByRole("button", { name: "Discard Mark out · 1 line" }));
  expect(screen.getByText("Discard it? It may already have been recorded; it will not be sent again.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  await waitFor(() => expect(screen.queryByText(/may not/)).not.toBeInTheDocument());
  expect(getOutboxStatus("out_post", "a")).toBe("dismissed");
});
