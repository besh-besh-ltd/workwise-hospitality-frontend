// CreateRFQ — a server-built draft (POST /pr/convert) opens with its hotel
// selected even when the buyer has no mobile number.
//
// loadDraft used to apply `mappedHotels` only inside the contact_number branch.
// A PR conversion copies the buyer's mobile into contact_number, so a buyer
// without one got the draft with NO hotel selected: departments and RFQ
// permissions never loaded. The observable effect: the hotel-scoped
// department list is (or is not) requested for the draft's hotel.

const mockRouter = {
  query: { tab: "create-rfq", draft_id: "900" },
  pathname: "/dashboard/buyer/rfq-management",
  asPath: "/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=900",
  isReady: true,
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
  events: { on: jest.fn(), off: jest.fn() },
};
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => mockRouter }));

jest.mock("@/services/rfq");
jest.mock("@/services/project");
jest.mock("@/services/hospitality");
jest.mock("@/services/rbac");
jest.mock("@/services/process");
jest.mock("@/services/units");
jest.mock("@/services/cms");
jest.mock("@/services/products");
jest.mock("react-toastify", () => ({ __esModule: true, toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warn: jest.fn() } }));

const mockPermissionCalls = [];
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: (args) => {
    mockPermissionCalls.push(args);
    return { canRead: true, canUpdate: true, canCreate: true, allowedProcessIds: null, loading: false };
  },
}));

import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import reducer, { setUserProfile } from "@/redux/slice";
import * as RfqApi from "@/services/rfq";
import * as ProjectApi from "@/services/project";
import * as HospitalityApi from "@/services/hospitality";
import * as RbacApi from "@/services/rbac";
import * as ProcessApi from "@/services/process";
import * as UnitsApi from "@/services/units";
import * as CmsApi from "@/services/cms";
import * as ProductsApi from "@/services/products";
import CreateRFQ from "./CreateRFQ";

const resolveAll = (mod, value) =>
  Object.values(mod).forEach((fn) => { if (jest.isMockFunction(fn)) fn.mockResolvedValue(value); });

const draft = (contactNumber, mappedHotels = [{ id: 1, rfq_id: 900, hotel_id: 12 }]) => ({
  status: 1,
  data: {
    rfq_id: 900,
    rfq_form_data: {
      rfq_id: 900, title: "Linen restock", is_published: 0, is_tender: 0, comment: "", response_email: "buyer@hotel.test",
      contact_name: "Buyer", contact_number: contactNumber, company_name: "Orchid", terms: [], term_and_condition_files: [],
      bid_end_date: "", rfq_type: "", reverse_auction: 0, project_id: -1, location: "Mumbai",
      hospitality_company_id: 5, hotel_id: 12, department_id: 4, process_id: null, created_by: 7,
    },
    rfq_products: [],
    mappedHotels,
  },
});

const renderPage = () => {
  const store = configureStore({ reducer, middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }) });
  store.dispatch(setUserProfile({ id: 7, name: "Buyer", hospitality_mappings: [] }));
  return render(<Provider store={store}><CreateRFQ /></Provider>);
};

const departmentCallsFor = (hotelId) =>
  RbacApi.getDepartments.mock.calls.filter(([p]) => p && Number(p.hotel_id) === hotelId);

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissionCalls.length = 0;
  [RfqApi, ProjectApi, HospitalityApi, RbacApi, ProcessApi, UnitsApi, CmsApi, ProductsApi].forEach((m) => resolveAll(m, { status: 1, data: [] }));
});

test("a draft with no contact number still selects its mapped hotel (departments + permissions load)", async () => {
  RfqApi.getDraftById.mockResolvedValue(draft(""));
  renderPage();
  await waitFor(() => expect(RfqApi.getDraftById.mock.calls.some(([id]) => Number(id) === 900)).toBe(true));
  await waitFor(() => expect(departmentCallsFor(12).length).toBeGreaterThan(0));
  expect(departmentCallsFor(12)[0][0]).toMatchObject({ hotel_id: 12, resource: "rfq" });
  expect(mockPermissionCalls.some((a) => a.enabled && (a.hotelIds || []).includes(12))).toBe(true);
});

test("a draft with a contact number keeps selecting its mapped hotel", async () => {
  RfqApi.getDraftById.mockResolvedValue(draft("+91-9876543210"));
  renderPage();
  await waitFor(() => expect(departmentCallsFor(12).length).toBeGreaterThan(0));
});

test("an empty mappedHotels list falls back to the draft's hotel_id, as the edit path does", async () => {
  RfqApi.getDraftById.mockResolvedValue(draft("", []));
  renderPage();
  await waitFor(() => expect(departmentCallsFor(12).length).toBeGreaterThan(0));
  expect(mockPermissionCalls.some((a) => a.enabled && (a.hotelIds || []).includes(12))).toBe(true);
});
