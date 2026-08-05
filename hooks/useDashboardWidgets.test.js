jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

// Mock the RBAC service to control what permissions the hook receives.
// Note: NO `virtual: true` because the file exists on disk.
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getDashboardPermissions: jest.fn(),
}));

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  DashboardPermissionsProvider,
  useHasDashboardWidget,
  useVisibleDashboardWidgets,
} from "./useDashboardWidgets";
import { getDashboardPermissions } from "@/services/rbac";

// Tiny consumer component used to read context values in tests.
const Probe = ({ code }) => {
  const { granted, isLoading } = useHasDashboardWidget(code);
  return (
    <div data-testid={`probe-${code}`}>
      {isLoading ? "loading" : granted ? "granted" : "denied"}
    </div>
  );
};

const VisibleProbe = () => {
  const { widgets, isLoading } = useVisibleDashboardWidgets();
  if (isLoading) return <div data-testid="vis">loading</div>;
  return (
    <div data-testid="vis">{widgets.map((w) => w.code).join("|")}</div>
  );
};

describe("DashboardPermissionsProvider + hooks", () => {
  beforeEach(() => {
    getDashboardPermissions.mockReset();
  });

  it("renders gates as 'denied' when the user has no permissions", async () => {
    getDashboardPermissions.mockResolvedValue([]);
    await act(async () => {
      render(
        <DashboardPermissionsProvider hotelIds={[1]}>
          <Probe code="dashboard.action_center" />
          <Probe code="dashboard.my_drafts" />
        </DashboardPermissionsProvider>
      );
    });
    expect(screen.getByTestId("probe-dashboard.action_center")).toHaveTextContent("denied");
    expect(screen.getByTestId("probe-dashboard.my_drafts")).toHaveTextContent("denied");
  });

  it("renders 'granted' only for codes that match a granted permission", async () => {
    getDashboardPermissions.mockResolvedValue(["action_center", "my_drafts"]);
    await act(async () => {
      render(
        <DashboardPermissionsProvider hotelIds={[1]}>
          <Probe code="dashboard.action_center" />
          <Probe code="dashboard.my_drafts" />
          <Probe code="dashboard.savings_pipeline" />
        </DashboardPermissionsProvider>
      );
    });
    expect(screen.getByTestId("probe-dashboard.action_center")).toHaveTextContent("granted");
    expect(screen.getByTestId("probe-dashboard.my_drafts")).toHaveTextContent("granted");
    expect(screen.getByTestId("probe-dashboard.savings_pipeline")).toHaveTextContent("denied");
  });

  it("useVisibleDashboardWidgets returns only widgets the user is granted (and that have a component)", async () => {
    getDashboardPermissions.mockResolvedValue([
      "action_center",
      "my_drafts",
      "tech_eval_throughput",
    ]);
    await act(async () => {
      render(
        <DashboardPermissionsProvider hotelIds={[1]}>
          <VisibleProbe />
        </DashboardPermissionsProvider>
      );
    });
    const text = screen.getByTestId("vis").textContent;
    const codes = text.split("|");
    expect(codes).toEqual(
      expect.arrayContaining([
        "dashboard.action_center",
        "dashboard.my_drafts",
        "dashboard.tech_eval_throughput",
      ])
    );
    // Should not include codes the user doesn't have
    expect(codes).not.toContain("dashboard.negotiation_savings");
  });

  it("treats a failed permission fetch as 'no grants' (empty state path)", async () => {
    getDashboardPermissions.mockRejectedValue(new Error("network"));
    await act(async () => {
      render(
        <DashboardPermissionsProvider hotelIds={[1]}>
          <Probe code="dashboard.action_center" />
        </DashboardPermissionsProvider>
      );
    });
    expect(screen.getByTestId("probe-dashboard.action_center")).toHaveTextContent("denied");
  });

  it("re-fetches when hotelIds change", async () => {
    getDashboardPermissions
      .mockResolvedValueOnce(["action_center"])
      .mockResolvedValueOnce(["my_drafts"]);
    const { rerender } = render(
      <DashboardPermissionsProvider hotelIds={[1]}>
        <VisibleProbe />
      </DashboardPermissionsProvider>
    );
    await act(async () => {});
    expect(screen.getByTestId("vis").textContent).toContain("dashboard.action_center");

    rerender(
      <DashboardPermissionsProvider hotelIds={[2]}>
        <VisibleProbe />
      </DashboardPermissionsProvider>
    );
    await act(async () => {});
    expect(screen.getByTestId("vis").textContent).toContain("dashboard.my_drafts");
    expect(screen.getByTestId("vis").textContent).not.toContain("dashboard.action_center");
  });
});
