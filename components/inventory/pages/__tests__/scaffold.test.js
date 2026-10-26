// A4 scaffolding: the Inventory sidebar section is permission-gated, and
// services/inventory exposes every function the API contract names.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({ getPendingApprovalCounts: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: {
    getStorage: jest.fn((key) => (key === "token" ? "t" : key === "current-user-type" ? "buyer" : null)),
    setStorage: jest.fn(),
  },
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: jest.fn(() => null),
  subscribeHospitalityContext: jest.fn(() => () => {}),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    pathname: "/dashboard/buyer",
    query: {},
    push: jest.fn(),
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (sel) => sel({ userProfile: { is_hospitality: 1 } }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ApprovalIndicatorsProvider } from "@/hooks/usePendingApprovalIndicators";
import { __setRealtimeLoaderForTests } from "@/lib/realtimeSocket";
import SideNav from "@/components/layout/DashboardShell/SideNav";
import MobileNav from "@/components/layout/DashboardShell/MobileNav";
import * as inventory from "@/services/inventory";

__setRealtimeLoaderForTests(() => new Promise(() => {}));

const user = { name: "Asha Menon" };
const renderSide = (navGrants) =>
  render(
    <ApprovalIndicatorsProvider enabled>
      <SideNav user={user} currentUserType="buyer" navGrants={navGrants} />
    </ApprovalIndicatorsProvider>
  );

describe("sidebar Inventory section", () => {
  test("sidebar shows Inventory section to a user with inventory.read", () => {
    renderSide({ inventory: ["read"] });
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    for (const label of ["Overview", "Stock", "Mark out", "Counts", "Adjustments", "Reorder", "Setup", "Labels"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // grn-keyed items need grn.read, which this user lacks
    expect(screen.queryByText("Receive")).toBeNull();
    expect(screen.queryByText("GRNs")).toBeNull();
  });

  test("a grn.read-only user sees the section with Overview, Receive and GRNs", () => {
    renderSide({ grn: ["read"] });
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    // The overview page and API serve grn.read too (M-6).
    expect(screen.getByRole("link", { name: /Overview/ })).toHaveAttribute("href", "/dashboard/buyer/inventory");
    expect(screen.getByText("Receive")).toBeInTheDocument();
    expect(screen.getByText("GRNs")).toBeInTheDocument();
    expect(screen.queryByText("Stock")).toBeNull();
  });

  test("hidden without inventory.read or grn.read, and while grants load", () => {
    const { unmount } = renderSide({ inventory: ["create"], grn: [] });
    expect(screen.queryByText("Inventory")).toBeNull();
    unmount();
    renderSide(null);
    expect(screen.queryByText("Inventory")).toBeNull();
  });

  test("mobile drawer applies the same gating", () => {
    const { unmount } = render(
      <ApprovalIndicatorsProvider enabled>
        <MobileNav open onClose={() => {}} user={user} currentUserType="buyer" navGrants={{ inventory: ["read"] }} />
      </ApprovalIndicatorsProvider>
    );
    expect(screen.getByText("Stock")).toBeInTheDocument();
    unmount();
    render(
      <ApprovalIndicatorsProvider enabled>
        <MobileNav open onClose={() => {}} user={user} currentUserType="buyer" navGrants={null} />
      </ApprovalIndicatorsProvider>
    );
    expect(screen.queryByText("Stock")).toBeNull();
  });
});

const CONTRACT_FUNCTIONS = [
  // Plan
  "getPoDeliveries", "savePoDeliveryPlan", "patchDeliveryDueDate", "shortClosePo", "reopenShortClose",
  // Receive
  "getAwaitingDeliveries", "getReceiveContext", "createGrn", "updateGrn", "postGrn", "discardGrn", "getGrn",
  "listGrns", "reverseGrn", "uploadGrnAttachment", "deleteGrnAttachment", "getGrnPdf",
  // RTV
  "createRtv", "dispatchRtv", "closeRtv", "cancelRtv", "getRtv",
  // Vendor
  "getVendorPoDeliveries", "createDispatch", "cancelDispatch",
  // Setup
  "listItems", "createItem", "updateItem", "mapVariantToItem", "suggestItems", "getItemUoms", "saveItemUoms",
  "addItemBarcode", "deleteItemBarcode", "listHotelItems", "saveHotelItem", "getCompanySettings",
  "saveCompanySettings", "getHotelSettings", "saveHotelSettings", "getCategoryDefaults", "saveCategoryDefaults",
  "previewOpeningStock", "postOpeningStock",
  // Stock
  "getStock", "getStockItem", "getStockLedger", "postOut", "listOut", "getOut", "createAdjustment",
  "approveAdjustment", "rejectAdjustment", "listAdjustments", "getAdjustment", "startCount", "getCount",
  "saveCountLines", "submitCount", "approveCount", "cancelCount", "listCounts", "getInventoryOverview",
  // Scan / labels / reorder
  "resolveScan", "printItemLabels", "printGrnLabels", "resolveShortLink", "getReorder", "createReorderMrDraft",
  // Token
  "getTokenReceiveContext", "postTokenGrn", "uploadTokenGrnAttachment", "revokeSiteRep",
];

test("services/inventory exports every contract function", () => {
  for (const name of CONTRACT_FUNCTIONS) {
    expect(typeof inventory[name]).toBe("function");
  }
});
