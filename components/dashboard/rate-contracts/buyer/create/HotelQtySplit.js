// Create wizard · Items — how much of an item each covered hotel expects to
// buy. The contract's quantity for the item is the total; the server derives it
// from these entries. Vendors see each hotel's quantity when pricing delivery.

import { hotelSplitTotal } from "@/utils/groupArc";

export default function HotelQtySplit({ hotels = [], values = {}, uom = "", onChange }) {
  const total = hotelSplitTotal(values);
  return (
    <div>
      <label className="label">Expected quantity per hotel <span className="req">*</span></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {hotels.map((h) => (
          <div key={h.id}>
            <div className="help-text" style={{ marginTop: 0, marginBottom: 4, color: "var(--fg-2)" }}>
              {h.name}{h.isLead ? " · lead" : ""}
            </div>
            <div className="input-group">
              <input
                type="number"
                min={0}
                className="input input-num"
                aria-label={`${h.name} quantity`}
                value={values[h.id] ?? ""}
                onChange={(e) => onChange(h.id, e.target.value)}
                placeholder="0"
              />
              <div className="suffix">{uom || "unit"}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="help-text" style={{ marginTop: 8 }}>
        Total for the group: <span className="mono fw-700" style={{ color: "var(--fg)" }}>{total.toLocaleString("en-IN")}</span> {uom || ""}
      </div>
    </div>
  );
}
