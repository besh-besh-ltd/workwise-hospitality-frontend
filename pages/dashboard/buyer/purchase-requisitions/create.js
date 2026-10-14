// Buyer-side · Raise / edit a Purchase Requisition.
//
// Page orchestrates; PrLineEditor owns line editing, PrRoutingPreview renders
// the live "who reviews / approves" panel. Saving an existing draft sends every
// server line back with its id (ruling R8) so clauses and attachments survive.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as PrApi from "@/services/pr";
import PrLineEditor from "@/components/dashboard/purchase-requisitions/PrLineEditor";
import PrRoutingPreview from "@/components/dashboard/purchase-requisitions/PrRoutingPreview";
import { errorBody, errorCopy, formatINR } from "@/components/dashboard/purchase-requisitions/prFormat";
import {
  lineErrors, lineFromServer, lineToPayload, lineToPreview, rowValue, sumLineValues, MAX_LINES,
} from "@/components/dashboard/purchase-requisitions/prLines";
import { materialRequisitionCreate, purchaseRequisition, purchaseRequisitionCreate, purchaseRequisitions } from "@/components/dashboard/shared/dashboardLinks";

const PREVIEW_DEBOUNCE_MS = 400;
const errStyle = { color: "var(--danger)", fontSize: 11.5, marginTop: 4 };

// Today in India (the server compares required_by_date against IST).
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const EMPTY_FORM = {
  hotel_id: "", department_id: "", title: "", pr_type: "goods", urgency: "normal",
  required_by_date: "", justification: "", delivery_location: "",
};

export default function PurchaseRequisitionCreatePage() {
  const router = useRouter();
  const routeId = router.query?.id ? String(router.query.id) : null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [lines, setLines] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [prId, setPrId] = useState(routeId);
  const [prNumber, setPrNumber] = useState("");
  const [loading, setLoading] = useState(Boolean(routeId));
  const [loadError, setLoadError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detailMsgs, setDetailMsgs] = useState([]);
  const [conflict, setConflict] = useState(false);
  const [flagged, setFlagged] = useState([]);
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState({ status: "idle", data: null, error: "" });
  const [retryTick, setRetryTick] = useState(0);
  const [rechecking, setRechecking] = useState(false);
  const [warning, setWarning] = useState("");
  const pendingHydrate = useRef(null); // { id, keys } when the last id refresh failed
  const linesRef = useRef([]);
  linesRef.current = lines;
  const dirty = useRef(false);
  const busyRef = useRef(false);
  const loadedFor = useRef(null);

  const setField = (k, v) => { dirty.current = true; setForm((f) => ({ ...f, [k]: v })); };
  const changeLines = (next) => { dirty.current = true; setLines(next); };

  // ----- hotels ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    PrApi.getFormHotels()
      .then((res) => { if (!cancelled) setHotels(res?.data?.hotels || []); })
      .catch(() => { if (!cancelled) setHotels([]); });
    return () => { cancelled = true; };
  }, []);

  // ----- departments for the chosen hotel -------------------------------
  useEffect(() => {
    if (!form.hotel_id) { setDepartments([]); return undefined; }
    let cancelled = false;
    PrApi.getFormDepartments(form.hotel_id)
      .then((res) => { if (!cancelled) setDepartments(res?.data?.departments || []); })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, [form.hotel_id]);

  // ----- re-check catalog lines against the (new) hotel/department -------
  // A rate contract can cover an item at one hotel/department and not another.
  const recheckReq = useRef(0);
  useEffect(() => {
    const myReq = ++recheckReq.current;
    const catalog = linesRef.current.filter((l) => l.kind === "catalog" && l.product_variant_id);
    if (!form.hotel_id || !form.department_id || catalog.length === 0) { setRechecking(false); return undefined; }
    setRechecking(true);
    const names = [...new Set(catalog.map((l) => l.label).filter((n) => n && n.length >= 2))];
    Promise.all(names.map((q) =>
      PrApi.searchItems({ hotel_id: Number(form.hotel_id), department_id: Number(form.department_id), q, limit: 50 })
        .then((res) => res?.data?.items || [])
        .catch(() => []),
    )).then((groups) => {
      if (myReq !== recheckReq.current) return;
      const byVariant = new Map(groups.flat().map((it) => [it.variant_id, it]));
      setLines((cur) => cur.map((l) => {
        const hit = l.kind === "catalog" ? byVariant.get(l.product_variant_id) : null;
        return hit ? { ...l, on_contract: Boolean(hit.on_contract), arc_number: hit.arc_number || null } : l;
      }));
      setRechecking(false);
    });
    return () => { recheckReq.current += 1; };
  }, [form.hotel_id, form.department_id]);

  // ----- load an existing draft / returned PR ---------------------------
  const loadPr = useCallback(async (id) => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await PrApi.getPr(id);
      const { pr, lines: serverLines, capabilities } = res?.data || {};
      if (!capabilities?.can_edit) {
        router.replace(purchaseRequisition(id));
        return;
      }
      setForm({
        hotel_id: String(pr.hotel_id), department_id: String(pr.department_id), title: pr.title || "",
        pr_type: pr.pr_type || "goods", urgency: pr.urgency || "normal",
        required_by_date: pr.required_by_date || "", justification: pr.justification || "",
        delivery_location: pr.delivery_location || "",
      });
      setLines((serverLines || []).map(lineFromServer));
      setPrNumber(pr.pr_number || "");
      setError(""); setConflict(false); setFlagged([]); setDetailMsgs([]);
      dirty.current = false;
    } catch (e) {
      setLoadError(errorCopy(e));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!router.isReady || !routeId || loadedFor.current === routeId) return;
    loadedFor.current = routeId;
    loadPr(routeId);
  }, [router.isReady, routeId, loadPr]);

  // Warn before a reload/close throws away unsaved input.
  useEffect(() => {
    const h = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  // ----- live routing preview (400 ms debounce, stale-response guard) ----
  // Rows sent to the preview keep their form row number so the server's
  // 1-based line_nos can be mapped back to what the user sees.
  const previewRows = useMemo(
    () => lines.map((l, i) => ({ row: i + 1, line: lineToPreview(l) })).filter((r) => r.line),
    [lines],
  );
  const previewLines = useMemo(() => previewRows.map((r) => r.line), [previewRows]);
  const previewKey = JSON.stringify([form.hotel_id, form.department_id, previewLines]);
  const previewReq = useRef(0);
  useEffect(() => {
    const myReq = ++previewReq.current;
    if (!form.hotel_id || !form.department_id || previewLines.length === 0) {
      setPreview({ status: "idle", data: null, error: "" });
      return undefined;
    }
    setPreview((p) => ({ status: "loading", data: p.data, error: "" }));
    const rowNos = previewRows.map((r) => r.row);
    const t = setTimeout(() => {
      PrApi.previewRouting({ hotel_id: Number(form.hotel_id), department_id: Number(form.department_id), lines: previewLines })
        .then((res) => { if (myReq === previewReq.current) setPreview({ status: "ready", data: res?.data || null, error: "", rowNos }); })
        .catch((e) => { if (myReq === previewReq.current) setPreview({ status: "error", data: null, error: errorCopy(e) }); });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // previewKey is the serialised dependency set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, retryTick]);

  // ----- totals ----------------------------------------------------------
  const grandTotal = useMemo(() => sumLineValues(lines.map(rowValue)), [lines]);

  // ----- validation ------------------------------------------------------
  const headerErrors = useMemo(() => {
    const e = {};
    if (!form.hotel_id) e.hotel = "Choose a hotel";
    if (!form.department_id) e.department = "Choose a department";
    if (!form.title.trim()) e.title = "Give the requisition a title";
    if (!form.justification.trim()) e.justification = "Say why this is needed";
    if (!form.required_by_date) e.date = "Pick the date you need it by";
    else if (form.required_by_date < todayIST()) e.date = "The need-by date can't be in the past";
    if (lines.length === 0) e.lines = "Add at least one item";
    if (lines.length > MAX_LINES) e.lines = `A requisition can have up to ${MAX_LINES} items`;
    return e;
  }, [form, lines.length]);

  const hasErrors = Object.keys(headerErrors).length > 0 || lines.some((l) => Object.keys(lineErrors(l)).length > 0);

  const handleFail = (e) => {
    const body = errorBody(e);
    setError(errorCopy(e));
    setConflict(body?.code === "PR_STATE_CONFLICT");
    const details = Array.isArray(body?.details) ? body.details : [];
    setFlagged(details.map((d) => d.line_no).filter((n) => Number.isInteger(n)));
    setDetailMsgs(
      body?.code === "PR_VALIDATION"
        ? details.filter((d) => d.message).map((d) => (d.line_no ? `Item ${d.line_no}: ${d.message}` : d.message))
        : [],
    );
  };

  // Give new lines their server ids so the next save sends them back.
  // Returns a Map key -> server id when every saved line now has its id, else null. Matching is
  // by row key, so anything typed since the save is left untouched.
  const hydrateIds = async (id, savedKeys) => {
    try {
      const res = await PrApi.getPr(id);
      const server = res?.data?.lines || [];
      if (server.length !== savedKeys.length) throw new Error("line count mismatch");
      setLines((cur) => cur.map((l) => {
        const i = savedKeys.indexOf(l.key);
        return i >= 0 && !l.id ? { ...l, id: server[i].id } : l;
      }));
      pendingHydrate.current = null;
      setWarning("");
      return new Map(savedKeys.map((k, i) => [k, server[i].id]));
    } catch (_) {
      pendingHydrate.current = { id, keys: savedKeys };
      setWarning("Your draft is saved, but we couldn't refresh it from the server. We'll retry before your next save.");
      return null;
    }
  };

  const persist = async () => {
    setError(""); setConflict(false); setFlagged([]); setDetailMsgs([]);
    setShowErrors(true);
    if (hasErrors) {
      setError("Some details are missing or need fixing. Check the highlighted fields.");
      return null;
    }
    // Never send lines without their ids when the last refresh failed: reload
    // them first (keyed by row, so nothing typed since is lost).
    let ids = new Map();
    if (pendingHydrate.current) {
      const { id: pid, keys } = pendingHydrate.current;
      ids = await hydrateIds(pid, keys);
      if (!ids) {
        setError("Couldn't refresh your saved draft, so nothing was sent. Check your connection and try again.");
        return null;
      }
    }
    const withIds = lines.map((l) => (l.id || !ids.has(l.key) ? l : { ...l, id: ids.get(l.key) }));
    const body = {
      hotel_id: Number(form.hotel_id),
      department_id: Number(form.department_id),
      title: form.title.trim(),
      pr_type: form.pr_type,
      urgency: form.urgency,
      required_by_date: form.required_by_date,
      justification: form.justification.trim(),
      delivery_location: form.delivery_location.trim() || undefined,
      lines: withIds.map(lineToPayload),
    };
    const savedKeys = lines.map((l) => l.key);
    try {
      let id = prId;
      if (id) {
        await PrApi.updatePr(id, body);
      } else {
        const res = await PrApi.createPr(body);
        id = res?.data?.id;
        setPrId(id);
        loadedFor.current = String(id);
        router.replace(purchaseRequisitionCreate(id), undefined, { shallow: true });
      }
      dirty.current = false;
      await hydrateIds(id, savedKeys);
      return id;
    } catch (e) {
      handleFail(e);
      return null;
    }
  };

  const run = async (fn) => {
    if (busyRef.current) return; // double-click guard
    busyRef.current = true;
    setBusy(true);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
  };

  const saveDraft = () => run(async () => {
    const id = await persist();
    if (id) { setToast("Draft saved"); setTimeout(() => setToast(""), 2500); }
  });

  const submit = () => run(async () => {
    const id = await persist();
    if (!id) return;
    try {
      await PrApi.submitPr(id);
      router.push(purchaseRequisition(id));
    } catch (e) {
      handleFail(e);
    }
  });

  const refresh = () => {
    if (prId) { loadedFor.current = String(prId); loadPr(prId); } else window.location.reload();
  };

  const previewProblems = preview.data?.problems || [];
  const onContractLines = lines.filter((l) => l.on_contract);
  const blocked = rechecking || onContractLines.length > 0;
  const canSubmit = preview.status === "ready" && previewProblems.length === 0 && lines.length > 0 && !busy && !blocked;
  const flaggedNos = flagged;

  if (loading) {
    return <div className="main-body"><p className="page-sub">Loading requisition…</p></div>;
  }
  if (loadError) {
    return (
      <div className="main-body">
        <div role="alert" className="guide danger"><div>{loadError}</div></div>
        <Link href={purchaseRequisitions()} className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Back to requisitions</Link>
      </div>
    );
  }

  const fieldErr = (k) => (showErrors && headerErrors[k] ? <div style={errStyle}>{headerErrors[k]}</div> : null);

  return (
    <>
      <style jsx>{`
        .pr-form-grid { display:grid; grid-template-columns: 1fr 340px; gap:18px; align-items:flex-start; }
        @media (max-width:1000px){ .pr-form-grid { grid-template-columns:1fr; } }
        .pr-aside { position:sticky; top:78px; display:flex; flex-direction:column; gap:14px; }
        @media (max-width:1000px){ .pr-aside { position:static; } }
      `}</style>

      <div className="main-body" style={{ paddingBottom: 108 }}>
        <div>
          <h1 className="page-h1">{prId ? `Edit purchase requisition${prNumber ? ` ${prNumber}` : ""}` : "Raise purchase requisition"}</h1>
          <p className="page-sub">
            Ask the purchase team to source something. Items already on a rate contract go through a{" "}
            <Link href={materialRequisitionCreate()}>Material Requisition</Link> instead.
          </p>
        </div>

        {warning && <div className="guide warn" role="status" style={{ margin: "14px 0 4px" }}><div>{warning}</div></div>}

        {blocked && (
          <div className="guide warn" role="status" style={{ margin: "14px 0 4px" }}>
            <div>
              {rechecking
                ? "Checking your items against this hotel and department…"
                : "Some items are on a rate contract here, so they can't go on a purchase requisition. Remove them, or raise a Material Requisition for them. Saving and submitting are paused until then."}
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="guide danger" style={{ margin: "14px 0 4px" }}>
            <div>
              <strong>{error}</strong>
              {detailMsgs.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {detailMsgs.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              )}
              {conflict && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Refresh</button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pr-form-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <div className="section-card">
              <div className="section-head"><div className="h-left"><div><h2>Requisition basics</h2></div></div></div>
              <div className="section-body">
                <div className="form-grid">
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label" htmlFor="pr-title">Title <span className="req">*</span></label>
                    <input id="pr-title" aria-label="Title" className="input" maxLength={200} value={form.title}
                      placeholder="e.g. Lobby towels, restock" onChange={(e) => setField("title", e.target.value)} />
                    {fieldErr("title")}
                  </div>
                  <div>
                    <label className="label" htmlFor="pr-hotel">Hotel <span className="req">*</span></label>
                    <select id="pr-hotel" aria-label="Hotel" className="select" value={form.hotel_id}
                      onChange={(e) => { dirty.current = true; setForm((f) => ({ ...f, hotel_id: e.target.value, department_id: "" })); }}>
                      <option value="">Select hotel…</option>
                      {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                    {fieldErr("hotel")}
                  </div>
                  <div>
                    <label className="label" htmlFor="pr-dept">Department <span className="req">*</span></label>
                    <select id="pr-dept" aria-label="Department" className="select" value={form.department_id} disabled={!form.hotel_id}
                      onChange={(e) => setField("department_id", e.target.value)}>
                      <option value="">{form.hotel_id ? "Select department…" : "Pick a hotel first"}</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                    {fieldErr("department")}
                  </div>
                  <div>
                    <label className="label" htmlFor="pr-type">Type</label>
                    <select id="pr-type" className="select" value={form.pr_type} onChange={(e) => setField("pr_type", e.target.value)}>
                      <option value="goods">Goods</option>
                      <option value="service">Service</option>
                      <option value="capex">Capex</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="pr-urgency">Urgency</label>
                    <select id="pr-urgency" className="select" value={form.urgency} onChange={(e) => setField("urgency", e.target.value)}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="pr-date">Need by <span className="req">*</span></label>
                    <input id="pr-date" aria-label="Need by" type="date" className="input" min={todayIST()} value={form.required_by_date}
                      onChange={(e) => setField("required_by_date", e.target.value)} />
                    {fieldErr("date")}
                  </div>
                  <div>
                    <label className="label" htmlFor="pr-loc">Delivery location</label>
                    <input id="pr-loc" className="input" maxLength={1000} value={form.delivery_location}
                      placeholder="Where should it be delivered?" onChange={(e) => setField("delivery_location", e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label" htmlFor="pr-why">Justification <span className="req">*</span></label>
                    <textarea id="pr-why" aria-label="Justification" className="textarea" maxLength={4000} value={form.justification}
                      placeholder="Why is this needed?" onChange={(e) => setField("justification", e.target.value)} />
                    {fieldErr("justification")}
                  </div>
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-head">
                <div className="h-left"><div><h2>Items requested</h2><div className="h-sub">Catalog items, or describe what you need</div></div></div>
              </div>
              <div className="section-body">
                <PrLineEditor
                  lines={lines}
                  onChange={changeLines}
                  hotelId={form.hotel_id}
                  departmentId={form.department_id}
                  showErrors={showErrors}
                  flaggedLineNos={flaggedNos}
                />
                {fieldErr("lines")}
              </div>
            </div>
          </div>

          <aside className="pr-aside">
            <PrRoutingPreview state={preview} rowNos={preview.rowNos} onRetry={() => setRetryTick((n) => n + 1)} />
          </aside>
        </div>

        {toast && (
          <div className="arc-toast" role="status"><span className="t-ic">✓</span><span>{toast}</span></div>
        )}
      </div>

      <div className="action-dock">
        <div className="inner">
          <div className="left">
            <span className="fs-13 text-fg-2">
              <span className="fw-600 text-fg">Total est.</span>{" "}
              <span className="mono fw-700" data-testid="grand-total">{grandTotal ? formatINR(grandTotal) : "—"}</span>
            </span>
          </div>
          <div className="right">
            <Link href={purchaseRequisitions()} className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>Cancel</Link>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy || blocked} onClick={saveDraft}>
              {busy ? "Saving…" : "Save draft"}
            </button>
            <button type="button" className="btn btn-blue" disabled={!canSubmit} onClick={submit}>
              {busy ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
