// /dashboard/vendor/network/assigned — "Assigned to me" for a member entity
// (spec §6.2, §9). PENDING items are accepted, or declined with a reason (the
// note is required for OTHER); ACCEPTED items link to the RFQ (vendor inquiry
// page) or the contract page. A reply after the deadline gets 409 EXPIRED.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getAssignedToMe: jest.fn(),
  respondToAssignment: jest.fn(),
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
import AssignedPage from "@/pages/dashboard/vendor/network/assigned";

const memberNetwork = {
  org_id: 7,
  org_name: "Daikin India",
  role: "ENTITY_MEMBER",
  acting_entity_id: 11,
  is_principal: false,
  entity_relationship: "BRANCH",
  actable_entities: [],
};

const row = (over) => ({
  id: 900,
  org_id: 7,
  subject_type: "RFQ",
  subject_id: 4001,
  hotel_id: null,
  assigned_vendor_id: 11,
  status: "PENDING",
  due_at: "2026-10-08T06:30:00.000Z",
  created_at: "2026-10-07T06:30:00.000Z",
  acted_at: null,
  title: "RFQ #536700 · Chillers",
  action_url: "/dashboard/vendor/inquiries-details?id=4001",
  ...over,
});

const ROWS = [
  row({}),
  row({ id: 901, subject_type: "ARC_HOTEL", subject_id: 77, hotel_id: 502, title: "Rate contract ARC-12 · HVAC · Lotus Nashik", action_url: null }),
  row({ id: 902, subject_type: "ARC_HOTEL", subject_id: 78, hotel_id: 503, status: "ACCEPTED", acted_at: "2026-10-06T10:00:00.000Z", title: "Rate contract ARC-13 · Orchid Goa" }),
  row({ id: 903, subject_id: 4005, status: "ACCEPTED", acted_at: "2026-10-05T10:00:00.000Z", title: "RFQ #536705 · Fans" }),
];

const renderPage = (network = memberNetwork) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 11, user_type: 3, name: "Daikin UP", network }));
  render(
    <Provider store={store}>
      <AssignedPage />
    </Provider>
  );
};

const itemOf = async (listName, text) => within(await screen.findByRole("list", { name: listName })).getByText(text).closest("li");

beforeEach(() => {
  jest.clearAllMocks();
  api.getAssignedToMe.mockResolvedValue({ status: 1, data: ROWS });
});

test("lists pending and accepted items with their deadline and links", async () => {
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  expect(api.getAssignedToMe).toHaveBeenCalledWith({ status: ["PENDING", "ACCEPTED"] });
  expect(rfq).toHaveTextContent(`Reply by ${formatDisplayDate("2026-10-08T06:30:00.000Z", { includeTime: true })}`);
  expect(within(rfq).getByRole("link", { name: "View RFQ" })).toHaveAttribute("href", "/dashboard/vendor/inquiries-details?id=4001");

  // A contract hotel opens only once accepted (the member view needs the ACCEPTED assignment)
  const arcPending = await itemOf("Waiting for your reply", "Rate contract ARC-12 · HVAC · Lotus Nashik");
  expect(within(arcPending).queryByRole("link")).toBeNull();
  expect(within(arcPending).getByText("The contract opens once you accept.")).toBeInTheDocument();

  const arcAccepted = await itemOf("Accepted", "Rate contract ARC-13 · Orchid Goa");
  expect(within(arcAccepted).getByRole("link", { name: "View contract" })).toHaveAttribute("href", "/dashboard/vendor/rate-contracts/78");
  const rfqAccepted = await itemOf("Accepted", "RFQ #536705 · Fans");
  expect(within(rfqAccepted).getByRole("link", { name: "View RFQ" })).toHaveAttribute("href", "/dashboard/vendor/inquiries-details?id=4005");
  expect(within(rfqAccepted).queryByRole("button", { name: "Accept" })).toBeNull();
});

test("accept sends decision ACCEPT and reloads", async () => {
  api.respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment accepted", data: {} });
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  fireEvent.click(within(rfq).getByRole("button", { name: "Accept" }));
  await waitFor(() => expect(api.respondToAssignment).toHaveBeenCalledWith(900, { decision: "ACCEPT" }));
  expect(toast.success).toHaveBeenCalledWith("Assignment accepted");
  await waitFor(() => expect(api.getAssignedToMe).toHaveBeenCalledTimes(2));
});

test("decline needs a reason, and a note when the reason is Other", async () => {
  api.respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment declined", data: {} });
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  fireEvent.click(within(rfq).getByRole("button", { name: "Decline" }));
  const dialog = await screen.findByRole("dialog", { name: "Decline assignment" });

  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  expect(within(dialog).getByText("Pick a reason.")).toBeInTheDocument();

  fireEvent.click(within(dialog).getByLabelText("Other"));
  fireEvent.change(within(dialog).getByLabelText(/^Note/), { target: { value: "   " } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  expect(within(dialog).getByText("Add a note when the reason is Other.")).toBeInTheDocument();
  expect(api.respondToAssignment).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText(/^Note/), { target: { value: "  Supplier strike  " } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  await waitFor(() =>
    expect(api.respondToAssignment).toHaveBeenCalledWith(900, { decision: "DECLINE", reason: "OTHER", note: "Supplier strike" })
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(toast.success).toHaveBeenCalledWith("Assignment declined");
});

test("decline with a listed reason needs no note", async () => {
  api.respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment declined", data: {} });
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  fireEvent.click(within(rfq).getByRole("button", { name: "Decline" }));
  const dialog = await screen.findByRole("dialog", { name: "Decline assignment" });
  expect(within(dialog).getByLabelText("Note (optional)")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByLabelText("No stock"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  await waitFor(() =>
    expect(api.respondToAssignment).toHaveBeenCalledWith(900, { decision: "DECLINE", reason: "NO_STOCK", note: null })
  );
});

test("a late reply (409 EXPIRED) explains it went back to the admin and reloads", async () => {
  api.respondToAssignment.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "This assignment has expired", reason: "EXPIRED" } },
  });
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  fireEvent.click(within(rfq).getByRole("button", { name: "Accept" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("This assignment expired before you replied, so it went back to your network admin.")
  );
  await waitFor(() => expect(api.getAssignedToMe).toHaveBeenCalledTimes(2));
});

test("a 404 says the assignment was withdrawn or reassigned and reloads", async () => {
  api.respondToAssignment.mockRejectedValue({
    // What the server really sends: NetworkHttpError(404, "Assignment not found"), no reason code
    response: { status: 404, data: { status: 0, message: "Assignment not found" } },
  });
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  fireEvent.click(within(rfq).getByRole("button", { name: "Accept" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("This assignment is no longer available — it may have been withdrawn or reassigned.")
  );
  await waitFor(() => expect(api.getAssignedToMe).toHaveBeenCalledTimes(2));
});

test("a server refusal of the decline note keeps the modal open with the message", async () => {
  api.respondToAssignment.mockRejectedValue({
    response: { status: 400, data: { status: 0, message: "A note is required when the reason is OTHER" } },
  });
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  fireEvent.click(within(rfq).getByRole("button", { name: "Decline" }));
  const dialog = await screen.findByRole("dialog", { name: "Decline assignment" });
  fireEvent.click(within(dialog).getByLabelText("Outside our area"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("A note is required when the reason is OTHER"));
  expect(screen.getByRole("dialog", { name: "Decline assignment" })).toBeInTheDocument();
});

test("empty lists say so", async () => {
  api.getAssignedToMe.mockResolvedValue({ status: 1, data: [] });
  renderPage();
  expect(await screen.findByText("Nothing is waiting for your reply.")).toBeInTheDocument();
  expect(screen.getByText("You haven't accepted anything yet.")).toBeInTheDocument();
});

test("the principal is pointed at Routing and nothing is loaded", async () => {
  renderPage({ ...memberNetwork, role: "ORG_ADMIN", acting_entity_id: 10, is_principal: true, entity_relationship: "PRINCIPAL" });
  expect(await screen.findByText("Assignments go to member entities")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open routing" })).toHaveAttribute("href", "/dashboard/vendor/network/routing");
  expect(api.getAssignedToMe).not.toHaveBeenCalled();
});

test("a vendor in no network gets the set-up notice", async () => {
  renderPage(null);
  expect(await screen.findByText("You are not in a vendor network")).toBeInTheDocument();
  expect(api.getAssignedToMe).not.toHaveBeenCalled();
});

test("while a reply is in flight, Accept and Decline are disabled and a second click sends nothing", async () => {
  let resolve;
  api.respondToAssignment.mockReturnValueOnce(new Promise((res) => (resolve = res)));
  renderPage();
  const rfq = await itemOf("Waiting for your reply", "RFQ #536700 · Chillers");
  const accept = within(rfq).getByRole("button", { name: "Accept" });
  fireEvent.click(accept);
  fireEvent.click(accept);
  expect(api.respondToAssignment).toHaveBeenCalledTimes(1);
  expect(accept).toBeDisabled();
  expect(within(rfq).getByRole("button", { name: "Decline" })).toBeDisabled();
  const arc = await itemOf("Waiting for your reply", "Rate contract ARC-12 · HVAC · Lotus Nashik");
  expect(within(arc).getByRole("button", { name: "Accept" })).toBeDisabled();
  await act(async () => {
    resolve({ status: 1, message: "Assignment accepted", data: {} });
  });
  await waitFor(() => expect(api.getAssignedToMe).toHaveBeenCalledTimes(2));
});
