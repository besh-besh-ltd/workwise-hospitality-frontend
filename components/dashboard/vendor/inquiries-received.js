import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import moment from "moment";
import Select from "react-select";
import {
  Search, Calendar, Clock, Building2, Package, ArrowRight, MessageCircle,
  Zap, FileText, Send, AlertTriangle, ChevronLeft, ChevronRight, Inbox, SlidersHorizontal,
} from "lucide-react";
import { getVendorRfqList } from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import { checkBidExpired } from "@/utils/sharedFunctions";
import { PersonaCardShell } from "../buyer/persona-widgets/PersonaCard";
import styles from "./InquiriesReceived.module.scss";

const QUOTE_OPTIONS = [
  { label: "All Quotes", value: "" },
  { label: "Not Quoted", value: "pending" },
  { label: "Quoted", value: "sent" },
  { label: "Regretted", value: "rejected" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
];

const DEADLINE_OPTIONS = [
  { label: "Any Deadline", value: "" },
  { label: "Ending in 3 Days", value: "3d" },
  { label: "Ending in 5 Days", value: "5d" },
  { label: "Ending in 1 Week", value: "1w" },
  { label: "Ending in 1 Month", value: "1m" },
];

const selectStyles = {
  control: (base, state) => ({
    ...base, minHeight: 34, fontSize: 13,
    borderColor: state.isFocused ? "#2563eb" : "#ebebe6",
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
    borderRadius: 8, cursor: "pointer",
    "&:hover": { borderColor: "#d6d6cf" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "#a1a1aa", padding: "4px 6px" }),
  option: (base, state) => ({
    ...base, fontSize: 13, padding: "8px 12px", cursor: "pointer",
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#fafaf9" : "transparent",
    color: state.isSelected ? "#fff" : "#18181b",
  }),
  menu: (base) => ({
    ...base, borderRadius: 10,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #f0f0f0", marginTop: 4, zIndex: 20,
  }),
  placeholder: (base) => ({ ...base, fontSize: 13, color: "#a1a1aa" }),
  singleValue: (base) => ({ ...base, fontSize: 13, color: "#18181b" }),
  valueContainer: (base) => ({ ...base, padding: "2px 10px" }),
};

const InquiriesReceived = ({ pageType = 0 }) => {
  const [page, setPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [limit, setLimit] = useState(10);
  const [rfqList, setRfqList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [negotiationRounds, setNegotiationRounds] = useState({});
  const [stats, setStats] = useState({ total: 0, pending: 0, quoted: 0, closing_soon: 0, finalized: 0 });

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [quoteFilter, setQuoteFilter] = useState(QUOTE_OPTIONS[0]);
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [deadlineFilter, setDeadlineFilter] = useState(DEADLINE_OPTIONS[0]);

  const router = useRouter();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearchVal(searchInput); setPage(1); }, 600);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRFQs = useCallback(() => {
    setLoading(true);
    const payload = {
      page, limit,
      search_val: searchVal || undefined,
      quote_status: quoteFilter.value || undefined,
      rfq_status: statusFilter.value || undefined,
      bid_ends_in: deadlineFilter.value || undefined,
    };
    getVendorRfqList(payload)
      .then((res) => {
        setRfqList(res.data || []);
        setTotalData(res.totalRFQ?.count || 0);
        if (res.stats) {
          setStats({
            total: parseInt(res.stats.total, 10) || 0,
            pending: parseInt(res.stats.pending, 10) || 0,
            quoted: parseInt(res.stats.quoted, 10) || 0,
            closing_soon: parseInt(res.stats.closing_soon, 10) || 0,
            finalized: parseInt(res.stats.finalized, 10) || 0,
          });
        }
      })
      .catch(() => setRfqList([]))
      .finally(() => setLoading(false));
  }, [page, limit, searchVal, quoteFilter, statusFilter, deadlineFilter]);

  useEffect(() => { fetchRFQs(); }, [fetchRFQs]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [quoteFilter, statusFilter, deadlineFilter]);

  // Load negotiation rounds
  useEffect(() => {
    if (rfqList.length === 0) return;
    const loadRounds = async () => {
      const map = {};
      await Promise.all(rfqList.map(async (item) => {
        try {
          const res = await getAllActiveNegotiationRounds(item.id);
          map[item.id] = res?.status === 1 && Array.isArray(res.data) ? res.data : [];
        } catch { map[item.id] = []; }
      }));
      setNegotiationRounds(map);
    };
    loadRounds();
  }, [rfqList]);

  const getProducts = (item) => {
    const names = [];
    (item.products || []).forEach((p) => {
      const name = p?.product_details?.[0]?.name;
      if (name && !names.includes(name)) names.push(name);
    });
    return names;
  };

  const getDaysLeft = (bidEndDate) => {
    if (!bidEndDate) return null;
    const end = moment(bidEndDate);
    if (!end.isValid()) return null;
    const now = moment();
    if (end.isBefore(now)) return { text: "Ended", tone: "danger" };
    const days = end.diff(now, "days");
    if (days === 0) return { text: "Ends Today", tone: "danger" };
    if (days === 1) return { text: "Tomorrow", tone: "danger" };
    if (days <= 3) return { text: `${days}d left`, tone: "warn" };
    return { text: `${days}d left`, tone: "success" };
  };

  const getNegBadge = (rfqId) => {
    const rounds = negotiationRounds[rfqId] || [];
    if (rounds.length === 0) return null;
    const now = moment();
    const active = rounds.filter((r) => r.status === "ACTIVE" && r.end_date && moment.utc(r.end_date).isAfter(now));
    const ended = rounds.filter((r) => r.status === "ENDED" || (r.status === "ACTIVE" && r.end_date && moment.utc(r.end_date).isBefore(now)));
    if (active.length > 0) return { text: `${active.length} Active Negotiation${active.length > 1 ? "s" : ""}`, type: "active" };
    if (ended.length > 0) return { text: "Negotiation Ended", type: "ended" };
    return null;
  };

  const getActionInfo = (item) => {
    const expired = checkBidExpired(item.bid_end_date);
    if (expired) return { label: "View Quote", tone: "muted" };
    if (item.status === 1) {
      if (item.quote_status === "pending") return { label: "Send Quote", tone: "success" };
      if (item.quote_status === "sent") return { label: "Edit Quote", tone: "warn" };
    }
    return { label: "View Quote", tone: "muted" };
  };

  // Derive a single status pill for the row.
  // Mapping: awarded → success | quoted → info | not quoted → warn |
  //          regretted → danger | closed/expired → muted
  const getQuoteStatusPill = (item) => {
    const expired = checkBidExpired(item.bid_end_date);
    if (item.is_finalized === 1) return { label: "Awarded", tone: "success" };
    if (item.quote_status === "rejected") return { label: "Regretted", tone: "danger" };
    if (item.quote_status === "sent") return { label: "Quoted", tone: "info" };
    if (expired) return { label: "Closed", tone: "muted" };
    if (item.quote_status === "pending") return { label: "Not Quoted", tone: "warn" };
    return { label: item.quote_status || "Open", tone: "muted" };
  };

  const totalPages = Math.ceil(totalData / limit);

  const STAT_CARDS = [
    { label: "Total Enquiries", value: stats.total, icon: FileText, accent: "info" },
    { label: "Pending Quotes", value: stats.pending, icon: AlertTriangle, accent: "warn" },
    { label: "Quoted", value: stats.quoted, icon: Send, accent: "success" },
    { label: "Closing Soon", value: stats.closing_soon, icon: Clock, accent: "danger" },
  ];

  const hasActiveFilters = !!(searchInput || quoteFilter.value || statusFilter.value || deadlineFilter.value);

  // ── Sub-renderers ──

  const renderStats = () => (
    <div className={styles.statsGrid}>
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={styles.statItem}>
            <div className={`${styles.statIcon} ${styles[card.accent]}`}>
              <Icon size={14} strokeWidth={2} />
            </div>
            <div className={styles.statBody}>
              <div className={styles.statLabel}>{card.label}</div>
              <div className={`${styles.statValue} ${styles[card.accent]}`}>{card.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFilters = () => (
    <div className={styles.filterBar}>
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} strokeWidth={2} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by RFQ No, Title, or Company"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <div className={styles.filterSelect}>
        <Select options={DEADLINE_OPTIONS} value={deadlineFilter} onChange={setDeadlineFilter} styles={selectStyles} isSearchable={false} />
      </div>
      <div className={styles.filterSelect}>
        <Select options={QUOTE_OPTIONS} value={quoteFilter} onChange={setQuoteFilter} styles={selectStyles} isSearchable={false} />
      </div>
      <div className={styles.filterSelect}>
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} styles={selectStyles} isSearchable={false} />
      </div>
    </div>
  );

  const renderSkeletonRows = () => (
    <div className={styles.skeletonWrap}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonRowLeft}>
            <div className={styles.skeletonRowTopLine}>
              <div className={styles.shimmerBar} style={{ width: 64, height: 11 }} />
              <div className={styles.shimmerBar} style={{ width: 90, height: 11 }} />
            </div>
            <div className={styles.shimmerBar} style={{ width: "65%", height: 13 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={styles.shimmerBar} style={{ width: 100, height: 10 }} />
              <div className={styles.shimmerBar} style={{ width: 70, height: 10 }} />
              <div className={styles.shimmerBar} style={{ width: 80, height: 10 }} />
            </div>
          </div>
          <div className={styles.skeletonRowRight}>
            <div className={styles.shimmerBar} style={{ width: 64, height: 18, borderRadius: 4 }} />
            <div className={styles.shimmerBar} style={{ width: 56, height: 18, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className={styles.emptyState}>
      <div className={styles.emptyIconChip}>
        <Inbox size={18} strokeWidth={2} />
      </div>
      <div className={styles.emptyTitle}>
        {hasActiveFilters ? "No enquiries match these filters" : "No enquiries received yet"}
      </div>
      <div className={styles.emptySub}>
        {hasActiveFilters
          ? "Try clearing a filter or widening the deadline window."
          : "New buyer enquiries will land here as they arrive."}
      </div>
    </div>
  );

  const renderList = () => (
    <div className={styles.inquiryList}>
      {rfqList.map((item, idx) => {
        const products = getProducts(item);
        const daysLeft = getDaysLeft(item.bid_end_date);
        const negBadge = getNegBadge(item.id);
        const action = getActionInfo(item);
        const quotePill = getQuoteStatusPill(item);
        const hasQueries = item.unseen_query_count > 0;

        return (
          <Link
            key={item.id}
            href={`/dashboard/vendor/quote?id=${item.id}&showTechEvalRestrictions=false`}
            className={styles.inquiryRow}
          >
            <span className={styles.rowRank}>
              {String((page - 1) * limit + idx + 1).padStart(2, "0")}
            </span>

            <div className={styles.rowLeft}>
              <div className={styles.rowTopLine}>
                <span className={styles.rfqNo}>#{item.rfq_no}</span>
                {item.title && (
                  <>
                    <span className={styles.rfqTitleSep}>-</span>
                    <span className={styles.rfqTitle}>{item.title}</span>
                  </>
                )}
                {negBadge && (
                  <span className={`${styles.tag} ${negBadge.type === "active" ? styles.tagSuccess : styles.tagMuted}`}>
                    <Zap size={9} strokeWidth={2.5} /> {negBadge.text}
                  </span>
                )}
                {item.is_tender === 1 && <span className={`${styles.tag} ${styles.tagPurple}`}>Tender</span>}
              </div>

              <div className={styles.rowTitle}>
                {products.join(", ") || "Untitled Enquiry"}
              </div>

              <div className={styles.rowMeta}>
                <span className={styles.metaItem}><Building2 size={11} strokeWidth={2} /> {item.company_name}</span>
                <span className={styles.metaItem}><Package size={11} strokeWidth={2} /> {products.length} product{products.length !== 1 ? "s" : ""}</span>
                <span className={styles.metaItem}><Calendar size={11} strokeWidth={2} /> {moment(item.timestamp).format("DD MMM YYYY")}</span>
              </div>
            </div>

            <div className={styles.rowRight}>
              {hasQueries && (
                <button
                  type="button"
                  className={`${styles.pill} ${styles.pillDanger} ${styles.pillBtn}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/dashboard/buyer/query?rfq_id=${item.id}&role=vendor`);
                  }}
                  title="View &amp; reply to buyer queries"
                >
                  <MessageCircle size={10} strokeWidth={2.5} /> {item.unseen_query_count}
                </button>
              )}

              {daysLeft && (
                <span className={`${styles.pill} ${styles[`pill${daysLeft.tone.charAt(0).toUpperCase()}${daysLeft.tone.slice(1)}`]}`}>
                  <Clock size={10} strokeWidth={2.5} /> {daysLeft.text}
                </span>
              )}

              <span className={`${styles.pill} ${styles[`pill${quotePill.tone.charAt(0).toUpperCase()}${quotePill.tone.slice(1)}`]}`}>
                {quotePill.label}
              </span>

              <span className={`${styles.actionLabel} ${styles[`action${action.tone.charAt(0).toUpperCase()}${action.tone.slice(1)}`]}`}>
                {action.label}
                <ArrowRight size={13} className={styles.actionArrow} strokeWidth={2} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  const renderPagination = () => (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
        <ChevronLeft size={14} strokeWidth={2} />
      </button>
      <span className={styles.pageInfo}>Page <span className={styles.pageInfoNum}>{page}</span> of <span className={styles.pageInfoNum}>{totalPages}</span></span>
      <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </div>
  );

  return (
    <>
      {pageType === 0 && <Head><title>Inquiries Received | Vendor</title></Head>}
      <div className={styles.container}>
        {pageType === 0 && (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderText}>
                <h1 className={styles.pageTitle}>Inquiries Received</h1>
                <p className={styles.pageSubtitle}>View, filter, and respond to buyer enquiries.</p>
              </div>
            </div>

            {/* ── Stat Tiles ── */}
            <PersonaCardShell
              title="At a glance"
              icon={FileText}
              loading={loading && !stats.total}
            >
              {renderStats()}
            </PersonaCardShell>

            {/* ── Filters ── */}
            <PersonaCardShell
              title="Filters"
              icon={SlidersHorizontal}
              loading={loading && !stats.total}
            >
              {renderFilters()}
            </PersonaCardShell>
          </>
        )}

        {/* ── Inquiry List ── */}
        <PersonaCardShell
          title={pageType === 1 ? "Latest enquiries" : "Enquiries"}
          icon={Inbox}
          actions={
            !loading && rfqList.length > 0 ? (
              <span className={styles.countBadge}>
                {pageType === 1 ? `${rfqList.length}` : `${totalData}`}
              </span>
            ) : null
          }
          loading={loading}
          isEmpty={!loading && rfqList.length === 0}
          renderEmpty={renderEmpty}
        >
          {loading ? renderSkeletonRows() : renderList()}
          {!loading && rfqList.length > 0 && pageType === 0 && totalPages > 1 && renderPagination()}
        </PersonaCardShell>
      </div>
    </>
  );
};

export default InquiriesReceived;
