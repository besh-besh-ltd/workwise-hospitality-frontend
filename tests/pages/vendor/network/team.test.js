// /dashboard/vendor/network/team — the people of a vendor network (spec §5
// "People", §9). The admin invites a person (email, name, role and, for an
// entity member, the entity), changes a role or entity, disables / enables a
// person and resends a pending invitation. A never-accepted (INVITED) row
// offers "Resend", never "Enable"; the principal's own admin access offers
// neither disable nor edit.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  listMembers: jest.fn(),
  inviteMember: jest.fn(),
  updateMember: jest.fn(),
  resendMemberInvite: jest.fn(),
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
import TeamPage from "@/pages/dashboard/vendor/network/team";

const adminNetwork = {
  org_id: 7,
  org_name: "Daikin India",
  role: "ORG_ADMIN",
  actor_user_id: 10,
  acting_entity_id: 10,
  is_principal: true,
  actable_entities: [],
};

const ORG = {
  status: 1,
  data: {
    org: { id: 7, name: "Daikin India", principal_vendor_id: 10 },
    entities: [
      { vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", status: "ACTIVE" },
      { vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", status: "ACTIVE" },
    ],
    members: [],
    link_invites: [],
  },
};

const member = (over) => ({
  id: 1,
  person_user_id: 10,
  entity_vendor_id: null,
  role: "ORG_ADMIN",
  status: "ACTIVE",
  invite_expires_at: null,
  name: "Daikin HQ",
  email: "hq@daikin.example",
  entity_name: null,
  ...over,
});

const MEMBERS = [
  member({}),
  member({ id: 2, person_user_id: 40, role: "ENTITY_MEMBER", entity_vendor_id: 11, entity_name: "Daikin UP", name: "Ravi", email: "ravi@daikin.example" }),
  member({ id: 3, person_user_id: 41, role: "ENTITY_MEMBER", entity_vendor_id: 11, entity_name: "Daikin UP", status: "INVITED", name: "Meera", email: "meera@daikin.example", invite_expires_at: "2026-10-10T00:00:00Z" }),
  member({ id: 4, person_user_id: 42, status: "DISABLED", name: "Old Admin", email: "old@daikin.example" }),
];

const renderPage = () => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Daikin HQ", network: adminNetwork }));
  render(
    <Provider store={store}>
      <TeamPage />
    </Provider>
  );
};

const rowOf = async (name) => (await screen.findByText(name)).closest("tr");

beforeEach(() => {
  jest.clearAllMocks();
  api.getOrg.mockResolvedValue(ORG);
  api.listMembers.mockResolvedValue({ status: 1, data: MEMBERS });
});

test("shows the people with the right action for each status", async () => {
  renderPage();
  const owner = await rowOf("hq@daikin.example");
  expect(within(owner).getByText("Owner")).toBeInTheDocument();
  expect(within(owner).queryByRole("button", { name: /Disable|Edit/ })).toBeNull();

  const ravi = await rowOf("ravi@daikin.example");
  expect(within(ravi).getByText("Daikin UP")).toBeInTheDocument();
  expect(within(ravi).getByRole("button", { name: "Disable" })).toBeInTheDocument();

  const meera = await rowOf("meera@daikin.example");
  expect(within(meera).getByRole("button", { name: "Resend" })).toBeInTheDocument();
  expect(within(meera).queryByRole("button", { name: "Enable" })).toBeNull();

  const old = await rowOf("old@daikin.example");
  expect(within(old).getByRole("button", { name: "Enable" })).toBeInTheDocument();
});

test("invites an entity member with the entity id", async () => {
  api.inviteMember.mockResolvedValue({ status: 1, message: "Invitation sent", data: { id: 5 } });
  renderPage();
  await rowOf("ravi@daikin.example");

  fireEvent.click(screen.getByRole("button", { name: "Invite person" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: " asha@daikin.example " } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Asha" } });
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "ENTITY_MEMBER" } });
  fireEvent.change(screen.getByLabelText("Entity"), { target: { value: "11" } });
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

  await waitFor(() =>
    expect(api.inviteMember).toHaveBeenCalledWith({
      email: "asha@daikin.example",
      name: "Asha",
      role: "ENTITY_MEMBER",
      entity_vendor_id: 11,
    })
  );
  expect(toast.success).toHaveBeenCalledWith("Invitation sent");
  await waitFor(() => expect(api.listMembers).toHaveBeenCalledTimes(2));
});

test("invites an org admin without an entity", async () => {
  api.inviteMember.mockResolvedValue({ status: 1, message: "Invitation sent", data: { id: 6 } });
  renderPage();
  await rowOf("ravi@daikin.example");
  fireEvent.click(screen.getByRole("button", { name: "Invite person" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ops@daikin.example" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ops" } });
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "ORG_ADMIN" } });
  expect(screen.queryByLabelText("Entity")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
  await waitFor(() =>
    expect(api.inviteMember).toHaveBeenCalledWith({ email: "ops@daikin.example", name: "Ops", role: "ORG_ADMIN" })
  );
});

test("a 409 on invite shows the server's message", async () => {
  api.inviteMember.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "This person already has this access", reason: "ALREADY_MEMBER" } },
  });
  renderPage();
  await rowOf("ravi@daikin.example");
  fireEvent.click(screen.getByRole("button", { name: "Invite person" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ravi@daikin.example" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ravi" } });
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "ENTITY_MEMBER" } });
  fireEvent.change(screen.getByLabelText("Entity"), { target: { value: "11" } });
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This person already has this access"));
});

test("a person-limit refusal is explained from its reason code", async () => {
  api.inviteMember.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "Your network has reached its limit of people", reason: "PERSON_LIMIT" } },
  });
  renderPage();
  await rowOf("ravi@daikin.example");
  fireEvent.click(screen.getByRole("button", { name: "Invite person" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@daikin.example" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New" } });
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "ORG_ADMIN" } });
  fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  expect(toast.error.mock.calls[0][0]).toMatch(/Disable someone/);
});

test("disables an active person after confirming", async () => {
  api.updateMember.mockResolvedValue({ status: 1, message: "Person updated", data: { id: 2, status: "DISABLED" } });
  renderPage();
  fireEvent.click(within(await rowOf("ravi@daikin.example")).getByRole("button", { name: "Disable" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Disable" }));
  await waitFor(() => expect(api.updateMember).toHaveBeenCalledWith(2, { status: "DISABLED" }));
  await waitFor(() => expect(api.listMembers).toHaveBeenCalledTimes(2));
});

test("enables a disabled person", async () => {
  api.updateMember.mockResolvedValue({ status: 1, message: "Person updated", data: { id: 4, status: "ACTIVE" } });
  renderPage();
  fireEvent.click(within(await rowOf("old@daikin.example")).getByRole("button", { name: "Enable" }));
  await waitFor(() => expect(api.updateMember).toHaveBeenCalledWith(4, { status: "ACTIVE" }));
});

test("the last-admin refusal is explained", async () => {
  api.updateMember.mockRejectedValue({
    response: { status: 400, data: { status: 0, message: "The network must keep at least one active admin", reason: "LAST_ADMIN" } },
  });
  renderPage();
  fireEvent.click(within(await rowOf("ravi@daikin.example")).getByRole("button", { name: "Disable" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Disable" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  expect(toast.error.mock.calls[0][0]).toMatch(/at least one active admin/);
});

test("resends a pending invitation", async () => {
  api.resendMemberInvite.mockResolvedValue({ status: 1, message: "Invitation resent", data: { id: 3 } });
  renderPage();
  fireEvent.click(within(await rowOf("meera@daikin.example")).getByRole("button", { name: "Resend" }));
  await waitFor(() => expect(api.resendMemberInvite).toHaveBeenCalledWith(3));
  expect(toast.success).toHaveBeenCalledWith("Invitation resent");
});

test("changes a member's role to org admin", async () => {
  api.updateMember.mockResolvedValue({ status: 1, message: "Person updated", data: { id: 2, role: "ORG_ADMIN" } });
  renderPage();
  fireEvent.click(within(await rowOf("ravi@daikin.example")).getByRole("button", { name: "Edit" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Role"), { target: { value: "ORG_ADMIN" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.updateMember).toHaveBeenCalledWith(2, { role: "ORG_ADMIN", entity_vendor_id: null }));
});

test("moves a member to another entity", async () => {
  api.updateMember.mockResolvedValue({ status: 1, message: "Person updated", data: { id: 2 } });
  renderPage();
  fireEvent.click(within(await rowOf("ravi@daikin.example")).getByRole("button", { name: "Edit" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Entity"), { target: { value: "10" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(api.updateMember).toHaveBeenCalledWith(2, { role: "ENTITY_MEMBER", entity_vendor_id: 10 })
  );
});

test("a 403 loading the team shows the error and Retry, not the table", async () => {
  api.getOrg.mockRejectedValueOnce({ response: { status: 403, data: { status: 0, message: "Only network admins can do this" } } });
  renderPage();
  expect(await screen.findByText("Only network admins can do this")).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("table", { name: "Network people" })).toBeInTheDocument();
});
