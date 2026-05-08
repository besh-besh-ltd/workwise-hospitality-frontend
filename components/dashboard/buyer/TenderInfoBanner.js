import React from "react";

// Prominent tender / ARC banner — used wherever a tender (is_tender=1)
// appears so that the recipient (buyer reviewer OR vendor) can see at
// a glance:
//   - this is a Tender, not a routine open-market RFQ
//   - the scope (Single ARC vs Group ARC)
//   - the contract validity period (arc_period_from → arc_period_to)
//   - every business unit the resulting ARC will cover
// Vendors quote differently against tenders (consumption-quantity
// pricing, multi-hotel logistics, longer commitment) — without this
// surfaced upfront they price a tender as a one-shot RFQ and the
// resulting ARC misses the mark.
//
// Bespoke styling, no Bootstrap. Brand-blue accent matches the rest
// of the ARC UI (ContractedItemModal, contracted-PO indicators).
//
// Props:
//   data — the rfq response object. Reads: is_tender, tender_scope,
//          arc_period_from, arc_period_to, covered_hotels[],
//          hotel_name, rfq_no, title.
//   audience — "buyer" | "vendor". Vendor copy emphasises the
//              quoting-implication ("quote per consumption-unit");
//              buyer copy is neutral.

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const TenderInfoBanner = ({ data, audience = "buyer" }) => {
  if (!data || data.is_tender !== 1) return null;

  const isGroup = data.tender_scope === "GROUP";
  const periodFrom = formatDate(data.arc_period_from);
  const periodTo = formatDate(data.arc_period_to);
  const hasPeriod = !!(data.arc_period_from && data.arc_period_to);

  // Hotels coverage: prefer covered_hotels[] (BE-enriched, names
  // resolved). Fall back to a single-row {hotel_id, hotel_name} when
  // missing — Single ARC always has exactly one mapped hotel.
  const hotels = Array.isArray(data.covered_hotels) && data.covered_hotels.length > 0
    ? data.covered_hotels
    : (data.hotel_name ? [{ hotel_id: data.hotel_id, hotel_name: data.hotel_name }] : []);

  const isVendor = audience === "vendor";

  return (
    <div
      role="region"
      aria-label="Tender information"
      style={{
        margin: "0 0 16px",
        borderRadius: 12,
        border: "1px solid #c7d2fe",
        background: "linear-gradient(180deg, #eef4ff 0%, #f5f8ff 100%)",
        boxShadow: "0 1px 3px rgba(46,91,168,0.06)",
        overflow: "hidden",
      }}
    >
      {/* HEADER STRIP */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "linear-gradient(90deg, #2E5BA8 0%, #3b82f6 100%)",
          color: "#fff",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          ⏚
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>
            Tender · {isGroup ? "Group ARC" : "Single ARC"}
          </span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            {isVendor
              ? "results in an Annual Rate Contract — quote your best long-term price."
              : "results in an Annual Rate Contract once approved."}
          </span>
        </div>
      </div>

      {/* DETAIL GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          padding: "14px 16px",
          fontSize: 13,
          color: "#1e293b",
        }}
      >
        {/* Period */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
            Contract Validity
          </div>
          {hasPeriod ? (
            <div style={{ fontWeight: 600, color: "#0f172a" }}>
              {periodFrom} <span style={{ color: "#94a3b8", margin: "0 4px" }}>→</span> {periodTo}
            </div>
          ) : (
            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>To be set on approval</div>
          )}
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Pricing committed for this entire period.
          </div>
        </div>

        {/* Hotels */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
            {hotels.length === 1 ? "Business Unit" : `Business Units (${hotels.length})`}
          </div>
          {hotels.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {hotels.map((h) => (
                <span
                  key={h.hotel_id}
                  title={h.hospitality_company_name ? `${h.hotel_name} · ${h.hospitality_company_name}` : h.hotel_name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "#fff",
                    border: "1px solid #c7d2fe",
                    color: "#2E5BA8",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {h.hotel_name}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>—</div>
          )}
          {isGroup && hotels.length > 1 && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Single contract serves every hotel above. Plan logistics + capacity for all of them.
            </div>
          )}
        </div>

        {/* Quoting note (vendor only) */}
        {isVendor && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
              How to Quote
            </div>
            <div style={{ fontSize: 12.5, color: "#1e293b", lineHeight: 1.5 }}>
              Quantities shown are <strong>estimated annual consumption</strong> across all listed
              hotels. Quote a per-unit rate that holds for the full contract period — not a one-shot
              rate.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenderInfoBanner;
