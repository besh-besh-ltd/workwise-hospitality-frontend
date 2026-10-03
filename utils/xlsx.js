/* ═══════════════════════════════════════════════════════════════════════
   xlsx.js — the ONE way the app gets SheetJS.

   SheetJS (xlsx-js-style: core ~407 KB + codepage tables ~438 KB, decoded)
   used to be imported statically by every page that had an "Export" button,
   so it was downloaded and parsed on page load by people who never export.
   It is now fetched on the first export click and cached for the session.

   We standardise on `xlsx-js-style` — an API-compatible superset of the
   `xlsx` 0.18.5 package (same `utils`, `write`, `writeFile`, `read`) that
   additionally honours cell `.s` styles. Shipping both meant two copies of
   SheetJS in the bundle; do not re-introduce a static `import ... from "xlsx"`.

   Usage:
     const XLSX = await loadXlsx();
     const wb = XLSX.utils.book_new(); ...
   ═══════════════════════════════════════════════════════════════════════ */

let cached = null;
let pending = null;

/** Normalise the CJS/ESM interop shape the bundler hands back. */
export const pickXlsx = (mod) => (mod && mod.utils ? mod : mod && mod.default) || mod;

/**
 * Resolve the SheetJS module, downloading its chunk on first call only.
 * Concurrent callers share one in-flight request; a failed load is not
 * cached, so the next click retries instead of being stuck on the error.
 */
export function loadXlsx() {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = import(/* webpackChunkName: "sheetjs" */ "xlsx-js-style")
      .then((mod) => {
        cached = pickXlsx(mod);
        return cached;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

/** Lazy JSZip, for the zip-download buttons. Same caching rules. */
let zipPending = null;
export function loadJSZip() {
  if (!zipPending) {
    zipPending = import(/* webpackChunkName: "jszip" */ "jszip")
      .then((mod) => mod.default || mod)
      .catch((err) => {
        zipPending = null;
        throw err;
      });
  }
  return zipPending;
}

/** Test hook: forget the cached modules. */
export function __resetXlsxCacheForTests() {
  cached = null;
  pending = null;
  zipPending = null;
}
