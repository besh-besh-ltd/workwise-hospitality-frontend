// Vendor Request Amendment — standalone page. The contract dropdown is live:
// it lists every contract that is approved AND currently active (active /
// expiring_soon — never expired), so a vendor can raise a request from the
// sidebar without first opening a contract. `?contract=<id>` preselects.
// Submits through POST /v1/arc-v2/amendments/request, which snapshots the
// buyer-side approval chain via the central engine.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

// Amendment types are scope-split: item-level changes target one contract
// line (the item picker appears only for these); whole-contract changes
// apply to the entire ARC and never reference an item.
const ITEM_AMEND_TYPES = [
  {
    id: "price",
    name: "Unit price revision",
    desc: "Pass-through cost rise, CPI escalation",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12" />
        <path d="M6 8h12" />
        <path d="m6 13 8.5 8" />
        <path d="M6 13h3" />
        <path d="M9 13c6.667 0 6.667-10 0-10" />
      </svg>
    ),
  },
  {
    id: "qty",
    name: "Quantity revision",
    desc: "Raise or lower your committed quantity",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
];
const CONTRACT_AMEND_TYPES = [
  {
    id: "term",
    name: "Term extension",
    desc: "Extend the contract end date — applies to the whole contract",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];
const ITEM_TYPE_IDS = new Set(ITEM_AMEND_TYPES.map((t) => t.id));

// One-in-flight rule (mirrors the backend guard): while an amendment is
// requested / approved / live, the same item can't get another one, and only
// one term extension may be in flight at a time.
const IN_FLIGHT_STATUSES = new Set(["requested", "approved", "live"]);
const FLIGHT_LABEL = {
  requested: "in review with the buyer",
  approved:  "approved and waiting to go live",
  live:      "currently active",
};

// ── page ─────────────────────────────────────────────────────────────────────
export default function VendorRequestAmendmentPage() {
  const router = useRouter();

  const [tab, setTab] = useState("create");
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractId, setContractId] = useState("");
  const [contract, setContract] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [itemId, setItemId] = useState("");
  const [amendType, setAmendType] = useState("price");
  const [newRate, setNewRate] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [effFrom, setEffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effTo, setEffTo] = useState("");
  const [reason, setReason] = useState("");
  const [amendments, setAmendments] = useState([]);
  const [toast, setToast] = useState("");
  const [submitErr, setSubmitErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // All contracts the vendor can amend — approved & currently in force.
  useEffect(() => {
    let cancelled = false;
    setContractsLoading(true);
    (async () => {
      try {
        const res = await ArcApi.vendorListActiveContracts();
        if (cancelled) return;
        const rows = (res?.data?.contracts || []).filter(
          (c) => c.status === "active" || c.status === "expiring_soon"
        );
        setContracts(rows);
      } catch (e) {
        // Axios interceptor handles error toast
      } finally {
        if (!cancelled) setContractsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Preselect from ?contract=<id> once the router has the query.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.contract;
    if (q && !contractId) setContractId(String(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // Load the selected contract so the item picker shows its real lines.
  useEffect(() => {
    if (!contractId) {
      setContract(null);
      setLines([]);
      setAmendments([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await ArcApi.vendorGetContract(contractId);
        if (cancelled) return;
        const payload = res?.data ?? res ?? {};
        setContract(payload.contract || null);
        setLines(payload.lines || []);
        setAmendments(payload.amendments || []);
        setItemId("");
      } catch (e) {
        // Axios interceptor handles error toast
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contractId]);

  const selectedLine = useMemo(
    () => lines.find(l => String(l.id) === String(itemId)) || null,
    [lines, itemId]
  );

  // In-flight conflicts on the selected contract.
  const blockedLines = useMemo(() => {
    const m = new Map();
    for (const a of amendments) {
      if (!IN_FLIGHT_STATUSES.has(a.status)) continue;
      const lid = a.payload?.arc_contract_line_id;
      if (lid != null && !m.has(String(lid))) m.set(String(lid), a);
    }
    return m;
  }, [amendments]);
  const termBlock = useMemo(
    () => amendments.find((a) => a.amendment_type === "term" && IN_FLIGHT_STATUSES.has(a.status)) || null,
    [amendments]
  );
  const selectedLineBlock = itemId ? blockedLines.get(String(itemId)) || null : null;

  const currentRate = Number(selectedLine?.unit_rate || 0);
  const uom = selectedLine?.uom || "unit";

  const pctChange = useMemo(() => {
    if (!currentRate || !newRate) return 0;
    return Math.round((Number(newRate) - currentRate) / currentRate * 1000) / 10;
  }, [currentRate, newRate]);

  const canSubmit = useMemo(() => {
    if (!contractId || !reason.trim()) return false;
    if (amendType === "term") return !!newEndDate && !termBlock;
    // price/qty need an item, a value, the mandatory effective window —
    // and the item must not already have an amendment in flight.
    if (!itemId || !effFrom || !effTo || selectedLineBlock) return false;
    if (amendType === "price") return Number(newRate) > 0;
    if (amendType === "qty")   return Number(newQty) > 0;
    return false;
  }, [contractId, itemId, reason, amendType, newRate, newQty, newEndDate, effFrom, effTo, termBlock, selectedLineBlock]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const resetForm = () => {
    setReason("");
    setNewRate("");
    setNewQty("");
    setNewEndDate("");
    setEffTo("");
    setSubmitErr(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const payload =
        amendType === "price" ? { arc_contract_line_id: Number(itemId), new_rate: Number(newRate) }
        : amendType === "qty" ? { arc_contract_line_id: Number(itemId), new_qty: Number(newQty) }
        : {};
      const res = await ArcApi.requestAmendment({
        arc_contract_id: Number(contractId),
        amendment_type: amendType,
        // For term extensions amendment_from carries the proposed new end
        // date; price/qty use the mandatory effective window.
        amendment_from: amendType === "term" ? newEndDate : effFrom,
        amendment_to:   amendType === "term" ? null : effTo,
        reason: reason.trim(),
        payload,
      });
      const created = res?.data?.amendment ?? res?.amendment;
      if (created) setAmendments((prev) => [created, ...prev]);
      showToast("Amendment request submitted — buyer approval chain started");
      resetForm();
      setTab("history");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message;
      setSubmitErr(msg || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };


  const myAmendments = amendments;

  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Request amendment</h1>
          <p className="page-sub">
            Request a revision to an active rate contract — unit price, committed quantity,
            or a term extension. Every request routes through the buyer's approval chain.
          </p>
          {contract && (
            <div className="mono" style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
              Contract <strong style={{ color: "var(--fg)" }}>{contract.arc_number}</strong>
              {contract.arc_title ? ` · ${contract.arc_title}` : ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/vendor/rate-contracts/amendments" className="btn btn-secondary btn-sm">
            My amendments
          </Link>
          {contractId && (
            <Link href={`/dashboard/vendor/rate-contracts/${contractId}`} className="btn btn-secondary btn-sm">
              Open contract
            </Link>
          )}
        </div>
      </div>


      {/* Tab row */}
      <div className="tab-row" style={{ alignSelf: "flex-start", marginTop: 14 }}>
        <button
          type="button"
          className={`tab ${tab === "create" ? "active" : ""}`}
          onClick={() => setTab("create")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New request
        </button>
        <button
          type="button"
          className={`tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
          </svg>
          This contract's requests <span className="ct">{myAmendments.length}</span>
        </button>
      </div>

      {/* ═════ CREATE TAB ═════ */}
      {tab === "create" && (
        <div className="va-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "flex-start", marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {/* Contract & item picker */}
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <h2>Which contract?</h2>
                    <div className="h-sub">Pick from your active contracts — whether an item is needed depends on the change you request below</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="form-grid">
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Contract <span className="req">*</span></label>
                    <select
                      className="select"
                      value={contractId}
                      onChange={(e) => setContractId(e.target.value)}
                      disabled={contractsLoading}
                    >
                      <option value="">{contractsLoading ? "Loading contracts…" : "Select contract…"}</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.arc_number || `RC-${c.id}`} · {c.arc_title || "Untitled"}{c.hotel_name ? ` · ${c.hotel_name}` : ""}
                        </option>
                      ))}
                    </select>
                    {!contractsLoading && contracts.length === 0 && (
                      <div className="help-text">No active contracts yet — amendments can only be raised on live contracts.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Amendment type */}
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2>What needs to change?</h2>
                    <div className="h-sub">Item-level changes target one line; whole-contract changes apply to the entire ARC</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                {/* Scope-split type picker — an item only makes sense for the
                    item-level group, so the two scopes never share a grid. */}
                <div className="section-label" style={{ marginBottom: 8 }}>Item-level changes</div>
                <div className="form-grid">
                  {ITEM_AMEND_TYPES.map((t) => (
                    <div
                      key={t.id}
                      className={`type-card ${amendType === t.id ? "selected" : ""}`}
                      onClick={() => setAmendType(t.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setAmendType(t.id); }}
                    >
                      <div className="tc-ic">{t.icon}</div>
                      <div>
                        <div className="tc-name">{t.name}</div>
                        <div className="tc-desc">{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="section-label" style={{ margin: "14px 0 8px" }}>Whole-contract changes</div>
                <div className="form-grid">
                  {CONTRACT_AMEND_TYPES.map((t) => {
                    const blocked = t.id === "term" && !!termBlock;
                    return (
                      <div
                        key={t.id}
                        className={`type-card ${amendType === t.id ? "selected" : ""}${blocked ? " disabled" : ""}`}
                        onClick={() => { if (!blocked) setAmendType(t.id); }}
                        role="button"
                        tabIndex={blocked ? -1 : 0}
                        aria-disabled={blocked}
                        onKeyDown={(e) => { if (!blocked && (e.key === "Enter" || e.key === " ")) setAmendType(t.id); }}
                      >
                        <div className="tc-ic">{t.icon}</div>
                        <div>
                          <div className="tc-name">{t.name}</div>
                          <div className="tc-desc">
                            {blocked
                              ? <>Unavailable — AMD-{termBlock.id} ({FLIGHT_LABEL[termBlock.status]}) already extends this contract's term</>
                              : t.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Conditional fields */}
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>

                  {/* Item picker — only item-level changes reference a line.
                      Items with an in-flight amendment are not selectable. */}
                  {ITEM_TYPE_IDS.has(amendType) && (
                    <div className="form-grid" style={{ marginBottom: 14 }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label className="label">Item <span className="req">*</span></label>
                        <select
                          className="select"
                          value={itemId}
                          onChange={(e) => setItemId(e.target.value)}
                          disabled={!contractId || loading}
                        >
                          <option value="">{loading ? "Loading items…" : (contractId ? "Select item…" : "Pick a contract first")}</option>
                          {lines.map((line) => {
                            const block = blockedLines.get(String(line.id));
                            return (
                              <option key={line.id} value={line.id} disabled={!!block}>
                                {line.variant_name || `Variant #${line.product_variant_id}`}
                                {block ? ` — amendment AMD-${block.id} in flight` : ""}
                              </option>
                            );
                          })}
                        </select>
                        {blockedLines.size > 0 && !selectedLineBlock && (
                          <div className="help-text">
                            Greyed-out items already have an amendment in flight — one amendment per item at a time.
                          </div>
                        )}
                        {selectedLineBlock && (
                          <div className="guide warn" style={{ marginTop: 10, alignItems: "center" }}>
                            <div className="g-ic" style={{ marginTop: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                            <div>
                              <strong>This item can't be amended right now.</strong>{" "}
                              Amendment <span className="mono fw-600">AMD-{selectedLineBlock.id}</span> is {FLIGHT_LABEL[selectedLineBlock.status]} for this item —
                              a new request can be raised once it's approved, declined, or its window ends.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Term extension blocked — explain instead of failing on submit. */}
                  {amendType === "term" && termBlock && (
                    <div className="guide warn" style={{ marginBottom: 14, alignItems: "center" }}>
                      <div className="g-ic" style={{ marginTop: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </div>
                      <div>
                        <strong>A term extension is already in flight.</strong>{" "}
                        Amendment <span className="mono fw-600">AMD-{termBlock.id}</span> is {FLIGHT_LABEL[termBlock.status]} —
                        only one term extension can be in flight per contract.
                      </div>
                    </div>
                  )}

                  {amendType === "price" && itemId && (
                    <div className="form-grid">
                      <div>
                        <label className="label">Current rate</label>
                        <div className="input-group">
                          <div className="prefix">₹</div>
                          <input className="input mono" value={fmtMoney(currentRate)} readOnly />
                          <div className="suffix">{`/${uom}`}</div>
                        </div>
                      </div>
                      <div>
                        <label className="label">Requested new rate <span className="req">*</span></label>
                        <div className="input-group">
                          <div className="prefix">₹</div>
                          <input
                            type="number"
                            className="input input-num"
                            value={newRate}
                            onChange={(e) => setNewRate(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                          <div className="suffix">{`/${uom}`}</div>
                        </div>
                        {newRate && (
                          <div className="help-text">
                            Change:{" "}
                            <span
                              className="mono fw-700"
                              style={{ color: pctChange > 0 ? "var(--danger)" : "var(--success)" }}
                            >
                              {(pctChange > 0 ? "+" : "") + pctChange + "%"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {amendType === "qty" && itemId && (
                    <div className="form-grid">
                      <div>
                        <label className="label">Current committed quantity</label>
                        <div className="input-group">
                          <input className="input mono" value={fmtMoney(selectedLine?.committed_qty)} readOnly />
                          <div className="suffix">{uom}</div>
                        </div>
                      </div>
                      <div>
                        <label className="label">Requested new quantity <span className="req">*</span></label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="input input-num"
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                            placeholder="0"
                            min="0"
                          />
                          <div className="suffix">{uom}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {amendType === "term" && (
                    <div className="form-grid">
                      <div>
                        <label className="label">Current end date</label>
                        <input className="input mono" value={fmtDate(contract?.contract_end_at)} readOnly />
                      </div>
                      <div>
                        <label className="label">Proposed new end date <span className="req">*</span></label>
                        <input type="date" className="input" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {amendType !== "term" && (
                    <div className="form-grid" style={{ marginTop: 14 }}>
                      <div>
                        <label className="label">Effective from <span className="req">*</span></label>
                        <input type="date" className="input" value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
                        <div className="help-text">Released POs raised on/after this date use the amended terms.</div>
                      </div>
                      <div>
                        <label className="label">Effective to <span className="req">*</span></label>
                        <input type="date" className="input" value={effTo} onChange={(e) => setEffTo(e.target.value)} />
                        <div className="help-text">After this date, rates revert to the original contract.</div>
                      </div>
                    </div>
                  )}

                  <label className="label" style={{ marginTop: 14 }}>
                    Reason / justification <span className="req">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Cite the cost driver, regulatory change, market reference, etc. Buyers expect detailed reasoning before approval."
                  />

                  <label className="label" style={{ marginTop: 14 }}>Supporting documents</label>
                  <div className="upload">
                    <div className="upload-ic">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                    </div>
                    <div className="upload-text">
                      <div className="t1">Drop files or click to upload</div>
                      <div className="t2">Cost circulars, market reports, vendor notices — PDF/XLSX</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" type="button" disabled>
                      Browse
                    </button>
                  </div>

                  {submitErr && (
                    <div style={{ marginTop: 14, padding: "9px 13px", background: "var(--warn-soft)", border: "1px solid rgba(180,83,9,0.24)", borderRadius: 8, color: "var(--warn)", fontSize: 12.5 }}>
                      {submitErr}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aside */}
          <aside className="va-aside" style={{ position: "sticky", top: 78, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="guide">
              <div className="g-ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                <strong>How amendments work.</strong>{" "}
                Your request goes to the buyer's Category Lead → if cleared, it goes to the ARC Committee
                for approval. Once approved, the change takes effect for Released POs issued after the
                effective date. In-flight POs are unaffected.
              </div>
            </div>

            <div className="workflow">
              <div className="wf-head">
                <div className="t">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4" />
                  </svg>{" "}
                  Routing
                </div>
              </div>
              <div className="wf-step current">
                <div className="wf-node"></div>
                <div className="body">
                  <div className="nm">Submitted to buyer</div>
                  <div className="meta">Category Lead reviews first</div>
                </div>
              </div>
              <div className="wf-step pending">
                <div className="wf-node"></div>
                <div className="body">
                  <div className="nm">Commercial Eval review</div>
                  <div className="meta">Validates against escalation clause</div>
                </div>
              </div>
              <div className="wf-step pending">
                <div className="wf-node"></div>
                <div className="body">
                  <div className="nm">ARC Committee approval</div>
                  <div className="meta">Final go/no-go on the amendment</div>
                </div>
              </div>
              <div className="wf-step pending">
                <div className="wf-node"></div>
                <div className="body">
                  <div className="nm">You countersign</div>
                  <div className="meta">Amendment activates after sign</div>
                </div>
              </div>
            </div>

            <div className="guide warn">
              <div className="g-ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
              <div>
                <strong>Honour the contract</strong> while the request is under review. You cannot pause
                existing released POs unilaterally.
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ═════ HISTORY TAB ═════ */}
      {tab === "history" && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {!contractId && (
            <div className="empty-state">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </div>
              <h2>Pick a contract first</h2>
              <p>This tab lists the requests raised on the contract selected in the New request tab. For everything in one place, open My amendments.</p>
            </div>
          )}
          {contractId && myAmendments.length === 0 && (
            <div className="empty-state">
              <div className="ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </div>
              <h2>No amendment requests yet</h2>
              <p>Submit your first request from the New request tab — it routes through the buyer approval chain.</p>
            </div>
          )}
          {contractId && myAmendments.map((am) => {
            const tone = am.status === "requested" ? "warn"
              : am.status === "approved" || am.status === "live" ? "success"
              : am.status === "rejected" ? "danger" : "neutral";
            const totalSteps = Number(am.total_steps) || (Array.isArray(am.chain) ? am.chain.length : 0);
            return (
              <div key={am.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 16px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>AMD-{am.id}</span>
                    <span className="pill" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>{String(am.amendment_type).replace("_", " ")}</span>
                    <span className={`status-pill ${tone}`} style={{ fontSize: 10.5 }}><span className="dot" />{am.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.4 }}>
                    {am.payload?.new_rate ? <>New rate <span className="mono fw-600">{"₹"}{am.payload.new_rate}</span> · </> : null}
                    {am.payload?.new_qty ? <>New qty <span className="mono fw-600">{am.payload.new_qty}</span> · </> : null}
                    Effective <span className="mono">{fmtDate(am.amendment_from)}</span>
                    {am.amendment_to ? <> → <span className="mono">{fmtDate(am.amendment_to)}</span></> : null}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{am.reason}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--fg-3)" }}>
                  {am.status === "requested" && totalSteps > 0 && (
                    <div>Level <span className="mono fw-700" style={{ color: "var(--fg)" }}>{Math.min(Number(am.current_step) || 1, totalSteps)} / {totalSteps}</span></div>
                  )}
                  <div className="mono" style={{ marginTop: 3, color: "var(--fg-4)" }}>{fmtDate(am.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="arc-toast">
          <span className="t-ic">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Action dock — sticky bottom bar */}
      {tab === "create" && (
        <div className="action-dock">
          <div className="inner">
            <div className="left">
              <span className="fs-13 text-fg-2">
                Your request routes to the buyer approval chain the moment you submit.
              </span>
            </div>
            <div className="right">
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={resetForm}
              >
                Reset form
              </button>
              <button
                className="btn btn-blue"
                type="button"
                disabled={!canSubmit || submitting}
                onClick={submit}
              >
                {submitting ? "Submitting…" : "Submit request"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
