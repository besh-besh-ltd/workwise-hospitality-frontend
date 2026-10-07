// /dashboard/vendor/network/routing — the admin's routing queue (spec §6.2–6.4,
// §9): "Needs routing" with ranked candidates and why each matched, "Pending",
// "Declined & timed out" (reason and note shown, candidates exclude whoever
// refused) and "Recently accepted"; assign / reassign / revoke; routing mode
// and response time.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  getRoutingQueue: jest.fn(),
  assignSubject: jest.fn(),
  revokeAssignment: jest.fn(),
  updateOrg: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile } from "@/redux/slice";
import * as api from "@/services/vendorNetwork";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import RoutingPage from "@/pages/dashboard/vendor/network/routing";

const adminNetwork = { org_id: 7, org_name: "Daikin India", role: "ORG_ADMIN", acting_entity_id: 10, is_principal: true, actable_entities: [] };

const ORG = {
  status: 1,
  data: {
    org: { id: 7, name: "Daikin India", principal_vendor_id: 10, routing_mode: "ADMIN_ROUTES", routing_timeout_hours: 24 },
    entities: [
      { vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", status: "ACTIVE" },
      { vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", status: "ACTIVE" },
      { vendor_id: 12, name: "Cool Dealers", relationship: "DEALER", status: "ACTIVE" },
      { vendor_id: 13, name: "Old Branch", relationship: "BRANCH", status: "SUSPENDED" },
    ],
  },
};

const cand = (over) => ({ vendor_id: 11, name: "Daikin UP", specificity: 3, preference_rank: 1, covers_all_hotels: true, hotels_covered: [500], ...over });

const assignment = (over) => ({
  id: 900,
  org_id: 7,
  subject_type: "RFQ",
  subject_id: 4001,
  hotel_id: null,
  assigned_vendor_id: 11,
  assignee_name: "Daikin UP",
  status: "PENDING",
  decline_reason: null,
  decline_note: null,
  due_at: "2026-10-08T06:30:00.000Z",
  auto_routed: false,
  created_at: "2026-10-07T06:30:00.000Z",
  acted_at: null,
  title: "RFQ #536700 · Chillers",
  action_url: "/dashboard/vendor/inquiries-details?id=4001",
  ...over,
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const QUEUE = {
  status: 1,
  data: {
    unrouted: [
      {
        subject_type: "RFQ",
        subject_id: 4002,
        hotel_id: null,
        hotel_ids: [500, 501],
        category_id: 4,
        title: "RFQ #536701 · AC units",
        meta: { rfq_no: 536701, bid_end_date: "2026-10-12 18:00:00", hotel_id: 500, hotel_name: "Orchid Mumbai" },
        candidates: [cand({}), cand({ vendor_id: 12, name: "Cool Dealers", specificity: 1, preference_rank: null })],
      },
      {
        subject_type: "ARC_HOTEL",
        subject_id: 77,
        hotel_id: 502,
        hotel_ids: [502],
        category_id: 4,
        title: "Rate contract ARC-12 · HVAC · Lotus Nashik",
        meta: { contract_id: 77, contract_status: "awaiting_acceptance", arc_id: 12, arc_number: "ARC-12", hotel_id: 502, hotel_name: "Lotus Nashik" },
        candidates: [],
      },
    ],
    pending: [assignment({})],
    accepted: [
      assignment({ id: 905, subject_type: "ARC_HOTEL", subject_id: 78, hotel_id: 503, status: "ACCEPTED", assigned_vendor_id: 12, assignee_name: "Cool Dealers", acted_at: daysAgo(1), title: "Rate contract ARC-13 · Orchid Goa" }),
      // accepted 40 days ago: live, but not "recent"
      assignment({ id: 906, subject_id: 4009, status: "ACCEPTED", assigned_vendor_id: 12, assignee_name: "Cool Dealers", acted_at: daysAgo(40), title: "RFQ #536709 · Old pumps" }),
    ],
    declined: [
      assignment({
        id: 903,
        subject_id: 4003,
        status: "DECLINED",
        decline_reason: "OTHER",
        decline_note: "Supplier strike",
        acted_at: "2026-10-06T08:00:00.000Z",
        title: "RFQ #536702 · Fans",
        candidates: [cand({ vendor_id: 12, name: "Cool Dealers", specificity: 2, covers_all_hotels: false, hotels_covered: [500], preference_rank: null })],
      }),
      assignment({ id: 904, subject_id: 4001, status: "TIMED_OUT", assigned_vendor_id: 12, assignee_name: "Cool Dealers", acted_at: "2026-10-06T09:00:00.000Z", candidates: [] }),
    ],
  },
};

const renderPage = (network = adminNetwork) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Daikin HQ", network }));
  render(
    <Provider store={store}>
      <RoutingPage />
    </Provider>
  );
};

const list = (name) => screen.findByRole("list", { name });
const itemOf = async (listName, text) => within(await list(listName)).getByText(text).closest("li");

beforeEach(() => {
  jest.clearAllMocks();
  api.getOrg.mockResolvedValue(ORG);
  api.getRoutingQueue.mockResolvedValue(QUEUE);
});

test("shows the four queues with the subject, ranked candidates and why they matched", async () => {
  renderPage();
  const rfq = await itemOf("Needs routing", "RFQ #536701 · AC units");
  expect(within(rfq).getByText(/Orchid Mumbai · Bid ends 12-10-2026 06:00 PM/)).toBeInTheDocument();
  const suggested = within(rfq).getByRole("list", { name: "Suggested entities for RFQ #536701 · AC units" });
  const rows = within(suggested).getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Daikin UP");
  expect(rows[0]).toHaveTextContent("Best match");
  expect(rows[0]).toHaveTextContent("Hotel rule · covers the hotel · preference 1");
  expect(rows[1]).toHaveTextContent("Cool Dealers");
  expect(rows[1]).toHaveTextContent("State rule · covers the hotel");

  const arc = await itemOf("Needs routing", "Rate contract ARC-12 · HVAC · Lotus Nashik");
  expect(within(arc).getByText("No entity's coverage matches this item.")).toBeInTheDocument();
  // Manual pick: active, non-principal entities only
  const other = within(arc).getByLabelText("Other entity for Rate contract ARC-12 · HVAC · Lotus Nashik");
  expect(within(other).getAllByRole("option").map((o) => o.textContent)).toEqual(["Another entity…", "Daikin UP", "Cool Dealers"]);

  const pending = await itemOf("Pending", "RFQ #536700 · Chillers");
  expect(pending).toHaveTextContent("With Daikin UP");
  expect(pending).toHaveTextContent(`Reply due ${formatDisplayDate("2026-10-08T06:30:00.000Z", { includeTime: true })}`);

  const declined = await itemOf("Declined & timed out", "RFQ #536702 · Fans");
  expect(within(declined).getByText("Declined")).toBeInTheDocument();
  expect(declined).toHaveTextContent("Reason: Other — “Supplier strike”");
  expect(declined).toHaveTextContent("City rule · covers 1 hotel");

  const accepted = await itemOf("Recently accepted", "Rate contract ARC-13 · Orchid Goa");
  expect(accepted).toHaveTextContent("Accepted by Cool Dealers");
});

test("assigning an RFQ sends no hotel_id; a contract hotel sends its hotel_id", async () => {
  api.assignSubject.mockResolvedValue({ status: 1, message: "Assigned", data: { id: 950 } });
  renderPage();
  const rfq = await itemOf("Needs routing", "RFQ #536701 · AC units");
  fireEvent.click(within(rfq).getByRole("button", { name: "Assign to Cool Dealers" }));
  await waitFor(() =>
    expect(api.assignSubject).toHaveBeenCalledWith({ subject_type: "RFQ", subject_id: 4002, assignee_vendor_id: 12 })
  );
  expect(toast.success).toHaveBeenCalledWith("Assigned");
  await waitFor(() => expect(api.getRoutingQueue).toHaveBeenCalledTimes(2));

  const arc = await itemOf("Needs routing", "Rate contract ARC-12 · HVAC · Lotus Nashik");
  fireEvent.change(within(arc).getByLabelText(/Other entity for/), { target: { value: "11" } });
  fireEvent.click(within(arc).getByRole("button", { name: "Assign to the selected entity" }));
  await waitFor(() =>
    expect(api.assignSubject).toHaveBeenLastCalledWith({ subject_type: "ARC_HOTEL", subject_id: 77, hotel_id: 502, assignee_vendor_id: 11 })
  );
});

test.each([
  ["ASSIGNEE_NOT_ELIGIBLE", /can't take work right now/],
  ["ORG_ALREADY_QUOTED", /already quoted on this RFQ/],
  ["CONFLICT", /routed this item at the same time/],
])("a 409 %s explains itself and the queue is reloaded", async (reason, text) => {
  api.assignSubject.mockRejectedValue({ response: { status: 409, data: { status: 0, message: "refused", reason } } });
  renderPage();
  const rfq = await itemOf("Needs routing", "RFQ #536701 · AC units");
  fireEvent.click(within(rfq).getByRole("button", { name: "Assign to Daikin UP" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(text)));
  await waitFor(() => expect(api.getRoutingQueue).toHaveBeenCalledTimes(2));
});

test("reassigning a pending item offers everyone but the current assignee", async () => {
  api.assignSubject.mockResolvedValue({ status: 1, message: "Assigned", data: { id: 951 } });
  renderPage();
  const pending = await itemOf("Pending", "RFQ #536700 · Chillers");
  fireEvent.click(within(pending).getByRole("button", { name: "Reassign" }));
  const other = within(pending).getByLabelText("Other entity for RFQ #536700 · Chillers");
  expect(within(other).getAllByRole("option").map((o) => o.textContent)).toEqual(["Another entity…", "Cool Dealers"]);
  fireEvent.change(other, { target: { value: "12" } });
  fireEvent.click(within(pending).getByRole("button", { name: "Reassign to the selected entity" }));
  await waitFor(() =>
    expect(api.assignSubject).toHaveBeenCalledWith({ subject_type: "RFQ", subject_id: 4001, assignee_vendor_id: 12 })
  );
});

test("an ALREADY_ACCEPTED refusal on reassign explains what to do", async () => {
  api.assignSubject.mockRejectedValue({ response: { status: 409, data: { status: 0, message: "x", reason: "ALREADY_ACCEPTED" } } });
  renderPage();
  const accepted = await itemOf("Recently accepted", "Rate contract ARC-13 · Orchid Goa");
  fireEvent.click(within(accepted).getByRole("button", { name: "Reassign" }));
  fireEvent.change(within(accepted).getByLabelText(/Other entity for/), { target: { value: "11" } });
  fireEvent.click(within(accepted).getByRole("button", { name: "Reassign to the selected entity" }));
  await waitFor(() =>
    expect(api.assignSubject).toHaveBeenCalledWith({ subject_type: "ARC_HOTEL", subject_id: 78, hotel_id: 503, assignee_vendor_id: 11 })
  );
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/already accepted this item/));
});

test("revoke asks first, then calls revoke with the assignment id", async () => {
  api.revokeAssignment.mockResolvedValue({ status: 1, message: "Assignment revoked", data: {} });
  renderPage();
  const pending = await itemOf("Pending", "RFQ #536700 · Chillers");
  fireEvent.click(within(pending).getByRole("button", { name: "Revoke" }));
  const dialog = await screen.findByRole("dialog");
  expect(api.revokeAssignment).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
  await waitFor(() => expect(api.revokeAssignment).toHaveBeenCalledWith(900));
  expect(toast.success).toHaveBeenCalledWith("Assignment revoked");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("revoking after the member quoted shows the QUOTE_SUBMITTED explanation", async () => {
  api.revokeAssignment.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "The entity has already submitted a quote", reason: "QUOTE_SUBMITTED" } },
  });
  renderPage();
  const pending = await itemOf("Pending", "RFQ #536700 · Chillers");
  fireEvent.click(within(pending).getByRole("button", { name: "Revoke" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Revoke" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/must regret its quote/)));
  await waitFor(() => expect(api.getRoutingQueue).toHaveBeenCalledTimes(2));
});

test("a declined item that was already re-routed shows who has it now instead of candidates", async () => {
  renderPage();
  const timedOut = await itemOf("Declined & timed out", "RFQ #536700 · Chillers");
  expect(within(timedOut).getByText("Timed out")).toBeInTheDocument();
  expect(timedOut).toHaveTextContent("Now with Daikin UP (pending)");
  expect(within(timedOut).queryByRole("button", { name: /Assign/ })).toBeNull();
});

test("recently accepted shows only items accepted in the last 30 days", async () => {
  const QUEUE_WITH_OLD_DECLINE = {
    ...QUEUE,
    data: {
      ...QUEUE.data,
      declined: [
        ...QUEUE.data.declined,
        assignment({ id: 907, subject_id: 4009, status: "DECLINED", decline_reason: "NO_STOCK", acted_at: daysAgo(2), title: "RFQ #536709 · Old pumps", candidates: [] }),
      ],
    },
  };
  api.getRoutingQueue.mockResolvedValue(QUEUE_WITH_OLD_DECLINE);
  renderPage();
  const recent = await list("Recently accepted");
  expect(within(recent).getByText("Rate contract ARC-13 · Orchid Goa")).toBeInTheDocument();
  expect(within(recent).queryByText("RFQ #536709 · Old pumps")).toBeNull();
  expect(within(recent).getAllByRole("listitem")).toHaveLength(1);
  // The older acceptance still counts as live for a declined row of the same subject
  const declined = await itemOf("Declined & timed out", "RFQ #536709 · Old pumps");
  expect(declined).toHaveTextContent("Now with Cool Dealers (accepted)");
});

test("routing settings use the exact mode values and validate the hours", async () => {
  api.updateOrg.mockResolvedValue({
    status: 1,
    message: "Network settings saved",
    data: { id: 7, name: "Daikin India", routing_mode: "AUTO_SINGLE_MATCH", routing_timeout_hours: 12 },
  });
  renderPage();
  await list("Needs routing");
  expect(screen.getByRole("radio", { name: /^Admin routes/ })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: /^Auto-route single match/ }));

  const hours = screen.getByLabelText("Response time (hours)");
  fireEvent.change(hours, { target: { value: "200" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  expect(screen.getByText("Enter a whole number of hours from 1 to 168.")).toBeInTheDocument();
  expect(api.updateOrg).not.toHaveBeenCalled();

  fireEvent.change(hours, { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await waitFor(() => expect(api.updateOrg).toHaveBeenCalledWith({ routing_mode: "AUTO_SINGLE_MATCH", routing_timeout_hours: 12 }));
  expect(toast.success).toHaveBeenCalledWith("Network settings saved");
  await waitFor(() => expect(screen.getByRole("button", { name: "Save settings" })).toBeDisabled());
});

test("a failed load shows the error and Retry, with no queue", async () => {
  api.getRoutingQueue.mockRejectedValueOnce({ response: { status: 403, data: { status: 0, message: "Network admins only" } } });
  renderPage();
  expect(await screen.findByText("Network admins only")).toBeInTheDocument();
  expect(screen.queryByRole("list", { name: "Needs routing" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await list("Needs routing")).toBeInTheDocument();
});

test("a member who is not an admin gets the notice and the queue is not loaded", async () => {
  renderPage({ ...adminNetwork, role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11 });
  expect(await screen.findByText("Network admins only")).toBeInTheDocument();
  expect(api.getRoutingQueue).not.toHaveBeenCalled();
});

test("assignment titles link to the subject using the server's action_url", async () => {
  renderPage();
  const pending = await itemOf("Pending", "RFQ #536700 · Chillers");
  expect(within(pending).getByRole("link", { name: "RFQ #536700 · Chillers" })).toHaveAttribute(
    "href",
    "/dashboard/vendor/inquiries-details?id=4001"
  );
  const declinedRfq = await itemOf("Declined & timed out", "RFQ #536702 · Fans");
  expect(within(declinedRfq).getByRole("link", { name: "RFQ #536702 · Fans" })).toBeInTheDocument();
  // No action_url → plain text
  const arcQueue = {
    ...QUEUE,
    data: { ...QUEUE.data, accepted: QUEUE.data.accepted.map((r) => ({ ...r, action_url: null })) },
  };
  api.getRoutingQueue.mockResolvedValue(arcQueue);
  fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
  await waitFor(() => expect(api.getRoutingQueue).toHaveBeenCalledTimes(2));
  const accepted = await itemOf("Recently accepted", "Rate contract ARC-13 · Orchid Goa");
  await waitFor(() => expect(within(accepted).queryByRole("link")).toBeNull());
});

test("a declined item back in the queue explains coverage against all its hotels", async () => {
  api.getRoutingQueue.mockResolvedValue({
    ...QUEUE,
    data: {
      ...QUEUE.data,
      declined: [
        assignment({
          id: 908,
          subject_id: 4002,
          status: "DECLINED",
          decline_reason: "NO_STOCK",
          acted_at: daysAgo(1),
          title: "RFQ #536701 · AC units",
          candidates: [cand({ vendor_id: 12, name: "Cool Dealers", specificity: 2, covers_all_hotels: false, hotels_covered: [500], preference_rank: null })],
        }),
      ],
    },
  });
  renderPage();
  const declined = await itemOf("Declined & timed out", "RFQ #536701 · AC units");
  expect(declined).toHaveTextContent("City rule · covers 1 of 2 hotels");
});

test("while an assign is in flight its buttons are disabled, and another row finishing does not re-enable them", async () => {
  const first = deferred();
  const second = deferred();
  api.assignSubject.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  renderPage();
  const rfq = await itemOf("Needs routing", "RFQ #536701 · AC units");
  const arc = await itemOf("Needs routing", "Rate contract ARC-12 · HVAC · Lotus Nashik");

  fireEvent.click(within(rfq).getByRole("button", { name: "Assign to Daikin UP" }));
  // A second click on the same row is ignored
  fireEvent.click(within(rfq).getByRole("button", { name: "Assign to Daikin UP" }));
  expect(api.assignSubject).toHaveBeenCalledTimes(1);
  expect(within(rfq).getByRole("button", { name: "Assign to Daikin UP" })).toBeDisabled();
  expect(within(rfq).getByRole("button", { name: "Assign to Cool Dealers" })).toBeDisabled();

  fireEvent.change(within(arc).getByLabelText(/Other entity for/), { target: { value: "11" } });
  fireEvent.click(within(arc).getByRole("button", { name: "Assign to the selected entity" }));
  expect(api.assignSubject).toHaveBeenCalledTimes(2);
  expect(within(arc).getByRole("button", { name: "Assign to the selected entity" })).toBeDisabled();

  await act(async () => {
    second.resolve({ status: 1, message: "Assigned", data: {} });
  });
  await waitFor(() => expect(api.getRoutingQueue).toHaveBeenCalledTimes(2));
  const rfqNow = await itemOf("Needs routing", "RFQ #536701 · AC units");
  expect(within(rfqNow).getByRole("button", { name: "Assign to Daikin UP" })).toBeDisabled();

  await act(async () => {
    first.resolve({ status: 1, message: "Assigned", data: {} });
  });
  await waitFor(() =>
    expect(within(screen.getByRole("list", { name: "Needs routing" })).getByRole("button", { name: "Assign to Daikin UP" })).toBeEnabled()
  );
});

test("revoke's confirm button is disabled while the revoke is in flight", async () => {
  const pendingRevoke = deferred();
  api.revokeAssignment.mockReturnValueOnce(pendingRevoke.promise);
  renderPage();
  const pending = await itemOf("Pending", "RFQ #536700 · Chillers");
  fireEvent.click(within(pending).getByRole("button", { name: "Revoke" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
  expect(api.revokeAssignment).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole("button", { name: "Revoke" })).toBeDisabled();
  expect(within(pending).getByRole("button", { name: "Reassign" })).toBeDisabled();
  await act(async () => {
    pendingRevoke.resolve({ status: 1, message: "Assignment revoked", data: {} });
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("Refresh is disabled and says so while the queue reloads", async () => {
  renderPage();
  await list("Needs routing");
  const reload = deferred();
  api.getRoutingQueue.mockReturnValueOnce(reload.promise);
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  const busy = await screen.findByRole("button", { name: "Refreshing…" });
  expect(busy).toBeDisabled();
  expect(screen.getByRole("list", { name: "Needs routing" })).toBeInTheDocument();
  await act(async () => {
    reload.resolve(QUEUE);
  });
  expect(await screen.findByRole("button", { name: "Refresh" })).toBeEnabled();
});
