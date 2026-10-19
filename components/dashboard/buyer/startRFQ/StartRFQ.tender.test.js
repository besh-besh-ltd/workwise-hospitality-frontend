jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/products", () => ({ searchProductsV2: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ getRFQHotels: jest.fn() }));
jest.mock("@/services/rfq", () => ({
  addProductsToDraft: jest.fn(),
  getRecommendedProducts: jest.fn(),
  getDraftById: jest.fn(),
  getDraftRFQs: jest.fn(() => Promise.resolve({ data: { data: [] } })),
  deleteDraft: jest.fn(),
}));
jest.mock("@/services/approval", () => ({ getPolicyCoverage: jest.fn() }));
jest.mock("@/components/AuthContainer/LoginContainer", () => () => null);
jest.mock("@/components/shared/ReadOnlyBanner", () => () => null);
jest.mock("@/components/shared/AccessDeniedPage", () => () => null);
jest.mock("@/components/modal/ConfirmationModal", () => () => null);
jest.mock("./CopyFromExistingModal", () => () => null);
jest.mock("@/hooks/useModulePermissions", () => ({
  useModulePermissions: () => ({ canRead: true, canCreate: true, loading: false }),
}));
var mockRouter = { query: { orderType: "tender" }, push: jest.fn(), replace: jest.fn(), pathname: "/x" };
jest.mock("next/router", () => ({ useRouter: () => mockRouter }));
var mockProfile = {
  id: 1,
  is_hospitality: 1,
  hospitality_mappings: [{ hospitality_hotel_id: 91, hotel_name: "The Orchid Pune", company_name: "K" }],
};
jest.mock("react-redux", () => ({ useSelector: (fn) => fn({ userProfile: mockProfile }) }));

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPolicyCoverage } from "@/services/approval";
import StartRFQ from "./StartRFQ";

const NOTICE = /Tenders aren't set up for your company's units\. Ask your company admin\./;

beforeEach(() => {
  window.localStorage.setItem("token", "t");
  mockRouter.query = { orderType: "tender" };
});
afterEach(() => window.localStorage.clear());

describe("StartRFQ — direct ?orderType=tender", () => {
  it("shows the notice instead of starting a tender when coverage has no TENDER", async () => {
    getPolicyCoverage.mockResolvedValue({ data: { process_free: ["RFQ"], by_process: { 1: ["RFQ"] } } });
    render(<StartRFQ />);
    expect(await screen.findByText(NOTICE)).toBeInTheDocument();
    expect(screen.queryByText("Pick the business units")).not.toBeInTheDocument();
    expect(getPolicyCoverage).toHaveBeenCalledWith({});
  });

  it("proceeds when coverage lists a TENDER workflow", async () => {
    getPolicyCoverage.mockResolvedValue({ data: { process_free: [], by_process: { 5: ["TENDER"] } } });
    render(<StartRFQ />);
    await waitFor(() => expect(getPolicyCoverage).toHaveBeenCalled());
    expect(await screen.findByText("Pick the business units")).toBeInTheDocument();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it("keeps today's behaviour when the coverage call fails", async () => {
    getPolicyCoverage.mockRejectedValue({ message: new Error("500") });
    render(<StartRFQ />);
    await waitFor(() => expect(getPolicyCoverage).toHaveBeenCalled());
    // let the rejection settle so the "failed" state is what we assert against
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(screen.getByText("Pick the business units")).toBeInTheDocument();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});
