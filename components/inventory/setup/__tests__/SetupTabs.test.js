// Setup tabs: items (details, units, barcodes), category defaults, hotel
// levels and settings. Each save sends only what the screen changed.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, pathname: "/dashboard/buyer/inventory/setup", push: jest.fn(), replace: mockReplace }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  Object.assign(toast, { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), dismiss: jest.fn() });
  return { __esModule: true, toast };
});
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false, hasPermission: () => true,
  }),
}));
jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  listRootCategories: jest.fn(),
  searchVariants: jest.fn(),
}));
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

const mockReplace = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { listRootCategories } from "@/services/arc_v2";
import {
  getStock, listItems, updateItem, getItemUoms, saveItemUoms, addItemBarcode, listHotelItems, saveHotelItem,
  getCompanySettings, saveCompanySettings, getHotelSettings, saveHotelSettings, getCategoryDefaults, saveCategoryDefaults,
} from "@/services/inventory";
import ItemsTab from "../ItemsTab";
import CategoryDefaultsTab from "../CategoryDefaultsTab";
import HotelLevelsTab from "../HotelLevelsTab";
import SettingsTab from "../SettingsTab";
import SetupPage from "../SetupPage";

const RICE = {
  id: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", trackExpiry: false, minShelfLifeDays: null,
  overReceiptTolerancePct: null, isActive: true, variants: [{ productVariantId: 501, name: "Basmati 25kg" }],
  barcodes: [{ id: 1, code: "8900001", packFactor: 1, source: "MANUFACTURER" }],
};

const apiError = (status, code, details, message = "Refused") => {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { status: 0, message, code, details } };
  return err;
};

beforeEach(() => {
  jest.clearAllMocks();
  getStock.mockResolvedValue({ hotelId: 46, stockStartedAt: null, hotels: [{ id: 46, name: "Orchid Mumbai" }], rows: [], total: 0 });
  listItems.mockResolvedValue({ rows: [RICE], total: 1 });
  getItemUoms.mockResolvedValue([{ uomLabel: "kg", factorToStock: 0.04 }]);
  listRootCategories.mockResolvedValue({ data: { categories: [{ id: 3, title: "Dairy" }, { id: 5, title: "Housekeeping" }] } });
  getCompanySettings.mockResolvedValue({
    overReceiptTolerancePct: 0, allowNegativeStock: false, includeGstInCost: false, adjustmentAutoApproveLimit: 0, countFreeze: true,
  });
  getHotelSettings.mockResolvedValue({
    hotelId: 46, docCode: null, includeGstInCost: null, effectiveDocCode: "46", effectiveIncludeGstInCost: false, stockStartedAt: null,
  });
});

describe("ItemsTab", () => {
  const openRice = async () => {
    render(<ItemsTab canAdmin canUpdate />);
    fireEvent.click(await screen.findByRole("button", { name: "Basmati rice" }));
    return screen.findByRole("dialog");
  };

  test("saves only the item details that changed", async () => {
    updateItem.mockResolvedValue({ ...RICE, trackExpiry: true });
    const dialog = await openRice();
    expect(listItems).toHaveBeenCalledWith({ page: 1 });
    fireEvent.click(within(dialog).getByLabelText("Tracks expiry"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(9, { trackExpiry: true }));
    expect(toast.success).toHaveBeenCalled();
  });

  test("units are saved as a whole set with their factors", async () => {
    saveItemUoms.mockResolvedValue([{ uomLabel: "kg", factorToStock: 0.04 }, { uomLabel: "pouch", factorToStock: 0.2 }]);
    const dialog = await openRice();
    await within(dialog).findByDisplayValue("kg");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add unit" }));
    fireEvent.change(within(dialog).getByLabelText("Unit 2"), { target: { value: "pouch" } });
    fireEvent.change(within(dialog).getByLabelText("bag in one unit 2"), { target: { value: "0.2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save units" }));
    await waitFor(() =>
      expect(saveItemUoms).toHaveBeenCalledWith(9, [
        { uomLabel: "kg", factorToStock: 0.04 },
        { uomLabel: "pouch", factorToStock: 0.2 },
      ])
    );
  });

  test("adds a barcode with its pack size", async () => {
    addItemBarcode.mockResolvedValue({ id: 2, code: "8900012", packFactor: 12, source: "MANUFACTURER" });
    const dialog = await openRice();
    expect(within(dialog).getByText("8900001")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Barcode"), { target: { value: "8900012" } });
    fireEvent.change(within(dialog).getByLabelText("Pack size (bag per scan)"), { target: { value: "12" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add barcode" }));
    await waitFor(() =>
      expect(addItemBarcode).toHaveBeenCalledWith(9, { code: "8900012", packFactor: 12, source: "MANUFACTURER" })
    );
    expect(await within(dialog).findByText("8900012")).toBeInTheDocument();
  });

  test("a barcode already in use shows the server's message", async () => {
    addItemBarcode.mockRejectedValue(apiError(409, "CONFLICT", { field: "code" }, "This barcode belongs to Dish soap"));
    const dialog = await openRice();
    fireEvent.change(within(dialog).getByLabelText("Barcode"), { target: { value: "8900099" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add barcode" }));
    expect(await within(dialog).findByText("This barcode belongs to Dish soap")).toBeInTheDocument();
  });
});

describe("CategoryDefaultsTab", () => {
  test("the whole set is saved, including an added category", async () => {
    getCategoryDefaults.mockResolvedValue({
      rows: [{ categoryId: 3, categoryName: "Dairy", trackExpiry: true, defaultMarkOutOnArrival: false }],
    });
    saveCategoryDefaults.mockImplementation((rows) => Promise.resolve({ rows }));
    render(<CategoryDefaultsTab canAdmin />);
    fireEvent.click(await screen.findByLabelText("Mark out on arrival for Dairy"));
    await waitFor(() => expect(screen.getByLabelText("Add a category")).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Add a category"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByLabelText("Tracks expiry for Housekeeping")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save category defaults" }));
    await waitFor(() =>
      expect(saveCategoryDefaults).toHaveBeenCalledWith([
        { categoryId: 3, trackExpiry: true, defaultMarkOutOnArrival: true },
        { categoryId: 5, trackExpiry: false, defaultMarkOutOnArrival: false },
      ])
    );
  });
});

describe("HotelLevelsTab", () => {
  test("saves one row's levels", async () => {
    listHotelItems.mockResolvedValue({
      rows: [{ invItemId: 9, displayName: "Basmati rice", stockUom: "bag", minQty: 2, reorderLevel: 4, maxQty: 10, binLabel: "A-01" }],
      total: 1,
    });
    saveHotelItem.mockResolvedValue({ invItemId: 9, minQty: 2, reorderLevel: 6, maxQty: 10, binLabel: "A-01" });
    render(<HotelLevelsTab hotelId={46} canUpdate />);
    const input = await screen.findByLabelText("Reorder level of Basmati rice");
    expect(listHotelItems).toHaveBeenCalledWith({ hotelId: 46, page: 1 });
    fireEvent.change(input, { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Basmati rice" }));
    await waitFor(() =>
      expect(saveHotelItem).toHaveBeenCalledWith(46, 9, { minQty: 2, reorderLevel: 6, maxQty: 10, binLabel: "A-01" })
    );
  });

  test("levels out of order are refused on the row", async () => {
    listHotelItems.mockResolvedValue({
      rows: [{ invItemId: 9, displayName: "Basmati rice", stockUom: "bag", minQty: 2, reorderLevel: 4, maxQty: 10, binLabel: null }],
      total: 1,
    });
    render(<HotelLevelsTab hotelId={46} canUpdate />);
    fireEvent.change(await screen.findByLabelText("Max qty of Basmati rice"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Basmati rice" }));
    expect(await screen.findByText(/Reorder level can't be more than the max qty/)).toBeInTheDocument();
    expect(saveHotelItem).not.toHaveBeenCalled();
  });
});

describe("SettingsTab", () => {
  test("company settings send only what changed", async () => {
    saveCompanySettings.mockResolvedValue({
      overReceiptTolerancePct: 0, allowNegativeStock: true, includeGstInCost: false, adjustmentAutoApproveLimit: 5000, countFreeze: true,
    });
    render(<SettingsTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    fireEvent.click(await screen.findByLabelText("Allow negative stock"));
    fireEvent.change(screen.getByLabelText("Adjustment auto-approve limit (₹)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save company settings" }));
    await waitFor(() =>
      expect(saveCompanySettings).toHaveBeenCalledWith({ allowNegativeStock: true, adjustmentAutoApproveLimit: 5000 })
    );
  });

  test("hotel document code: saved, and a clash is shown on the field", async () => {
    saveHotelSettings.mockRejectedValueOnce(
      apiError(409, "CONFLICT", { field: "docCode" }, "The document code MUM is used by another hotel")
    );
    render(<SettingsTab hotelId={46} hotelName="Orchid Mumbai" canAdmin />);
    expect(await screen.findByText(/Stock not started yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Document code"), { target: { value: "MUM" } });
    fireEvent.click(screen.getByRole("button", { name: "Save hotel settings" }));
    await waitFor(() => expect(saveHotelSettings).toHaveBeenCalledWith(46, { docCode: "MUM" }));
    expect(await screen.findByText("The document code MUM is used by another hotel")).toBeInTheDocument();
  });

  test("without inventory.admin the settings are read-only", async () => {
    render(<SettingsTab hotelId={46} hotelName="Orchid Mumbai" canAdmin={false} />);
    expect(await screen.findByLabelText("Allow negative stock")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save company settings" })).toBeNull();
  });
});

describe("SetupPage", () => {
  test("opens the tab from the URL and switches tabs", async () => {
    render(<SetupPage initialTab="settings" initialHotelId="46" />);
    expect(await screen.findByRole("tab", { name: "Settings", selected: true })).toBeInTheDocument();
    await screen.findByLabelText("Allow negative stock");
    fireEvent.click(screen.getByRole("tab", { name: "Opening stock" }));
    expect(await screen.findByLabelText("Opening stock file")).toBeInTheDocument();
    expect(mockReplace).toHaveBeenLastCalledWith(
      "/dashboard/buyer/inventory/setup?tab=opening&hotelId=46", undefined, { shallow: true }
    );
  });
});
