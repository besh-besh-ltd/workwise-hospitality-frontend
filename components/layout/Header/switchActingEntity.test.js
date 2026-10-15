// switchActingEntity's `target` is only ever a same-origin app path: anything
// that could leave the origin falls back to the vendor dashboard.

jest.mock("@/services/vendorNetwork", () => ({ __esModule: true, switchEntity: jest.fn() }));
jest.mock("@/services/Auth", () => ({ __esModule: true, getProfileAs: jest.fn() }));
const mockHardNavigate = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardNavigate: (...a) => mockHardNavigate(...a) }));
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: jest.fn(() => Promise.resolve()) } }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { setStorage: jest.fn(), removeStorege: jest.fn(), getStorage: jest.fn(() => "tok-hq") },
}));

import { switchEntity } from "@/services/vendorNetwork";
import { getProfileAs } from "@/services/Auth";
import { isAppPath, switchActingEntity } from "./switchActingEntity";

test.each([
  ["/dashboard/vendor", true],
  ["/dashboard/vendor/network?tab=1#x", true],
  ["/", true],
  ["//evil.example", false],
  ["/\\evil.example", false],
  ["https://evil.example/x", false],
  ["javascript:alert(1)", false],
  ["dashboard/vendor", false],
  ["/dash board", false],
  ["/x\n", false],
  ["", false],
  [null, false],
  [undefined, false],
])("isAppPath(%p) is %p", (path, ok) => {
  expect(isAppPath(path)).toBe(ok);
});

describe("navigation target", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up" } });
    getProfileAs.mockResolvedValue({ status: 1, data: { id: 11 } });
  });

  test("defaults to the vendor dashboard", async () => {
    await expect(switchActingEntity({ vendorId: 11, profile: {}, dispatch: jest.fn() })).resolves.toEqual({ ok: true });
    expect(mockHardNavigate).toHaveBeenCalledWith("/dashboard/vendor");
  });

  test("goes to an app-path target", async () => {
    await switchActingEntity({ vendorId: 11, profile: {}, dispatch: jest.fn(), target: "/dashboard/vendor/purchase-orders" });
    expect(mockHardNavigate).toHaveBeenCalledWith("/dashboard/vendor/purchase-orders");
  });

  test.each(["//evil.example", "/\\evil.example", "https://evil.example"])("falls back to the dashboard for %p", async (target) => {
    await switchActingEntity({ vendorId: 11, profile: {}, dispatch: jest.fn(), target });
    expect(mockHardNavigate).toHaveBeenCalledWith("/dashboard/vendor");
  });
});
