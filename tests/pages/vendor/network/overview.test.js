// /dashboard/vendor/network — the vendor-network Overview (spec §5, §8, §9).
// A vendor in no network gets the "Set up network" form (POST /org); after it
// succeeds the profile is refetched (the vendor is now the principal and
// ORG_ADMIN) and the admin dashboard loads. An admin sees the summary tiles,
// routing counts and the entity table from GET /dashboard/summary.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  createOrg: jest.fn(),
  getNetworkDashboardSummary: jest.fn(),
  getNetworkDashboardPos: jest.fn(),
  getNetworkDashboardContracts: jest.fn(),
  switchEntity: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({ __esModule: true, getProfile: jest.fn(), getProfileAs: jest.fn() }));
const mockHardNavigate = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardNavigate: (...a) => mockHardNavigate(...a) }));
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: jest.fn(() => Promise.resolve()) } }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
let mockGuest = false;
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => mockGuest }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile, setNetworkProfileRefreshSettled } from "@/redux/slice";
import {
  createOrg,
  getNetworkDashboardSummary,
  getNetworkDashboardPos,
  getNetworkDashboardContracts,
  switchEntity,
} from "@/services/vendorNetwork";
import { getProfile, getProfileAs } from "@/services/Auth";
import NetworkOverviewPage from "@/pages/dashboard/vendor/network/index";

const adminNetwork = {
  org_id: 7,
  org_name: "Daikin India",
  role: "ORG_ADMIN",
  actor_user_id: 10,
  acting_entity_id: 10,
  is_principal: true,
  actable_entities: [{ vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", org_id: 7 }],
};

const summary = {
  status: 1,
  data: {
    entities: [
      { vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", status: "ACTIVE", seat: null, live_assignments: 0, open_pos: 3 },
      {
        vendor_id: 11,
        name: "Daikin UP",
        relationship: "BRANCH",
        status: "ACTIVE",
        seat: { status: "active", end_date: "2099-03-31" },
        live_assignments: 2,
        open_pos: 1,
      },
      {
        vendor_id: 12,
        name: "Cool Distributors",
        relationship: "DISTRIBUTOR",
        status: "SUSPENDED",
        seat: { status: "pending", end_date: "2099-03-31" },
        live_assignments: 0,
        open_pos: 0,
      },
    ],
    routing: { unrouted: 4, pending: 5, declined_7d: 1, timed_out_7d: 2 },
    pos: { by_status: { approved: 6, sent: 2, acceptance_pending: 1, completed: 4 } },
  },
};

const renderWith = (profile) => {
  const store = configureStore({ reducer });
  if (profile !== undefined) store.dispatch(setUserProfile(profile));
  render(
    <Provider store={store}>
      <NetworkOverviewPage />
    </Provider>
  );
  return store;
};

const EMPTY_PAGE = { status: 1, data: { items: [], page: 1, page_size: 10, total: 0 } };

beforeEach(() => {
  jest.clearAllMocks();
  mockGuest = false;
  getNetworkDashboardPos.mockResolvedValue(EMPTY_PAGE);
  getNetworkDashboardContracts.mockResolvedValue(EMPTY_PAGE);
});

test("a vendor in no network sees the set-up form and no dashboard call", () => {
  renderWith({ id: 10, user_type: 3, name: "Daikin HQ", network: null });
  expect(screen.getByRole("heading", { name: "Set up your vendor network" })).toBeInTheDocument();
  expect(screen.getByLabelText("Network name")).toBeInTheDocument();
  expect(getNetworkDashboardSummary).not.toHaveBeenCalled();
});

test("setting up a network posts the name, refetches the profile and loads the dashboard", async () => {
  createOrg.mockResolvedValue({ status: 1, message: "Network created", data: { org_id: 7, name: "Daikin India" } });
  getProfile.mockResolvedValue({ status: 1, data: { id: 10, user_type: 3, name: "Daikin HQ", network: adminNetwork } });
  getNetworkDashboardSummary.mockResolvedValue(summary);
  const store = renderWith({ id: 10, user_type: 3, name: "Daikin HQ", network: null });

  fireEvent.change(screen.getByLabelText("Network name"), { target: { value: "  Daikin India  " } });
  fireEvent.click(screen.getByRole("button", { name: "Create network" }));

  await waitFor(() => expect(createOrg).toHaveBeenCalledWith({ name: "Daikin India" }));
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  expect(toast.success).toHaveBeenCalledWith("Network created");
  const table = await screen.findByRole("table", { name: "Network entities" });
  expect(within(table).getByText("Daikin UP")).toBeInTheDocument();
  expect(store.getState().userProfile.network.role).toBe("ORG_ADMIN");
  expect(getNetworkDashboardSummary).toHaveBeenCalledTimes(1);
});

test("an empty name is refused before calling the server", () => {
  renderWith({ id: 10, user_type: 3, network: null });
  fireEvent.click(screen.getByRole("button", { name: "Create network" }));
  expect(createOrg).not.toHaveBeenCalled();
  expect(screen.getByText("Enter a name for your network.")).toBeInTheDocument();
});

test("a 409 on set-up shows the server's message", async () => {
  createOrg.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "You already belong to a network" } },
  });
  renderWith({ id: 10, user_type: 3, network: null });
  fireEvent.change(screen.getByLabelText("Network name"), { target: { value: "Daikin India" } });
  fireEvent.click(screen.getByRole("button", { name: "Create network" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You already belong to a network"));
  expect(getProfile).not.toHaveBeenCalled();
});

test("an admin sees the summary tiles, routing counts and the entity table", async () => {
  getNetworkDashboardSummary.mockResolvedValue(summary);
  renderWith({ id: 10, user_type: 3, network: adminNetwork });

  const table = await screen.findByRole("table", { name: "Network entities" });
  const up = within(table).getByText("Daikin UP").closest("tr");
  expect(within(up).getByText("Branch")).toBeInTheDocument();
  expect(within(up).getByText(/Seat active/)).toBeInTheDocument();
  expect(within(up).getByText("2")).toBeInTheDocument();
  const dist = within(table).getByText("Cool Distributors").closest("tr");
  expect(within(dist).getByText("Suspended")).toBeInTheDocument();
  expect(within(dist).getByText(/Payment pending/)).toBeInTheDocument();

  expect(screen.getByTestId("tile-unrouted")).toHaveTextContent("4");
  expect(screen.getByTestId("tile-pending")).toHaveTextContent("5");
  expect(screen.getByTestId("tile-declined_7d")).toHaveTextContent("1");
  expect(screen.getByTestId("tile-timed_out_7d")).toHaveTextContent("2");
  expect(screen.getByTestId("tile-entities")).toHaveTextContent("3");
  expect(screen.getByTestId("tile-pending-seats")).toHaveTextContent("1");
  // Vendor-facing PO labels; statuses sharing a label are summed.
  const accepted = screen.getByText("Accepted").closest(".pill");
  expect(accepted).toHaveTextContent("6");
  // Task 20 / D5: across the network a sent PO awaits whichever entity it was issued
  // to (often a member), not "you" (the HQ admin reading this page).
  expect(screen.getByText("Awaiting supplier acceptance").closest(".pill")).toHaveTextContent("3");
  expect(screen.queryByText("Awaiting you")).toBeNull();
  expect(screen.getByText("Completed").closest(".pill")).toHaveTextContent("4");
  expect(screen.queryByText("acceptance_pending")).toBeNull();
});

// Task 22 / 5c: at 390px a fixed 3-column inline grid made the page 462px wide. The
// strip uses the ARC v2 three-tile variant, which collapses to one column below 880px.
test("the summary tiles use the responsive three-tile strip, with no fixed inline grid", async () => {
  getNetworkDashboardSummary.mockResolvedValue(summary);
  renderWith({ id: 10, user_type: 3, network: adminNetwork });
  const tile = await screen.findByTestId("tile-entities");
  const strip = tile.closest(".stat-strip");
  expect(strip).toHaveClass("cols-3");
  expect(strip.style.gridTemplateColumns).toBe("");
});

test("an entity member (not an admin) gets a notice and no dashboard call", () => {
  renderWith({
    id: 11,
    user_type: 11,
    network: { ...adminNetwork, role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11 },
  });
  expect(screen.getByText(/Only network admins/)).toBeInTheDocument();
  expect(getNetworkDashboardSummary).not.toHaveBeenCalled();
});

test("a 403 loading the dashboard shows the error and Retry, not the table", async () => {
  getNetworkDashboardSummary.mockRejectedValueOnce({
    response: { status: 403, data: { status: 0, message: "Only network admins can do this" } },
  });
  getNetworkDashboardSummary.mockResolvedValueOnce(summary);
  renderWith({ id: 10, user_type: 3, network: adminNetwork });
  expect(await screen.findByText("Only network admins can do this")).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("table", { name: "Network entities" })).toBeInTheDocument();
});

test("a guest emailed-link session gets a notice, not the set-up form", () => {
  mockGuest = true;
  renderWith({ id: 10, user_type: 3, network: null });
  expect(screen.queryByLabelText("Network name")).toBeNull();
  expect(screen.getByText("Vendor networks need your own sign-in")).toBeInTheDocument();
});

test("a non-vendor in no network gets a notice, not the set-up form", () => {
  renderWith({ id: 5, user_type: 2, network: null });
  expect(screen.queryByLabelText("Network name")).toBeNull();
  // Scope audit #17: neutral copy, not the vendor sign-in advice.
  expect(screen.getByText("Vendor networks are for supplier accounts")).toBeInTheDocument();
  expect(screen.queryByText("Vendor networks need your own sign-in")).toBeNull();
  expect(screen.queryByText(/your vendor account/)).toBeNull();
});

test("a vendor profile without the network key (pre-release) waits for the refetch", () => {
  renderWith({ id: 10, user_type: 3, name: "Daikin HQ" });
  expect(screen.queryByLabelText("Network name")).toBeNull();
  expect(screen.queryByText(/Only network admins/)).toBeNull();
  expect(getNetworkDashboardSummary).not.toHaveBeenCalled();
});

test("once the legacy refetch has settled (e.g. failed), an absent network key reads as no network", () => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Daikin HQ" }));
  store.dispatch(setNetworkProfileRefreshSettled());
  render(
    <Provider store={store}>
      <NetworkOverviewPage />
    </Provider>
  );
  expect(screen.getByLabelText("Network name")).toBeInTheDocument();
  // Rendering only: the stored profile keeps its missing key, so the next load refetches.
  expect("network" in store.getState().userProfile).toBe(false);
});

// ── Scope audit #2: §8 HQ dashboard — the network's POs, its contracts' per-hotel
// fulfilment, and "Act as" on each entity.

const po = (over) => ({
  id: 1,
  po_number: "PO-1001",
  entity_vendor_id: 11,
  entity_name: "Daikin UP",
  hotel_name: "Goa Resort",
  status: "approved",
  amount: 125000,
  created_at: "2026-10-01T10:00:00Z",
  is_call_off: false,
  ...over,
});

describe("network purchase orders", () => {
  test("lists PO, entity, hotel, value, status and date", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardPos.mockResolvedValue({
      status: 1,
      data: { items: [po({}), po({ id: 2, po_number: "PO-1002", entity_vendor_id: 10, entity_name: "Daikin HQ", hotel_name: null, status: "sent", is_call_off: true })], page: 1, page_size: 10, total: 2 },
    });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });

    const table = await screen.findByRole("table", { name: "Network purchase orders" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["PO", "Entity", "Hotel", "Value", "Status", "Date"]);
    const first = within(table).getByText("PO-1001").closest("tr");
    expect(first).toHaveTextContent("Daikin UP");
    expect(first).toHaveTextContent("Goa Resort");
    expect(first).toHaveTextContent("₹1,25,000");
    expect(first).toHaveTextContent("Accepted");
    expect(first).toHaveTextContent("01 Oct 2026");
    const second = within(table).getByText("PO-1002").closest("tr");
    expect(second).toHaveTextContent("Awaiting supplier acceptance");
    expect(second).toHaveTextContent("Call-off");
    expect(getNetworkDashboardPos).toHaveBeenCalledWith({ page: 1, page_size: 10 });
  });

  test("filters by entity and pages through the results", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardPos.mockResolvedValue({ status: 1, data: { items: [po({})], page: 1, page_size: 10, total: 23 } });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    await screen.findByRole("table", { name: "Network purchase orders" });

    fireEvent.change(screen.getByLabelText("Entity"), { target: { value: "11" } });
    await waitFor(() => expect(getNetworkDashboardPos).toHaveBeenLastCalledWith({ page: 1, page_size: 10, entity_vendor_id: 11 }));

    const pager = await screen.findByRole("navigation", { name: "Purchase order pages" });
    expect(pager).toHaveTextContent("Page 1 of 3");
    fireEvent.click(within(pager).getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getNetworkDashboardPos).toHaveBeenLastCalledWith({ page: 2, page_size: 10, entity_vendor_id: 11 }));
  });

  test("an empty network says so", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    expect(await screen.findByText("No purchase orders in the network yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Network purchase orders" })).toBeNull();
  });

  test("a failed load shows the error and Retry reloads", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardPos.mockRejectedValueOnce({ response: { status: 500, data: { status: 0, message: "PO list is down" } } });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    const card = (await screen.findByText("PO list is down")).closest(".section-card");
    getNetworkDashboardPos.mockResolvedValueOnce({ status: 1, data: { items: [po({})], page: 1, page_size: 10, total: 1 } });
    fireEvent.click(within(card).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("PO-1001")).toBeInTheDocument();
  });

  test("shows a loading state while the first page loads", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardPos.mockReturnValue(new Promise(() => {}));
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    expect(await screen.findByText("Loading purchase orders…")).toBeInTheDocument();
  });
});

// Review fix round 1: only the latest request may set the table.
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

describe("network purchase orders: stale responses and removed entities", () => {
  test("a slow earlier response never overwrites the newer filter's rows", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    const first = deferred();
    const second = deferred();
    getNetworkDashboardPos.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    fireEvent.change(await screen.findByLabelText("Entity"), { target: { value: "11" } });
    await waitFor(() => expect(getNetworkDashboardPos).toHaveBeenCalledTimes(2));

    await act(async () => {
      second.resolve({ status: 1, data: { items: [po({ po_number: "PO-UP" })], page: 1, page_size: 10, total: 1 } });
    });
    expect(await screen.findByText("PO-UP")).toBeInTheDocument();
    await act(async () => {
      first.resolve({ status: 1, data: { items: [po({ id: 9, po_number: "PO-ALL" })], page: 1, page_size: 10, total: 1 } });
    });
    expect(screen.queryByText("PO-ALL")).toBeNull();
    expect(screen.getByText("PO-UP")).toBeInTheDocument();
  });

  test("a removed entity seen in the PO rows joins the filter, labelled (removed)", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardPos.mockResolvedValue({
      status: 1,
      data: { items: [po({ id: 5, po_number: "PO-OLD", entity_vendor_id: 44, entity_name: "Old Dealer" })], page: 1, page_size: 10, total: 1 },
    });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    await screen.findByText("PO-OLD");
    const select = screen.getByLabelText("Entity");
    expect(within(select).getByRole("option", { name: "Old Dealer (removed)" })).toHaveValue("44");
    expect(within(select).getByRole("option", { name: "Daikin UP" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "44" } });
    await waitFor(() => expect(getNetworkDashboardPos).toHaveBeenLastCalledWith({ page: 1, page_size: 10, entity_vendor_id: 44 }));
  });

  test("a summary entity with status REMOVED is labelled (removed)", async () => {
    const data = JSON.parse(JSON.stringify(summary.data));
    data.entities.push({ vendor_id: 45, name: "Gone Branch", relationship: "BRANCH", status: "REMOVED", seat: null, live_assignments: 0, open_pos: 0 });
    getNetworkDashboardSummary.mockResolvedValue({ status: 1, data });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    const select = await screen.findByLabelText("Entity");
    expect(within(select).getByRole("option", { name: "Gone Branch (removed)" })).toBeInTheDocument();
  });
});

describe("network contracts", () => {
  test("a slow earlier page never overwrites the newer page", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    const contract = (n) => ({ contract_id: n, arc_id: n, arc_number: `ARC-${n}`, title: "T", status: "active", is_group: false, hotels: [] });
    const first = deferred();
    const second = deferred();
    getNetworkDashboardContracts
      .mockResolvedValueOnce({ status: 1, data: { items: [contract(1)], page: 1, page_size: 10, total: 25 } })
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    const pager = await screen.findByRole("navigation", { name: "Contract pages" });
    fireEvent.click(within(pager).getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getNetworkDashboardContracts).toHaveBeenCalledTimes(2));
    fireEvent.click(within(pager).getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getNetworkDashboardContracts).toHaveBeenCalledTimes(3));
    await act(async () => {
      second.resolve({ status: 1, data: { items: [contract(3)], page: 3, page_size: 10, total: 25 } });
    });
    expect(await screen.findByText("ARC-3")).toBeInTheDocument();
    await act(async () => {
      first.resolve({ status: 1, data: { items: [contract(2)], page: 2, page_size: 10, total: 25 } });
    });
    expect(screen.queryByText("ARC-2")).toBeNull();
    expect(screen.getByText("ARC-3")).toBeInTheDocument();
  });

  test("maps each contract to its hotels and the entity fulfilling each", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardContracts.mockResolvedValue({
      status: 1,
      data: {
        items: [
          {
            contract_id: 77,
            arc_id: 5,
            arc_number: "ARC-77",
            title: "Linen group",
            status: "active",
            is_group: true,
            hotels: [
              { hotel_id: 3, hotel_name: "Goa Resort", fulfilling_vendor_id: 11, fulfilling_name: "Daikin UP", assignment_status: "ACCEPTED" },
              { hotel_id: 4, hotel_name: "Mumbai Suites", fulfilling_vendor_id: 10, fulfilling_name: "Daikin HQ", assignment_status: "PENDING" },
            ],
          },
          { contract_id: 78, arc_id: 6, arc_number: "ARC-78", title: "Soap", status: "active", is_group: false, hotels: [] },
        ],
        page: 1,
        page_size: 10,
        total: 2,
      },
    });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });

    const table = await screen.findByRole("table", { name: "Network contracts" });
    const goa = within(table).getByText("Goa Resort").closest("tr");
    expect(goa).toHaveTextContent("ARC-77");
    expect(goa).toHaveTextContent("Linen group");
    expect(goa).toHaveTextContent("Daikin UP");
    const mumbai = within(table).getByText("Mumbai Suites").closest("tr");
    expect(mumbai).toHaveTextContent("Daikin HQ");
    expect(mumbai).toHaveTextContent("Awaiting reply");
    const soap = within(table).getByText("ARC-78").closest("tr");
    expect(soap).toHaveTextContent("Supplied by HQ");
  });

  test("an org with no contracts says so", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    expect(await screen.findByText("No rate contracts yet.")).toBeInTheDocument();
  });

  test("a failed load shows the error with Retry", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    getNetworkDashboardContracts.mockRejectedValueOnce({ response: { status: 500, data: { status: 0, message: "Contracts are down" } } });
    renderWith({ id: 10, user_type: 3, network: adminNetwork });
    const card = (await screen.findByText("Contracts are down")).closest(".section-card");
    expect(within(card).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("Act as", () => {
  const multi = {
    ...adminNetwork,
    actable_entities: [
      { vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", org_id: 7 },
      { vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", org_id: 7 },
    ],
  };

  test("each entity the admin may act for (other than the current one) has Act as", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    renderWith({ id: 10, user_type: 3, network: multi });
    const table = await screen.findByRole("table", { name: "Network entities" });
    expect(within(table).getByRole("button", { name: "Act as Daikin UP" })).toBeInTheDocument();
    // already acting as HQ; the suspended distributor is not actable
    expect(within(table).queryByRole("button", { name: "Act as Daikin HQ" })).toBeNull();
    expect(within(table).queryByRole("button", { name: "Act as Cool Distributors" })).toBeNull();
  });

  test("Act as switches entity and lands on that entity's dashboard", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
    const switched = { id: 11, user_type: 3, network: { ...multi, acting_entity_id: 11, is_principal: false } };
    getProfileAs.mockResolvedValue({ status: 1, data: switched });
    const store = renderWith({ id: 10, user_type: 3, network: multi });

    fireEvent.click(await screen.findByRole("button", { name: "Act as Daikin UP" }));
    await waitFor(() => expect(mockHardNavigate).toHaveBeenCalledWith("/dashboard/vendor"));
    expect(switchEntity).toHaveBeenCalledWith(11);
    expect(getProfileAs).toHaveBeenCalledWith("tok-up");
    expect(store.getState().userProfile.network.acting_entity_id).toBe(11);
  });

  test("a refused switch shows the reason and stays put", async () => {
    getNetworkDashboardSummary.mockResolvedValue(summary);
    switchEntity.mockRejectedValue({ response: { status: 403, data: { status: 0, message: "You cannot act for this entity" } } });
    renderWith({ id: 10, user_type: 3, network: multi });
    fireEvent.click(await screen.findByRole("button", { name: "Act as Daikin UP" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You cannot act for this entity"));
    expect(mockHardNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Act as Daikin UP" })).not.toBeDisabled();
  });
});

// Task 24 F4: the overview's seat column follows the seat fee the same way.
test("at seat fee 0 an entity with no current seat reads Included", async () => {
  const data = JSON.parse(JSON.stringify(summary.data));
  data.seat_fee_inr = 0;
  data.entities.push({ vendor_id: 13, name: "Old Branch", relationship: "BRANCH", status: "ACTIVE", seat: { status: "active", end_date: "2026-03-31" }, live_assignments: 0, open_pos: 0 });
  getNetworkDashboardSummary.mockResolvedValue({ status: 1, data });
  renderWith({ id: 10, user_type: 3, network: adminNetwork });
  const table = await screen.findByRole("table", { name: "Network entities" });
  const row = within(table).getByText("Old Branch").closest("tr");
  expect(within(row).getByText("Included")).toBeInTheDocument();
});
