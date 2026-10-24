// The count page: an open count is counted, anything else is reviewed.
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getCount: jest.fn(),
  getCompanySettings: jest.fn(),
  saveCountLines: jest.fn(),
  submitCount: jest.fn(),
  cancelCount: jest.fn(),
  approveCount: jest.fn(),
  resolveScan: jest.fn(),
  listItems: jest.fn(() => Promise.resolve({ rows: [], total: 0 })),
  addItemBarcode: jest.fn(),
}));
jest.mock("@/components/inventory/scan/LazyCameraScanner", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/inventory/scan/scanFeedback", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    unlock: jest.fn(),
    installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false),
    setMuted: jest.fn(),
  },
}));
jest.mock("@/components/shared/mobile/MobileActionBar", () => ({
  __esModule: true,
  default: () => null,
  MobileActionButton: () => null,
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === "string" ? href : ""} {...rest}>
      {children}
    </a>
  ),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getCompanySettings, getCount } from "@/services/inventory";
import CountDetail from "../CountDetail";

const count = (o = {}) => ({
  id: 41,
  countNumber: "CNT/46/2026-27/00003",
  companyId: 3,
  hotelId: 46,
  hotelName: "Orchid Mumbai",
  scope: "FULL",
  status: "open",
  isBlind: false,
  startedAt: "2026-10-25T04:00:00.000Z",
  submittedAt: null,
  approvedAt: null,
  createdByName: "Asha Menon",
  lines: [
    {
      id: 1, invItemId: 7, displayName: "Basmati rice", itemCode: "RICE-01", stockUom: "kg", binLabel: "A-01",
      countedQty: 8, countedAt: null, countedByName: null, systemQtyAtCount: 10, varianceQty: -2, varianceValue: -180, reason: null,
    },
  ],
  summary: { lineCount: 1, countedCount: 1, varianceLines: 1, varianceValue: -180 },
  can: { count: true, approve: true },
  ...o,
});
const refusal = (status, data) => Object.assign(new Error(data.message), { isAxiosError: true, response: { status, data } });

beforeEach(() => {
  jest.clearAllMocks();
  getCompanySettings.mockResolvedValue({ countFreeze: false });
});

describe("CountDetail", () => {
  it("an open count is counted here; with count freeze on it says stock is frozen", async () => {
    getCount.mockResolvedValue(count());
    getCompanySettings.mockResolvedValue({ countFreeze: true });
    render(<CountDetail id="41" />);

    expect(await screen.findByLabelText("Counted qty for Basmati rice")).toBeInTheDocument();
    expect(getCount).toHaveBeenCalledWith("41");
    expect(screen.getByText("CNT/46/2026-27/00003")).toBeInTheDocument();
    expect(screen.getByText("Counting")).toBeInTheDocument();
    expect(await screen.findByText(/Stock at Orchid Mumbai is frozen while this count is open/)).toBeInTheDocument();
  });

  it("a submitted count opens on the variance review", async () => {
    getCount.mockResolvedValue(count({ status: "submitted", submittedAt: "2026-10-25T06:00:00.000Z" }));
    getCompanySettings.mockResolvedValue({ countFreeze: true });
    render(<CountDetail id="41" />);

    expect(await screen.findByRole("table", { name: "Counted items" })).toBeInTheDocument();
    expect(screen.getByText("Awaiting approval")).toBeInTheDocument();
    expect(screen.queryByLabelText("Counted qty for Basmati rice")).toBeNull();
    // A submitted count no longer freezes stock.
    expect(screen.queryByText(/is frozen while this count is open/)).toBeNull();
  });

  it("an unknown or foreign count says so", async () => {
    getCount.mockRejectedValue(refusal(404, { status: 2, code: "NOT_FOUND", message: "Count not found" }));
    render(<CountDetail id="999" />);
    expect(await screen.findByRole("heading", { name: "Count not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All counts/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/counts");
  });
});
