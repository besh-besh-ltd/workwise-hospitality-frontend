// Setup's company choice is the Setup page's own. Picking a company there must
// not rewrite the portal-wide hospitality context: that context puts
// X-Hospitality-Company on every request in every module and narrows the
// sidebar's approval counts. This suite runs the REAL context store and the
// REAL shared axios instance to prove other modules' requests are unaffected,
// and that Setup's own calls still name the chosen company.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, pathname: "/dashboard/buyer/inventory/setup", push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  Object.assign(toast, { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), warning: jest.fn(), dismiss: jest.fn() });
  return { __esModule: true, toast };
});
// One state object, built once: useUserId reads userProfile.id from it.
jest.mock("react-redux", () => {
  const state = { userProfile: { id: 407 } };
  return { __esModule: true, useSelector: (fn) => fn(state) };
});
// lib/axios pulls these in; none of them matter here.
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("@/redux/store", () => ({ __esModule: true, store: { dispatch: jest.fn() } }));
jest.mock("@/components/shared/SessionExpiredModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false, error: null,
    hasPermission: () => true, refetch: jest.fn(),
  }),
}));
jest.mock("@/services/hospitality", () => ({ __esModule: true, getMyHospitalityContexts: jest.fn() }));
jest.mock("@/services/arc_v2", () => ({ __esModule: true, listRootCategories: jest.fn(), searchVariants: jest.fn() }));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  listItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  mapVariantToItem: jest.fn(),
  suggestItems: jest.fn(),
  getItemUoms: jest.fn(),
  saveItemUoms: jest.fn(),
  addItemBarcode: jest.fn(),
  deleteItemBarcode: jest.fn(),
  listHotelItems: jest.fn(),
  saveHotelItem: jest.fn(),
  getCompanySettings: jest.fn(),
  saveCompanySettings: jest.fn(),
  getHotelSettings: jest.fn(),
  saveHotelSettings: jest.fn(),
  getCategoryDefaults: jest.fn(),
  saveCategoryDefaults: jest.fn(),
  previewOpeningStock: jest.fn(),
  postOpeningStock: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import axiosInstance from "@/lib/axios";
import { getMyHospitalityContexts } from "@/services/hospitality";
import { getStock, listItems, getCompanySettings } from "@/services/inventory";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";
import SetupPage from "../SetupPage";

const TWO_COMPANIES = {
  status: 1,
  data: [
    { id: 5, name: "Orchid Hotels", hotels: [{ id: 46, name: "Orchid Mumbai" }] },
    { id: 6, name: "Plaza Hotels", hotels: [{ id: 47, name: "Plaza Delhi" }] },
  ],
};
const TWO_HOTELS = {
  hotelId: 46, stockStartedAt: null, rows: [], total: 0,
  hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Plaza Delhi" }],
};

/** An adapter that answers with the headers and params the request went out with. */
const echo = async (config) => ({
  data: { headers: config.headers, params: config.params || {} }, status: 200, statusText: "OK", headers: {}, config,
});
const sentHeader = (headers, name) => (typeof headers.get === "function" ? headers.get(name) : headers[name]);

let contextEvents = 0;
const countContextEvent = () => {
  contextEvents += 1;
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  contextEvents = 0;
  window.addEventListener("hospitality-context-change", countContextEvent);
  getMyHospitalityContexts.mockResolvedValue(TWO_COMPANIES);
  getStock.mockResolvedValue(TWO_HOTELS);
  listItems.mockResolvedValue({ rows: [{ id: 9, displayName: "Basmati rice", stockUom: "bag", variants: [], barcodes: [] }], total: 1 });
  getCompanySettings.mockResolvedValue({
    overReceiptTolerancePct: 0, allowNegativeStock: false, includeGstInCost: false, adjustmentAutoApproveLimit: 0, countFreeze: false,
  });
});
afterEach(() => {
  window.removeEventListener("hospitality-context-change", countContextEvent);
});

const chooseCompany = async (id) => {
  const chooser = await screen.findByRole("region", { name: "Choose a company" });
  fireEvent.change(within(chooser).getByLabelText("Company"), { target: { value: String(id) } });
  fireEvent.click(within(chooser).getByRole("button", { name: "Use this company" }));
};

describe("Setup's company choice stays on the Setup page", () => {
  test("picking a company leaves the portal-wide context, and every other module's requests, untouched", async () => {
    render(<SetupPage initialTab="items" />);
    await chooseCompany(5);

    expect(await screen.findByRole("button", { name: "Basmati rice" })).toBeInTheDocument();
    expect(screen.getByText(/^For/)).toHaveTextContent("For Orchid Hotels");

    // The portal-wide context was never written or announced.
    expect(getStoredHospitalityContext()).toBeNull();
    expect(window.localStorage.getItem("hospitality_context_selection")).toBeNull();
    expect(contextEvents).toBe(0);

    // A request from any other module (RFQs, approval counts) goes out without the company.
    const rfq = await axiosInstance.get("/rfq/list", { adapter: echo });
    expect(sentHeader(rfq.headers, "X-Hospitality-Company")).toBeFalsy();
    const counts = await axiosInstance.get("/general/approvals/pending-counts", { adapter: echo });
    expect(sentHeader(counts.headers, "X-Hospitality-Company")).toBeFalsy();
    expect(counts.params).not.toHaveProperty("hospitality_company_id");
  });

  test("Setup's own calls name the chosen company, and the choice is kept for the session", async () => {
    const { unmount } = render(<SetupPage initialTab="items" />);
    await chooseCompany(6);
    await screen.findByRole("button", { name: "Basmati rice" });
    expect(listItems).toHaveBeenLastCalledWith({ page: 1, hospitality_company_id: 6 });
    unmount();

    // Back on Setup later in the session (another tab of Setup): no chooser, same company.
    render(<SetupPage initialTab="settings" initialHotelId="47" />);
    expect(await screen.findByLabelText("Allow negative stock")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Choose a company" })).toBeNull();
    expect(screen.getByText(/^For/)).toHaveTextContent("For Plaza Hotels");
    expect(getCompanySettings).toHaveBeenCalledWith(6);
    expect(getStoredHospitalityContext()).toBeNull();
  });
});
