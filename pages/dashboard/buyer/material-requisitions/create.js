// Buyer · Raise Material Requisition (ARC v2)
// Ported from prototypes/arc_ui/mr-create.html.
//
// The picker is wired to MrApi.searchContractedItems (debounced 250ms) — the only
// source of truth for which items can be added to an MR (contracted-only Phase A).
// Save flow: MrApi.createDraft on "Save as draft"; createDraft + submit on
// "Submit for approval". Hotels come from getHospitalityHotels; departments from
// the RBAC departments endpoint, scoped to the chosen hotel.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as MrApi from "@/services/mr";
import { getDepartments } from "@/services/rbac";
import { getHospitalityHotels } from "@/services/hospitality";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";

// ============================================================
// Inline SVG icons (Lucide-style — match prototype stroke language)
// ============================================================
const Icon = {
  cog: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  box: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  paperclip: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  bubble: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  check: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  workflow: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
    </svg>
  ),
  alert: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  search: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  x: (s = 13) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  plus: (s = 12) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  trash: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--danger)" }}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    </svg>
  ),
  upload: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  ),
  arrowRight: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
};

// Indian-rupee Lakh formatter, mirroring the prototype's ARC.fmtL helper.
const fmtL = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000)  return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};


export default function CreateMrPage() {
  const router = useRouter();
  const ctx = useMemo(
    () => (typeof window !== "undefined" ? getStoredHospitalityContext() : null),
    []
  );

  // ----- Form state -------------------------------------------------------
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

  // Each item line drives both the picker dropdown and the cart.
  // A "row" is either:
  //   - empty (no product_variant_id) — shows the search picker
  //   - picked — shows the chip + qty/note
  const [items, setItems] = useState([
    { product_variant_id: "", quantity: "", note: "" },
  ]);

  // Hotels + departments dropdowns
  const [hotels, setHotels] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Picker UI state (one debounced query shared, scoped by activePickerIdx)
  const [activePickerIdx, setActivePickerIdx] = useState(-1);
  const [pickerQuery, setPickerQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Submit state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // ----- Load hotels for the dropdown ------------------------------------
  useEffect(() => {
    if (!form.hospitality_company_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getHospitalityHotels(form.hospitality_company_id);
        if (cancelled) return;
        const list = res?.data?.hotels || res?.data || res?.hotels || [];
        setHotels(Array.isArray(list) ? list : []);
      } catch (_) {
        if (!cancelled) setHotels([]);
      }
    })();
    return () => { cancelled = true; };
  }, [form.hospitality_company_id]);

  // ----- Load departments when hotel changes -----------------------------
  useEffect(() => {
    if (!form.hotel_id) {
      setDepartments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getDepartments({ hotel_id: form.hotel_id });
        if (cancelled) return;
        const list =
          res?.data?.departments || res?.data || res?.departments || [];
        setDepartments(Array.isArray(list) ? list : []);
      } catch (_) {
        if (!cancelled) setDepartments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [form.hotel_id]);

  // ----- Debounce picker query (250ms) -----------------------------------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(pickerQuery), 250);
    return () => clearTimeout(t);
  }, [pickerQuery]);

  // ----- Fetch picker whenever hotel/department/debounced-query changes --
  useEffect(() => {
    if (!form.hotel_id || !form.department_id) {
      setPickerResults([]);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    (async () => {
      try {
        const res = await MrApi.searchContractedItems({
          hotel_id: Number(form.hotel_id),
          department_id: Number(form.department_id),
          q: debouncedQuery || null,
          limit: 25,
        });
        if (cancelled) return;
        setPickerResults(res?.data?.items || res?.items || []);
      } catch (_) {
        if (!cancelled) setPickerResults([]);
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.hotel_id, form.department_id, debouncedQuery]);

  // ----- Form helpers ----------------------------------------------------
  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Urgency is NOT user-chosen — it's derived from the Required-by date:
  //   ≤ 5 days → urgent · 6–14 days → normal · > 14 days → low
  const deriveUrgency = (dateStr) => {
    if (!dateStr) return "";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    const days = Math.ceil((target - today) / 86400000);
    if (days <= 5) return "urgent";
    if (days <= 14) return "normal";
    return "low";
  };
  useEffect(() => {
    setForm((f) => {
      const u = deriveUrgency(f.required_by_date);
      return f.urgency === u ? f : { ...f, urgency: u };
    });
  }, [form.required_by_date]);

  // Real routing preview — the resolved MR approval chain for the chosen BU.
  const [routing, setRouting] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const params = {};
    if (form.hospitality_company_id) params.hospitality_company_id = form.hospitality_company_id;
    if (form.hotel_id) params.hotel_id = form.hotel_id;
    MrApi.getApprovalPreview(params)
      .then((res) => { if (!cancelled) setRouting(res?.data || res || null); })
      .catch(() => { if (!cancelled) setRouting(null); });
    return () => { cancelled = true; };
  }, [form.hotel_id, form.hospitality_company_id]);

  const addItemRow = () =>
    setItems((rows) => [...rows, { product_variant_id: "", quantity: "", note: "" }]);

  const removeItemRow = (idx) =>
    setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows));

  const pickItem = (idx, row) => {
    setItems((rows) =>
      rows.map((r, i) =>
        i === idx
          ? {
              ...r,
              product_variant_id: row.product_variant_id,
              arc_contract_id: row.arc_contract_id,
              arc_contract_line_id: row.arc_contract_line_id,
              matched_unit_rate: row.current_rate,
              uom: row.uom,
              variant_name: row.variant_name,
              variant_slug: row.variant_slug,
              vendor_id: row.vendor_id,
              vendor_name: row.vendor_name,
              arc_id: row.arc_id,
              arc_number: row.arc_number,
              arc_title: row.arc_title,
              remaining_qty: row.remaining_qty,
            }
          : r
      )
    );
    setActivePickerIdx(-1);
    setPickerQuery("");
  };

  const clearPickedItem = (idx) =>
    setItems((rows) =>
      rows.map((r, i) =>
        i === idx ? { product_variant_id: "", quantity: r.quantity, note: r.note } : r
      )
    );

  const updateRowField = (idx, key, val) =>
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  // ----- Derived ---------------------------------------------------------
  // All items that come from searchContractedItems are by definition matched
  // to an active ARC contract — so any picked row is "ARC-matched".
  const filledRows  = items.filter((r) => r.product_variant_id);
  const matchedRows = filledRows; // contracted-only Phase A
  const totalEst    = filledRows.reduce(
    (s, r) => s + (Number(r.matched_unit_rate) || 0) * (Number(r.quantity) || 0),
    0
  );
  const fastTrackable = filledRows.length > 0;

  const canSubmit =
    !!form.title &&
    !!form.hotel_id &&
    !!form.department_id &&
    !!form.required_by_date &&
    filledRows.some((r) => Number(r.quantity) > 0);

  // ----- Toast helper ----------------------------------------------------
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };

  // ----- Submit / save draft --------------------------------------------
  const payloadFromState = () => {
    const cleanItems = filledRows
      .filter((r) => Number(r.quantity) > 0)
      .map((r) => ({
        product_variant_id: r.product_variant_id,
        arc_contract_id: r.arc_contract_id,
        arc_contract_line_id: r.arc_contract_line_id,
        matched_unit_rate: r.matched_unit_rate,
        uom: r.uom,
        quantity: Number(r.quantity),
        note: r.note || null,
      }));
    return {
      title: form.title,
      hospitality_company_id: form.hospitality_company_id
        ? Number(form.hospitality_company_id)
        : null,
      hotel_id: form.hotel_id ? Number(form.hotel_id) : null,
      department_id: form.department_id ? Number(form.department_id) : null,
      cost_center: form.cost_center || null,
      urgency: form.urgency,
      required_by_date: form.required_by_date || null,
      justification: form.justification,
      delivery_location: form.delivery_location || null,
      items: cleanItems,
    };
  };

  const handleSubmit = async (asDraft) => {
    if (!asDraft && !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const draft = await MrApi.createDraft(payloadFromState());
      const mrId = draft?.data?.mr?.id || draft?.mr?.id;
      if (!asDraft && mrId) {
        await MrApi.submit(mrId);
      }
      showToast(asDraft ? "MR saved as draft" : "MR submitted · routed for Department approval");
      setTimeout(() => {
        if (mrId) router.push(`/dashboard/buyer/material-requisitions/${mrId}`);
        else router.push(`/dashboard/buyer/material-requisitions`);
      }, 1100);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save MR");
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <>
      <style jsx>{`
        .mr-form-grid { display:grid; grid-template-columns: 1fr 320px; gap:18px; align-items:flex-start; }
        @media (max-width:1000px){ .mr-form-grid { grid-template-columns:1fr; } }
        .mr-aside { position:sticky; top:78px; display:flex; flex-direction:column; gap:14px; }
        @media (max-width:1000px){ .mr-aside { position:static; } }

        .item-line { display:grid; grid-template-columns: 1fr 140px 1fr 50px; gap:10px; align-items:flex-start; padding:14px 16px; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; }
        .item-line + .item-line { margin-top:10px; }
        .item-line .il-arc { grid-column: 1 / -1; padding:8px 12px; background:var(--success-tint); border:1px solid rgba(21,128,61,0.22); border-radius:8px; font-size:11.5px; color:var(--success); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .item-line .il-arc.no-match { background:var(--surface-3); border-color:var(--border); color:var(--fg-3); }
        .item-line .il-arc strong { color:var(--success); font-weight:700; }
        .item-line .il-arc.no-match strong { color:var(--fg-2); }

        .urgency-row { display:flex; gap:9px; flex-wrap:wrap; }
        .urg-card { flex:1; min-width:120px; padding:11px 14px; border:1.5px solid var(--border); border-radius:10px; background:var(--surface); cursor:pointer; transition:all 0.13s ease; }
        .urg-card:not(.readonly):hover { border-color:var(--border-strong); }
        .urg-card.readonly { cursor:default; opacity:0.55; }
        .urg-card.readonly.sel { opacity:1; }
        .urg-card.sel.normal { border-color:var(--primary); background:var(--primary-tint); }
        .urg-card.sel.urgent { border-color:var(--danger); background:var(--danger-soft); }
        .urg-card.sel.low { border-color:var(--success); background:var(--success-tint); }
        .urg-card .u-name { font-size:13px; font-weight:600; color:var(--fg); }
        .urg-card .u-desc { margin-top:3px; font-size:11px; color:var(--fg-3); }

        .mini-summary-row { display:flex; justify-content:space-between; gap:10px; padding:9px 0; font-size:12.5px; border-bottom:1px dashed var(--border); }
        .mini-summary-row:last-of-type { border-bottom:none; }
        .mini-summary-row .ms-k { color:var(--fg-3); }
        .mini-summary-row .ms-v { font-family:'Geist Mono',monospace; font-weight:600; color:var(--fg); }
      `}</style>

      <div className="main-body" style={{ paddingBottom: 108 }}>
        <div>
          <h1 className="page-h1">Raise Material Requisition</h1>
          <p className="page-sub">
            Internal demand request. If items match an active ARC, the MR fast-tracks to a
            released PO after category approval.
          </p>
        </div>

        <div className="mr-form-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

            {/* Requisition basics --------------------------------------- */}
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">{Icon.cog(14)}</div>
                  <div>
                    <h2>Requisition basics</h2>
                    <div className="h-sub">Title, scope, urgency, comment</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="form-grid">
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Title <span className="req">*</span></label>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      placeholder="e.g. Restock Basmati Rice · BAB"
                    />
                  </div>
                  <div>
                    <label className="label">Hotel <span className="req">*</span></label>
                    <select
                      className="select"
                      value={form.hotel_id || ""}
                      onChange={(e) => {
                        setField("hotel_id", e.target.value);
                        setField("department_id", "");
                      }}
                    >
                      <option value="">Select hotel…</option>
                      {hotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.code ? `${h.code} · ${h.name || h.title}` : (h.name || h.title || `Hotel ${h.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Department <span className="req">*</span></label>
                    <select
                      className="select"
                      value={form.department_id || ""}
                      onChange={(e) => setField("department_id", e.target.value)}
                      disabled={!form.hotel_id}
                    >
                      <option value="">{form.hotel_id ? "Select department…" : "Pick a hotel first"}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title || d.name || `Dept ${d.id}`}
                        </option>
                      ))}
                    </select>
                    <div className="help-text">Drives the contracted-item catalogue below</div>
                  </div>
                  <div>
                    <label className="label">Required by <span className="req">*</span></label>
                    <input
                      type="date"
                      className="input"
                      value={form.required_by_date}
                      onChange={(e) => setField("required_by_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Delivery location</label>
                    <input
                      className="input"
                      value={form.delivery_location}
                      onChange={(e) => setField("delivery_location", e.target.value)}
                      placeholder="On-site receipt point"
                    />
                  </div>
                </div>

                <label className="label" style={{ marginTop: 14 }}>Urgency <span style={{ fontWeight: 400, color: "var(--fg-4)" }}>· auto-set from Required by</span></label>
                <div className="urgency-row">
                  <div className={`urg-card readonly${form.urgency === "low" ? " sel low" : ""}`}>
                    <div className="u-name">↓ Low</div>
                    <div className="u-desc">Plan-ahead · &gt; 14 days</div>
                  </div>
                  <div className={`urg-card readonly${form.urgency === "normal" ? " sel normal" : ""}`}>
                    <div className="u-name">— Normal</div>
                    <div className="u-desc">Standard · 6–14 days</div>
                  </div>
                  <div className={`urg-card readonly${form.urgency === "urgent" ? " sel urgent" : ""}`}>
                    <div className="u-name">↑ Urgent</div>
                    <div className="u-desc">Operations-critical · ≤ 5 days</div>
                  </div>
                </div>
                <div className="help-text">
                  {form.required_by_date
                    ? <>Derived from your Required-by date — change the date to adjust urgency.</>
                    : <>Pick a Required-by date above and urgency is set automatically.</>}
                </div>

                <label className="label" style={{ marginTop: 14 }}>Comment</label>
                <textarea
                  className="textarea"
                  value={form.justification}
                  onChange={(e) => setField("justification", e.target.value)}
                  placeholder="Add a comment — reference any ARC, event, audit, or operational driver (optional)."
                />
              </div>
            </div>

            {/* Items section ------------------------------------------- */}
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">{Icon.box(14)}</div>
                  <div>
                    <h2>Items requested</h2>
                    <div className="h-sub">
                      Items matching an active ARC are flagged for fast-track
                    </div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={addItemRow} type="button">
                  {Icon.plus(12)}
                  Add line item
                </button>
              </div>
              <div className="section-body">
                {!form.hotel_id || !form.department_id ? (
                  <div
                    style={{
                      padding: 16,
                      fontSize: 12.5,
                      color: "var(--fg-3)",
                      background: "var(--surface-2)",
                      border: "1px dashed var(--border)",
                      borderRadius: 10,
                    }}
                  >
                    Select a hotel and department above to load the contracted-item picker.
                  </div>
                ) : (
                  items.map((row, idx) => {
                    const matched = !!row.product_variant_id;
                    const estCost =
                      matched && row.quantity
                        ? (Number(row.matched_unit_rate) || 0) * Number(row.quantity)
                        : 0;
                    return (
                      <div className="item-line" key={idx}>
                        {/* Picker / chip */}
                        <div>
                          <label className="label">Item <span className="req">*</span></label>
                          {row.product_variant_id ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                padding: "8px 11px",
                                background: "white",
                                border: "1px solid var(--border-input)",
                                borderRadius: 6,
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                  {row.variant_name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--fg-3)",
                                    marginTop: 1,
                                  }}
                                >
                                  <span className="mono">{row.variant_slug}</span>
                                  {row.vendor_name ? ` · ${row.vendor_name}` : ""}
                                </div>
                              </div>
                              <button
                                className="icon-btn"
                                type="button"
                                onClick={() => clearPickedItem(idx)}
                              >
                                {Icon.x(13)}
                              </button>
                            </div>
                          ) : (
                            <div style={{ position: "relative" }}>
                              <div className="search-input">
                                {Icon.search(13)}
                                <input
                                  className="input"
                                  placeholder="Search by name or code…"
                                  value={activePickerIdx === idx ? pickerQuery : ""}
                                  onFocus={() => {
                                    setActivePickerIdx(idx);
                                    setPickerQuery("");
                                  }}
                                  onChange={(e) => {
                                    setPickerQuery(e.target.value);
                                    setActivePickerIdx(idx);
                                  }}
                                  onBlur={() => {
                                    // delay so onMouseDown on a result can fire
                                    setTimeout(() => {
                                      setActivePickerIdx((cur) => (cur === idx ? -1 : cur));
                                    }, 120);
                                  }}
                                />
                              </div>
                              {activePickerIdx === idx && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    marginTop: 5,
                                    maxHeight: 240,
                                    overflowY: "auto",
                                    background: "white",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    boxShadow: "var(--shadow-md)",
                                    zIndex: 10,
                                  }}
                                >
                                  {pickerLoading && (
                                    <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--fg-3)" }}>
                                      Searching…
                                    </div>
                                  )}
                                  {!pickerLoading && pickerResults.length === 0 && (
                                    <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--fg-3)" }}>
                                      No contracted items match this hotel × department.
                                    </div>
                                  )}
                                  {!pickerLoading &&
                                    pickerResults.slice(0, 8).map((it) => (
                                      <div
                                        key={`${it.arc_contract_line_id}-${it.product_variant_id}`}
                                        style={{
                                          padding: "9px 12px",
                                          cursor: "pointer",
                                          borderBottom: "1px solid var(--border)",
                                          fontSize: 12.5,
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          pickItem(idx, it);
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.background = "var(--surface-2)";
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.background = "";
                                        }}
                                      >
                                        <div style={{ fontWeight: 600, color: "var(--fg)" }}>
                                          {it.variant_name}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: "var(--fg-3)",
                                            marginTop: 1,
                                          }}
                                        >
                                          <span className="mono">{it.variant_slug}</span>
                                          {" · "}
                                          {it.vendor_name}
                                          {" · per "}
                                          <span>{it.uom}</span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Qty */}
                        <div>
                          <label className="label">Qty <span className="req">*</span></label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="input input-num"
                              value={row.quantity}
                              onChange={(e) => updateRowField(idx, "quantity", e.target.value)}
                              placeholder="0"
                              min="0"
                            />
                            <div className="suffix">{row.product_variant_id ? row.uom : ""}</div>
                          </div>
                        </div>

                        {/* Note */}
                        <div>
                          <label className="label">Note (optional)</label>
                          <input
                            className="input"
                            value={row.note}
                            onChange={(e) => updateRowField(idx, "note", e.target.value)}
                            placeholder="Quality, brand, etc."
                          />
                        </div>

                        {/* Remove */}
                        <div style={{ paddingTop: 25 }}>
                          <button
                            className="icon-btn"
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length === 1}
                          >
                            {Icon.trash(14)}
                          </button>
                        </div>

                        {/* ARC match indicator (full width) */}
                        {matched && (
                          <div className="il-arc">
                            {Icon.check(13)}
                            <span>
                              Matched to <strong>{row.arc_number}</strong>
                              {row.vendor_name ? <> · vendor <strong>{row.vendor_name}</strong></> : null}
                              {" · rate "}
                              <strong className="mono">
                                ₹{Number(row.matched_unit_rate || 0).toLocaleString("en-IN")}
                              </strong>
                              {" / "}
                              <span>{row.uom}</span>
                              {" · est. "}
                              <strong className="mono">
                                ₹{estCost.toLocaleString("en-IN")}
                              </strong>
                              {" — "}
                              <em>fast-trackable</em>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Attachments --------------------------------------------- */}
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">{Icon.paperclip(14)}</div>
                  <div>
                    <h2>Supporting documents (optional)</h2>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="upload">
                  <div className="upload-ic">{Icon.upload(16)}</div>
                  <div className="upload-text">
                    <div className="t1">Drop files or click to upload</div>
                    <div className="t2">
                      Audit reports, sample images, vendor quotes — PDF/PNG/XLSX
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" type="button">Browse</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right aside — summary + routing preview ------------------ */}
          <aside className="mr-aside">
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">{Icon.bubble(14)}</div>
                  <div><h2>MR summary</h2></div>
                </div>
              </div>
              <div className="section-body">
                <div className="mini-summary-row">
                  <span className="ms-k">Items</span>
                  <span className="ms-v">
                    {filledRows.length} line{filledRows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mini-summary-row">
                  <span className="ms-k">ARC matched</span>
                  <span
                    className="ms-v"
                    style={
                      matchedRows.length === filledRows.length && filledRows.length > 0
                        ? { color: "var(--success)" }
                        : undefined
                    }
                  >
                    {matchedRows.length} of {filledRows.length}
                  </span>
                </div>
                <div className="mini-summary-row">
                  <span className="ms-k">Est. value</span>
                  <span className="ms-v">{fmtL(totalEst)}</span>
                </div>
                <div className="mini-summary-row">
                  <span className="ms-k">Approval steps</span>
                  <span className="ms-v">
                    {routing?.found ? `${routing.steps.length} required` : routing && !routing.found ? "Not configured" : "…"}
                  </span>
                </div>
              </div>
            </div>

            {/* Routing preview — the REAL resolved MR approval chain */}
            <div className="workflow">
              <div className="wf-head">
                <div className="t">
                  {Icon.workflow(13)} Routing preview
                </div>
              </div>
              {routing?.found ? (
                <>
                  {routing.steps.map((s, i) => (
                    <div key={i} className={`wf-step ${i === 0 ? "current" : "pending"}`}>
                      <div className="wf-node"></div>
                      <div className="body">
                        <div className="nm">{(s.approver_label || s.approver_source_type) + " approval"}</div>
                        <div className="meta">
                          Step {s.step_order} · {s.decision_rule === "ALL" ? "all approvers must sign off" : "any one approver"}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="wf-step pending">
                    <div className="wf-node"></div>
                    <div className="body">
                      <div className="nm">{fastTrackable ? "Direct released PO release" : "Sourcing / RFQ"}</div>
                      <div className="meta">{fastTrackable ? "All items under active ARCs — auto-converts on final approval" : "Items need fresh quotes"}</div>
                    </div>
                  </div>
                </>
              ) : routing && !routing.found ? (
                <div className="wf-step pending">
                  <div className="wf-node"></div>
                  <div className="body">
                    <div className="nm">No approval policy configured</div>
                    <div className="meta">An administrator must set up an MR approval policy for this business unit before submission.</div>
                  </div>
                </div>
              ) : (
                <div className="wf-step pending">
                  <div className="wf-node"></div>
                  <div className="body"><div className="nm">Resolving routing…</div></div>
                </div>
              )}
            </div>

            {fastTrackable && filledRows.length > 0 && (
              <div className="guide success">
                <div className="g-ic">{Icon.check(13)}</div>
                <div>
                  <strong>Fully ARC-matched.</strong> Once approved, this MR converts to
                  released PO(s) automatically — no sourcing or negotiation required.
                </div>
              </div>
            )}
          </aside>
        </div>

        {error && (
          <div
            style={{
              background: "var(--danger-soft)",
              color: "var(--danger)",
              padding: 10,
              borderRadius: 8,
              marginTop: 12,
              fontSize: 12.5,
            }}
          >
            {error}
          </div>
        )}

        {toast && (
          <div className="arc-toast">
            <span className="t-ic">✓</span>
            <span>{toast}</span>
          </div>
        )}
      </div>

      {/* Action dock --------------------------------------------------- */}
      <div className="action-dock">
        <div className="inner">
          <div className="left">
            <span className="fs-13 text-fg-2">
              <span className="fw-600 text-fg">Total est.</span>{" "}
              <span className="mono fw-700">{fmtL(totalEst)}</span>{" "}
              · routes through{" "}
              <span className="em">{routing?.found ? `${routing.steps.length} approval${routing.steps.length === 1 ? "" : "s"}` : "approval"}</span>
            </span>
          </div>
          <div className="right">
            <Link
              href="/dashboard/buyer/material-requisitions"
              className="btn btn-ghost btn-sm"
              style={{ textDecoration: "none" }}
            >
              Cancel
            </Link>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleSubmit(true)}
              type="button"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save as draft"}
            </button>
            <button
              className="btn btn-blue"
              disabled={!canSubmit || busy}
              onClick={() => handleSubmit(false)}
              type="button"
            >
              {busy ? "Submitting…" : "Submit for approval"}
              {Icon.arrowRight(14)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
