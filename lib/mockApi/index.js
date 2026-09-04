import routes from "./routes";

/**
 * The demo's entire backend, as one axios adapter.
 *
 * Why here and not in `services/*.js`: the axios instance is the single seam
 * every one of the 25 service modules already passes through. Intercepting at
 * the adapter means the services keep their real signatures and all 400+
 * screen components run completely unmodified — which is the point, because
 * the whole reason for forking the real frontend was to show the real UI.
 *
 * Envelope contract, worked back from `lib/axios.js`:
 *   adapter returns   { data: <envelope> }
 *   interceptor peels  → <envelope>
 *   service reads      → envelope.data
 * So an endpoint's handler returns the *payload*, and `respond()` wraps it in
 * the `{ data, message }` envelope the real API sends.
 */

const norm = (url = "") => {
  // Services pass paths relative to baseURL, sometimes absolute. Reduce both
  // to a leading-slash path with no query string.
  const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  return path.startsWith("/") ? path : `/${path}`;
};

/** `/po/detail/:id` → matches `/po/detail/29`, capturing { id: "29" }. */
const match = (pattern, path) => {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("/").filter(Boolean);
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
};

/** Some endpoints return a bare body rather than a `{ data }` envelope. */
export const raw = (value) => ({ __raw: true, value });

const respond = (payload, status = 200) => ({
  data: payload && payload.__raw ? payload.value : { data: payload, message: "OK" },
  status,
  statusText: "OK",
  headers: {},
  config: {},
});

const unhandled = new Set();

export const mockAdapter = async (config) => {
  const method = (config.method || "get").toLowerCase();
  const path = norm(config.url);
  const params = config.params || {};
  let body = config.data;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { /* FormData or plain text */ }
  }

  for (const route of routes) {
    if (route.method !== method) continue;
    const routeParams = match(route.path, path);
    if (!routeParams) continue;
    const payload = await route.handler({ params: routeParams, query: params, body, config });
    // A handler may signal "no content here" — a 404 that callers treat as
    // "show nothing" rather than as a page error (see getPOInitiators).
    if (payload === undefined) {
      const err = new Error(`Not found: ${path}`);
      err.response = { status: 404, data: { message: "Not found" } };
      throw err;
    }
    return respond(payload);
  }

  // Loud once per endpoint, quiet thereafter — an unmapped call should be
  // obvious while building and never spam the console during a demo.
  const key = `${method} ${path}`;
  if (!unhandled.has(key)) {
    unhandled.add(key);
    // eslint-disable-next-line no-console
    console.warn(`[demo] no fixture for ${key} — returning an empty payload`);
  }
  // The fallback is method-aware, because reads and writes fail differently.
  //
  // READS: returned RAW, not wrapped. A wrapped fallback makes `res.data` an
  // object, and any consumer doing `res.data.map(...)` throws — which is how
  // the product search died. Raw keeps `res.data` an array while still
  // answering the `rows`/`items`/`total` readers.
  //
  // WRITES: an empty list means "failed" to every save handler, so an unmapped
  // write must look like a success instead. `id`/`rfq_id` are included because
  // several screens read an id back and error without one.
  if (method === "get") {
    return respond(
      raw({ data: [], rows: [], items: [], results: [], total: 0, total_items: 0, tab_counts: {}, facets: {} })
    );
  }
  const id = String(Date.now()).slice(-6);
  return respond(raw({ status: 1, ok: true, message: "Saved", id, rfq_id: id }));
};

/** Every endpoint the app asked for that we have no fixture for. */
export const unhandledRoutes = () => Array.from(unhandled);

export default mockAdapter;
