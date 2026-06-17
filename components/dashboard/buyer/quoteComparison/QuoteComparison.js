import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import moment from "moment";
import {
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Users,
  TrendingDown,
  AlertTriangle,
  Award,
  ListChecks,
  LayoutGrid,
  BarChart3,
  Info,
  GitBranch,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  CheckSquare,
  MoreVertical,
  History,
  User,
  ArrowUpDown,
  Repeat,
  Search,
  Star,
  Package,
  Wallet,
  Lock,
  Plus,
  ShieldAlert,
} from "lucide-react";

import useModulePermissions from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import { getQuoteComparisonView } from "@/services/pricing";
import { finalizeQuotation, getRFQById, getRfqs } from "@/services/rfq";
import { approveNegotiationQuotes, rejectNegotiationQuotes, getNegotiationApprovalBundle } from "@/services/negotiation";
import { formatRFQNumber } from "@/utils/sharedFunctions";

import styles from "./QuoteComparison.module.scss";
import * as C from "./computeHelpers";

const { fmt, fmtLakh } = C;

const pct = (n, total) => `${total ? (n / total) * 100 : 0}%`;

/* Human-readable dates. moment is already a dependency.
   datetime → "DD MMM YYYY · hh:mm A"   date-only → "DD MMM YYYY"   null → "—" */
const fmtDateTime = (d) => {
  if (d == null || d === "") return "—";
  const m = moment(d);
  return m.isValid() ? m.format("DD MMM YYYY · hh:mm A") : "—";
};
const fmtDate = (d) => {
  if (d == null || d === "") return "—";
  const m = moment(d);
  return m.isValid() ? m.format("DD MMM YYYY") : "—";
};

/* Render an overlay above the app topbar (z 1030) + sidebar (z 1020).
   Portaled to document.body so it escapes the page's stacking context. */
const Portal = ({ children }) =>
  typeof document !== "undefined" ? createPortal(children, document.body) : null;

// `rfqId` + `embedded` make this component reusable inside the RFQ lifecycle
// page, locked to one RFQ: the Switch-RFQ control/modal are suppressed and the
// id comes from the prop instead of the URL. Negotiation deep-links are kept
// (the user wants the negotiation module reused).
const QuoteComparison = ({ rfqId: rfqIdProp, embedded: isEmbedded = false } = {}) => {
  const router = useRouter();

  const [rfq, setRfq] = useState((isEmbedded ? rfqIdProp : router.query.rfq) || null);

  // Switch-RFQ modal list — server-side search + infinite scroll
  const RFQ_PAGE_SIZE = 10;
  const [showSwitchRfq, setShowSwitchRfq] = useState(false);
  const [rfqSearch, setRfqSearch] = useState("");
  const [rfqSearchTerm, setRfqSearchTerm] = useState(""); // debounced term sent to backend
  const [myRFQs, setMyRFQs] = useState([]);
  const [listLoading, setListLoading] = useState(false); // first page / new search
  const [rfqLoadingMore, setRfqLoadingMore] = useState(false); // appending next page
  const [rfqPage, setRfqPage] = useState(1);
  const [rfqHasMore, setRfqHasMore] = useState(true);
  const rfqListRef = useRef(null);
  const rfqFetchSeq = useRef(0); // guards against out-of-order responses

  // view-model data
  const [view, setView] = useState(null);
  const [currentRFQMeta, setCurrentRFQMeta] = useState(null); // hotel_ids/department_id from getRFQById
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Negotiation rounds awaiting THIS user's approval — drives the
  // "Approval Required" button on the RFQ band. Failure-tolerant.
  const [pendingApprovalRounds, setPendingApprovalRounds] = useState([]);
  useEffect(() => {
    if (!rfq) { setPendingApprovalRounds([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await getNegotiationApprovalBundle(rfq);
        const bundle = res?.data || res || {};
        const instancesByRound = bundle.negotiation_instances || {};
        const now = new Date();
        const parseUtc = (d) => {
          if (!d) return null;
          const s = String(d);
          return new Date(s.includes('+') || s.includes('Z') ? s : s.replace(' ', 'T') + 'Z');
        };
        const pending = (bundle.rounds_history || []).filter(r =>
          r.status === 'PENDING_APPROVAL'
          && parseUtc(r.end_date) > now
          && (instancesByRound[String(r.id)] || [])
            .some(i => i.status === 'PENDING' && i.can_user_approve)
        );
        if (!cancelled) setPendingApprovalRounds(pending);
      } catch {
        if (!cancelled) setPendingApprovalRounds([]);
      }
    })();
    return () => { cancelled = true; };
  }, [rfq, view]);

  // workspace UI state
  const TABS = { product: "product", category: "category", cost: "overall" };
  const TAB_BY_VIEW = { product: "product", category: "category", overall: "cost" };
  const [activeView, setActiveView] = useState(
    TABS[router.query.tab] || "product"
  ); // product | category | overall
  // `role` is auto-determined from data + permissions (no manual switch) —
  // defined as a memo just after `products` below.
  const [freightOn, setFreightOn] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [collapsedCats, setCollapsedCats] = useState({});
  const [selections, setSelections] = useState({}); // productId -> vendorId
  const [approveSel, setApproveSel] = useState({});
  const [rejectSel, setRejectSel] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [showFinalize, setShowFinalize] = useState(false);
  const [finalizeComment, setFinalizeComment] = useState(""); // mandatory finalize note
  const [showConfirm, setShowConfirm] = useState(false);
  const [tip, setTip] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);

  // vendor ordering + per-cell kebab + quote history
  const [vendorSort, setVendorSort] = useState("price"); // price | tech | track
  const [sortOpen, setSortOpen] = useState(false);
  const [sortPos, setSortPos] = useState(null); // { x, y } screen coords for portaled menu
  const sortBtnRef = useRef(null);
  const [menu, setMenu] = useState(null); // { x, y, pid, vid }
  const [showHistory, setShowHistory] = useState(null); // { product, vendor }
  const [approvalPanel, setApprovalPanel] = useState(null); // product whose approval trail is open

  const latestRfqRef = useRef(rfq ? String(rfq) : null);
  latestRfqRef.current = rfq ? String(rfq) : null;

  // Keep rfq synced from the URL (standalone) or the rfqId prop (embedded)
  useEffect(() => {
    const next = (isEmbedded ? rfqIdProp : router.query.rfq) || null;
    if (next && next !== rfq) setRfq(next);
  }, [router.query.rfq, rfqIdProp, isEmbedded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRfqSelect = (id) => {
    const newId = String(id);
    setShowSwitchRfq(false);
    if (newId === String(rfq)) return;
    setRfq(newId);
    if (isEmbedded) return; // locked to one RFQ; don't rewrite the host URL
    const params = new URLSearchParams({ rfq: newId });
    if (router.query.tab) params.set("tab", router.query.tab);
    const url = `/dashboard/buyer/quote-comparison?${params.toString()}`;
    router.replace(url, undefined, { shallow: true });
  };

  /* ─────────────── ?tab= URL sync ─────────────── */
  const setActiveViewSynced = (v) => {
    setActiveView(v);
    if (isEmbedded) return; // don't rewrite the host page URL for tab changes
    const params = new URLSearchParams();
    if (rfq) params.set("rfq", String(rfq));
    params.set("tab", TAB_BY_VIEW[v] || "product");
    router.replace(`/dashboard/buyer/quote-comparison?${params.toString()}`, undefined, {
      shallow: true,
    });
  };

  useEffect(() => {
    const t = router.query.tab;
    if (t && TABS[t] && TABS[t] !== activeView) setActiveView(TABS[t]);
  }, [router.query.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────── Switch-RFQ modal list — backend search + infinite scroll ───────────────
     Reuses getRfqs params from the legacy quote-compare sidebar:
       rfq_no (parsed int) for search · page · limit · sort:"DESC"
       quote_compare:true · tech_eval:false · module_keys.
     getRfqs returns a plain array (no total/has_more envelope), so "no more"
     is signalled by a short page (length < limit). Dedupe by rfq id. */
  const fetchRfqPage = useCallback(
    (page, { search = "", append = false } = {}) => {
      const seq = ++rfqFetchSeq.current;
      if (append) setRfqLoadingMore(true);
      else setListLoading(true);
      // search supports either an RFQ number or free text; backend filters on rfq_no.
      const trimmed = String(search || "").trim();
      const numericTerm = trimmed ? parseInt(trimmed.replace(/[#\s]/g, ""), 10) : null;
      getRfqs({
        tech_eval: false,
        quote_compare: true,
        page,
        limit: RFQ_PAGE_SIZE,
        sort: "DESC",
        module_keys: "negotiation,negotiation_quote",
        rfq_no: Number.isFinite(numericTerm) ? numericTerm : null,
      })
        .then((res) => {
          if (seq !== rfqFetchSeq.current) return; // stale response
          const list = Array.isArray(res) ? res : [];
          setRfqHasMore(list.length >= RFQ_PAGE_SIZE);
          setRfqPage(page);
          setMyRFQs((prev) => {
            if (!append) return list;
            const seen = new Set(prev.map((r) => String(r.id)));
            const merged = [...prev];
            list.forEach((r) => {
              if (!seen.has(String(r.id))) {
                seen.add(String(r.id));
                merged.push(r);
              }
            });
            return merged;
          });
        })
        .catch(() => {
          if (seq !== rfqFetchSeq.current) return;
          if (!append) setMyRFQs([]);
          setRfqHasMore(false);
        })
        .finally(() => {
          if (seq !== rfqFetchSeq.current) return;
          if (append) setRfqLoadingMore(false);
          else setListLoading(false);
        });
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Debounce the search box (~300ms) → backend search, reset to page 1.
  useEffect(() => {
    if (!showSwitchRfq) return undefined;
    const t = setTimeout(() => setRfqSearchTerm(rfqSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [rfqSearch, showSwitchRfq]);

  // Load page 1 whenever the modal opens or the debounced term changes.
  useEffect(() => {
    if (!showSwitchRfq) return;
    setRfqHasMore(true);
    fetchRfqPage(1, { search: rfqSearchTerm, append: false });
    if (rfqListRef.current) rfqListRef.current.scrollTop = 0;
  }, [showSwitchRfq, rfqSearchTerm, fetchRfqPage]);

  const loadMoreRfqs = useCallback(() => {
    if (listLoading || rfqLoadingMore || !rfqHasMore) return;
    fetchRfqPage(rfqPage + 1, { search: rfqSearchTerm, append: true });
  }, [listLoading, rfqLoadingMore, rfqHasMore, rfqPage, rfqSearchTerm, fetchRfqPage]);

  const onRfqListScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) loadMoreRfqs();
    },
    [loadMoreRfqs]
  );

  // Backend already filters by rfq_no; render the server list as-is.
  const filteredRfqs = myRFQs;

  // Reset the picker when the modal closes so it reopens fresh.
  useEffect(() => {
    if (showSwitchRfq) return;
    setRfqSearch("");
    setRfqSearchTerm("");
    setMyRFQs([]);
    setRfqPage(1);
    setRfqHasMore(true);
  }, [showSwitchRfq]);

  /* ─────────────── RFQ metadata (hotel/department for RBAC) ─────────────── */
  useEffect(() => {
    let cancelled = false;
    setCurrentRFQMeta(null);
    if (!rfq || rfq === "undefined" || rfq === "null") return undefined;
    const fetchRfq = String(rfq);
    getRFQById(fetchRfq)
      .then((res) => {
        if (cancelled || latestRfqRef.current !== fetchRfq) return;
        const data = res?.data || res;
        if (data) setCurrentRFQMeta(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [rfq]);

  const hotelIdsKey =
    currentRFQMeta?.hotel_ids?.join(",") || currentRFQMeta?.hotel_id || "";
  const hotelIds = useMemo(
    () => currentRFQMeta?.hotel_ids || (currentRFQMeta?.hotel_id ? [currentRFQMeta.hotel_id] : []),
    [hotelIdsKey] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const departmentId = currentRFQMeta?.department_id || null;

  const {
    canRead,
    canUpdate,
    canCreate,
    canApprove,
    loading: permsLoading,
  } = useModulePermissions({
    moduleKey: "quote-compare",
    hotelIds,
    departmentId,
    enabled: !!currentRFQMeta,
  });

  const isRfqClosed = view ? String(view.rfq?.status).toUpperCase() === "CLOSED" : false;
  const canWrite = (canUpdate || canCreate) && !isRfqClosed;

  /* ─────────────── fetch view (single endpoint) ─────────────── */
  const fetchView = useCallback(
    async ({ silent = false } = {}) => {
      if (!rfq) return;
      const fetchRfq = String(rfq);
      if (!silent) setLoading(true);
      try {
        // ONE call now powers the whole page: the view contract carries the
        // finalize identifiers + quote history per cell (no second round-trip).
        const viewRes = await getQuoteComparisonView(rfq, { freight: freightOn });
        if (latestRfqRef.current !== fetchRfq) return;
        setView(viewRes || null);
      } catch (e) {
        if (latestRfqRef.current !== fetchRfq) return;
        // eslint-disable-next-line no-console
        console.error("Failed to load quote comparison view", e);
        setView(null);
      } finally {
        if (latestRfqRef.current === fetchRfq && !silent) setLoading(false);
      }
    },
    [rfq, freightOn]
  );

  useEffect(() => {
    if (!rfq || !canRead) {
      setView(null);
      return;
    }
    fetchView();
  }, [rfq, canRead, freightOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset transient UI when switching RFQs
  useEffect(() => {
    setSelections({});
    setApproveSel({});
    setRejectSel({});
    setRejectReasons({});
    setExpanded({});
    setCollapsedCats({});
    setShowFinalize(false);
    setShowConfirm(false);
    setMenu(null);
    setShowHistory(null);
  }, [rfq]);

  const showToast = (m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2600);
  };

  // Escape-to-close for every overlay (closes the topmost one only).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (menu) return setMenu(null);
      if (sortOpen) return setSortOpen(false);
      if (showFinalize) return setShowFinalize(false);
      if (showConfirm) return setShowConfirm(false);
      if (showHistory) return setShowHistory(null);
      if (showSwitchRfq) return setShowSwitchRfq(false);
      if (approvalPanel) return setApprovalPanel(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, sortOpen, showFinalize, showConfirm, showHistory, showSwitchRfq, approvalPanel]);

  /* ─────────────── derived data ─────────────── */
  const vendors = view?.vendors || [];
  const products = view?.products || [];
  const categories = view?.categories || [];
  const rfqInfo = view?.rfq || {};

  // Pre-deadline lock: quotes stay hidden until the submission deadline. The
  // backend sends scrubbed placeholders + quotes_locked; the FE blurs every
  // number/vendor identity and shows a clear banner (counts stay visible).
  const quotesLocked = !!view?.quotes_locked;
  const bidEndDate = view?.bid_end_date || rfqInfo.deadline || null;

  // Auto-determined view role (no manual switch):
  //   approver  → it's this user's turn to approve at least one product (awaiting_me)
  //   buyer     → evaluator: has quote-compare read + create
  //   readonly  → can only read (shows neither finalize nor approve actions)
  const role = useMemo(() => {
    if (products.some((p) => p.awaiting_me)) return "approver";
    if (canRead && canCreate) return "buyer";
    return "readonly";
  }, [products, canRead, canCreate]);
  const approvalChain = view?.approval_chain || [];

  const avatarClassMap = { "av-indigo": styles.avIndigo, "av-rose": styles.avRose, "av-green": styles.avGreen, "av-warm": styles.avWarm, "av-blue": styles.avBlue };
  const vendorAvatar = useMemo(() => {
    const m = {};
    vendors.forEach((v, i) => {
      m[v.id] = avatarClassMap[C.avatarFor(v.id, i)] || styles.avIndigo;
    });
    return m;
  }, [vendors]); // eslint-disable-line react-hooks/exhaustive-deps
  const avatarOf = (vid) => vendorAvatar[vid] || styles.avIndigo;

  // Technical evaluation is configured for at least one product → enables the
  // T-rank tags and the "Technical marks" sort option.
  const techConfigured = useMemo(() => products.some((p) => p?.tech?.configured), [products]);
  // If tech isn't configured but the sort is still pinned to it, fall back to price.
  useEffect(() => {
    if (vendorSort === "tech" && !techConfigured) setVendorSort("price");
  }, [vendorSort, techConfigured]);

  // sorted vendor columns — used EVERYWHERE the matrix iterates vendors
  const effectiveSort = vendorSort === "tech" && !techConfigured ? "price" : vendorSort;
  const sortedVendors = useMemo(
    () => C.sortedVendors(vendors, products, effectiveSort),
    [vendors, products, effectiveSort]
  );
  const sortLabel = { price: "Lowest price", tech: "Technical marks", track: "Track record" }[effectiveSort];

  const counts = useMemo(() => C.stateCounts(products), [products]);
  const productById = (id) => products.find((p) => String(p.id) === String(id));
  const vendorById = (id) => vendors.find((v) => String(v.id) === String(id));

  const coverage = (vid) => C.vendorCoverage(vid, products);
  const isFull = (vid) => C.isFullCoverage(vid, products);

  const displayRows = useMemo(() => {
    const rows = [];
    if (activeView === "category") {
      categories.forEach((cat) => {
        const prods = products.filter((p) => String(p.category) === String(cat.id));
        if (!prods.length) return;
        const collapsed = !!collapsedCats[cat.id];
        rows.push({ type: "cat-header", cat, count: prods.length, collapsed, key: "ch-" + cat.id });
        if (!collapsed) {
          prods.forEach((p) => rows.push({ type: "product", product: p, key: "p-" + p.id }));
          rows.push({ type: "cat-subtotal", cat, key: "cs-" + cat.id });
        }
      });
    } else {
      products.forEach((p) => rows.push({ type: "product", product: p, key: "p-" + p.id }));
    }
    return rows;
  }, [activeView, categories, products, collapsedCats]);

  const toggleCat = (catId) => setCollapsedCats((c) => ({ ...c, [catId]: !c[catId] }));

  /* ─────────────── compute proxies ─────────────── */
  const ranksFor = (p) => C.productRanks(p, vendors);
  // L1 computed from DATA (not column position) so highlight stays correct under any sort
  const isL1 = (p, vid) => C.l1VendorFor(p, vendors) === String(vid);
  // recommendNext: best remaining vendor for a rejected product (excludes the rejected one)
  const recommendNext = (p) =>
    p && p.state === "rejected"
      ? C.recommendNextVendor(p, vendors, p.finalized_vendor)
      : null;
  const cellTotal = (p, vid) => C.cellTotal(p, vid);
  // Per-item DISPLAY total/landed exclude quote-level global charges so the
  // shown amount matches the vendor's line total and its breakdown rows.
  // (Ranking, vendor grand totals and award amounts still use cellTotal.)
  const cellLineTotal = (p, vid) => C.cellLineTotal(p, vid);
  const landed = (p, vid) => C.landedLinePerUnit(p, vid);
  const vendorTotal = (vid) => C.vendorTotal(vid, products);
  const vendorRankMap = useMemo(() => C.vendorRanks(vendors, products), [vendors, products]);
  const vendorRank = (vid) => vendorRankMap[vid];
  // Category subtotal = Σ line totals for the category + that category's slice
  // of the vendor's quote-level globals (distributed by line subtotal, so the
  // category subtotals add up to the vendor total). Excludes the per-product
  // global over-count.
  const catVendorSubtotal = (catId, vid) => {
    const catProducts = products.filter((p) => String(p.category) === String(catId));
    const catLineSum = catProducts.reduce((s, p) => s + (C.cellLineTotal(p, vid) || 0), 0);
    const allLineSum = products.reduce((s, p) => s + (C.cellLineTotal(p, vid) || 0), 0);
    const totalGlobals = C.vendorGlobalCharges(vid, products);
    const catGlobals = allLineSum > 0 ? totalGlobals * (catLineSum / allLineSum) : 0;
    return catLineSum + catGlobals;
  };
  const lprDelta = (p, vid) => C.lprDelta(p, vid);
  const l1GrandTotal = useMemo(() => C.l1GrandTotal(vendors, products), [vendors, products]);
  const finalizedTotal = useMemo(() => C.finalizedGrandTotal(products), [products]);
  const baseline = useMemo(() => C.baselineTotal(products), [products]);
  const savings = useMemo(() => C.potentialSavings(vendors, products), [vendors, products]);
  const riskFlags = useMemo(() => C.riskFlagCount(vendors, products), [vendors, products]);
  const coverageCount = useMemo(() => C.coverageVendors(vendors, products), [vendors, products]);
  const approvalPct = useMemo(() => C.approvalPct(products), [products]);

  const suggestedL1Vendor = useMemo(() => {
    const vid = Object.keys(vendorRankMap).find((id) => vendorRankMap[id] === 1);
    return vendorById(vid) || vendors[0] || null;
  }, [vendorRankMap, vendors]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────── selection (evaluator) ─────────────── */
  const canReselect = (p) =>
    !quotesLocked && role === "buyer" && canWrite && (p.state === "open" || p.state === "rejected");
  const selCount = Object.keys(selections).length;
  const openCount = products.filter((p) => p.state === "open").length;
  const selVendorCount = new Set(Object.values(selections)).size;
  const isSplitPO = selVendorCount > 1;
  // Award totals = Σ line totals of the selected products + each selected
  // vendor's quote-level globals once (over the products picked from them) —
  // same basis as the vendor total, so awards aren't inflated by the
  // per-product global over-count.
  const selByVendor = (sel) => {
    const byVendor = {};
    Object.entries(sel).forEach(([pid, vid]) => {
      const p = productById(pid);
      if (!p) return;
      (byVendor[vid] = byVendor[vid] || []).push(p);
    });
    return byVendor;
  };
  const vendorSelTotal = (vid, prods) =>
    prods.reduce((s, p) => s + (C.cellLineTotal(p, vid) || 0), 0) +
    C.vendorGlobalCharges(vid, prods);
  const selTotal = Object.entries(selByVendor(selections)).reduce(
    (s, [vid, prods]) => s + vendorSelTotal(vid, prods),
    0
  );
  const selVendorBreakdown = useMemo(() => {
    const byVendor = selByVendor(selections);
    return Object.entries(byVendor).map(([vid, prods]) => ({
      vendor: vendorById(vid),
      total: vendorSelTotal(vid, prods),
    }));
  }, [selections]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCell = (p, vid) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (String(next[p.id]) === String(vid)) delete next[p.id];
      else next[p.id] = String(vid);
      return next;
    });
  };
  const isSelected = (p, vid) => String(selections[p.id]) === String(vid);
  const clearSel = () => setSelections({});
  const autoSelectL1 = () => {
    const next = { ...selections };
    products.forEach((p) => {
      if (p.state === "open") {
        const l1 = C.l1VendorFor(p, vendors);
        if (l1) next[p.id] = l1;
      }
    });
    setSelections(next);
  };
  const giveAllTo = (vid) => {
    if (!vid) return;
    const next = { ...selections };
    products.forEach((p) => {
      if (p.state === "open" && p.quotes?.[vid]) next[p.id] = String(vid);
    });
    setSelections(next);
  };

  /* ─────────────── approver decisions ─────────────── */
  // Approver acts only on pending products where it's THEIR turn (awaiting_me).
  const pendingProducts = products.filter((p) => p.state === "pending" && p.awaiting_me);
  const approveCount = Object.keys(approveSel).length;
  const rejectCount = Object.keys(rejectSel).length;
  const decisionCount = approveCount + rejectCount;

  const setApprove = (p) => {
    if (p.state !== "pending") return;
    setApproveSel((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else {
        next[p.id] = true;
        setRejectSel((r) => {
          const rn = { ...r };
          delete rn[p.id];
          return rn;
        });
      }
      return next;
    });
  };
  const setReject = (p) => {
    if (p.state !== "pending") return;
    setRejectSel((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else {
        next[p.id] = true;
        setApproveSel((a) => {
          const an = { ...a };
          delete an[p.id];
          return an;
        });
      }
      return next;
    });
  };
  const clearDecisions = () => {
    setApproveSel({});
    setRejectSel({});
    setRejectReasons({});
  };
  const approveAllPending = () => {
    setRejectSel({});
    const next = {};
    pendingProducts.forEach((p) => {
      next[p.id] = true;
    });
    setApproveSel(next);
  };

  const decisionList = useMemo(() => {
    const list = [];
    pendingProducts.forEach((p) => {
      const d = approveSel[p.id] ? "approve" : rejectSel[p.id] ? "reject" : null;
      if (d)
        list.push({
          product: p,
          vendor: vendorById(p.finalized_vendor),
          total: cellLineTotal(p, p.finalized_vendor),
          decision: d,
        });
    });
    return list;
  }, [pendingProducts, approveSel, rejectSel]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────── per-cell kebab + quote history ─────────────── */
  const openMenu = (e, pid, vid) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const left = Math.max(12, r.right - 180);
    setMenu({ x: left, y: r.bottom + 6, pid, vid });
  };
  const closeMenu = () => setMenu(null);
  const openHistoryFromMenu = () => {
    if (!menu) return;
    setShowHistory({ product: productById(menu.pid), vendor: vendorById(menu.vid) });
    setMenu(null);
  };
  const viewProfileFromMenu = () => {
    if (!menu) return;
    showToast("Opening vendor profile · " + (vendorById(menu.vid)?.name || ""));
    setMenu(null);
  };

  // REAL round history now ships precomputed on the cell (view contract).
  const historyRounds = useMemo(() => {
    if (!showHistory) return [];
    const cell = showHistory.product?.quotes?.[showHistory.vendor?.id];
    return Array.isArray(cell?.history) ? cell.history : [];
  }, [showHistory]);

  // Render one round-over-round change (any edited field, not just base price).
  const fmtChangeVal = (c) => {
    const money = (v) => (v == null ? "—" : `₹${fmt(v)}`);
    const pct = (v) => (v == null ? "—" : `${v}%`);
    const txt = (v) => (v == null || v === "" ? "—" : String(v));
    const fmtV = c.kind === "pct" ? pct : c.kind === "money" ? money : txt;
    if (c.added) return `added ${fmtV(c.to)}`;
    if (c.removed) return `removed ${fmtV(c.from)}`;
    return `${fmtV(c.from)} → ${fmtV(c.to)}`;
  };
  // Format one side (from = original / to = this-round value) of a change.
  const fmtChangeSide = (c, which) => {
    const money = (v) => (v == null ? "—" : `₹${fmt(v)}`);
    const pct = (v) => (v == null ? "—" : `${v}%`);
    const txt = (v) => (v == null || v === "" ? "—" : String(v));
    const fmtV = c.kind === "pct" ? pct : c.kind === "money" ? money : txt;
    return fmtV(which === "from" ? c.from : c.to);
  };
  const changeToneClass = (c) =>
    (c.kind === "money" || c.kind === "pct") && c.dir === "up"
      ? styles.chgUp
      : (c.kind === "money" || c.kind === "pct") && c.dir === "down"
      ? styles.chgDown
      : "";

  /* ─────────────── approval drawer (audit trail) ─────────────── */
  // "Awaiting approval from Vineet I" / "… from 3 persons" + a names tooltip.
  const awaitingApprovalLabel = (p) => {
    const cur = p?.approval?.current_approvers || [];
    if (cur.length === 1) return `Awaiting approval from ${cur[0].name}`;
    if (cur.length > 1) return `Awaiting approval from ${cur.length} persons`;
    return "Awaiting approval";
  };
  const awaitingApprovalNames = (p) =>
    (p?.approval?.current_approvers || []).map((a) => a.name).filter(Boolean).join(", ") || null;
  // Toggle: clicking the SAME open cell/badge closes it; a DIFFERENT one swaps in
  // its trail.
  const openApprovalPanel = (p) => {
    if (!p) return;
    setApprovalPanel((cur) => (cur && String(cur.id) === String(p.id) ? null : p));
  };
  // Keep the open drawer's data fresh after a refetch (same product id).
  useEffect(() => {
    if (!approvalPanel) return;
    const fresh = products.find((p) => String(p.id) === String(approvalPanel.id));
    if (fresh && fresh !== approvalPanel) setApprovalPanel(fresh);
  }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────── finalize ─────────────── */
  // All finalize identifiers come from the view contract now (cell.finalize +
  // product + rfq block) — no second API call.
  const buildFinalizePayload = (productId, vendorId) => {
    const product = productById(productId);
    const cell = product?.quotes?.[vendorId];
    const f = cell?.finalize;
    if (!product || !f) return null;

    return {
      rfq_id: rfqInfo.id,
      rfq_no: rfqInfo.rfq_no,
      product_variant_id: product.product_variant_id,
      vendor_id: f.vendor_id,
      quote_id: f.quote_id,
      quote_item_id: f.quote_item_id,
      variant: product.variant,
      route_type: "PO",
      comment: finalizeComment.trim(),
      project_id: rfqInfo.project_id ?? null,
      total_value: f.total_value,
      selected_hierarchy: null,
      product_info: {
        rfq_product_id: product.id,
        quantity: product.qty,
        unit: product.unit || "N/A",
        unit_price: f.unit_price,
        charges_meta: f.charges_meta,
        finalized_vendor_id: f.vendor_id,
      },
    };
  };

  const confirmFinalize = async () => {
    const entries = Object.entries(selections);
    if (!entries.length) return;
    if (!finalizeComment.trim()) {
      toast.error("Please add a comment before finalising.");
      return;
    }
    setActionLoading(true);
    let ok = 0;
    let fail = 0;
    for (const [pid, vid] of entries) {
      const payload = buildFinalizePayload(pid, vid);
      if (!payload) {
        fail++;
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        await finalizeQuotation(payload);
        ok++;
      } catch (e) {
        fail++;
      }
    }
    setActionLoading(false);
    setShowFinalize(false);
    setSelections({});
    setFinalizeComment("");
    await fetchView({ silent: true });
    if (ok) showToast(`${ok} product${ok > 1 ? "s" : ""} finalized → sent to approval`);
    if (fail) toast.error(`${fail} finalization${fail > 1 ? "s" : ""} failed.`);
  };

  /* ─────────────── approve / reject ─────────────── */
  const confirmDecisions = async () => {
    if (!decisionCount) return;
    setActionLoading(true);
    let approved = 0;
    let rejected = 0;
    let fail = 0;
    for (const pid of Object.keys(approveSel)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await approveNegotiationQuotes(pid, null, departmentId);
        approved++;
      } catch (e) {
        fail++;
      }
    }
    for (const pid of Object.keys(rejectSel)) {
      const reason = (rejectReasons[pid] || "Rejected from quote comparison.").trim();
      try {
        // eslint-disable-next-line no-await-in-loop
        await rejectNegotiationQuotes(pid, reason, departmentId);
        rejected++;
      } catch (e) {
        fail++;
      }
    }
    setActionLoading(false);
    setShowConfirm(false);
    clearDecisions();
    await fetchView({ silent: true });
    if (approved || rejected) showToast(`${approved} approved · ${rejected} rejected · buyer notified`);
    if (fail) toast.error(`${fail} decision${fail > 1 ? "s" : ""} failed.`);
  };

  /* ─────────────── tooltip ─────────────── */
  const showTip = (e, product) => {
    if (!product.reject_info) return;
    const r = e.currentTarget.getBoundingClientRect();
    let left = r.left;
    if (left + 320 > window.innerWidth) left = window.innerWidth - 332;
    setTip({
      x: Math.max(12, left),
      y: r.bottom + 8,
      info: product.reject_info,
      recommended: recommendNext(product),
    });
  };
  const hideTip = () => setTip(null);

  /* ─────────────── cell renderer ─────────────── */
  const renderCell = (p, v) => {
    const vid = v.id;
    const q = p.quotes?.[vid];
    if (!q) {
      return (
        <td className={styles.cell} key={`${p.id}-${vid}`}>
          <div className={styles.priceCell}>
            <span className={styles.awaiting}>Awaiting quote</span>
          </div>
        </td>
      );
    }
    // Locked (pre-deadline): the vendor HAS quoted, but the numbers stay hidden.
    if (quotesLocked) {
      return (
        <td className={styles.cell} key={`${p.id}-${vid}`}>
          <div className={`${styles.priceCell} ${styles.lockedCell}`}>
            <span className={styles.lockedBlur}>₹•,•••</span>
            <span className={styles.lockedTag}>
              <Lock size={10} /> Quote received
            </span>
          </div>
        </td>
      );
    }
    const reselect = canReselect(p);
    const sel = reselect && isSelected(p, vid);
    const finVendor = String(p.finalized_vendor) === String(vid);
    const decisionActive = role === "approver" && (approveSel[p.id] || rejectSel[p.id]);

    // The finalized vendor's cell (once it has an approval) opens the trail aside.
    const opensTrail =
      finVendor && (p.state === "pending" || p.state === "approved" || p.state === "rejected");

    const cls = [styles.priceCell];
    if (isL1(p, vid)) cls.push(styles.isL1);
    if (reselect) cls.push(styles.selectable);
    if (opensTrail) cls.push(styles.cellTrailClickable);
    if (sel) cls.push(styles.isSelected);
    if (finVendor && p.state === "pending" && !decisionActive) cls.push(styles.cellFinalized);
    if (finVendor && p.state === "approved") cls.push(styles.cellApproved);
    if (finVendor && p.state === "rejected" && !sel) cls.push(styles.cellRejected);
    if (role === "approver" && p.state === "pending" && finVendor && approveSel[p.id])
      cls.push(styles.approveSelected);
    if (role === "approver" && p.state === "pending" && finVendor && rejectSel[p.id])
      cls.push(styles.rejectSelected);

    const delta = lprDelta(p, vid);

    return (
      <td className={styles.cell} key={`${p.id}-${vid}`}>
        <div
          className={cls.join(" ")}
          onClick={() => {
            if (reselect && !(p.state === "rejected" && finVendor)) {
              selectCell(p, vid);
              return;
            }
            if (opensTrail) openApprovalPanel(p);
          }}
        >
          <button
            className={styles.cellKebab}
            onClick={(e) => openMenu(e, p.id, vid)}
            title="Quote actions"
            aria-label="Quote actions"
          >
            <MoreVertical size={13} />
          </button>
          <div className={styles.pTop}>
            <span className={styles.price}>₹{fmt(cellLineTotal(p, vid))}</span>
            {(() => {
              const lr = ranksFor(p)[vid];
              const tr = C.productTechRank(p, vid);
              return (
                <span className={styles.cellRanks}>
                  {lr ? (
                    <span
                      className={`${styles.rankBadge} ${styles[C.rankTone(lr)]}`}
                      title={`Lowest-price rank for this item (L${lr})`}
                    >
                      L{lr}
                    </span>
                  ) : null}
                  {tr ? (
                    <span
                      className={`${styles.rankBadge} ${styles.tBadge} ${styles[C.rankTone(tr)]}`}
                      title={`Technical rank for this item (T${tr})`}
                    >
                      T{tr}
                    </span>
                  ) : null}
                </span>
              );
            })()}
          </div>
          <div className={styles.landed}>
            landed <span className={styles.mono}>₹{fmt(landed(p, vid))}/{p.unit}</span>
          </div>
          {delta && (
            <div className={`${styles.deltaLpr} ${delta.down ? styles.down : styles.up}`}>
              <span>{(delta.down ? "↓ " : "↑ ") + delta.pct + "% vs LPR"}</span>
            </div>
          )}
          {q.missing && (
            <div className={styles.missing}>
              <AlertTriangle size={11} /> missing costs
            </div>
          )}

          {(() => {
            const v = vendorById(vid);
            if (!v) return null;
            const hasMetrics =
              v.pos_accepted != null || v.quote_pct != null || v.po_value != null;
            if (!v.is_new && !hasMetrics) return null;
            return (
              <div className={styles.trackStrip}>
                {v.is_new && (
                  <span
                    className={styles.newTag}
                    title="New vendor — finalised fewer than 3 times. Newly started working with you."
                  >
                    <Sparkles size={9} /> New
                  </span>
                )}
                {v.pos_accepted != null && (
                  <span className={styles.trkChip} title="Successful POs accepted by this vendor">
                    <Package size={10} /> {v.pos_accepted}
                  </span>
                )}
                {v.quote_pct != null && (
                  <span
                    className={`${styles.trkChip} ${styles[C.pctTone(v.quote_pct)]}`}
                    title={`Quoted in ${v.quoted_rfqs} of ${v.invited_rfqs} RFQs invited`}
                  >
                    {v.quote_pct}%
                  </span>
                )}
                {v.po_value ? (
                  <span className={styles.trkChip} title="Total value of accepted POs">
                    <Wallet size={10} /> ₹{fmtLakh(v.po_value)}
                  </span>
                ) : null}
              </div>
            );
          })()}

          {/* Per-item quote history for THIS vendor — shows when the vendor
              updated this item in at least one negotiation round. */}
          {Array.isArray(q.history) && q.history.length >= 1 && (
            <button
              type="button"
              className={styles.cellHistoryBtn}
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory({ product: p, vendor: vendorById(vid) });
              }}
              title="See this vendor's quote revisions for this item"
            >
              <History size={11} /> Quote history
            </button>
          )}

          {/* BUYER: selectable, not the rejected vendor */}
          {role === "buyer" &&
            reselect &&
            !sel &&
            !(p.state === "rejected" && finVendor) &&
            (() => {
              const rec = recommendNext(p);
              const isRec = rec && String(rec.id) === String(vid);
              return (
                <>
                  {isRec && (
                    <span className={styles.cellRecommend}>
                      <Sparkles size={10} /> Recommended next
                    </span>
                  )}
                  <button
                    className={`${styles.cellSelectBtn} ${isRec ? styles.isRecommend : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectCell(p, vid);
                    }}
                  >
                    {p.state === "rejected" ? "Select this instead" : "Select for this item"}
                  </button>
                </>
              );
            })()}

          {/* BUYER: selected */}
          {role === "buyer" && reselect && sel && (
            <div className={styles.cellSelectedActions}>
              <span className={styles.cellPillSelected}>
                <Check size={11} /> Selected
              </span>
              <button
                className={styles.cellFinaliseBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelections({ [p.id]: String(vid) });
                  setShowFinalize(true);
                }}
              >
                <Award size={11} /> Finalise
              </button>
            </div>
          )}

          {/* BUYER: rejected vendor's own cell — force re-select */}
          {role === "buyer" && p.state === "rejected" && finVendor && !sel && (
            <div className={styles.cellRejectedActions}>
              <span className={`${styles.cellStateTag} ${styles.rejected}`}>✕ Rejected by approver</span>
              {canWrite && (
                <button
                  className={styles.cellForceBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCell(p, vid);
                  }}
                >
                  Force re-select anyway
                </button>
              )}
            </div>
          )}

          {/* state tags — clickable to open the approval audit-trail drawer */}
          {finVendor && p.state === "pending" && role === "buyer" && (
            <button
              className={`${styles.cellStateTag} ${styles.finalized} ${styles.clickableTag}`}
              title={awaitingApprovalNames(p) || undefined}
              onClick={(e) => {
                e.stopPropagation();
                openApprovalPanel(p);
              }}
            >
              <Clock size={10} /> {awaitingApprovalLabel(p)} <ChevronRight size={10} />
            </button>
          )}
          {finVendor && p.state === "approved" && (
            <button
              className={`${styles.cellStateTag} ${styles.approved} ${styles.clickableTag}`}
              onClick={(e) => {
                e.stopPropagation();
                openApprovalPanel(p);
              }}
            >
              <Check size={10} /> Approved <ChevronRight size={10} />
            </button>
          )}

          {/* APPROVER: dual buttons on pending finalized cell — only when it's this user's turn */}
          {role === "approver" && canApprove && p.state === "pending" && p.awaiting_me && finVendor && (
            <div className={styles.cellDecisionActions}>
              <button
                className={`${styles.cellDecBtn} ${styles.approve} ${approveSel[p.id] ? styles.active : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setApprove(p);
                }}
              >
                <Check size={11} />
                <span>{approveSel[p.id] ? "Approving" : "Approve"}</span>
              </button>
              <button
                className={`${styles.cellDecBtn} ${styles.reject} ${rejectSel[p.id] ? styles.active : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setReject(p);
                }}
              >
                <X size={11} />
                <span>{rejectSel[p.id] ? "Rejecting" : "Reject"}</span>
              </button>
            </div>
          )}
        </div>
      </td>
    );
  };

  /* ─────────────── breakdown row ─────────────── */
  // Build the breakdown field list per product. Static cost lines plus one
  // dynamic row for each distinct other-/global-charge label across vendors.
  const breakdownFieldsFor = (p) => {
    const fields = [
      { k: "Base price", f: "base" },
      { k: "Sub-total", f: "subtotal" },
      { k: "Freight", f: "freight" },
      { k: "Packaging", f: "packaging" },
      { k: "GST", f: "tax" },
    ];
    // Freight & packaging already have dedicated static rows above; the backend
    // ALSO echoes them inside other_charges, so skip those labels here to avoid
    // rendering each charge twice. Any other (custom) line charge still shows.
    C.chargeLabels(p, sortedVendors, "other_charges")
      .filter((label) => {
        const l = String(label || "").toLowerCase().trim();
        return l !== "freight" && l !== "packaging";
      })
      .forEach((label) => fields.push({ k: label, f: "other", label }));
    C.chargeLabels(p, sortedVendors, "global_charges").forEach((label) =>
      fields.push({ k: label, f: "global", label, global: true })
    );
    fields.push(
      { k: "Delivery", f: "delivery" },
      { k: "Payment terms", f: "pay" },
      { k: "Comment", f: "comment" },
      { k: "Documents", f: "docs" }
    );
    return fields;
  };

  const renderBreakdown = (p) => {
    const fields = breakdownFieldsFor(p);
    return fields.map((field, fi) => (
      <tr
        className={`${styles.bdRow} ${fi === fields.length - 1 ? styles.bdLast : ""}`}
        key={`bd-${p.id}-${field.f}-${field.label || fi}`}
      >
        <td className={`${styles.colItem} ${styles.bdLabel}`}>
          {field.k}
          {field.global && <span className={styles.bdGlobalTag}>global</span>}
        </td>
        {sortedVendors.map((v) => {
          const q = p.quotes?.[v.id];
          const l1 = isL1(p, v.id);
          if (!q)
            return (
              <td className={`${styles.bdCell} ${styles.muted} ${l1 ? styles.isL1col : ""}`} key={v.id}>
                <span className={styles.bdDash}>—</span>
              </td>
            );
          let content = null;
          if (field.f === "base")
            content = (
              <span>
                <span className={styles.mono}>₹{fmt(q.base)}</span>
                <span className={styles.bdUnit}> /{p.unit}</span>
              </span>
            );
          else if (field.f === "subtotal")
            content = <span className={styles.mono}>₹{fmt(C.cellSubtotal(p, v.id))}</span>;
          else if (field.f === "freight")
            content =
              Number(q.freight) === 0 ? (
                <span>
                  <span className={`${styles.mono} ${styles.bdWarn}`}>₹0</span>
                  <span className={styles.bdWarn} style={{ marginLeft: 5 }}>⚠ missing</span>
                </span>
              ) : (
                <span className={styles.mono}>₹{fmt(q.freight)}</span>
              );
          else if (field.f === "packaging")
            content = <span className={styles.mono}>₹{fmt(q.packaging)}</span>;
          else if (field.f === "tax")
            content = (
              <span>
                <span className={styles.mono}>{q.tax_pct}%</span>
                <span className={styles.bdUnit}> · ₹{fmt(C.cellTaxAmt(p, v.id))}</span>
              </span>
            );
          else if (field.f === "other" || field.f === "global") {
            const amt = C.chargeAmount(
              p,
              v.id,
              field.f === "global" ? "global_charges" : "other_charges",
              field.label
            );
            content =
              amt == null ? (
                <span className={styles.bdDash}>—</span>
              ) : (
                <span className={styles.mono}>₹{fmt(amt)}</span>
              );
          } else if (field.f === "delivery")
            content =
              q.delivery != null ? <span>{q.delivery} days</span> : <span className={styles.bdDash}>—</span>;
          else if (field.f === "pay")
            content = q.pay ? <span>{q.pay}</span> : <span className={styles.bdDash}>—</span>;
          else if (field.f === "comment")
            content = q.comment ? <span>{q.comment}</span> : <span className={styles.bdDash}>—</span>;
          else if (field.f === "docs")
            content = q.docs ? (
              <a href="#" className={styles.bdLink} onClick={(e) => e.preventDefault()}>
                {q.docs} file{q.docs > 1 ? "s" : ""}
              </a>
            ) : (
              <span className={styles.bdDash}>—</span>
            );
          return (
            <td className={`${styles.bdCell} ${l1 ? styles.isL1col : ""}`} key={v.id}>
              {content}
            </td>
          );
        })}
      </tr>
    ));
  };

  /* ─────────────── product row ─────────────── */
  const renderProductRow = (p) => {
    const rowCls = [];
    if (p.state === "approved") rowCls.push(styles.rowApproved);
    if (p.state === "pending") rowCls.push(styles.rowPending);
    if (p.state === "rejected") rowCls.push(styles.rowRejected);
    const catName = categories.find((c) => String(c.id) === String(p.category))?.name;
    return (
      <React.Fragment key={`prow-${p.id}`}>
        <tr className={rowCls.join(" ")}>
          <td className={styles.colItem}>
            <div className={styles.itemCell}>
              {!quotesLocked && (
                <button
                  className={`${styles.expandBtn} ${expanded[p.id] ? styles.isOpen : ""}`}
                  onClick={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}
                  aria-label="Expand breakdown"
                >
                  <ChevronRight size={14} />
                </button>
              )}
              <div className={styles.itemMeta}>
                <div className={styles.itemName}>{p.name}</div>
                <div className={styles.itemTags}>
                  {catName && <span className={styles.catTag}>{catName}</span>}
                  <span className={styles.per}>per {p.unit}</span>
                </div>
                {quotesLocked && p.quoted_count > 0 && (
                  <div className={styles.quotedCount}>
                    <Users size={11} /> {p.quoted_count} {p.quoted_count === 1 ? "quote" : "quotes"} received
                  </div>
                )}
                {C.lprTotalFor(p) != null && (
                  <div className={styles.lpr}>
                    <TrendingDown size={11} /> LPR{" "}
                    <span className={styles.lprVal}>₹{fmt(C.lprTotalFor(p))}</span>
                    {p.lpr?.date && <span style={{ color: "var(--fg-4)" }}>({fmtDate(p.lpr.date)})</span>}
                  </div>
                )}
                {p.round?.n != null && (
                  <div className={styles.roundInfo}>
                    <span className={styles.rBadge}>Round {p.round.n}</span>
                    {p.round.when && <span>Ended {fmtDateTime(p.round.when)}</span>}
                  </div>
                )}
                {/* Per-product entry into the negotiation wizard — preselects
                    this product. Shown for negotiable (quoted, unlocked) items. */}
                {!quotesLocked && sortedVendors.some((v) => p.quotes?.[v.id]) && (
                  <button
                    type="button"
                    className={styles.rowNegotiateBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (rfq) router.push(`/dashboard/buyer/negotiation/${rfq}/create?preSelectProductId=${p.id}`);
                    }}
                  >
                    <GitBranch size={11} strokeWidth={2.4} />
                    Create Negotiation
                  </button>
                )}
                {p.state !== "open" && (
                  <button
                    className={`${styles.itemState} ${styles[p.state]} ${styles.clickableTag} ${
                      p.state === "rejected" && p.reject_info ? styles.hasTip : ""
                    }`}
                    title={p.state === "pending" ? awaitingApprovalNames(p) || undefined : undefined}
                    onMouseEnter={(e) => p.state === "rejected" && p.reject_info && showTip(e, p)}
                    onMouseLeave={hideTip}
                    onClick={(e) => {
                      e.stopPropagation();
                      openApprovalPanel(p);
                    }}
                  >
                    {p.state === "approved" && <span>✓ Approved</span>}
                    {p.state === "pending" && <span>⏳ {awaitingApprovalLabel(p)}</span>}
                    {p.state === "rejected" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        ✕ Rejected — action needed
                        <Info size={11} style={{ opacity: 0.7 }} />
                      </span>
                    )}
                    <ChevronRight size={11} style={{ opacity: 0.7 }} />
                  </button>
                )}
              </div>
              <div className={styles.qtyBlock}>
                <div className={styles.q}>{p.qty}</div>
                <div className={styles.u}>{p.unit}</div>
              </div>
            </div>
          </td>
          {sortedVendors.map((v) => renderCell(p, v))}
        </tr>
        {expanded[p.id] && !quotesLocked && renderBreakdown(p)}
      </React.Fragment>
    );
  };

  /* ─────────────── matrix ─────────────── */
  const renderMatrix = () => (
    <div className={styles.matrixWrap}>
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.colItem}>
                <div className={styles.matrixItemHead}>
                  <span className={styles.lbl}>Item</span>
                  <span className={styles.qtyLbl}>Qty</span>
                </div>
              </th>
              {sortedVendors.map((v) => {
                if (quotesLocked) {
                  return (
                    <th className={styles.vendorHead} key={v.id}>
                      <div className={styles.vhRow}>
                        <span className={`${styles.vAv} ${styles.vAvLocked}`}>
                          <Lock size={12} />
                        </span>
                        <div className={styles.vhMain}>
                          <div className={styles.vhNameRow}>
                            <span className={`${styles.vName} ${styles.lockedBlur}`}>Vendor hidden</span>
                          </div>
                          <div className={`${styles.vTotal} ${styles.lockedBlur}`}>₹•,••,•••</div>
                        </div>
                      </div>
                    </th>
                  );
                }
                const rk = vendorRank(v.id);
                const full = isFull(v.id);
                return (
                  <th className={styles.vendorHead} key={v.id}>
                    <div className={styles.vhRow}>
                      <span className={`${styles.vAv} ${avatarOf(v.id)}`}>{v.short}</span>
                      <div className={styles.vhMain}>
                        <div className={styles.vhNameRow}>
                          <span
                            className={styles.vName}
                            title={v.name && v.name.length > 20 ? v.name : undefined}
                          >
                            {v.name}
                          </span>
                          {full && rk && (
                            <span
                              className={`${styles.vRank} ${
                                rk === 1 ? styles.l1 : rk === 2 ? styles.l2 : styles.l3
                              }`}
                            >
                              L{rk}
                            </span>
                          )}
                          {!full && (
                            <span className={`${styles.vRank} ${styles.partial}`}>
                              {coverage(v.id)}/{products.length}
                            </span>
                          )}
                        </div>
                        {full ? (
                          <div className={styles.vTotal}>₹{fmt(vendorTotal(v.id))}</div>
                        ) : (
                          <div className={styles.vPartial}>
                            Partial — {coverage(v.id)} of {products.length} items quoted
                          </div>
                        )}
                        <div className={styles.vMeta}>
                          {v.tech_score != null && (
                            <span className={`${styles.vmItem} ${styles.tech}`} title="Technical evaluation score">
                              <Check size={11} />
                              <span>Tech {v.tech_score}</span>
                            </span>
                          )}
                          {v.track_record != null && (
                            <>
                              <span className={styles.vmDot} />
                              <span className={`${styles.vmItem} ${styles.track}`} title="Vendor track-record score">
                                <Star size={11} />
                                <span>{v.track_record} track</span>
                              </span>
                            </>
                          )}
                          {v.orders_done != null && (
                            <>
                              <span className={styles.vmDot} />
                              <span className={`${styles.vmItem} ${styles.orders}`} title="Completed orders">
                                {v.orders_done} orders
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              if (row.type === "cat-header")
                return (
                  <tr className={styles.catHeaderRow} key={row.key} onClick={() => toggleCat(row.cat.id)}>
                    <td className={styles.colItem}>
                      <div className={styles.catHeader}>
                        <span className={`${styles.catChevron} ${row.collapsed ? styles.collapsed : ""}`}>
                          <ChevronDown size={13} />
                        </span>
                        <div className={styles.cIc}>
                          <LayoutGrid size={12} />
                        </div>
                        <span className={styles.cName}>{row.cat.name}</span>
                        <span className={styles.cCount}>{row.count} items</span>
                        {row.collapsed && <span className={styles.cCollapsedHint}>subtotals shown →</span>}
                      </div>
                    </td>
                    {sortedVendors.map((v) => {
                      const st = row.collapsed ? catVendorSubtotal(row.cat.id, v.id) : 0;
                      return (
                        <td className={styles.catHeadCell} key={v.id}>
                          {row.collapsed && (
                            <span className={styles.catHeadSub}>{st ? "₹" + fmt(st) : "—"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              if (row.type === "cat-subtotal")
                return (
                  <tr key={row.key}>
                    <td className={`${styles.catSubtotal} ${styles.catSubtotalLabel}`}>
                      <span>{row.cat.name} subtotal</span>
                    </td>
                    {sortedVendors.map((v) => {
                      const st = catVendorSubtotal(row.cat.id, v.id);
                      return (
                        <td className={styles.catSubtotal} key={v.id}>
                          {st ? "₹" + fmt(st) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              return renderProductRow(row.product);
            })}
          </tbody>
          <tfoot>
            {/* Transparency: how the vendor total is built —
                Σ per-item line totals + quote-level global charges (once). */}
            <tr>
              <td className={styles.colItem}>Line items subtotal</td>
              {sortedVendors.map((v) => {
                if (quotesLocked)
                  return (
                    <td key={v.id}>
                      <div className={`${styles.tSub} ${styles.lockedBlur}`}>₹•,••,•••</div>
                    </td>
                  );
                if (!isFull(v.id))
                  return (
                    <td key={v.id}>
                      <div className={styles.tSub}>—</div>
                    </td>
                  );
                const bd = C.vendorTotalBreakdown(v.id, products);
                return (
                  <td key={v.id}>
                    <div className={styles.tSub}>₹{fmt(bd.lines)}</div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={styles.colItem}>
                Global charges <span className={styles.bdGlobalTag}>applied once</span>
              </td>
              {sortedVendors.map((v) => {
                if (quotesLocked)
                  return (
                    <td key={v.id}>
                      <div className={`${styles.tSub} ${styles.lockedBlur}`}>₹•,•••</div>
                    </td>
                  );
                if (!isFull(v.id))
                  return (
                    <td key={v.id}>
                      <div className={styles.tSub}>—</div>
                    </td>
                  );
                const bd = C.vendorTotalBreakdown(v.id, products);
                return (
                  <td key={v.id}>
                    <div className={styles.tSub}>{bd.globals ? "+ ₹" + fmt(bd.globals) : "—"}</div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={styles.colItem}>Vendor total</td>
              {sortedVendors.map((v) => {
                if (quotesLocked) {
                  return (
                    <td key={v.id}>
                      <div className={`${styles.tVal} ${styles.lockedBlur}`}>₹•,••,•••</div>
                    </td>
                  );
                }
                const rk = vendorRank(v.id);
                const full = isFull(v.id);
                const vt = vendorTotal(v.id);
                return (
                  <td key={v.id}>
                    {full ? (
                      <>
                        <div className={styles.tVal}>{vt ? "₹" + fmt(vt) : "—"}</div>
                        {rk && <div className={styles.tSub}>Rank L{rk}</div>}
                      </>
                    ) : (
                      <div className={styles.tSub} style={{ color: "var(--warn)", marginTop: 0 }}>
                        Partial · {coverage(v.id)}/{products.length} items
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
            <tr className={styles.lowestRow}>
              <td className={styles.colItem}>Lowest achievable (L1 mix)</td>
              <td colSpan={vendors.length}>
                {quotesLocked ? (
                  <>
                    <div className={`${styles.tVal} ${styles.lockedBlur}`}>₹••,••,•••</div>
                    <div className={styles.tSub}>Available after the submission deadline</div>
                  </>
                ) : (
                  <>
                    <div className={styles.tVal}>₹{fmt(l1GrandTotal)}</div>
                    <div className={styles.tSub}>Best price per product across all vendors</div>
                  </>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  /* ─────────────── overall cost view ─────────────── */
  const renderOverall = () => {
    if (quotesLocked) {
      return (
        <div className={styles.matrixWrap}>
          <div className={styles.lockedOverall}>
            <Lock size={20} />
            <span>Overall vendor ranking unlocks after the submission deadline.</span>
          </div>
        </div>
      );
    }
    return (
    <div className={styles.matrixWrap}>
      <table className={styles.overallTable}>
        <thead>
          <tr>
            <th className={styles.rankCol} style={{ width: 50 }}>
              Sr
            </th>
            <th>Product</th>
            {[1, 2, 3].map((r) => (
              <th className={styles.rankCol} key={r}>
                <div className={styles.rankBadgeHead}>
                  <span className={`${styles.rl} ${r === 1 ? styles.l1 : ""}`}>L{r}</span>
                  <span>Ranked vendor</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => {
            const catName = categories.find((c) => String(c.id) === String(p.category))?.name;
            return (
              <tr key={p.id}>
                <td className={styles.sr}>{idx + 1}</td>
                <td className={styles.oProduct}>
                  <div className={styles.pName}>{p.name}</div>
                  <div className={styles.pMeta}>
                    <span>Qty {p.qty} {p.unit}</span>
                    {catName && <span>{catName}</span>}
                    {C.lprTotalFor(p) != null && (
                      <span className={styles.lprMeta}>LPR ₹{fmt(C.lprTotalFor(p))}</span>
                    )}
                  </div>
                </td>
                {[1, 2, 3].map((rank) => {
                  const rv = C.rankVendor(p, vendors, rank);
                  return (
                    <td className={`${styles.rankedCell} ${rank === 1 ? styles.isL1 : ""}`} key={rank}>
                      {rv ? (
                        <div>
                          <div className={styles.amt}>₹{fmt(C.cellLineTotal(p, rv.vendor.id))}</div>
                          <div className={styles.vn}>{rv.vendor.name}</div>
                        </div>
                      ) : (
                        <span style={{ color: "var(--fg-4)" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>
              <span className={styles.lbl}>Total by rank</span>
            </td>
            <td className={`${styles.amt} ${styles.amtL1}`}>₹{fmt(C.rankLineTotal(vendors, products, 1))}</td>
            <td className={styles.amt}>₹{fmt(C.rankLineTotal(vendors, products, 2))}</td>
            <td className={styles.amt}>
              {C.rankLineTotal(vendors, products, 3) ? "₹" + fmt(C.rankLineTotal(vendors, products, 3)) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className={styles.overallFootnote}>
        Each rank column picks the Nth-cheapest vendor <em>per product</em>. The{" "}
        <strong>L1 total</strong> is the best achievable spend if every product is awarded to its lowest
        bidder (split PO).
      </div>
    </div>
    );
  };

  /* ─────────────── skeleton (mirrors the real workspace layout) ─────────────── */
  const Bar = ({ w, h, r = "7px", mt }) => (
    <span className={styles.skel} style={{ display: "block", width: w, height: h, borderRadius: r, marginTop: mt }} />
  );
  const renderSkeleton = () => (
    <div className={styles.pageBody}>
      {/* RFQ band */}
      <div className={styles.skelBandBox}>
        <Bar w="150px" h="11px" />
        <Bar w="42%" h="24px" mt={12} />
        <Bar w="68%" h="13px" mt={10} />
        <div className={styles.skelDetailGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Bar w="62%" h="9px" />
              <Bar w="88%" h="13px" mt={6} />
            </div>
          ))}
        </div>
      </div>

      {/* Metrics strip */}
      <div className={styles.skelStrip}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div className={styles.skelMetric} key={i}>
            <Bar w="60%" h="9px" />
            <Bar w="78%" h="20px" mt={11} />
            <Bar w="70%" h="9px" mt={9} />
          </div>
        ))}
      </div>

      {/* Approval progress */}
      <div className={styles.skelBandBox} style={{ padding: "16px 18px" }}>
        <Bar w="34%" h="14px" />
        <Bar w="100%" h="10px" r="99px" mt={12} />
        <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} w="90px" h="10px" />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.skelToolbar}>
        <Bar w="300px" h="36px" r="9px" />
        <Bar w="240px" h="36px" r="9px" />
      </div>

      {/* Matrix */}
      <div className={styles.skelMatrix}>
        <div className={styles.skelMatrixRow}>
          <div className={styles.skelItemCell}>
            <Bar w="45%" h="11px" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div className={styles.skelVendorHead} key={i}>
              <Bar w="30px" h="30px" r="50%" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Bar w="72%" h="12px" />
                <Bar w="48%" h="14px" mt={6} />
              </div>
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, r) => (
          <div className={styles.skelMatrixRow} key={r}>
            <div className={styles.skelItemCell}>
              <Bar w="72%" h="13px" />
              <Bar w="44%" h="10px" mt={7} />
              <Bar w="56%" h="10px" mt={5} />
            </div>
            {Array.from({ length: 4 }).map((_, c) => (
              <div className={styles.skelPriceCell} key={c}>
                <Bar w="58%" h="15px" />
                <Bar w="80%" h="10px" mt={6} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  /* ─────────────── workspace ─────────────── */
  const renderWorkspace = () => {
    if (!view) return null;
    return (
      <div className={styles.pageBody}>
        {/* RFQ BAND */}
        <section className={styles.rfqBand}>
          <div className={styles.rfqTop}>
            <div style={{ minWidth: 0 }}>
              <div className={styles.rfqId}>Commercial evaluation</div>
              {/* Embedded under the lifecycle page: the RFQ identity + metadata
                  already live in the page header, so show only a slim banner. */}
              {!isEmbedded && (
                <h1>
                  <span className={styles.rfqNum}>RFQ #{rfqInfo.number}</span>
                  {rfqInfo.status && <span className={styles.statusChip}>{rfqInfo.status}</span>}
                  <button className={styles.rfqSwitchBtn} onClick={() => setShowSwitchRfq(true)}>
                    <Repeat size={13} /> Switch RFQ <ChevronDown size={12} />
                  </button>
                </h1>
              )}
              <div className={styles.rfqSub}>
                {!isEmbedded && (
                  <>
                    {rfqInfo.title && <span>{rfqInfo.title}</span>}
                    <span className={styles.sep}>·</span>
                    <span className={styles.em}>{rfqInfo.company}</span>
                    <span>· {rfqInfo.hotel} · {rfqInfo.department}</span>
                  </>
                )}
                <span className={styles.quoteCoverage}>
                  <Users size={12} />
                  <span>
                    {rfqInfo.quotes_received} of {rfqInfo.quotes_invited} quotes received
                  </span>
                </span>
                {isEmbedded && (
                  <span>· {(rfqInfo.rounds?.ended ?? 0)} rounds ended · {(rfqInfo.rounds?.active ?? 0)} active</span>
                )}
              </div>
            </div>
            <div className={styles.rfqBandActions}>
              {/* Visible only to users with a pending approval on an
                  unexpired negotiation round. */}
              {pendingApprovalRounds.length > 0 && (
                <button
                  type="button"
                  className={styles.approvalRequiredBtn}
                  onClick={() => router.push(`/dashboard/buyer/negotiation/${rfq}/approve`)}
                >
                  <ShieldAlert size={14} strokeWidth={2.5} />
                  Approval Required{pendingApprovalRounds.length > 1 ? ` (${pendingApprovalRounds.length})` : ''}
                </button>
              )}
              {/* Entry point to the negotiation round wizard */}
              <button
                type="button"
                className={styles.createNegotiationBtn}
                onClick={() => router.push(`/dashboard/buyer/negotiation/${rfq}/create?level=rfq`)}
                disabled={!rfq}
              >
                <Plus size={14} strokeWidth={2.5} />
                Create Negotiation
              </button>
            </div>
          </div>
          {!isEmbedded && (
          <div className={styles.rfqDetailGrid}>
            <div className={styles.cell}>
              <div className={styles.k}>Contact person</div>
              <div className={styles.v}>{rfqInfo.contact || "—"}</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Submission deadline</div>
              <div className={`${styles.v} ${styles.mono}`}>{fmtDateTime(rfqInfo.deadline)}</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Reverse auction</div>
              <div className={styles.v}>{rfqInfo.reverse_auction ? "Enabled" : "Disabled"}</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Negotiation rounds</div>
              <div className={styles.v}>
                {(rfqInfo.rounds?.ended ?? 0)} ended · {(rfqInfo.rounds?.active ?? 0)} active
              </div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Response email</div>
              <div className={`${styles.v} ${styles.mono}`} style={{ fontSize: "11.5px" }}>
                {rfqInfo.email || "—"}
              </div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Delivery location</div>
              <div className={styles.v}>{rfqInfo.delivery_location || "—"}</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Contact number</div>
              <div className={styles.v}>{rfqInfo.phone || "—"}</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.k}>Technical clauses</div>
              <div className={styles.v}>{rfqInfo.tech_clauses ? "Configured" : "None configured"}</div>
            </div>
          </div>
          )}
        </section>

        {quotesLocked && (
          <div className={styles.lockBanner}>
            <div className={styles.lockBannerIc}>
              <Lock size={18} />
            </div>
            <div className={styles.lockBannerBody}>
              <strong>Quotes are sealed until the submission deadline.</strong>
              <span>
                Vendors have submitted — but their prices, totals and identities stay hidden until{" "}
                <b>{bidEndDate ? fmtDateTime(bidEndDate) : "the deadline"}</b>. You can see how many
                quotes each item received below; the full comparison unlocks automatically once the
                window closes.
              </span>
            </div>
          </div>
        )}

        {/* No tech clauses banner */}
        {!rfqInfo.tech_clauses && (
          <div className={styles.infoBanner}>
            <div className={styles.ic}>
              <Info size={13} />
            </div>
            <div>
              <strong>No technical clauses configured.</strong> Quote comparison is purely commercial —
              vendors are ranked on landed cost only.
            </div>
          </div>
        )}

        {/* METRICS */}
        {!quotesLocked && (
        <section className={styles.metricsStrip}>
          <div className={styles.metricCard}>
            <div className={styles.mLabel}>L1 Total</div>
            <div className={styles.mValue}>
              <span className={styles.cur}>₹</span>
              <span>{fmt(l1GrandTotal)}</span>
            </div>
            <div className={styles.mSub}>Lowest quote per product</div>
          </div>
          <div className={`${styles.metricCard} ${styles.isFinalized}`}>
            <div className={styles.mLabel}>Finalized total</div>
            <div className={styles.mValue}>
              <span className={styles.cur}>₹</span>
              <span>{fmt(finalizedTotal)}</span>
            </div>
            <div className={styles.mSub}>
              {counts.approved + counts.pending} of {counts.total} products
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.mLabel}>Baseline</div>
            <div className={styles.mValue}>
              <span className={styles.cur}>₹</span>
              <span>{fmt(baseline)}</span>
            </div>
            <div className={styles.mSub}>Last purchase reference</div>
          </div>
          <div className={`${styles.metricCard} ${styles.isSavings}`}>
            <div className={styles.mLabel}>Potential savings</div>
            <div className={styles.mValue}>
              <span className={styles.cur}>₹</span>
              <span>{fmt(savings)}</span>
            </div>
            <div className={styles.mSub}>
              vs baseline · {baseline ? ((savings / baseline) * 100).toFixed(1) : "0.0"}% lower
            </div>
          </div>
          <div className={`${styles.metricCard} ${styles.isRisk}`}>
            <div className={styles.mLabel}>Risk flags</div>
            <div className={styles.mValue}>
              <span>{riskFlags}</span>
            </div>
            <div className={styles.mSub}>Incomplete / missing costs</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.mLabel}>Coverage</div>
            <div className={styles.mValue}>
              <span>{coverageCount}</span>
              <span style={{ fontSize: 13, color: "var(--fg-4)", fontWeight: 500, marginLeft: 4 }}>
                vendors
              </span>
            </div>
            <div className={styles.mSub}>{products.length} products quoted</div>
          </div>
        </section>
        )}

        {/* APPROVAL PROGRESS */}
        <section className={styles.approvalCard}>
          <div className={styles.approvalHead}>
            <div>
              <div className={styles.title}>Finalization &amp; approval progress</div>
              <div className={styles.sub}>
                {counts.approved} of {counts.total} approved · {counts.pending} awaiting approval ·{" "}
                {counts.rejected} need attention
              </div>
            </div>
            <div className={styles.pct}>{approvalPct}%</div>
          </div>
          <div className={styles.approvalBar}>
            <div className={styles.segApproved} style={{ width: pct(counts.approved, counts.total) }} />
            <div className={styles.segPending} style={{ width: pct(counts.pending, counts.total) }} />
            <div className={styles.segRejected} style={{ width: pct(counts.rejected, counts.total) }} />
            <div className={styles.segNone} style={{ width: pct(counts.open, counts.total) }} />
          </div>
          <div className={styles.approvalLegend}>
            <div className={styles.item}>
              <span className={`${styles.dot} ${styles.approved}`} /> Approved
            </div>
            <div className={styles.item}>
              <span className={`${styles.dot} ${styles.pending}`} /> Finalized · awaiting approval
            </div>
            <div className={styles.item}>
              <span className={`${styles.dot} ${styles.rejected}`} /> Rejected · needs action
            </div>
            <div className={styles.item}>
              <span className={`${styles.dot} ${styles.none}`} /> Not finalized
            </div>
          </div>
          <div className={styles.approvalCounts}>
            <div className={styles.countCard}>
              <div className={styles.n}>{counts.total}</div>
              <div className={styles.l}>Total products</div>
            </div>
            <div className={`${styles.countCard} ${styles.approved}`}>
              <div className={styles.n}>{counts.approved}</div>
              <div className={styles.l}>Approved</div>
            </div>
            <div className={`${styles.countCard} ${styles.pending}`}>
              <div className={styles.n}>{counts.pending}</div>
              <div className={styles.l}>Pending approval</div>
            </div>
            <div className={`${styles.countCard} ${styles.rejected}`}>
              <div className={styles.n}>{counts.rejected}</div>
              <div className={styles.l}>Rejected</div>
            </div>
            <div className={styles.countCard}>
              <div className={styles.n}>{counts.open}</div>
              <div className={styles.l}>Not finalized</div>
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <div className={styles.compareToolbar}>
          <div className={styles.viewTabs}>
            <button
              className={activeView === "product" ? styles.isActive : ""}
              onClick={() => setActiveViewSynced("product")}
            >
              <ListChecks size={14} /> Product-wise
            </button>
            <button
              className={activeView === "category" ? styles.isActive : ""}
              onClick={() => setActiveViewSynced("category")}
            >
              <LayoutGrid size={14} /> Category-wise
            </button>
            <button
              className={activeView === "overall" ? styles.isActive : ""}
              onClick={() => setActiveViewSynced("overall")}
            >
              <BarChart3 size={14} /> Overall cost
            </button>
          </div>
          <div className={styles.toolbarRight}>
            {activeView !== "overall" && (
              <div className={styles.sortControl}>
                <button
                  ref={sortBtnRef}
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={() => {
                    setSortOpen((o) => {
                      if (!o && sortBtnRef.current) {
                        const r = sortBtnRef.current.getBoundingClientRect();
                        const width = 200;
                        setSortPos({
                          x: Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12)),
                          y: r.bottom + 6,
                        });
                      }
                      return !o;
                    });
                  }}
                >
                  <ArrowUpDown size={13} /> Sort:{" "}
                  <span className={styles.sortBtnVal}>{sortLabel}</span>
                  <ChevronDown size={12} />
                </button>
              </div>
            )}
            <div
              className={`${styles.toggle} ${freightOn ? styles.isOn : ""}`}
              onClick={() => setFreightOn((f) => !f)}
            >
              <span className={styles.track} />
              <span>{freightOn ? "Landed cost (with freight)" : "Base cost (no freight)"}</span>
            </div>
          </div>
        </div>

        {/* mode hint */}
        {role === "buyer" && !quotesLocked && (
          <div className={`${styles.infoBanner} ${styles.violet}`}>
            <div className={styles.ic}>
              <Sparkles size={13} />
            </div>
            <div>
              Select an L1 (or any) vendor per product, then finalize one or many at once. Each finalized
              product moves independently into the approval flow.
            </div>
            <div className={styles.right}>
              <span className={`${styles.pill} ${styles.outline}`}>
                {counts.pending + counts.approved} of {counts.total} finalized
              </span>
            </div>
          </div>
        )}
        {role === "approver" && (
          <div className={`${styles.infoBanner} ${styles.warn}`}>
            <div className={styles.ic}>
              <Check size={13} />
            </div>
            <div>
              <strong>Approval mode.</strong> Finalized cells (amber) are awaiting your decision. Select
              one or many and approve / reject together.
            </div>
            <div className={styles.right}>
              <span className={`${styles.pill} ${styles.warn}`}>
                {pendingProducts.length} awaiting you
              </span>
            </div>
          </div>
        )}

        {activeView !== "overall" ? renderMatrix() : renderOverall()}

        {/* Action dock — last child of the page content so its sticky position
            is bounded to the content column (never overlaps the sidebar). */}
        {renderDock()}
      </div>
    );
  };

  /* ─────────────── action dock ─────────────── */
  const renderDock = () => {
    if (!view) return null;
    if (quotesLocked) return null;
    const buyerActive = role === "buyer" && canWrite;
    const approverActive = role === "approver" && canApprove;
    if (!buyerActive && !approverActive) return null;
    return (
      <footer className={styles.actionDock}>
        <div className={styles.dockInner}>
          <div className={styles.dockLeft}>
            {role === "buyer" && selCount > 0 && (
              <>
                <div className={styles.selCount}>
                  <span className={styles.check}>
                    <Check size={12} />
                  </span>
                  <span>
                    {selCount} of {openCount} products selected
                  </span>
                </div>
                {isSplitPO && (
                  <span className={styles.splitPill}>
                    <GitBranch size={11} /> Split PO · {selVendorCount} vendors
                  </span>
                )}
                <span className={styles.clearLink} onClick={clearSel}>
                  Clear
                </span>
              </>
            )}
            {role === "buyer" && selCount === 0 && suggestedL1Vendor && (
              <div className={styles.suggest}>
                <span className={styles.ic}>
                  <Award size={14} />
                </span>
                <span>
                  Suggested L1 — <span className={styles.em}>{suggestedL1Vendor.name}</span>{" "}
                  <span style={{ color: "var(--fg-4)" }}>
                    (₹{fmtLakh(vendorTotal(suggestedL1Vendor.id))})
                  </span>
                </span>
              </div>
            )}
            {role === "approver" && decisionCount > 0 && (
              <>
                <div className={styles.dockDecisions}>
                  {approveCount > 0 && (
                    <span className={`${styles.decChip} ${styles.approve}`}>
                      <Check size={11} /> {approveCount} to approve
                    </span>
                  )}
                  {rejectCount > 0 && (
                    <span className={`${styles.decChip} ${styles.reject}`}>
                      <X size={11} /> {rejectCount} to reject
                    </span>
                  )}
                </div>
                <span className={styles.clearLink} onClick={clearDecisions}>
                  Clear
                </span>
              </>
            )}
            {role === "approver" && decisionCount === 0 && (
              <div className={styles.suggest}>
                <span className={styles.ic}>
                  <Clock size={14} />
                </span>
                <span>
                  <span className={styles.em}>{pendingProducts.length}</span> products awaiting your
                  decision — approve or reject each, then confirm together
                </span>
              </div>
            )}
          </div>

          <div className={styles.dockRight}>
            {role === "buyer" && (
              <>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={autoSelectL1}
                  disabled={openCount === 0}
                  title="Pick the cheapest vendor for each open product (split PO)"
                >
                  <Award size={13} /> Auto-pick L1 per item
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={() => giveAllTo(suggestedL1Vendor?.id)}
                  disabled={openCount === 0 || !suggestedL1Vendor}
                  title={
                    suggestedL1Vendor
                      ? `Award every open product to ${suggestedL1Vendor.name} (single-source)`
                      : "Award every open product to one vendor"
                  }
                >
                  Award all to {suggestedL1Vendor?.short || "L1"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`}
                  onClick={() => selCount && setShowFinalize(true)}
                  disabled={selCount === 0}
                >
                  <Award size={13} />{" "}
                  {selCount > 0 ? `Finalise ${selCount} · ₹${fmt(selTotal)}` : "Finalise selection"}
                </button>
              </>
            )}
            {role === "approver" && (
              <>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={approveAllPending}
                  disabled={pendingProducts.length === 0}
                >
                  <Check size={13} /> Approve all pending
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                  onClick={() => decisionCount && setShowConfirm(true)}
                  disabled={decisionCount === 0}
                >
                  <CheckSquare size={13} />{" "}
                  {decisionCount > 0 ? `Review & confirm · ${decisionCount}` : "Review & confirm"}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    );
  };

  /* ─────────────── modals ─────────────── */
  const renderFinalizeModal = () =>
    showFinalize && (
      <Portal>
      <div className={styles.overlayRoot} onClick={(e) => e.target === e.currentTarget && setShowFinalize(false)}>
        <div className={styles.modal}>
          <div className={styles.modalHead}>
            <div className={styles.modalHeadT}>
              <div className={styles.modalHeadIc}>
                <Award size={15} />
              </div>
              <div>
                <h3>Finalise vendor selection</h3>
                <div className={styles.sub}>
                  RFQ #{rfqInfo.number} · {rfqInfo.title}
                </div>
              </div>
            </div>
            <button className={styles.iconBtn} onClick={() => setShowFinalize(false)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.finalizeSummary}>
              <div className={styles.label}>Finalising</div>
              <div className={styles.type}>
                {selVendorCount > 1
                  ? `${selVendorCount} vendors · ${selVendorCount} purchase orders`
                  : "1 vendor · 1 purchase order"}
              </div>
              <div className={styles.amount}>₹{fmt(selTotal)}</div>
              <div className={styles.note}>
                {selVendorCount > 1
                  ? `${selCount} products across ${selVendorCount} vendors — one PO draft is created per vendor.`
                  : `${selCount} product${selCount > 1 ? "s" : ""} for one vendor — a single PO draft is created.`}
              </div>
            </div>
            <div className={styles.finalizeVendors}>
              {selVendorBreakdown.map(
                (vb) =>
                  vb.vendor && (
                    <div className={styles.finalizeVendorRow} key={vb.vendor.id}>
                      <span className={styles.vn}>
                        <span className={styles.av}>{vb.vendor.short}</span>
                        <span>{vb.vendor.name}</span>
                      </span>
                      <span className={styles.vamt}>₹{fmt(vb.total)}</span>
                    </div>
                  )
              )}
            </div>
            <div className={styles.finalizeCommentBlock}>
              <label className={styles.chainLabel} htmlFor="qc-finalize-comment">
                Comment <span className={styles.reqStar}>*</span>
              </label>
              <textarea
                id="qc-finalize-comment"
                className={styles.finalizeComment}
                placeholder="Reason for finalising this vendor (required — recorded on the PO and visible to approvers)…"
                value={finalizeComment}
                onChange={(e) => setFinalizeComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.chainLabel}>Approval chain preview</div>
            <div className={styles.approvalChain}>
              {approvalChain.map((step) => (
                <div className={`${styles.chainStep} ${step.you ? styles.isYou : ""}`} key={step.num}>
                  <span className={styles.num}>{step.num}</span>
                  <div className={styles.who}>
                    <div className={styles.nm}>
                      <span>{step.name}</span>
                      {step.you && <span className={styles.youTag}>You</span>}
                    </div>
                    <div className={styles.role}>{step.role}</div>
                  </div>
                  {step.num < approvalChain.length && (
                    <span className={styles.arrow}>
                      <ArrowRight size={14} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.modalFoot}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setShowFinalize(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={confirmFinalize}
              disabled={actionLoading || !finalizeComment.trim()}
            >
              <FileText size={14} /> {actionLoading ? "Finalising…" : "Confirm & create PO draft"}
            </button>
          </div>
        </div>
      </div>
      </Portal>
    );

  const renderConfirmModal = () =>
    showConfirm && (
      <Portal>
      <div className={styles.overlayRoot} onClick={(e) => e.target === e.currentTarget && setShowConfirm(false)}>
        <div className={styles.modal} style={{ maxWidth: 580 }}>
          <div className={styles.modalHead}>
            <div className={styles.modalHeadT}>
              <div className={`${styles.modalHeadIc} ${styles.modalHeadIcWarn}`}>
                <AlertTriangle size={15} />
              </div>
              <div>
                <h3>Confirm your decisions</h3>
                <div className={styles.sub}>Review each product × vendor before you commit.</div>
              </div>
            </div>
            <button className={styles.iconBtn} onClick={() => setShowConfirm(false)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.confirmSummaryRow}>
              <span className={`${styles.csChip} ${styles.approve}`}>
                <Check size={12} /> {approveCount} to approve
              </span>
              <span className={`${styles.csChip} ${styles.reject}`}>
                <X size={12} /> {rejectCount} to reject
              </span>
            </div>
            <div className={styles.decisionList}>
              {decisionList.map((d) => (
                <div className={`${styles.decisionItem} ${styles[d.decision]}`} key={d.product.id}>
                  <span className={`${styles.diIcon} ${styles[d.decision]}`}>
                    {d.decision === "approve" ? <Check size={12} /> : <X size={12} />}
                  </span>
                  <div className={styles.diMain}>
                    <div className={styles.diProduct}>{d.product.name}</div>
                    {d.vendor && (
                      <div className={styles.diVendor}>
                        <span className={styles.av}>{d.vendor.short}</span>
                        <span>{d.vendor.name}</span>
                      </div>
                    )}
                    {d.decision === "reject" && (
                      <textarea
                        className={styles.rejectReason}
                        placeholder="Reason for rejection (sent to evaluator)…"
                        value={rejectReasons[d.product.id] || ""}
                        onChange={(e) =>
                          setRejectReasons((prev) => ({ ...prev, [d.product.id]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                  <div className={styles.diRight}>
                    <div className={styles.diAmt}>₹{fmt(d.total)}</div>
                    <span className={`${styles.diDecision} ${styles[d.decision]}`}>
                      {d.decision === "approve" ? "Approve" : "Reject"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.irreversibleNote}>
              <AlertTriangle size={14} />
              <span>
                This action is <strong>irreversible</strong>. Approved products move to PO drafting;
                rejected products return to the evaluator for re-selection.
              </span>
            </div>
          </div>
          <div className={styles.modalFoot}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setShowConfirm(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={confirmDecisions}
              disabled={actionLoading}
            >
              <Check size={14} /> {actionLoading ? "Submitting…" : `Confirm ${decisionCount} decision${decisionCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
      </Portal>
    );

  /* ─────────────── per-cell kebab dropdown ─────────────── */
  const renderKebabMenu = () =>
    menu && (
      <Portal>
        <div className={styles.menuBackdrop} onClick={closeMenu} />
        <div className={styles.kebabMenu} style={{ left: menu.x, top: menu.y }}>
          <button onClick={openHistoryFromMenu}>
            <History size={14} /> Quote history
          </button>
          <button onClick={viewProfileFromMenu}>
            <User size={14} /> View profile
          </button>
        </div>
      </Portal>
    );

  /* ─────────────── approval audit-trail drawer (right side) ─────────────── */
  const renderApprovalDrawer = () => {
    if (!approvalPanel) return null;
    const p = approvalPanel;
    const trail = p.approval?.trail || [];
    // Progress counts the real approval nodes only (not the terminal "forwarded" node).
    const realNodes = trail.filter((n) => n.kind !== "terminal");
    const doneCount = realNodes.filter((n) => n.status === "done").length;
    const finVendorObj = vendorById(p.finalized_vendor);
    const statusLabel = {
      done: "DONE",
      rejected: "REJECTED",
      current: "AWAITING",
      pending: "PENDING",
    };
    const nodeStatusLabel = (node) =>
      node.kind === "terminal"
        ? node.status === "done"
          ? "COMPLETE"
          : "NEXT"
        : statusLabel[node.status];
    return (
      <Portal>
        <aside className={styles.apDrawer} role="dialog" aria-label="Approval audit trail">
          <div className={styles.apHead}>
            <div className={styles.apHeadT}>
              <div className={`${styles.modalHeadIc} ${styles.modalHeadIcInfo}`}>
                <GitBranch size={15} />
              </div>
              <div>
                <h3>Approval trail</h3>
                <div className={styles.sub}>
                  <strong style={{ color: "var(--fg)" }}>{p.name}</strong>
                  {finVendorObj && <> · awarded to {finVendorObj.name}</>}
                </div>
              </div>
            </div>
            <button className={styles.iconBtn} onClick={() => setApprovalPanel(null)} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className={styles.apBody}>
            <div className={styles.apProgress}>
              <span className={styles.apProgressLbl}>Audit trail</span>
              <span className={styles.apProgressVal}>
                {doneCount} of {realNodes.length} done
              </span>
            </div>

            {trail.length === 0 ? (
              <div className={styles.apEmpty}>No approval activity yet for this item.</div>
            ) : (
              <ol className={styles.apTrail}>
                {trail.map((node, i) => (
                  <li
                    className={`${styles.apNode} ${styles[`ap_${node.status}`]} ${
                      node.kind === "terminal" ? styles.apTerminal : ""
                    } ${i === trail.length - 1 ? styles.apLast : ""}`}
                    key={node.key || i}
                  >
                    <span className={styles.apDot}>
                      {node.kind === "terminal" ? (
                        node.status === "done" ? <Check size={13} /> : <ArrowRight size={13} />
                      ) : (
                        <>
                          {node.status === "done" && <Check size={13} />}
                          {node.status === "rejected" && <X size={13} />}
                          {node.status === "current" && <Clock size={13} />}
                          {node.status === "pending" && <span className={styles.apDotEmpty} />}
                        </>
                      )}
                    </span>
                    <div className={styles.apNodeBody}>
                      <div className={styles.apNodeTop}>
                        <span className={styles.apTitle}>{node.title}</span>
                        <span className={`${styles.apStatus} ${styles[`aps_${node.status}`]}`}>
                          {nodeStatusLabel(node)}
                        </span>
                      </div>
                      {node.by && (
                        <div className={styles.apWho}>
                          <span className={styles.apAvatar}>{node.initials || "?"}</span>
                          <span className={styles.apWhoName}>{node.by}</span>
                          {node.role && <span className={styles.apWhoRole}>· {node.role}</span>}
                        </div>
                      )}
                      {/* multi-approver step: list the rest */}
                      {Array.isArray(node.approvers) && node.approvers.length > 1 && (
                        <div className={styles.apApprovers}>
                          {node.approvers.map((a, ai) => (
                            <span className={styles.apApprover} key={ai} title={a.role || undefined}>
                              {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {node.when && <div className={styles.apWhen}>{fmtDateTime(node.when)}</div>}
                      {node.note && <div className={styles.apNote}>{node.note}</div>}
                      {node.status === "current" && (
                        <div className={styles.apCurrentNote}>Currently with this approver.</div>
                      )}
                      {node.reason && (
                        <div className={styles.apReason}>Reason: “{node.reason}”</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </Portal>
    );
  };

  /* ─────────────── sort dropdown (portaled above topbar) ─────────────── */
  const renderSortMenu = () =>
    sortOpen &&
    sortPos && (
      <Portal>
        <div className={styles.menuBackdrop} onClick={() => setSortOpen(false)} />
        <div className={styles.sortMenu} style={{ left: sortPos.x, top: sortPos.y }}>
          {[
            { k: "price", label: "Lowest price", Icon: TrendingDown },
            { k: "tech", label: "Technical marks", Icon: CheckSquare, disabled: !techConfigured },
            { k: "track", label: "Track record", Icon: Star },
          ].map(({ k, label, Icon, disabled }) => (
            <button
              key={k}
              className={`${vendorSort === k ? styles.active : ""} ${disabled ? styles.disabled : ""}`}
              disabled={disabled}
              title={disabled ? "No Technical Configuration" : undefined}
              onClick={() => {
                if (disabled) return;
                setVendorSort(k);
                setSortOpen(false);
              }}
            >
              <Icon size={13} />
              {label}
              {disabled && <span className={styles.sortNote}>No Technical Configuration</span>}
              {vendorSort === k && !disabled && <Check size={13} className={styles.tick} />}
            </button>
          ))}
        </div>
      </Portal>
    );

  /* ─────────────── quote history modal ─────────────── */
  const renderHistoryModal = () =>
    showHistory && (
      <Portal>
      <div
        className={styles.overlayRoot}
        onClick={(e) => e.target === e.currentTarget && setShowHistory(null)}
      >
        <div className={styles.modal} style={{ maxWidth: 560 }}>
          <div className={styles.modalHead}>
            <div className={styles.modalHeadT}>
              <div className={`${styles.modalHeadIc} ${styles.modalHeadIcInfo}`}>
                <History size={15} />
              </div>
              <div>
                <h3>Quote history — {showHistory.vendor?.name}</h3>
                <div className={styles.sub}>
                  Item: <strong style={{ color: "var(--fg)" }}>{showHistory.product?.name}</strong> ·{" "}
                  RFQ #{rfqInfo.number}
                </div>
              </div>
            </div>
            <button className={styles.iconBtn} onClick={() => setShowHistory(null)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.modalBody}>
            {historyRounds.length >= 1 ? (
              <div className={styles.qhList}>
                {historyRounds.map((r, ri) => (
                  <div
                    className={`${styles.qhRound} ${ri === historyRounds.length - 1 ? styles.isFinal : ""}`}
                    key={r.round}
                  >
                    <div className={styles.qhNode}>R{r.round}</div>
                    <div className={styles.qhCard}>
                      <div className={styles.qhTop}>
                        <span className={styles.qhPrice}>
                          ₹{fmt(r.price)} / {showHistory.product?.unit}
                        </span>
                        {r.delta != null && r.delta !== 0 && (
                          <span
                            className={`${styles.qhDelta} ${r.delta > 0 ? styles.qhDown : styles.qhUp}`}
                          >
                            {r.delta > 0 ? "↓" : "↑"} ₹{fmt(Math.abs(r.delta))}
                          </span>
                        )}
                      </div>
                      {r.date && <div className={styles.qhDate}>{fmtDateTime(r.date)}</div>}
                      {r.note && <div className={styles.qhNote}>{r.note}</div>}
                      {Array.isArray(r.changes) && r.changes.length > 0 && (
                        <div className={styles.qhChanges}>
                          <div className={styles.qhChangesLbl}>Changes vs original quote</div>
                          {r.changes.map((c, ci) => (
                            <div className={styles.qhChange} key={ci}>
                              <span className={styles.qhChangeLabel}>{c.label}</span>
                              <span className={styles.qhChangeVal}>
                                {c.added ? (
                                  <span className={changeToneClass(c)}>
                                    added {fmtChangeSide(c, "to")}
                                  </span>
                                ) : c.removed ? (
                                  <>
                                    <span
                                      style={{ textDecoration: "line-through", color: "var(--fg-4)" }}
                                    >
                                      {fmtChangeSide(c, "from")}
                                    </span>
                                    <span className={changeToneClass(c)}> removed</span>
                                  </>
                                ) : (
                                  <>
                                    <span
                                      style={{ textDecoration: "line-through", color: "var(--fg-4)" }}
                                    >
                                      {fmtChangeSide(c, "from")}
                                    </span>
                                    <span className={styles.qhArrow}>→</span>
                                    <span className={changeToneClass(c)}>
                                      {fmtChangeSide(c, "to")}
                                      {(c.kind === "money" || c.kind === "pct") && c.dir && (
                                        <span className={styles.qhArrow}>
                                          {" "}
                                          {c.dir === "up" ? "↑" : "↓"}
                                        </span>
                                      )}
                                    </span>
                                  </>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.qhEmpty}>
                This vendor didn't update this item in any negotiation round.
              </div>
            )}
          </div>
          <div className={styles.modalFoot} style={{ justifyContent: "flex-start" }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
              The vendor's final quote update per negotiation round for this item.
            </span>
          </div>
        </div>
      </div>
      </Portal>
    );

  /* ─────────────── switch-RFQ modal ─────────────── */
  const renderSwitchRfqModal = () =>
    showSwitchRfq && (
      <Portal>
        <div
          className={styles.overlayRoot}
          onClick={(e) => e.target === e.currentTarget && setShowSwitchRfq(false)}
        >
          <div className={styles.modal} style={{ maxWidth: 560 }}>
            <div className={styles.modalHead}>
              <div className={styles.modalHeadT}>
                <div className={`${styles.modalHeadIc} ${styles.modalHeadIcNeutral}`}>
                  <Repeat size={15} />
                </div>
                <div>
                  <h3>Switch RFQ</h3>
                  <div className={styles.sub}>Pick an RFQ to open in Quote Comparison.</div>
                </div>
              </div>
              <button className={styles.iconBtn} onClick={() => setShowSwitchRfq(false)}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.searchInput}>
                <Search size={14} />
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Search by RFQ number…"
                  value={rfqSearch}
                  onChange={(e) => setRfqSearch(e.target.value)}
                />
              </div>
              <div
                className={styles.rfqPickList}
                ref={rfqListRef}
                onScroll={onRfqListScroll}
              >
                {listLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <div className={styles.rfqPick} key={`rfq-sk-${i}`} style={{ pointerEvents: "none" }}>
                      <div className={styles.rpMain}>
                        <Bar w="78px" h="11px" />
                        <Bar w="58%" h="14px" mt={6} />
                        <Bar w="38%" h="12px" mt={6} />
                        <Bar w="92px" h="11px" mt={8} />
                      </div>
                      <div className={styles.rpRight}>
                        <Bar w="54px" h="20px" r="99px" />
                      </div>
                    </div>
                  ))}
                {!listLoading &&
                  filteredRfqs.map((r) => {
                    const closed = String(r.status) === "2";
                    const current = String(r.id) === String(rfq);
                    const num = formatRFQNumber(r.rfq_no, r.is_tender) || r.rfq_no;
                    const proj = r.project_name || r.hotel_name || "";
                    const quotes = parseInt(r.active_quote_count || r.quotes_received || 0, 10);
                    return (
                      <button
                        className={`${styles.rfqPick} ${current ? styles.current : ""}`}
                        key={r.id}
                        onClick={() => handleRfqSelect(r.id)}
                      >
                        <div className={styles.rpMain}>
                          <div className={styles.rpNum}>{num}</div>
                          <div className={styles.rpTitle}>{r.title || "Untitled RFQ"}</div>
                          {proj && <div className={styles.rpProject}>{proj}</div>}
                          <div className={styles.rpQuotes}>{quotes} quotes received</div>
                        </div>
                        <div className={styles.rpRight}>
                          <span className={`${styles.rpStatus} ${closed ? styles.closed : styles.open}`}>
                            {closed ? "Closed for quotes" : "Open"}
                          </span>
                          {current && <span className={styles.rpCurrent}>Currently open</span>}
                        </div>
                      </button>
                    );
                  })}
                {!listLoading && filteredRfqs.length === 0 && (
                  <div className={styles.qhEmpty}>No RFQs match your search</div>
                )}
                {!listLoading && rfqLoadingMore && (
                  <div className={styles.rfqListLoading}>Loading more…</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Portal>
    );

  const isAccessDenied = currentRFQMeta && !permsLoading && !canRead;
  const isContentLoading = !!rfq && !isAccessDenied && (loading || permsLoading || !currentRFQMeta);

  return (
    // Embedded: drop the full-bleed `.page` (negative margins + 100vh) so the
    // workspace sits inside the lifecycle stage; `.root` keeps the design tokens.
    <div className={isEmbedded ? styles.root : styles.page}>
      <div className={styles.root}>
        {!rfq && !isContentLoading && (
          <div className={styles.contentWrap}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FileText size={36} />
              </div>
              <h4>Select an RFQ to compare quotes</h4>
              <p>Choose an RFQ or Tender to view and compare vendor quotes.</p>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ marginTop: 16 }}
                onClick={() => setShowSwitchRfq(true)}
              >
                <Repeat size={14} /> Select an RFQ
              </button>
            </div>
          </div>
        )}

        {isContentLoading && <div className={styles.contentWrap}>{renderSkeleton()}</div>}

        {!isContentLoading && isAccessDenied && (
          <div className={styles.contentWrap}>
            <AccessDeniedPage showBackButton={false} />
          </div>
        )}

        {!isContentLoading && !isAccessDenied && rfq && view && (
          <div className={styles.contentWrap}>{renderWorkspace()}</div>
        )}

        {!isContentLoading && !isAccessDenied && rfq && !view && (
          <div className={styles.contentWrap}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <AlertTriangle size={36} />
              </div>
              <h4>Couldn’t load this comparison</h4>
              <p>We weren’t able to fetch the quote comparison for this RFQ. Try selecting it again.</p>
              {!isEmbedded && (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ marginTop: 16 }}
                  onClick={() => setShowSwitchRfq(true)}
                >
                  <Repeat size={14} /> Switch RFQ
                </button>
              )}
            </div>
          </div>
        )}

        {renderFinalizeModal()}
        {renderConfirmModal()}
        {renderKebabMenu()}
        {renderSortMenu()}
        {renderHistoryModal()}
        {renderSwitchRfqModal()}
        {renderApprovalDrawer()}

        {tip && (
          <Portal>
            <div className={styles.rejectionTooltip} style={{ left: tip.x, top: tip.y }}>
              <div className={styles.rtHead}>
                <AlertTriangle size={12} />
                <span>
                  Rejected by <span className={styles.em}>{tip.info.by}</span>
                </span>
                {tip.info.date && <span className={styles.rtDate}>{fmtDateTime(tip.info.date)}</span>}
              </div>
              {tip.info.role && <div className={styles.rtRole}>{tip.info.role}</div>}
              <div className={styles.rtReason}>{tip.info.reason}</div>
              {tip.recommended && (
                <div className={styles.rtRecommend}>
                  <Sparkles size={11} /> Recommended:{" "}
                  <span className={styles.em}>{tip.recommended.name}</span>
                </div>
              )}
              <div className={styles.rtAction}>
                → Pick another vendor below, or force re-select the same one.
              </div>
            </div>
          </Portal>
        )}
        {toastMsg && (
          <Portal>
            <div className={styles.toast}>
              <span className={styles.tIc}>
                <Check size={14} />
              </span>
              <span>{toastMsg}</span>
            </div>
          </Portal>
        )}
      </div>
    </div>
  );
};

export default QuoteComparison;
