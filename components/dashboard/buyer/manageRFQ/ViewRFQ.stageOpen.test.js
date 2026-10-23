// ViewRFQ — the PO stage as an `open` stage, and the visibilitychange refetch.
let mockQuery = { id: "536299", stage: "purchase-order" };
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    get query() { return mockQuery; },
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(), push: jest.fn(), back: jest.fn(),
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7, name: "Asha Menon" } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqLineage: jest.fn(() => Promise.resolve({ data: { copied_from: null, copies: [] } })),
  getTechEvalStatus: jest.fn(() => Promise.resolve({ data: null })),
  getRfqLifecycle: jest.fn(),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getNegotiationRoundsByProduct: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(() => Promise.resolve({ status: 1, data: {} })),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({
  __esModule: true,
  default: () => ({ hasClauses: false, loading: false }),
}));
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => <div>NEGOTIATION BODY</div> }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({
  __esModule: true,
  default: ({ currentUserId }) => <div>PO BODY uid={String(currentUserId)}</div>,
}));
jest.mock("@/components/dashboard/buyer/rfq/stages/StageShared", () => ({
  ...jest.requireActual("@/components/dashboard/buyer/rfq/stages/StageShared"),
  __esModule: true,
  StageSkeleton: () => null,
  LifecycleContext: () => null,
}));

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRfqLifecycle } from "@/services/rfq";
import ViewRFQ from "./ViewRFQ";

const RFQ = {
  id: 536299, rfq_no: "536299", title: "T", status: 3, is_published: 0, is_tender: 0,
  products: [], terms: [], company_name: "C", hotel_name: "H", timestamp: "2026-07-20T10:00:00.000Z",
};
const st = (key, label, state, extra = {}) => ({
  key, label, state, reason: "x", summary: null, action: null, phase: { key, label, status: "current" }, ...extra,
});
const payload = (poState = "open") => ({
  rfq_id: 536299, current_status: "COMMERCIAL_EVALUATION", default_stage: "negotiation-award",
  action: { required: false, can_approve: false }, permissions: {},
  stages: [
    st("overview", "Overview", "complete"),
    st("technical", "Technical Evaluation", "complete"),
    st("negotiation-award", "Negotiation & Award", "active"),
    st("purchase-order", "Purchase Order", poState, poState === "open" ? { reason: "partial_award", draft_count: 1 } : {}),
  ],
});

const mount = async (p) => {
  getRfqLifecycle.mockResolvedValue({ status: 1, data: p });
  const view = render(<ViewRFQ data={RFQ} isCreator={false} />);
  await waitFor(() => expect(getRfqLifecycle).toHaveBeenCalled());
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { id: "536299", stage: "purchase-order" };
});

describe("ViewRFQ — ?stage= for an open stage", () => {
  test("?stage=purchase-order lands on the PO stage when it is open", async () => {
    await mount(payload("open"));
    expect(await screen.findByText(/PO BODY/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /purchase order/i })).toHaveAttribute("aria-selected", "true");
  });

  test("the current user's id is handed to the PO stage", async () => {
    await mount(payload("open"));
    expect(await screen.findByText("PO BODY uid=7")).toBeInTheDocument();
  });

  test("a locked PO stage still ignores ?stage= and default_stage is unchanged", async () => {
    await mount(payload("locked"));
    expect(await screen.findByText("NEGOTIATION BODY")).toBeInTheDocument();
    expect(screen.queryByText(/PO BODY/)).not.toBeInTheDocument();
  });

  test("without ?stage= the RFQ opens on default_stage even though PO is open", async () => {
    mockQuery = { id: "536299" };
    await mount(payload("open"));
    expect(await screen.findByText("NEGOTIATION BODY")).toBeInTheDocument();
  });
});

describe("ViewRFQ — refetch when the tab becomes visible", () => {
  const setVisibility = (v) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  beforeEach(() => jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] }));
  afterEach(() => { jest.useRealTimers(); setVisibility("visible"); });

  test("a visibilitychange to visible refetches once, debounced to 1s", async () => {
    await mount(payload("open"));
    await act(async () => { await Promise.resolve(); });
    const base = getRfqLifecycle.mock.calls.length;

    act(() => { setVisibility("visible"); setVisibility("visible"); setVisibility("visible"); });
    expect(getRfqLifecycle).toHaveBeenCalledTimes(base);
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(getRfqLifecycle).toHaveBeenCalledTimes(base + 1);
  });

  test("hidden does not refetch", async () => {
    await mount(payload("open"));
    await act(async () => { await Promise.resolve(); });
    const base = getRfqLifecycle.mock.calls.length;
    act(() => { setVisibility("hidden"); });
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(getRfqLifecycle).toHaveBeenCalledTimes(base);
  });
});
