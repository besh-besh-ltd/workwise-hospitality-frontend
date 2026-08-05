// Vendor portal — received ARC requests + their states. Single page surface
// because the prototype's "Submitted / Pending Acceptance / Active" tabs all
// run off the same underlying invitation list.

import { useEffect, useState } from "react";
import Link from "next/link";
import { vendorListRequests, vendorListPendingAcceptance, vendorListActiveContracts } from "@/services/arc_v2";
import StatusBadge from "@/components/dashboard/rate-contracts/shared/StatusBadge";

export default function VendorRequests({ tab = "received" }) {
  const [requests, setRequests] = useState([]);
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        vendorListRequests().catch(() => ({ data: { requests: [] } })),
        vendorListPendingAcceptance().catch(() => ({ data: { contracts: [] } })),
        vendorListActiveContracts().catch(() => ({ data: { contracts: [] } })),
      ]);
      setRequests(a?.data?.requests || []);
      setPending(b?.data?.contracts || []);
      setActive(c?.data?.contracts || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Rate Contracts — Vendor Portal</h1>

      <div style={{ display: "flex", gap: 8, margin: "16px 0", borderBottom: "1px solid #e5e7eb" }}>
        {[["received", "Received Requests"], ["submitted", "Submitted Quotes"], ["awaiting-sign", "Pending Acceptance"], ["active", "Active Contracts"]].map(([key, label]) => (
          <Link key={key} href={`/dashboard/vendor/rate-contracts/requests?tab=${key}`}
                style={{ padding: "8px 14px", fontSize: 13, color: tab === key ? "#2563eb" : "#6b7280", textDecoration: "none", borderBottom: tab === key ? "2px solid #2563eb" : "2px solid transparent", fontWeight: tab === key ? 600 : 500 }}>
            {label}
          </Link>
        ))}
      </div>

      {(tab === "received" || tab === "submitted") && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          {requests.filter(r => tab === "received" ? !r.quote_submitted_at : !!r.quote_submitted_at).map(r => (
            <Link key={r.id} href={`/dashboard/vendor/rate-contracts/${r.id}/quote`}
                  style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.arc_number} · {r.title}</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  Submission ends {r.submission_end_at ? new Date(r.submission_end_at).toLocaleString() : "—"}
                </div>
              </div>
              <StatusBadge status={r.status} size="sm" />
            </Link>
          ))}
          {requests.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No requests yet.</div>}
        </div>
      )}

      {tab === "awaiting-sign" && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          {pending.map(c => (
            <Link key={c.id} href={`/dashboard/vendor/rate-contracts/${c.id}/accept`}
                  style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.arc_number} · {c.arc_title}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  Awaiting your acceptance · deadline {c.awaiting_until ? new Date(c.awaiting_until).toLocaleString() : "—"}
                </div>
              </div>
              <StatusBadge status={c.status} size="sm" />
            </Link>
          ))}
          {pending.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Nothing pending.</div>}
        </div>
      )}

      {tab === "active" && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          {active.map(c => (
            <div key={c.id} style={{ padding: "14px 16px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.arc_number} · {c.arc_title}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  {c.contract_start_at ? new Date(c.contract_start_at).toLocaleDateString() : "—"} → {c.contract_end_at ? new Date(c.contract_end_at).toLocaleDateString() : "—"}
                </div>
              </div>
              <StatusBadge status={c.status} size="sm" />
            </div>
          ))}
          {active.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No active contracts.</div>}
        </div>
      )}
    </div>
  );
}
