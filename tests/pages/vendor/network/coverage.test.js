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
// A minimal router whose events keep their handlers so a test can fire routeChangeStart.
const mockRouterHandlers = {};
const mockRouter = {
  events: {
    on: jest.fn((name, fn) => {
      (mockRouterHandlers[name] ||= new Set()).add(fn);
    }),
    off: jest.fn((name, fn) => mockRouterHandlers[name]?.delete(fn)),
    emit: jest.fn(),
  },
};
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => mockRouter }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

const routeHandlers = () => [...(mockRouterHandlers.routeChangeStart || [])];

// A promise the test resolves when it chooses (to deliver responses out of order).
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockRouterHandlers)) delete mockRouterHandlers[k];
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

test("a slow response for the previously selected entity never lands in the editor (no cross-entity save)", async () => {
  const forA = deferred();
  const forB = deferred();
  api.getCoverage.mockImplementation((vendorId) => (vendorId === 11 ? forA.promise : forB.promise));
  api.putCoverage.mockResolvedValue({ status: 1, message: "Coverage saved", data: { vendor_id: 12, rules: [] } });
  renderPage();
  await waitFor(() => expect(api.getCoverage).toHaveBeenCalledWith(11, { category_id: undefined }));

  // Switch to B while A is still loading; B answers first, then A.
  fireEvent.change(screen.getByLabelText("Entity"), { target: { value: "12" } });
  await waitFor(() => expect(api.getCoverage).toHaveBeenCalledWith(12, { category_id: undefined }));
  const bRules = [{ id: 9, scope_type: "STATE", scope_id: 9, mode: "INCLUDE", category_id: null, scope_name: "Goa" }];
  await act(async () => {
    forB.resolve(coverageOf(bRules, [{ id: 503, name: "Orchid Goa", city: "Panaji", state: "Goa", specificity: 1 }]));
  });
  await act(async () => {
    forA.resolve(coverageOf(SAVED_RULES, PREVIEW));
  });

  const table = await rulesTable();
  expect(within(table).getByText("Goa")).toBeInTheDocument();
  expect(within(table).queryByText("Orchid Pune")).toBeNull();
  expect(screen.getByRole("table", { name: "Covered hotels" })).toHaveTextContent("Orchid Goa");
  expect(screen.queryByText("Orchid Mumbai")).toBeNull();

  fireEvent.change(screen.getByLabelText("Mode for Goa"), { target: { value: "EXCLUDE" } });
  fireEvent.click(screen.getByRole("button", { name: "Save coverage" }));
  await waitFor(() =>
    expect(api.putCoverage).toHaveBeenCalledWith(12, {
      rules: [{ scope_type: "STATE", scope_id: 9, mode: "EXCLUDE", category_id: null }],
    })
  );
});

test("leaving the page with unsaved rules asks first; cancelling aborts the route change", async () => {
  renderPage();
  await rulesTable();
  expect(routeHandlers()).toHaveLength(0); // nothing to guard while clean

  fireEvent.change(screen.getByLabelText("Mode for Maharashtra"), { target: { value: "EXCLUDE" } });
  await waitFor(() => expect(routeHandlers()).toHaveLength(1));
  const [onRouteChangeStart] = routeHandlers();

  const confirmSpy = jest.spyOn(window, "confirm").mockReturnValueOnce(false);
  expect(() => onRouteChangeStart("/dashboard/vendor/network/team")).toThrow(/unsaved coverage changes/);
  expect(mockRouter.events.emit).toHaveBeenCalledWith("routeChangeError");

  confirmSpy.mockReturnValueOnce(true);
  expect(() => onRouteChangeStart("/dashboard/vendor/network/team")).not.toThrow();
  confirmSpy.mockRestore();

  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);

  // Discarding the edits removes the guard
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  await waitFor(() => expect(routeHandlers()).toHaveLength(0));
});

test("a failed preview refetch keeps the editor and the edits, with a retry", async () => {
  renderPage();
  await rulesTable();
  await screen.findAllByRole("option", { name: "HVAC" });
  fireEvent.change(screen.getByLabelText("Mode for Maharashtra"), { target: { value: "EXCLUDE" } });
  api.getCoverage.mockRejectedValueOnce({ response: { status: 400, data: { status: 3, message: "Preview failed" } } });
  fireEvent.change(screen.getByLabelText("Preview for category"), { target: { value: "4" } });
  expect(await screen.findByText("Preview failed")).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Coverage rules" })).toBeInTheDocument();
  expect(screen.getByLabelText("Mode for Maharashtra")).toHaveValue("EXCLUDE");
  fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
  await waitFor(() => expect(screen.queryByText("Preview failed")).toBeNull());
});

test("a save whose preview refetch fails still reports success, with a soft warning", async () => {
  api.putCoverage.mockResolvedValue({ status: 1, message: "Coverage saved", data: { vendor_id: 11, rules: SAVED_RULES.slice(1) } });
  renderPage();
  await rulesTable();
  fireEvent.click(screen.getByRole("button", { name: "Remove rule Orchid Pune" }));
  api.getCoverage.mockRejectedValueOnce({ response: { status: 502, data: {} } });
  fireEvent.click(screen.getByRole("button", { name: "Save coverage" }));
  expect(await screen.findByText("Coverage saved, but the preview could not be refreshed.")).toBeInTheDocument();
  expect(toast.success).toHaveBeenCalledWith("Coverage saved");
  expect(toast.error).not.toHaveBeenCalled();
  expect(screen.getByRole("table", { name: "Coverage rules" })).toBeInTheDocument();
  expect(screen.queryByText("Unsaved changes")).toBeNull();
});

test("an entity at the 500-rule limit cannot get another rule", async () => {
  const many = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    scope_type: "CITY",
    scope_id: 10000 + i,
    mode: "INCLUDE",
    category_id: null,
    scope_name: `City ${i}`,
  }));
  api.getCoverage.mockResolvedValue(coverageOf(many, []));
  renderPage();
  await rulesTable();
  fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "STATE" } });
  fireEvent.change(screen.getByLabelText("State"), { target: { value: "9" } });
  fireEvent.click(screen.getByRole("button", { name: "Add rule" }));
  expect(screen.getByText("An entity can have at most 500 rules.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save coverage" })).toBeDisabled();
});

test("only the latest hotel search fills the hotel list", async () => {
  const first = deferred();
  const second = deferred();
  api.lookupCoverageHotels
    .mockResolvedValueOnce({ status: 1, data: [] })
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  renderPage();
  await rulesTable();
  fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "HOTEL" } });
  await waitFor(() => expect(api.lookupCoverageHotels).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("Find hotel"), { target: { value: "or" } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  // The button is disabled while searching, but Enter in the box searches again
  fireEvent.change(screen.getByLabelText("Find hotel"), { target: { value: "lotus" } });
  fireEvent.keyDown(screen.getByLabelText("Find hotel"), { key: "Enter" });
  expect(api.lookupCoverageHotels).toHaveBeenCalledTimes(3);
  await act(async () => {
    second.resolve({ status: 1, data: [{ id: 502, name: "Lotus Nashik", city: "Nashik" }] });
  });
  await act(async () => {
    first.resolve({ status: 1, data: [{ id: 500, name: "Orchid Mumbai", city: "Mumbai" }] });
  });
  const hotel = screen.getByLabelText("Hotel");
  expect(within(hotel).getByRole("option", { name: "Lotus Nashik · Nashik" })).toBeInTheDocument();
  expect(within(hotel).queryByRole("option", { name: "Orchid Mumbai · Mumbai" })).toBeNull();
});
