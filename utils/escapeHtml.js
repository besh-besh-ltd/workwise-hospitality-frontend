// HTML-escapes a value interpolated into markup built as a string (e.g. a
// document.write print preview). null / undefined become "".
export const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default escapeHtml;
