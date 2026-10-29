// The rail's "New requisition" entry follows GET /pr/form/hotels: hidden for a
// buyer who holds pr.create nowhere, shown otherwise. SideNav and the
// (always-mounted, closed) MobileNav ask in the same tick and share ONE request.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({ getPendingApprovalCounts: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/services/pr", () => ({ getFormHotels: jest.fn() }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: {
    getStorage: jest.fn((key) => (key === "token" ? "t" : key === "current-user-type" ? "buyer" : null)),
    setStorage: jest.fn(),
  },
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: jest.fn(() => null),
  subscribeHospitalityContext: jest.fn(() => () => {}),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: "/dashboard/buyer", query: {}, push: jest.fn(), events: { on: jest.fn(), off: jest.fn() } }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (sel) => sel({ userProfile: { is_hospitality: 1 } }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getFormHotels } from "@/services/pr";
import { ApprovalIndicatorsProvider } from "@/hooks/usePendingApprovalIndicators";
import { __setRealtimeLoaderForTests } from "@/lib/realtimeSocket";
import SideNav from "./SideNav";
import MobileNav from "./MobileNav";

__setRealtimeLoaderForTests(() => new Promise(() => {}));

const user = { name: "Asha Menon" };
const renderRail = (type = "buyer") => render(
  <ApprovalIndicatorsProvider enabled>
    <SideNav user={user} currentUserType={type} />
    <MobileNav open={false} onClose={() => {}} user={user} currentUserType={type} />
  </ApprovalIndicatorsProvider>
);

beforeEach(() => getFormHotels.mockReset());

test("a buyer who can raise a PR nowhere has no New requisition entry", async () => {
  getFormHotels.mockResolvedValue({ status: 1, data: { hotels: [] } });
  renderRail();
  expect(await screen.findByText("My requisitions")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("New requisition")).not.toBeInTheDocument());
  expect(getFormHotels).toHaveBeenCalledTimes(1);
});

test("a buyer with a pr.create hotel keeps it", async () => {
  getFormHotels.mockResolvedValue({ status: 1, data: { hotels: [{ id: 12, name: "Orchid Mumbai" }] } });
  renderRail();
  await waitFor(() => expect(getFormHotels).toHaveBeenCalledTimes(1));
  expect(screen.getByText("New requisition")).toBeInTheDocument();
});

test("a failed lookup leaves the entry in place", async () => {
  getFormHotels.mockRejectedValue(new Error("offline"));
  renderRail();
  await waitFor(() => expect(getFormHotels).toHaveBeenCalled());
  expect(screen.getByText("New requisition")).toBeInTheDocument();
});

test("a vendor rail never asks", async () => {
  renderRail("vendor");
  await screen.findAllByText(/Dashboard/);
  expect(getFormHotels).not.toHaveBeenCalled();
});
