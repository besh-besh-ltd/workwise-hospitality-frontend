// Quote Compare (legacy /dashboard/buyer/quote-compare) — two request/render
// defects on the page component:
//
//   1. While quotes are locked until the bid deadline, the page held a 1 s
//      clock in state, so the WHOLE workspace (products × vendors grid and
//      every tab) re-rendered every second. The countdown now ticks inside the
//      banner/panel that shows it; the page only re-renders when the lock lifts.
//   2. initializeRfqData ran get-clauses → quote-compare → getRfqById one after
//      another although none needs another's result. They now start together.

const mockQuery = { rfq: "363", tab: "product" };
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: mockQuery, pathname: "/dashboard/buyer/quote-compare", push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 4, hospitality_mappings: [] } }),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock("xlsx-js-style", () => ({ __esModule: true }));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  downloadQuotesDetails: jest.fn(),
  finalizeQuotation: jest.fn(),
  getAllClauses: jest.fn(),
  getRFQById: jest.fn(),
  getRfqs: jest.fn(),
  handleUploadFileInFormData: jest.fn(),
  saveExcelInDB: jest.fn(),
  updateTargetPrice: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({ __esModule: true, getQuoteComparison: jest.fn() }));
jest.mock("@/services/project", () => ({ __esModule: true, getProjectAvailableBudget: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@/services/negotiation", () => ({ __esModule: true, getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })) }));
jest.mock("@/services/general", () => ({ __esModule: true, getAvailableHierarchies: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({ canRead: true, canUpdate: true, canCreate: true, allowedProcessIds: null, isProcessAllowed: () => true, loading: false }),
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/components/layout/DashboardShell", () => ({ __esModule: true, TwoPanelPage: ({ children }) => <div>{children}</div> }));
jest.mock("@/components/shared/RFQListSidebar", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/quoteCompare/QuoteCompareHeaderCard", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/quoteCompare/QuoteCompareKpiStrip", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/quoteCompare/ApprovalProgressCard", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/quoteCompare/ComparisonTabs", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/negotiation/NegotiationCompactBanner", () => ({ __esModule: true, default: () => null }));
// Stand-in for the heavy grid: counts how often the page re-renders it.
const mockGridRenders = { count: 0 };
jest.mock("@/components/dashboard/buyer/quoteCompare/ProductComparisonTab", () => ({
  __esModule: true,
  default: ({ quoteVisibility }) => {
    mockGridRenders.count += 1;
    return <div data-testid="grid">{quoteVisibility?.locked ? "locked" : "unlocked"}</div>;
  },
}));

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getAllClauses, getRFQById, getRfqs } from "@/services/rfq";
import { getQuoteComparison } from "@/services/pricing";
import QuoteCompare from "@/components/dashboard/buyer/quote-compare";

const RFQ_META = { id: 363, rfq_no: "535917", hotel_id: 1, hotel_ids: [1], status: 1, is_tender: 0 };

const quotesPayload = (deadlineIso) => ({
  data: { products: [{ id: 9001, rfq: [{ project_id: -1 }], quotations: [], all_vendors: [] }] },
  meta: { quoteVisibility: { locked: true, deadline: deadlineIso, message: "Quotes will appear after the deadline." } },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGridRenders.count = 0;
  getRfqs.mockResolvedValue([RFQ_META]);
  getAllClauses.mockResolvedValue({ data: [] });
  getRFQById.mockResolvedValue({ data: { ...RFQ_META, vendor_rejections: [], comment: "" } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("locked-until-deadline clock", () => {
  it("does not re-render the comparison grid every second; the countdown still ticks", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-03T06:00:00.000Z") });
    // 3 min 30 s to the deadline (bid deadlines are naive IST wall time:
    // 11:33:30 IST = 06:03:30Z).
    getQuoteComparison.mockResolvedValue(quotesPayload("2026-10-03 11:33:30"));

    render(<QuoteCompare />);
    await waitFor(() => expect(screen.getByTestId("grid")).toHaveTextContent(/^locked$/));
    expect(screen.getByText(/Time remaining: 3m\./)).toBeInTheDocument();

    const settled = mockGridRenders.count;
    // One second at a time, each flushed on its own — the way a browser
    // delivers them (one act() for all 61 would batch them into one render).
    for (let i = 0; i < 61; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { jest.advanceTimersByTime(1_000); });
    }

    // The visible countdown moved…
    expect(screen.getByText(/Time remaining: 2m\./)).toBeInTheDocument();
    // …but the grid was not re-rendered once per second (it was 61 times).
    expect(mockGridRenders.count - settled).toBeLessThanOrEqual(1);
  });

  it("still unlocks the page when the deadline passes", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-03T06:00:00.000Z") });
    getQuoteComparison.mockResolvedValue(quotesPayload("2026-10-03 11:30:05"));

    render(<QuoteCompare />);
    await waitFor(() => expect(screen.getByTestId("grid")).toHaveTextContent(/^locked$/));

    await act(async () => { jest.advanceTimersByTime(6_000); });
    await waitFor(() => expect(screen.getByTestId("grid")).toHaveTextContent(/^unlocked$/));
  });
});

describe("initial load", () => {
  it("starts get-clauses, quote-compare and getRfqById together", async () => {
    getAllClauses.mockReturnValue(new Promise(() => {})); // clauses still in flight
    getQuoteComparison.mockResolvedValue(quotesPayload("2020-01-01 00:00:00"));

    render(<QuoteCompare />);
    await waitFor(() => expect(getAllClauses).toHaveBeenCalledTimes(1));
    // Pre-fix neither of these started until get-clauses had returned.
    await waitFor(() => expect(getQuoteComparison).toHaveBeenCalledTimes(1));
    expect(getRFQById).toHaveBeenCalledTimes(1);
  });
});

describe("QuoteVisibilityLockPanel (Category / Overall tabs)", () => {
  it("runs its own countdown from deadlineEpoch", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-03T06:00:00.000Z") });
    const { default: QuoteVisibilityLockPanel } = jest.requireActual("./QuoteVisibilityLockPanel");
    render(
      <QuoteVisibilityLockPanel
        deadline="2026-10-03 11:33:30"
        deadlineEpoch={Date.parse("2026-10-03T06:03:30.000Z")}
        remainingMs={999999999}
      />
    );
    expect(screen.getByText("Time remaining: 3m")).toBeInTheDocument();
    for (let i = 0; i < 61; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { jest.advanceTimersByTime(1_000); });
    }
    expect(screen.getByText("Time remaining: 2m")).toBeInTheDocument();
  });
});
