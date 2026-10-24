import React, { useId } from "react";
import r from "@/components/inventory/receive/receive.module.scss";

// Hotel picker for the stock screens. The options are the hotels the server
// listed for this caller (GET /stock `hotels`); the value picked only chooses
// among them. Renders nothing for a single hotel unless `always` is set.
//
// Props: hotels [{id, name}], value (id|""), onChange(id|""), allLabel (adds an
// "all hotels" option with value ""), label, always, className.
const HotelSelect = ({ hotels, value, onChange, allLabel = null, label = "Hotel", always = false, className = "" }) => {
  const id = useId();
  if (!Array.isArray(hotels) || hotels.length === 0) return null;
  if (hotels.length === 1 && !always && !allLabel) return null;
  return (
    <div className={className}>
      <label className={r.label} htmlFor={id}>{label}</label>
      <select
        id={id}
        className={r.select}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      >
        {allLabel && <option value="">{allLabel}</option>}
        {hotels.map((h) => (
          <option key={h.id} value={String(h.id)}>{h.name}</option>
        ))}
      </select>
    </div>
  );
};

export default HotelSelect;
