// Vendor quote submission — flat single-step version of the prototype's
// 3-step wizard. Loads the ARC's items + any draft quote and lets the
// vendor enter rate/lead-time per item, then submits.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  vendorGetRequestDetail, vendorSaveQuoteDraft, vendorSubmitQuote,
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
    })();
  }, [arcId]);

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

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Submit Quote</h1>
        <StatusBadge status={arc.status} />
      </div>
      <p style={{ color: "#6b7280", fontSize: 13 }}>
        {arc.arc_number} · {arc.title} · Submission ends {arc.submission_end_at ? new Date(arc.submission_end_at).toLocaleString() : "—"}
      </p>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Quote header</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12 }}>Payment terms<input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
          <label style={{ fontSize: 12 }}>GSTIN<input value={gstin} onChange={e => setGstin(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
        </div>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginTop: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Line items</h2>
        {items.map(it => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "2fr 100px 80px 100px", gap: 10, padding: "10px 0", borderTop: "1px solid #f3f4f6", alignItems: "center" }}>
            <ItemCard item={it} dense />
            <input placeholder="Rate" type="number" value={lines[it.id]?.rate ?? ""} onChange={e => setLines(l => ({ ...l, [it.id]: { ...(l[it.id] || {}), rate: e.target.value } }))} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
            <input placeholder="GST %" type="number" value={lines[it.id]?.gst_pct ?? ""} onChange={e => setLines(l => ({ ...l, [it.id]: { ...(l[it.id] || {}), gst_pct: e.target.value } }))} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
            <input placeholder="Lead days" type="number" value={lines[it.id]?.lead_time_days ?? ""} onChange={e => setLines(l => ({ ...l, [it.id]: { ...(l[it.id] || {}), lead_time_days: e.target.value } }))} style={{ padding: 7, border: "1px solid #d1d5db", borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button disabled={busy} onClick={onSaveDraft} style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "9px 16px", borderRadius: 7, cursor: "pointer" }}>Save draft</button>
        <button disabled={busy} onClick={onSubmit} style={{ background: "#2563eb", color: "white", padding: "9px 16px", border: 0, borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>
          {busy ? "Submitting…" : "Submit Quote"}
        </button>
      </div>
    </div>
  );
}
