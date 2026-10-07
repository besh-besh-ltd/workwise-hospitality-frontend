// /dashboard/vendor/network/entities — Entities & seats (spec §5, §5.1, §9).
// The admin links an existing vendor account (a same-PAN suggestion, or an
// exact email), creates a branch / distributor login, suspends, reactivates or
// removes an entity, and pays for pending seats through Razorpay exactly as
// the vendor subscription does (script load, checkout, verify in the handler).

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  getEntitySuggestions: jest.fn(),
  createLinkInvite: jest.fn(),
  cancelLinkInvite: jest.fn(),
  createEntity: jest.fn(),
  updateEntity: jest.fn(),
  deleteEntity: jest.fn(),
  lookupCoverageStates: jest.fn(),
  lookupCoverageCities: jest.fn(),
  paySeats: jest.fn(),
  verifySeatsPayment: jest.fn(),
}));
jest.mock("@/services/subscription", () => ({ __esModule: true, loadScript: jest.fn() }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile } from "@/redux/slice";
import * as api from "@/services/vendorNetwork";
import { loadScript } from "@/services/subscription";
import EntitiesPage from "@/pages/dashboard/vendor/network/entities";

const adminNetwork = {
  org_id: 7,
  org_name: "Daikin India",
  role: "ORG_ADMIN",
  actor_user_id: 10,
  acting_entity_id: 10,
  is_principal: true,
  actable_entities: [],
};

const entity = (over) => ({
  vendor_id: 11,
  relationship: "BRANCH",
  status: "ACTIVE",
  preference_rank: 0,
  name: "Daikin UP",
  email: "up@daikin.example",
  user_status: 1,
  seat_id: 301,
  seat_status: "active",
  seat_end_date: "2027-03-31",
  seat_fee_amount: "0.00",
  ...over,
});

const orgPayload = (entities, link_invites = []) => ({
  status: 1,
  data: {
    org: { id: 7, name: "Daikin India", principal_vendor_id: 10, routing_mode: "ADMIN_ROUTES", routing_timeout_hours: 24 },
    entities,
    members: [],
    link_invites,
  },
});

const DEFAULT_ENTITIES = [
  entity({ vendor_id: 10, relationship: "PRINCIPAL", name: "Daikin HQ", email: "hq@daikin.example", seat_id: null, seat_status: null, seat_end_date: null, seat_fee_amount: null }),
  entity({}),
  entity({ vendor_id: 12, name: "Cool Distributors", relationship: "DISTRIBUTOR", status: "SUSPENDED", seat_id: 302, seat_status: "pending", seat_fee_amount: "1500.00" }),
];

const conflict = (message, reason) => ({ response: { status: 409, data: { status: 0, message, reason } } });

const renderPage = () => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Daikin HQ", network: adminNetwork }));
  render(
    <Provider store={store}>
      <EntitiesPage />
    </Provider>
  );
};

const rowOf = async (name) => (await screen.findByText(name, { selector: "td *, td" })).closest("tr");

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  api.getOrg.mockResolvedValue(orgPayload(DEFAULT_ENTITIES));
});

test("lists entities with their relationship, status and seat badge, and outgoing invites", async () => {
  api.getOrg.mockResolvedValue(
    orgPayload(DEFAULT_ENTITIES, [
      { id: 91, target_vendor_id: 20, target_name: "Daikin Pune", target_email: "pune@daikin.example", addressed_by: "EMAIL", relationship: "BRANCH", status: "PENDING", expires_at: "2026-10-14T00:00:00Z" },
      { id: 92, target_vendor_id: 21, target_name: "Daikin Goa", target_email: null, addressed_by: "ID", relationship: "DEALER", status: "PENDING", expires_at: "2026-10-14T00:00:00Z" },
    ])
  );
  renderPage();

  const hq = await rowOf("Daikin HQ");
  expect(within(hq).getByText("Principal")).toBeInTheDocument();
  expect(within(hq).queryByRole("button", { name: /Suspend|Remove/ })).toBeNull();
  const up = await rowOf("Daikin UP");
  expect(within(up).getByText(/Seat active/)).toBeInTheDocument();
  expect(within(up).getByRole("button", { name: "Suspend" })).toBeInTheDocument();
  const dist = await rowOf("Cool Distributors");
  expect(within(dist).getByText("Suspended")).toBeInTheDocument();
  expect(within(dist).getByText(/Payment pending/)).toBeInTheDocument();
  expect(within(dist).getByRole("button", { name: "Reactivate" })).toBeInTheDocument();

  const invites = screen.getByRole("table", { name: "Pending link invitations" });
  expect(within(invites).getByText("pune@daikin.example")).toBeInTheDocument();
  const goa = within(invites).getByText("Daikin Goa").closest("tr");
  expect(within(goa).queryByText(/@/)).toBeNull();
});

test("links a suggested same-PAN account by its id", async () => {
  api.getEntitySuggestions.mockResolvedValue({
    status: 1,
    data: {
      pan: "AAACD1234E",
      suggestions: [{ vendor_id: 22, name: "Daikin Kerala", email: "kl@daikin.example", company_name: "Daikin Kerala Pvt Ltd", gstin: "32AAACD1234E1Z5" }],
    },
  });
  api.createLinkInvite.mockResolvedValue({ status: 1, message: "Invitation sent", data: { id: 93 } });
  renderPage();
  await rowOf("Daikin UP");

  fireEvent.click(screen.getByRole("button", { name: "Link existing account" }));
  fireEvent.click(await screen.findByRole("radio", { name: /Daikin Kerala/ }));
  fireEvent.change(screen.getByLabelText("Relationship"), { target: { value: "DISTRIBUTOR" } });
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

  await waitFor(() =>
    expect(api.createLinkInvite).toHaveBeenCalledWith({ relationship: "DISTRIBUTOR", target_vendor_id: 22 })
  );
  expect(toast.success).toHaveBeenCalledWith("Invitation sent");
  await waitFor(() => expect(api.getOrg).toHaveBeenCalledTimes(2));
});

test("links an account by exact email", async () => {
  api.getEntitySuggestions.mockResolvedValue({ status: 1, data: { pan: null, suggestions: [] } });
  api.createLinkInvite.mockResolvedValue({ status: 1, message: "Invitation sent", data: { id: 94 } });
  renderPage();
  await rowOf("Daikin UP");

  fireEvent.click(screen.getByRole("button", { name: "Link existing account" }));
  await screen.findByText(/No other accounts share your PAN/);
  fireEvent.change(screen.getByLabelText("Account email"), { target: { value: " Pune@Daikin.example " } });
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

  await waitFor(() =>
    expect(api.createLinkInvite).toHaveBeenCalledWith({ relationship: "BRANCH", target_email: "Pune@Daikin.example" })
  );
});

test("a link refusal is explained from its reason code", async () => {
  api.getEntitySuggestions.mockResolvedValue({ status: 1, data: { pan: null, suggestions: [] } });
  api.createLinkInvite.mockRejectedValue(conflict("An invitation to this vendor is already pending", "INVITE_PENDING"));
  renderPage();
  await rowOf("Daikin UP");

  fireEvent.click(screen.getByRole("button", { name: "Link existing account" }));
  fireEvent.change(await screen.findByLabelText("Account email"), { target: { value: "pune@daikin.example" } });
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  expect(toast.error.mock.calls[0][0]).toMatch(/already waiting for a reply/);
});

const fillCreateForm = async ({ gstin = "09AAACD1234E1Z5", address = "Hazratganj" } = {}) => {
  fireEvent.click(screen.getByRole("button", { name: "Create branch / distributor" }));
  const state = await screen.findByLabelText("State");
  await screen.findByRole("option", { name: "Uttar Pradesh" });
  fireEvent.change(screen.getByLabelText("Company name"), { target: { value: "Daikin Lucknow" } });
  fireEvent.change(screen.getByLabelText("GSTIN"), { target: { value: gstin.toLowerCase() } });
  fireEvent.change(screen.getByLabelText("Login email"), { target: { value: "lko@daikin.example" } });
  fireEvent.change(state, { target: { value: "33" } });
  await screen.findByRole("option", { name: "Lucknow" });
  fireEvent.change(screen.getByLabelText(/City/), { target: { value: "501" } });
  if (address) fireEvent.change(screen.getByLabelText(/Address/), { target: { value: address } });
  fireEvent.change(screen.getByLabelText("Relationship"), { target: { value: "DEALER" } });
};

test("creates a branch with the validated payload", async () => {
  api.lookupCoverageStates.mockResolvedValue({ status: 1, data: [{ id: 33, name: "Uttar Pradesh" }] });
  api.lookupCoverageCities.mockResolvedValue({ status: 1, data: [{ id: 501, name: "Lucknow" }] });
  api.createEntity.mockResolvedValue({
    status: 1,
    message: "Entity created",
    data: { vendor_id: 30, relationship: "DEALER", seat: { id: 303, status: "active", payable: false, amount: 0 } },
  });
  renderPage();
  await rowOf("Daikin UP");
  await fillCreateForm();
  fireEvent.click(screen.getByRole("button", { name: "Create entity" }));

  await waitFor(() =>
    expect(api.createEntity).toHaveBeenCalledWith({
      company_name: "Daikin Lucknow",
      gstin: "09AAACD1234E1Z5",
      email: "lko@daikin.example",
      state_id: 33,
      city_id: 501,
      address: "Hazratganj",
      relationship: "DEALER",
    })
  );
  expect(api.lookupCoverageCities).toHaveBeenCalledWith(33);
  expect(toast.success).toHaveBeenCalledWith("Entity created");
});

test("the address is optional and is sent as null when left empty", async () => {
  api.lookupCoverageStates.mockResolvedValue({ status: 1, data: [{ id: 33, name: "Uttar Pradesh" }] });
  api.lookupCoverageCities.mockResolvedValue({ status: 1, data: [{ id: 501, name: "Lucknow" }] });
  api.createEntity.mockResolvedValue({ status: 1, message: "Entity created", data: { vendor_id: 31, seat: { status: "active", payable: false } } });
  renderPage();
  await rowOf("Daikin UP");
  await fillCreateForm({ address: "" });
  fireEvent.click(screen.getByRole("button", { name: "Create entity" }));
  await waitFor(() => expect(api.createEntity).toHaveBeenCalledTimes(1));
  expect(api.createEntity.mock.calls[0][0]).toMatchObject({ address: null, state_id: 33, city_id: 501 });
});

test("an invalid GSTIN is refused before calling the server", async () => {
  api.lookupCoverageStates.mockResolvedValue({ status: 1, data: [{ id: 33, name: "Uttar Pradesh" }] });
  api.lookupCoverageCities.mockResolvedValue({ status: 1, data: [{ id: 501, name: "Lucknow" }] });
  renderPage();
  await rowOf("Daikin UP");
  await fillCreateForm({ gstin: "09AAACD1234E1X5" });
  fireEvent.click(screen.getByRole("button", { name: "Create entity" }));

  expect(await screen.findByText(/Enter a valid 15-character GSTIN/)).toBeInTheDocument();
  expect(api.createEntity).not.toHaveBeenCalled();
});

test("a 409 on create shows the server's message", async () => {
  api.lookupCoverageStates.mockResolvedValue({ status: 1, data: [{ id: 33, name: "Uttar Pradesh" }] });
  api.lookupCoverageCities.mockResolvedValue({ status: 1, data: [{ id: 501, name: "Lucknow" }] });
  const message = "A vendor account with this GSTIN already exists. Send it a link invite instead.";
  api.createEntity.mockRejectedValue(conflict(message, "GSTIN_EXISTS"));
  renderPage();
  await rowOf("Daikin UP");
  await fillCreateForm();
  fireEvent.click(screen.getByRole("button", { name: "Create entity" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
});

test("suspends an entity after confirming, then reloads", async () => {
  api.updateEntity.mockResolvedValue({ status: 1, message: "Entity updated", data: { vendor_id: 11, status: "SUSPENDED" } });
  renderPage();
  fireEvent.click(within(await rowOf("Daikin UP")).getByRole("button", { name: "Suspend" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Suspend" }));

  await waitFor(() => expect(api.updateEntity).toHaveBeenCalledWith(11, { status: "SUSPENDED" }));
  await waitFor(() => expect(api.getOrg).toHaveBeenCalledTimes(2));
});

test("reactivates a suspended entity", async () => {
  api.updateEntity.mockResolvedValue({ status: 1, message: "Entity updated", data: { vendor_id: 12, status: "ACTIVE" } });
  renderPage();
  fireEvent.click(within(await rowOf("Cool Distributors")).getByRole("button", { name: "Reactivate" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reactivate" }));
  await waitFor(() => expect(api.updateEntity).toHaveBeenCalledWith(12, { status: "ACTIVE" }));
});

test("removes an entity after confirming", async () => {
  api.deleteEntity.mockResolvedValue({ status: 1, message: "Entity removed", data: { vendor_id: 11 } });
  renderPage();
  fireEvent.click(within(await rowOf("Daikin UP")).getByRole("button", { name: "Remove" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Remove" }));
  await waitFor(() => expect(api.deleteEntity).toHaveBeenCalledWith(11));
  expect(toast.success).toHaveBeenCalledWith("Entity removed");
});

describe("seat payment", () => {
  let rzpInstance;
  beforeEach(() => {
    rzpInstance = { on: jest.fn(), open: jest.fn() };
    window.Razorpay = jest.fn((options) => {
      rzpInstance.options = options;
      return rzpInstance;
    });
    loadScript.mockResolvedValue(true);
  });
  afterEach(() => {
    delete window.Razorpay;
  });

  test("no Pay button when no seat is pending", async () => {
    api.getOrg.mockResolvedValue(orgPayload([DEFAULT_ENTITIES[0], DEFAULT_ENTITIES[1]]));
    renderPage();
    await rowOf("Daikin UP");
    expect(screen.queryByRole("button", { name: /Pay for seats/ })).toBeNull();
  });

  test("opens Razorpay for the pending seats and verifies in the handler", async () => {
    api.paySeats.mockResolvedValue({
      status: 1,
      data: { order: { id: "order_X", amount: 150000, currency: "INR" }, payment_id: 9, amount: 1500, razorpay_key: "rzp_test_key" },
    });
    api.verifySeatsPayment.mockResolvedValue({ status: 1, message: "Seats activated", data: { activated: 1 } });
    renderPage();
    await rowOf("Cool Distributors");

    fireEvent.click(screen.getByRole("button", { name: /Pay for seats/ }));
    await waitFor(() => expect(api.paySeats).toHaveBeenCalledWith({ seat_ids: [302] }));
    await waitFor(() => expect(rzpInstance.open).toHaveBeenCalled());
    expect(loadScript).toHaveBeenCalledWith("https://checkout.razorpay.com/v1/checkout.js");
    expect(rzpInstance.options).toMatchObject({ key: "rzp_test_key", order_id: "order_X", amount: 150000, currency: "INR" });

    await act(() =>
      rzpInstance.options.handler({
        razorpay_order_id: "order_X",
        razorpay_payment_id: "pay_Y",
        razorpay_signature: "sig_Z",
      })
    );
    expect(api.verifySeatsPayment).toHaveBeenCalledWith({
      razorpay_order_id: "order_X",
      razorpay_payment_id: "pay_Y",
      razorpay_signature: "sig_Z",
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Seats activated"));
    await waitFor(() => expect(api.getOrg).toHaveBeenCalledTimes(2));
  });

  const ORDER = {
    status: 1,
    data: { order: { id: "order_X", amount: 150000, currency: "INR" }, payment_id: 9, amount: 1500, razorpay_key: "rzp_test_key" },
  };
  const startCheckout = async () => {
    fireEvent.click(screen.getByRole("button", { name: /Pay for seats/ }));
    await waitFor(() => expect(rzpInstance.open).toHaveBeenCalledTimes(1));
  };

  test("a checkout started elsewhere (409 with no order here) explains the 30-minute wait", async () => {
    api.paySeats.mockRejectedValue(conflict("A payment for these seats is already in progress", "PAYMENT_IN_PROGRESS"));
    renderPage();
    await rowOf("Cool Distributors");
    fireEvent.click(screen.getByRole("button", { name: /Pay for seats/ }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "A checkout for these seats was started in the last 30 minutes. Complete it from the original window, or retry after 30 minutes."
      )
    );
    expect(window.Razorpay).not.toHaveBeenCalled();
  });

  test("dismissing the checkout keeps the seats unpaid; a retry reopens the SAME order without a new paySeats", async () => {
    api.paySeats.mockResolvedValue(ORDER);
    renderPage();
    await rowOf("Cool Distributors");
    await startCheckout();

    act(() => rzpInstance.options.modal.ondismiss());
    expect(toast.info).toHaveBeenCalledWith("Payment cancelled. You can retry when ready.");
    expect(api.verifySeatsPayment).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: /Pay for seats/ })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: /Pay for seats/ }));
    await waitFor(() => expect(window.Razorpay).toHaveBeenCalledTimes(2));
    expect(api.paySeats).toHaveBeenCalledTimes(1);
    expect(window.Razorpay.mock.calls[1][0]).toMatchObject({ order_id: "order_X", key: "rzp_test_key", amount: 150000 });
  });

  test("a failed payment shows an error toast and the seats stay unpaid", async () => {
    api.paySeats.mockResolvedValue(ORDER);
    renderPage();
    await rowOf("Cool Distributors");
    await startCheckout();
    const [event, onFailed] = rzpInstance.on.mock.calls[0];
    expect(event).toBe("payment.failed");
    act(() => onFailed({ error: { description: "Card declined" } }));
    expect(toast.error).toHaveBeenCalledWith("Payment failed: Card declined");
    expect(api.verifySeatsPayment).not.toHaveBeenCalled();
    expect(screen.getByText(/Payment pending/)).toBeInTheDocument();
  });

  test("a definitive verify refusal shows an error toast, does not reload, and the seats stay unpaid", async () => {
    api.paySeats.mockResolvedValue(ORDER);
    api.verifySeatsPayment.mockRejectedValue({
      response: { status: 400, data: { status: 0, message: "Payment verification failed - invalid signature" } },
    });
    renderPage();
    await rowOf("Cool Distributors");
    await startCheckout();
    await act(() =>
      rzpInstance.options.handler({ razorpay_order_id: "order_X", razorpay_payment_id: "pay_Y", razorpay_signature: "bad" })
    );
    expect(toast.error).toHaveBeenCalledWith("Payment verification failed - invalid signature");
    expect(toast.success).not.toHaveBeenCalled();
    expect(api.getOrg).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Payment pending/)).toBeInTheDocument();
  });
});

describe("paid but unconfirmed seat payments", () => {
  const KEY = "vn-seat-verify:7";
  const IDS = { razorpay_order_id: "order_X", razorpay_payment_id: "pay_Y", razorpay_signature: "sig_Z" };
  const networkDown = { message: "Network Error", isAxiosError: true };
  let rzpInstance;
  beforeEach(() => {
    rzpInstance = { on: jest.fn(), open: jest.fn() };
    window.Razorpay = jest.fn((options) => {
      rzpInstance.options = options;
      return rzpInstance;
    });
    loadScript.mockResolvedValue(true);
    api.paySeats.mockResolvedValue({
      status: 1,
      data: { order: { id: "order_X", amount: 150000, currency: "INR" }, payment_id: 9, amount: 1500, razorpay_key: "rzp_test_key" },
    });
  });
  afterEach(() => {
    delete window.Razorpay;
  });
  const stored = () => JSON.parse(window.localStorage.getItem(KEY));

  test("(a) a failed verify keeps the ids; Retry confirmation replays them and success clears them", async () => {
    api.verifySeatsPayment.mockRejectedValueOnce(networkDown);
    renderPage();
    await rowOf("Cool Distributors");
    fireEvent.click(screen.getByRole("button", { name: /Pay for seats/ }));
    await waitFor(() => expect(rzpInstance.open).toHaveBeenCalled());
    await act(() => rzpInstance.options.handler(IDS));

    expect(stored()).toMatchObject({ org_id: 7, ...IDS, seat_ids: [302] });
    expect(stored().at).toBeTruthy();
    const retry = await screen.findByRole("button", { name: "Retry confirmation" });
    expect(screen.queryByRole("button", { name: /Pay for seats/ })).toBeNull();

    api.verifySeatsPayment.mockResolvedValueOnce({ status: 1, message: "Payment already verified", data: {} });
    const loadsBefore = api.getOrg.mock.calls.length;
    fireEvent.click(retry);
    await waitFor(() => expect(api.verifySeatsPayment).toHaveBeenCalledTimes(2));
    expect(api.verifySeatsPayment.mock.calls[1][0]).toEqual(IDS);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Seat payment confirmed"));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    await waitFor(() => expect(api.getOrg.mock.calls.length).toBeGreaterThan(loadsBefore));
    expect(screen.queryByRole("button", { name: "Retry confirmation" })).toBeNull();
    expect(api.paySeats).toHaveBeenCalledTimes(1);
  });

  test("(b) a pending payment from an earlier visit is replayed on page load", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ org_id: 7, ...IDS, seat_ids: [302], at: "2026-10-07T10:00:00Z" }));
    api.verifySeatsPayment.mockResolvedValueOnce({ status: 1, message: "Payment already verified", data: {} });
    renderPage();
    await waitFor(() => expect(api.verifySeatsPayment).toHaveBeenCalledWith(IDS));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Seat payment confirmed"));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    await waitFor(() => expect(api.getOrg).toHaveBeenCalledTimes(2));
  });

  test("(b') a replay on load that fails again keeps the ids and offers Retry confirmation", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ org_id: 7, ...IDS, seat_ids: [302], at: "2026-10-07T10:00:00Z" }));
    api.verifySeatsPayment.mockRejectedValueOnce({ response: { status: 502, data: {} } });
    renderPage();
    expect(await screen.findByRole("button", { name: "Retry confirmation" })).toBeInTheDocument();
    expect(stored()).toMatchObject(IDS);
  });

  test("(c) a definitive 4xx clears the ids and shows the error", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ org_id: 7, ...IDS, seat_ids: [302], at: "2026-10-07T10:00:00Z" }));
    api.verifySeatsPayment.mockRejectedValueOnce({
      response: { status: 400, data: { status: 0, message: "Payment verification failed - invalid signature" } },
    });
    renderPage();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Payment verification failed - invalid signature"));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(await screen.findByRole("button", { name: /Pay for seats/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry confirmation" })).toBeNull();
  });

  test("(d) paySeats is never called while a payment awaits confirmation", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ org_id: 7, ...IDS, seat_ids: [302], at: "2026-10-07T10:00:00Z" }));
    api.verifySeatsPayment.mockRejectedValue(networkDown);
    renderPage();
    const retry = await screen.findByRole("button", { name: "Retry confirmation" });
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await waitFor(() => expect(api.verifySeatsPayment).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(retry).not.toBeDisabled());
    expect(api.paySeats).not.toHaveBeenCalled();
    expect(window.Razorpay).not.toHaveBeenCalled();
    expect(stored()).toMatchObject(IDS);
  });

  test("(d') a Pay click confirms a pending payment (e.g. saved by another tab) instead of ordering", async () => {
    renderPage();
    await rowOf("Cool Distributors");
    window.localStorage.setItem(KEY, JSON.stringify({ org_id: 7, ...IDS, seat_ids: [302], at: "2026-10-07T10:00:00Z" }));
    api.verifySeatsPayment.mockResolvedValueOnce({ status: 1, message: "Payment already verified", data: {} });
    fireEvent.click(screen.getByRole("button", { name: /Pay for seats/ }));
    await waitFor(() => expect(api.verifySeatsPayment).toHaveBeenCalledWith(IDS));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Seat payment confirmed"));
    expect(api.paySeats).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  const seed = () =>
    window.localStorage.setItem(KEY, JSON.stringify({ org_id: 7, ...IDS, seat_ids: [302], at: "2026-10-07T10:00:00Z" }));

  test.each([
    ["400 {status:0} (invalid signature)", { response: { status: 400, data: { status: 0, message: "Payment verification failed - invalid signature" } } }],
    ["404 {status:0} (payment record not found)", { response: { status: 404, data: { status: 0, message: "Payment record not found" } } }],
  ])("a definitive business refusal, %s, clears the payload", async (_label, err) => {
    seed();
    api.verifySeatsPayment.mockRejectedValueOnce(err);
    renderPage();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(err.response.data.message));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(await screen.findByRole("button", { name: /Pay for seats/ })).toBeInTheDocument();
  });

  test.each([
    ["400 {status:3} (unexpected server error)", { response: { status: 400, data: { status: 3, message: "Something went wrong" } } }],
    ["401 (session)", { response: { status: 401, data: { status: 0, message: "Unauthorized" } } }],
    ["403 (role changed)", { response: { status: 403, data: { status: 0, message: "Only network admins can do this" } } }],
    ["408 (timeout)", { response: { status: 408, data: {} } }],
    ["429 (rate limited)", { response: { status: 429, data: {} } }],
    ["503", { response: { status: 503, data: {} } }],
    ["no response (network)", { message: "Network Error", isAxiosError: true }],
  ])("a retryable failure, %s, keeps the payload, offers Retry confirmation and does not reload", async (_label, err) => {
    seed();
    api.verifySeatsPayment.mockRejectedValueOnce(err);
    renderPage();
    expect(await screen.findByRole("button", { name: "Retry confirmation" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry confirmation" })).not.toBeDisabled());
    expect(stored()).toMatchObject(IDS);
    expect(api.getOrg).toHaveBeenCalledTimes(1);
    expect(api.paySeats).not.toHaveBeenCalled();
  });

  test("another org's pending payment is ignored", async () => {
    window.localStorage.setItem("vn-seat-verify:8", JSON.stringify({ org_id: 8, ...IDS, seat_ids: [1] }));
    renderPage();
    await rowOf("Cool Distributors");
    expect(api.verifySeatsPayment).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Pay for seats/ })).toBeInTheDocument();
  });
});

test("a 403 loading the network shows the error and Retry, not the table", async () => {
  api.getOrg.mockRejectedValueOnce({ response: { status: 403, data: { status: 0, message: "Only network admins can do this" } } });
  renderPage();
  expect(await screen.findByText("Only network admins can do this")).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("table", { name: "Network entities" })).toBeInTheDocument();
});

test("cancelling an outgoing invite is guarded against a double click", async () => {
  api.getOrg.mockResolvedValue(
    orgPayload(DEFAULT_ENTITIES, [
      { id: 91, target_vendor_id: 20, target_name: "Daikin Pune", target_email: null, addressed_by: "ID", relationship: "BRANCH", status: "PENDING", expires_at: "2026-10-14T00:00:00Z" },
    ])
  );
  let resolveCancel;
  api.cancelLinkInvite.mockImplementation(() => new Promise((r) => { resolveCancel = r; }));
  renderPage();
  const btn = await screen.findByRole("button", { name: "Cancel invitation" });
  fireEvent.click(btn);
  fireEvent.click(btn);
  expect(api.cancelLinkInvite).toHaveBeenCalledTimes(1);
  expect(btn).toBeDisabled();
  await act(async () => resolveCancel({ status: 1, message: "Invitation cancelled" }));
  expect(api.cancelLinkInvite).toHaveBeenCalledWith(91);
});
