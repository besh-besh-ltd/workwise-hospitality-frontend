import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Head from "next/head";
import moment from "moment";
import Select from "react-select";
import {
  Search, Calendar, Clock, Building2, Package, ArrowRight, MessageCircle,
  Zap, FileText, Send, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { getVendorRfqList } from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import { checkBidExpired } from "@/utils/sharedFunctions";
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
    ...base, minHeight: 34, fontSize: 12.5,
    borderColor: state.isFocused ? "#2E5BA8" : "#e2e2e2",
    boxShadow: state.isFocused ? "0 0 0 1px #2E5BA8" : "none",
    borderRadius: 8, "&:hover": { borderColor: "#ccc" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  option: (base, state) => ({
    ...base, fontSize: 12.5, padding: "7px 12px",
    backgroundColor: state.isSelected ? "#2E5BA8" : state.isFocused ? "#f5f7fa" : "transparent",
    color: state.isSelected ? "#fff" : "#334155",
  }),
  menu: (base) => ({ ...base, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 20 }),
  placeholder: (base) => ({ ...base, fontSize: 12.5, color: "#aaa" }),
  singleValue: (base) => ({ ...base, fontSize: 12.5 }),
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
    if (end.isBefore(now)) return { text: "Ended", color: "red" };
    const days = end.diff(now, "days");
    if (days === 0) return { text: "Ends Today", color: "red" };
    if (days === 1) return { text: "Tomorrow", color: "red" };
    if (days <= 3) return { text: `${days}d left`, color: "yellow" };
    return { text: `${days}d left`, color: "green" };
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
    if (expired) return { label: "View Quote", color: "grey" };
    if (item.status === 1) {
      if (item.quote_status === "pending") return { label: "Send Quote", color: "green" };
      if (item.quote_status === "sent") return { label: "Edit Quote", color: "yellow" };
    }
    return { label: "View Quote", color: "grey" };
  };

  const totalPages = Math.ceil(totalData / limit);

  const STAT_CARDS = [
    { label: "Total Enquiries", value: stats.total, icon: FileText, color: "#2E5BA8" },
    { label: "Pending Quotes", value: stats.pending, icon: AlertTriangle, color: "#f59e0b" },
    { label: "Quoted", value: stats.quoted, icon: Send, color: "#22c55e" },
    { label: "Closing Soon", value: stats.closing_soon, icon: Clock, color: "#ef4444" },
  ];

  const SkeletonStatCards = () => (
    <div className={styles.skeletonStatsGrid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skeletonStatCard}>
          <div className={`${styles.shimmerBar} ${styles.skeletonStatIcon}`} />
          <div className={styles.skeletonStatInfo}>
            <div className={styles.shimmerBar} style={{ width: 48, height: 22 }} />
            <div className={styles.shimmerBar} style={{ width: 80, height: 11 }} />
          </div>
        </div>
      ))}
    </div>
  );

  const SkeletonFilterBar = () => (
    <div className={styles.skeletonFilterBar}>
      <div className={`${styles.shimmerBar} ${styles.skeletonSearchBar}`} />
      <div className={`${styles.shimmerBar} ${styles.skeletonFilterPill}`} />
      <div className={`${styles.shimmerBar} ${styles.skeletonFilterPill}`} />
      <div className={`${styles.shimmerBar} ${styles.skeletonFilterPill}`} />
    </div>
  );

  const SkeletonRows = () => (
    <div className={styles.skeletonWrap}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonRowLeft}>
            <div className={styles.skeletonRowTopLine}>
              <div className={styles.shimmerBar} style={{ width: 64, height: 12 }} />
              <div className={styles.shimmerBar} style={{ width: 90, height: 12 }} />
            </div>
            <div className={styles.shimmerBar} style={{ width: "70%", height: 14 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={styles.shimmerBar} style={{ width: 100, height: 12 }} />
              <div className={styles.shimmerBar} style={{ width: 70, height: 12 }} />
              <div className={styles.shimmerBar} style={{ width: 80, height: 12 }} />
            </div>
          </div>
          <div className={styles.skeletonRowRight}>
            <div className={styles.shimmerBar} style={{ width: 72, height: 24, borderRadius: 5 }} />
            <div className={styles.shimmerBar} style={{ width: 60, height: 24, borderRadius: 5 }} />
            <div className={styles.shimmerBar} style={{ width: 80, height: 14 }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {pageType === 0 && <Head><title>Inquiries Received | Vendor</title></Head>}
      <div className={styles.container}>
        {pageType === 0 && (
          <>
            <div className={styles.pageHeader}>
              <div>
                <h1 className={styles.pageTitle}>Inquiries Received</h1>
                <p className={styles.pageSubtitle}>View, filter, and respond to buyer enquiries.</p>
              </div>
            </div>

            {/* ── Stat Cards ── */}
            {loading && !stats.total ? <SkeletonStatCards /> : (
              <div className={styles.statsGrid}>
                {STAT_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className={styles.statCard}>
                      <div className={styles.statIcon} style={{ background: `${card.color}10`, color: card.color }}>
                        <Icon size={20} />
                      </div>
                      <div className={styles.statInfo}>
                        <span className={styles.statValue}>{card.value}</span>
                        <span className={styles.statLabel}>{card.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Filters ── */}
            {loading && !stats.total ? <SkeletonFilterBar /> : (
              <div className={styles.filterBar}>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search by RFQ No, Title, or Company..."
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
            )}
          </>
        )}

        {/* ── Inquiry List ── */}
        <div className={styles.listCard}>
          {pageType === 1 && (
            <div className={styles.listHeader}>
              <span className={styles.listCount}>{rfqList.length} Latest Enquiries</span>
            </div>
          )}

          {loading ? (
            <SkeletonRows />
          ) : rfqList.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={32} className={styles.emptyIcon} />
              <p>{searchInput || quoteFilter.value || statusFilter.value || deadlineFilter.value ? "No enquiries match your filters." : "No enquiries received yet."}</p>
            </div>
          ) : (
            <div className={styles.inquiryList}>
              {rfqList.map((item) => {
                const products = getProducts(item);
                const daysLeft = getDaysLeft(item.bid_end_date);
                const negBadge = getNegBadge(item.id);
                const action = getActionInfo(item);
                const hasQueries = item.unseen_query_count > 0;

                return (
                  <Link key={item.id} href={`/dashboard/vendor/inquiries-details?id=${item.id}`} className={styles.inquiryRow}>
                    <div className={styles.rowLeft}>
                      <div className={styles.rowTopLine}>
                        <span className={styles.rfqNo}>#{item.rfq_no}</span>
                        {negBadge && (
                          <span className={`${styles.negBadge} ${negBadge.type === "active" ? styles.negActive : styles.negEnded}`}>
                            <Zap size={10} /> {negBadge.text}
                          </span>
                        )}
                        {item.is_tender === 1 && <span className={styles.tenderTag}>Tender</span>}
                      </div>
                      <div className={styles.rowTitle}>
                        {item.title || products.join(", ") || "Untitled Enquiry"}
                      </div>
                      <div className={styles.rowMeta}>
                        <span className={styles.metaItem}><Building2 size={12} /> {item.company_name}</span>
                        <span className={styles.metaDot} />
                        <span className={styles.metaItem}><Package size={12} /> {products.length} product{products.length !== 1 ? "s" : ""}</span>
                        <span className={styles.metaDot} />
                        <span className={styles.metaItem}><Calendar size={12} /> {moment(item.timestamp).format("DD MMM YYYY")}</span>
                      </div>
                    </div>

                    <div className={styles.rowRight}>
                      <span className={`${styles.quoteBadge} ${
                        item.quote_status === "sent" ? styles.quoteSent :
                        item.quote_status === "pending" ? styles.quotePending : styles.quoteOther
                      }`}>
                        {item.quote_status === "sent" ? "Quoted" : item.quote_status === "pending" ? "Not Quoted" : (item.quote_status || "–")}
                      </span>

                      {daysLeft && (
                        <span className={`${styles.deadlineBadge} ${
                          daysLeft.color === "red" ? styles.deadlineRed :
                          daysLeft.color === "yellow" ? styles.deadlineYellow : styles.deadlineGreen
                        }`}>
                          <Clock size={11} /> {daysLeft.text}
                        </span>
                      )}

                      {hasQueries && (
                        <span className={styles.queryBadge}>
                          <MessageCircle size={11} /> {item.unseen_query_count}
                        </span>
                      )}

                      <span className={`${styles.actionLabel} ${
                        action.color === "green" ? styles.actionGreen :
                        action.color === "yellow" ? styles.actionYellow : ""
                      }`}>
                        {action.label}
                        <ArrowRight size={14} className={styles.actionArrow} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && rfqList.length > 0 && pageType === 0 && totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InquiriesReceived;
