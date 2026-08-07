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
  dismissNotification: jest.fn(() => Promise.resolve({ status: 1 })),
  markNotificationUnread: jest.fn(() => Promise.resolve({ status: 1 })),
}));
// The stream is an enhancement over the poll; the poll is what these tests
// exercise, so keep the socket out of jsdom entirely.
jest.mock("@/hooks/useNotificationStream", () => ({
  __esModule: true,
  default: jest.fn(),
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
  dismissNotification,
  markNotificationUnread,
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

  it("caps at 9+ — past a handful the exact number changes nothing", async () => {
    getUnreadCount.mockResolvedValue({
      status: 1,
      data: { count: 250, undelivered: 250, unread: 250 },
    });
    renderBar();
    expect(await screen.findByText("9+")).toBeInTheDocument();
  });

  it("shows the exact count up to 9", async () => {
    getUnreadCount.mockResolvedValue({
      status: 1,
      data: { count: 9, undelivered: 9, unread: 9 },
    });
    renderBar();
    expect(await screen.findByText("9")).toBeInTheDocument();
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

  it("shows no residual dot once the tray has been opened", async () => {
    // Nothing new, but items remain unopened. A leftover dot for things the
    // user has already looked at is a permanent nag, which is how a badge stops
    // meaning anything.
    getUnreadCount.mockResolvedValue({ status: 1, data: { count: 0, undelivered: 0, unread: 6 } });
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

describe("row actions", () => {
  it("dismisses an item and removes it from the list", async () => {
    renderBar();
    await openBell();

    const btn = screen.getAllByRole("button", { name: /Dismiss notification/i })[0];
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(dismissNotification).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(
        screen.queryByText(/Action required: Approve Rate Contract Publication/i)
      ).not.toBeInTheDocument()
    );
  });

  it("does not navigate when dismissing", async () => {
    // The action sits inside the clickable row, so without stopPropagation the
    // dismiss would also open whatever the row points at.
    renderBar();
    await openBell();

    const btn = screen.getAllByRole("button", { name: /Dismiss notification/i })[0];
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("restores the row when the dismiss fails", async () => {
    dismissNotification.mockRejectedValueOnce(new Error("boom"));
    renderBar();
    await openBell();

    const btn = screen.getAllByRole("button", { name: /Dismiss notification/i })[0];
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(
      await screen.findByText(/Action required: Approve Rate Contract Publication/i)
    ).toBeInTheDocument();
  });

  it("puts a read item back to unread", async () => {
    renderBar();
    await openBell();

    const btn = await screen.findByRole("button", { name: /Mark as unread/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(markNotificationUnread).toHaveBeenCalledWith(2);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("marks an unread item read without navigating", async () => {
    renderBar();
    await openBell();

    const btn = await screen.findByRole("button", { name: /^Mark as read$/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(markNotificationRead).toHaveBeenCalledWith(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("keyboard", () => {
  it("closes on Escape and returns focus to the bell", async () => {
    renderBar();
    const bell = await openBell();

    expect(await screen.findByRole("dialog", { name: /Notifications/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /Notifications/i })).not.toBeInTheDocument()
    );
    expect(document.activeElement).toBe(bell);
  });

  it("walks the rows with the arrow keys", async () => {
    renderBar();
    await openBell();

    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    const rows = document.querySelectorAll("[data-notif-row]");
    expect(document.activeElement).toBe(rows[0]);

    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(rows[1]);

    // Wraps, so you cannot get stuck at the end of the list.
    await act(async () => {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(rows[0]);
  });

  it("opens the focused row with Enter", async () => {
    renderBar();
    await openBell();

    const rows = document.querySelectorAll("[data-notif-row]");
    await act(async () => {
      fireEvent.keyDown(rows[0], { key: "Enter" });
    });

    expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/rate-contracts/12?stage=overview");
  });
});
