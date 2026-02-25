/**
 * Mock the default export (axiosInstance) from @/lib/axios
 * and the default export (axiosFormData) from @/lib/axiosFormData.
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/axiosFormData", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: { create: jest.fn(), post: jest.fn(), get: jest.fn() },
  create: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
}));

import axiosInstance from "@/lib/axios";
import {
  getTerms,
  vendorTypes,
  createRfq,
  getDraftData,
  getDraftById,
  saveDraft,
  getDraftRFQs,
  bulkSearchVendorsByCategory,
} from "@/services/rfq";

const mockGet = axiosInstance.get;
const mockPost = axiosInstance.post;

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------
// getTerms
// ---------------------------------------------------------------
describe("getTerms", () => {
  it("resolves with the response from GET /rfq/get-terms", async () => {
    const mockResponse = { status: 1, data: [{ id: 1, term: "Net 30" }] };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await getTerms();

    expect(mockGet).toHaveBeenCalledWith("/rfq/get-terms");
    expect(result).toEqual(mockResponse);
  });

  it("rejects with { message: error } when the request fails", async () => {
    const networkError = new Error("Network Error");
    mockGet.mockRejectedValueOnce(networkError);

    await expect(getTerms()).rejects.toEqual({ message: networkError });
  });
});

// ---------------------------------------------------------------
// vendorTypes
// ---------------------------------------------------------------
describe("vendorTypes", () => {
  it("resolves with the response from GET /rfq/vendor-types/", async () => {
    const mockResponse = { status: 1, data: [{ id: 1, name: "Manufacturer" }] };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await vendorTypes();

    expect(mockGet).toHaveBeenCalledWith("/rfq/vendor-types/");
    expect(result).toEqual(mockResponse);
  });

  it("rejects with { message: error } when the request fails", async () => {
    const err = new Error("Server Error");
    mockGet.mockRejectedValueOnce(err);

    await expect(vendorTypes()).rejects.toEqual({ message: err });
  });
});

// ---------------------------------------------------------------
// createRfq
// ---------------------------------------------------------------
describe("createRfq", () => {
  it("resolves with the response from POST /rfq/create", async () => {
    const payload = { title: "New RFQ", products: [1, 2] };
    const mockResponse = { status: 1, data: { rfq_id: 42 } };
    mockPost.mockResolvedValueOnce(mockResponse);

    const result = await createRfq(payload);

    expect(mockPost).toHaveBeenCalledWith("/rfq/create", payload);
    expect(result).toEqual(mockResponse);
  });

  it("rejects with { message: error } when the request fails", async () => {
    const err = new Error("Validation Error");
    mockPost.mockRejectedValueOnce(err);

    await expect(createRfq({})).rejects.toEqual({ message: err });
  });
});

// ---------------------------------------------------------------
// getDraftData
// ---------------------------------------------------------------
describe("getDraftData", () => {
  it("resolves with GET /rfq/draft when fresh is false (default)", async () => {
    const mockResponse = { status: 1, data: { draft_id: 1 } };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await getDraftData();

    expect(mockGet).toHaveBeenCalledWith("/rfq/draft");
    expect(result).toEqual(mockResponse);
  });

  it("appends ?fresh=true when fresh parameter is true", async () => {
    const mockResponse = { status: 1, data: { draft_id: 2 } };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await getDraftData(true);

    expect(mockGet).toHaveBeenCalledWith("/rfq/draft?fresh=true");
    expect(result).toEqual(mockResponse);
  });

  it("rejects with { message: error } when the request fails", async () => {
    const err = new Error("Timeout");
    mockGet.mockRejectedValueOnce(err);

    await expect(getDraftData()).rejects.toEqual({ message: err });
  });
});

// ---------------------------------------------------------------
// getDraftById
// ---------------------------------------------------------------
describe("getDraftById", () => {
  it("resolves with GET /rfq/get-draft-by-id/:id passing sheetId as param", async () => {
    const mockResponse = { status: 1, data: { id: 99, products: [] } };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await getDraftById(99, "sheet-abc");

    expect(mockGet).toHaveBeenCalledWith(
      "/rfq/get-draft-by-id/99",
      { params: { sheetId: "sheet-abc" } }
    );
    expect(result).toEqual(mockResponse);
  });

  it("rejects with enhanced error object containing message and status", async () => {
    const err = {
      response: {
        data: { message: "Draft not found", status: 3 },
      },
    };
    mockGet.mockRejectedValueOnce(err);

    await expect(getDraftById(999, null)).rejects.toEqual({
      message: "Draft not found",
      status: 3,
    });
  });
});

// ---------------------------------------------------------------
// saveDraft
// ---------------------------------------------------------------
describe("saveDraft", () => {
  it("resolves with the response from POST /rfq/save-draft", async () => {
    const payload = { rfq_id: 1, products: [{ id: 10, qty: 5 }] };
    const mockResponse = { status: 1, message: "Draft saved" };
    mockPost.mockResolvedValueOnce(mockResponse);

    const result = await saveDraft(payload);

    expect(mockPost).toHaveBeenCalledWith("/rfq/save-draft", payload);
    expect(result).toEqual(mockResponse);
  });

  it("rejects with { message: error } when the request fails", async () => {
    const err = new Error("Database error");
    mockPost.mockRejectedValueOnce(err);

    await expect(saveDraft({})).rejects.toEqual({ message: err });
  });
});

// ---------------------------------------------------------------
// getDraftRFQs
// ---------------------------------------------------------------
describe("getDraftRFQs", () => {
  it("resolves with the response from POST /rfq/get-draft-rfqs", async () => {
    const payload = { page: 1, limit: 10 };
    const mockResponse = { status: 1, data: [{ rfq_id: 1 }, { rfq_id: 2 }] };
    mockPost.mockResolvedValueOnce(mockResponse);

    const result = await getDraftRFQs(payload);

    expect(mockPost).toHaveBeenCalledWith("/rfq/get-draft-rfqs", payload);
    expect(result).toEqual(mockResponse);
  });

  it("rejects with { message: error } when the request fails", async () => {
    const err = new Error("Internal Server Error");
    mockPost.mockRejectedValueOnce(err);

    await expect(getDraftRFQs({})).rejects.toEqual({ message: err });
  });
});

// ---------------------------------------------------------------
// bulkSearchVendorsByCategory
// ---------------------------------------------------------------
describe("bulkSearchVendorsByCategory", () => {
  it("resolves with POST /rfq/bulk-search-vendors-by-category passing payload and config", async () => {
    const payload = { category_ids: [1, 2, 3] };
    const axiosConfig = { timeout: 60000 };
    const mockResponse = { status: 1, data: [{ vendor_id: 10 }] };
    mockPost.mockResolvedValueOnce(mockResponse);

    const result = await bulkSearchVendorsByCategory(payload, axiosConfig);

    expect(mockPost).toHaveBeenCalledWith(
      "/rfq/bulk-search-vendors-by-category",
      payload,
      axiosConfig
    );
    expect(result).toEqual(mockResponse);
  });

  it("uses empty axiosConfig by default when none is provided", async () => {
    const payload = { category_ids: [5] };
    const mockResponse = { status: 1, data: [] };
    mockPost.mockResolvedValueOnce(mockResponse);

    await bulkSearchVendorsByCategory(payload);

    expect(mockPost).toHaveBeenCalledWith(
      "/rfq/bulk-search-vendors-by-category",
      payload,
      {}
    );
  });

  it("rejects with { message: error } when the request fails", async () => {
    const err = new Error("Gateway timeout");
    mockPost.mockRejectedValueOnce(err);

    await expect(bulkSearchVendorsByCategory({})).rejects.toEqual({ message: err });
  });
});
