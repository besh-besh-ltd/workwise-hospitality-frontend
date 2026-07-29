// ArcStepReview — Step 3 of the ARC negotiation round wizard.
// Mirrors StepReview.js: one card per staged entry (queue + current), each showing
// scope + vendor/target table + edit/remove; a single datetime-local End date picker.
import { useMemo } from "react";

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

// Show a readable end date
function fmtEndDate(localStr) {
  if (!localStr) return "—";
  try {
    const d = new Date(localStr);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return localStr; }
}

function EntryCard({ entry, idx, isQueue, items, vendors, onEdit, onRemove }) {
  const itemName = useMemo(() => {
    if (entry.kind === "arc") return "Whole ARC";
    const item = items.find((it) => (it.id || it.arc_item_id) === entry.arc_item_id);
    return entry._label || (item ? (item.variant_name || item.name || item.title || `Item ${entry.arc_item_id}`) : `Item ${entry.arc_item_id}`);
  }, [entry, items]);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 10, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)" }}>
            {isQueue ? `Queued entry ${idx + 1}` : "Current entry"}
          </span>
          {" "}
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>· {itemName}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => onEdit(idx)}>Edit</button>
          <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }} onClick={() => onRemove(idx)}>Remove</button>
        </div>
      </div>

      {/* Vendor + target table */}
      {entry.vendor_targets && entry.vendor_targets.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontWeight: 600, color: "var(--fg-3)", padding: "3px 8px 5px", borderBottom: "1px solid var(--border)" }}>Vendor</th>
              <th style={{ textAlign: "right", fontWeight: 600, color: "var(--fg-3)", padding: "3px 8px 5px", borderBottom: "1px solid var(--border)" }}>Target rate</th>
            </tr>
          </thead>
          <tbody>
            {entry.vendor_targets.map((vt) => {
              const v = vendors.find((vv) => vv.vendor_id === vt.vendor_id);
              return (
                <tr key={vt.vendor_id}>
                  <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)" }}>{v ? v.vendor_name : `Vendor ${vt.vendor_id}`}</td>
                  <td style={{ padding: "5px 8px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "monospace" }}>
                    {vt.target_rate != null ? fmtINR(vt.target_rate) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>No vendors selected.</div>
      )}
    </div>
  );
}

export default function ArcStepReview({
  level,
  selectedItemId,
  items = [],
  vendors = [],
  eligibleVendors = [],
  selectedVendorIds = [],
  vendorTargets = {},
  endDate,
  onSetEndDate,
  queue = [],
  onEditQueueEntry,  // (idx) => void
  onRemoveQueueEntry, // (idx) => void
  onAddAnother,      // () => void — go back to step 1 to queue current + pick another
  canAddAnother,
  submitting = false,
}) {
  // Build a "current" entry from wizard state for display purposes
  const currentEntry = useMemo(() => {
    if (!selectedVendorIds.length) return null;
    const vtList = selectedVendorIds.map((vid) => {
      const raw = vendorTargets[vid];
      const n = raw !== undefined && raw !== "" ? Number(raw) : null;
      return n !== null && Number.isFinite(n) ? { vendor_id: vid, target_rate: n } : { vendor_id: vid };
    });
    if (level === "arc") {
      return { kind: "arc", vendor_targets: vtList, _label: "Whole ARC" };
    }
    const item = items.find((it) => (it.id || it.arc_item_id) === selectedItemId);
    const label = item ? (item.variant_name || item.name || item.title || `Item ${selectedItemId}`) : `Item ${selectedItemId}`;
    return { kind: "item", arc_item_id: selectedItemId, vendor_targets: vtList, _label: label };
  }, [level, selectedItemId, selectedVendorIds, vendorTargets, items]);

  const totalEntries = queue.length + (currentEntry ? 1 : 0);

  // Min datetime = now + 5 minutes
  const minDatetime = useMemo(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  return (
    <div className="arc-neg-step-card">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", marginBottom: 2 }}>
          Review & confirm
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
          {totalEntries} entr{totalEntries === 1 ? "y" : "ies"} will be sent in a single round.
          All entries share the same end date.
        </div>
      </div>

      {/* Queued entries */}
      {queue.map((entry, idx) => (
        <EntryCard
          key={idx}
          entry={entry}
          idx={idx}
          isQueue
          items={items}
          vendors={vendors}
          onEdit={onEditQueueEntry}
          onRemove={onRemoveQueueEntry}
        />
      ))}

      {/* Current in-progress entry */}
      {currentEntry && (
        <EntryCard
          entry={currentEntry}
          idx={-1}
          isQueue={false}
          items={items}
          vendors={vendors}
          onEdit={() => {}}
          onRemove={() => {}}
        />
      )}

      {/* Add another item */}
      <div style={{ marginTop: 4, marginBottom: 18 }}>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onAddAnother}
          disabled={!canAddAnother || submitting}
        >
          + Add another item
        </button>
        {!canAddAnother && (
          <span style={{ fontSize: 12, color: "var(--fg-3)", marginLeft: 10 }}>
            No more items available to add.
          </span>
        )}
      </div>

      {/* End date */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
          Round end date <span style={{ color: "var(--danger)" }}>*</span>
        </label>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 8 }}>
          Vendors have until this date to submit their revised rates.
          All entries in this round share this deadline.
        </div>
        <input
          type="datetime-local"
          min={minDatetime}
          value={endDate}
          onChange={(e) => onSetEndDate(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--border-input,#d1d5db)",
            borderRadius: 8,
            fontFamily: "inherit",
            fontSize: 13,
            width: "100%",
            maxWidth: 320,
          }}
          disabled={submitting}
        />
        {!endDate && (
          <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>End date is required.</div>
        )}
        {endDate && (
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>
            Deadline: {fmtEndDate(endDate)}
          </div>
        )}
      </div>
    </div>
  );
}
