/* Drill-down modals + charts: dialog semantics, keyboard, focus, filters. */
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("next/link", () => {
  const Link = ({ children, href, onClick, ...rest }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/services/dashboard", () => ({
  __esModule: true,
  getPendingApprovalsDetail: jest.fn(),
  getRejectedPOsDetail: jest.fn(),
  getNoResponseDetail: jest.fn(),
  getCategoryInsights: jest.fn(),
}));

// Canvas charts can't render in jsdom — keep the props we care about.
jest.mock("react-chartjs-2", () => ({
  Pie: (props) => <div data-testid="pie" role={props.role} aria-label={props["aria-label"]} />,
  Line: (props) => <div data-testid="line" role={props.role} aria-label={props["aria-label"]} />,
}));

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PendingApprovalsModal from "./PendingApprovalsModal";
import RejectedPOsModal from "./RejectedPOsModal";
import NoResponseModal from "./NoResponseModal";
import SpendBreakupModal from "./SpendBreakupModal";
import CategoryInsights from "./CategoryInsights";
import {
  getPendingApprovalsDetail,
  getRejectedPOsDetail,
  getNoResponseDetail,
  getCategoryInsights,
} from "@/services/dashboard";

const FILTERS = {
  hotel_ids: "12,14",
  start_date: "2026-04-01",
  end_date: "2026-09-28",
  duration_type: "fy",
  _refresh: 0,
};

const flush = () => act(async () => {});

beforeEach(() => {
  getPendingApprovalsDetail.mockReset().mockResolvedValue({ status: 1, data: [] });
  getRejectedPOsDetail.mockReset().mockResolvedValue({ status: 1, data: [] });
  getNoResponseDetail.mockReset().mockResolvedValue({ status: 1, data: { active: [], expired: [] } });
  getCategoryInsights.mockReset();
});

const LIST_MODALS = [
  ["PendingApprovalsModal", PendingApprovalsModal, getPendingApprovalsDetail, /waiting on you/i],
  ["RejectedPOsModal", RejectedPOsModal, getRejectedPOsDetail, /rejected pos/i],
  ["NoResponseModal", NoResponseModal, getNoResponseDetail, /awaiting vendor response/i],
];

describe.each(LIST_MODALS)("%s", (_name, Modal, fetcher, titleRe) => {
  it("is a labelled modal dialog that closes on Escape", async () => {
    const onClose = jest.fn();
    render(<Modal onClose={onClose} filters={FILTERS} />);
    await flush();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(titleRe);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus inside, traps Tab, and returns focus on close", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Modal onClose={() => {}} filters={FILTERS} />);
    await flush();
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close" });
    expect(dialog).toContainElement(document.activeElement);
    // Only one focusable (the close button) once the empty list renders:
    // Tab must stay on it.
    close.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog).toContainElement(document.activeElement);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("requests the same filters as the card (BU included, page keys dropped)", async () => {
    render(<Modal onClose={() => {}} filters={FILTERS} />);
    await flush();
    expect(fetcher).toHaveBeenCalledWith(
      { hotel_ids: "12,14", start_date: "2026-04-01", end_date: "2026-09-28" },
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("shows an error with retry instead of an empty list when the fetch fails", async () => {
    fetcher.mockReset().mockRejectedValue({ message: "Service unavailable" });
    render(<Modal onClose={() => {}} filters={FILTERS} />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t load this list/i);
    fetcher.mockResolvedValue({ status: 1, data: [] });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("SpendBreakupModal", () => {
  it("is a labelled dialog, closes on Escape, and describes the bar", () => {
    const onClose = jest.fn();
    render(
      <SpendBreakupModal
        onClose={onClose}
        posIssued={3}
        breakup={{ base_excl_gst: 800, total_gst: 200, total_incl_gst: 1000 }}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/total spend breakup/i);
    expect(screen.getByRole("img")).toHaveAccessibleName("Base 80%, GST 20% of total spend");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CategoryInsights chart", () => {
  it("gives the doughnut a text summary of every slice", async () => {
    getCategoryInsights.mockResolvedValue({
      status: 1,
      data: {
        categories: [
          { category_name: "Linen", spend_amount: 150000, percentage: 60 },
          { category_name: "Kitchen", spend_amount: 100000, percentage: 40 },
        ],
      },
    });
    render(<CategoryInsights filters={FILTERS} />);
    await flush();
    expect(screen.getByTestId("pie")).toHaveAccessibleName(
      "Spend by category, total ₹2.5L: Linen 60.0%, Kitchen 40.0%"
    );
  });
});
