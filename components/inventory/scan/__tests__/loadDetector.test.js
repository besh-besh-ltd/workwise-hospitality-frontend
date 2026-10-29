// The decoder loader: one download per page, and a failed download must not
// poison every later attempt (zxing caches its module promise, rejected or not).
jest.mock("barcode-detector/ponyfill", () => ({
  __esModule: true,
  ZXING_WASM_VERSION: "9.9.9",
  BarcodeDetector: function BarcodeDetector() {},
  prepareZXingModule: jest.fn(),
  purgeZXingModule: jest.fn(),
}));

import * as ponyfill from "barcode-detector/ponyfill";
import { loadDetector } from "../loadDetector";

describe("loadDetector", () => {
  it("waits for the self-hosted wasm, and starts over after a failed download", async () => {
    ponyfill.prepareZXingModule.mockRejectedValueOnce(new Error("wasm 404"));
    await expect(loadDetector()).rejects.toThrow("wasm 404");
    expect(ponyfill.purgeZXingModule).toHaveBeenCalledTimes(1);

    const opts = ponyfill.prepareZXingModule.mock.calls[0][0];
    expect(opts.fireImmediately).toBe(true);
    expect(opts.overrides.locateFile("zxing_reader.wasm", "https://cdn.example/")).toBe(
      "/vendor/zxing/9.9.9/zxing_reader.wasm"
    );

    ponyfill.prepareZXingModule.mockResolvedValueOnce({});
    const mod = await loadDetector();
    expect(mod.BarcodeDetector).toBe(ponyfill.BarcodeDetector);
    expect(ponyfill.prepareZXingModule).toHaveBeenCalledTimes(2);

    // Loaded once: later calls reuse it.
    expect(loadDetector()).toBe(loadDetector());
    await loadDetector();
    expect(ponyfill.prepareZXingModule).toHaveBeenCalledTimes(2);
    expect(ponyfill.purgeZXingModule).toHaveBeenCalledTimes(1);
  });
});
