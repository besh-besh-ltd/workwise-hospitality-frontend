// Vendor Networks §6.4, §9 — group rate contract fulfilment on the vendor
// contract pages.
//
// The network admin acting as the principal (the contract vendor) sees a
// "Fulfilled by" panel per hotel on the accept page and the contract page:
// who supplies the hotel now (HQ until a member accepts), the assignment's
// state, and an entity picker that assigns through POST /routing/assign.
// Nobody else sees it. A member entity that fulfils some hotels reads the
// contract read-only: its hotels named, every sign / decline / clarify /
// amend / addendum control gone.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetContract: jest.fn(),
  vendorDeclineAddendum: jest.fn(),
  vendorRequestOtp: jest.fn(),
  vendorVerifyOtp: jest.fn(),
  vendorDeclineContract: jest.fn(),
  vendorRequestClarification: jest.fn(),
}));
jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  getRoutingQueue: jest.fn(),
  assignSubject: jest.fn(),
  revokeAssignment: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "77" }, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";

import reducer, { setUserProfile } from "@/redux/slice";
import * as ArcApi from "@/services/arc_v2";
import * as NetApi from "@/services/vendorNetwork";
import VendorContractPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/index";
import VendorAcceptPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/accept";

const GOA = 3;
const MUMBAI = 4;
const PUNE = 5;

const adminNetwork = { org_id: 7, org_name: "Alpha Network", role: "ORG_ADMIN", acting_entity_id: 10, is_principal: true, actable_entities: [] };

const hotels = [
  { hotel_id: GOA, name: "Goa Resort", city: "Goa", state: "Goa" },
  { hotel_id: MUMBAI, name: "Mumbai Suites", city: "Mumbai", state: "Maharashtra" },
  { hotel_id: PUNE, name: "Pune Inn", city: "Pune", state: "Maharashtra" },
];

const principalContract = ({ status = "active", isGroup = true } = {}) => ({
  data: {
    contract: { id: 77, status, vendor_id: 10, vendor_name: "Alpha Linen", arc_number: "ARC-1", signed_by_vendor_at: "2026-09-01" },
    arc: { arc_number: "ARC-1", title: "Linen group", is_group: isGroup, hotel_name: "Goa Resort" },
    hotels,
    lines: [{
      id: 501, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5, committed_qty: 900, consumed_qty: 0,
      hotels: hotels.map((h) => ({ hotel_id: h.hotel_id, committed_qty: 300, consumed_qty: 0 })),
    }],
    callOffs: [],
    amendments: [{ id: 9, amendment_type: "price", status: "requested", amendment_from: "2026-10-01", chain: [] }],
    clarifications: [],
  },
});

const memberContract = () => ({
  data: {
    contract: { id: 77, status: "active", vendor_id: 10, vendor_name: "Alpha Linen", arc_number: "ARC-1", document_s3_url: null, document_hash: null },
    arc: { arc_number: "ARC-1", title: "Linen group", is_group: true, hotel_name: null },
    hotels: [hotels[1]],
    lines: [{
      id: 501, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5, committed_qty: 300, consumed_qty: 0,
      effective_unit_rate: 100, hotels: [{ hotel_id: MUMBAI, committed_qty: 300, consumed_qty: 0, effective_unit_rate: 100 }],
    }],
    callOffs: [],
    amendments: [],
    clarifications: [],
    viewer_role: "fulfilment_member",
  },
});

const ORG = {
  status: 1,
  data: {
    org: { id: 7, name: "Alpha Network", principal_vendor_id: 10 },
    entities: [
      { vendor_id: 10, name: "Alpha Linen", relationship: "PRINCIPAL", status: "ACTIVE" },
      { vendor_id: 11, name: "Alpha West", relationship: "BRANCH", status: "ACTIVE" },
      { vendor_id: 12, name: "Linen Dealers", relationship: "DEALER", status: "ACTIVE" },
      { vendor_id: 13, name: "Old Branch", relationship: "BRANCH", status: "SUSPENDED" },
    ],
  },
};

const row = (over) => ({
  id: 900, org_id: 7, subject_type: "ARC_HOTEL", subject_id: 77, hotel_id: MUMBAI,
  assigned_vendor_id: 11, assignee_name: "Alpha West", assignee_entity_status: "ACTIVE", status: "ACCEPTED",
  acted_at: "2026-10-05T10:00:00.000Z", ...over,
});

const QUEUE = {
  status: 1,
  data: {
    unrouted: [
      { subject_type: "ARC_HOTEL", subject_id: 77, hotel_id: GOA, hotel_ids: [GOA], candidates: [{ vendor_id: 12, name: "Linen Dealers", specificity: 3, preference_rank: 1, covers_all_hotels: true, hotels_covered: [GOA] }] },
      // another contract's hotel: never shown on this page
      { subject_type: "ARC_HOTEL", subject_id: 78, hotel_id: GOA, hotel_ids: [GOA], candidates: [] },
    ],
    pending: [row({ id: 901, hotel_id: PUNE, assigned_vendor_id: 12, assignee_name: "Linen Dealers", status: "PENDING", acted_at: null })],
    accepted: [row({})],
    declined: [],
  },
};

const renderWith = (Page, network = adminNetwork) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Alpha Linen", network }));
  return render(<Provider store={store}><Page /></Provider>);
};

const panel = () => screen.findByRole("region", { name: "Fulfilled by" });
const hotelRow = async (name) => within(await panel()).findByRole("listitem", { name });

beforeEach(() => {
  jest.clearAllMocks();
  NetApi.getOrg.mockResolvedValue(ORG);
  NetApi.getRoutingQueue.mockResolvedValue(QUEUE);
  NetApi.assignSubject.mockResolvedValue({ status: 1, message: "Assigned", data: { id: 950 } });
  NetApi.revokeAssignment.mockResolvedValue({ status: 1, message: "Assignment revoked" });
});

const dialog = () => screen.findByRole("dialog");

describe("the principal's network admin — Fulfilled by panel", () => {
  test("each hotel shows who supplies it and the assignment's state", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    renderWith(VendorContractPage);

    const goa = await hotelRow("Goa Resort");
    expect(goa).toHaveTextContent("Supplied by Alpha Linen (HQ)");
    expect(within(goa).queryByText("Accepted")).toBeNull();
    // Coverage suggests Linen Dealers for Goa.
    expect(within(goa).getByRole("button", { name: "Assign to Linen Dealers" })).toBeInTheDocument();

    const mumbai = await hotelRow("Mumbai Suites");
    expect(mumbai).toHaveTextContent("Supplied by Alpha West");
    expect(within(mumbai).getByText("Accepted")).toBeInTheDocument();
    // Reassigning offers everyone else, not the current fulfiller nor a suspended entity.
    const options = within(within(mumbai).getByRole("combobox")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Another entity…", "Linen Dealers"]);

    const pune = await hotelRow("Pune Inn");
    expect(pune).toHaveTextContent("Supplied by Alpha Linen (HQ)");
    expect(within(pune).getByText("Pending")).toBeInTheDocument();
    expect(pune).toHaveTextContent("Waiting for Linen Dealers to accept");
  });

  // Task 20 / D3: a hotel whose matches are excluded is not described as matching nobody.
  test("a pending hotel says who it waits for; a refused match is named with its reason", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    NetApi.getRoutingQueue.mockResolvedValue({
      status: 1,
      data: {
        ...QUEUE.data,
        unrouted: [{ ...QUEUE.data.unrouted[0], candidates: [], excluded: [{ vendor_id: 12, name: "Linen Dealers", reason: "DECLINED" }] }],
        pending: [{ ...QUEUE.data.pending[0], candidates: [{ vendor_id: 12, name: "Linen Dealers", specificity: 3, preference_rank: 1, covers_all_hotels: true, hotels_covered: [PUNE] }], excluded: [] }],
      },
    });
    renderWith(VendorContractPage);

    const goa = await hotelRow("Goa Resort");
    expect(within(goa).getByText(/Coverage matches Linen Dealers \(declined\), so it is not suggested/)).toBeInTheDocument();
    const pune = await hotelRow("Pune Inn");
    expect(within(pune).getByText("Already pending with Linen Dealers — waiting for a reply.")).toBeInTheDocument();
    for (const li of [goa, pune]) expect(within(li).queryByText("No entity's coverage matches this item.")).toBeNull();
  });

  test("assigning a hotel posts an ARC_HOTEL assignment for this contract and reloads the state", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    renderWith(VendorContractPage);

    const goa = await hotelRow("Goa Resort");
    fireEvent.change(within(goa).getByRole("combobox", { name: "Other entity for Goa Resort" }), { target: { value: "11" } });
    fireEvent.click(within(goa).getByRole("button", { name: "Assign to the selected entity" }));

    await waitFor(() =>
      expect(NetApi.assignSubject).toHaveBeenCalledWith({ subject_type: "ARC_HOTEL", subject_id: 77, hotel_id: GOA, assignee_vendor_id: 11 })
    );
    await waitFor(() => expect(NetApi.getRoutingQueue).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith("Assigned");
  });

  test("a refusal shows the routing message", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    NetApi.assignSubject.mockRejectedValue({ response: { status: 400, data: { status: 0, reason: "GROUP_ARC_ONLY", message: "x" } } });
    renderWith(VendorContractPage);

    const goa = await hotelRow("Goa Resort");
    fireEvent.click(within(goa).getByRole("button", { name: "Assign to Linen Dealers" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Fulfilment routing is available for group rate contracts only.")
    );
  });

  test("Revert to HQ asks first, then revokes the hotel's live assignment and reloads", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    renderWith(VendorContractPage);

    const mumbai = await hotelRow("Mumbai Suites");
    // Goa has no live assignment: nothing to revert.
    expect(within(await hotelRow("Goa Resort")).queryByRole("button", { name: /revert/i })).toBeNull();

    fireEvent.click(within(mumbai).getByRole("button", { name: "Revert Mumbai Suites to HQ" }));
    const modal = await dialog();
    expect(modal).toHaveTextContent("Your head office supplies Mumbai Suites again");
    fireEvent.click(within(modal).getByRole("button", { name: "Revert to HQ" }));

    await waitFor(() => expect(NetApi.revokeAssignment).toHaveBeenCalledWith(900));
    expect(NetApi.revokeAssignment).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(NetApi.getRoutingQueue).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith("Assignment revoked");
  });

  test("cancelling Revert to HQ changes nothing", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    renderWith(VendorContractPage);

    const pune = await hotelRow("Pune Inn");
    fireEvent.click(within(pune).getByRole("button", { name: "Revert Pune Inn to HQ" }));
    fireEvent.click(within(await dialog()).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(NetApi.revokeAssignment).not.toHaveBeenCalled();
    expect(NetApi.getRoutingQueue).toHaveBeenCalledTimes(1);
  });

  test("a revert refusal shows the routing message", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    NetApi.revokeAssignment.mockRejectedValue({ response: { status: 409, data: { status: 0, reason: "CONFLICT", message: "x" } } });
    renderWith(VendorContractPage);

    fireEvent.click(within(await hotelRow("Pune Inn")).getByRole("button", { name: "Revert Pune Inn to HQ" }));
    fireEvent.click(within(await dialog()).getByRole("button", { name: "Revert to HQ" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Someone else routed this item at the same time. The queue has been refreshed; check it and retry.")
    );
  });

  test("reassigning a hotel a member has accepted asks first, naming where future call-offs go", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    renderWith(VendorContractPage);

    const mumbai = await hotelRow("Mumbai Suites");
    fireEvent.change(within(mumbai).getByRole("combobox"), { target: { value: "12" } });
    fireEvent.click(within(mumbai).getByRole("button", { name: "Reassign to the selected entity" }));

    const modal = await dialog();
    expect(modal).toHaveTextContent("Future call-offs for Mumbai Suites will go to Linen Dealers");
    expect(NetApi.assignSubject).not.toHaveBeenCalled();
    fireEvent.click(within(modal).getByRole("button", { name: "Reassign" }));
    await waitFor(() =>
      expect(NetApi.assignSubject).toHaveBeenCalledWith({ subject_type: "ARC_HOTEL", subject_id: 77, hotel_id: MUMBAI, assignee_vendor_id: 12 })
    );
  });

  test("an accepted entity that is no longer ACTIVE does not supply: HQ does", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract());
    NetApi.getRoutingQueue.mockResolvedValue({
      ...QUEUE,
      data: { ...QUEUE.data, accepted: [row({ assignee_entity_status: "SUSPENDED" })] },
    });
    renderWith(VendorContractPage);

    const mumbai = await hotelRow("Mumbai Suites");
    expect(mumbai).toHaveTextContent("Supplied by Alpha Linen (HQ)");
    expect(mumbai).toHaveTextContent("Alpha West accepted but is not active, so HQ supplies this hotel");
  });

  test("the accept page carries the same panel while the contract awaits signature", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract({ status: "awaiting_acceptance" }));
    renderWith(VendorAcceptPage);

    expect(await hotelRow("Goa Resort")).toHaveTextContent("Supplied by Alpha Linen (HQ)");
    // Routing never blocks signing: the signing flow is still there.
    expect(screen.getAllByRole("button", { name: /decline/i }).length).toBeGreaterThan(0);
  });
});

describe("who never sees the panel", () => {
  const cases = [
    ["a vendor with no network", { network: null }, {}],
    ["an entity member", { network: { ...adminNetwork, role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11 } }, {}],
    ["the admin acting as a member entity", { network: { ...adminNetwork, is_principal: false, acting_entity_id: 11 } }, {}],
    ["the admin, on a single-hotel contract", { network: adminNetwork }, { isGroup: false }],
    ["the admin, on an expired contract", { network: adminNetwork }, { status: "expired" }],
  ];
  test.each(cases)("%s", async (_label, { network }, contractOpts) => {
    ArcApi.vendorGetContract.mockResolvedValue(principalContract(contractOpts));
    renderWith(VendorContractPage, network);
    expect(await screen.findByText("Linen group")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Fulfilled by" })).toBeNull();
    expect(NetApi.getRoutingQueue).not.toHaveBeenCalled();
  });
});

describe("a fulfilment member's read-only view", () => {
  const memberNetwork = { ...adminNetwork, role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11 };

  test("the contract page names its hotels and hides every contract action", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(memberContract());
    renderWith(VendorContractPage, memberNetwork);

    expect(await screen.findByText("Fulfilling for: Mumbai Suites")).toBeInTheDocument();
    expect(screen.getByText("Contract you fulfil")).toBeInTheDocument();
    expect(screen.queryByText(/request amendment/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /amendments/i })).toBeNull();
    expect(screen.queryByText(/download pdf/i)).toBeNull();
    expect(screen.queryByText(/sign addendum/i)).toBeNull();
    expect(screen.queryByRole("region", { name: "Fulfilled by" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /contract document/i }));
    expect(screen.queryByRole("button", { name: /pdf copy/i })).toBeNull();
    expect(screen.getByText("Vendor (contract holder)")).toBeInTheDocument();
  });

  test("even the admin, when the server answers with the member view, gets no panel", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(memberContract());
    renderWith(VendorContractPage, adminNetwork);
    expect(await screen.findByText("Fulfilling for: Mumbai Suites")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Fulfilled by" })).toBeNull();
    expect(NetApi.getRoutingQueue).not.toHaveBeenCalled();
  });

  test("the accept page is read-only: nothing to sign, decline, flag or clarify", async () => {
    ArcApi.vendorGetContract.mockResolvedValue({
      data: { ...memberContract().data, contract: { ...memberContract().data.contract, status: "awaiting_acceptance" } },
    });
    renderWith(VendorAcceptPage, memberNetwork);

    expect(await screen.findByText("Fulfilling for: Mumbai Suites")).toBeInTheDocument();
    expect(screen.getByText("Bath towel")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByText(/sign with otp/i)).toBeNull();
    expect(screen.queryByText(/submit clarification/i)).toBeNull();
    expect(screen.queryByText(/flag/i)).toBeNull();
    expect(screen.queryByText(/accept the commercial terms/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Open contract" })).toHaveAttribute("href", "/dashboard/vendor/rate-contracts/77");
  });
});
