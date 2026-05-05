import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AuthGuard } from "@/utils/authGuard";
import { getVendorArcList } from "@/services/arc";
import s from "./arcs.module.scss";

// Phase 5 FE — vendor-side rate-contract list. Mirrors the order-book
// pattern but for rate contracts (tbl_arc), not POs. Bespoke styling,
// no Bootstrap.

const STATUS_PILL = {
  PENDING_COMMITTEE:   { label: "Pending Committee", bg: "#fef3c7", color: "#92400e" },
  PARTIALLY_DECIDED:   { label: "Partially Decided", bg: "#fef3c7", color: "#92400e" },
  DOC_GENERATED:       { label: "Document Ready",    bg: "#dbeafe", color: "#1e40af" },
  ACTIVE:              { label: "Active",            bg: "#dcfce7", color: "#15803d" },
  EXPIRED:             { label: "Expired",           bg: "#f1f5f9", color: "#64748b" },
  VOID:                { label: "Void",              bg: "#fee2e2", color: "#991b1b" },
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const VendorArcsPage = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchList = useMemo(() => async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await getVendorArcList(params);
      const payload = res?.data || {};
      setRows(payload.data || []);
      setTotal(payload.total || 0);
    } catch (err) {
      toast.error(err?.message?.response?.data?.message || "Failed to load rate contracts");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AuthGuard>
      <Head>
        <title>Rate Contracts · Vendor</title>
      </Head>
      <main className={s.page}>
        <header className={s.header}>
          <h1 className={s.title}>Rate Contracts</h1>
          <p className={s.subtitle}>
            Annual rate contracts you've been awarded. Each contract binds your committed prices for the listed
            products across one or more buyer hotels for the period shown.
          </p>
        </header>

        <div className={s.filterBar}>
          <input
            type="search"
            placeholder="Search by Tender No"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className={s.searchInput}
          />
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className={s.statusSelect}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DOC_GENERATED">Document Ready</option>
            <option value="PENDING_COMMITTEE">Pending Committee</option>
            <option value="PARTIALLY_DECIDED">Partially Decided</option>
            <option value="EXPIRED">Expired</option>
            <option value="VOID">Void</option>
          </select>
          <span className={s.totalBadge}>
            {total} contract{total === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className={s.loadingState}>
            <span className="spinner-border" role="status" aria-hidden />
            <p>Loading rate contracts…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className={s.emptyState}>
            <h3>No rate contracts yet</h3>
            <p>You'll see your awarded ARCs here once a buyer's committee finalises the tender you participated in.</p>
          </div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Tender</th>
                    <th>Scope</th>
                    <th>Products</th>
                    <th>Hotels</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((arc) => {
                    const pill = STATUS_PILL[arc.status] || { label: arc.status, bg: "#f1f5f9", color: "#475569" };
                    return (
                      <tr key={arc.arc_id}>
                        <td>
                          <div className={s.tenderNo}>#{arc.rfq_no}</div>
                          {arc.rfq_title && <div className={s.tenderTitle}>{arc.rfq_title}</div>}
                        </td>
                        <td>
                          <span className={s.scopePill}>
                            {arc.tender_scope === "GROUP" ? "Group ARC" : "Single ARC"}
                          </span>
                        </td>
                        <td>{arc.approved_items}</td>
                        <td>{arc.hotels_count}</td>
                        <td>
                          <div className={s.periodFrom}>{formatDate(arc.period_from)}</div>
                          <div className={s.periodTo}>→ {formatDate(arc.period_to)}</div>
                        </td>
                        <td>
                          <span
                            className={s.statusPill}
                            style={{ background: pill.bg, color: pill.color }}
                          >
                            {pill.label}
                          </span>
                        </td>
                        <td>
                          <Link href={`/dashboard/vendor/arcs/${arc.arc_id}`} className={s.viewLink}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={s.pagination}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={s.pageBtn}
                >
                  ← Prev
                </button>
                <span className={s.pageInfo}>Page {page} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={s.pageBtn}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </AuthGuard>
  );
};

export default VendorArcsPage;
