// Site-rep receive page (/receive/token?t=…): a person with no account opens
// the buyer's emailed link on a phone, scans or types what arrived and posts
// a goods receipt. services/inventory is mocked for the page tests; the last
// suite loads the real token client and real axios to pin what goes on the
// wire.

const mockRouter = {
  pathname: "/receive/token",
  asPath: "/receive/token",
  query: {},
  isReady: true,
  replace: jest.fn(() => Promise.resolve(true)),
  push: jest.fn(),
};
let mockMobile = false;

jest.mock("next/router", () => ({ __esModule: true, useRouter: () => mockRouter }));
jest.mock("next/head", () => ({ __esModule: true, default: ({ children }) => <>{children}</> }));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => function MockCamera() { return <div data-testid="camera" />; },
}));
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  Object.assign(toast, { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), warning: jest.fn(), dismiss: jest.fn() });
  return { __esModule: true, toast };
});
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
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getTokenReceiveContext: jest.fn(),
  postTokenGrn: jest.fn(),
  uploadTokenGrnAttachment: jest.fn(),
  resolveScan: jest.fn(),
  getReceiveContext: jest.fn(),
  createGrn: jest.fn(),
  postGrn: jest.fn(),
}));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import {
  getTokenReceiveContext, postTokenGrn, uploadTokenGrnAttachment, resolveScan, getReceiveContext, createGrn, postGrn,
} from "@/services/inventory";
import TokenReceivePage from "../TokenReceivePage";

const TOKEN = "Zk3pQ9wXr7Lm2Nv8Bt4Yc6Hd1Js5Fg0Ka-_Ue9Ti3Ro";
const KEY = "3f6c1d2e-8a4b-4c5d-9e7f-0a1b2c3d4e5f";

const RICE = {
  poLineId: 11, productVariantId: 501, productName: "Basmati rice 25kg", unit: "bag",
  invItemId: 9, stockUom: "bag", uomFactor: 1, needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 24, openAtHotel: 24, maxAcceptable: 24, defaultMarkOutOnArrival: false,
  barcodes: [{ code: "RICE-6PK", packFactor: 6 }, { code: "8901234567892", packFactor: 1 }],
};
const PANEER = {
  poLineId: 12, productVariantId: 502, productName: "Paneer", unit: "kg",
  invItemId: 10, stockUom: "kg", uomFactor: 1, needsUomFactor: false, trackExpiry: true, minShelfLifeDays: 3,
  plannedAtHotel: 100, openAtHotel: 100, maxAcceptable: 100, defaultMarkOutOnArrival: false,
  barcodes: [{ code: "PANEER-1", packFactor: 1 }],
};
const SOAP = {
  poLineId: 13, productVariantId: 503, productName: "Dish soap", unit: "box",
  invItemId: 11, stockUom: "piece", uomFactor: null, needsUomFactor: true, trackExpiry: false, minShelfLifeDays: null,
  plannedAtHotel: 10, openAtHotel: 10, maxAcceptable: 10, defaultMarkOutOnArrival: false,
  barcodes: [{ code: "SOAP-12", packFactor: 12 }],
};

const FUTURE = "2099-01-01T06:30:00.000Z";
const PAST = "2001-01-01T06:30:00.000Z";

const ctx = (over = {}) => ({
  po: { id: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms", isCallOff: false, departmentId: 7 },
  hotel: { id: 46, name: "Orchid Mumbai" },
  hotelChoices: [{ id: 46, name: "Orchid Mumbai" }],
  lines: [RICE, PANEER, SOAP],
  dispatches: [],
  departments: [],
  itemSuggestions: {},
  draft: null,
  receivable: true,
  notReceivableReason: null,
  linkExpiresAt: FUTURE,
  receipts: [],
  ...over,
});

const receipt = (over = {}) => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", status: "posted", receivedAt: "2026-10-24",
  postedAt: "2026-10-24T09:00:00.000Z", lineCount: 2, attachments: [], ...over,
});

const postedGrn = (over = {}) => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", status: "posted", docType: "RECEIPT", poId: 52, hotelId: 46,
  receivedAt: "2026-10-24", receivedByTokenId: 77, lines: [{ poLineId: 11 }, { poLineId: 12 }], attachments: [],
  warnings: [], ...over,
});

const apiError = (status, body, headers = {}) => {
  const err = new Error(`Request failed with status code ${status}`);
  err.isAxiosError = true;
  err.response = { status, data: body, headers };
  return err;
};
const networkError = () => {
  const err = new Error("Network Error");
  err.isAxiosError = true;
  err.code = "ERR_NETWORK";
  return err;
};

const openLink = (search = `?t=${TOKEN}`) => {
  window.history.replaceState({}, "", `/receive/token${search}`);
  mockRouter.asPath = `/receive/token${search}`;
};

const mount = async (context = ctx()) => {
  getTokenReceiveContext.mockResolvedValue(context);
  const view = render(<TokenReceivePage />);
  await screen.findByText("PO/2026/0052");
  return view;
};

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const postAndConfirm = async () => {
  fireEvent.click(screen.getAllByRole("button", { name: /Post receipt/ })[0]);
  const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
  // The post, its uploads and the refetch all settle inside act.
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm and post" }));
  });
  return dialog;
};

const scan = (code) => {
  const box = screen.getByLabelText("Scan or type a code");
  fireEvent.change(box, { target: { value: code } });
  fireEvent.keyDown(box, { key: "Enter" });
};

/** Every word and attribute the page shows, for the "no prices" sweep. */
const everythingShown = () => {
  const parts = [document.body.textContent];
  for (const el of document.querySelectorAll("*")) {
    for (const attr of el.attributes) parts.push(attr.value);
  }
  return parts.join("\n");
};
const PRICE_WORDS = /\b(prices?|rates?|values?|gst|costs?|amounts?|totals?|tax(es)?|discounts?|freight)\b|₹|\bINR\b|\bRs\.?\s*\d/i;

let consoleSpies = [];
let idbOpen;

beforeEach(() => {
  jest.clearAllMocks();
  mockMobile = false;
  mockRouter.replace.mockImplementation(() => Promise.resolve(true));
  window.sessionStorage.clear();
  window.localStorage.clear();
  openLink();
  idbOpen = jest.fn();
  window.indexedDB = { open: idbOpen };
  consoleSpies = ["log", "info", "warn", "error", "debug"].map((m) => jest.spyOn(console, m));
  postTokenGrn.mockResolvedValue(postedGrn());
  uploadTokenGrnAttachment.mockResolvedValue({ id: 31, fileName: "challan.jpg", kind: "CHALLAN", url: "https://bucket.s3.ap-south-1.amazonaws.com/grn/challan.jpg" });
});

afterEach(() => {
  consoleSpies.forEach((s) => s.mockRestore());
  delete window.indexedDB;
});

/** The token never reaches localStorage, IndexedDB or a log line. */
const expectTokenContained = () => {
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    expect(`${k}=${window.localStorage.getItem(k)}`).not.toContain(TOKEN);
  }
  expect(idbOpen).not.toHaveBeenCalled();
  for (const spy of consoleSpies) {
    for (const call of spy.mock.calls) {
      expect(call.map((a) => (typeof a === "string" ? a : JSON.stringify(a) || String(a))).join(" ")).not.toContain(TOKEN);
    }
  }
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const k = window.sessionStorage.key(i);
    if (k !== "inv.receiveToken") expect(window.sessionStorage.getItem(k)).not.toContain(TOKEN);
  }
};

describe("TokenReceivePage", () => {
  test("token page strips token from URL and posts GRN", async () => {
    // A legacy link arrives through the next.config redirect with its old params forwarded.
    openLink(`?t=${TOKEN}&rfq=7&po=52&token=${TOKEN}`);
    let urlAtFirstCall = null;
    getTokenReceiveContext.mockImplementation(() => {
      urlAtFirstCall = window.location.href;
      return Promise.resolve(ctx());
    });
    postTokenGrn.mockResolvedValue(postedGrn({
      warnings: [{ poLineId: 12, code: "SHORT_SHELF_LIFE", message: "2 days of shelf life left (minimum 3)" }],
    }));
    render(<TokenReceivePage />);
    await screen.findByText("PO/2026/0052");

    // Out of the address bar (and Next's router state) before the first request.
    expect(urlAtFirstCall).not.toBeNull();
    expect(urlAtFirstCall).not.toContain(TOKEN);
    expect(window.location.search).toBe("");
    expect(window.location.href).not.toContain(TOKEN);
    expect(window.history.state?.as).toBe("/receive/token");
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: "/receive/token" }, undefined, { shallow: true });
    expect(getTokenReceiveContext).toHaveBeenCalledWith(TOKEN);
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBe(TOKEN);

    expect(screen.getByText("Fresh Farms")).toBeInTheDocument();
    expect(screen.getByTestId("receiving-hotel")).toHaveTextContent("Orchid Mumbai");

    type("Received qty for Basmati rice 25kg", "6");
    type("Received qty for Paneer", "10");
    type("Rejected qty for Paneer", "2");
    fireEvent.change(screen.getByLabelText("Rejection reason for Paneer"), { target: { value: "damaged" } });
    type("Expiry date for Paneer", "2026-10-27");
    type("Batch for Paneer", "B-77");
    await postAndConfirm();

    await screen.findByText("Receipt posted");
    expect(postTokenGrn).toHaveBeenCalledTimes(1);
    const [tok, body] = postTokenGrn.mock.calls[0];
    expect(tok).toBe(TOKEN);
    expect(body).toMatchObject({ post: true, receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(body.clientEventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    // The link's PO and hotel come from the token; a link never maps, converts or marks out.
    expect(body).not.toHaveProperty("hotelId");
    expect(body).not.toHaveProperty("poId");
    expect(body).not.toHaveProperty("markOutOnArrival");
    expect(body.lines).toEqual([
      expect.objectContaining({ poLineId: 11, receivedQty: 6, acceptedQty: 6, rejectedQty: 0 }),
      expect.objectContaining({
        poLineId: 12, receivedQty: 10, acceptedQty: 8, rejectedQty: 2, rejectionReason: "damaged",
        batchNo: "B-77", expiryDate: "2026-10-27",
      }),
    ]);
    for (const line of body.lines) {
      expect(Object.keys(line)).not.toEqual(expect.arrayContaining(["uomFactor"]));
      expect(line).not.toHaveProperty("mapToInvItemId");
      expect(line).not.toHaveProperty("markOutDepartmentId");
      expect(line).not.toHaveProperty("markOutOnArrival");
    }

    // GRN number and the non-blocking warnings; then the context is fetched again.
    expect(screen.getByText("GRN/46/2026-27/00012", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("2 days of shelf life left (minimum 3)")).toBeInTheDocument();
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));
    expect(window.sessionStorage.getItem("inv.receiveDraft:52")).toBeNull();
    // Nothing in the token path ever touches the buyer routes.
    expect(resolveScan).not.toHaveBeenCalled();
    expect(getReceiveContext).not.toHaveBeenCalled();
    expect(createGrn).not.toHaveBeenCalled();
    expect(postGrn).not.toHaveBeenCalled();
    expectTokenContained();
  });

  test("token page renders no price columns", async () => {
    // Even if a priced key slipped into the payload, the page has nowhere to show it.
    const leaky = (l) => ({ ...l, costPerPoUnit: 4321.77, unitPrice: 98765.43, gstPercent: 18 });
    const context = ctx({
      lines: [leaky(RICE), leaky(PANEER), leaky(SOAP)],
      dispatches: [{
        id: 5, dispatchNumber: "DSP/46/2026-27/00003", challanNo: "CH-9", challanDate: "2026-10-23",
        expectedDeliveryDate: "2026-10-24", lines: [{ poLineId: 11, qty: 6 }],
      }],
      receipts: [receipt({ attachments: [{ id: 3, fileName: "challan.pdf", kind: "CHALLAN", url: "https://bucket.s3.ap-south-1.amazonaws.com/a.pdf" }] })],
    });

    for (const phone of [false, true]) {
      mockMobile = phone;
      const view = await mount(context);
      if (!phone) {
        expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual(
          ["#", "Item", "Open", "Received", "Accepted", "Rejected"]
        );
        type("Received qty for Basmati rice 25kg", "6");
        type("Rejected qty for Basmati rice 25kg", "1");
        fireEvent.change(screen.getByLabelText("Rejection reason for Basmati rice 25kg"), { target: { value: "damaged" } });
        fireEvent.click(screen.getAllByRole("button", { name: /Post receipt/ })[0]);
        await screen.findByRole("dialog", { name: "Post this receipt?" });
      } else {
        expect(screen.getAllByTestId("receive-card").length).toBeGreaterThan(0);
        // MobileActionBar portals to <body> from an effect, a tick after the cards.
        expect(await screen.findByRole("region", { name: "Receive actions" })).toBeInTheDocument();
      }

      const shown = everythingShown();
      expect(shown).not.toMatch(PRICE_WORDS);
      expect(shown).not.toMatch(/4,?321|98,?765/);
      // No mark-out toggle, no unit-conversion prompt, no buyer links.
      // (C1's phone card titles its fold "Reject or mark out" whatever allowMarkOut
      // says; reported to C1. What matters is that there is nothing to mark out with.)
      expect(shown).not.toMatch(/mark out on arrival/i);
      expect(screen.queryByRole("checkbox", { name: /mark out/i })).toBeNull();
      expect(screen.queryByLabelText(/^Department for/)).toBeNull();
      expect(screen.queryByRole("button", { name: /set unit conversion/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /awaiting|view grn|open po/i })).toBeNull();
      view.unmount();
    }
  });

  test("expired token shows the expired message", async () => {
    getTokenReceiveContext.mockRejectedValue(apiError(401, { status: 0, message: "Invalid or expired link" }));
    const view = render(<TokenReceivePage />);
    expect(await screen.findByText("This receiving link has expired. Ask the buyer for a new one.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Scan or type a code")).toBeNull();
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBeNull();
    expect(window.location.search).toBe("");
    view.unmount();

    // A link that dies while the rep is entering a delivery: the post answers 401.
    openLink();
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(apiError(401, { status: 0, message: "Invalid or expired link" }));
    await postAndConfirm();
    expect(await screen.findByText("This receiving link has expired. Ask the buyer for a new one.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBeNull();
    expect(window.sessionStorage.getItem("inv.receiveDraft:52")).toBeNull();
  });

  test("a link opened again in the same tab reads the token from sessionStorage", async () => {
    window.sessionStorage.setItem("inv.receiveToken", TOKEN);
    openLink("");
    await mount();
    expect(getTokenReceiveContext).toHaveBeenCalledWith(TOKEN);
  });

  test("no token at all asks for the link again, with no request", async () => {
    openLink("");
    render(<TokenReceivePage />);
    expect(await screen.findByText(/Open the receiving link from your email again/)).toBeInTheDocument();
    expect(getTokenReceiveContext).not.toHaveBeenCalled();
  });

  test("429 reads Retry-After and says how long to wait", async () => {
    getTokenReceiveContext.mockRejectedValueOnce(apiError(429, {
      status: 0, code: "RATE_LIMITED", message: "Too many requests from this link. Please wait a few minutes and try again.",
    }, { "retry-after": "250" }));
    getTokenReceiveContext.mockResolvedValueOnce(ctx());
    render(<TokenReceivePage />);
    expect(await screen.findByText("Too many requests, try again in 5 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("PO/2026/0052")).toBeInTheDocument();

    // On a post: the message on the form, and the entries stay.
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(apiError(429, { status: 0, code: "RATE_LIMITED", message: "Too many" }, { "retry-after": "60" }));
    await postAndConfirm();
    expect(await screen.findByText("Too many requests, try again in 1 min")).toBeInTheDocument();
    expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("6");
  });

  test("a hotel-less legacy link (409 TOKEN_NO_HOTEL) asks for a new link", async () => {
    getTokenReceiveContext.mockRejectedValue(apiError(409, {
      status: 0, code: "CONFLICT", details: { reason: "TOKEN_NO_HOTEL" },
      message: "This link isn't tied to a hotel. Ask the buyer to send you a new link.",
    }));
    render(<TokenReceivePage />);
    expect(await screen.findByText("This link isn't tied to a hotel. Ask the buyer to send you a new link.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
  });

  test.each([
    ["received", "Everything on this order has been received"],
    ["closed_short", "This order was closed"],
    ["not_ready", "This order can't be received yet"],
  ])("receivable:false (%s) says why, and offers paperwork on the link's receipts", async (reason, message) => {
    await mount(ctx({
      receivable: false, notReceivableReason: reason, lines: [], dispatches: [],
      receipts: [receipt()],
    }));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByLabelText("Scan or type a code")).toBeNull();
    expect(screen.queryByRole("button", { name: /Post receipt/ })).toBeNull();
    expect(screen.getByText("GRN/46/2026-27/00012")).toBeInTheDocument();
    expect(screen.getByLabelText("Upload paperwork for GRN/46/2026-27/00012")).toBeInTheDocument();
  });

  test("Attach paperwork uploads to the link's receipt until the link expires", async () => {
    const view = await mount(ctx({ receipts: [receipt()] }));
    const file = new File(["x"], "challan.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Paperwork type for GRN/46/2026-27/00012"), { target: { value: "INVOICE" } });
    fireEvent.change(screen.getByLabelText("Upload paperwork for GRN/46/2026-27/00012"), { target: { files: [file] } });
    await waitFor(() => expect(uploadTokenGrnAttachment).toHaveBeenCalledWith(TOKEN, 900, file, "INVOICE"));
    expect(await screen.findByRole("link", { name: "challan.jpg" })).toHaveAttribute("rel", "noopener noreferrer");
    view.unmount();

    await mount(ctx({ linkExpiresAt: PAST, receipts: [receipt()] }));
    expect(screen.getByText("GRN/46/2026-27/00012")).toBeInTheDocument();
    expect(screen.queryByLabelText("Upload paperwork for GRN/46/2026-27/00012")).toBeNull();
  });

  test("a line that needs a unit conversion is shown disabled and never sent", async () => {
    await mount();
    expect(screen.getByText("Ask the buyer to set the unit conversion for Dish soap first")).toBeInTheDocument();
    expect(screen.queryByLabelText("Received qty for Dish soap")).toBeNull();

    scan("SOAP-12");
    expect(await screen.findByText("Ask the buyer to set the unit conversion for Dish soap first", { selector: "[role=status] *" })).toBeInTheDocument();

    type("Received qty for Basmati rice 25kg", "2");
    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[0][1].lines.map((l) => l.poLineId)).toEqual([11]);
  });

  test("scans match the order's own barcodes locally; an unknown code is not on this order", async () => {
    await mount();
    scan("RICE-6PK");
    await waitFor(() => expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("6"));
    scan("8901234567892");
    await waitFor(() => expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("7"));
    expect(toast).toHaveBeenCalled();

    scan("NOT-ON-PO-1");
    expect(await screen.findByText("This code isn't on this order")).toBeInTheDocument();
    expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("7");

    // A weighed unit opens the keypad instead of counting one.
    scan("PANEER-1");
    const pad = await screen.findByRole("dialog", { name: "Paneer" });
    expect(pad).toBeInTheDocument();
    expect(resolveScan).not.toHaveBeenCalled();
  });

  test("a dropped connection keeps the entries in sessionStorage and Retry replays the same clientEventId", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(networkError());
    await postAndConfirm();

    expect(await screen.findByText(/The connection dropped before the server answered/)).toBeInTheDocument();
    const saved = JSON.parse(window.sessionStorage.getItem("inv.receiveDraft:52"));
    const firstKey = postTokenGrn.mock.calls[0][1].clientEventId;
    expect(saved).toMatchObject({ clientEventId: firstKey, unsent: true });
    expect(saved.entries["11"].received).toBe("6");
    expect(JSON.stringify(saved)).not.toContain(TOKEN);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    await screen.findByText("Receipt posted");
    expect(postTokenGrn).toHaveBeenCalledTimes(2);
    expect(postTokenGrn.mock.calls[1][1].clientEventId).toBe(firstKey);
    expect(window.sessionStorage.getItem("inv.receiveDraft:52")).toBeNull();
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));
    expectTokenContained();
  });

  test("after a reload, an unsent receipt comes back with its key and a Retry", async () => {
    window.sessionStorage.setItem("inv.receiveToken", TOKEN);
    window.sessionStorage.setItem("inv.receiveDraft:52", JSON.stringify({
      v: 1, savedAt: Date.now(), clientEventId: KEY, unsent: true,
      header: { vendorChallanNo: "CH-9" },
      entries: { 11: { received: "6", rejected: "", reason: "" } },
    }));
    openLink("");
    await mount();
    expect(screen.getByLabelText("Received qty for Basmati rice 25kg")).toHaveValue("6");
    expect(screen.getByLabelText("Challan no.")).toHaveValue("CH-9");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[0][1]).toMatchObject({ clientEventId: KEY, vendorChallanNo: "CH-9" });
  });

  test("409 on the clientEventId shows the message and starts a fresh session", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(apiError(409, {
      status: 0, code: "CONFLICT", details: { field: "clientEventId" }, message: "This scan session belongs to another receipt",
    }));
    await postAndConfirm();
    expect(await screen.findByText(/This scan session belongs to another receipt/)).toBeInTheDocument();
    const first = postTokenGrn.mock.calls[0][1].clientEventId;

    await postAndConfirm();
    await screen.findByText("Receipt posted");
    const second = postTokenGrn.mock.calls[1][1].clientEventId;
    expect(second).not.toBe(first);
  });

  test.each([
    ["UOM_FACTOR_REQUIRED", "Ask the buyer to set the unit conversion for Basmati rice 25kg first", { field: "uomFactor", index: 0 }],
    ["MARK_OUT_NOT_ALLOWED", "Mark-out isn't available from a receive link", { field: "markOutDepartmentId", index: 0 }],
    ["MAPPING_NOT_ALLOWED", "Only the buyer can link a line to a stock item", { field: "mapToInvItemId", index: 0 }],
  ])("%s is shown on its line", async (codeDetail, message, extra) => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(apiError(400, {
      status: 2, code: "VALIDATION", message, details: { code_detail: codeDetail, poLineId: 11, ...extra },
    }));
    await postAndConfirm();
    const msg = await screen.findByText(message);
    expect(msg.closest("tbody")).toHaveTextContent("Basmati rice 25kg");
  });

  test("OVER_RECEIPT names the max on the line; a header-level refusal goes on the form", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "30");
    postTokenGrn.mockRejectedValueOnce(apiError(409, {
      status: 0, code: "OVER_RECEIPT", message: "Over", details: { poLineId: 11, maxAcceptable: 24, requested: 30 },
    }));
    await postAndConfirm();
    expect(await screen.findByText("Max acceptable 24 bag at this hotel; this receipt has 30")).toBeInTheDocument();

    postTokenGrn.mockRejectedValueOnce(apiError(400, {
      status: 2, code: "VALIDATION", message: "Mark-out isn't available from a receive link",
      details: { code_detail: "MARK_OUT_NOT_ALLOWED", field: "markOutOnArrival" },
    }));
    type("Received qty for Basmati rice 25kg", "6");
    await postAndConfirm();
    expect(await screen.findByText("Mark-out isn't available from a receive link")).toBeInTheDocument();
  });

  test("a receipt refused because the order is done shows the reason after a refresh", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    getTokenReceiveContext.mockResolvedValueOnce(ctx({ receivable: false, notReceivableReason: "received", lines: [], receipts: [receipt()] }));
    postTokenGrn.mockRejectedValueOnce(apiError(409, {
      status: 0, code: "CONFLICT", message: "Nothing left", details: { reason: "PO_NOT_RECEIVABLE", receiptStatus: "received" },
    }));
    await postAndConfirm();
    expect(await screen.findByText("Everything on this order has been received")).toBeInTheDocument();
  });

  test("files chosen before posting upload to the new receipt", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    const file = new File(["x"], "challan.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [file] } });
    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(uploadTokenGrnAttachment).toHaveBeenCalledWith(TOKEN, 900, file, "CHALLAN");
  });

  test("phone layer: the scan dock sticks to the top of a page with no shell bar", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "TokenReceivePage.module.scss"), "utf8");
    const layer = css.slice(css.indexOf("Phone layer"));
    expect(layer).toMatch(/@media \(max-width: 768px\)/);
    expect(layer).toMatch(/\.scanDock\s*{[^}]*position:\s*sticky;[^}]*top:\s*0;/);
    expect(layer).toMatch(/\.page\s*{[^}]*overflow-x:\s*clip;/);
    expect(css).not.toMatch(/margin:\s*-/);
  });
});

describe("token client on the wire", () => {
  test("sends only X-Receive-Token (no buyer JWT or hotel headers), and a 401 rejects without the session modal", async () => {
    window.localStorage.setItem("token", "buyer-jwt");
    window.localStorage.setItem("hospitality_context_selection", JSON.stringify({ companyId: 5, hotelId: 46 }));
    const sent = [];
    let reply = (config) => Promise.resolve({
      data: { status: 1, message: "ok", data: { po: { id: 52 } } }, status: 200, statusText: "OK", headers: {}, config,
    });
    let svc;
    let shared;
    jest.isolateModules(() => {
      const realAxios = jest.requireActual("axios");
      const ax = realAxios.default || realAxios;
      ax.defaults.adapter = (config) => {
        sent.push(config);
        return reply(config);
      };
      svc = jest.requireActual("@/services/inventory");
      shared = jest.requireActual("@/lib/axios").default;
    });

    const headersOf = (config) => {
      const h = typeof config.headers?.toJSON === "function" ? config.headers.toJSON() : config.headers;
      return Object.fromEntries(Object.entries(h || {}).map(([k, v]) => [k.toLowerCase(), v]));
    };

    await expect(svc.getTokenReceiveContext("tok-wire")).resolves.toEqual({ po: { id: 52 } });
    const tokenReq = headersOf(sent[0]);
    expect(sent[0].url).toBe("/inventory/token/receive-context");
    expect(tokenReq["x-receive-token"]).toBe("tok-wire");
    expect(tokenReq).not.toHaveProperty("authorization");
    expect(tokenReq).not.toHaveProperty("x-hospitality-company");
    expect(tokenReq).not.toHaveProperty("x-hospitality-hotel");
    expect(sent[0].withCredentials).toBeFalsy();

    // Control: the shared buyer client on the same axios does attach the JWT,
    // so the assertions above would catch a token call moved onto it.
    await shared.get("/inventory/whatever");
    expect(headersOf(sent[1]).authorization).toBe("Bearer buyer-jwt");

    await svc.postTokenGrn("tok-wire", { clientEventId: KEY, lines: [] });
    expect(headersOf(sent[2])["x-receive-token"]).toBe("tok-wire");
    expect(headersOf(sent[2])).not.toHaveProperty("authorization");

    reply = (config) => {
      const err = new Error("Request failed with status code 401");
      err.isAxiosError = true;
      err.config = config;
      err.response = { status: 401, statusText: "Unauthorized", headers: {}, config, data: { status: 0, message: "Invalid or expired link" } };
      return Promise.reject(err);
    };
    await expect(svc.getTokenReceiveContext("tok-wire")).rejects.toMatchObject({ response: { status: 401 } });
    expect(document.getElementById("session-expired-root")).toBeNull();
    expect(window.localStorage.getItem("token")).toBe("buyer-jwt");
  });
});
