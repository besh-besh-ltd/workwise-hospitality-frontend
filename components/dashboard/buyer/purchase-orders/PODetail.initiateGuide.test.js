// PODetail — the target of the RFQ page's "Open PO to initiate" guide
// (/purchase-orders/:id?action=initiate), and of the prompt shown straight
// after a Commercial Approver approves the award.
//
// The server decides who may initiate (`can_initiate`) and what kind of draft
// this is (`initiate_kind`); the page used to guess from a permission hook that
// has no process axis. Before initiating it focuses the button and explains the
// three steps; afterwards it says who has the PO now and offers the way back to
// the RFQ and the next draft.

const mockRouter = {
  query: { id: "52", action: "initiate" },
  asPath: "/dashboard/buyer/purchase-orders/52?action=initiate",
  pathname: "/dashboard/buyer/purchase-orders/[id]",
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => mockRouter,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 407, hospitality_mappings: [{ hospitality_hotel_id: 30 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
// The permission hook says NO to everything: the page must follow the server's
// can_initiate, not this.
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: false, canUpdate: false, canApprove: false, loading: false }),
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(() => Promise.resolve({})),
  handlePOInitialization: jest.fn(),
  getPOInitiators: jest.fn(() => new Promise(() => {})),
}));
jest.mock("@/services/poSendBack", () => ({
  __esModule: true,
  getSendBacks: jest.fn(() => Promise.resolve([])),
  getSendBackTargets: jest.fn(() => Promise.resolve({ targets: [] })),
  createSendBack: jest.fn(() => Promise.resolve({})),
  respondToSendBack: jest.fn(() => Promise.resolve({})),
  withdrawSendBack: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODetailFull, handlePOInitialization, getPOInitiators } from "@/services/po";
import { previewTotals } from "@/services/pricing";
import PODetail from "./PODetail";

const po = (over = {}) => ({
  id: 52,
  po_number: "139141",
  status: "draft",
  status_label: "Draft",
  hotel_id: 30,
  department_id: 2,
  total_value: 51330,
  pricing: { total: 51330 },
  vendor: { name: "NovaTech Hospitality Solutions" },
  rfq: { number: "536552", id: 346 },
  items: [{ name: "KEYBOARD", quantity: 1, unit_price: 51330, gst: 0, unit: "nos" }],
  workflow: [], docs: [], comparison: [], payment_terms: [], tech_eval: [],
  key_dates: [], activity: [], decision_checks: [], global_charges: [],
  can_initiate: true,
  initiate_kind: "complete",
  initiated_by: 1,
  raised_by: { id: 1, name: "Creator" },
  approval_initiated_by: null,
  sibling_drafts: [],
  ...over,
});

const mount = async (first, { after } = {}) => {
  getPODetailFull.mockResolvedValueOnce(po(first));
  if (after) getPODetailFull.mockResolvedValue(po(after));
  else getPODetailFull.mockResolvedValue(po(first));
  const utils = render(<PODetail id="52" />);
  await screen.findByText("Items & pricing");
  return utils;
};

const confirmButton = () => {
  const all = screen.getAllByRole("button", { name: /^(force initiate|initiate)$/i });
  return all[all.length - 1];
};

const heroButton = () =>
  screen.queryAllByRole("button", { name: /^(force initiate|initiate)$/i })[0] || null;

let scrollSpy;
beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.query = { id: "52", action: "initiate" };
  scrollSpy = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollSpy;
  previewTotals.mockResolvedValue({ lines: [{ base: 51330, base_tax: 0, charges_total: 0, charges: [] }], global_charges: [], global_charges_total: 0 });
  getPOInitiators.mockImplementation(() => new Promise(() => {}));
  handlePOInitialization.mockResolvedValue({ message: "Purchase order has been initiated" });
});

describe("arriving with ?action=initiate on a draft the viewer can initiate", () => {
  test("scrolls to and focuses the Initiate button, and explains the three steps", async () => {
    await mount();
    await waitFor(() => expect(heroButton()).toHaveFocus());
    expect(scrollSpy).toHaveBeenCalled();
    expect(document.getElementById("po-initiate-action")).toContainElement(heroButton());
    expect(screen.getByText(/you're here to initiate this purchase order/i)).toBeInTheDocument();
    expect(screen.getByText(/check the vendor and total above/i)).toHaveTextContent(
      "1. Check the vendor and total above. 2. Check the lines below. 3. Press Initiate."
    );
    expect(
      screen.getByText(/after you initiate, it goes to the po approvers, then to NovaTech Hospitality Solutions for acceptance/i)
    ).toBeInTheDocument();
  });

  test("uses the server's can_initiate even when the permission hook says no", async () => {
    await mount();
    expect(heroButton()).toBeEnabled();
  });

  test("without ?action there is no scroll, no focus and no steps note", async () => {
    mockRouter.query = { id: "52" };
    await mount();
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(heroButton()).not.toHaveFocus();
    expect(screen.queryByText(/you're here to initiate/i)).not.toBeInTheDocument();
  });
});

describe("after a successful initiate", () => {
  const initiated = {
    status: "pending_approval",
    status_label: "Pending approval",
    can_initiate: false,
    current_approvers: [{ name: "Ravi Shah" }, { name: "Anita Rao" }],
    sibling_drafts: [],
  };
  const siblings = [
    { id: 53, po_number: "139142", vendor_name: "Vendor B", total_value: 100, created_at: "2026-10-20T00:00:00Z" },
    { id: 54, po_number: "139143", vendor_name: "Vendor C", total_value: 200, created_at: "2026-10-21T00:00:00Z" },
  ];

  test("names the approvers, links back to the RFQ and offers the next draft", async () => {
    await mount({ sibling_drafts: siblings }, { after: initiated });
    fireEvent.click(heroButton());
    fireEvent.click(confirmButton());

    expect(await screen.findByText(/is now with/i)).toHaveTextContent("PO 139141 is now with Ravi Shah, Anita Rao for approval.");
    const back = screen.getByRole("link", { name: /back to rfq 536552/i });
    expect(back).toHaveAttribute("href", "/dashboard/buyer/rfq-management-details?type=buyer-view&id=346&stage=purchase-order");
    const next = screen.getByRole("link", { name: /next draft: po 139142 \(2 left\)/i });
    expect(next).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/53?action=initiate");
    // action is dropped from the URL so a refresh does not replay the scroll
    expect(mockRouter.replace).toHaveBeenCalledWith(
      { pathname: "/dashboard/buyer/purchase-orders/[id]", query: { id: "52" } },
      undefined,
      { shallow: true }
    );
  });

  test("an auto-approved PO says so and does not invent approvers", async () => {
    await mount({}, { after: { ...initiated, status: "acceptance_pending", status_label: "Awaiting vendor", current_approvers: [] } });
    fireEvent.click(heroButton());
    fireEvent.click(confirmButton());
    expect(await screen.findByText(/initiated and approved automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/has gone to NovaTech Hospitality Solutions for acceptance/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /next draft/i })).not.toBeInTheDocument();
  });
});

describe("a PO that is no longer a draft", () => {
  test("says who initiated it and when, with no button and no scroll", async () => {
    await mount({
      status: "pending_approval",
      status_label: "Pending approval",
      can_initiate: false,
      approval_initiated_by: { id: 9, name: "Sagar Salve", at: "2026-10-20T10:00:00Z" },
    });
    expect(screen.getByText(/was already initiated by/i)).toHaveTextContent(
      /PO 139141 was already initiated by Sagar Salve on .*2026.* It is now Pending approval\./
    );
    expect(heroButton()).toBeNull();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test("the neutral already_initiated reply from a stale tab shows the same note", async () => {
    handlePOInitialization.mockResolvedValue({ data: { already_initiated: true }, message: "Already initiated" });
    await mount({}, {
      after: {
        status: "pending_approval", status_label: "Pending approval", can_initiate: false,
        approval_initiated_by: { id: 9, name: "Sagar Salve", at: "2026-10-20T10:00:00Z" },
      },
    });
    fireEvent.click(heroButton());
    fireEvent.click(confirmButton());
    expect(await screen.findByText(/was already initiated by Sagar Salve/i)).toBeInTheDocument();
    expect(screen.queryByText(/is now with/i)).not.toBeInTheDocument();
  });
});

describe("a viewer who cannot initiate", () => {
  test("sees the reworded who-can-initiate block and no button", async () => {
    getPOInitiators.mockResolvedValue({ initiators: [], total: 0, can_initiate: false });
    await mount({ can_initiate: false });
    expect(heroButton()).toBeNull();
    expect(screen.getByText(/you can't initiate this purchase order/i)).toBeInTheDocument();
    expect(await screen.findByText(/no one can initiate this purchase order yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/any of these people can/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nobody here can initiate/i)).not.toBeInTheDocument();
    expect(screen.getByText(/PO Initiator or Commercial Approver role/i)).toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

describe("moving from one draft to the next (same mounted page, new id)", () => {
  test("the second PO gets its own guide note, focus and ring", async () => {
    const { rerender } = await mount({ sibling_drafts: [{ id: 53, po_number: "139142" }] }, {
      after: { status: "pending_approval", status_label: "Pending approval", can_initiate: false, current_approvers: [{ name: "Ravi Shah" }] },
    });
    fireEvent.click(heroButton());
    fireEvent.click(confirmButton());
    await screen.findByText(/is now with/i);

    // The page keys PODetail on the id, so the next draft is a fresh mount.
    scrollSpy.mockClear();
    mockRouter.query = { id: "53", action: "initiate" };
    getPODetailFull.mockReset();
    getPODetailFull.mockResolvedValue(po({ id: 53, po_number: "139142" }));
    rerender(<PODetail key="53" id="53" />);
    await screen.findByText(/you're here to initiate this purchase order/i);
    expect(screen.queryByText(/is now with/i)).not.toBeInTheDocument();
    await waitFor(() => expect(heroButton()).toHaveFocus());
    expect(scrollSpy).toHaveBeenCalled();
    expect(document.getElementById("po-initiate-action").className).toMatch(/initiateRing/);
  });

  test("the page component keys PODetail on the id", () => {
    const src = require("fs").readFileSync(require("path").join(process.cwd(), "pages/dashboard/buyer/purchase-orders/[id].js"), "utf8");
    expect(src).toMatch(/<PODetail key=\{id\}/);
  });
});

describe("a split draft", () => {
  test("shows plain Initiate, never Force Initiate, and says the rest is on other POs", async () => {
    await mount({ initiate_kind: "split", covers_all_products: false, po_product_count: 4, rfq_product_count: 5 });
    expect(screen.queryByRole("button", { name: /force initiate/i })).toBeNull();
    expect(heroButton()).toHaveTextContent(/^Initiate$/);
    fireEvent.click(screen.getByRole("button", { name: /about initiating this purchase order/i }));
    expect(await screen.findByText(/other products are already on other purchase orders/i)).toBeInTheDocument();
  });

  test("a partial draft keeps the amber Force Initiate", async () => {
    await mount({ initiate_kind: "partial", covers_all_products: false, po_product_count: 8, rfq_product_count: 9 });
    expect(heroButton()).toHaveTextContent(/force initiate/i);
  });
});

describe("phones", () => {
  test("a sticky bar carries Initiate for a draft the viewer can initiate", async () => {
    mockRouter.query = { id: "52" };
    await mount();
    const bar = await screen.findByRole("region", { name: /initiate purchase order/i });
    fireEvent.click(within(bar).getByRole("button", { name: /initiate purchase order/i }));
    expect(await screen.findByText(/it will now go for approval/i)).toBeInTheDocument();
  });

  test("no sticky bar when the viewer cannot initiate", async () => {
    await mount({ can_initiate: false });
    expect(screen.queryByRole("region", { name: /initiate purchase order/i })).toBeNull();
  });
});

describe("links back to the RFQ", () => {
  test("the hero RFQ number is a link and Open RFQ lands on the PO stage", async () => {
    mockRouter.query = { id: "52" };
    await mount();
    expect(screen.getByRole("link", { name: /RFQ #536552/ })).toHaveAttribute(
      "href",
      "/dashboard/buyer/rfq-management-details?type=buyer-view&id=346&stage=purchase-order"
    );
    fireEvent.click(screen.getByRole("button", { name: /open rfq/i }));
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/dashboard/buyer/rfq-management-details?type=buyer-view&id=346&stage=purchase-order"
    );
  });
});

describe("an older backend without can_initiate", () => {
  test("falls back to the permission hook", async () => {
    mockRouter.query = { id: "52" };
    await mount({ can_initiate: undefined, initiate_kind: undefined });
    // the hook above grants nothing -> the old disabled control
    expect(heroButton()).toBeDisabled();
  });
});
