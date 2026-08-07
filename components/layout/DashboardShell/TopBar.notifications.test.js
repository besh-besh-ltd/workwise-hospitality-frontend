// The notification bell — delivered vs read.
//
// The badge used to be driven by the unread count alone, so it only went out
// once every item had been individually clicked (or wiped with "mark all
// read", which destroys the read/unread distinction). In practice it was
// permanently lit and people stopped reading it. It was also a bare 7px dot
// with the number hidden until you opened the tray, so "something happened"
// and "eleven things happened" looked identical.
//
// The contract pinned here is the industry-standard split:
//   opening the bell → everything outstanding is DELIVERED  → badge clears
//   clicking an item → that row is READ                     → highlight clears
//
// Everything asserted is what the user sees or what the app POSTs.

jest.mock("@/services/Notifications", () => ({
  __esModule: true,
  getUnreadCount: jest.fn(),
  listNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(() => Promise.resolve({ status: 1 })),
  markNotificationRead: jest.fn(() => Promise.resolve({ status: 1 })),
  markNotificationsDelivered: jest.fn(() => Promise.resolve({ status: 1 })),
}));
jest.mock("@/utils/pushSubscription", () => ({
  __esModule: true,
  ensurePushSubscription: jest.fn(() => Promise.resolve()),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => <img alt={props.alt || ""} />,
}));

const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    pathname: "/dashboard/buyer",
    query: {},
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: () => ({ hospitality_mappings: [] }),
}));

import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import TopBar from "@/components/layout/DashboardShell/TopBar";
import {
  getUnreadCount,
  listNotifications,
  markNotificationRead,
  markNotificationsDelivered,
} from "@/services/Notifications";

const NOTIFS = [
  {
    id: 1,
    title: "Action required: Approve Rate Contract Publication",
    message: "Step 1 of 1",
    is_read: 0,
    delivered_at: null,
    created_at: new Date().toISOString(),
    action_url: "/dashboard/buyer/rate-contracts/12?stage=overview",
  },
  {
    id: 2,
    title: "Vendor submitted a quote",
    message: "Burj Al Arab Supplies",
    is_read: 1,
    delivered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    action_url: "/dashboard/buyer/quote-comparison?rfq=359",
  },
];

const renderBar = () =>
  render(
    <TopBar
      user={{ name: "Asha Menon", email: "asha@example.com" }}
      currentUserType="buyer"
      onNavToggle={() => {}}
      onLogoutRequest={() => {}}
    />
  );

const openBell = async () => {
  const bell = await screen.findByRole("button", { name: /Notifications/i });
  await act(async () => {
    fireEvent.click(bell);
  });
  return bell;
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.setItem("token", "test-token");
  getUnreadCount.mockResolvedValue({ status: 1, data: { count: 3, undelivered: 3, unread: 5 } });
  listNotifications.mockResolvedValue({ status: 1, data: NOTIFS });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("the badge", () => {
  it("shows how many are new, not just that something is", async () => {
    renderBar();
    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("caps at 99+ so a long backlog cannot break the layout", async () => {
    getUnreadCount.mockResolvedValue({
      status: 1,
      data: { count: 250, undelivered: 250, unread: 250 },
    });
    renderBar();
    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("names the count for screen readers", async () => {
    renderBar();
    expect(
      await screen.findByRole("button", { name: /Notifications — 3 new/i })
    ).toBeInTheDocument();
  });

  it("shows nothing at all when there is nothing outstanding", async () => {
    getUnreadCount.mockResolvedValue({ status: 1, data: { count: 0, undelivered: 0, unread: 0 } });
    renderBar();
    const bell = await screen.findByRole("button", { name: /^Notifications$/i });
    expect(bell.querySelector("span")).toBeNull();
  });

  it("falls back to the legacy count field if the backend is older", async () => {
    // A frontend deployed ahead of the backend must still render something
    // sensible rather than a blank badge.
    getUnreadCount.mockResolvedValue({ status: 1, data: { count: 7 } });
    renderBar();
    expect(await screen.findByText("7")).toBeInTheDocument();
  });
});

describe("opening the bell", () => {
  it("marks everything delivered so the badge clears", async () => {
    renderBar();
    await screen.findByText("3");

    await openBell();

    await waitFor(() => expect(markNotificationsDelivered).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("3")).not.toBeInTheDocument());
  });

  it("does NOT mark anything read — the items stay highlighted", async () => {
    renderBar();
    await openBell();

    expect(markNotificationRead).not.toHaveBeenCalled();
    // 5 unread survive the open and are still advertised in the tray.
    expect(await screen.findByText(/5 unread/i)).toBeInTheDocument();
  });

  it("does not re-deliver when there is nothing new", async () => {
    getUnreadCount.mockResolvedValue({ status: 1, data: { count: 0, undelivered: 0, unread: 2 } });
    renderBar();
    await openBell();

    expect(markNotificationsDelivered).not.toHaveBeenCalled();
  });

  it("loads the list", async () => {
    renderBar();
    await openBell();

    expect(listNotifications).toHaveBeenCalled();
    expect(
      await screen.findByText(/Action required: Approve Rate Contract Publication/i)
    ).toBeInTheDocument();
  });
});

describe("clicking a notification", () => {
  it("marks that one read and navigates to its target", async () => {
    renderBar();
    await openBell();

    const row = await screen.findByText(/Action required: Approve Rate Contract Publication/i);
    await act(async () => {
      fireEvent.click(row);
    });

    expect(markNotificationRead).toHaveBeenCalledWith(1);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/rate-contracts/12?stage=overview");
  });

  it("does not re-mark one that is already read", async () => {
    renderBar();
    await openBell();

    const row = await screen.findByText(/Vendor submitted a quote/i);
    await act(async () => {
      fireEvent.click(row);
    });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/quote-comparison?rfq=359");
  });

  it("reconciles with the server when the write fails instead of silently drifting", async () => {
    // The failure used to be swallowed, so the row looked read until the next
    // poll quietly put it back.
    markNotificationRead.mockRejectedValueOnce(new Error("boom"));
    renderBar();
    await openBell();

    const row = await screen.findByText(/Action required: Approve Rate Contract Publication/i);
    await act(async () => {
      fireEvent.click(row);
    });

    await waitFor(() => expect(getUnreadCount).toHaveBeenCalledTimes(2));
  });
});
