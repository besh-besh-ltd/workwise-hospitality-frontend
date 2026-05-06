import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { AuthGuard } from "@/utils/authGuard";
import { getContractedPOs } from "@/services/po";
import s from "./contracted.module.scss";

// Phase 7 follow-up — the "Contracted POs" listing tab.
//
// Contracted POs are drafted from ARC releases (rfq_id IS NULL,
// is_contracted = 1). Open-market POs continue to live on the existing
// RFQ-scoped /dashboard/buyer/purchase-order page. This page is the
// global "PO listing" for ARC-driven release POs only.
//
// Bespoke styling, no Bootstrap.

const STATUS_PILL = {
  draft:                 { label: "Draft",              bg: "#f1f5f9", color: "#475569" },
  pending_approval:      { label: "Pending Approval",   bg: "#fef3c7", color: "#92400e" },
  acceptance_pending:    { label: "Awaiting Vendor",    bg: "#dbeafe", color: "#1e40af" },
  approved:              { label: "Approved",           bg: "#dcfce7", color: "#15803d" },
  rejected:              { label: "Rejected",           bg: "#fee2e2", color: "#991b1b" },
  rejected_by_vendor:    { label: "Rejected by Vendor", bg: "#fee2e2", color: "#991b1b" },
  sent:                  { label: "Sent to Vendor",     bg: "#e0f2fe", color: "#075985" },
  GRN:                   { label: "GRN Pending",        bg: "#fef3c7", color: "#92400e" },
  completed:             { label: "Completed",          bg: "#dcfce7", color: "#15803d" },
  cancelled:             { label: "Cancelled",          bg: "#f1f5f9", color: "#475569" },
  invoice_raised:        { label: "Invoice Raised",     bg: "#fce7f3", color: "#9d174d" },
  dispatched:            { label: "Dispatched",         bg: "#dbeafe", color: "#1e40af" },
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const ContractedPOsPage = () => {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ poNumber: "", status: "", dateFrom: "", dateTo: "" });

  const debouncedPo = useDebouncedValue(filters.poNumber, 400);

  const fetchList = useMemo(() => async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedPo) params.poNumber = debouncedPo;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const res = await getContractedPOs(params);
      setRows(res?.data || []);
      setTotal(res?.total || 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to load contracted POs");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedPo, filters.status, filters.dateFrom, filters.dateTo]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AuthGuard>
      <Head>
        <title>Contracted POs · Buyer</title>
      </Head>
      <main className={s.page}>
        <header className={s.header}>
          <div>
            <h1 className={s.title}>Contracted POs</h1>
            <p className={s.subtitle}>
              Purchase orders drafted from active rate contracts.<br/>Open-market POs still live on the
              {" "}<Link href="/dashboard/buyer/purchase-order" className={s.inlineLink}>standard PO listing</Link>.
            </p>
          </div>
          <nav className={s.tabBar}>
            <Link href="/dashboard/buyer/purchase-order" className={s.tabLink}>Open Market POs</Link>
            <span className={`${s.tabLink} ${s.tabActive}`}>Contracted POs</span>
          </nav>
        </header>

        <div className={s.filterBar}>
          <input
            type="search"
            placeholder="Search by PO Number"
            className={s.input}
            value={filters.poNumber}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, poNumber: e.target.value })); }}
          />
          <select
            className={s.input}
            value={filters.status}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_PILL).map((k) => (
              <option key={k} value={k}>{STATUS_PILL[k].label}</option>
            ))}
          </select>
          <input
            type="date"
            className={s.input}
            value={filters.dateFrom}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, dateFrom: e.target.value })); }}
          />
          <input
            type="date"
            className={s.input}
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            disabled={!filters.dateFrom}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, dateTo: e.target.value })); }}
          />
          <span className={s.totalBadge}>{total} PO{total === 1 ? "" : "s"}</span>
        </div>

        {loading ? (
          <div className={s.loadingState}>
            <span className="spinner-border" role="status" aria-hidden />
            <p>Loading contracted POs…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className={s.emptyState}>
            <h3>No contracted POs yet</h3>
            <p>
              When a buyer releases a PO against an active ARC, it'll show up here. The standard
              RFQ → PO flow continues on the open-market listing.
            </p>
          </div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Vendor</th>
                    <th>Hotel</th>
                    <th>Source Tender</th>
                    <th>Validity</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((po) => {
                    const pill = STATUS_PILL[po.status] || { label: po.status, bg: "#f1f5f9", color: "#475569" };
                    return (
                      <tr key={po.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span className={s.poNumber}>#{po.po_number}</span>
                            <span
                              title="Drafted from an active rate contract"
                              style={{
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #2E5BA8 0%, #3b82f6 100%)",
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: 0.4,
                                textTransform: "uppercase",
                              }}
                            >
                              Contracted
                            </span>
                          </div>
                          <div className={s.poDate}>{formatDate(po.created_at)}</div>
                        </td>
                        <td>{po.vendor_name || `Vendor #${po.finalized_vendor_id}`}</td>
                        <td>{po.hotel_name || `Hotel #${po.hotel_id}`}</td>
                        <td>
                          <span className={s.tenderRef}>#{po.source_rfq_no}</span>
                        </td>
                        <td>
                          <div>{formatDate(po.period_from)}</div>
                          <div className={s.subtle}>→ {formatDate(po.period_to)}</div>
                        </td>
                        <td className={s.total}>₹{Number(po.total_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          <span className={s.statusPill} style={{ background: pill.bg, color: pill.color }}>
                            {pill.label}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/buyer/purchase-order?po=${po.id}`}
                            className={s.viewLink}
                          >
                            Open →
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
                  className={s.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className={s.pageInfo}>Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className={s.pageBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
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

// Tiny local debounce so the search input doesn't fire on every keystroke.
function useDebouncedValue(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default ContractedPOsPage;
