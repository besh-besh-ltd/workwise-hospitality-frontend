// Vendor ARC quote page — Commercial / pricing stage.
// Presentational only. The page (quote.js) owns all state/handlers.
// Move of existing JSX from quote.js lines 1087-1498 verbatim; indentation preserved.
// Restructured borrowing SendQuoteWizard's card/sticky-summary layout while keeping
// ARC's own data (price[arc_item_id], globals, lineTotal, ArcApi.vendorSubmitQuote).
//
// Phase 1 §D changes (this file):
//   - Submit/Save-draft buttons REMOVED from aside hero-foot — now in quote.js action dock.
//   - "Target was N/A per kg" help-text REMOVED.
//   - Standalone Freight field REMOVED — freight is now a named charge in the other-charges modal.
//   - Other charges inline section upgraded: charges modal is a full overlay (portal-style).
//   - Aside overflow fix: .q-cols/.hero-summary get responsive style guards.

const fmtN = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function VendorCommercialStage({
  arc,
  items,
  price,
  priceLine,
  updateLine,
  addChargeOfType,
  removeCharge,
  productChargesTotal,
  lineTotal,
  totals,
  globals,
  setGlobals,
  onChangePaymentTerms,
  onChangeComment,
  paymentTotal,
  chargesOpen,
  setChargesOpen,
  canSubmit,
  submitting,
  onSaveDraft,
  onSubmit,
  onWithdraw,
  submitted,
  submittedAt,
  readOnly,
  // derived strings
  arcNumber,
  termStart,
  termEnd,
  submissionEnd,
  // payment term row helpers
  addPaymentTerm,
  removePaymentTerm,
  updatePaymentTerm,
  // price state setter for inline charge edits
  setPrice,
  blankLine,
}) {
  return (
    <>
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Pricing &amp; commercial terms</div>
              <div className="q-section-sub">Enter your single price per item for the full contract term. Single-BU contract — one price applies.</div>
              <div className="mini-stats">
                <div className="mini-stat"><div className="lbl">Items to price</div><div className="val">{items.length}</div></div>
                <div className="div"></div>
                <div className="mini-stat"><div className="lbl">Business unit</div><div className="val"><span className="mono">{arc.hotel_code || "—"}</span> {arc.hotel_name || ""}</div></div>
                <div className="div"></div>
                <div className="mini-stat"><div className="lbl">Contract term</div><div className="val"><span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span></div></div>
              </div>
            </div>
          </div>

          {/* Phase 1 §D — aside overflow fix: explicit min-width:0 on the main column so the
              grid doesn't force the aside off-screen; aside gets max-width + sticky. */}
          <div className="q-cols" style={{ alignItems: "start" }}>
            <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>Line items</h3>
                  <span className="pill">{items.length} {items.length === 1 ? "item" : "items"}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}><span className="kbd">↹</span> tab between fields</div>
              </div>

              {items.map((it, idx) => {
                const l = priceLine(it.id);
                const qty = safeNum(it.committed_qty ?? it.indicative_qty ?? 0);
                const lt = lineTotal(it.id, qty);
                return (
                  <div className="line-card" key={it.id}>
                    <div className="line-card-head">
                      <div className="left">
                        <div className="num-chip">{String(idx + 1).padStart(2, "0")}</div>
                        <div>
                          <div className="title">{it.variant_name || it.title || `Item #${it.id}`}</div>
                          <div className="desc">{it.spec || ""}</div>
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {l.charges.length > 0 && (
                              <span className="pill">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {" "}{l.charges.length} extra {l.charges.length > 1 ? "charges" : "charge"}
                              </span>
                            )}
                            {l.rate ? (
                              <span className="pill success"><span className="pdot"></span> Priced</span>
                            ) : (
                              <span className="pill warn">Awaiting price</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="qty-block">
                        <div className="lbl">Qty required</div>
                        <div className="val mono">{qty.toLocaleString("en-IN")}</div>
                        <div className="unit">{it.uom || ""}</div>
                      </div>
                    </div>

                    {!readOnly && (
                    <div className="line-section">
                      <div className="line-section-label">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
                        Unit price for this contract
                      </div>
                      <div className="price-grid">
                        <div>
                          <label className="label">Unit price <span className="req">*</span></label>
                          <div className="input-group">
                            <div className="prefix">₹</div>
                            <input
                              type="number"
                              className="input input-num"
                              value={l.rate}
                              onChange={e => updateLine(it.id, { rate: e.target.value })}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              disabled={readOnly}
                            />
                            <div className="suffix" style={{ fontFamily: "'Geist',sans-serif", fontSize: 12 }}>/ <span>{it.uom || ""}</span></div>
                          </div>
                          {/* Phase 1 §D — "Target was N/A per uom" help-text removed (buyer-internal) */}
                        </div>
                        <div>
                          <label className="label">Tax (GST)</label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="input input-num"
                              value={l.gst_pct}
                              onChange={e => updateLine(it.id, { gst_pct: e.target.value })}
                              placeholder="0"
                              min="0"
                              disabled={readOnly}
                            />
                            <div className="suffix" style={{ padding: 0 }}>
                              <div className="seg" style={{ border: "none", borderRadius: 0, height: "100%" }}>
                                <button type="button" className={l.gstMode === "%" ? "is-active" : ""} onClick={() => updateLine(it.id, { gstMode: "%" })} style={{ borderRadius: 0 }} disabled={readOnly}>%</button>
                                <button type="button" className={l.gstMode === "₹" ? "is-active" : ""} onClick={() => updateLine(it.id, { gstMode: "₹" })} style={{ borderRadius: 0 }} disabled={readOnly}>₹</button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Phase 1 §D — standalone Freight field removed; freight is now a
                            named charge inside the Other charges modal below. */}
                        <div>
                          <label className="label">Lead time <span className="req">*</span></label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="input input-num"
                              value={l.lead_time_days}
                              onChange={e => updateLine(it.id, { lead_time_days: e.target.value })}
                              placeholder="7"
                              min="1"
                              disabled={readOnly}
                            />
                            <div className="suffix" style={{ fontFamily: "'Geist',sans-serif", fontSize: 12 }}>days</div>
                          </div>
                        </div>
                      </div>
                      {/* Phase 1 §D — Other charges + Freight modal (RFQ-style) */}
                      <div className="mt-3">
                        <label className="label">Other charges &amp; freight <span className="label-meta">insurance, packaging, TCS, freight, etc.</span></label>
                        <button
                          type="button"
                          className={"charges-trigger" + (l.charges.length > 0 ? " has-items" : "")}
                          onClick={() => setChargesOpen(it.id)}
                          disabled={readOnly}
                        >
                          <span className="flex items-center gap-2">
                            {l.charges.length === 0 ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            )}
                            <span>
                              {l.charges.length === 0
                                ? "Add freight, insurance, packaging, TCS…"
                                : `${l.charges.length} charge${l.charges.length > 1 ? "s" : ""} added`}
                            </span>
                          </span>
                          {l.charges.length > 0 && (
                            <span className="ch-amt">{`₹ ${fmtN(productChargesTotal(it.id))}`}</span>
                          )}
                        </button>
                      </div>
                    </div>
                    )}

                    {readOnly && l.rate && (
                      <div className="line-section">
                        <div className="line-section-label">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
                          Submitted price
                        </div>
                        <div className="detail-grid" style={{ gap: 10 }}>
                          <div className="detail-cell"><div className="k">Unit price</div><div className="v"><span className="mono fw-600">₹{fmtN(l.rate)}</span> / {it.uom || ""}</div></div>
                          <div className="detail-cell"><div className="k">GST</div><div className="v"><span className="mono">{l.gst_pct}{l.gstMode}</span></div></div>
                          {safeNum(l.freight) > 0 && <div className="detail-cell"><div className="k">Freight</div><div className="v"><span className="mono">₹{fmtN(l.freight)}</span> / {it.uom || ""}</div></div>}
                          {l.lead_time_days && <div className="detail-cell"><div className="k">Lead time</div><div className="v"><span className="mono">{l.lead_time_days}</span> days</div></div>}
                        </div>
                      </div>
                    )}

                    <div className="line-section">
                      <div className="line-section-label">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                        Notes &amp; attachments
                      </div>
                      <div className="notes-grid">
                        <div>
                          <label className="label">Comment to buyer <span className="label-meta">optional</span></label>
                          <textarea
                            className="textarea"
                            value={l.comment}
                            onChange={e => updateLine(it.id, { comment: e.target.value })}
                            placeholder="MOQ, validity caveats, substitute proposals…"
                            maxLength={300}
                            style={{ minHeight: 64 }}
                            disabled={readOnly}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="label">Lead-time note</label>
                            <input
                              className="input"
                              type="text"
                              value={l.leadNote}
                              onChange={e => updateLine(it.id, { leadNote: e.target.value })}
                              placeholder="e.g. Subject to PO confirmation"
                              disabled={readOnly}
                            />
                          </div>
                          <button className="upload-mini w-full justify-center" type="button" style={{ padding: 9 }} disabled={readOnly}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                            Attach supporting documents
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="line-card-foot">
                      <div className="badges">
                        <span>
                          <span className="mono">{qty.toLocaleString("en-IN")}</span> ×{" "}
                          <span className="mono">{l.rate ? `₹${fmtN(l.rate)}` : "—"}</span>
                          {safeNum(l.gst_pct) > 0 && (
                            <> + <span className="mono">{l.gstMode === "%" ? `${l.gst_pct}% GST` : `₹${l.gst_pct} tax`}</span></>
                          )}
                        </span>
                      </div>
                      <div className="ltot">
                        <span className="lbl">Line total</span>
                        <span className={"val" + (lt === 0 ? " is-zero" : "")}>{`₹ ${fmtN(lt)}`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>Commercial terms</h3>
                  <span className="pill">Applies to entire quote</span>
                </div>
              </div>

              <div className="commercial-card">
                <div className="q-card-section">
                  <label className="label">GSTIN <span className="label-meta">used for invoicing</span></label>
                  <input
                    className="input mono"
                    value={globals.gstin}
                    onChange={e => setGlobals(g => ({ ...g, gstin: e.target.value }))}
                    placeholder="29ABCDE1234F1Z5"
                    maxLength={15}
                    style={{ maxWidth: 280 }}
                    disabled={readOnly}
                  />
                </div>
                <div className="q-card-section">
                  <label className="label">Global comment <span className="label-meta">visible to buyer</span></label>
                  <textarea
                    className="textarea"
                    value={globals.comment}
                    onChange={e => setGlobals(g => ({ ...g, comment: e.target.value }))}
                    placeholder="Quote-wide notes — packaging, batching, validity, etc."
                    maxLength={500}
                    disabled={readOnly}
                  />
                </div>
                <div className="q-card-section">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="label" style={{ marginBottom: 0 }}>Payment terms <span className="req">*</span></label>
                    <div className="tot-hint">
                      <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>Must sum to 100% · currently</span>
                      <span className={"tot-num ml-1 " + (paymentTotal === 100 ? "ok" : "err")}>{paymentTotal}%</span>
                    </div>
                  </div>
                  <div className="rounded-lg" style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                    {globals.paymentTerms.map((pt, i) => (
                      <div
                        key={i}
                        className={"grid items-center gap-2 px-3 py-2" + (i === 0 ? " !border-t-0" : "")}
                        style={{ gridTemplateColumns: "24px 1fr 130px 32px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                      >
                        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</div>
                        <input
                          className="input"
                          style={{ border: "none", background: "transparent", padding: "4px 6px" }}
                          type="text"
                          value={pt.label}
                          onChange={e => updatePaymentTerm(i, { label: e.target.value })}
                          placeholder={i === 0 ? "e.g. Advance on PO acceptance" : "e.g. Net 30 after delivery"}
                          disabled={readOnly}
                        />
                        <div className="input-group" style={{ border: "1px solid var(--border)" }}>
                          <input
                            className="input input-num"
                            style={{ padding: "5px 10px" }}
                            type="number"
                            value={pt.pct}
                            onChange={e => updatePaymentTerm(i, { pct: Number(e.target.value) })}
                            min="0"
                            max="100"
                            placeholder="0"
                            disabled={readOnly}
                          />
                          <div className="suffix" style={{ padding: "0 9px" }}>%</div>
                        </div>
                        <button
                          className="icon-btn"
                          onClick={() => removePaymentTerm(i)}
                          type="button"
                          disabled={globals.paymentTerms.length === 1 || readOnly}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    ))}
                    {!readOnly && (
                    <button
                      className="w-full text-left px-3 py-2 flex items-center gap-2"
                      onClick={addPaymentTerm}
                      type="button"
                      style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)", fontSize: 12.5, color: "var(--primary)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                      Add another term
                    </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submitted summary when readOnly (quote already submitted) */}
              {submitted && (
                <div className="guide" style={{ background: "var(--success-bg, #f0fdf4)", borderColor: "var(--success, #22c55e)", alignItems: "center" }}>
                  <div className="g-ic" style={{ marginTop: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div>Quote submitted on <span className="mono">{submittedAt}</span>. Grand total: <span className="mono fw-600">₹ {fmtN(totals.grand)}</span>.</div>
                    {onWithdraw && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        style={{ marginTop: 8 }}
                        onClick={onWithdraw}
                      >
                        Withdraw quote
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <aside style={{ minWidth: 0, maxWidth: 320, width: "100%", position: "sticky", top: 80 }}>
              <div className="hero-summary">
                <div className="hero-summary-inner">
                  <div className="hero-head">
                    <div className="h-title">Quote summary</div>
                    <div className="h-rfq">{`#${arcNumber}`}</div>
                  </div>
                  {totals.grand > 0 ? (
                    <div>
                      <div className="hero-grand-label">Grand total · full term</div>
                      <div className="hero-grand"><span className="cur">₹</span><span>{fmtN(totals.grand)}</span></div>
                      <div className="hero-grand-meta">Inclusive of GST &amp; all charges · INR · full contract term</div>
                      <div className="breakdown-bar">
                        <div className="bd-subtotal" style={{ width: `${(totals.subtotal / totals.grand) * 100 || 0}%` }}></div>
                        <div className="bd-gst" style={{ width: `${(totals.gst / totals.grand) * 100 || 0}%` }}></div>
                        <div className="bd-charges" style={{ width: `${(totals.extraCharges.reduce((s, c) => s + c.amount, 0) / totals.grand) * 100 || 0}%` }}></div>
                      </div>
                      <div className="breakdown-legend">
                        <div className="breakdown-row"><span className="lbl"><span className="swatch bd-subtotal"></span> Subtotal</span><span className="val">{`₹ ${fmtN(totals.subtotal)}`}</span></div>
                        <div className="breakdown-row"><span className="lbl"><span className="swatch bd-gst"></span> GST</span><span className="val">{`₹ ${fmtN(totals.gst)}`}</span></div>
                        {totals.extraCharges.map(ec => (
                          <div className="breakdown-row" key={ec.label}>
                            <span className="lbl"><span className="swatch bd-charges"></span> <span>{ec.label}</span></span>
                            <span className="val">{`₹ ${fmtN(ec.amount)}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-hero">
                      <div className="ic">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
                      </div>
                      <div className="ttl">Awaiting your prices</div>
                      <div className="sub">Your grand total &amp; tax breakdown will appear here as you price each line item.</div>
                    </div>
                  )}
                </div>
                <div className="hero-foot">
                  <div className="meta-row"><span className="k">Payment</span><span className="v">{globals.paymentTerms.length} term{globals.paymentTerms.length === 1 ? "" : "s"} · {paymentTotal}%</span></div>
                  <div className="meta-row"><span className="k">BU</span><span className="v"><span>{arc.hotel_code || "—"}</span> · <span>{arc.hotel_name || ""}</span></span></div>
                  <div className="meta-row"><span className="k">Closes</span><span className="v">{submissionEnd}</span></div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={"completion-pill" + (canSubmit ? " is-ready" : "")}>
                      <span className="pulse"></span>
                      <span>{submitted ? "Submitted" : canSubmit ? "Ready to submit" : "In progress"}</span>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "'Geist Mono',monospace" }}>v1 · draft</span>
                  </div>
                  {/* Phase 1 §D — Submit + Save-draft REMOVED from here; they are in the action dock (quote.js). */}
                </div>
              </div>
            </aside>
          </div>
        </div>

      {/* Phase 1 §D — Other charges modal (RFQ-style overlay). Opens when chargesOpen === it.id.
          Freight is now a named charge row here; no standalone freight field in the price grid. */}
      {chargesOpen != null && (() => {
        const modalItem = items.find(i => i.id === chargesOpen);
        if (!modalItem) return null;
        const ml = priceLine(modalItem.id);
        return (
          <div
            className="arc-modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) setChargesOpen(null); }}
          >
            <div className="arc-modal" style={{ maxWidth: 620 }}>
              <div className="modal-head">
                <div>
                  <div className="t"><h3>Other charges &amp; freight</h3></div>
                  <div className="sub">{modalItem.variant_name || modalItem.title || `Item #${modalItem.id}`} · add freight, insurance, packaging, TCS, etc.</div>
                </div>
                <button className="icon-btn" onClick={() => setChargesOpen(null)} type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="modal-body" style={{ padding: "16px 20px" }}>
                <div className="flex items-center gap-2 mb-3" style={{ flexWrap: "wrap" }}>
                  {["Freight", "Insurance", "Packaging", "TCS", "Loading", "Other"].map(t => (
                    <button key={t} type="button" className="btn btn-sm" onClick={() => addChargeOfType(modalItem.id, t)} disabled={readOnly}>+ {t}</button>
                  ))}
                </div>
                {ml.charges.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--fg-3)", padding: "12px 0" }}>Pick a charge type above to add it to this line.</div>
                )}
                {ml.charges.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {/* Phase 2 — per-charge tax column added (additional tax on this charge, engine tri-state). */}
                    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 120px 110px 100px 32px", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Charge name</span>
                      <span style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</span>
                      <span style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tax on charge</span>
                      <span style={{ fontSize: 11, color: "var(--fg-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Note</span>
                      <span></span>
                    </div>
                    {ml.charges.map((c, ci) => (
                      <div key={ci} className="grid items-center gap-2 mt-2" style={{ gridTemplateColumns: "1fr 120px 110px 100px 32px" }}>
                        <input
                          className="input"
                          type="text"
                          value={c.name}
                          onChange={e => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], name: e.target.value }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })}
                          placeholder="Charge name"
                          disabled={readOnly}
                        />
                        <div className="input-group">
                          <input
                            className="input input-num"
                            type="number"
                            value={c.amount}
                            onChange={e => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], amount: e.target.value }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })}
                            placeholder="0"
                            disabled={readOnly}
                          />
                          <div className="suffix" style={{ padding: 0 }}>
                            <div className="seg" style={{ border: "none", borderRadius: 0, height: "100%" }}>
                              <button type="button" className={c.amountMode === "%" ? "is-active" : ""} onClick={() => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], amountMode: "%" }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })} style={{ borderRadius: 0 }} disabled={readOnly}>%</button>
                              <button type="button" className={c.amountMode === "₹" ? "is-active" : ""} onClick={() => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], amountMode: "₹" }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })} style={{ borderRadius: 0 }} disabled={readOnly}>₹</button>
                            </div>
                          </div>
                        </div>
                        {/* Phase 2 — per-charge additional tax. Blank = inherit base GST; 0 = no tax; >0 = explicit rate. */}
                        <div className="input-group">
                          <input
                            className="input input-num"
                            type="number"
                            value={c.tax ?? ""}
                            onChange={e => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], tax: e.target.value }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })}
                            placeholder="inherit"
                            min="0"
                            disabled={readOnly}
                            title="Leave blank to inherit the line's base GST; enter 0 for no tax on this charge; enter a rate for a custom charge tax."
                          />
                          <div className="suffix" style={{ padding: 0 }}>
                            <div className="seg" style={{ border: "none", borderRadius: 0, height: "100%" }}>
                              <button type="button" className={(!c.taxMode || c.taxMode === "%") ? "is-active" : ""} onClick={() => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], taxMode: "%" }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })} style={{ borderRadius: 0 }} disabled={readOnly}>%</button>
                              <button type="button" className={c.taxMode === "₹" ? "is-active" : ""} onClick={() => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], taxMode: "₹" }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })} style={{ borderRadius: 0 }} disabled={readOnly}>₹</button>
                            </div>
                          </div>
                        </div>
                        <input
                          className="input"
                          type="text"
                          value={c.note}
                          onChange={e => setPrice(p => { const cur = { ...(p[modalItem.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], note: e.target.value }; cur.charges = ch; return { ...p, [modalItem.id]: cur }; })}
                          placeholder="Note"
                          disabled={readOnly}
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => removeCharge(modalItem.id, ci)}
                          title="Remove"
                          disabled={readOnly}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {ml.charges.length > 0 && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
                    Total charges: <span className="mono">₹ {fmtN(productChargesTotal(modalItem.id))}</span>
                  </div>
                )}
              </div>
              <div className="modal-foot" style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn btn-blue" onClick={() => setChargesOpen(null)}>Done</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
