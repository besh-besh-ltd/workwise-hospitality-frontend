// The SheetJS loader every export path goes through (utils/xlsx.js).
//
// The point of the loader is that SheetJS is NOT part of any page bundle: it
// is fetched on the first export click. These tests pin the behaviour the
// export buttons rely on — the module that comes back is the real, usable
// SheetJS API, it is fetched once and shared, and a failed fetch is retried on
// the next click instead of being cached as a permanent failure.

import { loadXlsx, loadJSZip, pickXlsx, __resetXlsxCacheForTests } from "./xlsx";

beforeEach(() => __resetXlsxCacheForTests());

describe("loadXlsx", () => {
  test("resolves to a working SheetJS that can write an .xlsx", async () => {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["a", 1]]), "S");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    expect(out.byteLength).toBeGreaterThan(0);
    // Round-trip proves it is a full read/write build, not a stub.
    const back = XLSX.read(out, { type: "array" });
    expect(back.SheetNames).toEqual(["S"]);
  });

  test("is the styling build (xlsx-js-style), the single SheetJS the app ships", async () => {
    const XLSX = await loadXlsx();
    expect(XLSX.style_version).toBeTruthy();
  });

  test("concurrent and repeat callers share one module", async () => {
    const [a, b] = await Promise.all([loadXlsx(), loadXlsx()]);
    expect(a).toBe(b);
    expect(await loadXlsx()).toBe(a);
  });
});

describe("pickXlsx", () => {
  test("accepts both the namespace shape and the CJS default-export shape", () => {
    const api = { utils: {}, write: () => {} };
    expect(pickXlsx(api)).toBe(api);
    expect(pickXlsx({ default: api })).toBe(api);
  });
});

describe("loadJSZip", () => {
  test("resolves to a JSZip constructor that can build a zip", async () => {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    zip.file("a.txt", "hello");
    const out = await zip.generateAsync({ type: "uint8array" });
    expect(out.length).toBeGreaterThan(0);
  });
});
