jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getDashboardPermissions: jest.fn(),
}));

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import PermissionGate from "./PermissionGate";
import { DashboardPermissionsProvider } from "@/hooks/useDashboardWidgets";
import { getDashboardPermissions } from "@/services/rbac";

const wrap = (children, hotelIds = [1]) =>
  render(
    <DashboardPermissionsProvider hotelIds={hotelIds}>{children}</DashboardPermissionsProvider>
  );

describe("<PermissionGate>", () => {
  beforeEach(() => {
    getDashboardPermissions.mockReset();
  });

  it("renders children when the code is granted", async () => {
    getDashboardPermissions.mockResolvedValue(["action_center"]);
    await act(async () => {
      wrap(
        <PermissionGate code="dashboard.action_center">
          <div data-testid="payload">visible</div>
        </PermissionGate>
      );
    });
    expect(screen.getByTestId("payload")).toBeInTheDocument();
  });

  it("renders fallback when the code is denied", async () => {
    getDashboardPermissions.mockResolvedValue([]);
    await act(async () => {
      wrap(
        <PermissionGate
          code="dashboard.action_center"
          fallback={<div data-testid="fb">fallback</div>}
        >
          <div data-testid="payload">visible</div>
        </PermissionGate>
      );
    });
    expect(screen.queryByTestId("payload")).not.toBeInTheDocument();
    expect(screen.getByTestId("fb")).toBeInTheDocument();
  });

  it("renders loadingNode (default null) while permissions load", () => {
    // Don't await — assert on the synchronous initial render
    getDashboardPermissions.mockReturnValue(new Promise(() => {})); // pending forever
    wrap(
      <PermissionGate
        code="dashboard.action_center"
        loadingNode={<div data-testid="loading">…</div>}
      >
        <div data-testid="payload">visible</div>
      </PermissionGate>
    );
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("payload")).not.toBeInTheDocument();
  });
});
