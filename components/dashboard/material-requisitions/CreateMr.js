// MR creation wizard. The picker uses searchContractedItems — the only way
// items can be added to an MR in Phase A (contracted-items-only).

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createDraft, submit, searchContractedItems } from "@/services/mr";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";

export default function CreateMr() {
  const router = useRouter();
  const ctx = typeof window !== "undefined" ? getStoredHospitalityContext() : {};
  const [form, setForm] = useState({
    title: "",
    hospitality_company_id: ctx?.hospitality_company_id || "",
    hotel_id: ctx?.hospitality_hotel_id || "",
    department_id: "",
    cost_center: "",
    urgency: "normal",
    required_by_date: "",
    justification: "",
    delivery_location: "",
  });
  const [query, setQuery]   = useState("");
  const [picker, setPicker] = useState([]);
  const [items, setItems]   = useState([]);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);

  // Re-fetch picker whenever hotel/dept/query changes.
  useEffect(() => {
    if (!form.hotel_id || !form.department_id) return;
    let cancelled = false;
    (async () => {
      const res = await searchContractedItems({
        hotel_id: Number(form.hotel_id),
        department_id: Number(form.department_id),
        q: query || null,
        limit: 50,
      });
      if (!cancelled) setPicker(res?.data?.items || []);
    })();
    return () => { cancelled = true; };
  }, [form.hotel_id, form.department_id, query]);

  const addItem = (row) => {
    setItems(prev => ([
      ...prev,
      {
        product_variant_id: row.product_variant_id,
        arc_contract_id: row.arc_contract_id,
        arc_contract_line_id: row.arc_contract_line_id,
        matched_unit_rate: row.current_rate,
        uom: row.uom,
        quantity: 1,
        _label: `${row.variant_name} from ${row.vendor_name}`,
      },
    ]));
  };
  const updateQty = (i, qty) => setItems(it => it.map((row, idx) => idx === i ? { ...row, quantity: Number(qty) } : row));
  const removeRow = (i) => setItems(it => it.filter((_, idx) => idx !== i));

  const submitMr = async () => {
    setBusy(true); setError(null);
    try {
      const draft = await createDraft({ ...form, items });
      const mrId = draft?.data?.mr?.id;
      await submit(mrId);
      router.push(`/dashboard/buyer/material-requisitions/${mrId}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Submit failed");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Raise Material Requisition</h1>
      <p style={{ color: "#6b7280", fontSize: 13 }}>Pick contracted items for your hotel + department — non-contracted items can't be added in this release.</p>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginTop: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>MR details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12 }}>Title<input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
          <label style={{ fontSize: 12 }}>Hotel ID<input type="number" value={form.hotel_id} onChange={e => setForm(f => ({ ...f, hotel_id: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
          <label style={{ fontSize: 12 }}>Department ID<input type="number" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
          <label style={{ fontSize: 12 }}>Urgency
            <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}>
              <option>low</option><option>normal</option><option>urgent</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>Required By<input type="date" value={form.required_by_date} onChange={e => setForm(f => ({ ...f, required_by_date: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
          <label style={{ fontSize: 12 }}>Cost Center<input value={form.cost_center} onChange={e => setForm(f => ({ ...f, cost_center: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
        </div>
        <label style={{ fontSize: 12, display: "block", marginTop: 10 }}>Justification<textarea rows="2" value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginTop: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Item picker (contracted-only)</h2>
        <input
          placeholder="Search contracted items…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: "100%", padding: 9, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
        />
        <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 10 }}>
          {picker.length === 0 && <div style={{ color: "#6b7280", padding: 12, fontSize: 12.5 }}>
            No contracted items for the selected hotel × department.
          </div>}
          {picker.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "8px 0", borderTop: "1px solid #f3f4f6", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{row.variant_name}</div>
                <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                  {row.vendor_name} · ₹{row.current_rate}/{row.uom} · remaining {row.remaining_qty} · ARC {row.arc_number}
                </div>
              </div>
              <button onClick={() => addItem(row)}
                      style={{ background: "#eef4ff", color: "#1d4ed8", border: 0, padding: "4px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                Add
              </button>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 12.5, marginTop: 16, color: "#6b7280" }}>MR items</h3>
        {items.length === 0 && <div style={{ color: "#6b7280", fontSize: 12.5 }}>None added yet.</div>}
        {items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 10, padding: "6px 0", fontSize: 13, borderTop: "1px solid #f3f4f6" }}>
            <span>{it._label}</span>
            <input type="number" value={it.quantity} onChange={e => updateQty(i, e.target.value)} style={{ padding: 5, border: "1px solid #d1d5db", borderRadius: 5 }} />
            <button onClick={() => removeRow(i)} style={{ background: "#fee2e2", border: 0, borderRadius: 5, cursor: "pointer" }}>×</button>
          </div>
        ))}
      </div>

      {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 8, marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        <button disabled={busy || items.length === 0 || !form.title} onClick={submitMr}
                style={{ background: "#2563eb", color: "white", padding: "10px 18px", border: 0, borderRadius: 8, fontWeight: 600, cursor: "pointer", opacity: busy || items.length === 0 ? 0.5 : 1 }}>
          {busy ? "Submitting…" : "Submit MR"}
        </button>
      </div>
    </div>
  );
}
