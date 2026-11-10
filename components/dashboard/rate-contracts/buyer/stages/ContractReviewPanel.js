// Awarding stage — contract copies held for review before they go to vendors.
//
// After the committee approves, each awarded vendor's contract is generated
// as a DRAFT (contract status 'generated', ARC status 'contract_generated').
// Nothing reaches the vendors until a commercial evaluator (or ARC admin)
// checks every copy here and sends them. The server decides who may send
// (`can_send`) and re-checks on POST; this only controls what the UI offers.
//
// The preview is the exact document the vendor will sign, rendered by the
// server from the same template as the PDF. It is shown in a sandboxed
// iframe (no scripts, unique origin).

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as ArcApi from "@/services/arc_v2";

function fmtINR(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function initials(name) {
  if (!name) return "··";
  return String(name).trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function errMsg(e, fallback) {
  return e?.response?.data?.message || e?.message?.response?.data?.message || (typeof e?.message === "string" ? e.message : null) || fallback;
}

const CONTRACT_STATUS = {
  generated:           { label: "Draft · not sent",          tone: "warn" },
  awaiting_acceptance: { label: "Sent · awaiting signature", tone: "info" },
  clarification:       { label: "Clarification raised",      tone: "warn" },
  active:              { label: "Signed",                    tone: "success" },
  declined:            { label: "Declined",                  tone: "danger" },
};

function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);
const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

export default function ContractReviewPanel({ arcId, onSent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [previewFor, setPreviewFor] = useState(null);   // contract row
  const [preview, setPreview] = useState(null);         // { html, contract: { document_s3_url, … } }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const load = useCallback(async () => {
    const res = await ArcApi.getContractReview(arcId);
    setData(res?.data || null);
  }, [arcId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Failed to load the contract copies"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const contracts = useMemo(() => data?.contracts || [], [data]);
  const drafts = contracts.filter((c) => c.status === "generated");
  const canSend = !!data?.can_send;

  async function openPreview(contract) {
    setPreviewFor(contract);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const res = await ArcApi.getContractPreview(arcId, contract.id);
      setPreview(res?.data || null);
    } catch (e) {
      setPreviewError(errMsg(e, "Could not load the contract preview"));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function send() {
    setSending(true);
    setSendError(null);
    try {
      const res = await ArcApi.sendContracts(arcId, { contract_ids: drafts.map((c) => c.id) });
      setConfirmOpen(false);
      const sent = res?.data?.sent || [];
      if (onSent) await onSent(sent);
    } catch (e) {
      setSendError(errMsg(e, "Sending failed"));
      // A replay (someone else sent first) leaves nothing to send: reload so
      // the cards show the real state.
      try { await load(); } catch (_) { /* keep the error visible */ }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="guide"><div>Loading contract copies…</div></div>;
  }
  if (error) {
    return <div className="guide danger"><div>{error}</div></div>;
  }

  return (
    <section aria-label="Contract copies" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Contract copies</h2>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
            One per awarded vendor. Open each copy and check the items, rates and terms.
            {drafts.length > 0
              ? <> <strong>Nothing has been sent to the vendors yet.</strong></>
              : <> All copies have been sent.</>}
          </div>
        </div>
        {drafts.length > 0 && canSend && (
          <button type="button" className="btn btn-primary" onClick={() => { setSendError(null); setConfirmOpen(true); }}>
            <SendIcon /> Send to {drafts.length} vendor{drafts.length === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {drafts.length > 0 && !canSend && (
        <div className="guide" style={{ alignItems: "center" }}>
          <div>
            <strong>View only.</strong> A commercial evaluator or ARC admin sends these contracts to the vendors.
          </div>
        </div>
      )}
      {sendError && !confirmOpen && (
        <div className="guide danger" role="alert"><div>{sendError}</div></div>
      )}

      {contracts.length === 0 && (
        <div className="empty-state"><h2>No contracts were generated</h2></div>
      )}

      {contracts.map((c) => {
        const st = CONTRACT_STATUS[c.status] || { label: c.status, tone: "neutral" };
        const lines = c.lines || [];
        return (
          <div key={c.id} data-testid={`contract-copy-${c.id}`} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div className="sr-av">{initials(c.vendor_name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{c.vendor_name || `Vendor ${c.vendor_id}`}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                    {lines.length} item{lines.length === 1 ? "" : "s"} · <span className="mono">{fmtINR(c.committed_value)}</span> committed (excl. taxes)
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`status-pill ${st.tone}`} style={{ fontSize: 10.5 }}><span className="dot" />{st.label}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openPreview(c)}>
                  <DocIcon /> Preview contract
                </button>
              </div>
            </div>
            {lines.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)", overflowX: "auto" }}>
                <table className="table" aria-label={`Items for ${c.vendor_name || `vendor ${c.vendor_id}`}`} style={{ width: "100%", fontSize: 12, margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 16px" }}>Item</th>
                      <th style={{ textAlign: "right", padding: "8px 10px" }}>Committed qty</th>
                      <th style={{ textAlign: "right", padding: "8px 10px" }}>Rate</th>
                      <th style={{ textAlign: "right", padding: "8px 10px" }}>GST</th>
                      <th style={{ textAlign: "left", padding: "8px 16px" }}>Payment terms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td style={{ padding: "8px 16px" }}>{l.variant_name || `Item #${l.arc_item_id}`}</td>
                        <td className="mono" style={{ textAlign: "right", padding: "8px 10px" }}>{Number(l.committed_qty || 0).toLocaleString("en-IN")} {l.uom || ""}</td>
                        <td className="mono" style={{ textAlign: "right", padding: "8px 10px" }}>{fmtINR(l.unit_rate)}</td>
                        <td className="mono" style={{ textAlign: "right", padding: "8px 10px" }}>{l.gst_pct == null ? "—" : `${l.gst_pct}%`}</td>
                        <td style={{ padding: "8px 16px" }}>{l.payment_terms || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Preview modal — the exact contract document the vendor will sign. */}
      {previewFor && (
        <Portal>
          <div className="arc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPreviewFor(null); }}>
            <div className="arc-modal xl" role="dialog" aria-label={`Contract copy for ${previewFor.vendor_name || "vendor"}`}>
              <div className="modal-head">
                <div style={{ minWidth: 0 }}>
                  <div className="t"><h3>Contract copy · {previewFor.vendor_name || `Vendor ${previewFor.vendor_id}`}</h3></div>
                  <div className="sub" style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
                    {previewFor.status === "generated"
                      ? "Draft — this is exactly what the vendor will be asked to sign once you send it."
                      : "The copy the vendor received."}
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setPreviewFor(null)} aria-label="Close"><CloseIcon /></button>
              </div>
              <div className="modal-body" style={{ padding: 0, background: "var(--surface-2)" }}>
                {previewLoading && <div style={{ padding: 24, fontSize: 13 }}>Loading preview…</div>}
                {previewError && <div className="guide danger" style={{ margin: 16 }}><div>{previewError}</div></div>}
                {preview?.html && (
                  <iframe
                    title="Contract preview"
                    sandbox=""
                    srcDoc={preview.html}
                    style={{ width: "100%", height: "70vh", border: 0, background: "white", display: "block" }}
                  />
                )}
              </div>
              <div className="modal-foot" style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--fg-3)", alignSelf: "center" }}>
                  {preview && !preview.contract?.document_s3_url ? "The PDF is still being prepared; this preview is the same document." : null}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {preview?.contract?.document_s3_url && (
                    <a className="btn btn-ghost btn-sm" href={preview.contract.document_s3_url} target="_blank" rel="noopener noreferrer">Open PDF</a>
                  )}
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setPreviewFor(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Send confirmation. */}
      {confirmOpen && (
        <Portal>
          <div className="arc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !sending) setConfirmOpen(false); }}>
            <div className="arc-modal" role="dialog" aria-label="Send contracts to vendors">
              <div className="modal-head">
                <div className="t"><h3>Send contracts to vendors?</h3></div>
                <button type="button" className="icon-btn" onClick={() => setConfirmOpen(false)} disabled={sending} aria-label="Close"><CloseIcon /></button>
              </div>
              <div className="modal-body" style={{ padding: "16px 22px", fontSize: 13, lineHeight: 1.55 }}>
                <p style={{ marginTop: 0 }}>
                  {drafts.length === 1 ? "This vendor" : `These ${drafts.length} vendors`} will get an email and can review and sign by OTP:
                </p>
                <ul style={{ paddingLeft: 18, margin: "0 0 12px" }}>
                  {drafts.map((c) => <li key={c.id}><strong>{c.vendor_name || `Vendor ${c.vendor_id}`}</strong> · {fmtINR(c.committed_value)}</li>)}
                </ul>
                <p style={{ marginBottom: 0, color: "var(--fg-3)" }}>Once sent, a copy can only change through a vendor clarification or an amendment.</p>
                {sendError && <div className="guide danger" role="alert" style={{ marginTop: 12 }}><div>{sendError}</div></div>}
              </div>
              <div className="modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={send} disabled={sending}>
                  <SendIcon /> {sending ? "Sending…" : "Send now"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </section>
  );
}
