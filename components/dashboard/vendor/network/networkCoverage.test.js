// D1: a vendor-network member is covered by its network's subscription plus its seat.
// The header pill, the profile banner and the subscription page say so (no Subscribe /
// Renew action); a vendor without `covered_by_network` keeps today's states.

jest.mock("@/services/subscription", () => ({
  __esModule: true,
  getVendorSubscriptionStatus: jest.fn(),
}));
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn() }) }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getVendorSubscriptionStatus } from "@/services/subscription";
import { networkCoverageView } from "./networkCoverage";
import VendorSubscriptionPill from "@/components/layout/DashboardShell/VendorSubscriptionPill";
import SubscriptionStatus from "@/components/dashboard/vendor/SubscriptionStatus";
import NetworkCoveredState from "@/components/dashboard/vendor/subscription/NetworkCoveredState";

const COVERED = {
  org_id: 7,
  org_name: "Daikin Network",
  principal_vendor_id: 5,
  principal_name: "Daikin HQ",
  entity_status: "ACTIVE",
  subscription_active: true,
  subscription_valid_until: "2027-03-31",
  seat_active: true,
  seat_valid_until: "2027-03-31",
  seat_expired_on: null,
  covered: true,
};
const SEAT_EXPIRED = { ...COVERED, seat_active: false, seat_valid_until: null, seat_expired_on: "2026-10-01", covered: false };

const memberStatus = (cov) => ({
  status: 1,
  data: { has_active_subscription: true, subscription: null, is_expired: false, has_pending: false, can_renew: false, covered_by_network: cov },
});

beforeEach(() => jest.clearAllMocks());

describe("networkCoverageView", () => {
  test("absent block -> null (vendor in no network, principal)", () => {
    expect(networkCoverageView(undefined)).toBeNull();
    expect(networkCoverageView(null)).toBeNull();
  });
  test("covered -> Covered by <org> + seat till date", () => {
    const v = networkCoverageView(COVERED);
    expect(v.key).toBe("covered");
    expect(v.label).toBe("Covered by Daikin Network");
    expect(v.detail).toMatch(/^Seat active · till 31 Mar 2027$/);
  });
  test("seat expired / suspended / lapsed all point at the network admin", () => {
    expect(networkCoverageView(SEAT_EXPIRED)).toMatchObject({ key: "seat_expired", label: "Seat expired" });
    expect(networkCoverageView(SEAT_EXPIRED).detail).toMatch(/ask your network admin/);
    expect(networkCoverageView({ ...COVERED, entity_status: "SUSPENDED", covered: false }).key).toBe("suspended");
    expect(networkCoverageView({ ...COVERED, subscription_active: false, covered: false }).key).toBe("lapsed");
  });
});

describe("header pill", () => {
  test("a covered member sees 'Covered by <org>' and never 'Subscribe'", async () => {
    getVendorSubscriptionStatus.mockResolvedValue(memberStatus(COVERED));
    render(<VendorSubscriptionPill />);
    expect(await screen.findByRole("button", { name: "Subscription: Covered by Daikin Network" })).toBeInTheDocument();
    expect(screen.getByText("Seat active · till 31 Mar 2027")).toBeInTheDocument();
    expect(screen.queryByText(/Subscribe/)).not.toBeInTheDocument();
  });

  test("an expired seat says so and asks the network admin", async () => {
    getVendorSubscriptionStatus.mockResolvedValue(memberStatus(SEAT_EXPIRED));
    render(<VendorSubscriptionPill />);
    expect(await screen.findByRole("button", { name: "Subscription: Seat expired" })).toBeInTheDocument();
    expect(screen.getByText(/Seat expired on 01 Oct 2026 — ask your network admin/)).toBeInTheDocument();
  });

  test("a vendor with no subscription and no network still sees Subscribe (unchanged)", async () => {
    getVendorSubscriptionStatus.mockResolvedValue({
      status: 1,
      data: { has_active_subscription: false, subscription: null, is_expired: false, has_pending: false, can_renew: false },
    });
    render(<VendorSubscriptionPill />);
    expect(await screen.findByRole("button", { name: "Subscription: Subscribe" })).toBeInTheDocument();
  });
});

describe("profile banner and subscription page", () => {
  test("banner: covered member gets no Subscribe/Renew button", async () => {
    getVendorSubscriptionStatus.mockResolvedValue(memberStatus(COVERED));
    render(<SubscriptionStatus />);
    expect(await screen.findByText("Covered by Daikin Network")).toBeInTheDocument();
    expect(screen.getByText("Seat active · till 31 Mar 2027")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("subscription page state names who manages it and offers no action", () => {
    render(<NetworkCoveredState coverage={COVERED} />);
    expect(screen.getByText("Covered by Daikin Network")).toBeInTheDocument();
    expect(screen.getByText(/Daikin HQ manages the subscription/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
