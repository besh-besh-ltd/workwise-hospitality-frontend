// The pure pieces under the receive screen: factor and scan maths, the
// replay verdict, the post sender, and the keypad's quick fill and labels.

jest.mock("@/services/inventory", () => ({ __esModule: true, createGrn: jest.fn() }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: Object.assign(jest.fn(), { dismiss: jest.fn() }) }));

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import QtyPad from "../QtyPad";
import { replayVerdict, isFreshPost } from "../receivePost";
import {
  addUnits, buildLinesPayload, factorText, isNetworkError, parseFactor, poQtyToUnits, unitsToPoQty,
} from "../receiveUtils";
import { lineFactor } from "../useReceiveScan";
import { createGrn } from "@/services/inventory";
import * as adapterModule from "../receiveAdapter";

const { GRN_POST_KIND, buyerReceiveAdapter, sendGrnPost } = adapterModule;

describe("factors at numeric(18,6)", () => {
  it("parses, prints and sends 6 decimals", () => {
    expect(parseFactor("0.083333")).toBe(0.083333);
    expect(parseFactor("0.0833334")).toBe(0.083333);
    expect(parseFactor("0")).toBeNull();
    expect(parseFactor("-2")).toBeNull();
    expect(parseFactor("abc")).toBeNull();
    expect(factorText(12)).toBe("12");
    expect(factorText("0.0833330")).toBe("0.083333");
    const [line] = buildLinesPayload(
      [{ poLineId: 13, trackExpiry: false }],
      { 13: { received: "2", rejected: "", reason: "", uomFactor: "0.083333", markOut: false, departmentId: "" } }
    );
    expect(line.uomFactor).toBe(0.083333);
  });

  it("converts scanned stock units to PO units with one rounding", () => {
    expect(unitsToPoQty(12, 12)).toBe(1);
    expect(unitsToPoQty(5, 12)).toBe(0.4167);
    expect(unitsToPoQty(1, 0.083333)).toBe(12);
    expect(unitsToPoQty(1, 0)).toBeNull();
    let units = 0;
    for (let i = 0; i < 12; i++) units = addUnits(units, 1);
    expect(unitsToPoQty(units, 12)).toBe(1);
    expect(poQtyToUnits(2, 12)).toBe(24);
  });

  it("a line's factor: typed, then the server's stored one, then the context's, then same unit", () => {
    const line = { unit: "box", stockUom: "piece", uomFactor: null };
    expect(lineFactor(line, { uomFactor: "", knownFactor: null })).toBeNull();
    expect(lineFactor(line, { uomFactor: "", knownFactor: "12" })).toBe(12);
    expect(lineFactor(line, { uomFactor: "10", knownFactor: "12" })).toBe(10);
    expect(lineFactor({ ...line, uomFactor: 6 }, { uomFactor: "" })).toBe(6);
    expect(lineFactor({ unit: "KG ", stockUom: "kg", uomFactor: null }, { uomFactor: "" })).toBe(1);
  });
});

describe("replay verdict", () => {
  const loaded = Date.parse("2026-10-25T04:00:00.000Z");
  const grn = (postedAt) => ({ id: 900, status: "posted", postedAt });

  it("a fresh post carries warnings[]; a replay has none (before FX1) or replayed:true (after)", () => {
    expect(isFreshPost({ id: 1, warnings: [] })).toBe(true);
    expect(isFreshPost({ id: 1, warnings: [{ code: "EXPIRED" }] })).toBe(true);
    expect(isFreshPost({ id: 1 })).toBe(false);
    expect(isFreshPost({ id: 1, replayed: true, no_op: true })).toBe(false);
    expect(isFreshPost({ id: 1, replayed: true, no_op: true, warnings: [] })).toBe(false);
    expect(isFreshPost({ id: 1, replayed: false, warnings: [] })).toBe(true);
    expect(isFreshPost(null)).toBe(false);
  });

  it("ours only after a lost reply with no edits since", () => {
    const base = { editVersion: 3, keyRestored: false, pageLoadedAt: loaded };
    expect(replayVerdict({ ...base, grn: grn("2026-10-25T05:00:00.000Z"), lostAtVersion: 3 })).toBe("ours");
    expect(replayVerdict({ ...base, grn: grn("2026-10-25T05:00:00.000Z"), lostAtVersion: 2 })).toBe("earlier");
    expect(replayVerdict({ ...base, grn: grn("2026-10-25T05:00:00.000Z"), lostAtVersion: undefined })).toBe("earlier");
  });

  it("only a key restored from the device copy is dated: posted before this page loaded is earlier", () => {
    const base = { editVersion: 1, lostAtVersion: 1, pageLoadedAt: loaded };
    expect(replayVerdict({ ...base, grn: grn("2026-10-24T12:00:00.000Z"), keyRestored: true })).toBe("earlier");
    expect(replayVerdict({ ...base, grn: grn("2026-10-25T04:00:01.000Z"), keyRestored: true })).toBe("ours");
    // Minted here or taken from a server draft: never dated (device clock skew).
    expect(replayVerdict({ ...base, grn: grn("2026-10-24T12:00:00.000Z"), keyRestored: false })).toBe("ours");
  });
});

describe("unknown outcomes", () => {
  const http = (status) => Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status, data: {} } });

  it("no answer, a timeout or a gateway 502/503/504 leave the outcome unknown; a real answer does not", () => {
    expect(isNetworkError(Object.assign(new Error("Network Error"), { isAxiosError: true, request: {} }))).toBe(true);
    expect(isNetworkError(Object.assign(new Error("timeout of 30000ms exceeded"), { code: "ECONNABORTED" }))).toBe(true);
    for (const st of [502, 503, 504]) expect(isNetworkError(http(st))).toBe(true);
    // The service layer's {message: axiosError} wrapper too.
    expect(isNetworkError({ message: http(504) })).toBe(true);
    for (const st of [400, 403, 409, 500]) expect(isNetworkError(http(st))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe("the post sender", () => {
  it("grn_post is one POST /grn {post:true} under the event's key; the buyer adapter posts through it", async () => {
    createGrn.mockResolvedValue({ id: 900, warnings: [] });
    expect(GRN_POST_KIND).toBe("grn_post");
    expect(buyerReceiveAdapter.post).toBe(sendGrnPost);
    const input = { poId: 52, hotelId: 46, lines: [{ poLineId: 11, receivedQty: 3 }] };
    await sendGrnPost({ grnId: 900, clientEventId: "k-1", input });
    expect(createGrn).toHaveBeenCalledWith({ ...input, post: true, clientEventId: "k-1" });
  });

  it("there is no token mode here: the site-rep flow is TokenReceivePage's", () => {
    expect(adapterModule.createTokenReceiveAdapter).toBeUndefined();
    expect(adapterModule.tokenInput).toBeUndefined();
  });
});

describe("QtyPad", () => {
  const pad = (props) =>
    render(<QtyPad show title="Paneer" unit="kg" initial={0} onDone={jest.fn()} onHide={jest.fn()} {...props} />);

  it("in add mode, the quick fill is what is still open (open − received)", () => {
    pad({ mode: "add", openQty: 100, receivedSoFar: 40 });
    const dialog = screen.getByRole("dialog", { name: /Paneer/ });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rest of open qty" }));
    expect(within(dialog).getByLabelText("Qty in kg")).toHaveValue("60");
  });

  it("speaks receiving by default; `labels` rewords any part of it", () => {
    const { unmount } = pad({ mode: "add", openQty: 100, receivedSoFar: 40 });
    expect(screen.getByText("Qty in this delivery")).toBeInTheDocument();
    expect(screen.getByText("Received so far")).toBeInTheDocument();
    expect(screen.getByText(/^Open kg$/)).toBeInTheDocument(); // "Open 100 kg"
    unmount();

    pad({
      mode: "add", openQty: 12, receivedSoFar: 0,
      labels: { qty: "Qty to mark out", soFar: null, open: "In stock", fill: "All in stock" },
    });
    expect(screen.getByText("Qty to mark out")).toBeInTheDocument();
    expect(screen.queryByText(/Received so far|Qty in this delivery/)).toBeNull();
    expect(screen.getByText(/^In stock kg$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All in stock" }));
    expect(screen.getByLabelText("Qty in kg")).toHaveValue("12");
  });

  it("in set mode it is the open qty, and nothing is offered once all is received", () => {
    const { unmount } = pad({ mode: "set", openQty: 100, receivedSoFar: 40 });
    fireEvent.click(screen.getByRole("button", { name: "Open qty" }));
    expect(screen.getByLabelText("Qty in kg")).toHaveValue("100");
    unmount();
    pad({ mode: "add", openQty: 100, receivedSoFar: 100 });
    expect(screen.queryByRole("button", { name: /open qty/i })).toBeNull();
  });
});
