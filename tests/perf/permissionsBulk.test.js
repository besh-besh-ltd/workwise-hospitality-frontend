// permissions/bulk: identical concurrent requests share one POST, and the hook
// no longer sorts the caller's hotelIds array in place.

const mockPost = jest.fn();
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { post: (...a) => mockPost(...a), get: jest.fn() },
}));

import React from "react";
import { render, waitFor, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getBulkPermissions } from "@/services/rbac";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { clearRequestCache } from "@/utils/requestCache";

const grant = (key, actions) => ({ status: 1, data: { permissions: { [key]: { actions, scope: null } } } });

let resolvers = [];
beforeEach(() => {
  clearRequestCache();
  resolvers = [];
  mockPost.mockReset().mockImplementation((url, body) => new Promise((resolve) => {
    resolvers.push(() => resolve(grant(body.key, ["read", "update"])));
  }));
});
const flushAll = () => { resolvers.splice(0).forEach((r) => r()); };

describe("getBulkPermissions", () => {
  it("dedupes identical requests issued concurrently", async () => {
    const a = getBulkPermissions("rfq", [30, 12], 2);
    const b = getBulkPermissions("rfq", [12, 30], 2); // same set, different order
    await Promise.resolve();
    expect(mockPost).toHaveBeenCalledTimes(1);
    flushAll();
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual(rb);
  });

  it("does not merge different questions", async () => {
    getBulkPermissions("rfq", [30]);
    getBulkPermissions("negotiation", [30]);
    getBulkPermissions("rfq", [31]);
    getBulkPermissions("rfq", [30], 4);
    await Promise.resolve();
    expect(mockPost).toHaveBeenCalledTimes(4);
    flushAll();
  });

  it("keeps nothing once settled — the next page load asks again", async () => {
    const p = getBulkPermissions("rfq", [30]);
    await Promise.resolve();
    flushAll();
    await p;
    const q = getBulkPermissions("rfq", [30]);
    await Promise.resolve();
    expect(mockPost).toHaveBeenCalledTimes(2);
    flushAll();
    await q;
  });
});

describe("useModulePermissions", () => {
  it("does not mutate the caller's hotelIds array", async () => {
    const hotelIds = [42, 7, 19];
    const { result } = renderHook(() => useModulePermissions({ moduleKey: "rfq", hotelIds }));
    expect(hotelIds).toEqual([42, 7, 19]);
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    flushAll();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(hotelIds).toEqual([42, 7, 19]);
    expect(result.current.canRead).toBe(true);
  });

  it("two hooks asking the same question on one page issue one request", async () => {
    const hotelIds = [30];
    const Probe = ({ onState }) => {
      const a = useModulePermissions({ moduleKey: "quote-compare", hotelIds });
      const b = useModulePermissions({ moduleKey: "quote-compare", hotelIds });
      onState(a, b);
      return null;
    };
    let last;
    render(<Probe onState={(a, b) => { last = { a, b }; }} />);
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    flushAll();
    await waitFor(() => expect(last.a.loading || last.b.loading).toBe(false));
    expect(last.a.canUpdate).toBe(true);
    expect(last.b.canUpdate).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
