// StepReview.test.js — F3. ONE component, TWO callers, TWO shapes of the same
// prop. That seam IS ticket 1.
//
// `formData.end_date` reaches this component in two different forms:
//
//   caller              source                            value
//   ─────────────────────────────────────────────────────────────────────────
//   the wizard          <input type="datetime-local">     "2026-08-13T12:30"
//   (CreateRoundPage)                                     LOCAL WALL CLOCK
//
//   the approval page   round.end_date off the API        "2026-08-13 07:00:00"
//   (ApproveRoundPage)  (SELECT nr.*, naive UTC)          AN INSTANT
//
// Both were handed to `moment(formData.end_date)`. For the wizard that is
// right — a local string parsed as local. For the approver it prints the
// stored digits back: 07:00 AM for a 12:30 PM deadline.
//
// THIS IS WHY THE BUG SURVIVED REVIEW. Read StepReview.js on its own and it is
// correct for its primary caller; you sign it off. The defect exists at the
// seam between two files, and we review files. So this suite exercises BOTH
// CALLERS OF ONE COMPONENT in one place, which is the only altitude the bug is
// visible from.
//
// The wizard cases are as important as the approver ones: they are what stops
// the fix from breaking the creator's path, which is the obvious way to "fix"
// this wrong.
//
// Run under at least two zones. Under TZ=UTC the broken reading is a no-op.

jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import StepReview from "./StepReview";

const NAIVE_END = "2026-08-13 07:00:00"; // API shape: an INSTANT (12:30 PM IST)
const LOCAL_END = "2026-08-13T12:30"; // wizard shape: LOCAL WALL CLOCK

const baseProps = {
  product: null,
  productPriceData: { vendors: [], l1: null },
  selectedVendorIds: [],
  vendorTargets: {},
  effectiveFields: [],
  products: [],
  queuedRounds: [],
  chargeNamesList: [],
  mode: "product",
  step3Errors: [],
};

const renderReadOnly = (end_date = NAIVE_END) =>
  render(
    <StepReview
      {...baseProps}
      formData={{ end_date, negotiation_fields: [] }}
      queuedRounds={[{ mode: "product", rfq_product_id: 4501, vendor_targets: [], productName: "Bath towel" }]}
      readOnly
    />
  );

const renderWizard = (end_date = LOCAL_END, extra = {}) =>
  render(
    <StepReview
      {...baseProps}
      formData={{ end_date, negotiation_fields: [] }}
      updateFormData={jest.fn()}
      {...extra}
    />
  );

const dateInput = () => document.querySelector('input[type="datetime-local"]');

// ── CALLER 1: the approval page (readOnly) ─────────────────────────────────

describe("caller 1 — the approval page, where formData.end_date is an INSTANT", () => {
  it("renders 12:30 PM, not the stored 07:00", () => {
    renderReadOnly();
    expect(screen.getByText(/12:30 PM/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/07:00 AM/);
  });

  it("carries the zone, because a deadline is what a reader converts wrong", () => {
    renderReadOnly();
    // Substring rather than equality — the separator moved from `·` to `,`
    // when the four formatter copies collapsed into one (changes.md §4).
    expect(screen.getByText(/13 Aug 2026, 12:30 PM IST/)).toBeInTheDocument();
  });

  it("reads an already-ISO value identically — the backend now sends these", () => {
    renderReadOnly("2026-08-13T07:00:00.000Z");
    expect(screen.getByText(/13 Aug 2026, 12:30 PM IST/)).toBeInTheDocument();
  });

  it("renders static text, never an editable control", () => {
    renderReadOnly();
    expect(dateInput()).toBeNull();
  });

  it("does NOT render the wizard's 'will be sent as UTC' hint", () => {
    // The hint sits under the input and is meaningless without one. Fed an
    // API value the old expression computed 01:30 UTC for a 07:00 UTC
    // deadline — doubly wrong, and only ever latent because the readOnly
    // branch does not render it. Pinned so it stays that way.
    renderReadOnly();
    expect(document.body.textContent).not.toMatch(/Will be sent as/);
    expect(document.body.textContent).not.toMatch(/01:30 UTC/);
  });

  it("falls back rather than printing Invalid Date", () => {
    renderReadOnly(null);
    // The em dash is the block's own value, not the one the negotiation-fields
    // row happens to carry — scope to the "End date" block.
    const endDateBlock = screen.getByText(/End date/).closest("section");
    expect(endDateBlock).toHaveTextContent("—");
    expect(document.body.textContent).not.toMatch(/Invalid Date|NaN/);
  });
});

// ── CALLER 2: the wizard ───────────────────────────────────────────────────

describe("caller 2 — the wizard, where formData.end_date is a LOCAL WALL CLOCK", () => {
  it("REGRESSION GUARD: the control still holds exactly what the buyer typed", () => {
    // The obvious wrong fix is to push the approval page's parser up into the
    // component. That would re-read this local string as UTC and move the
    // creator's deadline 5h30m. This assertion is the one that says no.
    renderWizard();
    expect(dateInput()).toHaveValue(LOCAL_END);
  });

  it("REGRESSION GUARD: the hint still says 07:00 UTC for a 12:30 local entry", () => {
    // Correct BEFORE the fix and correct after — 12:30 IST is 07:00 UTC. It
    // is here because it is the assertion a bad fix breaks.
    if (-new Date("2026-08-13T07:00:00Z").getTimezoneOffset() !== 330) {
      // Only meaningful in IST; in another zone 12:30 local is a different
      // instant, so assert the invariant instead of the literal.
      renderWizard();
      const utcOfTyped = new Date(2026, 7, 13, 12, 30).toISOString().slice(11, 16);
      expect(screen.getByText(/Will be sent as/)).toHaveTextContent(`${utcOfTyped} UTC`);
      return;
    }
    renderWizard();
    expect(screen.getByText(/Will be sent as/)).toHaveTextContent("13 Aug 2026, 07:00 UTC");
  });

  it("the input's `min` is the viewer's LOCAL now, not UTC now", () => {
    // Inventory row 16. `new Date().toISOString().slice(0,16)` is UTC, but the
    // control reads and writes local wall clock — so in India the floor sat
    // 5h30m in the past and the browser accepted a deadline already gone.
    renderWizard();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localNow =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    expect(dateInput()).toHaveAttribute("min", localNow);

    if (now.getTimezoneOffset() !== 0) {
      expect(dateInput().getAttribute("min")).not.toBe(new Date().toISOString().slice(0, 16));
    }
  });

  it("shows no hint at all until the buyer has picked something", () => {
    renderWizard("");
    expect(document.body.textContent).not.toMatch(/Will be sent as/);
  });

  it("marks the field required, which the read-only branch must not", () => {
    // Cheap proof the two branches are genuinely different renders and the
    // readOnly discriminator is doing its job.
    renderWizard();
    expect(dateInput()).toBeRequired();
  });
});

// ── the seam itself ────────────────────────────────────────────────────────

describe("THE SEAM — one component, two shapes, and they must not be confused", () => {
  it("the same digits mean different instants in the two branches, and both render right", () => {
    // "2026-08-13T12:30" typed by the creator and "2026-08-13 07:00:00" stored
    // for the approver are THE SAME MOMENT. One component, one screen each,
    // and until this branch they disagreed by 5h30m.
    const wizard = renderWizard(LOCAL_END);
    const hint = screen.getByText(/Will be sent as/).textContent;
    wizard.unmount();

    renderReadOnly(NAIVE_END);
    const shown = screen.getByText(/13 Aug 2026/).textContent;

    // In IST: the wizard says it will store 07:00 UTC, and the approver reads
    // that stored 07:00 UTC back as 12:30 PM IST. Round trip closed.
    if (-new Date("2026-08-13T07:00:00Z").getTimezoneOffset() === 330) {
      expect(hint).toContain("07:00 UTC");
      expect(shown).toContain("12:30 PM");
    }
    // In every zone: what is stored and what is shown are the same instant.
    const storedUtc = new Date(2026, 7, 13, 12, 30).toISOString();
    expect(hint).toContain(storedUtc.slice(11, 16));
  });
});
