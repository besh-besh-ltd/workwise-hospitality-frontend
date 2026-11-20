// GST rate dropdown for the vendor's quote forms (RFQ quote wizard and the
// rate contract quote). Vendors pick a rate from GST_RATES instead of typing one.
//
// A value saved before the dropdown existed (2%, 0%, 7.5% …) is not lost: it is
// added to the list and shown selected, so the quote still reads exactly as it
// was submitted. It stays in the list while the box is open, so a vendor who
// changes it can go back; once they pick a listed rate and save, the next load
// has no saved odd value and the extra option is gone.
//
// A charge saved earlier with a flat ₹ tax shows that figure as "₹N (saved)"
// while the field is still in ₹; the field's own % button clears it, as before.
//
// UI only: the value handed to onChange is the option's string ("5", "12" …,
// or "" for the blank option), the same shape the old number box produced.

import { useRef } from "react";

export const GST_RATES = [5, 12, 18, 28, 40];

const isBlank = (v) => v === "" || v === null || v === undefined;

// "18.00" → "18", 2.5 → "2.5"; anything that is not a number is kept as typed.
const clean = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
};

export const isListedGstRate = (v) => !isBlank(v) && GST_RATES.includes(Number(v));

const CHEVRON =
  "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2384847e' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

export default function GstRateSelect({
  value,
  rupees = false,
  onChange,
  onBlur,
  blankLabel = "Select",
  blankSelectable = false,
  className,
  style,
  disabled,
  title,
  id,
  "aria-label": ariaLabel = "GST rate",
}) {
  // The first value this box showed is what was saved. A % value outside the
  // list stays offered until the box is opened again (i.e. after a save/reload).
  const savedRef = useRef(null);
  if (savedRef.current === null && !isBlank(value)) {
    savedRef.current = { value: clean(value), rupees };
  }

  const current = isBlank(value) ? "" : clean(value);
  const showRupee = rupees && current !== "";

  const extras = new Set();
  if (!showRupee && current !== "" && !isListedGstRate(current)) extras.add(current);
  const saved = savedRef.current;
  if (saved && !saved.rupees && !isListedGstRate(saved.value)) extras.add(saved.value);

  const percentOptions = [...GST_RATES.map(String), ...extras].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return Number.isFinite(na) ? -1 : 1;
  });

  const selected = showRupee ? `inr:${current}` : current;

  return (
    <select
      id={id}
      className={className}
      value={selected}
      onChange={(e) => {
        const v = e.target.value;
        if (v.startsWith("inr:")) return; // the saved ₹ figure is display-only
        onChange && onChange(v);
      }}
      onBlur={onBlur}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage: CHEVRON,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        // Room for the arrow, also when the form right-aligns numbers.
        paddingRight: 32,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      <option value="" disabled={!blankSelectable}>
        {blankLabel}
      </option>
      {percentOptions.map((r) => (
        <option key={r} value={r}>
          {r}%
        </option>
      ))}
      {showRupee && <option value={`inr:${current}`}>₹{current} (saved)</option>}
    </select>
  );
}
