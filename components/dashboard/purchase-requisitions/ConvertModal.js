// Convert selected pool lines (one hotel) into ONE RFQ draft (POST /pr/convert)
// and hand over to the existing RFQ wizard.
//
// The preview mirrors the server's grouping: lines of the same catalog item
// become one RFQ product with the summed quantity (exact decimal math, never
// float), and one item asked for in different units is flagged. The server
// re-checks everything and stays authoritative — its 409 / 422 answers are
// rendered line by line in plain words.
//
// Department and process mirror the RFQ wizard: departments where the buyer
// holds rfq.create at the hotel, and processes narrowed to the buyer's
// rfq.create process scope (useModulePermissions). A process-restricted grant
// makes the process required; otherwise it may be left for the wizard.
// Render inside the page's .main-body so the arc_v2 form styles apply.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { convertLines } from "@/services/pr";
import { getDepartments } from "@/services/rbac";
import { getApprovalProcesses } from "@/services/process";
import useModulePermissions from "@/hooks/useModulePermissions";
import { resumeDraft } from "@/components/dashboard/shared/dashboardLinks";
import { PrModal } from "./PrReasonModal";
import { ERROR_COPY, errorBody, errorCopy, errorStatus, formatQty, sumDecimals } from "./prFormat";
import { departmentOptions, useGuardedSubmit } from "./prQueueShared";

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

// Only same-app absolute paths ("/x"), never protocol-relative ("//x") or "/\\x".
/** Union two failures' "the queue is stale" flags; dropped lines by line_id. */
const mergeStale = (a, b) => {
  const seen = new Set((a.dropLines || []).map((l) => String(l.line_id)));
  const extra = (b?.dropLines || []).filter((l) => !seen.has(String(l.line_id)));
  return { refresh: Boolean(a.refresh || b?.refresh), dropLines: [...(a.dropLines || []), ...extra] };
};
const NOT_STALE = { refresh: false, dropLines: [] };

const safeRedirect = (r) => (typeof r === "string" && /^\/(?![\/\\])/.test(r) ? r : null);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const RFQ_SCOPE_FORBIDDEN = "You can't create RFQs for this hotel, department and process.";

/**
 * A failed convert → { title, items[], refresh, dropLines[] } for the alert.
 * `refresh`: the queue on screen is out of date (refetch when the dialog
 * closes). `dropLines`: lines the server says can't be converted — they leave
 * the selection.
 */
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
        dropLines: details.filter((d) => d && d.line_id != null),
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
      break;
  }
  if (errorStatus(err) === 403 && body?.details?.permission !== "pr.convert") {
    return { title: RFQ_SCOPE_FORBIDDEN, items: [] };
  }
  return { title: errorCopy(err), items: [], refresh: [403, 404].includes(errorStatus(err)) };
}

/**
 * lines: a snapshot of the selected pool rows (taken when the dialog opened).
 * onClose({ refresh, dropLines }): refresh = refetch the queue (a refusal said
 * it is stale); dropLines = [{ line_id, pr_number, line_no }] to unselect.
 */
export default function ConvertModal({ lines, onClose }) {
  const router = useRouter();
  const groups = useMemo(() => groupLines(lines), [lines]);
  const hotelId = lines[0]?.hotel_id;
  const hotelName = lines[0]?.hotel_name;
  const hotelIds = useMemo(() => (hotelId ? [Number(hotelId)] : []), [hotelId]);
  const deptIds = [...new Set(lines.map((l) => String(l.department_id)))];
  const commonDept = deptIds.length === 1 ? deptIds[0] : "";

  const [depts, setDepts] = useState(null); // null = loading
  const [deptError, setDeptError] = useState("");
  const [deptId, setDeptId] = useState("");
  const [processes, setProcesses] = useState(null); // null = loading
  const [processId, setProcessId] = useState("");

  const nameOf = (variantId) =>
    groups.find((g) => String(g.variant_id) === String(variantId))?.name || `Item ${variantId}`;
  const { busy, error: failure, run } = useGuardedSubmit({ describe: (e) => describeFailure(e, nameOf) });
  // Every failure since the dialog opened: a retry that fails differently must
  // not forget that an earlier refusal made the queue stale or named lines to
  // drop. Kept until a successful convert or the dialog closes.
  const [stale, setStale] = useState(NOT_STALE);
  useEffect(() => { if (failure) setStale((prev) => mergeStale(prev, failure)); }, [failure]);
  const pending = mergeStale(stale, failure);

  // rfq.create scope for (hotel, chosen department): allowedProcessIds is an
  // array when the grant is process-restricted, null when it covers every process.
  const { allowedProcessIds, loading: permsLoading } = useModulePermissions({
    moduleKey: "rfq",
    hotelIds,
    departmentId: deptId ? Number(deptId) : null,
    enabled: hotelIds.length > 0,
  });
  const processRequired = Array.isArray(allowedProcessIds);
  const processOptions = (processes || []).filter((p) => !processRequired || allowedProcessIds.includes(Number(p.id)));
  const processKey = processOptions.map((p) => p.id).join(",");

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
        const list = departmentOptions(res);
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

  useEffect(() => {
    let cancelled = false;
    getApprovalProcesses()
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data?.data || res?.data || [];
        setProcesses((Array.isArray(rows) ? rows : []).map((p) => ({ id: String(p.id), name: p.name })));
      })
      .catch(() => { if (!cancelled) setProcesses([]); });
    return () => { cancelled = true; };
  }, []);

  // A process the buyer may not use (after a department change) is cleared.
  useEffect(() => {
    if (processId && processes && !processKey.split(",").includes(processId)) setProcessId("");
  }, [processKey, processId, processes]);

  const mixed = groups.filter((g) => g.mixedUnits);
  const noDepts = Array.isArray(depts) && depts.length === 0 && !deptError;
  const noProcess = processRequired && processes && processOptions.length === 0;
  const blocked = busy || !deptId || mixed.length > 0 || permsLoading || !processes || (processRequired && !processId);

  const close = () => onClose({ refresh: pending.refresh, dropLines: pending.dropLines });

  const submit = () => {
    if (blocked) return;
    const body = {
      line_ids: lines.map((l) => Number(l.line_id)).sort((a, b) => a - b),
      department_id: Number(deptId),
    };
    if (processId) body.process_id = Number(processId);
    run(() => convertLines(body), {
      keepBusy: true, // the page is navigating away to the wizard
      onSuccess: (res) => {
        setStale(NOT_STALE);
        const d = res?.data || {};
        router.push(safeRedirect(d.redirect) || resumeDraft(d.rfq_id));
      },
    });
  };

  return (
    <PrModal
      title="Convert to an RFQ draft"
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={blocked} onClick={submit}>
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
            {pending.refresh && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={close}>Refresh queue</button>
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
          <div>{g.name} is requested in different units ({g.units.join(", ")}). An RFQ has one unit per item, so this can't be converted as selected — unselect the lines in one of the units and convert them separately.</div>
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

      <div style={{ marginTop: 12 }}>
        <label className="label" htmlFor="pr-convert-process">
          Process {processRequired ? <span className="req">*</span> : <span className="text-fg-3">(optional)</span>}
        </label>
        <select
          id="pr-convert-process"
          aria-label="RFQ process"
          className="select"
          value={processId}
          disabled={!processes || permsLoading || busy}
          onChange={(e) => setProcessId(e.target.value)}
        >
          <option value="">
            {!processes ? "Loading…" : processRequired ? "Choose a process…" : "No process now — set it in the RFQ wizard"}
          </option>
          {processOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {processRequired && !processId && !noProcess && (
          <div className="help-text">Your RFQ access here is limited to certain processes — choose the process for this RFQ.</div>
        )}
        {noProcess && (
          <div className="help-text" style={{ color: "var(--danger)" }}>
            None of the processes you can raise RFQs for is available. Ask your admin.
          </div>
        )}
      </div>

    </PrModal>
  );
}
