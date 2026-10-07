// dashboardLinks — route contract.
//
// The review of 2026-09-28 found that most dashboard deep links either 404'd
// (/dashboard/buyer/approval never existed) or landed on an unfiltered list
// because the target page ignored the param (?stage=, ?filter=, ?id=,
// ?product_id=, ?rfq_id=). This test makes both failure modes impossible to
// reintroduce:
//   1. every URL a builder emits resolves to a real file under pages/
//   2. every query param it emits is READ by that page or a component it
//      renders (followed through imports), at grep level.

import fs from "fs";
import path from "path";
import * as L from "./dashboardLinks";

const ROOT = path.resolve(__dirname, "../../..");
const PAGES = path.join(ROOT, "pages");

/** Resolve a URL pathname to its Next.js page file (supports [param] dirs/files). */
function resolvePage(pathname) {
  const segs = pathname.split("/").filter(Boolean);
  let dir = PAGES;
  const dynamicParams = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const last = i === segs.length - 1;
    const entries = fs.readdirSync(dir);
    if (last) {
      if (entries.includes(`${seg}.js`)) return { file: path.join(dir, `${seg}.js`), dynamicParams };
      if (entries.includes(seg) && fs.existsSync(path.join(dir, seg, "index.js"))) return { file: path.join(dir, seg, "index.js"), dynamicParams };
      const dynFile = entries.find((e) => /^\[[^\]]+\]\.js$/.test(e));
      if (dynFile) return { file: path.join(dir, dynFile), dynamicParams: [...dynamicParams, dynFile.slice(1, -4)] };
      const dynDir = entries.find((e) => /^\[[^\]]+\]$/.test(e) && fs.existsSync(path.join(dir, e, "index.js")));
      if (dynDir) return { file: path.join(dir, dynDir, "index.js"), dynamicParams: [...dynamicParams, dynDir.slice(1, -1)] };
      return null;
    }
    if (entries.includes(seg) && fs.statSync(path.join(dir, seg)).isDirectory()) { dir = path.join(dir, seg); continue; }
    const dynDir = entries.find((e) => /^\[[^\]]+\]$/.test(e));
    if (!dynDir) return null;
    dynamicParams.push(dynDir.slice(1, -1));
    dir = path.join(dir, dynDir);
  }
  return null;
}

/** Page source + every local component it imports, transitively (depth-limited). */
function collectSources(file, depth = 4, seen = new Set()) {
  if (seen.has(file) || depth < 0 || !fs.existsSync(file)) return seen;
  seen.add(file);
  const src = fs.readFileSync(file, "utf8");
  const re = /from\s+["']((?:@\/|\.{1,2}\/)[^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    if (/\.(s?css|json|png|svg)$/.test(spec)) continue;
    const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(file), spec);
    const candidates = [base, `${base}.js`, path.join(base, "index.js")];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    // Only follow app code that can read the router — not services/utils.
    if (hit && /\/(components|pages)\//.test(hit)) collectSources(hit, depth - 1, seen);
  }
  return seen;
}

/** Does any source read `param` from the router query? */
function readsParam(sources, param) {
  const p = param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b(query|q)\\.${p}\\b`),
    new RegExp(`\\b(query|q)\\[["']${p}["']\\]`),
    new RegExp(`\\{[^}]*\\b${p}\\b[^}]*\\}\\s*=\\s*router\\.query`),
  ];
  return sources.some((s) => patterns.some((re) => re.test(s)));
}

// Every destination the dashboard uses, with realistic ids.
const SAMPLES = {
  rfqDetail: L.rfqDetail(512),
  rfqDetailStage: L.rfqDetail(512, { stage: "negotiation-award", focus: "approval" }),
  resumeDraft: L.resumeDraft(512),
  rfqListFull: L.rfqList({ tab: "pending", status: ["RFQ_APPROVAL"], bu: [10], search: "LOCKS", sort: "deadline", mine: true }),
  rfqListDisagreements: L.rfqListView("vendor_disagreements"),
  techEval: L.techEval({ rfqId: 9, rfqProductId: 4 }),
  techEvalBare: L.techEval(),
  quoteCompare: L.quoteCompare(9, { rfqProductId: 4 }),
  negotiationForRfq: L.negotiationForRfq(9),
  negotiationList: L.negotiationList({ tab: "needs_attention", needsMyApproval: true, search: "x" }),
  negotiationRoundApproval: L.negotiationRoundApproval(9),
  poDetail: L.poDetail(77),
  poList: L.poList({ status: "action-required", search: "PO-1" }),
  poTracking: L.poTracking({ tab: "awaiting-grn", search: "x" }),
  arcContract: L.arcContract(5, { stage: "active", tab: "amendments" }),
  materialRequisition: L.materialRequisition(3),
  reports: L.reports(),
};
Object.keys(L.RFQ_LIST_VIEWS).forEach((v) => { SAMPLES[`view:${v}`] = L.rfqListView(v); });
["RFQ", "TENDER", "TECHNICAL", "NEGOTIATION_QUOTE", "NEGOTIATION", "PO", "ARC_PUBLISH", "ARC_TECH", "ARC_COMMITTEE", "ARC_AMENDMENT", "MR", "UNKNOWN"]
  .forEach((t) => {
    SAMPLES[`approval:${t}`] = L.approvalHref(t, { rfqId: 9, poId: 77, arcId: 5, mrId: 3, entityId: 1 });
    SAMPLES[`queue:${t}`] = L.approvalQueue(t);
  });
["draft", "awaiting_approval", "bidding", "quote_compare", "negotiation", "awarded", "NEGOTIATION_ONGOING", "nonsense"]
  .forEach((s) => { SAMPLES[`stage:${s}`] = L.rfqListForStage(s); });

describe("dashboardLinks route contract", () => {
  test.each(Object.entries(SAMPLES))("%s → real page that reads its params", (_name, url) => {
    expect(url.startsWith("/dashboard/buyer")).toBe(true);
    expect(url).not.toMatch(/undefined|null|NaN/);
    const u = new URL(url, "http://x");
    const page = resolvePage(u.pathname);
    expect(page).not.toBeNull();
    const sources = [...collectSources(page.file)].map((f) => fs.readFileSync(f, "utf8"));
    for (const param of u.searchParams.keys()) {
      if (!readsParam(sources, param)) {
        throw new Error(`${url}: no page source under ${path.relative(ROOT, page.file)} reads ?${param}`);
      }
    }
  });

  test("no builder ever emits the non-existent /dashboard/buyer/approval route", () => {
    Object.values(SAMPLES).forEach((url) => expect(url).not.toMatch(/\/dashboard\/buyer\/approval(\?|$|\/)/));
  });
});

describe("dashboardLinks builders", () => {
  test("missing ids fall back to a list, never a broken detail URL", () => {
    expect(L.rfqDetail(undefined)).toBe("/dashboard/buyer/rfq-management");
    expect(L.poDetail(null)).toBe("/dashboard/buyer/purchase-orders");
    expect(L.resumeDraft("")).toBe(L.rfqListView("draft"));
    expect(L.techEval({ rfqId: undefined, rfqProductId: 4 })).toBe("/dashboard/buyer/technical-evaluation");
    expect(L.quoteCompare(undefined)).toBe(L.rfqListView("quote_compare"));
    expect(L.negotiationForRfq(undefined)).toBe("/dashboard/buyer/negotiation");
  });

  test("unknown tabs, statuses and stages are dropped", () => {
    expect(L.rfqList({ tab: "manage-rfq", status: ["BOGUS", "CLOSED"] })).toBe("/dashboard/buyer/rfq-management?status=CLOSED");
    expect(L.rfqDetail(1, { stage: "bogus" })).toBe("/dashboard/buyer/rfq-management-details?id=1");
    expect(L.poList({ status: "whatever" })).toBe("/dashboard/buyer/purchase-orders");
    expect(L.rfqListForStage("nonsense")).toBe("/dashboard/buyer/rfq-management");
  });

  test("approval links land where the approver acts, by prod id shape", () => {
    // PO.entity_id is the PO id → PO detail, where PODetail approves/rejects.
    expect(L.approvalHref("PO", { entityId: 77 })).toBe("/dashboard/buyer/purchase-orders/77");
    // TECHNICAL / NEGOTIATION_QUOTE: entity_id is NOT the RFQ — the rfq comes from metadata.
    expect(L.approvalHref("TECHNICAL", { rfqId: 525, entityId: 211 }))
      .toBe("/dashboard/buyer/rfq-management-details?id=525&stage=technical&focus=approval");
    expect(L.approvalHref("NEGOTIATION_QUOTE", { rfqId: 9, entityId: 4410 }))
      .toBe("/dashboard/buyer/rfq-management-details?id=9&stage=negotiation-award&focus=approval");
    // Without the rfq id, never guess from entity_id: go to the queue instead.
    expect(L.approvalHref("TECHNICAL", { entityId: 211 })).toBe(L.approvalQueue("TECHNICAL"));
    expect(L.approvalHref("RFQ", { entityId: 44 })).toContain("id=44&stage=overview&focus=approval");
    expect(L.approvalHref("NEGOTIATION", { rfqId: 9 })).toBe("/dashboard/buyer/negotiation/9/approve");
    expect(L.approvalHref("ARC_AMENDMENT", { arcId: 5 })).toBe("/dashboard/buyer/rate-contracts/5?stage=active&tab=amendments");
  });

  test("queues point at the user's own pending lists", () => {
    expect(L.approvalQueue("RFQ")).toBe("/dashboard/buyer/rfq-management?tab=pending&status=RFQ_APPROVAL");
    expect(L.approvalQueue("PO")).toBe("/dashboard/buyer/purchase-orders?status=action-required");
    expect(L.approvalQueue("NEGOTIATION")).toBe("/dashboard/buyer/negotiation?needs_my_approval=1");
  });

  test("stage aliases and raw lifecycle keys both map", () => {
    expect(L.rfqListForStage("negotiation")).toBe("/dashboard/buyer/rfq-management?status=NEGOTIATION_ONGOING");
    expect(L.rfqListForStage("NEGOTIATION_ONGOING")).toBe("/dashboard/buyer/rfq-management?status=NEGOTIATION_ONGOING");
    expect(L.rfqListForStage("draft")).toBe("/dashboard/buyer/rfq-management?tab=drafts");
  });

  test("multi-value params are comma-joined and values are encoded", () => {
    expect(L.rfqList({ status: ["AWAITING_QUOTES", "TECHNICAL_AWAITING_QUOTES"], search: "a&b" }))
      .toBe("/dashboard/buyer/rfq-management?status=AWAITING_QUOTES,TECHNICAL_AWAITING_QUOTES&search=a%26b");
  });
});
