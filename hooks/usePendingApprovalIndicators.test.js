// Nav badges — every approval a buyer can be asked for must light up the
// module where they act on it. Publishing a rate contract (ARC_PUBLISH) and
// approving an ARC negotiation round (ARC_NEGOTIATION) both land on Rate
// Contracts; before this they raised approvals that no badge ever showed.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({ getPendingApprovalCounts: jest.fn() }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: jest.fn((key) => (key === "token" ? "t" : key === "current-user-type" ? "buyer" : null)) },
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: jest.fn(() => ({ companyId: 4, hotelId: 12 })),
  subscribeHospitalityContext: jest.fn(() => () => {}),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPendingApprovalCounts } from "@/services/approval";
import usePendingApprovalIndicators from "./usePendingApprovalIndicators";
import { __setRealtimeLoaderForTests } from "@/lib/realtimeSocket";

// Never open a real socket from jsdom.
__setRealtimeLoaderForTests(() => new Promise(() => {}));

const Probe = ({ href }) => {
  const { pendingCountFor } = usePendingApprovalIndicators();
  return <div data-testid="count">{pendingCountFor(href)}</div>;
};

test("rate contract publish and negotiation approvals badge Rate Contracts", async () => {
  getPendingApprovalCounts.mockResolvedValue({
    data: [
      { entity_type: "ARC_PUBLISH", count: "2" },
      { entity_type: "ARC_NEGOTIATION", count: "1" },
      { entity_type: "ARC_COMMITTEE", count: "3" },
      { entity_type: "PO", count: "5" },
    ],
  });

  render(<Probe href="/dashboard/buyer/rate-contracts" />);

  await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("6"));
});

// ── Load: one poller per page, pushed by the socket, silent in hidden tabs ──
//
// Prod, Oct 2026: approval/pending/counts was 32.7k calls/day, 45% of all
// backend time. The hook polled every 5 s, never paused in a hidden tab, and
// was mounted twice per dashboard page (SideNav + an always-mounted MobileNav).
// These tests pin the replacement contract.

describe("shared provider", () => {
  const {
    ApprovalIndicatorsProvider,
    APPROVAL_POLL_INTERVAL_MS,
  } = require("./usePendingApprovalIndicators");
  const realtime = require("@/lib/realtimeSocket");
  const { notifyApprovalsChanged } = require("@/utils/approvalEvents");
  const { subscribeHospitalityContext } = require("@/utils/hospitalityContext");
  const storageInstance = require("@/utils/storageInstance").default;
  const { act } = require("@testing-library/react");

  let hidden = false;
  beforeAll(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  });

  const setHidden = (value) => {
    hidden = value;
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
  };

  const flush = () => act(async () => {});
  const advance = (ms) => act(async () => { jest.advanceTimersByTime(ms); });

  const Badge = ({ id, href = "/dashboard/buyer/purchase-orders" }) => {
    const { pendingCountFor } = usePendingApprovalIndicators({ enabled: true });
    return <div data-testid={id}>{pendingCountFor(href)}</div>;
  };

  // SideNav + MobileNav + anything else that wants a badge.
  const Shell = () => (
    <ApprovalIndicatorsProvider enabled>
      <Badge id="sidenav" />
      <Badge id="mobilenav" />
      <Badge id="other" />
    </ApprovalIndicatorsProvider>
  );

  beforeEach(() => {
    jest.useFakeTimers();
    hidden = false;
    getPendingApprovalCounts.mockReset();
    getPendingApprovalCounts.mockResolvedValue({ data: [{ entity_type: "PO", count: "2" }] });
    realtime.__resetRealtimeForTests();
    // Never actually open a socket in jsdom; frames are injected below.
    realtime.__setRealtimeLoaderForTests(() => new Promise(() => {}));
    storageInstance.getStorage.mockImplementation((key) =>
      key === "token" ? "t" : key === "current-user-type" ? "buyer" : null
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    realtime.__resetRealtimeForTests();
  });

  test("polls every 60 s, not 5 s", () => {
    expect(APPROVAL_POLL_INTERVAL_MS).toBe(60000);
  });

  test("three consumers, ONE request on mount and ONE per interval", async () => {
    render(<Shell />);
    await flush();
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sidenav")).toHaveTextContent("2");
    expect(screen.getByTestId("mobilenav")).toHaveTextContent("2");
    expect(screen.getByTestId("other")).toHaveTextContent("2");

    // The old 5 s cadence would have fired 11 more times by now.
    await advance(55000);
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);

    // +/-10% jitter: by 66 s exactly one more request.
    await advance(11000);
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(2);
  });

  test("no requests while the tab is hidden; one on return", async () => {
    render(<Shell />);
    await flush();
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);

    setHidden(true);
    await advance(60 * 60 * 1000);
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);

    setHidden(false);
    await flush();
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(2);
  });

  test("socket approval:changed refetches immediately", async () => {
    render(<Shell />);
    await flush();
    getPendingApprovalCounts.mockResolvedValue({ data: [{ entity_type: "PO", count: "5" }] });

    await act(async () => {
      realtime.__emitRealtimeForTests("approval:changed", { entity_type: "PO", entity_id: 9 });
    });
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("sidenav")).toHaveTextContent("5");
  });

  test("a burst of socket frames mid-request collapses into one trailing request", async () => {
    let resolveFirst;
    render(<Shell />);
    await flush();
    getPendingApprovalCounts.mockImplementationOnce(
      () => new Promise((r) => { resolveFirst = r; })
    );
    await act(async () => {
      for (let i = 0; i < 10; i += 1) {
        realtime.__emitRealtimeForTests("approval:changed", { entity_type: "PO", entity_id: i });
      }
    });
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(2);
    await act(async () => { resolveFirst({ data: [] }); });
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(3);
  });

  test("hospitality context change and an in-tab approval action refetch", async () => {
    let onContext;
    subscribeHospitalityContext.mockImplementation((cb) => { onContext = cb; return () => {}; });
    render(<Shell />);
    await flush();
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);

    await act(async () => { onContext({ companyId: 4, hotelId: 13 }); });
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(2);

    await act(async () => { notifyApprovalsChanged(); });
    expect(getPendingApprovalCounts).toHaveBeenCalledTimes(3);
  });

  test("vendors and logged-out users never hit the endpoint", async () => {
    storageInstance.getStorage.mockImplementation((key) =>
      key === "token" ? "t" : key === "current-user-type" ? "vendor" : null
    );
    const { unmount } = render(<Shell />);
    await flush();
    await advance(120000);
    expect(getPendingApprovalCounts).not.toHaveBeenCalled();
    unmount();

    storageInstance.getStorage.mockImplementation(() => null);
    render(<Shell />);
    await flush();
    expect(getPendingApprovalCounts).not.toHaveBeenCalled();
  });

  test("a disabled provider makes no requests", async () => {
    render(
      <ApprovalIndicatorsProvider enabled={false}>
        <Badge id="a" />
        <Badge id="b" />
      </ApprovalIndicatorsProvider>
    );
    await flush();
    await advance(120000);
    expect(getPendingApprovalCounts).not.toHaveBeenCalled();
  });
});
