// Convert selected pool lines (one hotel) into ONE RFQ draft (POST /pr/convert)
// and hand over to the existing RFQ wizard.
//
// The preview mirrors the server's grouping: lines of the same catalog item
// become one RFQ product with the summed quantity (exact decimal math, never
// float), and one item asked for in different units is flagged. The server
// re-checks everything and stays authoritative — its 409 / 422 answers are
// rendered line by line in plain words.
// Render inside the page's .main-body so the arc_v2 form styles apply.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { convertLines } from "@/services/pr";
import { getDepartments } from "@/services/rbac";
import { resumeDraft } from "@/components/dashboard/shared/dashboardLinks";
import { PrModal } from "./PrReasonModal";
import { ERROR_COPY, errorBody, errorCopy, errorStatus, formatQty, sumDecimals } from "./prFormat";

/** Why the server would not convert a line, in words (PR_LINE_NOT_CONVERTIBLE details[].reason). */
export const NOT_CONVERTIBLE_REASON = {
  not_approved: "its requisition is no longer approved",
  not_active: "the line was closed or cancelled",
  needs_mapping: "it isn't mapped to a catalog item yet",
  awaiting_catalog: "it is waiting for a new catalog item",
  already_sourced: "it is already in another RFQ",
  on_contract: "the item is now on a rate contract — raise a Material Requisition instead",
  variant_not_usable: "its catalog item can't be used right now",
};

// The server compares units trimmed and case-insensitively.
const unitKey = (uom) => String(uom ?? "").trim().toLowerCase();

/**
 * Lines → RFQ products, as the server builds them: one group per catalog item
 * (effective_variant_id), in the order the items first appear.
 */
export function groupLines(lines) {
  const groups = new Map();
  (lines || []).forEach((l) => {
    const key = String(l.effective_variant_id);
    if (!groups.has(key)) {
      groups.set(key, { variant_id: l.effective_variant_id, name: l.item_name, lines: [], units: new Map() });
    }
    const g = groups.get(key);
    g.lines.push(l);
    if (!g.units.has(unitKey(l.uom))) g.units.set(unitKey(l.uom), String(l.uom ?? "").trim());
  });
  return [...groups.values()].map((g) => ({
    variant_id: g.variant_id,
    name: g.name,
    lines: g.lines,
    units: [...g.units.values()],
    mixedUnits: g.units.size > 1,
    quantity: sumDecimals(g.lines.map((l) => l.quantity)),
  }));
}

const safeRedirect = (r) => (typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : null);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** A failed convert → { title, items[], refresh } for the alert. */
function describeFailure(err, nameOf) {
  const body = errorBody(err);
  const code = body?.code;
  const details = Array.isArray(body?.details) ? body.details : [];
  switch (code) {
    case "PR_LINE_NOT_CONVERTIBLE":
      return {
        title: ERROR_COPY.PR_LINE_NOT_CONVERTIBLE,
        items: details.map((d) => `${d.pr_number} · line ${d.line_no} — ${NOT_CONVERTIBLE_REASON[d.reason] || "it can't be converted right now"}`),
        refresh: true,
      };
    case "PR_UNIT_MISMATCH":
      return {
        title: ERROR_COPY.PR_UNIT_MISMATCH,
        items: details.map((d) => `${nameOf(d.variant_id)} — ${(d.units || []).join(", ")}`),
      };
    case "PR_SPEC_TOO_LONG":
      return {
        title: ERROR_COPY.PR_SPEC_TOO_LONG,
        items: details.map((d) => `${nameOf(d.variant_id)} — ${Number(d.length).toLocaleString("en-IN")} characters`),
      };
    case "PR_HOTEL_MISMATCH":
    case "PR_STATE_CONFLICT":
      return { title: errorCopy(err), items: [], refresh: true };
    case "PR_VALIDATION":
      return { title: errorCopy(err), items: details.map((d) => d?.message).filter(Boolean) };
    default:
      return { title: errorCopy(err), items: [], refresh: errorStatus(err) === 404 };
  }
}

export default function ConvertModal({ lines, onClose, onRefresh }) {
  const router = useRouter();
  const groups = useMemo(() => groupLines(lines), [lines]);
  const hotelId = lines[0]?.hotel_id;
  const hotelName = lines[0]?.hotel_name;
  const deptIds = [...new Set(lines.map((l) => String(l.department_id)))];
  const commonDept = deptIds.length === 1 ? deptIds[0] : "";

  const [depts, setDepts] = useState(null); // null = loading
  const [deptError, setDeptError] = useState("");
  const [deptId, setDeptId] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const busyRef = useRef(false);

  // Departments where this buyer may create RFQs at the hotel — the list the
  // RFQ wizard offers (rfq.create scope). The PR department is the default
  // when every line shares it and the buyer may raise an RFQ for it.
  useEffect(() => {
    let cancelled = false;
    setDepts(null);
    setDeptError("");
    getDepartments({ hotel_id: Number(hotelId), resource: "rfq" })
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data?.data || res?.data || [];
        const list = (Array.isArray(rows) ? rows : []).map((d) => ({ id: String(d.id), title: d.title || d.name }));
        setDepts(list);
        if (commonDept && list.some((d) => d.id === commonDept)) setDeptId(commonDept);
      })
      .catch(() => {
        if (cancelled) return;
        setDepts([]);
        setDeptError("Couldn't load the departments you can raise RFQs for. Close this and try again.");
      });
    return () => { cancelled = true; };
  }, [hotelId, commonDept]);

  const nameOf = (variantId) =>
    groups.find((g) => String(g.variant_id) === String(variantId))?.name || `Item ${variantId}`;
  const mixed = groups.filter((g) => g.mixedUnits);
  const noDepts = Array.isArray(depts) && depts.length === 0 && !deptError;

  const submit = async () => {
    if (busyRef.current || !deptId) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const lineIds = lines.map((l) => Number(l.line_id)).sort((a, b) => a - b);
      const res = await convertLines({ line_ids: lineIds, department_id: Number(deptId) });
      const d = res?.data || {};
      // Stay busy: the page is navigating away to the wizard.
      router.push(safeRedirect(d.redirect) || resumeDraft(d.rfq_id));
    } catch (e) {
      setFailure(describeFailure(e, nameOf));
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <PrModal
      title="Convert to an RFQ draft"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={busy || !deptId} onClick={submit}>
            {busy ? "Creating…" : "Create RFQ draft"}
          </button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        {plural(lines.length, "line", "lines")} for {hotelName} become one RFQ draft with{" "}
        {plural(groups.length, "item", "items")}. Lines for the same catalog item are merged. The draft opens in the RFQ
        wizard, where you add vendors, dates and terms before publishing.
      </p>

      {failure && (
        <div role="alert" className="guide danger" style={{ marginBottom: 12 }}>
          <div>
            <strong>{failure.title}</strong>
            {failure.items.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {failure.items.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
            {failure.refresh && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={onRefresh}>Refresh queue</button>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {groups.map((g) => (
          <div
            key={String(g.variant_id)}
            data-testid="convert-group"
            style={{
              display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 12px",
              border: `1px solid ${g.mixedUnits ? "var(--warn)" : "var(--border)"}`, borderRadius: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
              <div className="fs-11 text-fg-3">
                from {plural(g.lines.length, "line", "lines")} · {g.lines.map((l) => `${l.pr_number} #${l.line_no}`).join(", ")}
              </div>
            </div>
            <span className="mono fw-700" style={{ whiteSpace: "nowrap" }}>
              {g.mixedUnits || g.quantity == null ? "—" : `${formatQty(g.quantity)} ${g.units[0]}`}
            </span>
          </div>
        ))}
      </div>

      {mixed.map((g) => (
        <div key={`mixed-${g.variant_id}`} className="guide warn" style={{ marginBottom: 10, fontSize: 12.5 }}>
          <div>{g.name} is requested in different units ({g.units.join(", ")}). The RFQ needs one unit per item — convert those lines separately.</div>
        </div>
      ))}

      <div>
        <label className="label" htmlFor="pr-convert-dept">RFQ department <span className="req">*</span></label>
        <select
          id="pr-convert-dept"
          aria-label="RFQ department"
          className="select"
          value={deptId}
          disabled={!depts || busy}
          onChange={(e) => setDeptId(e.target.value)}
        >
          <option value="">{depts ? "Choose a department…" : "Loading…"}</option>
          {(depts || []).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        {!commonDept && depts && depts.length > 0 && (
          <div className="help-text">These lines come from different departments. Choose the one this RFQ is raised for.</div>
        )}
        {noDepts && (
          <div className="help-text" style={{ color: "var(--danger)" }}>
            You can't create RFQs at {hotelName}. Ask your admin for RFQ access in a department there.
          </div>
        )}
        {deptError && <div className="help-text" style={{ color: "var(--danger)" }}>{deptError}</div>}
      </div>

    </PrModal>
  );
}
