// PODetail — Initiate vs Force Initiate.
//
// A purchase order is per-vendor and is built from the quote finalizations made
// so far, so a draft can be initiated while other products on the same RFQ are
// still unfinalized. Initiating FREEZES it: anything finalized afterwards is
// clubbed into a SEPARATE purchase order.
//
// The page therefore offers two different actions on the same control:
//   covers every product  -> green  "Initiate",       plain confirmation
//   does not              -> amber  "Force Initiate", warning that names the
//                                    consequence the buyer cannot see
//
// `covers_all_products` is server-derived (GET /po/detail/:po_id) because the
// client is sent only this PO's items and cannot know what is missing.
//
// Production shape this mirrors: PO 472 on RFQ 809 — 3 products on the RFQ,
// 1 finalized, 1 PO.

const state = {
  // hotel id -> awarding actions granted to this user at that hotel
  grants: {},
  // what get_profile put in redux at login
  mappings: [],
};

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "52" },
    asPath: "/dashboard/buyer/purchase-orders/52",
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
  useSelector: (fn) =>
    fn({ userProfile: { id: 407, hospitality_mappings: state.mappings } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

// Stand-in for POST /rbac/me/permissions/bulk: returns the union of the grants
// held at exactly the hotels it is handed, and — like the real endpoint's
// caller — resolves to nothing at all when handed an empty hotel list.
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: ({ hotelIds = [] }) => {
    const actions = new Set();
    for (const h of hotelIds) for (const a of state.grants[h] || []) actions.add(a);
    return {
      canRead: actions.has("read"),
      canCreate: actions.has("create"),
      canUpdate: actions.has("update"),
      canApprove: actions.has("approve"),
      loading: false,
    };
  },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(() => Promise.resolve({})),
  handlePOInitialization: jest.fn(() => Promise.resolve({ message: "Purchase order has been initiated" })),
  // GET /po/:id/initiators — who holds the grant this viewer is missing.
  // Default: a request that never settles, i.e. the loading state, which is
  // what every test that isn't about that block should see.
  getPOInitiators: jest.fn(() => new Promise(() => {})),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODetailFull, handlePOInitialization, getPOInitiators } from "@/services/po";
import { previewTotals } from "@/services/pricing";
import PODetail from "./PODetail";

/* Stage PO 52 (#108213): a real draft PO on hotel 30 / department 2. */
const PO_HOTEL = 30;
const PO_DEPT = 2;

const po = (over = {}) => ({
  id: 52,
  po_number: "108213",
  status: "draft",
  status_label: "Draft",
  hotel_id: PO_HOTEL,
  department_id: PO_DEPT,
  total_value: 4435.75,
  pricing: { total: 4435.75 },
  vendor: { name: "NovaTech Hospitality Solutions" },
  rfq: { number: "535789", id: 346 },
  items: [{ name: "KEYBOARD", quantity: 1, unit_price: 4435.75, gst: 0, unit: "nos" }],
  workflow: [],
  docs: [],
  comparison: [],
  payment_terms: [],
  tech_eval: [],
  key_dates: [],
  activity: [],
  decision_checks: [],
  global_charges: [],
  ...over,
});

const mount = async (overrides = {}) => {
  getPODetailFull.mockResolvedValue(po(overrides));
  previewTotals.mockResolvedValue({ lines: [{ base: 4435.75, base_tax: 0, charges_total: 0, charges: [] }], global_charges: [], global_charges_total: 0 });
  const utils = render(<PODetail id="52" />);
  await screen.findByText("Items & pricing");
  return utils;
};

// The control now carries one of two labels — "Initiate" when the PO covers
// every product on its RFQ, "Force Initiate" when it does not. These tests are
// about WHO gets the control, not which variant it is, so they match either.
// Variant behaviour is covered in PODetail.initiate.test.js.

const control = () =>
  screen.queryAllByRole("button", { name: /^(force initiate|initiate)$/i })[0] || null;

const dialogText = () => document.body.textContent;

beforeEach(() => {
  jest.clearAllMocks();
  getPOInitiators.mockImplementation(() => new Promise(() => {}));
  state.grants = { [PO_HOTEL]: ["read", "create"] };
  state.mappings = [{ hospitality_hotel_id: PO_HOTEL }];
});

describe("a PO that covers every product on its RFQ", () => {
  const complete = { covers_all_products: true, rfq_product_count: 3, po_product_count: 3 };

  it('reads "Initiate" and is green, not amber', async () => {
    await mount(complete);
    const btn = control();
    expect(btn).toHaveTextContent(/^Initiate$/);
    expect(btn.className).toMatch(/btnSuccess/);
    expect(btn.className).not.toMatch(/btnWarnStrong/);
  });

  it("asks a plain confirmation naming the approval workflow, with no warning", async () => {
    await mount(complete);
    fireEvent.click(control());

    expect(dialogText()).toMatch(/covers every product/i);
    expect(dialogText()).toMatch(/approval workflow configured for this business unit/i);
    // The consequence copy belongs to the force path only.
    expect(dialogText()).not.toMatch(/separate purchase order/i);
  });
});

describe("a PO that does NOT cover every product on its RFQ", () => {
  const partial = { covers_all_products: false, rfq_product_count: 3, po_product_count: 1 };

  it('reads "Force Initiate" and is amber, not green', async () => {
    await mount(partial);
    const btn = control();
    expect(btn).toHaveTextContent(/^Force Initiate$/);
    expect(btn.className).toMatch(/btnWarnStrong/);
    expect(btn.className).not.toMatch(/btnSuccess/);
  });

  it("warns that later finalizations are clubbed into a separate PO, and shows the coverage", async () => {
    await mount(partial);
    fireEvent.click(control());

    const text = dialogText();
    expect(text).toMatch(/does not include every product/i);
    expect(text).toMatch(/separate purchase order/i);
    expect(text).toMatch(/1 of 3/);
  });

  it("does not initiate until the warning is accepted", async () => {
    await mount(partial);
    fireEvent.click(control());
    expect(handlePOInitialization).not.toHaveBeenCalled();

    const all = screen.queryAllByRole("button", { name: /^force initiate$/i });
    fireEvent.click(all[all.length - 1]);
    await waitFor(() => expect(handlePOInitialization).toHaveBeenCalledWith("52"));
  });

  it("does not initiate if the warning is dismissed", async () => {
    await mount(partial);
    fireEvent.click(control());
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(handlePOInitialization).not.toHaveBeenCalled();
  });
});

describe("when the server sends no coverage flag", () => {
  // Call-off POs are sourced from an ARC/MR rather than RFQ finalization, and
  // an older payload may predate the field. Warning a buyer about a condition
  // we have not established is worse than not warning, so the safe default is
  // the plain confirmation.
  it("falls back to the plain Initiate, not the warning", async () => {
    await mount({});
    expect(control()).toHaveTextContent(/^Initiate$/);
    fireEvent.click(control());
    expect(dialogText()).not.toMatch(/separate purchase order/i);
  });
});
