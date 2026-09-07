import { decodeDoc, docFileName } from "@/lib/mockApi/poState";
import { vendorsById } from "@/data/ihg/vendors";
import { getPo } from "@/data/ihg/orders";
import { peopleById, propertiesById, company } from "@/data/ihg/org";

/**
 * The printed purchase order.
 *
 * Initiating a PO is what generates its document — that is how the real portal
 * works, and the UI links to the result with a plain anchor
 * (`target="_blank" rel="noopener"`). So the artifact has to be a real URL that
 * opens as a top-level page, which rules out a blob: URL (dies on reload) and
 * data: (Chrome blocks top-level navigation to it).
 *
 * It also has to render without the app's chrome. Anything under /dashboard is
 * wrapped in DashboardShell and anything else gets the marketing header, so a
 * page would arrive inside a nav rail. An API route is the only surface that
 * returns a bare document without editing product code.
 *
 * The catch: this runs on the server, and every PO raised during the demo lives
 * in sessionStorage. So the order carries itself — initiate encodes the payload
 * into `?d=`, and we render from that. The five seeded POs need no payload;
 * they are resolved from the fixture by id.
 */

const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const day = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (_) { return "—"; }
};

/** Amount in words — an Indian PO is not valid-looking without it. */
const words = (num) => {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n) => (n < 20 ? a[n] : `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`);
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) {
    if (rest > 99) parts.push(`${a[Math.floor(rest / 100)]} Hundred${rest % 100 ? " " + two(rest % 100) : ""}`);
    else parts.push(two(rest));
  }
  return parts.join(" ");
};

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Build the document model from one of the five seeded POs. */
const fromFixture = (id) => {
  const po = getPo(id);
  if (!po) return null;
  const vendor = vendorsById[po.vendorId] || {};
  return {
    n: String(po.id),
    d: `${po.raisedOn}T10:00:00.000Z`,
    r: null,
    t: po.title,
    v: vendor.name || po.vendorId,
    vc: vendor.city || "",
    vg: vendor.gst || "",
    b: peopleById[po.raisedBy]?.name || "",
    l: (po.lines || []).map((l) => [l.name, "nos", l.qty, l.rate, l.value]),
  };
};

export default function handler(req, res) {
  const { id, d } = req.query;
  const model = d ? decodeDoc(d) : fromFixture(id);

  if (!model) {
    res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end("<p style=\"font:15px system-ui;padding:40px\">Purchase order not found.</p>");
  }

  const lines = (model.l || []).map(([name, uom, qty, rate, amount]) => ({ name, uom, qty, rate, amount }));
  const subtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const poNo = model.n || String(id);

  const rows = lines.map((l, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(l.name)}</td>
        <td class="c">${esc(l.uom)}</td>
        <td class="r">${Number(l.qty || 0).toLocaleString("en-IN")}</td>
        <td class="r">${inr(l.rate)}</td>
        <td class="r b">${inr(l.amount)}</td>
      </tr>`).join("");

  const shipTo = Object.values(propertiesById)
    .slice(0, 5)
    .map((p) => `<div class="ship">${esc(p.name)} · ${esc(p.city)}</div>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Chrome proposes the document title as the filename in Save as PDF, so the
     "PO_<n>.pdf" the app promises is what the user actually gets. -->
<title>${esc(docFileName(poNo).replace(/\.pdf$/, ""))}</title>
<style>
  :root { --navy:#1b2a4a; --gold:#a4854a; --ink:#12151c; --muted:#5b6373; --line:#d8dce4; }
  * { box-sizing:border-box; }
  body { margin:0; padding:28px 20px 60px; background:#eceef2; color:var(--ink);
         font:14px/1.5 "Georgia","Times New Roman",serif; }
  .sheet { max-width:820px; margin:0 auto; background:#fff; padding:44px 48px 52px;
           box-shadow:0 2px 18px rgba(20,28,48,.13); }
  .top { display:flex; justify-content:space-between; align-items:flex-start;
         border-bottom:3px solid var(--navy); padding-bottom:18px; }
  .logo { height:38px; }
  .co { font-size:12px; color:var(--muted); text-align:right; line-height:1.6; }
  .co strong { display:block; color:var(--navy); font-size:15px; letter-spacing:.02em; }
  h1 { font-size:19px; letter-spacing:.14em; text-transform:uppercase; color:var(--navy);
       margin:26px 0 4px; text-align:center; }
  .sub { text-align:center; color:var(--muted); font-size:12.5px; margin-bottom:24px; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-bottom:22px; }
  .box { border:1px solid var(--line); padding:13px 15px; }
  .box h2 { font-size:10.5px; letter-spacing:.13em; text-transform:uppercase;
            color:var(--gold); margin:0 0 7px; font-family:system-ui,sans-serif; }
  .box .nm { font-size:15px; color:var(--navy); font-weight:700; }
  .box div { font-size:12.5px; color:var(--muted); }
  .kv { display:flex; justify-content:space-between; font-size:12.5px; padding:3px 0; }
  .kv span:last-child { color:var(--navy); font-weight:700; }
  table { width:100%; border-collapse:collapse; margin-top:6px; }
  th { background:var(--navy); color:#fff; font:600 10.5px/1.4 system-ui,sans-serif;
       letter-spacing:.09em; text-transform:uppercase; padding:9px 10px; text-align:left; }
  td { border-bottom:1px solid var(--line); padding:10px; font-size:13px; vertical-align:top; }
  .c { text-align:center; } .r { text-align:right; } .b { font-weight:700; }
  tfoot td { border:none; padding:5px 10px; font-size:13px; }
  tfoot .lbl { text-align:right; color:var(--muted); }
  tfoot .grand td { border-top:2px solid var(--navy); padding-top:10px;
                    font-size:15px; font-weight:700; color:var(--navy); }
  .words { margin-top:12px; padding:10px 13px; background:#f6f7f9;
           border-left:3px solid var(--gold); font-size:12.5px; }
  .terms { margin-top:26px; display:grid; grid-template-columns:1fr 1fr; gap:22px; }
  .terms h2 { font-size:10.5px; letter-spacing:.13em; text-transform:uppercase;
              color:var(--gold); margin:0 0 7px; font-family:system-ui,sans-serif; }
  .terms li { font-size:12px; color:var(--muted); margin-bottom:5px; }
  .ship { font-size:12.5px; color:var(--muted); padding:2px 0; }
  .sign { margin-top:44px; display:flex; justify-content:space-between; }
  .sign div { width:42%; border-top:1px solid var(--ink); padding-top:7px;
              font-size:12px; color:var(--muted); }
  .foot { margin-top:30px; padding-top:12px; border-top:1px solid var(--line);
          font-size:11px; color:var(--muted); text-align:center; }
  .bar { position:fixed; top:0; left:0; right:0; background:var(--navy); color:#fff;
         padding:9px 16px; font:600 13px system-ui,sans-serif; display:flex;
         justify-content:space-between; align-items:center; }
  .bar button { background:var(--gold); color:#fff; border:0; padding:7px 15px;
                border-radius:4px; font:600 13px system-ui,sans-serif; cursor:pointer; }
  body { padding-top:66px; }
  @media print {
    body { background:#fff; padding:0; }
    .sheet { box-shadow:none; max-width:none; padding:0; }
    .bar { display:none; }
    thead { display:table-header-group; }
  }
</style>
</head>
<body>
<div class="bar">
  <span>Purchase Order ${esc(poNo)}</span>
  <button onclick="window.print()">Save as PDF</button>
</div>

<div class="sheet">
  <div class="top">
    <img class="logo" src="/ihg/ihg-logo.svg" alt="IHG Hotels &amp; Resorts">
    <div class="co">
      <strong>IHG Hotels &amp; Resorts</strong>
      ${esc(company?.region || "South West Asia")}<br>
      Procurement — Shared Services
    </div>
  </div>

  <h1>Purchase Order</h1>
  <div class="sub">${esc(model.t || "")}</div>

  <div class="meta">
    <div class="box">
      <h2>Supplier</h2>
      <div class="nm">${esc(model.v)}</div>
      ${model.vc ? `<div>${esc(model.vc)}</div>` : ""}
      ${model.vg ? `<div>GSTIN ${esc(model.vg)}</div>` : ""}
    </div>
    <div class="box">
      <h2>Order details</h2>
      <div class="kv"><span>PO number</span><span>${esc(poNo)}</span></div>
      <div class="kv"><span>Date</span><span>${day(model.d)}</span></div>
      ${model.r ? `<div class="kv"><span>Against RFQ</span><span>#${esc(model.r)}</span></div>` : ""}
      <div class="kv"><span>Raised by</span><span>${esc(model.b)}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:34px">#</th><th>Description</th><th style="width:54px">UoM</th>
        <th style="width:86px" class="r">Qty</th><th style="width:100px" class="r">Rate</th>
        <th style="width:120px" class="r">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="4"></td><td class="lbl">Sub-total</td><td class="r">${inr(subtotal)}</td></tr>
      <tr><td colspan="4"></td><td class="lbl">GST @ 18%</td><td class="r">${inr(gst)}</td></tr>
      <tr class="grand"><td colspan="4"></td><td class="lbl">Total</td><td class="r">${inr(total)}</td></tr>
    </tfoot>
  </table>

  <div class="words"><strong>Amount in words:</strong> Rupees ${words(total)} only</div>

  <div class="terms">
    <div>
      <h2>Delivery to</h2>
      ${shipTo}
    </div>
    <div>
      <h2>Terms &amp; conditions</h2>
      <ul style="margin:0;padding-left:16px">
        <li>Payment 45 days from GRN acceptance.</li>
        <li>Rates firm for the contract term; no escalation without written approval.</li>
        <li>Delivery to each property per the agreed schedule; short supply to be advised in advance.</li>
        <li>Goods rejected at GRN are to be lifted within 7 days at supplier cost.</li>
        <li>This order is governed by the rate contract executed against the referenced RFQ.</li>
      </ul>
    </div>
  </div>

  <div class="sign">
    <div>Prepared by — ${esc(model.b)}</div>
    <div>For IHG Hotels &amp; Resorts — Authorised signatory</div>
  </div>

  <div class="foot">
    This is a system-generated purchase order from the IHG Procurement portal.
  </div>
</div>
</body>
</html>`;

  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="${docFileName(poNo)}"`);
  res.end(html);
}
