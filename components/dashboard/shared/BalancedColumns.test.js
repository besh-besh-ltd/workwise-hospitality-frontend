// BalancedColumns — measured balancing of the two dashboard columns.
//
// Before: columns were assigned from hard-coded height estimates, and with
// real data (a tall Insights card) user 125's left column ended ~900px above
// the right one at 1440px.

import React, { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import BalancedColumns, { planColumns, imbalance, THRESHOLD, MAX_REPLANS, GAP } from "./BalancedColumns";

const H = (map) => (key) => map[key];
const flat = (map) => (key) => map[key];

describe("planColumns", () => {
  const items = [
    { key: "a", defaultColumn: "left" },
    { key: "b", defaultColumn: "left" },
    { key: "c", defaultColumn: "left" },
    { key: "d", defaultColumn: "right" },
    { key: "e", defaultColumn: "right" },
    { key: "f", defaultColumn: "right" },
  ];

  test("user-125-like heights: the split brings the column bottoms within the threshold", () => {
    const h = { a: 240, b: 508, c: 646, d: 654, e: 764, f: 893 };
    const defaults = Object.fromEntries(items.map((i) => [i.key, i.defaultColumn]));
    expect(imbalance(items, defaults, flat(h))).toBeGreaterThan(THRESHOLD);
    const cols = planColumns(items, flat(h));
    expect(imbalance(items, cols, flat(h))).toBeLessThanOrEqual(THRESHOLD);
  });

  test("already balanced defaults are kept (fewest moves wins ties)", () => {
    const h = { a: 300, b: 300, c: 300, d: 300, e: 300, f: 300 };
    const cols = planColumns(items, flat(h));
    items.forEach((i) => expect(cols[i.key]).toBe(i.defaultColumn));
  });

  test("both columns stay non-empty", () => {
    const two = [{ key: "x", defaultColumn: "left" }, { key: "y", defaultColumn: "right" }];
    const cols = planColumns(two, H({ x: 1000, y: 10 }));
    expect(new Set(Object.values(cols))).toEqual(new Set(["left", "right"]));
  });

  test("gaps count toward each column", () => {
    const two = [{ key: "x", defaultColumn: "left" }, { key: "y", defaultColumn: "right" }];
    expect(imbalance(two, { x: "left", y: "left" }, H({ x: 100, y: 100 }))).toBe(200 + 2 * GAP);
  });
});

/* ── Component with a controllable ResizeObserver ─────────────────── */
let observers = [];
class FakeRO {
  constructor(cb) { this.cb = cb; this.els = new Set(); observers.push(this); }
  observe(el) { this.els.add(el); }
  disconnect() { this.els.clear(); }
}
// Heights per card per column: a card is shorter in the wide left column.
let heightTable = {};
const fire = () => {
  observers.forEach((ro) => {
    const entries = [...ro.els].map((el) => {
      const key = el.getAttribute("data-balance-key");
      const col = el.parentElement.getAttribute("data-column");
      el.getBoundingClientRect = () => ({ height: heightTable[key][col] });
      return { target: el };
    });
    if (entries.length) ro.cb(entries);
  });
};

let mounts = {};
const Card = ({ id }) => {
  useEffect(() => { mounts[id] = (mounts[id] || 0) + 1; }, [id]);
  return <div>card {id}</div>;
};
const itemsFor = (keys, defaults) => keys.map((k) => ({ key: k, defaultColumn: defaults[k], node: <Card id={k} /> }));

describe("BalancedColumns component", () => {
  const origRO = window.ResizeObserver;
  const origMM = window.matchMedia;
  beforeEach(() => {
    jest.useFakeTimers();
    observers = [];
    mounts = {};
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
  });
  afterEach(() => {
    jest.useRealTimers();
    window.ResizeObserver = origRO;
    window.matchMedia = origMM;
  });

  const DEF = { a: "left", b: "left", c: "left", d: "right", e: "right", f: "right" };
  const KEYS = ["a", "b", "c", "d", "e", "f"];

  test("without ResizeObserver the registry columns are used as-is", () => {
    delete window.ResizeObserver;
    render(<BalancedColumns testId="bc" items={itemsFor(KEYS, DEF)} />);
    KEYS.forEach((k) => expect(screen.getByTestId(`balanced-${k}`)).toHaveAttribute("data-column", DEF[k]));
  });

  test("an imbalanced measurement moves cards without remounting them, then settles", () => {
    window.ResizeObserver = FakeRO;
    heightTable = {
      a: { left: 240, right: 300 }, b: { left: 508, right: 600 }, c: { left: 646, right: 760 },
      d: { left: 560, right: 654 }, e: { left: 650, right: 764 }, f: { left: 600, right: 893 },
    };
    render(<BalancedColumns testId="bc" items={itemsFor(KEYS, DEF)} />);
    act(() => { fire(); });
    act(() => { jest.advanceTimersByTime(200); });
    // Measure again in the new columns and let it settle.
    act(() => { fire(); });
    act(() => { jest.advanceTimersByTime(200); });

    const colOf = (k) => screen.getByTestId(`balanced-${k}`).getAttribute("data-column");
    const sum = (col) => KEYS.filter((k) => colOf(k) === col).reduce((t, k) => t + heightTable[k][col] + GAP, 0);
    expect(Math.abs(sum("left") - sum("right"))).toBeLessThanOrEqual(THRESHOLD);
    KEYS.forEach((k) => expect(mounts[k]).toBe(1)); // moved, never remounted
  });

  test("small differences (a polling refresh) never trigger a move", () => {
    window.ResizeObserver = FakeRO;
    heightTable = Object.fromEntries(KEYS.map((k, i) => [k, { left: 300 + i * 10, right: 300 + i * 10 }]));
    render(<BalancedColumns testId="bc" items={itemsFor(KEYS, DEF)} />);
    act(() => { fire(); jest.advanceTimersByTime(200); });
    KEYS.forEach((k) => expect(screen.getByTestId(`balanced-${k}`)).toHaveAttribute("data-column", DEF[k]));
  });

  test("a card set that can never balance stops re-planning after MAX_REPLANS", () => {
    window.ResizeObserver = FakeRO;
    // Pathological: whichever column a card lands in, it measures huge there.
    heightTable = {
      a: { left: 2000, right: 50 }, b: { left: 50, right: 2000 },
      c: { left: 2000, right: 50 }, d: { left: 50, right: 2000 },
    };
    const keys = ["a", "b", "c", "d"];
    const def = { a: "left", b: "left", c: "right", d: "right" };
    render(<BalancedColumns testId="bc" items={itemsFor(keys, def)} />);
    let moves = 0;
    let prev = keys.map((k) => screen.getByTestId(`balanced-${k}`).getAttribute("data-column")).join();
    for (let i = 0; i < 10; i += 1) {
      act(() => { fire(); jest.advanceTimersByTime(200); });
      const now = keys.map((k) => screen.getByTestId(`balanced-${k}`).getAttribute("data-column")).join();
      if (now !== prev) moves += 1;
      prev = now;
    }
    expect(moves).toBeLessThanOrEqual(MAX_REPLANS);
  });

  test("DOM order follows the visual columns (left first) so keyboard order matches the screen", () => {
    delete window.ResizeObserver;
    const def = { a: "right", b: "left", c: "right", d: "left" };
    render(<BalancedColumns testId="bc" items={itemsFor(["a", "b", "c", "d"], def)} />);
    const order = [...screen.getByTestId("bc").children].map((el) => el.getAttribute("data-testid"));
    expect(order).toEqual(["balanced-b", "balanced-d", "balanced-a", "balanced-c"]);
  });

  test("narrow screens keep registry order in one column and never measure", () => {
    window.ResizeObserver = FakeRO;
    window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
    const def = { a: "right", b: "left" };
    render(<BalancedColumns testId="bc" items={itemsFor(["a", "b"], def)} />);
    const order = [...screen.getByTestId("bc").children].map((el) => el.getAttribute("data-testid"));
    expect(order).toEqual(["balanced-a", "balanced-b"]);
    expect(observers.every((ro) => ro.els.size === 0)).toBe(true);
  });
});
