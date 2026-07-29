// ArcStepVendorsTargets — Step 2 of the ARC negotiation round wizard.
// Mirrors StepVendorsAndTargets.js + VendorListPanel.js (select-all/none, per-vendor rows),
// but the per-vendor "expand" collapses to ONE optional numeric target rate input.
import { useMemo } from "react";

const AV_CLASSES = ["av-blue", "av-green", "av-amber", "av-violet", "av-indigo", "av-pink"];
function avClass(id) {
  if (id === null || id === undefined) return AV_CLASSES[0];
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AV_CLASSES[Math.abs(h) % AV_CLASSES.length];
}
function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}
function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

export default function ArcStepVendorsTargets({
  level,            // 'item' | 'arc'
  selectedItemId,
  items = [],
  eligibleVendors = [],   // already filtered by the state hook
  selectedVendorIds = [],
  vendorTargets = {},     // { [vid]: string }
  onToggleVendor,
  onSelectAll,
  onDeselectAll,
  onSetVendorTarget,
}) {
  const allSelected = eligibleVendors.length > 0 && eligibleVendors.every((v) => selectedVendorIds.includes(v.vendor_id));
  const noneSelected = selectedVendorIds.length === 0;

  const item = useMemo(() => {
    if (level !== "item" || !selectedItemId) return null;
    return items.find((it) => (it.id || it.arc_item_id) === selectedItemId) || null;
  }, [level, selectedItemId, items]);

  const itemName = item ? (item.variant_name || item.name || item.title || `Item ${selectedItemId}`) : null;

  // Get the vendor's rate for the current scope (item-level or best rate across items for arc-level)
  const vendorCurrentRate = (v) => {
    if (level === "item" && selectedItemId) {
      const line = (v.lines || []).find((l) => l.arc_item_id === selectedItemId);
      return line && !line.disqualified ? line.rate : null;
    }
    // arc-level: show basket total as indicative anchor
    const validLines = (v.lines || []).filter((l) => !l.disqualified && l.rate != null);
    if (!validLines.length) return null;
    return validLines.reduce((s, l) => s + Number(l.rate), 0);
  };

  return (
    <div className="arc-neg-step-card">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", marginBottom: 2 }}>
          {level === "arc" ? "ARC-level round — select vendors & targets" : `Item: ${itemName || "selected item"}`}
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
          Select the vendors to invite and optionally set a target rate for each. Vendors will see the target as a negotiation hint.
        </div>
      </div>

      {eligibleVendors.length === 0 ? (
        <div className="empty-state" style={{ padding: "24px 0" }}>
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>No eligible vendors for this scope.</div>
        </div>
      ) : (
        <>
          {/* Select-all toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <button className="btn btn-sm btn-secondary" onClick={onSelectAll} disabled={allSelected}>Select all</button>
            <button className="btn btn-sm btn-ghost" onClick={onDeselectAll} disabled={noneSelected}>Deselect all</button>
            <span style={{ fontSize: 12, color: "var(--fg-3)", marginLeft: 4 }}>
              {selectedVendorIds.length} / {eligibleVendors.length} selected
            </span>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "flex", gap: 10 }}>
            <span style={{ flex: 1 }}>Vendor</span>
            <span style={{ width: 110 }}>Current rate</span>
            <span style={{ width: 140 }}>Target rate (optional)</span>
          </div>

          <div className="arc-neg-vendor-list">
            {eligibleVendors.map((v) => {
              const isSelected = selectedVendorIds.includes(v.vendor_id);
              const rate = vendorCurrentRate(v);
              const target = vendorTargets[v.vendor_id] || "";
              return (
                <div
                  key={v.vendor_id}
                  className={"arc-neg-vendor-row" + (isSelected ? " selected" : "")}
                >
                  <input
                    type="checkbox"
                    className="arc-neg-vendor-check"
                    checked={isSelected}
                    onChange={() => onToggleVendor(v.vendor_id)}
                    id={`vendor-chk-${v.vendor_id}`}
                  />
                  <div className={"arc-neg-vendor-av " + avClass(v.vendor_id)}>
                    {initialsOf(v.vendor_name)}
                  </div>
                  <label
                    htmlFor={`vendor-chk-${v.vendor_id}`}
                    className="arc-neg-vendor-name"
                    style={{ cursor: "pointer", flex: 1 }}
                  >
                    {v.vendor_name}
                  </label>
                  <span className="arc-neg-vendor-rate" style={{ width: 110, textAlign: "right" }}>
                    {fmtINR(rate)}
                    {level === "arc" && rate !== null && <span style={{ fontSize: 10, display: "block", color: "var(--fg-4)" }}>basket</span>}
                  </span>
                  <div style={{ width: 140 }}>
                    {isSelected && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>₹</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="arc-neg-target-input"
                          placeholder="Target"
                          value={target}
                          onChange={(e) => onSetVendorTarget(v.vendor_id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedVendorIds.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 8 }}>
              Select at least one vendor to continue.
            </div>
          )}
        </>
      )}
    </div>
  );
}
