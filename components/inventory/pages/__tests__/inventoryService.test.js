// Wire-level contract for services/inventory: method, path, body/params,
// multipart shape, and the site-rep token client's isolation from the buyer JWT.

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("axios", () => {
  const client = { get: jest.fn(), post: jest.fn(), interceptors: { response: { use: jest.fn() } } };
  return { __esModule: true, default: { create: jest.fn(() => client), __client: client } };
});

import axios from "axios";
import mockShared from "@/lib/axios";
import * as inv from "@/services/inventory";

const mockToken = axios.__client;
const createArgs = axios.create.mock.calls.map((c) => c[0]); // captured at import time

beforeEach(() => {
  [...Object.values(mockShared), mockToken.get, mockToken.post].forEach((f) => f.mockReset());
  Object.values(mockShared).forEach((f) => f.mockResolvedValue({ status: 1, data: { ok: true } }));
  mockToken.get.mockResolvedValue({ status: 1, data: { ok: true } });
  mockToken.post.mockResolvedValue({ status: 1, data: { ok: true } });
});

const file = new File(["x"], "a.png", { type: "image/png" });
const B = "/inventory";

// [name, args, method, url, expected body or undefined, expected params]
const JSON_CASES = [
  ["getPoDeliveries", [7], "get", `${B}/po/7/deliveries`, undefined, {}],
  ["savePoDeliveryPlan", [7, [{ phaseNo: 1 }]], "put", `${B}/po/7/deliveries`, { deliveries: [{ phaseNo: 1 }] }],
  ["patchDeliveryDueDate", [7, 3, "2026-11-01"], "patch", `${B}/po/7/deliveries/3`, { dueDate: "2026-11-01" }],
  ["shortClosePo", [7, { reasonCode: "other" }], "post", `${B}/po/7/short-close`, { reasonCode: "other" }],
  ["reopenShortClose", [7, { deliveryLineIds: [1] }], "post", `${B}/po/7/short-close/reopen`, { deliveryLineIds: [1] }],
  ["getAwaitingDeliveries", [{ hotelId: 2, filter: "overdue", page: 3 }], "get", `${B}/receive/awaiting`, undefined, { hotelId: 2, filter: "overdue", page: 3 }],
  ["getReceiveContext", [7, 2], "get", `${B}/receive/po/7`, undefined, { hotelId: 2 }],
  ["createGrn", [{ poId: 7 }], "post", `${B}/grn`, { poId: 7 }],
  ["updateGrn", [9, { remarks: "r" }], "put", `${B}/grn/9`, { remarks: "r" }],
  ["postGrn", [9, "evt-1"], "post", `${B}/grn/9/post`, { clientEventId: "evt-1" }],
  ["discardGrn", [9], "delete", `${B}/grn/9`],
  ["getGrn", [9], "get", `${B}/grn/9`, undefined, {}],
  ["listGrns", [{ status: "posted" }], "get", `${B}/grn`, undefined, { status: "posted" }],
  ["reverseGrn", [9, { reason: "x", lines: "all" }], "post", `${B}/grn/9/reverse`, { reason: "x", lines: "all" }],
  ["deleteGrnAttachment", [9, 4], "delete", `${B}/grn/9/attachments/4`],
  ["getGrnPdf", [9], "get", `${B}/grn/9/pdf`, undefined, {}],
  ["createRtv", [{ grnId: 9 }], "post", `${B}/rtv`, { grnId: 9 }],
  ["dispatchRtv", [5, { challanNo: "C1" }], "post", `${B}/rtv/5/dispatch`, { challanNo: "C1" }],
  ["closeRtv", [5, { creditNoteRef: "CN" }], "post", `${B}/rtv/5/close`, { creditNoteRef: "CN" }],
  ["cancelRtv", [5], "post", `${B}/rtv/5/cancel`, undefined],
  ["getRtv", [5], "get", `${B}/rtv/5`, undefined, {}],
  ["getVendorPoDeliveries", [7], "get", `${B}/vendor/po/7/deliveries`, undefined, {}],
  ["createDispatch", [7, { challanNo: "C" }], "post", `${B}/vendor/po/7/dispatches`, { challanNo: "C" }],
  ["cancelDispatch", [7, 6], "post", `${B}/vendor/po/7/dispatches/6/cancel`, undefined],
  ["listItems", [{ search: "rice" }], "get", `${B}/items`, undefined, { search: "rice" }],
  ["createItem", [{ stockUom: "kg" }], "post", `${B}/items`, { stockUom: "kg" }],
  ["updateItem", [3, { displayName: "n" }], "put", `${B}/items/3`, { displayName: "n" }],
  ["mapVariantToItem", [3, 11], "post", `${B}/items/3/variants`, { productVariantId: 11 }],
  ["suggestItems", [11], "get", `${B}/items/suggest`, undefined, { productVariantId: 11 }],
  ["getItemUoms", [3], "get", `${B}/items/3/uoms`, undefined, {}],
  ["saveItemUoms", [3, [{ uomLabel: "box", factorToStock: 12 }]], "put", `${B}/items/3/uoms`, { uoms: [{ uomLabel: "box", factorToStock: 12 }] }],
  ["addItemBarcode", [3, { code: "123" }], "post", `${B}/items/3/barcodes`, { code: "123" }],
  ["deleteItemBarcode", [3, 8], "delete", `${B}/items/3/barcodes/8`],
  ["listHotelItems", [{ hotelId: 2 }], "get", `${B}/hotel-items`, undefined, { hotelId: 2 }],
  ["saveHotelItem", [2, 3, { minQty: 1 }], "put", `${B}/hotel-items/2/3`, { minQty: 1 }],
  ["getCompanySettings", [], "get", `${B}/settings/company`, undefined, {}],
  ["saveCompanySettings", [{ a: 1 }], "put", `${B}/settings/company`, { a: 1 }],
  ["getHotelSettings", [2], "get", `${B}/settings/hotel/2`, undefined, {}],
  ["saveHotelSettings", [2, { docCode: "46" }], "put", `${B}/settings/hotel/2`, { docCode: "46" }],
  ["getCategoryDefaults", [], "get", `${B}/category-defaults`, undefined, {}],
  ["saveCategoryDefaults", [[{ categoryId: 1 }]], "put", `${B}/category-defaults`, { rows: [{ categoryId: 1 }] }],
  ["postOpeningStock", [2, { rows: [], clientEventId: "e" }], "post", `${B}/opening/2/post`, { rows: [], clientEventId: "e" }],
  ["getStock", [{ hotelId: 2, belowReorder: true }], "get", `${B}/stock`, undefined, { hotelId: 2, belowReorder: true }],
  ["getStockItem", [2, 3], "get", `${B}/stock/2/items/3`, undefined, {}],
  ["getStockLedger", [2, 3, { page: 2 }], "get", `${B}/stock/2/items/3/ledger`, undefined, { page: 2 }],
  ["postOut", [{ hotelId: 2 }], "post", `${B}/out`, { hotelId: 2 }],
  ["listOut", [{ docType: "OUT" }], "get", `${B}/out`, undefined, { docType: "OUT" }],
  ["getOut", [4], "get", `${B}/out/4`, undefined, {}],
  ["createAdjustment", [{ reasonCode: "WASTAGE" }], "post", `${B}/adjustments`, { reasonCode: "WASTAGE" }],
  ["approveAdjustment", [4], "post", `${B}/adjustments/4/approve`, undefined],
  ["rejectAdjustment", [4, "no"], "post", `${B}/adjustments/4/reject`, { reason: "no" }],
  ["listAdjustments", [{ status: "pending" }], "get", `${B}/adjustments`, undefined, { status: "pending" }],
  ["getAdjustment", [4], "get", `${B}/adjustments/4`, undefined, {}],
  ["startCount", [{ scope: "FULL" }], "post", `${B}/counts`, { scope: "FULL" }],
  ["getCount", [4], "get", `${B}/counts/4`, undefined, {}],
  ["saveCountLines", [4, [{ invItemId: 1 }]], "put", `${B}/counts/4/lines`, { lines: [{ invItemId: 1 }] }],
  ["submitCount", [4], "post", `${B}/counts/4/submit`, undefined],
  ["approveCount", [4, { 1: "r" }], "post", `${B}/counts/4/approve`, { reasons: { 1: "r" } }],
  ["cancelCount", [4], "post", `${B}/counts/4/cancel`, undefined],
  ["listCounts", [{ hotelId: 2 }], "get", `${B}/counts`, undefined, { hotelId: 2 }],
  ["getInventoryOverview", [{ hotelId: 2 }], "get", `${B}/overview`, undefined, { hotelId: 2 }],
  ["resolveScan", ["8901", "po:7"], "get", `${B}/scan/resolve`, undefined, { code: "8901", context: "po:7" }],
  ["resolveShortLink", ["i", 12], "get", `${B}/s/resolve`, undefined, { t: "i", id: 12 }],
  ["getReorder", [2], "get", `${B}/reorder`, undefined, { hotelId: 2 }],
  ["createReorderMrDraft", [{ hotelId: 2 }], "post", `${B}/reorder/mr-draft`, { hotelId: 2 }],
  ["printItemLabels", [{ layout: "A4_65" }], "post", `${B}/labels/items`, { layout: "A4_65" }],
  ["printGrnLabels", [9, { layout: "A4_24" }], "post", `${B}/labels/grn/9`, { layout: "A4_24" }],
  ["revokeSiteRep", [7], "post", `${B}/po/7/site-rep/revoke`, undefined],
];

describe("buyer calls use the shared instance with the contract method and path", () => {
  // Pad every row to 6 cells: jest treats a callback parameter with no matching
  // cell as a `done` callback and would wait on it forever.
  test.each(JSON_CASES.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5]]))("%s", async (name, args, method, url, body, params) => {
    const out = await inv[name](...args);
    expect(out).toEqual({ ok: true }); // unwrapped res.data
    expect(mockShared[method]).toHaveBeenCalledTimes(1);
    const call = mockShared[method].mock.calls[0];
    expect(call[0]).toBe(url);
    if (method === "get") {
      expect(call[1].params).toEqual(params);
    } else if (method !== "delete") {
      expect(call[1]).toEqual(body);
    }
    expect(mockToken.get).not.toHaveBeenCalled();
    expect(mockToken.post).not.toHaveBeenCalled();
  });
});

describe("multipart uploads", () => {
  const formOf = (data) => {
    expect(data).toBeInstanceOf(FormData);
    return data;
  };

  test("uploadGrnAttachment sends file + kind, without forcing a Content-Type", async () => {
    await inv.uploadGrnAttachment(9, file, "challan");
    const [url, data, cfg] = mockShared.post.mock.calls[0];
    expect(url).toBe(`${B}/grn/9/attachments`);
    expect(formOf(data).get("file").name).toBe("a.png");
    expect(data.get("kind")).toBe("challan");
    expect(cfg.headers["Content-Type"]).toBe(false);
  });

  test("previewOpeningStock sends file only", async () => {
    await inv.previewOpeningStock(2, file);
    const [url, data] = mockShared.post.mock.calls[0];
    expect(url).toBe(`${B}/opening/2/preview`);
    expect(formOf(data).get("file").name).toBe("a.png");
    expect(data.has("kind")).toBe(false);
  });

  test("uploadTokenGrnAttachment sends file + kind on the token client", async () => {
    await inv.uploadTokenGrnAttachment("tok", 9, file, "photo");
    const [url, data, cfg] = mockToken.post.mock.calls[0];
    expect(url).toBe(`${B}/token/grn/9/attachments`);
    expect(formOf(data).get("file").name).toBe("a.png");
    expect(data.get("kind")).toBe("photo");
    expect(cfg.headers["X-Receive-Token"]).toBe("tok");
    expect(cfg.headers["Content-Type"]).toBe(false);
    expect(mockShared.post).not.toHaveBeenCalled();
  });
});

describe("site-rep token client is isolated from the buyer session", () => {
  test("is created with only the API base URL (no buyer JWT, no shared interceptors)", () => {
    expect(createArgs).toHaveLength(1);
    expect(Object.keys(createArgs[0]).sort()).toEqual(["baseURL", "timeout"]);
    expect(createArgs[0].headers).toBeUndefined();
    expect(mockToken.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  const assertTokenOnly = (cfg) => {
    expect(cfg.headers["X-Receive-Token"]).toBe("tok");
    const names = Object.keys(cfg.headers).map((h) => h.toLowerCase());
    expect(names).not.toContain("authorization");
  };

  test("getTokenReceiveContext", async () => {
    const out = await inv.getTokenReceiveContext("tok");
    expect(out).toEqual({ ok: true });
    const [url, cfg] = mockToken.get.mock.calls[0];
    expect(url).toBe(`${B}/token/receive-context`);
    assertTokenOnly(cfg);
    expect(mockShared.get).not.toHaveBeenCalled();
  });

  test("postTokenGrn", async () => {
    await inv.postTokenGrn("tok", { lines: [] });
    const [url, body, cfg] = mockToken.post.mock.calls[0];
    expect(url).toBe(`${B}/token/grn`);
    expect(body).toEqual({ lines: [] });
    assertTokenOnly(cfg);
    expect(mockShared.post).not.toHaveBeenCalled();
  });

  test("uploadTokenGrnAttachment carries no Authorization", async () => {
    await inv.uploadTokenGrnAttachment("tok", 9, file, "photo");
    assertTokenOnly(mockToken.post.mock.calls[0][2]);
  });
});

test("explicit params win over config.params in the get helper", async () => {
  await inv.getReceiveContext(7, 2);
  expect(mockShared.get.mock.calls[0][1]).toEqual({ params: { hotelId: 2 } });
});
