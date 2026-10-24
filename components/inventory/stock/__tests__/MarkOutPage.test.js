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
    canRead: true, canCreate: mockCanCreate, canUpdate: true, canApprove: true, loading: false, hasPermission: () => true,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  postOut: jest.fn(),
  resolveScan: jest.fn(),
}));
jest.mock("@/services/rbac", () => ({ __esModule: true, getDepartments: jest.fn() }));
jest.mock("@/components/inventory/offline/outbox", () => ({
  __esModule: true,
  submitOrQueue: jest.fn(),
  usePendingCount: () => 0,
}));

let mockQuery = {};
let mockMobile = false;
let mockCanCreate = true;
const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getStock, postOut, resolveScan } from "@/services/inventory";
import { getDepartments } from "@/services/rbac";
import { submitOrQueue } from "@/components/inventory/offline/outbox";
import MarkOutPage from "../MarkOutPage";
import { loadOutSession, clearOutSession } from "../outSession";

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

beforeEach(async () => {
  jest.clearAllMocks();
  mockQuery = {};
  mockMobile = false;
  mockCanCreate = true;
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
    expect(await screen.findByText("Stock is frozen while count CNT/46/2026-27/00002 is open")).toBeInTheDocument();
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

  test("a dropped connection keeps the session and its key", async () => {
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    const dropped = new Error("Network Error");
    dropped.isAxiosError = true;
    postOut.mockRejectedValueOnce(dropped).mockResolvedValueOnce(outDoc());
    fireEvent.click(postButton());
    expect(await screen.findByText(/connection dropped/i)).toBeInTheDocument();
    fireEvent.click(postButton());
    await waitFor(() => expect(postOut).toHaveBeenCalledTimes(2));
    expect(postOut.mock.calls[1][0].clientEventId).toBe(postOut.mock.calls[0][0].clientEventId);
    expect(await screen.findByText("OUT/46/2026-27/00007")).toBeInTheDocument();
  });

  test("a queued post says it is saved on this device", async () => {
    submitOrQueue.mockResolvedValue({ queued: true });
    render(<MarkOutPage />);
    await scan("RICE-6PK");
    await qtyOf("Basmati rice");
    await chooseDepartment("7");
    fireEvent.click(postButton());
    expect(await screen.findByText(/Saved on this device/)).toBeInTheDocument();
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
