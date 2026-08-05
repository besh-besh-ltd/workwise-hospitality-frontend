// ViewRFQ — the award-approval banner, end to end on the page.
//
// The card is rendered page-level (it shows on every stage), so this is where
// the banner's hand-off is actually wired: clicking it must open the Negotiation
// & Award stage and hand the embedded comparison sheet a focus token, because
// the per-cell Approve/Reject in that sheet is the real decision surface.
//
// Kept in its own file rather than bolted onto ViewRFQ.test.js, which guards the
// (unchanged) RFQ-approval path.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "536264" },
    asPath: "/dashboard/buyer/rfq-management-details?id=536264",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 4, name: "Prashant Joshi" } }),
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
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));
// Stand in for the real (lazily loaded, service-heavy) stage and surface the one
// thing this page owes it: the focus token.
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({
  __esModule: true,
  default: ({ focusAwardToken }) => (
    <div data-testid="award-stage">token:{String(focusAwardToken)}</div>
  ),
}));
jest.mock("@/components/dashboard/buyer/rfq/stages/StageShared", () => ({
  __esModule: true,
  StageSkeleton: () => null,
  LifecycleContext: () => null,
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRfqLifecycle } from "@/services/rfq";
import { submitApprovalAction } from "@/services/approval";
import ViewRFQ from "./ViewRFQ";

const RFQ_ID = 720;

const RFQ = {
  id: RFQ_ID,
  rfq_no: "536264",
  title: "Window fittings",
  status: 1,
  is_published: 1,
  is_tender: 0,
  products: [],
  terms: [],
  company_name: "Phileein Hospitality",
  hotel_name: "Hotel One",
  timestamp: "2026-07-20T10:00:00.000Z",
};

const award = (id, rfqProductId, extra = {}) => ({
  id,
  status: "PENDING",
  entity_type: "NEGOTIATION_QUOTE",
  entity_id: rfqProductId,
  current_step: 1,
  total_steps: 2,
  can_user_approve: true,
  user_approval_step_id: 900 + id,
  metadata: {
    rfq_id: RFQ_ID,
    rfq_product_id: rfqProductId,
    vendor_id: 5512,
    po_payload: { total_value: 184500 },
  },
  steps: [
    {
      step_order: 1,
      decision_rule: "ALL",
      status: "PENDING",
      approvers: [
        { user_id: 1, user_name: "Asha Menon", status: "APPROVED" },
        { user_id: 2, user_name: "Vineet Iyer", status: "APPROVED" },
        { user_id: 3, user_name: "Rhea Kapoor", status: "APPROVED" },
        { user_id: 4, user_name: "Prashant Joshi", status: "PENDING" },
      ],
    },
  ],
  ...extra,
});

// RFQ #536264: four pending award approvals, all four products named WINDOW.
// The commercial phase is where the timeline would open, but the card renders
// page-level, so the banner is on screen whichever stage is showing.
const lifecyclePayload = () => {
  const action = {
    required: true,
    can_approve: true,
    label: "You have a pending approval action",
    instance_id: 3879,
    step_id: null,
    entity_type: "NEGOTIATION_QUOTE",
  };
  const stage = (key, label, state, phase) => ({
    key, label, state,
    reason: state === "active" ? "in_progress" : "not_started",
    summary: null,
    action: state === "active" ? action : null,
    phase,
  });
  return {
    rfq_id: RFQ_ID,
    current_status: "QUOTATION_APPROVAL",
    // Open on Overview so the click has a stage switch to make.
    default_stage: "overview",
    action,
    permissions: {},
    stages: [
      stage("overview", "Overview", "active", { key: "rfq_approval", status: "current" }),
      stage("technical", "Technical Evaluation", "skipped", { key: "technical", status: "skipped" }),
      stage("negotiation-award", "Negotiation & Award", "active", {
        key: "commercial",
        label: "Commercial Evaluation",
        status: "current",
        products: [
          {
            product_id: 8801,
            product_name: "WINDOW",
            finalization: {
              vendor_name: "R. Sharma",
              vendor_company: "Sharma Glassworks",
              total_price: 184500,
            },
            negotiation_rounds: [],
          },
        ],
        approval_instances: [award(3879, 8801), award(3880, 8802), award(3881, 8803), award(3882, 8804)],
      }),
      stage("purchase-order", "Purchase Order", "locked", { key: "purchase_order", status: "upcoming" }),
    ],
  };
};

const renderPage = async () => {
  getRfqLifecycle.mockResolvedValue({ status: 1, data: lifecyclePayload() });
  const view = render(<ViewRFQ data={RFQ} isCreator={false} />);
  await waitFor(() => expect(getRfqLifecycle).toHaveBeenCalled());
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ViewRFQ — vendor award approvals", () => {
  test("shows the banner with the scale and the item, not Approve/Reject", async () => {
    await renderPage();

    expect(
      await screen.findByText(/4 vendor awards on this RFQ are waiting on your approval/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/WINDOW/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 4 approvers done/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting on Prashant Joshi/i)).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
  });

  test("clicking it opens the Negotiation & Award stage and hands over a focus token", async () => {
    await renderPage();

    // Overview first: the sheet is not mounted at all.
    expect(screen.queryByTestId("award-stage")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /comparison sheet/i }));

    const stage = await screen.findByTestId("award-stage");
    expect(stage).toHaveTextContent("token:1");
    // The banner itself never posts a decision.
    expect(submitApprovalAction).not.toHaveBeenCalled();
  });

  test("clicking again re-focuses — the token increases rather than latching", async () => {
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /comparison sheet/i }));
    expect(await screen.findByTestId("award-stage")).toHaveTextContent("token:1");

    fireEvent.click(screen.getByRole("button", { name: /comparison sheet/i }));
    await waitFor(() =>
      expect(screen.getByTestId("award-stage")).toHaveTextContent("token:2")
    );
  });
});
