// Shared quote-method selection modal — reused by BOTH the RFQ send-quote
// wizard and the ARC vendor quote page. A quote-wide choice (§ RESOLVED
// DECISION 2): the modal sets ONE method for every line.
//
// Styled with minimal inline styles using the theme tokens that exist in
// both the wizard scss and arc_v2.css (--surface/--border/--fg; --muted
// falls back to the arc_v2 --fg-3 shade since no --muted token is declared
// anywhere in the repo today) so this drops into either surface without
// forking. Follows the ARC v2 modal convention (createPortal to
// document.body + inline-styled overlay/panel) — see
// components/dashboard/rate-contracts/vendor/AddendumSignModal.js.
//
// Props:
//   open     : boolean
//   current  : 'TRADITIONAL' | 'MRP'
//   onSelect : (method) => void   — called with the confirmed method
//   onClose  : () => void         — called on cancel / backdrop / Esc

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const CARD_BASE = {
  flex: 1,
  minWidth: 0,
  textAlign: "left",
  cursor: "pointer",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius, 10px)",
  background: "var(--surface)",
  padding: "16px 18px",
  fontFamily: "inherit",
  transition: "all 0.15s ease",
};
const CARD_ACTIVE = {
  borderColor: "var(--primary, #2563eb)",
  boxShadow: "0 0 0 3px rgba(37,99,235,0.14)",
};

export default function QuoteMethodModal({ open, current, onSelect, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(current === "MRP" ? "MRP" : "TRADITIONAL");

  // Render into document.body so the overlay sits above the wizard/ARC page.
  useEffect(() => setMounted(true), []);

  // Reset the working selection to the current quote-wide method every time
  // the modal is (re)opened.
  useEffect(() => {
    if (open) setSelected(current === "MRP" ? "MRP" : "TRADITIONAL");
  }, [open, current]);

  if (!mounted || !open) return null;

  const ui = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 680,
          maxWidth: "96vw",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "22px 24px",
          boxShadow: "var(--shadow-md, 0 6px 24px -8px rgba(15,15,14,0.10))",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)" }}>
          Choose your quoting method
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted, #71717a)", marginTop: 4, lineHeight: 1.5 }}>
          This applies to every line in your quote. You can change it any time before submitting.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSelected("TRADITIONAL")}
            style={{
              ...CARD_BASE,
              ...(selected === "TRADITIONAL" ? CARD_ACTIVE : {}),
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
              Traditional — tax added on top (exclusive)
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg)", marginTop: 8, lineHeight: 1.6 }}>
              You enter a <b>base price</b> and a <b>GST %</b>. GST is <b>added on top</b>.
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg)", marginTop: 6, lineHeight: 1.6 }}>
              Example: base <b>₹1,000</b> + <b>18% GST</b> → GST <b>₹180</b> → <b>buyer pays ₹1,180</b>.
            </div>
            <div style={{ fontSize: 12, color: "var(--muted, #71717a)", marginTop: 6, lineHeight: 1.6 }}>
              Use when your price is exclusive of GST.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelected("MRP")}
            style={{
              ...CARD_BASE,
              ...(selected === "MRP" ? CARD_ACTIVE : {}),
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
              MRP — tax already inside (inclusive)
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg)", marginTop: 8, lineHeight: 1.6 }}>
              You enter an <b>MRP</b> (a GST-inclusive price) and a <b>GST %</b> used only to{" "}
              <b>reverse-calculate the base</b> — GST is <b>NOT added again</b>.
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg)", marginTop: 6, lineHeight: 1.6 }}>
              Example: MRP <b>₹1,180</b> @ <b>18%</b> → base <b>₹1,000</b> + GST <b>₹180</b> (extracted) →{" "}
              <b>buyer pays ₹1,180</b>.
            </div>
            <div style={{ fontSize: 12.5, color: "var(--fg)", marginTop: 6, lineHeight: 1.6 }}>
              With a <b>10% discount</b>: net <b>₹1,062</b> → base <b>₹900</b> + GST <b>₹162</b> →{" "}
              <b>buyer pays ₹1,062</b>.
            </div>
            <div style={{ fontSize: 12, color: "var(--muted, #71717a)", marginTop: 6, lineHeight: 1.6 }}>
              Use to quote <b>&quot;MRP less discount&quot;</b> without reverse-calculating GST yourself.
            </div>
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "10px 12px",
            background: "var(--surface-2, #fafaf9)",
            border: "1px dashed var(--border)",
            borderRadius: 8,
            fontSize: 12, lineHeight: 1.6,
            color: "var(--fg)",
          }}
        >
          <b>Same number, different result:</b> type <b>1,000 @ 18%</b> → Traditional → buyer pays{" "}
          <b>₹1,180</b>; MRP → buyer pays <b>₹1,000</b> (base ₹847.46 + GST ₹152.54, taken from within).
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-blue"
            style={{ flex: 1 }}
            onClick={() => onSelect(selected)}
          >
            Use this method
          </button>
          <button type="button" className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
