jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import { formatMoney, formatMoneyExact } from "./format";

describe("formatMoney", () => {
  it.each([
    [0, "₹0"],
    [999, "₹999"],
    [1000, "₹1.0K"],
    [99999, "₹1L"],
    [999.6, "₹1.0K"],
    [100000, "₹1L"],
    [1250000, "₹12.5L"],
    [9999999, "₹1Cr"],
    [10000000, "₹1Cr"],
    [339617811, "₹33.96Cr"],
    ["150000", "₹1.5L"],
  ])("%p → %p", (input, out) => {
    expect(formatMoney(input)).toBe(out);
  });

  it("puts the minus before the symbol", () => {
    expect(formatMoney(-150000)).toBe("−₹1.5L");
    expect(formatMoney(-500)).toBe("−₹500");
  });

  it("renders missing or invalid input as an em dash, not ₹0", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
    expect(formatMoney(NaN)).toBe("—");
    expect(formatMoney("abc")).toBe("—");
    expect(formatMoney(null, { empty: "₹0" })).toBe("₹0");
  });
});

describe("formatMoneyExact", () => {
  it("uses Indian grouping and a leading minus", () => {
    expect(formatMoneyExact(1234567)).toBe("₹12,34,567");
    expect(formatMoneyExact(-2500.6)).toBe("−₹2,501");
    expect(formatMoneyExact(0)).toBe("₹0");
    expect(formatMoneyExact(undefined)).toBe("—");
  });
});
