// The count page: an open count is counted, anything else is reviewed.
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getCount: jest.fn(),
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
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() }, push: jest.fn() }),
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
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getCount, saveCountLines } from "@/services/inventory";
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
  [getCount, saveCountLines].forEach((fn) => fn.mockReset());
});

describe("CountDetail", () => {
  it("an open count is counted here; with count freeze on it says stock is frozen", async () => {
    getCount.mockResolvedValue(count({ countFreeze: true }));
    render(<CountDetail id="41" />);

    expect(await screen.findByLabelText("Counted qty for Basmati rice")).toBeInTheDocument();
    expect(getCount).toHaveBeenCalledWith("41");
    expect(screen.getByText("CNT/46/2026-27/00003")).toBeInTheDocument();
    expect(screen.getByText("Counting")).toBeInTheDocument();
    expect(await screen.findByText(/Stock at Orchid Mumbai is frozen while this count is open/)).toBeInTheDocument();
  });

  it("the freeze banner says deliveries can't be received either (I-2: the backend refuses GRN posts too)", async () => {
    getCount.mockResolvedValue(count({ countFreeze: true }));
    render(<CountDetail id="41" />);
    const banner = await screen.findByText(/Stock at Orchid Mumbai is frozen while this count is open/);
    // What the server refuses with LOCKED while a freezing count is open
    // (assertNotFrozen: grnService post, grnReverse, rtvService dispatch,
    // outService, adjustmentService create/approve).
    expect(banner).toHaveTextContent(/receiving deliveries/);
    expect(banner).toHaveTextContent(/site-rep receipts/);
    expect(banner).toHaveTextContent(/GRN reversals/);
    expect(banner).toHaveTextContent(/returns to vendor/);
    expect(banner).toHaveTextContent(/mark-out/);
    expect(banner).toHaveTextContent(/adjustments/);
    expect(banner).toHaveTextContent(/wait until it is submitted or cancelled/);
  });

  it("the freeze banner follows the count's own countFreeze: off there, no banner", async () => {
    getCount.mockResolvedValue(count({ countFreeze: false }));
    render(<CountDetail id="41" />);
    expect(await screen.findByLabelText("Counted qty for Basmati rice")).toBeInTheDocument();
    expect(screen.queryByText(/is frozen while this count is open/)).toBeNull();
  });

  it("a submitted count opens on the variance review", async () => {
    getCount.mockResolvedValue(count({ status: "submitted", submittedAt: "2026-10-25T06:00:00.000Z", countFreeze: true }));
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

  it("a reload still in flight when a save lands never puts back the older figures", async () => {
    const open = count({
      lines: [
        { id: 1, invItemId: 7, displayName: "Basmati rice", itemCode: "RICE-01", stockUom: "kg", binLabel: "A-01", countedQty: null, countedAt: null, countedByName: null, systemQtyAtCount: null, varianceQty: null, varianceValue: null, reason: null },
        { id: 2, invItemId: 8, displayName: "Sugar", itemCode: "SUG-01", stockUom: "kg", binLabel: "B-02", countedQty: null, countedAt: null, countedByName: null, systemQtyAtCount: null, varianceQty: null, varianceValue: null, reason: null },
      ],
      can: { count: true, approve: false },
    });
    const withSugar = { ...open, lines: open.lines.map((l) => (l.invItemId === 8 ? { ...l, countedQty: 2 } : l)) };
    let releaseReload;
    getCount
      .mockResolvedValueOnce(open)
      .mockImplementationOnce(() => new Promise((resolve) => (releaseReload = resolve)));
    // Basmati's save is refused (403: the page reloads); Sugar's save lands while that reload is in flight.
    saveCountLines
      .mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { isAxiosError: true, response: { status: 403, data: { status: 0, code: "FORBIDDEN", message: "Not allowed" } } }))
      .mockResolvedValueOnce(withSugar);
    render(<CountDetail id="41" />);

    const basmati = await screen.findByLabelText("Counted qty for Basmati rice");
    fireEvent.change(basmati, { target: { value: "4" } });
    await act(async () => fireEvent.blur(basmati));
    await act(async () => {});
    expect(getCount).toHaveBeenCalledTimes(2);

    const sugar = screen.getByLabelText("Counted qty for Sugar");
    fireEvent.change(sugar, { target: { value: "2" } });
    await act(async () => fireEvent.blur(sugar));
    await act(async () => {});
    expect(within(sugar.closest("li")).getByText("Saved")).toBeInTheDocument();

    // The reload answers with the count as it was before Sugar's save.
    await act(async () => releaseReload(open));
    expect(screen.getByLabelText("Counted qty for Sugar")).toHaveValue("2");
    expect(within(screen.getByLabelText("Counted qty for Sugar").closest("li")).getByText("Saved")).toBeInTheDocument();
  });

  it("a count gone since it was opened says so when it reloads", async () => {
    getCount
      .mockResolvedValueOnce(count({ can: { count: true, approve: false }, lines: [{ id: 1, invItemId: 7, displayName: "Basmati rice", itemCode: "RICE-01", stockUom: "kg", binLabel: "A-01", countedQty: null, countedAt: null, countedByName: null, systemQtyAtCount: null, varianceQty: null, varianceValue: null, reason: null }] }))
      .mockRejectedValueOnce(refusal(404, { status: 2, code: "NOT_FOUND", message: "Count not found" }));
    saveCountLines.mockRejectedValueOnce(refusal(404, { status: 2, code: "NOT_FOUND", message: "Count not found" }));
    render(<CountDetail id="41" />);

    const basmati = await screen.findByLabelText("Counted qty for Basmati rice");
    fireEvent.change(basmati, { target: { value: "4" } });
    await act(async () => fireEvent.blur(basmati));
    await act(async () => {});
    expect(await screen.findByRole("heading", { name: "Count not found" })).toBeInTheDocument();
  });
});
