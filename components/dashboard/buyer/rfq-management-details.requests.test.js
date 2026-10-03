// RFQ detail page wrapper — opening a stage must not refetch the RFQ.
//
// ViewRFQ's stage navigator does router.replace({ ...query, stage }, { shallow })
// on every click. The wrapper's fetch effect depended on `router`, which is a
// new object after every route change — shallow or not — so each stage click
// re-downloaded the whole RFQ (getRfqById with vendors). It now depends on the
// RFQ id alone.

const mockRouter = { query: { id: "720" }, pathname: "/dashboard/buyer/rfq-management-details", push: jest.fn(), replace: jest.fn() };
// A fresh object per render, exactly like Next's router after a route change.
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ ...mockRouter }) }));
jest.mock("react-redux", () => ({ __esModule: true, useSelector: (fn) => fn({ userProfile: { id: 4 } }) }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("./manageRFQ/ViewRFQ", () => ({ __esModule: true, default: () => <div>view</div> }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, loading: false }),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  closeRFQ: jest.fn(),
  withdrawPublish: jest.fn(),
}));

import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import RfqManagementDetails from "./rfq-management-details";

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.query = { id: "720" };
  getRFQById.mockResolvedValue({ data: { id: 720, hotel_id: 30, created_by: 4 } });
});

it("changing stage does not refetch the RFQ", async () => {
  const { rerender } = render(<RfqManagementDetails />);
  await waitFor(() => expect(getRFQById).toHaveBeenCalledTimes(1));

  mockRouter.query = { id: "720", stage: "technical" };
  rerender(<RfqManagementDetails />);
  mockRouter.query = { id: "720", stage: "negotiation-award" };
  rerender(<RfqManagementDetails />);
  await act(async () => {});

  expect(getRFQById).toHaveBeenCalledTimes(1);
});

it("navigating to a different RFQ does fetch it", async () => {
  const { rerender } = render(<RfqManagementDetails />);
  await waitFor(() => expect(getRFQById).toHaveBeenCalledTimes(1));

  mockRouter.query = { id: "721" };
  rerender(<RfqManagementDetails />);

  await waitFor(() => expect(getRFQById).toHaveBeenCalledTimes(2));
  expect(getRFQById.mock.calls[1][0]).toBe("721");
});
