// Decodes the five entities escapeHtml / the backend sanitiser write
// (&amp; &lt; &gt; &quot; &#39;) exactly ONCE, so "&amp;lt;" shows as "&lt;".
// For display as React text only; never feed the result to innerHTML.
const MAP = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

export const decodeHtmlEntities = (v) =>
  String(v ?? "").replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => MAP[m]);

export default decodeHtmlEntities;
