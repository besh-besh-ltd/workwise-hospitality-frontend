// The PR's lines: what was asked for, what it is worth, where it stands, and
// the RFQ / PO it went to. Each line expands into PrLineWork (spec, clauses,
// files); lines the caller reviews open with edit controls — on load, and
// whenever a refetch makes more lines editable.

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PrProgressPill from "./PrProgressPill";
import PrLineWork from "./PrLineWork";
import { formatINR, formatQty } from "./prFormat";
import { lineName } from "./prDetail";
import { poDetail, rfqDetail } from "@/components/dashboard/shared/dashboardLinks";

const sub = { fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 };

function LineLinks({ links }) {
  if (!links?.length) return <span style={{ color: "var(--fg-4)" }}>—</span>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {links.map((k) => (
        <div key={k.rfq_id} style={{ opacity: k.live ? 1 : 0.6 }}>
          <Link href={rfqDetail(k.rfq_id)} className="mono fw-600">{`RFQ #${k.rfq_no ?? k.rfq_id}`}</Link>{" "}
          <span style={sub}>{k.rfq_status_label}</span>
          {!k.live && <span style={sub}> · no longer active</span>}
          {(k.po || []).length > 0 && (
            <div style={sub}>
              {"PO "}
              {k.po.map((p, i) => (
                <Fragment key={p.po_id}>
                  {i > 0 && ", "}
                  <Link href={poDetail(p.po_id)} className="mono">{p.po_number || `#${p.po_id}`}</Link>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const detailsLabel = (l) => {
  const parts = [];
  if (l.specification) parts.push("spec");
  if (l.clauses?.length) parts.push(`${l.clauses.length} clause${l.clauses.length === 1 ? "" : "s"}`);
  if (l.attachments?.length) parts.push(`${l.attachments.length} file${l.attachments.length === 1 ? "" : "s"}`);
  return parts.length ? `Details · ${parts.join(" · ")}` : "Details";
};

export default function PrLinesTable({
  prId, lines, total, editableLineIds = [], cancellableLineIds = [], run, busy, meId, raisedBy, onCancelLine,
}) {
  const editable = new Set(editableLineIds);
  const cancellable = new Set(cancellableLineIds);
  const [open, setOpen] = useState(() => new Set(editableLineIds));

  // Open lines that became editable since the last render (review capability
  // granted or widened by a refetch). Lines the user closed stay closed until
  // they are granted again.
  const editKey = editableLineIds.join(",");
  const lastEditable = useRef(new Set(editableLineIds));
  useEffect(() => {
    const ids = editKey ? editKey.split(",").map(Number) : [];
    const fresh = ids.filter((id) => !lastEditable.current.has(id));
    lastEditable.current = new Set(ids);
    if (fresh.length) setOpen((cur) => new Set([...cur, ...fresh]));
  }, [editKey]);
  const toggle = (id) => setOpen((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div>
            <h2>Items requested</h2>
            <div className="h-sub">{lines.length} item{lines.length === 1 ? "" : "s"} · open Details for the specification, clauses and files</div>
          </div>
        </div>
      </div>
      <div className="section-body flush" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th className="right">Qty</th>
              <th className="right">Est. unit price</th>
              <th className="right">Value</th>
              <th>Progress</th>
              <th>RFQ / PO</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--fg-4)" }}>No items on this requisition.</td></tr>
            )}
            {lines.map((l) => {
              const ended = l.status === "cancelled" || l.status === "closed";
              const isOpen = open.has(l.id);
              return (
                <Fragment key={l.id}>
                  <tr style={ended ? { opacity: 0.65 } : undefined}>
                    <td className="mono">{String(l.line_no).padStart(2, "0")}</td>
                    <td style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 600, color: "var(--fg)" }}>{lineName(l)}</div>
                      <div style={sub}>
                        {l.category_title || "—"}
                        {l.line_kind === "free_text" ? " · not in catalog" : ""}
                      </div>
                      {l.line_kind === "free_text" && l.mapped_variant_name && (
                        <div style={{ ...sub, color: "var(--success)" }}>Mapped to {l.mapped_variant_name}</div>
                      )}
                      {l.specification && (
                        <div style={{ ...sub, maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={l.specification}>
                          {l.specification}
                        </div>
                      )}
                      {ended && l.close_reason && (
                        <div style={sub}>{l.status === "closed" ? "Closed" : "Cancelled"}: {l.close_reason}</div>
                      )}
                    </td>
                    <td className="right">
                      {formatQty(l.quantity)} <span style={{ fontWeight: 500, fontSize: 11, color: "var(--fg-3)" }}>{l.uom}</span>
                    </td>
                    <td className="right">{formatINR(l.estimated_unit_price)}</td>
                    <td className="right">{formatINR(l.line_value)}</td>
                    <td><PrProgressPill progress={l.progress} /></td>
                    <td><LineLinks links={l.links} /></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="btn btn-ghost btn-sm" aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Hide" : "Show"} details for item ${l.line_no}`} onClick={() => toggle(l.id)}>
                        {isOpen ? "Hide details" : detailsLabel(l)}
                      </button>
                      {cancellable.has(l.id) && (
                        <button type="button" className="btn btn-outline-danger btn-sm" aria-label={`Cancel item ${l.line_no}`} disabled={busy}
                          onClick={() => onCancelLine(l)}>
                          Cancel item
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <PrLineWork prId={prId} line={l} canEdit={editable.has(l.id)} run={run} busy={busy}
                          meId={meId} raisedBy={raisedBy} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="right" style={{ padding: "12px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-3)" }}>
                  Estimated total
                </td>
                <td className="right mono fw-700" style={{ padding: "12px 16px" }}>{total ? formatINR(total) : "—"}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
