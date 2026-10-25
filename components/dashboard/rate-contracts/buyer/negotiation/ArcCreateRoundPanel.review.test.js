// ArcCreateRoundPanel.review.test.js — the ARC create wizard's review step is
// the RFQ one (StepReview): the round timeline, the remarks for approvers and a
// card per round, named for a rate contract rather than an RFQ.
//
// It used to be an ARC-native step with a bare datetime input and no floor,
// which is how production ARC-2026-27-0006 got eight rounds with deadlines
// 4–64 minutes out; seven lapsed before their approvers could act.

jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn(), query: {} }) }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getCommEval: jest.fn(() => Promise.resolve({ data: { items: [], quotes: [] } })),
  getArcNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  createArcNegotiationRound: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));
jest.mock("@/components/dashboard/buyer/negotiation/create-round/StepVendorsAndTargets", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/negotiation/create-round/useCreateRoundState", () => ({ __esModule: true, default: jest.fn() }));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import useCreateRoundState from "@/components/dashboard/buyer/negotiation/create-round/useCreateRoundState";
import ArcCreateRoundPanel from "./ArcCreateRoundPanel";

const makeWizard = (over = {}) => ({
  step: 3,
  mode: "rfq",
  formData: { end_date: "2026-10-24T11:00", negotiation_fields: [] },
  endDateUtc: "2026-10-24T05:30:00Z",
  queuedRounds: [],
  queuedProductIds: new Set(),
  hasQueuedRfqRound: false,
  hasCurrentRound: true,
  canGoToStep3: true,
  canSubmit: false,
  selectedProduct: null,
  productPriceData: { vendors: [], l1: null },
  selectedVendorIds: [],
  vendorTargets: {},
  effectiveFields: [],
  endDateError: false,
  step3Errors: ["Pick a deadline at least 2 hours from now."],
  buildCurrentRoundPayload: () => ({ payload: { is_rfq_level: true, vendor_targets: [] } }),
  clearQueue: jest.fn(),
  updateFormData: jest.fn(),
  goToStep: jest.fn(),
  removeFromQueue: jest.fn(),
  editQueuedRound: jest.fn(),
  roundRemarks: "",
  setRoundRemarks: jest.fn(),
  ...over,
});

const pad = (n) => String(n).padStart(2, "0");
const localIn = (ms) => {
  const d = new Date(Date.now() + ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date(2026, 9, 24, 10, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

it("shows the RFQ round timeline and the remarks for approvers", async () => {
  useCreateRoundState.mockReturnValue(makeWizard());
  render(<ArcCreateRoundPanel arcId="9" />);
  expect(await screen.findByText("Round timeline")).toBeInTheDocument();
  expect(screen.getByLabelText("Remarks for approvers")).toBeInTheDocument();
});

it("will not offer a deadline less than 2 hours out, and says why", async () => {
  useCreateRoundState.mockReturnValue(makeWizard());
  const { container } = render(<ArcCreateRoundPanel arcId="9" />);
  await screen.findByText("Round timeline");
  expect(container.querySelector('input[type="datetime-local"]')).toHaveAttribute("min", localIn(2 * 3600 * 1000));
  expect(screen.getByText("Pick a deadline at least 2 hours from now.")).toBeInTheDocument();
});

it("names a whole-ARC round for the rate contract, not an RFQ", async () => {
  useCreateRoundState.mockReturnValue(makeWizard());
  render(<ArcCreateRoundPanel arcId="9" />);
  await screen.findByText("Round timeline");
  expect(screen.getByText("Whole rate contract")).toBeInTheDocument();
  expect(screen.queryByText(/RFQ/)).not.toBeInTheDocument();
});
