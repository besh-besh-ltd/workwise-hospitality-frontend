// Purchase queue — approved PR lines from every requester, worked by the
// purchase team (GET /pr/pool, permission pr.convert on the hotel).
//
// Buyers assign requisitions, map free-text lines to catalog items (or ask the
// platform for a new item), close lines that won't be bought, and convert
// selected lines of ONE hotel into an RFQ draft that opens in the RFQ wizard.
// Filtering and paging are server-side. The selection rules here (only
// in-queue lines, one hotel) are a convenience; the server re-checks them.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import * as PrApi from "@/services/pr";
import { getDepartments } from "@/services/rbac";
import PrProgressPill from "./PrProgressPill";
import PrReasonModal, { PrModal } from "./PrReasonModal";
import MapVariantModal from "./MapVariantModal";
import ConvertModal from "./ConvertModal";
import { CategoryPicker } from "./PrLineEditor";
import { PROGRESS_LABEL, errorCopy, errorStatus, formatINR, formatQty } from "./prFormat";
import { URGENCY_LABEL, fmtDate } from "./prDetail";
import { purchaseRequisition, purchaseRequisitions } from "@/components/dashboard/shared/dashboardLinks";

const PAGE_SIZE = 50;
const TOAST_MS = 3500;
const POOL_PROGRESSES = ["in_pool", "needs_mapping", "awaiting_catalog"];
const NO_FILTERS = { hotel_id: "", department_id: "", category_id: "", progress: "", assigned: "any" };
const ASSIGNED_OPTIONS = [
  { key: "any", label: "Anyone" },
  { key: "me", label: "Assigned to me" },
  { key: "unassigned", label: "Unassigned" },
];
const AGE_TONE = { ok: "success", amber: "warn", red: "danger" };
const URGENCY_TONE = { urgent: "danger", normal: "neutral", low: "neutral" };
const NAME_MAX = 300;
// Refusals that mean the queue on screen is out of date: refetch behind the dialog.
const STALE = new Set([404, 409]);
const DESCRIPTION_MAX = 4000;

/** The server's age band (whole IST days since approval): ok < 3, amber 3..6, red >= 7. */
export const ageBand = (days) => {
  const n = Number(days) || 0;
  if (n >= 7) return "red";
  if (n >= 3) return "amber";
  return "ok";
};
const ageLabel = (days) => {
  const n = Number(days) || 0;
  return n <= 0 ? "Today" : `${n} ${n === 1 ? "day" : "days"}`;
};

/** Why a line's checkbox is off, or null when it can be selected. */
function blockedReason(row, selectedHotel) {
  if (row.progress === "needs_mapping") return "Map this line to a catalog item before converting it";
  if (row.progress === "awaiting_catalog") return "Waiting for the requested catalog item — map the line once it exists";
  if (row.progress !== "in_pool") return "This line can't be converted";
  if (selectedHotel && String(row.hotel_id) !== String(selectedHotel.id)) {
    return `An RFQ is for one hotel. You've selected lines for ${selectedHotel.name}; this line is for ${row.hotel_name}.`;
  }
  return null;
}

function AssignModal({ row, meId, onClose, onDone, onStale }) {
  const [buyers, setBuyers] = useState(null); // null = loading
  const [loadError, setLoadError] = useState("");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    PrApi.getBuyers(row.hotel_id)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setBuyers(list);
        const me = list.find((b) => String(b.id) === String(meId));
        const current = list.find((b) => String(b.id) === String(row.assigned_buyer_id));
        setPick(String((me || current || {}).id ?? ""));
      })
      .catch((e) => {
        if (cancelled) return;
        setBuyers([]);
        setLoadError(errorCopy(e));
      });
    return () => { cancelled = true; };
  }, [row.hotel_id, row.assigned_buyer_id, meId]);

  const submit = async () => {
    if (!pick || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await PrApi.assignPr(row.pr_id, Number(pick));
      onDone(res?.message || "Assigned");
    } catch (e) {
      setError(errorCopy(e));
      busyRef.current = false;
      setBusy(false);
      if (STALE.has(errorStatus(e))) onStale();
    }
  };

  return (
    <PrModal
      title={`Assign ${row.pr_number}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={!pick || busy} onClick={submit}>{busy ? "Working…" : "Assign"}</button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        The whole requisition is assigned, with every one of its lines in the queue. Now:{" "}
        <strong>{row.assigned_buyer_name || "unassigned"}</strong>.
      </p>
      <label className="label" htmlFor="pr-assign-buyer">Buyer <span className="req">*</span></label>
      <select
        id="pr-assign-buyer" aria-label="Buyer" className="select" value={pick} disabled={!buyers || busy}
        onChange={(e) => setPick(e.target.value)}
      >
        <option value="">{buyers ? "Choose a buyer…" : "Loading…"}</option>
        {(buyers || []).map((b) => (
          <option key={b.id} value={String(b.id)}>{String(b.id) === String(meId) ? `${b.name} (you)` : b.name}</option>
        ))}
      </select>
      {buyers && buyers.length === 0 && !loadError && (
        <div className="help-text">Nobody works the purchase queue at {row.hotel_name}.</div>
      )}
      {(loadError || error) && (
        <div role="alert" className="guide danger" style={{ marginTop: 10 }}><div>{error || loadError}</div></div>
      )}
    </PrModal>
  );
}

function CatalogRequestModal({ row, onClose, onDone, onStale }) {
  const [name, setName] = useState(() => String(row.free_text_name || row.item_name || "").slice(0, NAME_MAX));
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const blocked = busy || !name.trim() || name.length > NAME_MAX || description.length > DESCRIPTION_MAX;

  const submit = async () => {
    if (blocked || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    const body = { requested_name: name.trim() };
    if (description.trim()) body.description = description.trim();
    try {
      const res = await PrApi.requestCatalogItem(row.pr_id, row.line_id, body);
      onDone(res?.message || "Catalog item requested");
    } catch (e) {
      setError(errorCopy(e));
      busyRef.current = false;
      setBusy(false);
      if (STALE.has(errorStatus(e))) onStale();
    }
  };

  return (
    <PrModal
      title="Request a catalog item"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={blocked} onClick={submit}>{busy ? "Working…" : "Send request"}</button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        Ask the Workwise team to add this item to the catalog. When they add it, {row.pr_number} line {row.line_no} is
        mapped to it and can be converted. Until then the line waits in the queue.
      </p>
      <label className="label" htmlFor="pr-cat-name">Item name <span className="req">*</span></label>
      <input
        id="pr-cat-name" className="input" maxLength={NAME_MAX} value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="label" htmlFor="pr-cat-desc" style={{ marginTop: 10 }}>
        Description <span className="text-fg-3">(optional)</span>
      </label>
      <textarea
        id="pr-cat-desc" className="textarea" value={description}
        placeholder="Brand, size, grade — anything that identifies the item"
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="fs-11" style={{ marginTop: 4, textAlign: "right", color: description.length > DESCRIPTION_MAX ? "var(--danger)" : "var(--fg-4)" }}>
        {description.length}/{DESCRIPTION_MAX}
      </div>
      {error && <div role="alert" className="guide danger" style={{ marginTop: 10 }}><div>{error}</div></div>}
    </PrModal>
  );
}

export default function PrQueuePage() {
  const meId = useSelector((s) => s.userProfile)?.id ?? null;
  const [filters, setFilters] = useState(NO_FILTERS);
  const [category, setCategory] = useState(null); // { id, title } for the picker label
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  const [data, setData] = useState({ rows: [], total: 0 });
  const [hotels, setHotels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { forbidden, message }
  const [selected, setSelected] = useState({}); // line_id -> row
  const [modal, setModal] = useState(null); // { kind, row? }
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [toast, setToast] = useState("");
  const seq = useRef(0);
  const closeBusyRef = useRef(false);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Department filter options: the department master list (the pool spans
  // every department of the buyer's hotels).
  useEffect(() => {
    let cancelled = false;
    getDepartments()
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data?.data || res?.data || [];
        setDepartments((Array.isArray(rows) ? rows : []).map((d) => ({ id: String(d.id), title: d.title || d.name })));
      })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = ++seq.current;
    const params = { page, page_size: PAGE_SIZE };
    Object.entries(filters).forEach(([k, v]) => { if (v && !(k === "assigned" && v === "any")) params[k] = v; });
    if (q) params.q = q;
    setLoading(true);
    setError(null);
    PrApi.getPool(params)
      .then((res) => {
        if (id !== seq.current) return;
        const d = res?.data || {};
        const rows = Array.isArray(d.rows) ? d.rows : [];
        setData({ rows, total: Number(d.total) || 0 });
        if (Array.isArray(d.hotels) && d.hotels.length) setHotels(d.hotels);
        // Keep only selections that are still on screen and still convertible.
        const fresh = new Map(rows.map((r) => [String(r.line_id), r]));
        setSelected((sel) => {
          const next = {};
          Object.keys(sel).forEach((k) => { const r = fresh.get(k); if (r && r.progress === "in_pool") next[k] = r; });
          return next;
        });
      })
      .catch((err) => {
        if (id !== seq.current) return;
        setError({ forbidden: errorStatus(err) === 403, message: errorCopy(err) });
      })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, [filters, q, page, reload]);

  const refetch = () => setReload((n) => n + 1);
  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const resetAll = () => { setFilters(NO_FILTERS); setCategory(null); setSearch(""); setQ(""); setPage(1); };
  const finish = (msg) => { setModal(null); showToast(msg); refetch(); };

  const { rows, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount = Object.entries(filters).filter(([k, v]) => v && !(k === "assigned" && v === "any")).length;
  const selectedRows = Object.values(selected);
  const selectedHotel = selectedRows.length ? { id: selectedRows[0].hotel_id, name: selectedRows[0].hotel_name } : null;
  const multiHotel = hotels.length > 1;

  const toggle = (row) => {
    setSelected((sel) => {
      const k = String(row.line_id);
      if (sel[k]) {
        const { [k]: _gone, ...rest } = sel;
        return rest;
      }
      return { ...sel, [k]: row };
    });
  };
  // Header checkbox: every line on this page that can join the current
  // selection (or, with nothing selected, the first in-queue line's hotel).
  const firstInPool = rows.find((r) => r.progress === "in_pool");
  const anchor = selectedHotel || (firstInPool ? { id: firstInPool.hotel_id, name: firstInPool.hotel_name } : null);
  const eligible = rows.filter((r) => !blockedReason(r, anchor));
  const allEligibleSelected = eligible.length > 0 && eligible.every((r) => selected[String(r.line_id)]);
  const toggleAll = () => {
    setSelected((sel) => {
      const next = { ...sel };
      if (allEligibleSelected) eligible.forEach((r) => { delete next[String(r.line_id)]; });
      else eligible.forEach((r) => { next[String(r.line_id)] = r; });
      return next;
    });
  };

  const closeLine = async (reason) => {
    if (closeBusyRef.current) return;
    const row = modal.row;
    closeBusyRef.current = true;
    setCloseBusy(true);
    setCloseError("");
    try {
      const res = await PrApi.closeLine(row.pr_id, row.line_id, reason);
      finish(res?.message || "Line closed");
    } catch (e) {
      setCloseError(errorCopy(e));
      if (STALE.has(errorStatus(e))) refetch();
    } finally {
      closeBusyRef.current = false;
      setCloseBusy(false);
    }
  };
  const openModal = (kind, row) => { setCloseError(""); setModal({ kind, row }); };

  if (error?.forbidden && !filters.hotel_id) {
    return (
      <div className="main-body">
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <h2>You don't work the purchase queue</h2>
          <p>
            The purchase queue is where buyers turn approved requisitions into RFQs. Ask your admin for the purchase
            requisition conversion permission at your hotel if you should be working it.
          </p>
          <Link href={purchaseRequisitions()} className="btn btn-secondary btn-sm">Back to requisitions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-body">
      <div>
        <h1 className="page-h1">Purchase queue</h1>
        <p className="page-sub">
          Approved requisition lines waiting to be sourced. Map items that aren't in the catalog, then convert lines from
          one hotel into an RFQ draft.
        </p>
      </div>

      <div className="tab-row">
        <button type="button" className={"tab" + (!filters.progress ? " active" : "")} onClick={() => setFilter("progress", "")}>
          All
        </button>
        {POOL_PROGRESSES.map((p) => (
          <button key={p} type="button" className={"tab" + (filters.progress === p ? " active" : "")} onClick={() => setFilter("progress", p)}>
            {PROGRESS_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="list-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="lt-left" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {multiHotel && (
            <select aria-label="Hotel" className="select" style={{ width: 180 }} value={filters.hotel_id} onChange={(e) => setFilter("hotel_id", e.target.value)}>
              <option value="">All hotels</option>
              {hotels.map((h) => <option key={h.id} value={String(h.id)}>{h.name}</option>)}
            </select>
          )}
          <select aria-label="Department" className="select" style={{ width: 170 }} value={filters.department_id} onChange={(e) => setFilter("department_id", e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <select aria-label="Assigned" className="select" style={{ width: 150 }} value={filters.assigned} onChange={(e) => setFilter("assigned", e.target.value)}>
            {ASSIGNED_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <div style={{ width: 220, display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <CategoryPicker
                id="pr-queue-category"
                line={{ category_id: category?.id || null, category_title: category?.title || "" }}
                onSelect={(c) => { setCategory({ id: c.id, title: c.title }); setFilter("category_id", String(c.id)); }}
              />
            </div>
            {category && (
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Clear category" onClick={() => { setCategory(null); setFilter("category_id", ""); }}>
                ×
              </button>
            )}
          </div>
          {(activeCount > 0 || q) && <button type="button" className="reset-link" onClick={resetAll}>Reset</button>}
        </div>
        <div className="lt-right">
          <div className="search-input" style={{ width: 260 }}>
            <input
              className="input" placeholder="Search by PR number, title or item…" value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search the queue"
            />
          </div>
        </div>
      </div>

      <div className="contract-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div data-testid="queue-selection" style={{ fontSize: 13 }}>
          {selectedRows.length ? (
            <span>
              <span className="em mono">{selectedRows.length}</span> {selectedRows.length === 1 ? "line" : "lines"} selected · {selectedHotel.name}
            </span>
          ) : (
            <span className="text-fg-3">
              <span className="em mono">{total}</span> {total === 1 ? "line" : "lines"} in the queue. Select lines from one hotel to convert them into an RFQ draft.
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedRows.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected({})}>Clear selection</button>
          )}
          <button type="button" className="btn btn-blue btn-sm" disabled={!selectedRows.length} onClick={() => setModal({ kind: "convert" })}>
            Convert to RFQ
          </button>
        </div>
      </div>

      {error ? (
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <h2>{error.message}</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={refetch}>Try again</button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="contract-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="contract-card"><span className="arc-sk" style={{ display: "block", width: "60%", height: 16 }} /></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        activeCount > 0 || q ? (
          <div className="empty-state" style={{ padding: "56px 24px" }}>
            <h2>No lines match</h2>
            <p>Try clearing some filters or your search.</p>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "56px 24px" }}>
            <h2>The purchase queue is empty</h2>
            <p>Lines of approved purchase requisitions appear here until they are converted into an RFQ or closed.</p>
          </div>
        )
      ) : (
        <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox" aria-label="Select every line on this page that can be converted"
                      checked={allEligibleSelected} disabled={eligible.length === 0} onChange={toggleAll}
                    />
                  </th>
                  <th>Requisition</th>
                  <th>Item</th>
                  <th className="right">Quantity</th>
                  <th className="right">Value</th>
                  <th>Need by</th>
                  <th>Age</th>
                  <th>Assignee</th>
                  <th>Progress</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const k = String(r.line_id);
                  const isSelected = Boolean(selected[k]);
                  const reason = isSelected ? null : blockedReason(r, selectedHotel);
                  const band = AGE_TONE[r.age_band] ? r.age_band : ageBand(r.age_days);
                  const freeText = r.line_kind === "free_text";
                  const unmapped = r.progress === "needs_mapping" || r.progress === "awaiting_catalog";
                  return (
                    <tr key={k} data-testid={`pool-row-${r.line_id}`}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.pr_number} line ${r.line_no}`}
                          checked={isSelected}
                          disabled={Boolean(reason)}
                          title={reason || undefined}
                          onChange={() => toggle(r)}
                        />
                      </td>
                      <td>
                        <Link href={purchaseRequisition(r.pr_id)} className="mono">{r.pr_number}</Link>
                        <div className="fs-11 text-fg-3">
                          Line {r.line_no} · {r.department_title}{multiHotel ? ` · ${r.hotel_name}` : ""}
                        </div>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 600, color: "var(--fg)" }}>{r.item_name}</div>
                        <div className="fs-11 text-fg-3">
                          {r.category_title}
                          {freeText && !unmapped && r.free_text_name ? ` · requested as "${r.free_text_name}"` : ""}
                        </div>
                        {Number(r.duplicate_count) > 0 && (
                          <span className="pill warn" style={{ marginTop: 4 }} title="Open requisitions or RFQs for the same item in your company in the last 30 days">
                            {r.duplicate_count} similar
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{`${formatQty(r.quantity)} ${r.uom}`}</td>
                      <td className="mono" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatINR(r.line_value)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div>{fmtDate(r.required_by_date)}</div>
                        <span className={`pill ${URGENCY_TONE[r.urgency] || "neutral"}`}>{URGENCY_LABEL[r.urgency] || r.urgency}</span>
                      </td>
                      <td>
                        <span data-testid={`age-${r.line_id}`} className={`pill ${AGE_TONE[band]}`} title="Since the requisition was approved">
                          {ageLabel(r.age_days)}
                        </span>
                      </td>
                      <td>{r.assigned_buyer_name || <span className="text-fg-3">Unassigned</span>}</td>
                      <td><PrProgressPill progress={r.progress} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal("assign", r)}>Assign</button>
                          {freeText && unmapped && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal("map", r)}>Map</button>
                          )}
                          {freeText && r.progress === "in_pool" && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal("map", r)}>Change mapping</button>
                          )}
                          {freeText && r.progress === "needs_mapping" && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal("catalog", r)}>Request catalog item</button>
                          )}
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal("close", r)}>Close line</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && !error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
          <button type="button" aria-label="Previous page" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
          <span style={{ fontSize: 12.5, color: "#71717a", padding: "0 8px" }}>Page {page} of {totalPages}</span>
          <button type="button" aria-label="Next page" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
        </div>
      )}

      {modal?.kind === "assign" && <AssignModal row={modal.row} meId={meId} onClose={() => setModal(null)} onDone={finish} onStale={refetch} />}
      {modal?.kind === "map" && <MapVariantModal line={modal.row} onClose={() => setModal(null)} onMapped={finish} onStale={refetch} />}
      {modal?.kind === "catalog" && <CatalogRequestModal row={modal.row} onClose={() => setModal(null)} onDone={finish} onStale={refetch} />}
      {modal?.kind === "close" && (
        <PrReasonModal
          title="Close this line"
          explain={`${modal.row.pr_number} line ${modal.row.line_no} (${modal.row.item_name}) leaves the purchase queue and won't be sourced. The requester sees your reason.`}
          label="Reason"
          confirmLabel="Close line"
          busy={closeBusy}
          error={closeError}
          onConfirm={closeLine}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "convert" && (
        <ConvertModal
          lines={selectedRows}
          onClose={() => setModal(null)}
          onRefresh={() => { setModal(null); setSelected({}); refetch(); }}
        />
      )}

      {toast && (
        <div className="arc-toast" role="status"><span className="t-ic">✓</span><span>{toast}</span></div>
      )}
    </div>
  );
}
