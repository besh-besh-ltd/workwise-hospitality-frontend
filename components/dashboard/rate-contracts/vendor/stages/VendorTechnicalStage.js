// Vendor ARC quote page — Technical envelope stage.
// Presentational only. The page (quote.js) owns all state/handlers.
// Move of existing JSX from quote.js lines 847-1083 verbatim; indentation preserved.
// Only shown when hasTechClauses (techEnvelope.required === true).

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function VendorTechnicalStage({
  items,
  techItems,
  itemClauses,
  techResponses,
  techFiles,
  techSealed,
  techBusy,
  techError,
  evalTotal,
  evalAnswered,
  evalProgress,
  onChangeResponse,
  onUploadEvidence,
  onDeleteEvidence,
  uploadErrors,
  readOnly,
}) {
  return (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Item specifications &amp; technical evaluation</div>
              <div className="q-section-sub">Review each item&apos;s spec, study 3-year consumption history, and respond to technical clauses.</div>
            </div>
            <div className="flex flex-col items-end gap-2" style={{ minWidth: 240 }}>
              <div className="flex items-baseline justify-between w-full">
                <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 500 }}>Tech eval progress</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>{evalAnswered} of {evalTotal}</span>
              </div>
              <div className="q-bar w-full"><div className="q-fill" style={{ width: `${evalProgress}%` }}></div></div>
            </div>
          </div>

          {/* §1.3 FIX: sealed-envelope status banner */}
          {techSealed && (
            <div className="guide" style={{ background: "var(--success-bg, #f0fdf4)", borderColor: "var(--success, #22c55e)", alignItems: "center" }}>
              <div className="g-ic" style={{ marginTop: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>Technical envelope sealed. You may proceed to pricing.</div>
            </div>
          )}

          {/* Top banner — only for save/seal/delete failures (not upload errors).
              Switched to guide danger since these are genuine error states. */}
          {techError && (
            <div className="guide danger" style={{ alignItems: "center" }}>
              <div className="g-ic" style={{ marginTop: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>{techError}</div>
            </div>
          )}

          {items.map((it, pidx) => {
            const clauses = itemClauses(it.id);
            const techBlock = techItems.find(b => Number(b.arc_item_id) === Number(it.id));
            return (
              <div className="product-card" key={it.id}>
                <div className="product-head">
                  <div>
                    <div className="name">
                      <span className="idx">{String(pidx + 1).padStart(2, "0")}</span>
                      <span>{it.variant_name || it.title || `Item #${it.id}`}</span>
                    </div>
                    <div className="spec">{it.spec || ""}</div>
                    {/* Phase 1 §C — only render file chips when a real URL exists on the item.
                        arcModel.listItems does not expose per-item file URLs currently,
                        so the hard-coded phantom anchors are removed. If the data model
                        gains tds_url / spec_doc_url fields, wire them here. */}
                    {(it.tds_url || it.spec_doc_url) && (
                      <div className="product-meta-row">
                        {it.tds_url && (
                          <a href={it.tds_url} target="_blank" rel="noopener noreferrer" className="file-chip-mini">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            TDS · spec sheet
                          </a>
                        )}
                        {it.spec_doc_url && (
                          <a href={it.spec_doc_url} target="_blank" rel="noopener noreferrer" className="file-chip-mini">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            Spec document
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="qty-block-r">
                    <div className="lbl">Indicative qty</div>
                    <div className="val mono">{safeNum(it.committed_qty ?? it.indicative_qty ?? 0).toLocaleString("en-IN")}</div>
                    <div className="unit">{it.uom || ""}</div>
                  </div>
                </div>

                <div className="kv-row"><div className="kv-k">Item code</div><div className="kv-v mono"><span>{it.variant_slug || it.code || "—"}</span> · <span>{it.uom || ""}</span></div></div>
                <div className="kv-row"><div className="kv-k">Spec</div><div className="kv-v">{it.spec || "—"}</div></div>
                {/* Phase 1 §C — "Target price" removed from vendor technical view (buyer-internal) */}

                <div className="kv-row">
                  <div className="kv-k">Past 3-yr<br/>consumption</div>
                  <div className="kv-v">
                    <table className="past-3y-table">
                      <thead>
                        <tr>
                          <th>FY {(new Date().getFullYear()) - 3}</th>
                          <th className="right">FY {(new Date().getFullYear()) - 2}</th>
                          <th className="right">FY {(new Date().getFullYear()) - 1}</th>
                          <th className="right">3-yr avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono fw-600">{safeNum(it.past?.[0]).toLocaleString("en-IN")} {it.uom || ""}</td>
                          <td className="right">{safeNum(it.past?.[1]).toLocaleString("en-IN")}</td>
                          <td className="right">{safeNum(it.past?.[2]).toLocaleString("en-IN")}</td>
                          <td className="right" style={{ color: "var(--fg-3)" }}>
                            {Math.round((safeNum(it.past?.[0]) + safeNum(it.past?.[1]) + safeNum(it.past?.[2])) / 3).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="fs-11 text-fg-4 mt-2">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: -2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{" "}
                      Historical data drawn from past POs — for your demand-planning reference only.
                    </div>
                  </div>
                </div>

                {/* §1.3 FIX: two-envelope tech clause responses (free-text + evidence) */}
                {clauses.length > 0 && (
                  <div>
                    <div className="q-card-head" style={{ borderTop: "1px solid var(--border)" }}>
                      <h3>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        Technical evaluation
                      </h3>
                      <span className="count">
                        {clauses.filter(c => techResponses[c.clause_id] != null && String(techResponses[c.clause_id]).trim() !== "").length} of {clauses.length} responded
                        {techBlock?.minimum_passing_score != null && (
                          <> · min pass <span>{techBlock.minimum_passing_score}%</span></>
                        )}
                      </span>
                    </div>
                    {clauses.map((c, cidx) => {
                      const resp = techResponses[c.clause_id] ?? "";
                      const files = techFiles[c.clause_id] || [];
                      const answered = resp.trim().length > 0;
                      const uploadErr = uploadErrors?.[c.clause_id] || null;
                      return (
                        <div className={"clause" + (answered ? " is-answered" : "")} key={c.clause_id}>
                          <span className="clause-num">{String(cidx + 1).padStart(2, "0")}</span>
                          <div style={{ flex: 1 }}>
                            <div className="clause-text">{c.clause_text}</div>
                            <div className="clause-meta">
                              {c.weightage != null && (
                                <span className="c-weight-pill">weight <span className="mono">{c.weightage}</span> marks</span>
                              )}
                              {c.clause_type && <span className="pill">{c.clause_type}</span>}
                              {c.is_mandatory && <span className="pill warn">Mandatory</span>}
                            </div>
                            {!techSealed ? (
                              <div className="clause-actions" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                                <textarea
                                  className="textarea"
                                  style={{ width: "100%", minHeight: 72, fontSize: 13 }}
                                  value={resp}
                                  onChange={e => onChangeResponse(c.clause_id, e.target.value)}
                                  placeholder="Enter your response to this clause…"
                                  disabled={techSealed || readOnly}
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                  {files.map(f => (
                                    <span key={f.file_id} className="file-chip-mini flex items-center gap-1">
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", verticalAlign: "middle" }}
                                        title={f.original_name || f.url}
                                      >
                                        {(f.original_name || f.name || f.url?.split("/").pop() || "file").slice(0, 40)}
                                      </a>
                                      <button
                                        type="button"
                                        style={{ marginLeft: 4, color: "var(--fg-3)", background: "none", border: "none", cursor: "pointer", fontSize: 11 }}
                                        onClick={() => onDeleteEvidence(c.clause_id, f.file_id)}
                                        disabled={techBusy || readOnly}
                                        title="Remove"
                                      >✕</button>
                                    </span>
                                  ))}
                                  <label className="upload-mini" style={{ cursor: "pointer" }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                    Attach evidence
                                    <input
                                      type="file"
                                      style={{ display: "none" }}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) onUploadEvidence(c.clause_id, f); e.target.value = ""; }}
                                      disabled={techBusy || readOnly}
                                    />
                                  </label>
                                </div>
                                {/* Per-clause upload error — danger tone, inline below the upload control */}
                                {uploadErr && (
                                  <div className="guide danger" style={{ alignItems: "center", marginTop: 4, padding: "6px 10px" }}>
                                    <div className="g-ic" style={{ marginTop: 0 }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    </div>
                                    <div style={{ fontSize: 12 }}>{uploadErr}</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 12.5, color: "var(--fg-2)", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                                  {resp || <em style={{ color: "var(--fg-4)" }}>No response recorded</em>}
                                </div>
                                {files.length > 0 && (
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {files.map(f => (
                                      <a
                                        key={f.file_id}
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="file-chip-mini"
                                        style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}
                                        title={f.original_name || f.url}
                                      >
                                        {(f.original_name || f.name || f.url?.split("/").pop() || "evidence").slice(0, 40)}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {clauses.length === 0 && (
                  <div className="q-card-section" style={{ background: "var(--surface-2)", color: "var(--fg-3)", fontSize: 12.5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: -2 }}><circle cx="12" cy="12" r="10"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{" "}
                    No technical clauses for this item.
                  </div>
                )}
              </div>
            );
          })}

          {/* Guidance callout — kept for context; seal/save buttons moved to the action dock. */}
          {!techSealed && !readOnly && evalTotal > 0 && evalAnswered < evalTotal && (
            <div style={{ fontSize: 12.5, color: "var(--warn-fg, #92400e)", background: "var(--warn-bg, #fffbeb)", border: "1px solid var(--warn-border, #fde68a)", borderRadius: 6, padding: "8px 12px", marginTop: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: -2, marginRight: 5 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Respond to all {evalTotal} clauses before sealing — {evalAnswered} of {evalTotal} answered.
            </div>
          )}
        </div>
  );
}
