// /dashboard/vendor/network — the vendor-network Overview (spec §5, §8, §9).
// A vendor in no network gets the "Set up network" form (POST /org); after it
// succeeds the profile is refetched (the vendor is now the principal and
// ORG_ADMIN) and the admin dashboard loads. An admin sees the summary tiles,
// routing counts and the entity table from GET /dashboard/summary.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  createOrg: jest.fn(),
  getNetworkDashboardSummary: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({ __esModule: true, getProfile: jest.fn() }));
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
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile, setNetworkProfileRefreshSettled } from "@/redux/slice";
import { createOrg, getNetworkDashboardSummary } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
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
        seat: { status: "active", end_date: "2027-03-31" },
        live_assignments: 2,
        open_pos: 1,
      },
      {
        vendor_id: 12,
        name: "Cool Distributors",
        relationship: "DISTRIBUTOR",
        status: "SUSPENDED",
        seat: { status: "pending", end_date: "2027-03-31" },
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

beforeEach(() => {
  jest.clearAllMocks();
  mockGuest = false;
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
  expect(await screen.findByText("Daikin UP")).toBeInTheDocument();
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
  expect(screen.getByText("Vendor networks need your own sign-in")).toBeInTheDocument();
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
