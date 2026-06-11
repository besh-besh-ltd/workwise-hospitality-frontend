import { useEffect, useState } from "react";
import { getMrById, cancel as cancelMr } from "@/services/mr";
import StatusBadge from "@/components/dashboard/rate-contracts/shared/StatusBadge";
import VendorAvatar from "@/components/dashboard/rate-contracts/shared/VendorAvatar";

export default function MrDetail({ mrId }) {
  const [mr, setMr] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!mrId) return;
    (async () => {
      const res = await getMrById(mrId);
      setMr(res?.data?.mr);
      setItems(res?.data?.items || []);
    })();
  }, [mrId]);

  if (!mr) return <div style={{ padding: 24 }}>Loading…</div>;

  const onCancel = async () => {
    if (!confirm("Cancel this MR?")) return;
    await cancelMr(mrId);
    window.location.reload();
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{mr.mr_number}</h1>
        <StatusBadge status={mr.status} />
        {!["po_released", "rejected", "cancelled"].includes(mr.status) && (
          <button onClick={onCancel} style={{ marginLeft: "auto", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>
            Cancel MR
          </button>
        )}
      </div>
      <p style={{ color: "#6b7280", fontSize: 13.5 }}>{mr.title}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 13.5, margin: 0, marginBottom: 10 }}>Details</h2>
          {[
            ["Urgency", mr.urgency],
            ["Required by", mr.required_by_date ? new Date(mr.required_by_date).toLocaleDateString() : "—"],
            ["Cost center", mr.cost_center || "—"],
            ["Delivery location", mr.delivery_location || "—"],
            ["Raised by", mr.raised_by_name || `#${mr.raised_by}`],
            ["Submitted at", mr.submitted_at ? new Date(mr.submitted_at).toLocaleString() : "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 13, padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ color: "#6b7280" }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 13.5, margin: 0, marginBottom: 10 }}>Items ({items.length})</h2>
          {items.map(it => (
            <div key={it.id} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{it.variant_name || `Variant #${it.product_variant_id}`}</div>
              <div style={{ fontSize: 11.5, color: "#6b7280", display: "flex", gap: 10, alignItems: "center", marginTop: 3 }}>
                {it.vendor_id && <VendorAvatar id={it.vendor_id} name="" size="sm" />}
                <span>{Number(it.quantity).toLocaleString()} {it.uom || ""} @ ₹{it.matched_unit_rate}</span>
                <span>· Contract #{it.arc_contract_id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {mr.justification && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginTop: 14 }}>
          <h2 style={{ fontSize: 13.5, margin: 0, marginBottom: 6 }}>Justification</h2>
          <p style={{ fontSize: 13, color: "#374151" }}>{mr.justification}</p>
        </div>
      )}
    </div>
  );
}
