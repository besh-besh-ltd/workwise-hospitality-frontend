/* ─────────────────────────────────────────────────────────────────────────
   Turning a server-built file into a save dialog.

   These lived inside services/po.js and were private to it. The Reports module
   downloads the same way, and a second copy would drift — in particular the
   Safari note below, which is the kind of fix that gets lost when it is
   duplicated. services/po.js now imports from here.

   Note for callers: the axios response interceptor unwraps `response.data`,
   which for responseType:"blob" IS the Blob — so what a service awaits is
   already the file, with no `.data` to reach through.

   The filename is composed client-side rather than read off Content-Disposition
   because that header is not exposed to cross-origin XHR by default, and the
   value would silently degrade to the endpoint path ("download", which Excel
   refuses to open).
   ───────────────────────────────────────────────────────────────────────── */

/** Today as YYYY-MM-DD, so repeat exports do not overwrite each other. */
export const stamp = () => new Date().toISOString().slice(0, 10);

export const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari; one tick is enough.
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

export default { saveBlob, stamp };
