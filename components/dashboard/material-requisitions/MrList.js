// MR list — used by all sidebar sub-links + the overview page. Mirrors the
// shape of RateContractsList.

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMrs, getDashboardKpis } from "@/services/mr";
import StatusBadge from "@/components/dashboard/rate-contracts/shared/StatusBadge";

const PRESET_LABELS = {
  all:         "All Material Requisitions",
  drafts:      "MR Drafts",
  pending:     "Pending Approval",
  approved:    "Approved",
  po_released: "PO Released",
  cancelled:   "Cancelled / Rejected",
};

export default function MrList({ filterPreset = "all" }) {
  const [data, setData] = useState({ data: [], total: 0 });
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listRes, kpiRes] = await Promise.all([
          listMrs({ statusGroup: filterPreset, limit: 20 }),
          getDashboardKpis(),
        ]);
        if (!cancelled) {
          setData(listRes?.data || { data: [], total: 0 });
          setKpis(kpiRes?.data?.counts || null);
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [filterPreset]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{PRESET_LABELS[filterPreset]}</h1>
          <p style={{ color: "#6b7280", fontSize: 13.5, marginTop: 4 }}>
            Contracted-items-only requisitions. Approved MRs auto-generate call-off POs.
          </p>
        </div>
        <Link href="/dashboard/buyer/material-requisitions/create"
              style={{ background: "#2563eb", color: "white", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
          + Raise New MR
        </Link>
      </div>

      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {[["Drafts","drafts"],["Pending","pending"],["Approved","approved"],["PO Released","po_released"],["Cancelled","cancelled"]].map(([label, key]) => (
            <Link key={key} href={`/dashboard/buyer/material-requisitions/${key === "all" ? "" : key}`}
                  style={{ padding: "12px 14px", background: "white", border: `1px solid ${filterPreset === key ? "#2563eb" : "#e5e7eb"}`, borderRadius: 10, textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 11.5, color: "#6b7280" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{kpis[key] ?? 0}</div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {loading && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading…</div>}
        {!loading && data.data.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No MRs in this view yet.</div>}
        {!loading && data.data.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafaf7", color: "#4b5563", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ textAlign: "left", padding: "10px 14px" }}>MR #</th>
                <th style={{ textAlign: "left" }}>Title</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Urgency</th>
                <th style={{ textAlign: "left" }}>Required By</th>
                <th style={{ textAlign: "left" }}>Raised By</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <Link href={`/dashboard/buyer/material-requisitions/${row.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                      {row.mr_number}
                    </Link>
                  </td>
                  <td>{row.title}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{row.urgency}</td>
                  <td>{row.required_by_date ? new Date(row.required_by_date).toLocaleDateString() : "—"}</td>
                  <td>{row.raised_by_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
