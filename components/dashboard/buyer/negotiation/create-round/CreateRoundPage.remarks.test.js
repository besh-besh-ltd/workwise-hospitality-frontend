// REQ-0026 — the page forwards the wizard's remarks as creator_remarks.
// The wizard hook is stubbed at step 3 so the submit path is exercised alone.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { rfqId: "601" },
    asPath: "/x",
    pathname: "/x",
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    isReady: true,
  }),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  createNegotiationRound: jest.fn(() => Promise.resolve({ status: 1 })),
  getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ status: 1, data: [] })),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ status: 1, data: {} })),
  getQuoteApprovalStatus: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparison: jest.fn(() => Promise.resolve({ data: { products: [] } })),
  getQuoteComparisonView: jest.fn(() => Promise.resolve(null)),
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("./StepReview", () => ({
  __esModule: true,
  default: ({ remarks }) => <div data-testid="review" data-remarks={remarks} />,
}));
jest.mock("./useCreateRoundState", () => ({ __esModule: true, default: jest.fn() }));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { createNegotiationRound } from "@/services/negotiation";
import useCreateRoundState from "./useCreateRoundState";
import CreateRoundPage from "./CreateRoundPage";

const wizardWith = (roundRemarks) => ({
  step: 3,
  mode: "rfq",
  canSubmit: true,
  hasCurrentRound: false,
  queuedRounds: [{ mode: "rfq", vendor_targets: [{ vendor_id: 1 }] }],
  endDateUtc: "2026-11-01 10:00:00",
  formData: { end_date: "2026-11-01T15:30", negotiation_fields: [] },
  roundRemarks,
  setRoundRemarks: jest.fn(),
  selectedProduct: null,
  selectedVendorIds: [],
  vendorTargets: {},
  effectiveFields: [],
  step3Errors: [],
  queuedProductIds: [],
  clearQueue: jest.fn(),
  goToStep: jest.fn(),
  goBack: jest.fn(),
  goNext: jest.fn(),
  canGoToStep: () => true,
});

const submit = async (remarks) => {
  useCreateRoundState.mockReturnValue(wizardWith(remarks));
  render(<CreateRoundPage />);
  await screen.findByTestId("review");
  const btn = await screen.findByRole("button", { name: /send for approval|create round|submit/i });
  fireEvent.click(btn);
  await waitFor(() => expect(createNegotiationRound).toHaveBeenCalledTimes(1));
  return createNegotiationRound.mock.calls[0][0];
};

beforeEach(() => jest.clearAllMocks());

it("CreateRoundPage posts creator_remarks trimmed", async () => {
  const body = await submit("  match L1  ");
  expect(body.creator_remarks).toBe("match L1");
});

it("CreateRoundPage posts null when remarks are blank", async () => {
  const body = await submit("   ");
  expect(body.creator_remarks).toBeNull();
});
