// Site-rep receive page (/receive/token#t=…): a person with no account opens
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
// Components using the router re-render when it changes, as with Next's.
const mockRouterListeners = new Set();
let mockMobile = false;

jest.mock("next/router", () => {
  const { useEffect, useState } = jest.requireActual("react");
  return {
    __esModule: true,
    useRouter: () => {
      const [, setTick] = useState(0);
      useEffect(() => {
        const rerender = () => setTick((n) => n + 1);
        mockRouterListeners.add(rerender);
        return () => mockRouterListeners.delete(rerender);
      }, []);
      return mockRouter;
    },
  };
});
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
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import {
  getTokenReceiveContext, postTokenGrn, uploadTokenGrnAttachment, resolveScan, getReceiveContext, createGrn, postGrn,
} from "@/services/inventory";
import TokenReceivePage from "../TokenReceivePage";

const TOKEN = "Zk3pQ9wXr7Lm2Nv8Bt4Yc6Hd1Js5Fg0Ka-_Ue9Ti3Ro";
const OTHER_TOKEN = "Qq1wE2rT3yU4iO5pA6sD7fG8hJ9kL0zX-_cV1bN2m";
const KEY = "3f6c1d2e-8a4b-4c5d-9e7f-0a1b2c3d4e5f";
// The screen's draft, per PO and hotel.
const DRAFT = "inv.receiveDraft:52:46";

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

const openLink = (search = `#t=${TOKEN}`) => {
  window.history.replaceState({}, "", `/receive/token${search}`);
  mockRouter.asPath = `/receive/token${search}`;
};

/** Next's router changes (asPath) and the components using it re-render. */
const routerChanges = (asPath) => act(() => {
  mockRouter.asPath = asPath;
  mockRouterListeners.forEach((rerender) => rerender());
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

const retry = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  });
};

/** A dropped connection on the first post of 6 bags of rice; returns its key. */
const dropFirstPost = async () => {
  await mount();
  type("Received qty for Basmati rice 25kg", "6");
  postTokenGrn.mockRejectedValueOnce(networkError());
  await postAndConfirm();
  await screen.findByText(/The connection dropped before the server answered/);
  return postTokenGrn.mock.calls[0][1].clientEventId;
};

const riceQty = () => screen.getByLabelText("Received qty for Basmati rice 25kg");

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
  mockRouter.replace.mockImplementation(({ pathname }) => {
    mockRouter.asPath = pathname;
    return Promise.resolve(true);
  });
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
    // Focus moves to the outcome.
    expect(document.activeElement).toHaveTextContent("Receipt posted");
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
    // Nothing in the token path ever touches the buyer routes.
    expect(resolveScan).not.toHaveBeenCalled();
    expect(getReceiveContext).not.toHaveBeenCalled();
    expect(createGrn).not.toHaveBeenCalled();
    expect(postGrn).not.toHaveBeenCalled();
    expectTokenContained();
  });

  test("a new link carries its token in the #fragment: read first, stripped before any request", async () => {
    // #t= wins over ?t= and ?token=.
    openLink(`?t=${OTHER_TOKEN}&token=${OTHER_TOKEN}#t=${TOKEN}`);
    let urlAtFirstCall = null;
    getTokenReceiveContext.mockImplementation(() => {
      urlAtFirstCall = window.location.href;
      return Promise.resolve(ctx());
    });
    render(<TokenReceivePage />);
    await screen.findByText("PO/2026/0052");
    expect(getTokenReceiveContext).toHaveBeenCalledWith(TOKEN);
    expect(urlAtFirstCall).toBe("http://localhost/receive/token");
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("");
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBe(TOKEN);
  });

  test("when Next writes the link's URL back after the strip, the page strips it again", async () => {
    await mount();
    expect(window.location.href).toBe("http://localhost/receive/token");
    const replaces = mockRouter.replace.mock.calls.length;

    // Next's hydration replace lands after our strip and puts ?t= back.
    window.history.replaceState({ as: `/receive/token?t=${TOKEN}` }, "", `/receive/token?t=${TOKEN}`);
    routerChanges(`/receive/token?t=${TOKEN}`);

    await waitFor(() => expect(window.location.href).toBe("http://localhost/receive/token"));
    expect(window.history.state?.as).toBe("/receive/token");
    expect(mockRouter.replace.mock.calls.length).toBeGreaterThan(replaces);
    expect(mockRouter.asPath).toBe("/receive/token");
    // Still one context load: the strip asks the server nothing.
    expect(getTokenReceiveContext).toHaveBeenCalledTimes(1);
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
      expect(shown).not.toMatch(/mark out/i);
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
    expect(document.activeElement).toHaveTextContent("Link expired");
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
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
  });

  test("a link opened again in the same tab reads the token from sessionStorage", async () => {
    window.sessionStorage.setItem("inv.receiveToken", TOKEN);
    openLink("");
    await mount();
    expect(getTokenReceiveContext).toHaveBeenCalledWith(TOKEN);
  });

  test("a link with a different token drops this tab's drafts", async () => {
    window.sessionStorage.setItem("inv.receiveToken", OTHER_TOKEN);
    window.sessionStorage.setItem(DRAFT, JSON.stringify({
      v: 2, savedAt: Date.now(), clientEventId: KEY, unsent: true, header: {}, entries: { 11: { received: "6" } },
    }));
    openLink(`#t=${TOKEN}`);
    await mount();
    expect(getTokenReceiveContext).toHaveBeenCalledWith(TOKEN);
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
    expect(riceQty()).toHaveValue("");
    expect(riceQty()).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
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
    expect(document.activeElement).toHaveTextContent("Couldn't load this order");
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("PO/2026/0052")).toBeInTheDocument();

    // On a post the outcome is unknown: the entries stay, frozen, with Retry.
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(apiError(429, { status: 0, code: "RATE_LIMITED", message: "Too many" }, { "retry-after": "60" }));
    await postAndConfirm();
    expect(await screen.findByText(/Too many requests, try again in 1 min/)).toBeInTheDocument();
    expect(riceQty()).toHaveValue("6");
    expect(riceQty()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("a hotel-less legacy link (409 TOKEN_NO_HOTEL) asks for a new link and forgets the token", async () => {
    getTokenReceiveContext.mockRejectedValue(apiError(409, {
      status: 0, code: "CONFLICT", details: { reason: "TOKEN_NO_HOTEL" },
      message: "This link isn't tied to a hotel. Ask the buyer to send you a new link.",
    }));
    render(<TokenReceivePage />);
    expect(await screen.findByText("This link isn't tied to a hotel. Ask the buyer to send you a new link.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBeNull();
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

  test("a restored draft never brings back a line the link can't receive", async () => {
    window.sessionStorage.setItem("inv.receiveToken", TOKEN);
    window.sessionStorage.setItem(DRAFT, JSON.stringify({
      v: 2, savedAt: Date.now(), clientEventId: KEY, unsent: false, header: {},
      entries: { 11: { received: "2" }, 13: { received: "5", rejected: "", reason: "" } },
    }));
    openLink("");
    await mount();
    expect(screen.getByText("Restored the entries you had on this page before it reloaded.")).toBeInTheDocument();
    expect(riceQty()).toHaveValue("2");
    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[0][1].lines.map((l) => l.poLineId)).toEqual([11]);
    expect(postTokenGrn.mock.calls[0][1].clientEventId).toBe(KEY);
  });

  test("scans match the order's own barcodes locally; an unknown code is not on this order", async () => {
    await mount();
    scan("RICE-6PK");
    await waitFor(() => expect(riceQty()).toHaveValue("6"));
    scan("8901234567892");
    await waitFor(() => expect(riceQty()).toHaveValue("7"));
    // the same code in another case, and our own item QR (by stock item)
    scan("rice-6pk");
    await waitFor(() => expect(riceQty()).toHaveValue("13"));
    scan("/s/i/9");
    await waitFor(() => expect(riceQty()).toHaveValue("14"));
    expect(toast).toHaveBeenCalled();

    scan("NOT-ON-PO-1");
    expect(await screen.findByText("This code isn't on this order")).toBeInTheDocument();
    expect(riceQty()).toHaveValue("14");

    // A weighed unit opens the keypad instead of counting one.
    scan("PANEER-1");
    const pad = await screen.findByRole("dialog", { name: "Paneer" });
    expect(pad).toBeInTheDocument();
    expect(resolveScan).not.toHaveBeenCalled();
  });

  test("twelve single-piece scans of a 12-piece box make exactly 1 box", async () => {
    const SOAP_BOX = {
      ...SOAP, uomFactor: 12, needsUomFactor: false,
      barcodes: [{ code: "SOAP-1", packFactor: 1 }, { code: "SOAP-12", packFactor: 12 }],
    };
    await mount(ctx({ lines: [RICE, SOAP_BOX] }));
    for (let i = 0; i < 12; i += 1) scan("SOAP-1");
    await waitFor(() => expect(screen.getByLabelText("Received qty for Dish soap")).toHaveValue("1"));
    scan("SOAP-12");
    await waitFor(() => expect(screen.getByLabelText("Received qty for Dish soap")).toHaveValue("2"));
    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[0][1].lines).toEqual([expect.objectContaining({ poLineId: 13, receivedQty: 2 })]);
  });

  test("a dropped connection keeps the entries in sessionStorage and Retry replays the same clientEventId", async () => {
    const firstKey = await dropFirstPost();
    const saved = JSON.parse(window.sessionStorage.getItem(DRAFT));
    expect(saved).toMatchObject({ clientEventId: firstKey, unsent: true });
    expect(saved.entries["11"].received).toBe("6");
    expect(JSON.stringify(saved)).not.toContain(TOKEN);

    await retry();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn).toHaveBeenCalledTimes(2);
    expect(postTokenGrn.mock.calls[1][1].clientEventId).toBe(firstKey);
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));
    expectTokenContained();
  });

  test("while a post's outcome is unknown nothing can be edited or scanned; Discard starts over after a confirm", async () => {
    const firstKey = await dropFirstPost();

    // Frozen: lines, documents and the scanner; no Post, only Retry or Discard.
    expect(riceQty()).toBeDisabled();
    expect(screen.getByLabelText("Challan no.")).toBeDisabled();
    expect(screen.getByLabelText("Scan or type a code")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Post receipt/ })).toBeNull();
    type("Received qty for Basmati rice 25kg", "9");
    scan("RICE-6PK");
    expect(riceQty()).toHaveValue("6");
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT)).entries["11"].received).toBe("6");

    // Discard asks first, and "Keep them" changes nothing.
    fireEvent.click(screen.getByRole("button", { name: "Discard and start over" }));
    const ask = screen.getByRole("alertdialog", { name: "Discard these entries?" });
    expect(ask).toHaveTextContent(/that receipt is already recorded/);
    fireEvent.click(within(ask).getByRole("button", { name: "Keep them" }));
    expect(riceQty()).toHaveValue("6");
    expect(riceQty()).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Discard and start over" }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard entries" }));
    });
    expect(riceQty()).toHaveValue("");
    expect(riceQty()).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
    // The receipts list is refreshed: it shows whether the last attempt landed.
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));

    type("Received qty for Basmati rice 25kg", "4");
    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[1][1].clientEventId).not.toBe(firstKey);
  });

  test("429 and 504 on Retry keep the form frozen and the key; the next Retry finishes it", async () => {
    const firstKey = await dropFirstPost();

    postTokenGrn.mockRejectedValueOnce(apiError(429, { status: 0, code: "RATE_LIMITED", message: "Too many" }, { "retry-after": "120" }));
    await retry();
    expect(await screen.findByText(/Too many requests, try again in 2 min/)).toBeInTheDocument();
    expect(riceQty()).toBeDisabled();
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT))).toMatchObject({ clientEventId: firstKey, unsent: true });

    postTokenGrn.mockRejectedValueOnce(apiError(504, "<html>Gateway Timeout</html>"));
    await retry();
    expect(await screen.findByText(/The server didn't confirm this receipt \(error 504\)/)).toBeInTheDocument();
    expect(riceQty()).toBeDisabled();

    await retry();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls.map((c) => c[1].clientEventId)).toEqual([firstKey, firstKey, firstKey, firstKey]);
  });

  test("a refusal after an unknown attempt opens the form again (the key was never used)", async () => {
    const firstKey = await dropFirstPost();
    postTokenGrn.mockRejectedValueOnce(apiError(400, {
      status: 2, code: "VALIDATION", message: "Ask the buyer to set the unit conversion for Basmati rice 25kg first",
      details: { code_detail: "UOM_FACTOR_REQUIRED", poLineId: 11 },
    }));
    await retry();
    expect(await screen.findByText("Ask the buyer to set the unit conversion for Basmati rice 25kg first", { selector: "tbody *" })).toBeInTheDocument();
    expect(riceQty()).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT))).toMatchObject({ clientEventId: firstKey, unsent: false });
  });

  test("a 401 after an unknown attempt says the last receipt may already be recorded", async () => {
    await dropFirstPost();
    postTokenGrn.mockRejectedValueOnce(apiError(401, { status: 0, message: "Invalid or expired link" }));
    await retry();
    expect(await screen.findByText(
      "Your link expired. The last receipt may already have been recorded; ask the buyer to check."
    )).toBeInTheDocument();
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBeNull();
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
  });

  test("a link that expired with an unsent receipt on this tab says it may be recorded", async () => {
    window.sessionStorage.setItem("inv.receiveToken", TOKEN);
    window.sessionStorage.setItem(DRAFT, JSON.stringify({
      v: 2, savedAt: Date.now(), clientEventId: KEY, unsent: true, header: {}, entries: { 11: { received: "6" } },
    }));
    openLink("");
    getTokenReceiveContext.mockRejectedValue(apiError(401, { status: 0, message: "Invalid or expired link" }));
    render(<TokenReceivePage />);
    expect(await screen.findByText(
      "Your link expired. The last receipt may already have been recorded; ask the buyer to check."
    )).toBeInTheDocument();
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
  });

  test("a reload mid-flight comes back frozen with Retry on the same key", async () => {
    const view = await mount();
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockImplementationOnce(() => new Promise(() => {}));
    await postAndConfirm();
    // Saved as unsent before the request went out.
    const saved = JSON.parse(window.sessionStorage.getItem(DRAFT));
    const key = postTokenGrn.mock.calls[0][1].clientEventId;
    expect(saved).toMatchObject({ clientEventId: key, unsent: true });
    view.unmount();

    openLink("");
    await mount();
    expect(screen.getByText(/This receipt was being sent when the page closed/)).toBeInTheDocument();
    expect(riceQty()).toHaveValue("6");
    expect(riceQty()).toBeDisabled();
    await retry();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[1][1]).toMatchObject({ clientEventId: key });
  });

  test("while posting, edits are ignored and a second tap on Confirm sends nothing more", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    const reply = deferred();
    postTokenGrn.mockImplementationOnce(() => reply.promise);
    fireEvent.click(screen.getAllByRole("button", { name: /Post receipt/ })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Post this receipt?" });
    const confirm = within(dialog).getByRole("button", { name: "Confirm and post" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(postTokenGrn).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();

    type("Received qty for Basmati rice 25kg", "9");
    scan("RICE-6PK");
    expect(riceQty()).toHaveValue("6");
    expect(riceQty()).toBeDisabled();

    await act(async () => {
      reply.resolve(postedGrn());
    });
    await screen.findByText("Receipt posted");
    expect(postTokenGrn).toHaveBeenCalledTimes(1);
    expect(postTokenGrn.mock.calls[0][1].lines).toEqual([expect.objectContaining({ poLineId: 11, receivedQty: 6 })]);
  });

  test("a replay that differs from what was sent says the changes were not saved", async () => {
    await dropFirstPost();
    postTokenGrn.mockResolvedValueOnce(postedGrn({
      replayed: true, no_op: true, warnings: undefined,
      lines: [{ poLineId: 11, receivedQty: "4.0000", acceptedQty: "4.0000", rejectedQty: "0.0000" }],
    }));
    await retry();
    expect(await screen.findByText(
      "Already recorded as GRN/46/2026-27/00012; changes after the first attempt were not saved."
    )).toBeInTheDocument();
    expect(screen.queryByText("Receipt posted")).toBeNull();
  });

  test("a replay of exactly what was sent is simply posted", async () => {
    await dropFirstPost();
    postTokenGrn.mockResolvedValueOnce(postedGrn({
      replayed: true, no_op: true, warnings: undefined,
      lines: [{ poLineId: 11, receivedQty: "6.0000", acceptedQty: "6.0000", rejectedQty: "0.0000" }],
    }));
    await retry();
    expect(await screen.findByText("Receipt posted")).toBeInTheDocument();
    expect(screen.queryByText(/changes after the first attempt were not saved/)).toBeNull();
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

  test("409 on a restored unsent receipt's key never invites posting it twice", async () => {
    window.sessionStorage.setItem("inv.receiveToken", TOKEN);
    window.sessionStorage.setItem(DRAFT, JSON.stringify({
      v: 2, savedAt: Date.now(), clientEventId: KEY, unsent: true, header: {}, entries: { 11: { received: "6" } },
    }));
    openLink("");
    await mount();
    postTokenGrn.mockRejectedValueOnce(apiError(409, {
      status: 0, code: "CONFLICT", details: { field: "clientEventId" }, message: "This scan session belongs to another receipt",
    }));
    await retry();
    const msg = await screen.findByText(/may already have been recorded from another link or device/);
    expect(msg).toHaveTextContent("Ask the buyer to check this order's receipts before you post it again.");
    expect(msg).not.toHaveTextContent(/post again to record/);
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));
  });

  test.each([
    ["UOM_FACTOR_REQUIRED", "Ask the buyer to set the unit conversion for Basmati rice 25kg first", { field: "uomFactor", index: 0 }],
    ["MARK_OUT_NOT_ALLOWED", "Mark-out isn't available from a receive link", { field: "markOutDepartmentId", index: 0 }],
    ["MAPPING_NOT_ALLOWED", "Only the buyer can link a line to a stock item", { field: "mapToInvItemId", index: 0 }],
  ])("%s is shown on its line and named in the summary", async (codeDetail, message, extra) => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(apiError(400, {
      status: 2, code: "VALIDATION", message, details: { code_detail: codeDetail, poLineId: 11, ...extra },
    }));
    await postAndConfirm();
    const msg = await screen.findByText(message, { selector: "tbody *" });
    expect(msg.closest("tbody")).toHaveTextContent("Basmati rice 25kg");
    expect(screen.getByText(`Check Basmati rice 25kg: ${message}`)).toBeInTheDocument();
  });

  test("a line the form refuses is named in the summary, scrolled to and focused", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    type("Rejected qty for Basmati rice 25kg", "1");
    fireEvent.click(screen.getAllByRole("button", { name: /Post receipt/ })[0]);
    expect(await screen.findByText("Check Basmati rice 25kg: Pick a reason for the rejected qty")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Post this receipt?" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("Rejection reason for Basmati rice 25kg"));
    expect(postTokenGrn).not.toHaveBeenCalled();
  });

  test("OVER_RECEIPT names the max and the server's hint on the line; a header-level refusal goes on the form", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "30");
    postTokenGrn.mockRejectedValueOnce(apiError(409, {
      status: 0, code: "OVER_RECEIPT",
      message: "Only 24 bag more of Basmati rice 25kg can be accepted here; record the extra as rejected (excess)",
      details: { poLineId: 11, maxAcceptable: 24, requested: 30 },
    }));
    await postAndConfirm();
    const onLine = await screen.findByText(
      "Max acceptable 24 bag at this hotel; this receipt has 30. Record the extra as rejected (excess).",
      { selector: "tbody *" }
    );
    expect(onLine).toBeInTheDocument();
    expect(screen.getByText(/^Check Basmati rice 25kg: Max acceptable 24 bag/)).toBeInTheDocument();

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

  test("files chosen before posting upload after \"Receipt posted\", each with its own status", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    const challan = new File(["x"], "challan.jpg", { type: "image/jpeg" });
    const invoice = new File(["y"], "invoice.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [challan] } });
    fireEvent.change(screen.getByLabelText("Attach as"), { target: { value: "INVOICE" } });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [invoice] } });
    const first = deferred();
    uploadTokenGrnAttachment
      .mockImplementationOnce(() => first.promise)
      .mockRejectedValueOnce(apiError(413, { status: 0, message: "That file is too large" }));

    await postAndConfirm();
    // Posted first, while the files are still going up.
    expect(screen.getByText("Receipt posted")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Paperwork" });
    expect(within(list).getByText("challan.jpg").closest("li")).toHaveTextContent("Uploading…");

    await act(async () => {
      first.resolve({ id: 31, fileName: "challan.jpg", kind: "CHALLAN", url: "https://bucket.s3.ap-south-1.amazonaws.com/grn/challan.jpg" });
    });
    await waitFor(() => expect(within(list).getByText("invoice.pdf").closest("li")).toHaveTextContent("Not uploaded: That file is too large"));
    expect(within(list).getByText("challan.jpg").closest("li")).toHaveTextContent("Uploaded");
    expect(uploadTokenGrnAttachment).toHaveBeenNthCalledWith(1, TOKEN, 900, challan, "CHALLAN");
    expect(uploadTokenGrnAttachment).toHaveBeenNthCalledWith(2, TOKEN, 900, invoice, "INVOICE");
    // The context is refreshed right after posting, and again once a file went up.
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(3));
  });

  test("a slow upload never holds the next receipt: \"Receive another delivery\" gives a live form", async () => {
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    const challan = new File(["x"], "challan.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [challan] } });
    const slow = deferred();
    uploadTokenGrnAttachment.mockImplementationOnce(() => slow.promise);
    // The server's view after the post: the receipt, its file not there yet.
    getTokenReceiveContext.mockResolvedValue(ctx({ receipts: [receipt()] }));

    await postAndConfirm();
    expect(screen.getByText("Receipt posted")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Paperwork" })).getByText("challan.jpg").closest("li")).toHaveTextContent("Uploading…");
    // Fresh open quantities for the next receipt, without waiting for the file.
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "Receive another delivery" }));
    // Fully live while the file is still going up.
    expect(screen.queryByText(/Posting this receipt/)).toBeNull();
    expect(riceQty()).not.toBeDisabled();
    expect(riceQty()).toHaveValue("");
    expect(screen.getByLabelText("Scan or type a code")).not.toBeDisabled();
    expect(screen.getByLabelText("Challan no.")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Post receipt/ })).not.toBeDisabled();
    type("Received qty for Basmati rice 25kg", "4");
    scan("RICE-6PK");
    await waitFor(() => expect(riceQty()).toHaveValue("10"));
    // The first receipt's file shows its progress on that receipt.
    const first = screen.getByText("GRN/46/2026-27/00012").closest("li");
    expect(within(first).getByText("challan.jpg").closest("li")).toHaveTextContent("Uploading…");

    const att = { id: 31, fileName: "challan.jpg", kind: "CHALLAN", url: "https://bucket.s3.ap-south-1.amazonaws.com/grn/challan.jpg" };
    getTokenReceiveContext.mockResolvedValue(ctx({ receipts: [receipt({ attachments: [att] })] }));
    await act(async () => {
      slow.resolve(att);
    });
    await waitFor(() => expect(within(first).getByRole("link", { name: "challan.jpg" })).toBeInTheDocument());
    expect(within(first).queryByText("Uploading…")).toBeNull();
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(3));
    // The refresh kept what is being entered now.
    expect(riceQty()).toHaveValue("10");

    postTokenGrn.mockResolvedValueOnce(postedGrn({ id: 901, grnNumber: "GRN/46/2026-27/00013", lines: [{ poLineId: 11 }] }));
    await postAndConfirm();
    await screen.findByText("Receipt posted");
    expect(postTokenGrn).toHaveBeenCalledTimes(2);
    expect(postTokenGrn.mock.calls[1][1].clientEventId).not.toBe(postTokenGrn.mock.calls[0][1].clientEventId);
    expect(postTokenGrn.mock.calls[1][1].lines).toEqual([expect.objectContaining({ poLineId: 11, receivedQty: 10 })]);
    expect(uploadTokenGrnAttachment).toHaveBeenCalledTimes(1);
  });

  test("phone: the post bar sits inside the page (its spacer reads the page's bar height)", async () => {
    mockMobile = true;
    const view = await mount();
    const bar = await screen.findByRole("region", { name: "Receive actions" });
    expect(bar).toBeInTheDocument();
    const page = view.container.querySelector(".page");
    expect(page.querySelector(".spacer")).not.toBeNull();
  });

  test("phone: after a dropped post the bar offers Retry and Discard, not Post", async () => {
    mockMobile = true;
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Add one bag of Basmati rice 25kg" }));
    postTokenGrn.mockRejectedValueOnce(networkError());
    await postAndConfirm();
    const bar = await screen.findByRole("region", { name: "Receive actions" });
    await waitFor(() => expect(within(bar).getByRole("button", { name: "Retry" })).toBeInTheDocument());
    expect(within(bar).getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(within(bar).queryByRole("button", { name: /Post receipt/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Add one bag of Basmati rice 25kg" })).toBeDisabled();
    const key = postTokenGrn.mock.calls[0][1].clientEventId;
    await act(async () => {
      fireEvent.click(within(bar).getByRole("button", { name: "Retry" }));
    });
    await screen.findByText("Receipt posted");
    expect(postTokenGrn.mock.calls[1][1].clientEventId).toBe(key);
  });

  test("a 401 on a background upload kills the link: the posted card stays, saying so, with no way to start another", async () => {
    await mount();
    getTokenReceiveContext.mockResolvedValue(ctx({ receipts: [receipt()] }));
    type("Received qty for Basmati rice 25kg", "6");
    const challan = new File(["x"], "challan.jpg", { type: "image/jpeg" });
    const invoice = new File(["y"], "invoice.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [challan] } });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [invoice] } });
    uploadTokenGrnAttachment.mockRejectedValueOnce(apiError(401, { status: 0, message: "Invalid or expired link" }));

    await postAndConfirm();
    expect(screen.getByText("Receipt posted")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Paperwork" });
    await waitFor(() => expect(within(list).getByText("challan.jpg").closest("li")).toHaveTextContent("Not uploaded: This link has expired."));
    expect(within(list).getByText("invoice.pdf").closest("li")).toHaveTextContent("Not uploaded: This link has expired.");
    // The second file is not even tried, and nothing offers another receipt on a dead link.
    expect(uploadTokenGrnAttachment).toHaveBeenCalledTimes(1);
    const card = screen.getByRole("heading", { name: "Receipt posted" }).parentElement;
    expect(within(card).getByText("GRN/46/2026-27/00012")).toBeInTheDocument();
    expect(within(card).getByText("This receiving link has expired. Ask the buyer for a new one.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receive another delivery" })).toBeNull();
    expect(screen.queryByLabelText(/^Upload paperwork for/)).toBeNull();
    expect(screen.queryByText(/This link works until/)).toBeNull();
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBeNull();
    expectTokenContained();
  });

  test("a 401 on a background upload while the next receipt is open ends it on the expired page", async () => {
    await mount();
    getTokenReceiveContext.mockResolvedValue(ctx({ receipts: [receipt()] }));
    type("Received qty for Basmati rice 25kg", "6");
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [new File(["x"], "challan.jpg", { type: "image/jpeg" })] } });
    const slow = deferred();
    uploadTokenGrnAttachment.mockImplementationOnce(() => slow.promise);
    await postAndConfirm();
    fireEvent.click(screen.getByRole("button", { name: "Receive another delivery" }));
    type("Received qty for Basmati rice 25kg", "3");
    await waitFor(() => expect(window.sessionStorage.getItem(DRAFT)).not.toBeNull());

    await act(async () => {
      slow.reject(apiError(401, { status: 0, message: "Invalid or expired link" }));
    });
    expect(await screen.findByText("This receiving link has expired. Ask the buyer for a new one.")).toBeInTheDocument();
    expect(document.activeElement).toHaveTextContent("Link expired");
    expect(screen.queryByLabelText("Scan or type a code")).toBeNull();
    expect(window.sessionStorage.getItem("inv.receiveToken")).toBeNull();
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
    expect(postTokenGrn).toHaveBeenCalledTimes(1);
  });

  test("a 401 on paperwork while a receipt's outcome is unknown says it may already be recorded", async () => {
    await mount(ctx({ receipts: [receipt()] }));
    type("Received qty for Basmati rice 25kg", "6");
    postTokenGrn.mockRejectedValueOnce(networkError());
    await postAndConfirm();
    await screen.findByText(/The connection dropped before the server answered/);
    uploadTokenGrnAttachment.mockRejectedValueOnce(apiError(401, { status: 0, message: "Invalid or expired link" }));
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Upload paperwork for GRN/46/2026-27/00012"), {
        target: { files: [new File(["x"], "challan.jpg", { type: "image/jpeg" })] },
      });
    });
    expect(await screen.findByText(
      "Your link expired. The last receipt may already have been recorded; ask the buyer to check."
    )).toBeInTheDocument();
    expect(window.sessionStorage.getItem(DRAFT)).toBeNull();
  });

  test("a refresh that answers after the link died never brings the form back", async () => {
    await dropFirstPost();
    const late = deferred();
    getTokenReceiveContext.mockImplementationOnce(() => late.promise);
    fireEvent.click(screen.getByRole("button", { name: "Discard and start over" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard entries" }));
    type("Received qty for Basmati rice 25kg", "4");
    postTokenGrn.mockRejectedValueOnce(apiError(401, { status: 0, message: "Invalid or expired link" }));
    await postAndConfirm();
    expect(await screen.findByText("This receiving link has expired. Ask the buyer for a new one.")).toBeInTheDocument();

    await act(async () => {
      late.resolve(ctx());
    });
    expect(screen.getByText("This receiving link has expired. Ask the buyer for a new one.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Scan or type a code")).toBeNull();
    expect(screen.queryByLabelText("Received qty for Basmati rice 25kg")).toBeNull();
  });

  test("a file that went up stays on its receipt when a refresh lands between two uploads", async () => {
    const att1 = { id: 31, fileName: "challan.jpg", kind: "CHALLAN", url: "https://bucket.s3.ap-south-1.amazonaws.com/grn/challan.jpg" };
    const att2 = { id: 32, fileName: "invoice.pdf", kind: "INVOICE", url: "https://bucket.s3.ap-south-1.amazonaws.com/grn/invoice.pdf" };
    await mount();
    type("Received qty for Basmati rice 25kg", "6");
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [new File(["x"], "challan.jpg", { type: "image/jpeg" })] } });
    fireEvent.change(screen.getByLabelText("Attach as"), { target: { value: "INVOICE" } });
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [new File(["y"], "invoice.pdf", { type: "application/pdf" })] } });
    // The refresh right after the post: the server read the receipt before the first file was saved.
    const refresh = deferred();
    getTokenReceiveContext.mockImplementationOnce(() => refresh.promise);
    const second = deferred();
    uploadTokenGrnAttachment.mockResolvedValueOnce(att1).mockImplementationOnce(() => second.promise);

    await postAndConfirm();
    const receipts = () => screen.getByRole("region", { name: /Receipts from this link/ });
    await waitFor(() => expect(within(receipts()).getByRole("link", { name: "challan.jpg" })).toBeInTheDocument());
    await act(async () => {
      refresh.resolve(ctx({ receipts: [receipt()] }));
    });
    expect(within(receipts()).getByRole("link", { name: "challan.jpg" })).toBeInTheDocument();

    getTokenReceiveContext.mockResolvedValue(ctx({ receipts: [receipt({ attachments: [att1, att2] })] }));
    await act(async () => {
      second.resolve(att2);
    });
    await waitFor(() => expect(getTokenReceiveContext).toHaveBeenCalledTimes(3));
    expect(within(receipts()).getAllByRole("link", { name: "challan.jpg" })).toHaveLength(1);
    expect(within(receipts()).getAllByRole("link", { name: "invoice.pdf" })).toHaveLength(1);
  });

  test("a file that didn't go up stops saying so once paperwork is attached to that receipt by hand", async () => {
    await mount();
    getTokenReceiveContext.mockResolvedValue(ctx({ receipts: [receipt()] }));
    type("Received qty for Basmati rice 25kg", "6");
    fireEvent.change(screen.getByLabelText("Upload file"), { target: { files: [new File(["x"], "challan.jpg", { type: "image/jpeg" })] } });
    uploadTokenGrnAttachment.mockRejectedValueOnce(apiError(413, { status: 0, message: "That file is too large" }));
    await postAndConfirm();
    await screen.findByText(/Not uploaded: That file is too large/);
    fireEvent.click(screen.getByRole("button", { name: "Receive another delivery" }));
    const row = screen.getByText("GRN/46/2026-27/00012").closest("li");
    expect(within(row).getByText("challan.jpg").closest("li")).toHaveTextContent("Not uploaded: That file is too large");

    // A smaller photo of the same challan, attached on the receipt.
    const photo = new File(["z"], "IMG_0412.jpg", { type: "image/jpeg" });
    uploadTokenGrnAttachment.mockResolvedValueOnce({ id: 33, fileName: "IMG_0412.jpg", kind: "CHALLAN", url: "https://bucket.s3.ap-south-1.amazonaws.com/grn/IMG_0412.jpg" });
    await act(async () => {
      fireEvent.change(within(row).getByLabelText("Upload paperwork for GRN/46/2026-27/00012"), { target: { files: [photo] } });
    });
    await waitFor(() => expect(within(row).getByRole("link", { name: "IMG_0412.jpg" })).toBeInTheDocument());
    expect(within(row).queryByText(/Not uploaded/)).toBeNull();
  });

  test("phone: Discard brings its confirm into view and focuses \"Keep them\"", async () => {
    mockMobile = true;
    const scrolled = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView() {
      scrolled.push(this);
    };
    try {
      await mount();
      fireEvent.click(screen.getByRole("button", { name: "Add one bag of Basmati rice 25kg" }));
      postTokenGrn.mockRejectedValueOnce(networkError());
      await postAndConfirm();
      const bar = await screen.findByRole("region", { name: "Receive actions" });
      await waitFor(() => expect(within(bar).getByRole("button", { name: "Discard" })).toBeInTheDocument());
      fireEvent.click(within(bar).getByRole("button", { name: "Discard" }));
      const ask = screen.getByRole("alertdialog", { name: "Discard these entries?" });
      expect(scrolled).toEqual([ask]);
      expect(document.activeElement).toBe(within(ask).getByRole("button", { name: "Keep them" }));

      // Scrolled away and tapped again: it comes back into view again.
      within(bar).getByRole("button", { name: "Retry" }).focus();
      fireEvent.click(within(bar).getByRole("button", { name: "Discard" }));
      expect(scrolled).toEqual([ask, ask]);
      expect(document.activeElement).toBe(within(ask).getByRole("button", { name: "Keep them" }));
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  test("a code that matches two different items asks which one, and adds only the one picked", async () => {
    const DAL = {
      poLineId: 14, productVariantId: 504, productName: "Toor dal 30kg", unit: "bag",
      invItemId: 12, stockUom: "bag", uomFactor: 1, needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null,
      plannedAtHotel: 10, openAtHotel: 10, maxAcceptable: 10, defaultMarkOutOnArrival: false,
      // The same label keyed on two items, in another case.
      barcodes: [{ code: "rice-6pk", packFactor: 2 }],
    };
    await mount(ctx({ lines: [RICE, PANEER, DAL] }));
    scan("Rice-6Pk");
    expect(await screen.findByText("This code matches more than one item: pick one")).toBeInTheDocument();
    expect(riceQty()).toHaveValue("");
    const pick = screen.getByRole("group", { name: "Which item is it?" });
    expect(within(pick).getAllByRole("button").map((b) => b.textContent)).toEqual(["Basmati rice 25kg", "Toor dal 30kg"]);

    fireEvent.click(within(pick).getByRole("button", { name: "Toor dal 30kg" }));
    await waitFor(() => expect(screen.getByLabelText("Received qty for Toor dal 30kg")).toHaveValue("2"));
    expect(riceQty()).toHaveValue("");
    expect(screen.queryByRole("group", { name: "Which item is it?" })).toBeNull();
    // An exact code is still a single match.
    scan("RICE-6PK");
    await waitFor(() => expect(riceQty()).toHaveValue("6"));
  });

  test("a dispatch QR on this link picks that dispatch note; another one isn't on its way here", async () => {
    await mount(ctx({
      dispatches: [{
        id: 31, dispatchNumber: "DSP/46/2026-27/00004", challanNo: "CH-31", challanDate: "2026-10-23",
        vehicleNo: "MH01AB1234", lines: [{ poLineId: 11, qty: 5 }],
      }],
    }));
    scan("/s/d/99");
    expect(await screen.findByText("That dispatch note isn't on its way to Orchid Mumbai on this order")).toBeInTheDocument();
    expect(riceQty()).toHaveValue("");

    scan("https://app.letsworkwise.com/s/d/31");
    expect(await screen.findByText("Receiving against DSP/46/2026-27/00004")).toBeInTheDocument();
    expect(riceQty()).toHaveValue("5");
    expect(screen.getByLabelText("Challan no.")).toHaveValue("CH-31");
    expect(screen.getByLabelText("Against dispatch")).toHaveValue("31");
  });

  test("the scan dock's card clips without becoming the sticky box", async () => {
    await mount();
    const dock = screen.getByTestId("scan-dock");
    expect(dock).toHaveClass("scanDock");
    // The nearest card around the dock is the items card, which the phone
    // layer switches from overflow:hidden to overflow:clip.
    expect(dock.closest(".card")).toHaveClass("itemsCard");
    expect(dock.closest(".page")).not.toBeNull();
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
