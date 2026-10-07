// /dashboard/vendor/network/coverage — per-entity coverage rules (spec §6.1,
// §9). The admin picks a member entity (never the principal), edits its
// STATE / CITY / HOTEL include-exclude rules, each optionally for one
// category, and saves them with one PUT that replaces the set. The preview
// lists the network's hotels the saved rules cover and which rule matched.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  getCoverage: jest.fn(),
  putCoverage: jest.fn(),
  lookupCoverageStates: jest.fn(),
  lookupCoverageCities: jest.fn(),
  lookupCoverageHotels: jest.fn(),
}));
jest.mock("@/services/products", () => ({
  __esModule: true,
  nestedCategoryData: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile } from "@/redux/slice";
import * as api from "@/services/vendorNetwork";
import { nestedCategoryData } from "@/services/products";
import CoveragePage from "@/pages/dashboard/vendor/network/coverage";

const adminNetwork = { org_id: 7, org_name: "Daikin India", role: "ORG_ADMIN", acting_entity_id: 10, is_principal: true, actable_entities: [] };

const ORG = {
  status: 1,
  data: {
    org: { id: 7, name: "Daikin India", principal_vendor_id: 10 },
    entities: [
      { vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", status: "ACTIVE" },
      { vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", status: "ACTIVE" },
      { vendor_id: 12, name: "Cool Dealers", relationship: "DEALER", status: "ACTIVE" },
    ],
    members: [],
    link_invites: [],
  },
};

const SAVED_RULES = [
  { id: 1, scope_type: "HOTEL", scope_id: 501, mode: "EXCLUDE", category_id: null, scope_name: "Orchid Pune", category_name: null },
  { id: 2, scope_type: "STATE", scope_id: 33, mode: "INCLUDE", category_id: null, scope_name: "Maharashtra", category_name: null },
];

const coverageOf = (rules, covered) => ({
  status: 1,
  data: {
    vendor_id: 11,
    rules,
    preview: { hotels_considered: 4, truncated: false, covered },
  },
});

const PREVIEW = [
  { id: 500, name: "Orchid Mumbai", city: "Mumbai", state: "Maharashtra", specificity: 1 },
  { id: 502, name: "Lotus Nashik", city: "Nashik", state: "Maharashtra", specificity: 2 },
];

const renderPage = (network = adminNetwork) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Daikin HQ", network }));
  render(
    <Provider store={store}>
      <CoveragePage />
    </Provider>
  );
};

const rulesTable = () => screen.findByRole("table", { name: "Coverage rules" });

beforeEach(() => {
  jest.clearAllMocks();
  api.getOrg.mockResolvedValue(ORG);
  api.getCoverage.mockResolvedValue(coverageOf(SAVED_RULES, PREVIEW));
  api.lookupCoverageStates.mockResolvedValue({ status: 1, data: [{ id: 33, name: "Maharashtra" }, { id: 9, name: "Goa" }] });
  api.lookupCoverageCities.mockResolvedValue({ status: 1, data: [{ id: 701, name: "Panaji" }] });
  api.lookupCoverageHotels.mockResolvedValue({ status: 1, data: [{ id: 503, name: "Orchid Goa", city: "Panaji", state: "Goa" }] });
  nestedCategoryData.mockResolvedValue({ status: 1, type: "category", data: [{ id: 4, title: "HVAC", parent_id: 0 }] });
});

test("offers member entities only, and shows the first one's rules and covered hotels", async () => {
  renderPage();
  const table = await rulesTable();
  const entity = screen.getByLabelText("Entity");
  const options = within(entity).getAllByRole("option").map((o) => o.textContent);
  expect(options).toEqual(["Daikin UP · Branch", "Cool Dealers · Dealer"]);
  expect(api.getCoverage).toHaveBeenCalledWith(11, { category_id: undefined });

  expect(within(table).getByText("Orchid Pune")).toBeInTheDocument();
  expect(within(table).getByText("Maharashtra")).toBeInTheDocument();
  expect(within(table).getAllByText("All categories")).toHaveLength(2);

  const preview = screen.getByRole("table", { name: "Covered hotels" });
  const mumbai = within(preview).getByText("Orchid Mumbai").closest("tr");
  expect(within(mumbai).getByText("State rule")).toBeInTheDocument();
  const nashik = within(preview).getByText("Lotus Nashik").closest("tr");
  expect(within(nashik).getByText("City rule")).toBeInTheDocument();
  expect(screen.getByText(/Of the 4 hotels your network/)).toBeInTheDocument();
});

test("adds a city rule, a category-scoped hotel rule, and saves the whole set with one PUT", async () => {
  const savedAfter = [...SAVED_RULES, { id: 3, scope_type: "CITY", scope_id: 701, mode: "INCLUDE", category_id: null, scope_name: "Panaji" }];
  api.putCoverage.mockResolvedValue({ status: 1, message: "Coverage saved", data: { vendor_id: 11, rules: savedAfter } });
  renderPage();
  await rulesTable();
  await screen.findAllByRole("option", { name: "HVAC" });

  // City rule: state, then city from lookupCoverageCities(state)
  fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "CITY" } });
  fireEvent.change(screen.getByLabelText("State"), { target: { value: "9" } });
  await waitFor(() => expect(api.lookupCoverageCities).toHaveBeenCalledWith(9));
  await screen.findByRole("option", { name: "Panaji" });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "701" } });
  fireEvent.click(screen.getByRole("button", { name: "Add rule" }));
  expect(await within(await rulesTable()).findByText("Panaji")).toBeInTheDocument();
  expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

  // Hotel rule: hotels only from the lookup (the network's hotel set)
  fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "HOTEL" } });
  await waitFor(() => expect(api.lookupCoverageHotels).toHaveBeenCalledWith(""));
  fireEvent.change(screen.getByLabelText("Find hotel"), { target: { value: " goa " } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(api.lookupCoverageHotels).toHaveBeenLastCalledWith("goa"));
  await screen.findByRole("option", { name: "Orchid Goa · Panaji" });
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "503" } });
  fireEvent.change(screen.getByLabelText("Mode"), { target: { value: "EXCLUDE" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Add rule" }));
  const table = await rulesTable();
  const goaRow = within(table).getByText("Orchid Goa").closest("tr");
  expect(within(goaRow).getByText("HVAC")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Save coverage" }));
  await waitFor(() => expect(api.putCoverage).toHaveBeenCalledTimes(1));
  expect(api.putCoverage).toHaveBeenCalledWith(11, {
    rules: [
      { scope_type: "HOTEL", scope_id: 501, mode: "EXCLUDE", category_id: null },
      { scope_type: "STATE", scope_id: 33, mode: "INCLUDE", category_id: null },
      { scope_type: "CITY", scope_id: 701, mode: "INCLUDE", category_id: null },
      { scope_type: "HOTEL", scope_id: 503, mode: "EXCLUDE", category_id: 4 },
    ],
  });
  expect(toast.success).toHaveBeenCalledWith("Coverage saved");
  // The preview is refetched after the save
  await waitFor(() => expect(api.getCoverage).toHaveBeenCalledTimes(2));
});

test("the category field explains which suggestions use category-specific rules", async () => {
  renderPage();
  await rulesTable();
  expect(
    screen.getByText(
      "Category-specific rules are used for rate-contract (ARC) hotel suggestions. RFQ suggestions use rules without a category."
    )
  ).toBeInTheDocument();
});

test("a second rule for the same place and category is refused before saving", async () => {
  renderPage();
  await rulesTable();
  fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "STATE" } });
  fireEvent.change(screen.getByLabelText("State"), { target: { value: "33" } });
  fireEvent.click(screen.getByRole("button", { name: "Add rule" }));
  expect(screen.getByText(/already a rule for this place and category/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save coverage" })).toBeDisabled();
});

test("changing a rule's mode and removing a rule are saved; discard restores the saved set", async () => {
  api.putCoverage.mockResolvedValue({ status: 1, message: "Coverage saved", data: { vendor_id: 11, rules: [] } });
  renderPage();
  await rulesTable();

  fireEvent.click(screen.getByRole("button", { name: "Remove rule Orchid Pune" }));
  expect(screen.queryByText("Orchid Pune")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(await screen.findByText("Orchid Pune")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Mode for Maharashtra"), { target: { value: "EXCLUDE" } });
  fireEvent.click(screen.getByRole("button", { name: "Remove rule Orchid Pune" }));
  fireEvent.click(screen.getByRole("button", { name: "Save coverage" }));
  await waitFor(() =>
    expect(api.putCoverage).toHaveBeenCalledWith(11, {
      rules: [{ scope_type: "STATE", scope_id: 33, mode: "EXCLUDE", category_id: null }],
    })
  );
});

test("a refused save shows the server's message and keeps the edits", async () => {
  api.putCoverage.mockRejectedValue({
    response: { status: 400, data: { status: 0, message: "One or more hotels are not in your network's hotel set" } },
  });
  renderPage();
  await rulesTable();
  fireEvent.change(screen.getByLabelText("Mode for Maharashtra"), { target: { value: "EXCLUDE" } });
  fireEvent.click(screen.getByRole("button", { name: "Save coverage" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("One or more hotels are not in your network's hotel set"));
  expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
});

test("the preview can be checked for one category", async () => {
  renderPage();
  await rulesTable();
  await screen.findAllByRole("option", { name: "HVAC" });
  fireEvent.change(screen.getByLabelText("Preview for category"), { target: { value: "4" } });
  await waitFor(() => expect(api.getCoverage).toHaveBeenLastCalledWith(11, { category_id: 4 }));
});

test("switching entity with unsaved changes asks first", async () => {
  renderPage();
  await rulesTable();
  fireEvent.change(screen.getByLabelText("Mode for Maharashtra"), { target: { value: "EXCLUDE" } });
  fireEvent.change(screen.getByLabelText("Entity"), { target: { value: "12" } });
  const dialog = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
  expect(api.getCoverage).toHaveBeenCalledTimes(1);
  fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));
  await waitFor(() => expect(api.getCoverage).toHaveBeenLastCalledWith(12, { category_id: undefined }));
});

test("a member who is not an admin gets the notice and nothing is loaded", async () => {
  renderPage({ ...adminNetwork, role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11 });
  expect(await screen.findByText("Network admins only")).toBeInTheDocument();
  expect(api.getOrg).not.toHaveBeenCalled();
  expect(api.getCoverage).not.toHaveBeenCalled();
});
