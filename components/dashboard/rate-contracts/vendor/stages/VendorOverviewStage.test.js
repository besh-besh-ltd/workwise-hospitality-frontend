// VendorOverviewStage — the ARC vendor's terms-acceptance gate, as an
// accessibility contract.
//
// This is the twin of the SendQuoteWizard defect, found by sweeping for the
// same idiom: a <label class="check"> whose only "control" was a decorative
// <span class="box">, driven by an onClick with e.preventDefault(). There was
// no form control behind it, so it had no role, no announced checked state,
// and could not be focused or operated from the keyboard.
//
// arc_v2.css even carried a `.check input { display:none }` rule — written for
// an input that the JSX never rendered, and which would itself have made a
// real input unfocusable.
//
// It matters for the same reason: quote.js locks the technical and commercial
// stages behind `acceptedTerms` and disables the stage-advance button while it
// is false, so a keyboard-only vendor could not price an ARC at all.
// WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value).
//
// Reached only via role + accessible name — never via the CSS class, which is
// exactly what let the bug ship.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import VendorOverviewStage from "./VendorOverviewStage";

const baseProps = (over = {}) => ({
  arc: {
    hotel_name: "Orchid Passaros Goa",
    hotel_city: "Goa",
    category_title: "Housekeeping",
    terms_list: [{ text: "Delivery", body: "Within 30 days of a released PO." }],
  },
  items: [
    { id: 1, variant_name: "Bath towel 500 GSM", uom: "nos", committed_qty: 400 },
  ],
  invitation: {},
  techEnvelope: { required: false },
  acceptedTerms: false,
  termsAcceptedAt: null,
  onAcceptTerms: jest.fn(),
  acceptingTerms: false,
  readOnly: false,
  submissionStart: "01 Sep 26",
  submissionEnd: "15 Sep 26",
  termStart: "01 Oct 26",
  termEnd: "30 Sep 27",
  ...over,
});

const termsCheckbox = () =>
  screen.getByRole("checkbox", { name: /accept the rate-contract terms/i });

describe("VendorOverviewStage — terms acceptance gate (accessibility contract)", () => {
  test("exposes the acceptance gate as a real, focusable checkbox", async () => {
    render(<VendorOverviewStage {...baseProps()} />);

    const box = termsCheckbox();
    expect(box).toBeInTheDocument();
    expect(box).not.toBeChecked();
    expect(box).toBeEnabled();
    expect(box.tabIndex).not.toBe(-1);

    box.focus();
    expect(box).toHaveFocus();
  });

  test("Space on the focused control persists the acceptance", async () => {
    const user = userEvent.setup();
    const onAcceptTerms = jest.fn();
    render(<VendorOverviewStage {...baseProps({ onAcceptTerms })} />);

    termsCheckbox().focus();
    await user.keyboard(" ");

    expect(onAcceptTerms).toHaveBeenCalledTimes(1);
  });

  test("clicking it — or its acknowledgement text — persists the acceptance", async () => {
    const user = userEvent.setup();
    const onAcceptTerms = jest.fn();
    const { rerender } = render(
      <VendorOverviewStage {...baseProps({ onAcceptTerms })} />
    );

    await user.click(termsCheckbox());
    expect(onAcceptTerms).toHaveBeenCalledTimes(1);

    rerender(<VendorOverviewStage {...baseProps({ onAcceptTerms })} />);
    await user.click(
      screen.getByText(/I have read and accept the rate-contract terms/i)
    );
    expect(onAcceptTerms).toHaveBeenCalledTimes(2);
  });

  test("in-flight and read-only states disable the control rather than faking inertness", async () => {
    const user = userEvent.setup();
    const onAcceptTerms = jest.fn();

    const { rerender } = render(
      <VendorOverviewStage {...baseProps({ onAcceptTerms, acceptingTerms: true })} />
    );
    expect(termsCheckbox()).toBeDisabled();
    await user.click(termsCheckbox()).catch(() => {});
    expect(onAcceptTerms).not.toHaveBeenCalled();

    rerender(<VendorOverviewStage {...baseProps({ onAcceptTerms, readOnly: true })} />);
    expect(termsCheckbox()).toBeDisabled();
    await user.click(termsCheckbox()).catch(() => {});
    expect(onAcceptTerms).not.toHaveBeenCalled();
  });

  test("once accepted the gate is replaced by the confirmation panel", () => {
    render(
      <VendorOverviewStage
        {...baseProps({ acceptedTerms: true, termsAcceptedAt: "2026-09-02T10:00:00Z" })}
      />
    );

    expect(screen.getByText("Terms accepted")).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /accept the rate-contract terms/i })
    ).not.toBeInTheDocument();
  });
});
