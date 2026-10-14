// Line editing for the PR form: catalog typeahead (with guided buying away from
// items on rate contract), free-text rows with a category picker, per-row
// quantity / unit / price / specification, duplicate hint and exact line value.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchItems, searchCategories, getDuplicates } from "@/services/pr";
import { materialRequisitionCreate, purchaseRequisition } from "@/components/dashboard/shared/dashboardLinks";
import { formatINR } from "./prFormat";
import {
  MAX_LINES, SPEC_MAX, NOTE_MAX, UOM_MAX, NAME_MAX,
  cleanDecimal, lineErrors, lineFromItem, newFreeTextLine, rowValue,
} from "./prLines";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

// Shared debounced typeahead with the AddProductsModal stale-response guard:
// a response is applied only if it belongs to the latest request.
export function useTypeahead(fetcher, query, { enabled = true, minChars = MIN_CHARS } = {}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const timer = useRef(null);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  useEffect(() => {
    if (!enabled) return undefined;
    clearTimeout(timer.current);
    const q = query.trim();
    const myReq = ++reqId.current;
    if (q.length < minChars) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      Promise.resolve()
        .then(() => fetchRef.current(q))
        .then((list) => { if (myReq === reqId.current) setResults(Array.isArray(list) ? list : []); })
        .catch(() => { if (myReq === reqId.current) setResults([]); })
        .finally(() => { if (myReq === reqId.current) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer.current); reqId.current += 1; };
  }, [query, enabled, minChars]);

  return { results, loading };
}

const boxStyle = { position: "relative" };
const popStyle = {
  marginTop: 6, maxHeight: 260, overflowY: "auto", background: "white",
  border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-md)",
};

function CatalogSearch({ hotelId, departmentId, addedVariantIds, onPick, onClose }) {
  const [q, setQ] = useState("");
  const { results, loading } = useTypeahead(
    (term) => searchItems({ hotel_id: Number(hotelId), department_id: Number(departmentId), q: term, limit: 25 })
      .then((res) => res?.data?.items || []),
    q,
  );
  const trimmed = q.trim();

  return (
    <div style={boxStyle}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          autoFocus
          aria-label="Search catalog items"
          placeholder="Search the catalog by item name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
      {trimmed.length >= MIN_CHARS && (
        <div style={popStyle}>
          {loading && <div className="help-text" style={{ padding: 12 }}>Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="help-text" style={{ padding: 12 }}>
              Nothing in the catalog matches. Use "Add item not in catalog" instead.
            </div>
          )}
          {results.map((it) => {
            const already = addedVariantIds.has(it.variant_id);
            const disabled = it.on_contract || already;
            return (
              <div
                key={it.variant_id}
                data-testid={`search-result-${it.variant_id}`}
                aria-disabled={disabled ? "true" : "false"}
                onClick={() => { if (!disabled) onPick(it); }}
                style={{
                  padding: "9px 12px", borderBottom: "1px solid var(--border)",
                  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{it.variant_name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                  {it.category_title}
                  {it.product_name && it.product_name !== it.variant_name ? ` · ${it.product_name}` : ""}
                </div>
                {it.on_contract && (
                  <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 3 }}>
                    <span>On contract {it.arc_number} — </span>
                    <Link href={materialRequisitionCreate()} onClick={(e) => e.stopPropagation()}>
                      raise an MR
                    </Link>
                  </div>
                )}
                {!it.on_contract && already && (
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>Already added</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CategoryPicker({ id, line, error, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { results, loading } = useTypeahead(
    (term) => searchCategories(term).then((res) => res?.data?.categories || []),
    q,
    { enabled: open, minChars: 1 },
  );

  if (line.category_id && !open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="input" style={{ flex: 1 }}>{line.category_title || `Category ${line.category_id}`}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(true); setQ(""); }}>Change</button>
      </div>
    );
  }
  return (
    <div style={boxStyle}>
      <input
        id={id}
        className="input"
        placeholder="Type to find a category…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setOpen(true); setQ(e.target.value); }}
        style={error ? { borderColor: "var(--danger)" } : undefined}
      />
      {open && q.trim().length >= 1 && (
        <div style={popStyle}>
          {loading && <div className="help-text" style={{ padding: 12 }}>Searching…</div>}
          {!loading && results.length === 0 && <div className="help-text" style={{ padding: 12 }}>No matching category.</div>}
          {results.map((c) => (
            <div
              key={c.id}
              onClick={() => { onSelect(c); setOpen(false); setQ(""); }}
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
            >
              {c.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The duplicate check minus the PR being edited (it is "open" too, but it is this one). */
export function withoutOwnPr(dup, ownPrId) {
  if (!dup) return null;
  const items = dup.items || [];
  if (ownPrId == null || ownPrId === "") return { ...dup, items };
  const isOwn = (d) => d.kind === "pr" && String(d.id) === String(ownPrId);
  const own = items.filter(isOwn).length;
  return { ...dup, count: Math.max(0, (Number(dup.count) || 0) - own), items: items.filter((d) => !isOwn(d)) };
}

function DuplicateHint({ hotelId, variantId, excludePrId }) {
  const [raw, setDup] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setDup(null);
    if (!hotelId || !variantId) return undefined;
    getDuplicates({ hotel_id: Number(hotelId), variant_id: variantId })
      .then((res) => { if (!cancelled) setDup(res?.data || null); })
      .catch(() => { if (!cancelled) setDup(null); }); // informational only
    return () => { cancelled = true; };
  }, [hotelId, variantId]);

  const dup = withoutOwnPr(raw, excludePrId);
  if (!dup || !dup.count) return null;
  return (
    <div className="guide warn" style={{ gridColumn: "1 / -1", fontSize: 12 }}>
      <div>
        <strong>{dup.count} open request{dup.count === 1 ? "" : "s"} for this item in your company in the last 30 days.</strong>{" "}
        You can still go ahead.
        <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
          {dup.items.map((d) => (
            <li key={`${d.kind}-${d.id}`}>
              {d.readable && d.kind === "pr" ? (
                <Link href={purchaseRequisition(d.id)}>{d.number}{d.title ? ` · ${d.title}` : ""}</Link>
              ) : d.readable ? (
                <span>{d.number}{d.title ? ` · ${d.title}` : ""}</span>
              ) : null}
              {d.readable ? ` — ${d.hotel_name} · ${d.department_name}` : `${d.hotel_name} · ${d.department_name}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const errStyle = { color: "var(--danger)", fontSize: 11.5, marginTop: 4 };

function LineRow({ line, index, hotelId, excludePrId, showErrors, flagged, onChange, onRemove, contractChecking, onRetryContractCheck }) {
  const errs = lineErrors(line);
  const show = (k) => (showErrors ? errs[k] : null);
  const invalid = flagged || line.on_contract || line.contract_unverified || (showErrors && Object.keys(errs).length > 0);
  const set = (patch) => onChange({ ...line, ...patch });
  const fid = (f) => `${line.key}-${f}`;
  const value = rowValue(line);
  const n = index + 1;

  return (
    <div
      className="pr-line"
      data-testid={`pr-line-${n}`}
      data-invalid={invalid ? "true" : "false"}
      style={{
        display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10, padding: "14px 16px",
        background: "var(--surface-2)", borderRadius: 10,
        border: `1px solid ${invalid ? "var(--danger)" : "var(--border)"}`,
      }}
    >
      {line.on_contract && (
        <div className="guide danger" role="alert" style={{ gridColumn: "1 / -1", fontSize: 12 }}>
          <div>
            <span>On contract {line.arc_number} — </span>
            <Link href={materialRequisitionCreate()}>raise an MR</Link>
            <span> instead. Remove this line to continue.</span>
          </div>
        </div>
      )}
      {line.contract_unverified && !line.on_contract && (
        <div className="guide warn" role="alert" style={{ gridColumn: "1 / -1", fontSize: 12 }}>
          <div>
            <span>Couldn&apos;t verify contract status for this hotel and department — </span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={contractChecking}
              aria-label={`Retry the contract check for item ${n}`} onClick={onRetryContractCheck}>
              {contractChecking ? "Checking…" : "Retry"}
            </button>
          </div>
        </div>
      )}
      <div style={{ gridColumn: "1 / -2" }}>
        {line.kind === "catalog" ? (
          <>
            <div className="label">Item {n}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{line.label}</div>
            <div className="help-text" style={{ marginTop: 0 }}>{line.category_title}</div>
          </>
        ) : (
          <>
            <label className="label" htmlFor={fid("name")}>Item name <span className="req">*</span></label>
            <input
              id={fid("name")} aria-label="Item name" className="input" maxLength={NAME_MAX} value={line.free_text_name}
              placeholder="Describe the item (not in catalog)"
              onChange={(e) => set({ free_text_name: e.target.value })}
            />
            {show("name") && <div style={errStyle}>{show("name")}</div>}
          </>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove line ${n}`} onClick={onRemove}>Remove</button>
      </div>

      {line.kind === "free_text" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label" htmlFor={fid("cat")}>Category <span className="req">*</span></label>
          <CategoryPicker
            id={fid("cat")} line={line} error={show("category")}
            onSelect={(c) => set({ category_id: c.id, category_title: c.title })}
          />
          {show("category") && <div style={errStyle}>{show("category")}</div>}
        </div>
      )}

      <div style={{ gridColumn: "span 2" }}>
        <label className="label" htmlFor={fid("qty")}>Quantity <span className="req">*</span></label>
        <input
          id={fid("qty")} aria-label="Quantity" className="input" inputMode="decimal" value={line.quantity} placeholder="0"
          onChange={(e) => set({ quantity: cleanDecimal(e.target.value) })}
        />
        {show("quantity") && <div style={errStyle}>{show("quantity")}</div>}
      </div>
      <div>
        <label className="label" htmlFor={fid("uom")}>Unit <span className="req">*</span></label>
        <input
          id={fid("uom")} aria-label="Unit" className="input" maxLength={UOM_MAX} value={line.uom} placeholder="kg, pcs…"
          onChange={(e) => set({ uom: e.target.value })}
        />
        {show("uom") && <div style={errStyle}>{show("uom")}</div>}
      </div>
      <div style={{ gridColumn: "span 2" }}>
        <label className="label" htmlFor={fid("price")}>Estimated unit price (₹) <span className="req">*</span></label>
        <input
          id={fid("price")} className="input" inputMode="decimal" value={line.price} placeholder="0.00"
          aria-label="Estimated unit price"
          onChange={(e) => set({ price: cleanDecimal(e.target.value) })}
        />
        {show("price") && <div style={errStyle}>{show("price")}</div>}
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="label">Line value</div>
        <div className="mono" style={{ fontWeight: 700, paddingTop: 6 }}>{value ? formatINR(value) : "—"}</div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label className="label" htmlFor={fid("spec")}>Specification <span className="label-meta">optional</span></label>
        <textarea
          id={fid("spec")} aria-label="Specification" className="textarea" style={{ minHeight: 56 }} value={line.specification}
          placeholder="Size, brand, grade, anything the reviewer should know"
          onChange={(e) => set({ specification: e.target.value })}
        />
        <div className="help-text" style={line.specification.length > SPEC_MAX ? { color: "var(--danger)" } : undefined}>
          {line.specification.length} / {SPEC_MAX}
        </div>
        {show("specification") && <div style={errStyle}>{show("specification")}</div>}
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label className="label" htmlFor={fid("note")}>Suggested vendor <span className="label-meta">optional</span></label>
        <input
          id={fid("note")} className="input" maxLength={NOTE_MAX} value={line.note}
          placeholder="A vendor you have used before, if any"
          onChange={(e) => set({ note: e.target.value })}
        />
      </div>

      {line.kind === "catalog" && <DuplicateHint hotelId={hotelId} variantId={line.product_variant_id} excludePrId={excludePrId} />}
    </div>
  );
}

export default function PrLineEditor({
  lines, onChange, hotelId, departmentId, showErrors, flaggedLineNos = [], excludePrId = null,
  contractChecking = false, onRetryContractCheck = () => {},
}) {
  const [searching, setSearching] = useState(false);
  const ready = Boolean(hotelId && departmentId);
  const full = lines.length >= MAX_LINES;
  const addedVariantIds = new Set(lines.map((l) => l.product_variant_id).filter(Boolean));

  const replaceAt = (i, next) => onChange(lines.map((l, j) => (j === i ? next : l)));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!ready || full} onClick={() => setSearching(true)}>
          Add catalog item
        </button>
        <button
          type="button" className="btn btn-secondary btn-sm" disabled={!ready || full}
          onClick={() => onChange([...lines, newFreeTextLine()])}
        >
          Add item not in catalog
        </button>
      </div>
      {!ready && (
        <div className="help-text" style={{ marginBottom: 12 }}>Choose a hotel and department first. That decides which items you can pick.</div>
      )}
      {full && <div className="help-text">A requisition can have up to {MAX_LINES} items.</div>}

      {ready && searching && (
        <div style={{ marginBottom: 12 }}>
          <CatalogSearch
            hotelId={hotelId} departmentId={departmentId} addedVariantIds={addedVariantIds}
            onClose={() => setSearching(false)}
            onPick={(item) => { onChange([...lines, lineFromItem(item)]); setSearching(false); }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lines.map((line, i) => (
          <LineRow
            key={line.key} line={line} index={i} hotelId={hotelId} excludePrId={excludePrId} showErrors={showErrors}
            flagged={flaggedLineNos.includes(i + 1)}
            contractChecking={contractChecking}
            onRetryContractCheck={onRetryContractCheck}
            onChange={(next) => replaceAt(i, next)}
            onRemove={() => onChange(lines.filter((_, j) => j !== i))}
          />
        ))}
        {lines.length === 0 && (
          <div className="help-text" style={{ padding: 16, border: "1px dashed var(--border)", borderRadius: 10 }}>
            No items yet. Add something from the catalog, or describe it if it isn't there.
          </div>
        )}
      </div>
    </div>
  );
}
