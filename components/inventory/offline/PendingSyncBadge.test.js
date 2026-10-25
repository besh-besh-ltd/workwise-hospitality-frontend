// The sync dock over the real outbox (in memory: jsdom has no IndexedDB).
let mockProfile = { id: 407 };
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: mockProfile }) },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  createGrn: jest.fn(),
  postOut: jest.fn(),
  saveCountLines: jest.fn(),
}));

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { postOut, saveCountLines } from "@/services/inventory";
import { _resetOutboxForTests, submitOrQueue } from "./outbox";
import PendingSyncBadge from "./PendingSyncBadge";

let online = true;
Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });

const networkError = () => Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK", request: {} });
const outEvent = (key) => ({
  kind: "out_post",
  clientEventId: key,
  payload: { hotelId: 46, docType: "OUT", departmentId: 3, clientEventId: key, lines: [{ invItemId: 8, qty: 2 }] },
  send: (p) => postOut(p),
});

beforeEach(async () => {
  await _resetOutboxForTests();
  online = true;
  mockProfile = { id: 407 };
  jest.resetAllMocks();
});

it("renders nothing when nothing is waiting", () => {
  const { container } = render(<PendingSyncBadge />);
  expect(container).toBeEmptyDOMElement();
});

it('shows "Pending sync (N)" and Sync now sends the waiting events', async () => {
  // Two mark-outs that got no answer: both wait (the first one's backoff is not due).
  postOut.mockRejectedValueOnce(networkError());
  await submitOrQueue(outEvent("a"));
  await submitOrQueue(outEvent("b"));

  render(<PendingSyncBadge />);
  expect(await screen.findByText("Pending sync (2)")).toBeInTheDocument();

  postOut.mockResolvedValue({ id: 1 });
  fireEvent.click(screen.getByRole("button", { name: /Sync now/ }));
  await waitFor(() => expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument());
  expect(postOut.mock.calls.map(([p]) => p.clientEventId)).toEqual(["a", "a", "b"]);
});

it("sends what was queued offline as soon as the device is back online", async () => {
  online = false;
  await submitOrQueue(outEvent("a"));
  render(<PendingSyncBadge />);
  expect(await screen.findByText("Pending sync (1)")).toBeInTheDocument();
  expect(screen.getByText(/Offline/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Sync now/ })).toBeDisabled();

  postOut.mockResolvedValue({ id: 1 });
  online = true;
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  await waitFor(() => expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument());
  expect(postOut).toHaveBeenCalledTimes(1);
});

it("lists an entry the server refused, with its message, until dismissed", async () => {
  online = false;
  await submitOrQueue({
    kind: "count_lines",
    clientEventId: "c1",
    payload: { countId: 31, lines: [{ invItemId: 8, countedQty: 4, clientEventId: "l1" }] },
    send: jest.fn(),
  });
  online = true;
  saveCountLines.mockRejectedValue(
    Object.assign(new Error("Request failed with status code 409"), {
      isAxiosError: true,
      response: { status: 409, data: { status: 0, code: "CONFLICT", message: "This count was already submitted", details: { status: "submitted" } } },
    })
  );

  render(<PendingSyncBadge />);
  expect(await screen.findByText("1 entry was not recorded")).toBeInTheDocument();
  expect(screen.getByText("Count")).toBeInTheDocument();
  expect(screen.getByText("Count #31 · 1 line")).toBeInTheDocument();
  expect(screen.getByText("This count was already submitted")).toBeInTheDocument();
  expect(screen.queryByText(/Pending sync/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Dismiss Count #31 · 1 line" }));
  await waitFor(() => expect(screen.queryByText(/not recorded/)).not.toBeInTheDocument());
  expect(saveCountLines).toHaveBeenCalledTimes(1);
});
