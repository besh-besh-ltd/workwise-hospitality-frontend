// PODetail on a phone — where every PO approval email and notification lands.
//
// Approvers decide from their phones (prod: median 29.5h, p90 124h to decide a
// PO). At 390px the hero crushed the PO number to 0px and clipped "Approve PO",
// the items table clipped the Amount column, and the action card with the
// buttons sat at the very bottom of the page. The phone now gets:
//   - a sticky MobileActionBar (Reject / Approve, with the PO total), and
//   - an Approve that ASKS first, because a stray tap on a bar under the thumb
//     must not approve a ₹15L order. Desktop Approve still submits directly
//     (pinned in PODetail.test.js).
//
// jsdom cannot evaluate media queries, so the bar is always in the DOM here;
// the "phone only" half is pinned textually against the stylesheet below.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "605" },
    asPath: "/dashboard/buyer/purchase-orders/605",
    pathname: "/dashboard/buyer/purchase-orders/[id]",
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 125, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
const mockPerms = { canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false };
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => mockPerms,
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(() => Promise.resolve({ message: "PO approved successfully" })),
  handlePOInitialization: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve(null)),
}));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODetailFull, handlePOApproval } from "@/services/po";
import PODetail from "./PODetail";

// PO #138877 as it stood when the audit was run: ₹15,55,004, three induction
// lines, pending at L3 on uid 125.
const po = (over = {}) => ({
  id: 605,
  po_number: "138877",
  status: "pending_approval",
  status_label: "Pending Approval",
  awaiting_me: true,
  current_step_label: "L3",
  current_approvers: [{ name: "Vishal Kamat" }],
  total_value: 1555004,
  pricing: { total: 1555004 },
  vendor: { name: "PHILEEIN HOSPITALITY PRIVATE LIMITED" },
  rfq: { number: "536263", id: 719 },
  items: [
    { name: "INDUCTION BRATT PAN SS", quantity: 2, unit: "NOS", unit_price: 330000, gst: 18 },
    { name: "INDUCTION KADHAI SS", quantity: 1, unit: "NOS", unit_price: 220000, gst: 18 },
  ],
  workflow: [],
  docs: [],
  comparison: [{ vendor: "PHILEEIN HOSPITALITY PRIVATE LIMITED", amount: 1555004, is_winner: true }],
  payment_terms: [],
  tech_eval: [],
  key_dates: [],
  activity: [],
  decision_checks: [],
  ...over,
});

const mount = async (over = {}) => {
  getPODetailFull.mockResolvedValue(po(over));
  const utils = render(<PODetail id="605" />);
  await screen.findByText("Items & pricing");
  return utils;
};

// The bar portals itself into <body> from an effect, one render after the
// page's data arrives — find, don't get.
const bar = () => screen.findByRole("region", { name: "PO decision" });

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockPerms, { canApprove: true });
});
afterEach(() => document.body.classList.remove("has-mobile-action-bar"));

describe("phone decision bar", () => {
  it("offers Reject and Approve with the PO total, outside the page flow", async () => {
    const { container } = await mount();
    const region = await bar();
    // Portalled to <body>, so no parent overflow can clip it.
    expect(container).not.toContainElement(region);
    expect(within(region).getByText("₹15,55,004.00")).toBeInTheDocument();
    expect(within(region).getByText("#138877")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Reject purchase order" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Approve purchase order" })).toBeInTheDocument();
  });

  it("is not there when the PO is not waiting on this user", async () => {
    await mount({ awaiting_me: false });
    expect(screen.queryByRole("region", { name: "PO decision" })).not.toBeInTheDocument();
    // The body flag is set in the same effect that mounts the bar, so this
    // also proves it was never mounted (not merely not portalled yet).
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });

  it("is not there for a user without the approve grant", async () => {
    mockPerms.canApprove = false;
    await mount();
    expect(screen.queryByRole("region", { name: "PO decision" })).not.toBeInTheDocument();
    // The body flag is set in the same effect that mounts the bar, so this
    // also proves it was never mounted (not merely not portalled yet).
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });

  it("is not there once the PO is decided", async () => {
    await mount({ status: "approved", awaiting_me: false });
    expect(screen.queryByRole("region", { name: "PO decision" })).not.toBeInTheDocument();
    // The body flag is set in the same effect that mounts the bar, so this
    // also proves it was never mounted (not merely not portalled yet).
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });
});

describe("phone Approve asks before it submits", () => {
  it("opens a confirmation naming the PO, the amount and the vendor — and sends nothing yet", async () => {
    await mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: "Approve purchase order" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Approve this purchase order?")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("PO #138877");
    expect(dialog).toHaveTextContent("₹15,55,004.00");
    expect(dialog).toHaveTextContent("PHILEEIN HOSPITALITY PRIVATE LIMITED");
    expect(handlePOApproval).not.toHaveBeenCalled();
  });

  it("approves on confirm, carrying the optional comment as the remark", async () => {
    await mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: "Approve purchase order" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByPlaceholderText(/note for the next approver/i), {
      target: { value: "Rates match the ARC" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve PO" }));

    await waitFor(() => expect(handlePOApproval).toHaveBeenCalledTimes(1));
    expect(handlePOApproval).toHaveBeenCalledWith("605", {
      decision: "approved",
      type: "approval",
      remarks: "Rates match the ARC",
    });
  });

  it("approves with an empty remark when no comment is typed — the comment is optional", async () => {
    await mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: "Approve purchase order" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Approve PO" });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(handlePOApproval).toHaveBeenCalledTimes(1));
    expect(handlePOApproval.mock.calls[0][1]).toEqual({ decision: "approved", type: "approval", remarks: "" });
  });

  it("does nothing on Cancel", async () => {
    await mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: "Approve purchase order" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Approve this purchase order?")).not.toBeInTheDocument());
    expect(handlePOApproval).not.toHaveBeenCalled();
  });

  // The description is rendered as HTML by ConfirmationModal; the vendor name
  // is vendor-authored.
  it("renders a vendor name containing markup as text", async () => {
    const evil = '<img src=x onerror="window.__xssApprove=1">Nova';
    await mount({ vendor: { name: evil } });
    fireEvent.click(within(await bar()).getByRole("button", { name: "Approve purchase order" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog.querySelector("img")).toBeNull();
    expect(window.__xssApprove).toBeUndefined();
    expect(dialog).toHaveTextContent(evil);
  });
});

describe("phone Reject", () => {
  it("opens the same reason-required modal as the desktop Reject", async () => {
    await mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: "Reject purchase order" }));

    expect(await screen.findByText("Reject this purchase order?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject PO" })).toBeDisabled();
    expect(handlePOApproval).not.toHaveBeenCalled();
  });
});

describe("markup the phone layout depends on", () => {
  it("marks the hero Approve / Reject so phones can hide them in favour of the bar", async () => {
    await mount();
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const heroButtons = within(hero).getAllByRole("button").filter((b) => /Reject|Approve PO/.test(b.textContent));
    expect(heroButtons).toHaveLength(2);
    heroButtons.forEach((b) => expect(b.className).toContain("heroDecisionBtn"));
    // Download PO is not a decision and stays visible on phones.
    expect(within(hero).getByRole("button", { name: /Download PO/ }).className).not.toContain("heroDecisionBtn");
  });

  it("labels every item value cell so a restacked card can name it", async () => {
    await mount();
    const row = screen.getByText("INDUCTION BRATT PAN SS").closest("tr");
    const labels = Array.from(row.querySelectorAll("td[data-label]")).map((td) => td.getAttribute("data-label"));
    expect(labels).toEqual(["Qty", "Unit price", "GST", "Amount"]);
    expect(row.querySelector("td[data-label='Amount']")).toHaveTextContent("₹7,78,800.00");
  });

  it("labels the quote-comparison cells too", async () => {
    await mount();
    const row = document.querySelector("table[class*='compareTable'] tbody tr");
    const labels = Array.from(row.querySelectorAll("td[data-label]")).map((td) => td.getAttribute("data-label"));
    expect(labels).toEqual(["GSTIN", "Quoted", "Delivery", "Δ vs L1"]);
  });
});

// jsdom can't apply media queries: pin the stylesheet contract instead.
describe("phone CSS contract (PurchaseOrders.module.scss)", () => {
  const css = fs.readFileSync(path.join(__dirname, "PurchaseOrders.module.scss"), "utf8");
  const layer = css.slice(css.indexOf("Phone layer"));
  const block = (q) => {
    // Every `@media (max-width: …)` block for this width inside the phone layer.
    const out = [];
    let at = layer.indexOf(q);
    while (at !== -1) {
      let depth = 0;
      let i = layer.indexOf("{", at);
      const start = i;
      for (; i < layer.length; i++) {
        if (layer[i] === "{") depth++;
        else if (layer[i] === "}" && --depth === 0) break;
      }
      out.push(layer.slice(start, i + 1));
      at = layer.indexOf(q, i);
    }
    return out.join("\n");
  };
  const phone = block("@media (max-width: 768px)");
  const tablet = block("@media (max-width: 991px)");

  it("cancels the shell's 16px mobile padding, not the desktop 20/24px", () => {
    expect(tablet).toMatch(/\.page\s*{\s*margin:\s*-16px;/);
  });

  it("hides the hero decision buttons only on phones", () => {
    expect(phone).toMatch(/\.heroDecisionBtn\s*{\s*display:\s*none/);
    expect(css.slice(0, css.indexOf("Phone layer"))).not.toMatch(/heroDecisionBtn/);
  });

  it("stacks the hero instead of crushing the PO number", () => {
    expect(phone).toMatch(/\.detailHeroInner\s*{[^}]*flex-direction:\s*column/);
  });

  it("restacks the items and quote tables as cards (header hidden, labels from data-label)", () => {
    expect(phone).toMatch(/\.itemsTable\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
    expect(phone).toMatch(/\.compareTable\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
    expect(phone).toMatch(/content:\s*attr\(data-label\)/);
  });

  it("drops the action card's buttons on phones (the sticky bar has them)", () => {
    expect(phone).toMatch(/\.actionCard \.acCta\s*{\s*display:\s*none/);
  });

  it("opens filter popovers as a fixed bottom sheet", () => {
    expect(phone).toMatch(/\.filterMenu\s*{[^}]*position:\s*fixed !important/);
  });

  it("reserves room for the taller (summary + buttons) bar", () => {
    expect(phone).toMatch(/--mobile-action-bar-h:\s*\d+px/);
  });
});
