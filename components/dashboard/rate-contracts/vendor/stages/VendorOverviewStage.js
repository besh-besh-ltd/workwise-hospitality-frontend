// Vendor ARC quote page — Overview & terms stage.
// Presentational only. The page (quote.js) owns all state/handlers.
// Move of existing JSX from quote.js lines 719-843 verbatim; indentation preserved.

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Phase 1 §3 — VendorOverviewStage now:
//   • Shows an orange "action needed" callout when terms are not yet accepted.
//   • Checkbox triggers the server-persist handler (not just local state).
//   • Shows a sealed/completed green confirmation state when terms_accepted_at set.
export default function VendorOverviewStage({
  arc,
  items,
  invitation,
  techEnvelope,
  acceptedTerms,
  termsAcceptedAt,
  onAcceptTerms,
  acceptingTerms,
  readOnly,
  // derived strings passed from page
  submissionStart,
  submissionEnd,
  termStart,
  termEnd,
}) {
  return (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Tender overview</div>
              <div className="q-section-sub">Review who&apos;s asking, what they need, and the rate-contract terms.</div>
            </div>
            <span className="pill"><span className="pdot" style={{ background: "var(--info)" }}></span>Rate contract · sealed bid</span>
          </div>

          {/* Phase 1 §3 — orange "action needed" callout (visible until terms accepted) */}
          {!acceptedTerms && !readOnly && (
            <div className="guide warn" style={{ alignItems: "flex-start" }}>
              <div className="g-ic" style={{ marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Action required — accept terms to continue</div>
                <div style={{ fontSize: 12.5, color: "var(--warn-fg, #92400e)" }}>
                  Read the rate-contract terms &amp; conditions below, then check the acknowledgement box at the bottom of this page. You must accept before unlocking the technical envelope or pricing stages.
                </div>
              </div>
            </div>
          )}

          <div className="q-card">
            <div className="q-card-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
                Buyer &amp; scope
              </h3>
              <span className="count">Workwise Hospitality</span>
            </div>
            <div className="q-detail-grid">
              <div className="detail-cell"><div className="k">Company</div><div className="v">Workwise Hospitality Pvt Ltd</div></div>
              <div className="detail-cell"><div className="k">Business unit</div><div className="v"><span className="mono fw-600">{arc.hotel_code || "—"}</span> {arc.hotel_name || ""}</div></div>
              <div className="detail-cell"><div className="k">Location</div><div className="v">{arc.hotel_city || "—"}</div></div>
              <div className="detail-cell"><div className="k">Category</div><div className="v">{arc.category_title || arc.category_id || "—"}</div></div>
              <div className="detail-cell"><div className="k">Submission window</div><div className="v"><span className="mono">{submissionStart}</span> → <span className="mono">{submissionEnd}</span></div></div>
              <div className="detail-cell"><div className="k">Contract term</div><div className="v"><span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span></div></div>
              <div className="detail-cell"><div className="k">Eligibility</div><div className="v">{arc.eligibility === "open" ? "Open" : "Invitation only"}</div></div>
              <div className="detail-cell"><div className="k">Samples</div><div className="v">{arc.samples_required ? "Required" : "Not required"}</div></div>
              <div className="detail-cell"><div className="k">Price escalation</div><div className="v">{arc.escalation_policy || "Fixed for full contract term"}</div></div>
            </div>
          </div>

          {/* Technical envelope notice when required */}
          {techEnvelope?.required && (
            <div className="guide" style={{ alignItems: "center" }}>
              <div className="g-ic" style={{ marginTop: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                This contract requires a <strong>technical evaluation</strong> before your commercial quote. You will need to complete and seal the technical envelope first.
              </div>
            </div>
          )}

          <div className="q-card">
            <div className="q-card-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Items to quote
              </h3>
              <span className="count">{items.length} line item{items.length === 1 ? "" : "s"}</span>
            </div>
            <div className="q-card-section">
              {items.length === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>No line items on this contract.</div>
              )}
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between"
                  style={idx > 0 ? { borderTop: "1px solid var(--border)", paddingTop: 13, marginTop: 13 } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: "var(--surface-3)", color: "var(--fg-3)", border: "1px solid var(--border)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{it.variant_name || it.title || `Item #${it.id}`}</div>
                      <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.4 }}>
                        <span className="mono">{it.variant_slug || it.code || ""}</span>
                        {it.spec ? <> · <span>{it.spec}</span></> : null}
                      </div>
                      {/* Product-level: committed vs indicative qty + UOM */}
                      <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 4, display: "flex", gap: 12 }}>
                        {it.committed_qty != null && (
                          <span><span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Committed</span> <span className="mono">{safeNum(it.committed_qty).toLocaleString("en-IN")} {it.uom || ""}</span></span>
                        )}
                        {it.indicative_qty != null && (
                          <span><span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Indicative</span> <span className="mono">{safeNum(it.indicative_qty).toLocaleString("en-IN")} {it.uom || ""}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right" style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 10.5, color: "var(--fg-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Indicative qty</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                      <span>{safeNum(it.committed_qty ?? it.indicative_qty ?? 0).toLocaleString("en-IN")}</span>{" "}
                      <span style={{ color: "var(--fg-3)" }}>{it.uom || ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="q-card">
            <div className="q-card-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Rate-contract terms
              </h3>
              <div className="flex items-center gap-2">
                <span className="count">{(arc.terms_list?.length || 0)} clauses</span>
                <a href="#" className="file-chip-mini" onClick={e => e.preventDefault()}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  T&amp;C document
                </a>
              </div>
            </div>
            <div className="q-card-section">
              <div className="terms-list">
                {(arc.terms_list || []).map((t, i) => (
                  <div className="term-item" key={i}>
                    <span className="term-num"></span>
                    <div className="term-text"><strong>{t.text}</strong> <span>{t.body}</span></div>
                  </div>
                ))}
                {(!arc.terms_list || arc.terms_list.length === 0) && (
                  <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>No specific clauses uploaded for this contract.</div>
                )}
              </div>
            </div>
            <div className="q-card-section" style={{ background: "var(--surface-2)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Additional ARC-specific terms
              </div>
              <ul style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.65, paddingLeft: 0, listStyle: "none" }}>
                <li>• <strong style={{ color: "var(--fg)" }}>Payment:</strong> <span>{arc.payment_expected || "Net 30 after delivery"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Delivery:</strong> <span>{arc.delivery_expected || "As per released PO"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Penalty / LD:</strong> <span>{arc.penalty_clause || "Standard LD per company policy"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Escalation:</strong> <span>{arc.escalation_policy || "Fixed for contract term"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Released POs:</strong> Buyer releases POs against this framework — qty per released PO; all other terms inherited.</li>
              </ul>
            </div>
            {/* Contract-level: validity window and bid sealing info */}
            <div className="q-card-section" style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Contract validity &amp; bid integrity
              </div>
              <div className="q-detail-grid-3">
                <div className="detail-cell"><div className="k">Validity window</div><div className="v"><span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span></div></div>
                <div className="detail-cell"><div className="k">Submission closes</div><div className="v"><span className="em">{submissionEnd}</span></div></div>
                <div className="detail-cell"><div className="k">Bid sealing</div><div className="v">Encrypted until close</div></div>
              </div>
            </div>
          </div>

          {/* Phase 1 §3 — sealed/completed state: read-only green confirmation when terms_accepted_at set */}
          {acceptedTerms && termsAcceptedAt ? (
            <div
              className="guide"
              style={{ background: "var(--success-bg, #f0fdf4)", borderColor: "var(--success, #22c55e)", alignItems: "center" }}
            >
              <div className="g-ic" style={{ marginTop: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--success, #22c55e)", marginBottom: 2 }}>Terms accepted</div>
                <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
                  You accepted the rate-contract terms on{" "}
                  <span className="mono">{new Date(termsAcceptedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>.
                  Continue to the next stage using the button below.
                </div>
              </div>
            </div>
          ) : (
            <label
              className={"check" + (acceptedTerms ? " is-checked" : "") + ((readOnly || acceptingTerms) ? " is-disabled" : "")}
              onClick={(e) => {
                if (readOnly || acceptedTerms || acceptingTerms) return;
                e.preventDefault();
                onAcceptTerms();
              }}
            >
              <span className="box"></span>
              <div className="check-body">
                <div className="check-title">I have read and accept the rate-contract terms &amp; conditions above.</div>
                <div className="check-desc">
                  By checking this, you confirm that any quote you submit will follow these terms for the full contract term{" "}
                  <span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span>.
                </div>
              </div>
            </label>
          )}
        </div>
  );
}
