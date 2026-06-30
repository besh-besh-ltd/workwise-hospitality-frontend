// ArcStepItem — Step 1 of the ARC negotiation round wizard.
// Mirrors StepProduct.js: a "whole-ARC" radio card (is_arc_level) + a radio list of items.
// Disables items that are busyItemIds (non-terminal round) or already queued.
// Disables whole-ARC if arcLevelBusy or hasQueuedArcLevel.
import { useEffect, useState } from "react";

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

// Compute the current L1 rate for an item across vendors (cheapest non-disqualified line)
function l1RateFor(itemId, vendors) {
  let best = null;
  (vendors || []).forEach((v) => {
    const line = (v.lines || []).find((l) => l.arc_item_id === itemId);
    if (!line || line.disqualified || line.rate == null) return;
    const r = Number(line.rate);
    if (best === null || r < best) best = r;
  });
  return best;
}

export default function ArcStepItem({
  items = [],
  vendors = [],
  qualifiedMap = {},
  busyItemIds = [],
  arcLevelBusy = false,
  level,
  selectedItemId,
  queuedItemIds,
  hasQueuedArcLevel,
  onSelectLevel,   // (level) => void
  onSelectItem,    // (id) => void
  eligibleVendors,
  onAutoSelectVendors, // called after item pick to auto-select eligible vendors
}) {
  const [search, setSearch] = useState("");

  // When level changes to 'arc', item stays null (fine)
  useEffect(() => {
    if (level === "arc" && eligibleVendors && eligibleVendors.length > 0) {
      onAutoSelectVendors(eligibleVendors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handleSelectItem = (id) => {
    onSelectItem(id);
  };

  // After eligibleVendors updates following item pick, auto-select them.
  // The parent calls autoSelectEligibleVendors in the state hook.
  const handleItemClick = (id, disabled) => {
    if (disabled) return;
    onSelectItem(id);
  };

  const arcLevelDisabled = arcLevelBusy || hasQueuedArcLevel;

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    const name = it.variant_name || it.name || it.title || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="arc-neg-step-card">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>Select scope</div>
        <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
          Choose a single item to target, or create an ARC-level round covering all vendors on this contract.
        </div>
      </div>

      {/* Whole-ARC card */}
      <div
        className={"arc-neg-scope-card" + (level === "arc" ? " selected" : "") + (arcLevelDisabled ? " disabled" : "")}
        onClick={() => { if (!arcLevelDisabled) { onSelectLevel("arc"); } }}
        style={{ marginBottom: 12 }}
      >
        <div className={"arc-neg-radio" + (level === "arc" ? " checked" : "")} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)" }}>Whole ARC</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
            {arcLevelDisabled
              ? (arcLevelBusy ? "An ARC-level round is already in progress." : "ARC-level entry already queued.")
              : `Invite all ${vendors.length} vendor${vendors.length === 1 ? "" : "s"} to revise their rates across all items.`}
          </div>
        </div>
      </div>

      {/* Item list */}
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Or pick an item
      </div>

      {items.length > 6 && (
        <input
          type="text"
          className="arc-neg-banner-input"
          style={{ width: "100%", marginBottom: 10 }}
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <div className="arc-neg-item-list">
        {filtered.map((it) => {
          const itemId = it.id || it.arc_item_id;
          const isBusy = busyItemIds.includes(itemId);
          const isQueued = queuedItemIds && queuedItemIds.has(itemId);
          const disabled = isBusy || isQueued;
          const selected = level === "item" && selectedItemId === itemId;
          const l1Rate = l1RateFor(itemId, vendors);
          const itemName = it.variant_name || it.name || it.title || it.product_name || `Item ${itemId}`;
          const qty = it.indicative_qty;
          const uom = it.uom || "";
          return (
            <div
              key={itemId}
              className={"arc-neg-item-row" + (selected ? " selected" : "") + (disabled ? " disabled" : "")}
              onClick={() => handleItemClick(itemId, disabled)}
            >
              <div className={"arc-neg-radio" + (selected ? " checked" : "")} />
              <div style={{ flex: 1 }}>
                <div className="arc-neg-item-name">{itemName}</div>
                <div className="arc-neg-item-meta">
                  {qty != null && <span>{Number(qty).toLocaleString("en-IN")} {uom}</span>}
                  {l1Rate !== null && <span> · L1 {fmtINR(l1Rate)}</span>}
                  {isBusy && <span style={{ color: "var(--warn)", marginLeft: 6 }}>· Round in progress</span>}
                  {isQueued && <span style={{ color: "var(--primary)", marginLeft: 6 }}>· Already queued</span>}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "12px 0" }}>No items match the search.</div>
        )}
      </div>
    </div>
  );
}
