// Buyer-side ARC list. Used by all sidebar sub-link routes
// (/rate-contracts/drafts, /ongoing, /approved, /active, /ended) — the page
// passes a `filterPreset` prop and this component does the rest. The all-up
// dashboard page also uses this with `filterPreset='all'`.

import { useEffect, useState } from "react";
import Link from "next/link";
import { listContracts, getDashboardKpis } from "@/services/arc_v2";
import StatusBadge from "@/components/dashboard/rate-contracts/shared/StatusBadge";
import styles from "./RateContractsList.module.scss";

const PRESET_LABELS = {
  all:      "All Rate Contracts",
  drafts:   "Drafts",
  ongoing:  "Ongoing Contracts",
  approved: "Approved Contracts",
  active:   "Active Contracts",
  ended:    "Ended Contracts",
};

const PRESET_DESCRIPTIONS = {
  drafts:   "Contracts you've started but not yet floated.",
  ongoing:  "Live tender lifecycle — floated, in evaluation, or under committee review.",
  approved: "Approved by committee, awaiting vendor signatures.",
  active:   "Live contracts with call-off enabled, including those expiring soon.",
  ended:    "Expired, terminated, or closed without award.",
};

export default function RateContractsList({ filterPreset = "all" }) {
  const [data, setData] = useState({ data: [], total: 0 });
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [listRes, kpiRes] = await Promise.all([
          listContracts({ statusGroup: filterPreset, page, limit: 20 }),
          getDashboardKpis(),
        ]);
        if (!cancelled) {
          setData(listRes?.data || { data: [], total: 0 });
          setKpis(kpiRes?.data?.counts || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [filterPreset, page]);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>{PRESET_LABELS[filterPreset] || "Rate Contracts"}</h1>
          {PRESET_DESCRIPTIONS[filterPreset] && (
            <p className={styles.sub}>{PRESET_DESCRIPTIONS[filterPreset]}</p>
          )}
        </div>
        <Link href="/dashboard/buyer/rate-contracts/create" className={styles.primary}>
          + Create New
        </Link>
      </header>

      {kpis && (
        <div className={styles.kpiStrip}>
          {[
            ["Drafts", "drafts"],
            ["Ongoing", "ongoing"],
            ["Approved", "approved"],
            ["Active", "active"],
            ["Ended", "ended"],
          ].map(([label, key]) => (
            <Link key={key} href={`/dashboard/buyer/rate-contracts/${key}`}
                  className={`${styles.kpi} ${filterPreset === key ? styles.active : ""}`}>
              <span className={styles.kpiLabel}>{label}</span>
              <span className={styles.kpiValue}>{kpis[key] ?? 0}</span>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.tableWrap}>
        {loading && <div className={styles.loading}>Loading…</div>}
        {!loading && data.data.length === 0 && (
          <div className={styles.empty}>No contracts in this view yet.</div>
        )}
        {!loading && data.data.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ARC #</th>
                <th>Title</th>
                <th>Status</th>
                <th>Submission Ends</th>
                <th>Contract Period</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map(row => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/dashboard/buyer/rate-contracts/${row.id}`} className={styles.cellLink}>
                      {row.arc_number}
                    </Link>
                  </td>
                  <td>{row.title}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{row.submission_end_at ? new Date(row.submission_end_at).toLocaleDateString() : "—"}</td>
                  <td>
                    {row.contract_start_at && row.contract_end_at
                      ? `${new Date(row.contract_start_at).toLocaleDateString()} → ${new Date(row.contract_end_at).toLocaleDateString()}`
                      : "—"}
                  </td>
                  <td>{row.created_by_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.total > 20 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page} of {Math.ceil(data.total / 20)}</span>
          <button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
