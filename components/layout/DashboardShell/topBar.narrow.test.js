// Phones (< 576px): the vendor top bar holds the entity switcher, the subscription
// pill, the bell and the avatar on one line. Live E2E at 390px showed the pill
// overlapping a switcher cut to "Acti…", and a member's "Covered by {network}" pill
// wrapping to four lines below the header next to a static label cut to "D…".
//
// Below 576px: the switcher is icon-only (its accessible name and its menu keep the
// full names), the member's static entity label is dropped, and the pill shows a
// one-word label (full text in title / aria-label) and never wraps. Desktop renders
// the same DOM as before; only the stylesheet's narrow block changes what shows.

jest.mock("@/services/subscription", () => ({ __esModule: true, getVendorSubscriptionStatus: jest.fn() }));
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/services/vendorNetwork", () => ({ __esModule: true, switchEntity: jest.fn() }));
jest.mock("@/services/Auth", () => ({ __esModule: true, getProfileAs: jest.fn() }));
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: jest.fn() } }));

import fs from "fs";
import path from "path";
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import reducer, { setUserProfile } from "@/redux/slice";
import { getVendorSubscriptionStatus } from "@/services/subscription";
import VendorSubscriptionPill from "./VendorSubscriptionPill";
import EntitySwitcher from "@/components/layout/Header/EntitySwitcher";

const CSS = fs.readFileSync(path.join(__dirname, "DashboardShell.module.css"), "utf8");

/** The body of the `@media (max-width: 575.98px)` block (balanced braces). */
function narrowBlock() {
  const start = CSS.indexOf("@media (max-width: 575.98px)");
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = CSS.indexOf("{", start); i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}" && --depth === 0) return CSS.slice(start, i + 1);
  }
  throw new Error("unbalanced @media block");
}
const ruleOf = (block, selector) => {
  const m = block.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`));
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
};

const network = (overrides = {}) => ({
  org_id: 7,
  org_name: "Daikin Network (E2E)",
  role: "ORG_ADMIN",
  acting_entity_id: 10,
  is_principal: true,
  actable_entities: [
    { vendor_id: 10, name: "Daikin HQ (E2E)", relationship: "PRINCIPAL", org_id: 7 },
    { vendor_id: 11, name: "Daikin UP (E2E)", relationship: "BRANCH", org_id: 7 },
  ],
  ...overrides,
});
const renderSwitcher = (profile) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile(profile));
  return render(<Provider store={store}><EntitySwitcher /></Provider>);
};

describe("stylesheet: the narrow block", () => {
  test("hides the switcher's text and the static entity label, keeps the icon", () => {
    const block = narrowBlock();
    expect(ruleOf(block, "entitySwitcherText")).toMatch(/display:\s*none/);
    expect(ruleOf(block, "entityStaticLabel")).toMatch(/display:\s*none/);
  });

  test("swaps the pill's full label for its short one and keeps the pill on one line", () => {
    const block = narrowBlock();
    expect(ruleOf(block, "subPillLabel")).toMatch(/display:\s*none/);
    expect(ruleOf(block, "subPillShort")).toMatch(/display:\s*inline/);
    expect(CSS).toMatch(/\.subPillLabel\s*\{[^}]*white-space:\s*nowrap/);
    // desktop: the short label is hidden outside the narrow block
    expect(CSS).toMatch(/\.subPillShort\s*\{[^}]*display:\s*none/);
  });
});

describe("entity switcher", () => {
  test("its accessible name carries the full 'Acting as' text, so icon-only still reads right", () => {
    renderSwitcher({ id: 10, name: "Daikin HQ (E2E)", network: network() });
    const btn = screen.getByRole("button", { name: "Acting as Daikin HQ (E2E) · Daikin Network (E2E). Switch entity" });
    expect(btn.querySelector(".entitySwitcherText")).toHaveTextContent("Acting as Daikin HQ (E2E) · Daikin Network (E2E)");
  });

  test("the static single-entity label is marked so phones can drop it", () => {
    renderSwitcher({
      id: 11,
      name: "Daikin UP (E2E)",
      network: network({ role: "ENTITY_MEMBER", acting_entity_id: 11, is_principal: false, actable_entities: [{ vendor_id: 11, name: "Daikin UP (E2E)", relationship: "BRANCH", org_id: 7 }] }),
    });
    expect(screen.getByLabelText("Acting entity")).toHaveClass("entityStaticLabel");
  });
});

describe("subscription pill short label", () => {
  test("a covered member: short 'Covered', full text in title and aria-label", async () => {
    getVendorSubscriptionStatus.mockResolvedValue({
      status: 1,
      data: {
        covered_by_network: {
          org_name: "Daikin Network (E2E)", entity_status: "ACTIVE", subscription_active: true, seat_active: true, seat_valid_until: "2027-03-31",
        },
      },
    });
    render(<VendorSubscriptionPill />);
    const pill = await screen.findByRole("button", { name: "Subscription: Covered by Daikin Network (E2E)" });
    expect(pill).toHaveAttribute("title", "Covered by Daikin Network (E2E)");
    expect(pill.querySelector(".subPillShort")).toHaveTextContent(/^Covered$/);
    expect(pill.querySelector(".subPillLabel")).toHaveTextContent("Covered by Daikin Network (E2E)");
  });

  test("an active subscription: short label is the days left", async () => {
    getVendorSubscriptionStatus.mockResolvedValue({
      status: 1,
      data: { has_active_subscription: true, subscription: { days_remaining: 334, end_date: "2027-09-01", start_date: "2026-09-01" } },
    });
    render(<VendorSubscriptionPill />);
    const pill = await screen.findByRole("button", { name: "Subscription: Active · 334d" });
    await waitFor(() => expect(pill.querySelector(".subPillShort")).toHaveTextContent(/^334d$/));
  });
});
