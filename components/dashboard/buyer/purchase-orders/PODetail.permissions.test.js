// PODetail — who gets the "Force Initiate" button on a draft PO.
//
// The reported bug: a user who holds `awarding.create` sees no Force Initiate
// button on a draft PO and cannot initiate it. The gate itself was fine
// (`po.status === "draft" && (canUpdate || canCreate)`); what was wrong was the
// SCOPE the grants were resolved against. The page asked
// `useModulePermissions` about the hotels in the *viewer's*
// `hospitality_mappings`, and the backend answers that question literally —
// rbacModel.getUserPermissionsForHotels filters on
//   urs.company_id IN (companies of the requested hotels)
//   AND (urs.hotel_id IS NULL OR urs.hotel_id IN (requested hotels))
// so a create grant that lives at the PO's own hotel is dropped from the reply
// whenever the viewer's mapping snapshot doesn't happen to cover that hotel,
// and (the other direction) a create grant held at some unrelated hotel was
// being counted as if it applied here.
//
// The permission hook is mocked with a grant map keyed BY HOTEL — i.e. it
// plays the part the server plays, answering only for the hotels it is asked
// about. That makes these tests about the one thing that was broken: which
// hotel the page asks about. Nothing asserts on call counts or internals; every
// expectation is a button a buyer can or cannot see.

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
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODetailFull, handlePOInitialization } from "@/services/po";
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

const forceInitiate = () => screen.queryByRole("button", { name: /force initiate/i });

beforeEach(() => {
  jest.clearAllMocks();
  state.grants = {};
  state.mappings = [];
});

describe("Force Initiate — a draft PO and a user who holds awarding.create", () => {
  // The reported repro. Stage user 407 holds CEO (awarding read/create/approve)
  // at hotel 30, which is the hotel PO 52 belongs to. Their persisted profile
  // carries no hospitality_mappings, so the page used to resolve permissions
  // for an EMPTY hotel list — useModulePermissions never even calls the API in
  // that case (hooks/useModulePermissions.js: "If no hotel IDs provided, we
  // can't check permissions" -> setPermissions([])) — and the button vanished,
  // while the server (assertPoAccess) would have accepted the initiate.
  it("is live when the viewer has no hospitality_mappings at all", async () => {
    state.grants = { [PO_HOTEL]: ["read", "create", "approve"] };
    state.mappings = [];

    await mount();

    expect(forceInitiate()).toBeEnabled();
    expect(screen.queryByText("access denied")).not.toBeInTheDocument();
  });

  // Same defect, milder shape: the viewer IS mapped, just not to this PO's
  // hotel (or, as here, not even to its hospitality company).
  it("is live when the viewer's mappings do not include the PO's hotel", async () => {
    state.grants = { [PO_HOTEL]: ["read", "create"], 28: [] };
    state.mappings = [{ hospitality_hotel_id: 28 }];

    await mount();

    expect(forceInitiate()).toBeEnabled();
  });

  it("is live for a viewer whose mappings do include the PO's hotel", async () => {
    state.grants = { [PO_HOTEL]: ["read", "create"] };
    state.mappings = [{ hospitality_hotel_id: PO_HOTEL }, { hospitality_hotel_id: 28 }];

    await mount();

    expect(forceInitiate()).toBeEnabled();
  });

  it("initiates the PO when clicked", async () => {
    state.grants = { [PO_HOTEL]: ["read", "create"] };

    await mount();
    fireEvent.click(forceInitiate());

    await waitFor(() => expect(handlePOInitialization).toHaveBeenCalledWith("52"));
  });
});

describe("Force Initiate — when the user may not initiate", () => {
  // Production user 165 (Hitesh K Uchila) is this shape: rfq / quote-compare /
  // negotiation / boq create, but `awarding.read` and nothing more. He can
  // finalise a quote — which is what mints the draft PO — and then cannot move
  // his own draft on. He is not alone: 49 of the 53 users who can finalise in
  // production cannot initiate. The control must not silently vanish on them.
  it("stays on screen, disabled and explained, for a user with only awarding.read", async () => {
    state.grants = { [PO_HOTEL]: ["read"] };
    state.mappings = [{ hospitality_hotel_id: PO_HOTEL }];

    await mount();

    const btn = forceInitiate();
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
    expect(screen.getByText(/awarding · create/)).toBeInTheDocument();
    expect(screen.getByText(/cannot initiate it/i)).toBeInTheDocument();
  });

  it("does not call the initiate endpoint when that disabled control is clicked", async () => {
    state.grants = { [PO_HOTEL]: ["read"] };

    await mount();
    fireEvent.click(forceInitiate());

    expect(handlePOInitialization).not.toHaveBeenCalled();
  });

  // The other half of the scoping bug: a create grant held somewhere else is
  // not a create grant here. The union over the viewer's mapped hotels used to
  // offer a LIVE button on this PO to a user whose only create grant sits at a
  // different hotel — stage user 405 (create at hotel 31, read-only at 30) is
  // exactly that shape.
  it("is disabled when the user's create grant belongs to a different hotel", async () => {
    state.grants = { [PO_HOTEL]: ["read"], 31: ["read", "create", "approve"] };
    state.mappings = [
      { hospitality_hotel_id: PO_HOTEL },
      { hospitality_hotel_id: 31 },
      { hospitality_hotel_id: 32 },
    ];

    await mount();

    expect(forceInitiate()).toBeDisabled();
  });

  // Nothing to initiate, so neither the control nor the explanation belongs
  // here — the note is about a stuck draft, not about the user.
  it("is absent on a PO that is no longer a draft, even with full grants", async () => {
    state.grants = { [PO_HOTEL]: ["read", "create", "update", "approve"] };
    state.mappings = [{ hospitality_hotel_id: PO_HOTEL }];

    await mount({ status: "pending_approval", status_label: "Pending Approval" });

    expect(forceInitiate()).not.toBeInTheDocument();
    expect(screen.queryByText(/awarding · create/)).not.toBeInTheDocument();
  });

  it("says nothing about permissions when the user CAN initiate", async () => {
    state.grants = { [PO_HOTEL]: ["read", "create"] };

    await mount();

    expect(forceInitiate()).toBeEnabled();
    expect(screen.queryByText(/awarding · create/)).not.toBeInTheDocument();
  });
});

describe("POs the backend returns without a hotel", () => {
  // Legacy non-hospitality POs carry no hotel on either side of the
  // RFQ/ARC COALESCE. There is no entity hotel to scope to, so the viewer's
  // own mappings remain the fallback rather than the page going dark.
  it("falls back to the viewer's mapped hotels", async () => {
    state.grants = { 28: ["read", "create"] };
    state.mappings = [{ hospitality_hotel_id: 28 }];

    await mount({ hotel_id: null, department_id: null });

    expect(forceInitiate()).toBeEnabled();
  });
});
