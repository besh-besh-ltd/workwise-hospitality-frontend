jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/products", () => ({ searchProductsV2: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ getRFQHotels: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/services/approval", () => ({ getPolicyCoverage: jest.fn() }));
jest.mock("@/components/AuthContainer/LoginContainer", () => () => null);
jest.mock("@/components/modal/AddTenderItemModal", () => () => null);
jest.mock("@/components/shared/ReadOnlyBanner", () => () => null);
jest.mock("@/components/shared/AccessDeniedPage", () => () => null);
jest.mock("./ProcurementHeader", () => () => null);
jest.mock("./ProductSearch", () => () => null);
jest.mock("@/hooks/useModulePermissions", () => ({
  useModulePermissions: () => ({ canRead: true, canCreate: true, loading: false }),
}));
var mockRouter = { query: {}, push: jest.fn(), replace: jest.fn(), pathname: "/vendors" };
jest.mock("next/router", () => ({ useRouter: () => mockRouter }));
var mockProfile = { id: 1, is_hospitality: 1, hospitality_mappings: [] };
jest.mock("react-redux", () => ({ useSelector: (fn) => fn({ userProfile: mockProfile }) }));

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPolicyCoverage } from "@/services/approval";
import Search from "./search";

beforeEach(() => window.localStorage.setItem("token", "t"));
afterEach(() => window.localStorage.clear());

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

describe("procurement type cards", () => {
  it("hides the Tender card when no Tender workflow exists", async () => {
    getPolicyCoverage.mockResolvedValue({ data: { process_free: ["RFQ"], by_process: {} } });
    render(<Search title="x" />);
    await waitFor(() => expect(getPolicyCoverage).toHaveBeenCalled());
    await settle();
    expect(screen.getByText("RFQ")).toBeInTheDocument();
    expect(screen.queryByText("Tender")).not.toBeInTheDocument();
  });

  it("shows it when a Tender workflow exists", async () => {
    getPolicyCoverage.mockResolvedValue({ data: { process_free: [], by_process: { 3: ["TENDER"] } } });
    render(<Search title="x" />);
    await waitFor(() => expect(getPolicyCoverage).toHaveBeenCalled());
    await settle();
    expect(screen.getByText("Tender")).toBeInTheDocument();
  });

  it("keeps it when the coverage call fails", async () => {
    getPolicyCoverage.mockRejectedValue({ message: new Error("500") });
    render(<Search title="x" />);
    await waitFor(() => expect(getPolicyCoverage).toHaveBeenCalled());
    await settle();
    expect(screen.getByText("Tender")).toBeInTheDocument();
  });
});
