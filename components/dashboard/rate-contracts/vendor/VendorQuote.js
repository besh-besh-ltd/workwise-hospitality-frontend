// Vendor quote submission — two-envelope flow.
//   1. Technical Envelope — per-item clauses: write a response per clause +
//      upload evidence files, then SEAL it. When the ARC requires technical
//      responses this MUST be sealed before the commercial quote can be sent
//      (hard two-step — RESOLVED DECISION 1).
//   2. Commercial Quote — rate / gst / lead-time per item (existing flow).

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  vendorGetRequestDetail, vendorSaveQuoteDraft, vendorSubmitQuote,
  vendorGetTechClauses, vendorSaveTechEnvelopeDraft, vendorUploadTechEvidence,
  vendorDeleteTechEvidence, vendorSubmitTechEnvelope,
} from "@/services/arc_v2";
import StatusBadge from "@/components/dashboard/rate-contracts/shared/StatusBadge";
import ItemCard from "@/components/dashboard/rate-contracts/shared/ItemCard";

export default function VendorQuote({ arcId }) {
  const router = useRouter();
  const [arc, setArc] = useState(null);
  const [items, setItems] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [gstin, setGstin] = useState("");
  const [lines, setLines] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // ── Technical envelope state ──
  const [techRequired, setTechRequired] = useState(false);
  const [techItems, setTechItems] = useState([]);          // [{ arc_item_id, clauses: [...] }]
  const [techResponses, setTechResponses] = useState({});  // { [clauseId]: vendor_response }
  const [techFiles, setTechFiles] = useState({});          // { [clauseId]: [{file_id,url}] }
  const [techSubmittedAt, setTechSubmittedAt] = useState(null);
  const [techBusy, setTechBusy] = useState(false);
  const [techError, setTechError] = useState(null);

  const techSealed = !!techSubmittedAt;

  async function loadTechEnvelope() {
    try {
      const res = await vendorGetTechClauses(arcId);
      const d = res?.data || {};
      setTechSubmittedAt(d.tech_submitted_at || null);
      setTechItems(d.items || []);
      const r = {}, f = {};
      for (const it of d.items || []) {
        for (const cl of it.clauses || []) {
          if (cl.vendor_response != null) r[cl.clause_id] = cl.vendor_response;
          if (Array.isArray(cl.files)) f[cl.clause_id] = cl.files;
        }
      }
      setTechResponses(r);
      setTechFiles(f);
    } catch (e) {
      // tech-clauses 403 (not invited) is surfaced by the page guard; ignore here.
    }
  }

  useEffect(() => {
    if (!arcId) return;
    (async () => {
      const res = await vendorGetRequestDetail(arcId);
      setArc(res?.data?.arc);
      setItems(res?.data?.items || []);
      setPaymentTerms(res?.data?.quote?.payment_terms || "");
      setGstin(res?.data?.quote?.gstin_used || "");
      const seed = {};
      for (const l of res?.data?.lines || []) {
        seed[l.arc_item_id] = { rate: l.rate || "", gst_pct: l.gst_pct || "", lead_time_days: l.lead_time_days || "" };
      }
      setLines(seed);
      const te = res?.data?.tech_envelope;
      const required = !!te?.required;
      setTechRequired(required);
      setTechSubmittedAt(te?.tech_submitted_at || null);
      if (required) await loadTechEnvelope();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcId]);

  // ── Technical envelope handlers ──
  const onSaveTechDraft = async () => {
    setTechBusy(true); setTechError(null);
    try {
      const responses = [];
      for (const it of techItems) {
        for (const cl of it.clauses || []) {
          responses.push({ clause_id: cl.clause_id, vendor_response: techResponses[cl.clause_id] ?? "" });
        }
      }
      await vendorSaveTechEnvelopeDraft({ arc_id: Number(arcId), responses });
    } catch (e) { setTechError(e?.response?.data?.message || e?.message); }
    finally { setTechBusy(false); }
  };

  const onUploadEvidence = async (clauseId, file) => {
    if (!file) return;
    setTechBusy(true); setTechError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await vendorUploadTechEvidence(clauseId, fd);
      const f = res?.data?.file;
      if (f) setTechFiles((prev) => ({ ...prev, [clauseId]: [...(prev[clauseId] || []), f] }));
    } catch (e) { setTechError(e?.response?.data?.message || e?.message); }
    finally { setTechBusy(false); }
  };

  const onDeleteEvidence = async (clauseId, fileId) => {
    setTechBusy(true); setTechError(null);
    try {
      await vendorDeleteTechEvidence(fileId);
      setTechFiles((prev) => ({ ...prev, [clauseId]: (prev[clauseId] || []).filter((f) => f.file_id !== fileId) }));
    } catch (e) { setTechError(e?.response?.data?.message || e?.message); }
    finally { setTechBusy(false); }
  };

  const onSubmitTech = async () => {
    setTechBusy(true); setTechError(null);
    try {
      await onSaveTechDraft();
      const res = await vendorSubmitTechEnvelope(Number(arcId));
      setTechSubmittedAt(res?.data?.tech_submitted_at || new Date().toISOString());
    } catch (e) { setTechError(e?.response?.data?.message || e?.message); }
    finally { setTechBusy(false); }
  };

  const onSaveDraft = async () => {
    setBusy(true); setError(null);
    try {
      await vendorSaveQuoteDraft({
        arc_id: Number(arcId),
        payment_terms: paymentTerms,
        gstin_used: gstin,
        lines: items.map(it => ({
          arc_item_id: it.id,
          rate: Number(lines[it.id]?.rate) || null,
          gst_pct: Number(lines[it.id]?.gst_pct) || null,
          lead_time_days: Number(lines[it.id]?.lead_time_days) || null,
        })),
      });
    } catch (e) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const onSubmit = async () => {
    setBusy(true); setError(null);
    try {
      await onSaveDraft();
      await vendorSubmitQuote(Number(arcId));
      router.push("/dashboard/vendor/rate-contracts/requests?tab=submitted");
    } catch (e) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  if (!arc) return <div style={{ padding: 24 }}>Loading…</div>;

  // Commercial submit is HARD-BLOCKED until the technical envelope is sealed
  // when the ARC requires technical responses.
  const commercialLocked = techRequired && !techSealed;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Submit Quote</h1>
        <StatusBadge status={arc.status} />
      </div>
      <p style={{ color: "#6b7280", fontSize: 13 }}>
        {arc.arc_number} · {arc.title} · Submission ends {arc.submission_end_at ? new Date(arc.submission_end_at).toLocaleString() : "—"}
      </p>

      {/* ── TECHNICAL ENVELOPE ── */}
      {techRequired && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Technical Envelope</h2>
            {techSealed
              ? <span style={{ fontSize: 12, fontWeight: 600, color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 999, padding: "3px 10px" }}>
                  Submitted on {new Date(techSubmittedAt).toLocaleString()}
                </span>
              : <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px" }}>
                  Seal this before submitting your commercial quote
                </span>}
          </div>
          <p style={{ color: "#6b7280", fontSize: 12.5, marginTop: 6 }}>
            Respond to each technical clause and upload supporting evidence. Once you submit the technical envelope it is sealed and cannot be edited.
            Mandatory clauses are pass/fail gates — failing one disqualifies you for that item.
          </p>

          {techItems.map((it) => (
            <div key={it.arc_item_id} style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                {/* Sr 51 — defensive display clamp: pre-cap rows can still hold stale
                    values (e.g. 500) until the data-cleanup migration runs. */}
                Item #{it.arc_item_id}{it.minimum_passing_score != null ? ` · Min pass ${Math.min(100, Number(it.minimum_passing_score) || 0)}%` : ""}
              </div>
              {(it.clauses || []).map((cl) => (
                <div key={cl.clause_id} style={{ marginTop: 10, padding: 10, border: "1px solid #f1f5f9", borderRadius: 8, background: "#fbfdff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{cl.clause_text}</span>
                    {cl.is_mandatory && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 999, padding: "1px 8px" }}>
                        Mandatory
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7280" }}>
                      {cl.clause_type || "text"} · weight {cl.weightage}
                    </span>
                  </div>
                  <textarea
                    value={techResponses[cl.clause_id] ?? ""}
                    disabled={techSealed}
                    placeholder="Your response to this clause…"
                    onChange={(e) => setTechResponses((r) => ({ ...r, [cl.clause_id]: e.target.value }))}
                    style={{ width: "100%", marginTop: 8, minHeight: 56, padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", resize: "vertical", background: techSealed ? "#f9fafb" : "white" }}
                  />
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {(techFiles[cl.clause_id] || []).map((f) => (
                      <span key={f.file_id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "3px 8px" }}>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || ""}${f.url}`} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                          Evidence #{f.file_id}
                        </a>
                        {!techSealed && (
                          <button type="button" onClick={() => onDeleteEvidence(cl.clause_id, f.file_id)} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>×</button>
                        )}
                      </span>
                    ))}
                    {!techSealed && (
                      <label style={{ fontSize: 11.5, color: "#374151", cursor: "pointer", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "4px 9px" }}>
                        + Upload evidence
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          style={{ display: "none" }}
                          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; onUploadEvidence(cl.clause_id, file); }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {techError && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, marginTop: 12 }}>{techError}</div>}

          {!techSealed && (
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button disabled={techBusy} onClick={onSaveTechDraft} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "9px 16px", borderRadius: 7, cursor: "pointer" }}>
                Save technical draft
              </button>
              <button disabled={techBusy} onClick={onSubmitTech} style={{ background: "#7c3aed", color: "white", padding: "9px 16px", border: 0, borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>
                {techBusy ? "Submitting…" : "Submit technical envelope"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── COMMERCIAL QUOTE ── */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14, opacity: commercialLocked ? 0.6 : 1 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Quote header</h2>
        {commercialLocked && (
          <div style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 12.5 }}>
            Submit your technical envelope first. The commercial quote unlocks once the technical envelope is sealed.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12 }}>Payment terms<input disabled={commercialLocked} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
          <label style={{ fontSize: 12 }}>GSTIN<input disabled={commercialLocked} value={gstin} onChange={e => setGstin(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14, opacity: commercialLocked ? 0.6 : 1 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Line items</h2>
        {items.map(it => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "2fr 100px 80px 100px", gap: 10, padding: "10px 0", borderTop: "1px solid #f3f4f6", alignItems: "center" }}>
            <ItemCard item={it} dense />
            <input placeholder="Rate" type="number" disabled={commercialLocked} value={lines[it.id]?.rate ?? ""} onChange={e => setLines(l => ({ ...l, [it.id]: { ...(l[it.id] || {}), rate: e.target.value } }))} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
            <input placeholder="GST %" type="number" disabled={commercialLocked} value={lines[it.id]?.gst_pct ?? ""} onChange={e => setLines(l => ({ ...l, [it.id]: { ...(l[it.id] || {}), gst_pct: e.target.value } }))} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
            <input placeholder="Lead days" type="number" disabled={commercialLocked} value={lines[it.id]?.lead_time_days ?? ""} onChange={e => setLines(l => ({ ...l, [it.id]: { ...(l[it.id] || {}), lead_time_days: e.target.value } }))} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button disabled={busy || commercialLocked} onClick={onSaveDraft} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "9px 16px", borderRadius: 7, cursor: commercialLocked ? "not-allowed" : "pointer" }}>Save draft</button>
        <button disabled={busy || commercialLocked} onClick={onSubmit} title={commercialLocked ? "Seal your technical envelope first" : ""} style={{ background: commercialLocked ? "#93c5fd" : "#2563eb", color: "white", padding: "9px 16px", border: 0, borderRadius: 7, fontWeight: 600, cursor: commercialLocked ? "not-allowed" : "pointer" }}>
          {busy ? "Submitting…" : "Submit Quote"}
        </button>
      </div>
    </div>
  );
}
