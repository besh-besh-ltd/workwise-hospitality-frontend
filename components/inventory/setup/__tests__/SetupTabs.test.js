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
// Rights per call: tests swap mockPermsFor to model admin-only, loading or a
// failed check; every call's hotel ids are recorded.
const mockAllRights = () => ({
  canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false, error: null,
  hasPermission: () => true, refetch: jest.fn(),
});
let mockPermsFor = mockAllRights;
const mockPermCalls = [];
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: (opts) => {
    mockPermCalls.push(opts);
    return mockPermsFor(opts);
  },
}));
jest.mock("@/services/hospitality", () => ({ __esModule: true, getMyHospitalityContexts: jest.fn() }));
let mockCtx = null;
const mockCtxListeners = new Set();
jest.mock("@/utils/hospitalityContext", () => ({
  __esModule: true,
  getStoredHospitalityContext: () => mockCtx,
  setStoredHospitalityContext: jest.fn((c) => {
    mockCtx = c;
    mockCtxListeners.forEach((fn) => fn(c));
  }),
  subscribeHospitalityContext: (fn) => {
    mockCtxListeners.add(fn);
    return () => mockCtxListeners.delete(fn);
  },
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
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { listRootCategories, searchVariants } from "@/services/arc_v2";
import { getMyHospitalityContexts } from "@/services/hospitality";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";
import {
  getStock, listItems, updateItem, getItemUoms, saveItemUoms, addItemBarcode, listHotelItems, saveHotelItem,
  getCompanySettings, saveCompanySettings, getHotelSettings, saveHotelSettings, getCategoryDefaults, saveCategoryDefaults,
  createItem, mapVariantToItem, suggestItems,
} from "@/services/inventory";
import NewItemModal from "../NewItemModal";
import VariantPicker from "../VariantPicker";
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
  mockPermsFor = mockAllRights;
  mockPermCalls.length = 0;
  mockCtx = null;
  mockCtxListeners.clear();
  getMyHospitalityContexts.mockResolvedValue({ status: 1, data: [{ id: 5, name: "Orchid Hotels", hotels: [{ id: 46, name: "Orchid Mumbai" }] }] });
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

  test("a new stock unit reloads the units the server kept", async () => {
    updateItem.mockResolvedValue({ ...RICE, stockUom: "kg" });
    getItemUoms.mockResolvedValueOnce([{ uomLabel: "kg", factorToStock: 0.04 }]).mockResolvedValueOnce([]);
    const dialog = await openRice();
    await within(dialog).findByDisplayValue("kg");
    fireEvent.change(within(dialog).getByLabelText("Stock unit"), { target: { value: "kg" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith(9, { stockUom: "kg" }));
    await waitFor(() => expect(getItemUoms).toHaveBeenCalledTimes(2));
    expect(await within(dialog).findByText("Only kg so far.")).toBeInTheDocument();
  });

  test("an item code clash is shown on the item code field", async () => {
    updateItem.mockRejectedValue(apiError(409, "CONFLICT", { field: "itemCode" }, "Item code SOAP-1 is used by Dish soap"));
    const dialog = await openRice();
    const codeField = within(dialog).getByLabelText("Item code");
    fireEvent.change(codeField, { target: { value: "SOAP-1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save details" }));
    expect(await within(dialog).findByText("Item code SOAP-1 is used by Dish soap")).toHaveAttribute("id", "ie-itemCode-err");
    expect(codeField).toHaveAttribute("aria-describedby", "ie-itemCode-err");
    expect(codeField).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  test("unit factors must be plain numbers of at least 0.000001, each row says what's wrong", async () => {
    const dialog = await openRice();
    await within(dialog).findByDisplayValue("kg");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add unit" }));
    fireEvent.change(within(dialog).getByLabelText("Unit 2"), { target: { value: "case" } });
    fireEvent.change(within(dialog).getByLabelText("bag in one unit 2"), { target: { value: "1e3" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add unit" }));
    fireEvent.change(within(dialog).getByLabelText("Unit 3"), { target: { value: "pinch" } });
    fireEvent.change(within(dialog).getByLabelText("bag in one unit 3"), { target: { value: "0.0000004" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save units" }));

    expect(await within(dialog).findByText("Enter the factor as a plain number, e.g. 12 or 0.5")).toHaveAttribute("id", "ie-uom-1-err");
    expect(within(dialog).getByText("At least 0.000001 bag")).toHaveAttribute("id", "ie-uom-2-err");
    expect(within(dialog).getByLabelText("bag in one unit 3")).toHaveAttribute("aria-describedby", "ie-uom-2-err");
    expect(within(dialog).getByText("Fix the highlighted units, then save.")).toBeInTheDocument();
    expect(saveItemUoms).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("bag in one unit 2"), { target: { value: "0x10" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save units" }));
    expect(await within(dialog).findByText("Enter the factor as a plain number, e.g. 12 or 0.5")).toBeInTheDocument();
    expect(saveItemUoms).not.toHaveBeenCalled();
  });

  test("a barcode pack size below 0.0001 is refused", async () => {
    const dialog = await openRice();
    fireEvent.change(within(dialog).getByLabelText("Barcode"), { target: { value: "8900077" } });
    fireEvent.change(within(dialog).getByLabelText("Pack size (bag per scan)"), { target: { value: "0.00004" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add barcode" }));
    expect(await within(dialog).findByText("Pack size must be at least 0.0001 bag")).toBeInTheDocument();
    expect(addItemBarcode).not.toHaveBeenCalled();
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

const PEPPER = Array.from({ length: 20 }, (_, i) => ({ id: 600 + i, name: `Pepper ${i + 1}` }));

describe("VariantPicker", () => {
  test("searches inside a category; taken variants are marked; a long list says only the first 20 show", async () => {
    searchVariants.mockResolvedValue({ data: { variants: PEPPER, total: 45 } });
    const onPick = jest.fn();
    render(<VariantPicker actionLabel="Map" exclude={new Set([600])} onPick={onPick} />);
    const category = await screen.findByLabelText("Category");
    await waitFor(() => expect(category).toBeEnabled());
    expect(screen.getByLabelText("Search variants")).toBeDisabled();
    fireEvent.change(category, { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Search variants"), { target: { value: "pepper" } });
    expect(await screen.findByRole("button", { name: "Map Pepper 2" })).toBeEnabled();
    await waitFor(() => expect(searchVariants).toHaveBeenLastCalledWith({ category_id: 3, q: "pepper", page: 1, limit: 20 }));
    expect(screen.getByRole("button", { name: "Map Pepper 1" })).toBeDisabled();
    expect(screen.getByRole("note")).toHaveTextContent("Showing the first 20. Refine your search to find others.");
    fireEvent.click(screen.getByRole("button", { name: "Map Pepper 2" }));
    expect(onPick).toHaveBeenCalledWith({ id: 601, name: "Pepper 2" });
  });

  test("a category load failure says so and can be retried", async () => {
    listRootCategories.mockRejectedValueOnce(apiError(500, null, {}, "Server error"));
    render(<VariantPicker actionLabel="Use" />);
    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("option", { name: "Dairy" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(listRootCategories).toHaveBeenCalledTimes(2);
  });

  test("a search failure is shown in the results", async () => {
    searchVariants.mockRejectedValue(apiError(500, null, {}, "Catalogue is down"));
    render(<VariantPicker actionLabel="Use" />);
    const category = await screen.findByLabelText("Category");
    await waitFor(() => expect(category).toBeEnabled());
    fireEvent.change(category, { target: { value: "3" } });
    const results = await screen.findByRole("list", { name: "Matching variants" });
    expect(await within(results).findByText("Catalogue is down")).toBeInTheDocument();
  });
});

describe("NewItemModal", () => {
  const pickPaneer = async () => {
    searchVariants.mockResolvedValue({ data: { variants: [{ id: 701, name: "Paneer 1kg" }], total: 1 } });
    const category = await screen.findByLabelText("Category");
    await waitFor(() => expect(category).toBeEnabled());
    fireEvent.change(category, { target: { value: "3" } });
    fireEvent.click(await screen.findByRole("button", { name: "Use Paneer 1kg" }));
  };

  test("starts an item from a variant, with its stock unit", async () => {
    suggestItems.mockResolvedValue([]);
    createItem.mockResolvedValue({ id: 30, displayName: "Paneer 1kg", stockUom: "kg" });
    const onCreated = jest.fn();
    render(<NewItemModal show onHide={jest.fn()} onCreated={onCreated} />);
    await pickPaneer();
    const form = await screen.findByRole("form", { name: "New item" });
    expect(within(form).getByLabelText("Name")).toHaveValue("Paneer 1kg");
    fireEvent.click(within(form).getByRole("button", { name: /Create item/ }));
    expect(await within(form).findByText("Enter the stock unit")).toBeInTheDocument();
    expect(createItem).not.toHaveBeenCalled();
    fireEvent.change(within(form).getByLabelText("Stock unit"), { target: { value: " kg " } });
    fireEvent.click(within(form).getByRole("button", { name: /Create item/ }));
    await waitFor(() => expect(createItem).toHaveBeenCalledWith({ productVariantId: 701, stockUom: "kg" }));
    expect(onCreated).toHaveBeenCalledWith({ id: 30, displayName: "Paneer 1kg", stockUom: "kg" }, { mapped: false });
  });

  test("a variant that looks like an existing item can be mapped to it instead", async () => {
    suggestItems.mockResolvedValue([{ invItemId: 9, displayName: "Paneer" }]);
    mapVariantToItem.mockResolvedValue({ id: 9, displayName: "Paneer" });
    const onCreated = jest.fn();
    render(<NewItemModal show onHide={jest.fn()} onCreated={onCreated} />);
    await pickPaneer();
    fireEvent.click(await screen.findByRole("button", { name: /Map to Paneer/ }));
    await waitFor(() => expect(mapVariantToItem).toHaveBeenCalledWith(9, 701));
    expect(onCreated).toHaveBeenCalledWith({ id: 9, displayName: "Paneer" }, { mapped: true });
    expect(createItem).not.toHaveBeenCalled();
  });
});

describe("SetupPage", () => {
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

  test("names the company it acts on and asks about rights at that company's hotels only", async () => {
    getStock.mockResolvedValue(TWO_HOTELS);
    getMyHospitalityContexts.mockResolvedValue(TWO_COMPANIES);
    mockCtx = { companyId: 6, companyName: "Plaza Hotels" };
    render(<SetupPage initialTab="items" />);
    expect(await screen.findByText("Plaza Hotels")).toBeInTheDocument();
    expect(screen.getByText(/^For/)).toHaveTextContent("For Plaza Hotels");
    expect(await screen.findByRole("button", { name: "Basmati rice" })).toBeInTheDocument();
    const asked = mockPermCalls.filter((o) => o.enabled).map((o) => o.hotelIds);
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.every((ids) => ids.length === 1 && ids[0] === 47)).toBe(true);
    expect(screen.getByRole("button", { name: "Change company" })).toBeInTheDocument();
  });

  test("with several companies and none chosen, it asks which company first", async () => {
    getStock.mockResolvedValue(TWO_HOTELS);
    getMyHospitalityContexts.mockResolvedValue(TWO_COMPANIES);
    render(<SetupPage initialTab="items" />);
    const chooser = await screen.findByRole("region", { name: "Choose a company" });
    expect(within(chooser).getByText("Choose a company to set up")).toBeInTheDocument();
    expect(listItems).not.toHaveBeenCalled();
    const use = within(chooser).getByRole("button", { name: "Use this company" });
    expect(use).toBeDisabled();
    fireEvent.change(within(chooser).getByLabelText("Company"), { target: { value: "5" } });
    act(() => {
      fireEvent.click(use);
    });
    expect(setStoredHospitalityContext).toHaveBeenCalledWith({ companyId: 5, companyName: "Orchid Hotels", hotelId: null, hotelName: null });
    expect(await screen.findByRole("button", { name: "Basmati rice" })).toBeInTheDocument();
    expect(screen.getByText(/^For/)).toHaveTextContent("For Orchid Hotels");
    expect(screen.queryByRole("region", { name: "Choose a company" })).toBeNull();
  });

  test("Change company reopens the chooser and closes it once one is picked", async () => {
    getStock.mockResolvedValue(TWO_HOTELS);
    getMyHospitalityContexts.mockResolvedValue(TWO_COMPANIES);
    mockCtx = { companyId: 5, companyName: "Orchid Hotels" };
    render(<SetupPage initialTab="items" />);
    fireEvent.click(await screen.findByRole("button", { name: "Change company" }));
    const chooser = await screen.findByRole("region", { name: "Choose a company" });
    fireEvent.change(within(chooser).getByLabelText("Company"), { target: { value: "6" } });
    act(() => {
      fireEvent.click(within(chooser).getByRole("button", { name: "Use this company" }));
    });
    await waitFor(() => expect(screen.queryByRole("region", { name: "Choose a company" })).toBeNull());
    expect(screen.getByText(/^For/)).toHaveTextContent("For Plaza Hotels");
  });

  test("admin rights are not read as update rights", async () => {
    mockPermsFor = () => ({
      ...mockAllRights(), canUpdate: false, canCreate: false, canApprove: false, hasPermission: (a) => a === "admin" || a === "read",
    });
    render(<SetupPage initialTab="items" />);
    fireEvent.click(await screen.findByRole("button", { name: "Basmati rice" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Save details" })).toBeInTheDocument();
    await within(dialog).findByDisplayValue("kg");
    expect(within(dialog).queryByRole("button", { name: "Add unit" })).toBeNull();
    expect(within(dialog).getByLabelText("Unit 1")).toBeDisabled();
    expect(within(dialog).queryByLabelText("Barcode")).toBeNull();
  });

  test("nothing renders read-only while rights are loading", async () => {
    mockPermsFor = () => ({ ...mockAllRights(), loading: true, canUpdate: false, hasPermission: () => false });
    const { container } = render(<SetupPage initialTab="settings" initialHotelId="46" />);
    await waitFor(() => expect(container.querySelector("[aria-busy='true']")).not.toBeNull());
    await act(async () => {});
    expect(screen.queryByLabelText("Allow negative stock")).toBeNull();
    expect(screen.queryByText(/inventory admin/i)).toBeNull();
    expect(getCompanySettings).not.toHaveBeenCalled();
  });

  test("a failed rights check offers a retry", async () => {
    const refetch = jest.fn();
    mockPermsFor = () => ({ ...mockAllRights(), error: "Failed to fetch permissions", canUpdate: false, hasPermission: () => false, refetch });
    render(<SetupPage initialTab="items" />);
    expect(await screen.findByText("Couldn't check your inventory rights")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(refetch).toHaveBeenCalled();
  });

  test("a failed company list offers a retry instead of guessing", async () => {
    getMyHospitalityContexts.mockRejectedValueOnce(apiError(500, null, {}, "Server error"));
    render(<SetupPage initialTab="items" />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load your companies.");
    expect(listItems).not.toHaveBeenCalled();
    fireEvent.click(within(alert).getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("button", { name: "Basmati rice" })).toBeInTheDocument();
  });

  test("setup tabs move with the arrow keys", async () => {
    render(<SetupPage initialTab="items" initialHotelId="46" />);
    const items = await screen.findByRole("tab", { name: "Items", selected: true });
    expect(items).toHaveAttribute("tabIndex", "0");
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("tabIndex", "-1");
    items.focus();
    fireEvent.keyDown(items, { key: "ArrowLeft" });
    const opening = screen.getByRole("tab", { name: "Opening stock" });
    expect(opening).toHaveAttribute("aria-selected", "true");
    expect(opening).toHaveFocus();
  });

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
