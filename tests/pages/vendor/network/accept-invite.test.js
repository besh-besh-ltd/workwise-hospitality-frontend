// Public member accept-invite page: /vendor/network/accept-invite?token=…
// (the backend emails exactly this link). The person sets a password that
// meets the backend's rule (>= 8 characters, a letter and a digit), and is
// then sent to sign in. An expired or used invite says so and offers no form.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  previewMemberInvite: jest.fn(),
  acceptMemberInvite: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));
const TOKEN = "a".repeat(64);
const PATH = "/vendor/network/accept-invite";
let mockQuery = { token: TOKEN };
// Like Next: replacing with a bare pathname drops the query on the next render.
const mockReplace = jest.fn((url) => {
  if (url && typeof url === "object") mockQuery = {};
});
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, pathname: PATH, query: mockQuery, replace: mockReplace, push: jest.fn() }),
}));
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => mockDispatch }));
const mockFlush = jest.fn(() => Promise.resolve());
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: (...a) => mockFlush(...a) } }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { removeStorege: jest.fn(), getStorage: jest.fn(() => null), setStorage: jest.fn() },
}));
jest.mock("@/utils/hospitalityContext", () => ({ __esModule: true, setStoredHospitalityContext: jest.fn() }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { previewMemberInvite, acceptMemberInvite } from "@/services/vendorNetwork";
import storageInstance from "@/utils/storageInstance";
import { clearUserProfile } from "@/redux/slice";
import AcceptInvitePage from "@/pages/vendor/network/accept-invite";

const gone = (message) => ({ response: { status: 410, data: { status: 0, message } } });
const openInvite = {
  status: 1,
  data: { email: "ravi@daikin.example", org_name: "Daikin India", entity_name: "Daikin UP", expired: false },
};

const fill = (password, confirm = password) => {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: /Activate account/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { token: TOKEN };
});

test("shows who invited whom, for which entity", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  render(<AcceptInvitePage />);
  expect(await screen.findByText("Daikin India")).toBeInTheDocument();
  expect(screen.getByText("Daikin UP")).toBeInTheDocument();
  expect(screen.getByText("ravi@daikin.example")).toBeInTheDocument();
  expect(previewMemberInvite).toHaveBeenCalledWith(TOKEN);
});

test.each([
  ["short1", "at least 8 characters"],
  ["abcdefgh", "a letter and a digit"],
  ["12345678", "a letter and a digit"],
])("rejects a weak password %p before calling the server", async (password, message) => {
  previewMemberInvite.mockResolvedValue(openInvite);
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");
  fill(password);
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(acceptMemberInvite).not.toHaveBeenCalled();
});

test("rejects a confirmation that does not match", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");
  fill("secret123", "secret124");
  expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match");
  expect(acceptMemberInvite).not.toHaveBeenCalled();
});

test("the token is stripped from the address bar at once; preview and accept use the stored copy", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  acceptMemberInvite.mockResolvedValue({ status: 1, message: "ok" });
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");

  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith({ pathname: PATH }, undefined, { shallow: true });
  expect(JSON.stringify(mockReplace.mock.calls)).not.toContain(TOKEN);
  expect(mockQuery).toEqual({}); // the URL no longer carries it
  expect(previewMemberInvite).toHaveBeenCalledTimes(1);
  expect(previewMemberInvite).toHaveBeenCalledWith(TOKEN);

  fill("secret123");
  await waitFor(() => expect(acceptMemberInvite).toHaveBeenCalledWith({ token: TOKEN, password: "secret123" }));
});

test("a valid password activates the account and sends the person to sign in", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  acceptMemberInvite.mockResolvedValue({
    status: 1,
    message: "Your account is ready. Sign in with your email and new password.",
    data: { email: "ravi@daikin.example", org_name: "Daikin India" },
  });
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");
  fill("secret123");

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/?login=true"));
  expect(acceptMemberInvite).toHaveBeenCalledWith({ token: TOKEN, password: "secret123" });
  expect(toast.success).toHaveBeenCalledWith("Your account is ready. Sign in with your email and new password.");
});

test("accepting ends any session already in this browser before going to sign in", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  acceptMemberInvite.mockResolvedValue({ status: 1, message: "ok" });
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");
  fill("secret123");
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/?login=true"));

  expect(storageInstance.removeStorege).toHaveBeenCalledWith("token");
  expect(storageInstance.removeStorege).toHaveBeenCalledWith("current-user-type");
  expect(mockDispatch).toHaveBeenCalledWith(clearUserProfile());
  const loginAt = mockReplace.mock.invocationCallOrder[mockReplace.mock.calls.findIndex(([u]) => u === "/?login=true")];
  expect(storageInstance.removeStorege.mock.invocationCallOrder[0]).toBeLessThan(loginAt);
  expect(mockFlush.mock.invocationCallOrder[0]).toBeLessThan(loginAt);
});

test("a rejected accept leaves the existing session alone", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  acceptMemberInvite.mockRejectedValue(gone("This invitation is invalid or has already been used"));
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");
  fill("secret123");
  await screen.findByText("This invitation is invalid or has already been used");
  expect(storageInstance.removeStorege).not.toHaveBeenCalled();
});

test("an expired invite says so and offers no form", async () => {
  previewMemberInvite.mockResolvedValue({ status: 1, data: { ...openInvite.data, expired: true } });
  render(<AcceptInvitePage />);
  expect(await screen.findByText(/This invitation has expired/)).toBeInTheDocument();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
});

test("an invalid or used token (410) says so and offers no form", async () => {
  previewMemberInvite.mockRejectedValue(gone("This invitation is invalid or has already been used"));
  render(<AcceptInvitePage />);
  expect(await screen.findByText("This invitation is invalid or has already been used")).toBeInTheDocument();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
});

test("a link with no token never calls the server", async () => {
  mockQuery = {};
  render(<AcceptInvitePage />);
  expect(await screen.findByText(/invitation link is incomplete/)).toBeInTheDocument();
  expect(previewMemberInvite).not.toHaveBeenCalled();
});

test("an invite that expires before submit shows the server's reason and removes the form", async () => {
  previewMemberInvite.mockResolvedValue(openInvite);
  acceptMemberInvite.mockRejectedValue(gone("This invitation has expired. Ask your network admin to resend it."));
  render(<AcceptInvitePage />);
  await screen.findByText("Daikin India");
  fill("secret123");
  expect(await screen.findByText("This invitation has expired. Ask your network admin to resend it.")).toBeInTheDocument();
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalledWith("/?login=true");
});
