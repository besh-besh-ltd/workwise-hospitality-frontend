import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { debounce } from "lodash";
import { toast } from "react-toastify";
import moment from "moment";
import {
  ArrowRight, Search, Building2, FileText, Gavel,
  Check, Plus, X, Building, CheckCircle2,
  Sparkles, ShoppingBag, Package, Info, Copy, FilePlus2,
  ChevronLeft, ChevronRight, Trash2, Eye, AlertCircle,
} from "lucide-react";

import { searchProductsV2 } from "@/services/products";
import WwAiPanel from "@/components/wwai/WwAiPanel";
import { buildVendorMatchPlan, stagedFromNames } from "@/lib/wwai/panels/vendorMatch";
import { getRFQHotels } from "@/services/hospitality";
import {
  addProductsToDraft,
  getRecommendedProducts,
  getDraftById,
  getDraftRFQs,
  deleteDraft,
} from "@/services/rfq";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import CopyFromExistingModal from "./CopyFromExistingModal";

import styles from "./StartRFQ.module.scss";

const VIEW = {
  LANDING: "landing",
  BU: "bu",
  PRODUCTS: "products",
};

const StartRFQ = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const { loggedin } = router.query;

  // ── State ───────────────────────────────────
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [searchProduct, setSearchProduct] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [queryMeta, setQueryMeta] = useState({
    rfq_id: null,
    sheet_id: null,
    orderType: null,
  });
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  // Staged products held in local state until "Create Draft" is clicked.
  const [stagedItems, setStagedItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [advancedToProducts, setAdvancedToProducts] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [justAddedId, setJustAddedId] = useState(null);
  const [justAddedVariants, setJustAddedVariants] = useState({});

  // Previously-added items for the draft (?rfq_id=…) — read-only in the rail.
  const [existingProducts, setExistingProducts] = useState([]);

  // Drafts list (landing view) — uses the same backend as the manage-rfq tab.
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [draftPage, setDraftPage] = useState(1);
  const DRAFTS_PER_PAGE = 5;
  const [deletingDraft, setDeletingDraft] = useState(null);
  // "Copy from existing" two-phase modal (pick RFQ → BU → copy → "Edit draft?").
  const [showCopyFromModal, setShowCopyFromModal] = useState(false);

  const searchRef = useRef(null);

  // ── Debounced product search ──
  const debouncedFetchSuggestions = useRef(
    debounce(async (val, hotelIds) => {
      setSuggestionLoading(true);
      try {
        const rsp = await searchProductsV2(
          { search_key: val.trim(), hotel_ids: hotelIds || [] },
          "products"
        );
        setSuggestions(rsp.data || []);
      } catch (_) {
        setSuggestions([]);
      } finally {
        setSuggestionLoading(false);
      }
    }, 300)
  ).current;

  // ── Derived ──
  const isTender = queryMeta.orderType === "tender";
  const entityLabel = isTender ? "Tender" : "RFQ";

  const moduleKey = isTender ? "boq" : "rfq";
  const {
    canRead,
    canCreate,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey,
    hotelIds: selectedHotelIds,
    enabled: selectedHotelIds.length > 0 && !!queryMeta.orderType,
  });

  const hasWriteAccess =
    selectedHotelIds.length === 0 || permissionsLoading || canCreate;
  const isReadOnly =
    selectedHotelIds.length > 0 && !permissionsLoading && canRead && !canCreate;
  const isAccessDenied =
    selectedHotelIds.length > 0 && !permissionsLoading && !canRead;

  // Single source of truth for which surface to render.
  const view = useMemo(() => {
    if (queryMeta.rfq_id) return VIEW.PRODUCTS;
    if (!queryMeta.orderType) return VIEW.LANDING;
    if (!advancedToProducts || selectedHotelIds.length === 0) return VIEW.BU;
    return VIEW.PRODUCTS;
  }, [queryMeta.rfq_id, queryMeta.orderType, advancedToProducts, selectedHotelIds]);

  // ── Effects ────────────────────────────────
  useEffect(() => {
    if (!showSuggestions) return;
    const listener = (event) => {
      if (!searchRef.current || searchRef.current.contains(event.target)) return;
      setShowSuggestions(false);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [showSuggestions]);

  useEffect(() => {
    const { rfq_id, sheet_id, orderType } = router.query;
    const parsedRfqId =
      rfq_id && rfq_id !== "null" && !isNaN(parseInt(rfq_id)) ? parseInt(rfq_id) : null;
    const parsedSheetId =
      sheet_id && sheet_id !== "null" && !isNaN(parseInt(sheet_id))
        ? parseInt(sheet_id)
        : null;

    setQueryMeta({
      rfq_id: parsedRfqId,
      sheet_id: parsedSheetId,
      orderType: orderType || null,
    });

    if (parsedRfqId !== null) {
      getRfqMappedHotels(parsedRfqId);
      fetchExistingDraftProducts(parsedRfqId, parsedSheetId);
    } else {
      setExistingProducts([]);
    }
  }, [router.query]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      setIsLoggedIn(true);
      const mappings = (userProfile?.hospitality_mappings || []).filter(
        (m) => m.hospitality_hotel_id != null
      );
      setUserHotelMappings(mappings);
    }
    if (redirectAfterLogin) {
      router.push(redirectAfterLogin);
      setRedirectAfterLogin(null);
    }
  }, [router, loggedin, userProfile]);

  // Recommendations — only on Products view.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (selectedHotelIds.length === 0) {
      setRecommendations([]);
      return;
    }
    if (view !== VIEW.PRODUCTS) return;

    const stagedVariantIds = stagedItems.map((it) => it.variant_id);
    const handle = setTimeout(async () => {
      setRecommendationsLoading(true);
      try {
        const res = await getRecommendedProducts({
          hotel_ids: selectedHotelIds,
          variant_ids: stagedVariantIds,
          limit: 8,
        });
        const data = res?.data || res;
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (_) {
        setRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [isLoggedIn, view, JSON.stringify(selectedHotelIds), stagedItems.length]);

  // Drafts list — fetch on Landing view, refetch when page changes.
  useEffect(() => {
    if (view !== VIEW.LANDING || !isLoggedIn) return;
    let cancelled = false;
    setDraftsLoading(true);
    getDraftRFQs({
      page: draftPage,
      limit: DRAFTS_PER_PAGE,
      sort: "DESC",
      rfq_type: "",
      reverse_auction: "-1",
      project_id: -1,
    })
      .then((res) => {
        if (cancelled) return;
        if (res?.status === 1) {
          setDrafts(Array.isArray(res.data) ? res.data : []);
          setDraftsTotal(res.total_items || 0);
        } else {
          setDrafts([]);
          setDraftsTotal(0);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDrafts([]);
        setDraftsTotal(0);
      })
      .finally(() => {
        if (!cancelled) setDraftsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, isLoggedIn, draftPage]);

  // ── Backend wiring ─────────────────────────
  const getRfqMappedHotels = async (rfq_id) => {
    try {
      const response = await getRFQHotels(rfq_id);
      const mappings = response?.data || [];
      setUserHotelMappings(mappings);
      const hotelIds = mappings.map((item) => item.hotel_id);
      setSelectedHotelIds(hotelIds);
    } catch (_) {}
  };

  const fetchExistingDraftProducts = async (rfqId, sheetId) => {
    try {
      const res = await getDraftById(rfqId, sheetId);
      const raw =
        res?.data?.rfq_products ||
        res?.data?.products ||
        res?.rfq_products ||
        res?.products ||
        [];
      const list = (Array.isArray(raw) ? raw : []).map((p, idx) => {
        const variantId =
          p?.product_variant_id ?? p?.variant_id ?? p?.id ?? `prev-${idx}`;
        const name =
          p?.variant_name ||
          p?.product_name ||
          p?.name ||
          p?.product?.name ||
          `Product ${idx + 1}`;
        const category = p?.category_name || p?.category || p?.category_title || "";
        return {
          id: `prev-${variantId}-${idx}`,
          variant_id: variantId,
          name,
          category_name: category,
        };
      });
      setExistingProducts(list);
    } catch (_) {
      setExistingProducts([]);
    }
  };

  // ── Handlers ───────────────────────────────
  const handleStartNew = () => {
    if (!isLoggedIn) {
      setOpenAuthModal(true);
      return;
    }
    router.replace(
      { pathname: router.pathname, query: { ...router.query, orderType: "rfq" } },
      undefined,
      { shallow: true }
    );
    setQueryMeta((prev) => ({ ...prev, orderType: "rfq" }));
  };

  // All draft rows open in the Edit-Draft wizard. When the current user is NOT
  // the creator, we tack on view_only=true so the wizard renders read-only.
  // step=1&max=1 land the user on the first step of the wizard.
  const handleResumeDraft = (draft) => {
    if (!draft?.id) return;
    const myId = userProfile?.id ?? userProfile?.user_id;
    const ownedByMe =
      myId != null && draft?.created_by != null && Number(myId) === Number(draft.created_by);
    const params = new URLSearchParams({
      tab: "create-rfq",
      draft_id: String(draft.id),
      step: "1",
      max: "1",
    });
    if (!ownedByMe) params.set("view_only", "true");
    router.push(`/dashboard/buyer/rfq-management?${params.toString()}`);
  };

  const handleOpenDraftEdit = (draftId) => {
    router.push(`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${draftId}`);
  };

  const handleBackToLanding = () => {
    const { orderType: _o, rfq_id: _r, sheet_id: _s, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    setQueryMeta({ rfq_id: null, sheet_id: null, orderType: null });
    setSelectedHotelIds([]);
    setStagedItems([]);
    setAdvancedToProducts(false);
    setSearchProduct("");
    setSuggestions([]);
    setExistingProducts([]);
  };

  const handleBackToBu = () => {
    if (queryMeta.rfq_id) return;
    setAdvancedToProducts(false);
    setStagedItems([]);
    setSearchProduct("");
    setSuggestions([]);
  };

  const handleSelectHotel = (hotelId) => {
    if (queryMeta.rfq_id) return;
    if (isTender) {
      setSelectedHotelIds((prev) =>
        prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
      );
    } else {
      setSelectedHotelIds([hotelId]);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchProduct(val);
    if (selectedHotelIds.length === 0) {
      debouncedFetchSuggestions.cancel();
      setSuggestions([]);
      if (val.length > 2) setShowSuggestions(true);
      return;
    }
    if (val.length > 2) {
      debouncedFetchSuggestions(val, selectedHotelIds);
      setShowSuggestions(true);
    } else {
      debouncedFetchSuggestions.cancel();
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (item) => {
    if (selectedHotelIds.length === 0) {
      toast.info("Please select at least one business unit first.");
      return;
    }
    if (!hasWriteAccess) {
      toast.warn("You don't have permission to add products.");
      return;
    }
    const newId = `${item.variant_id}-${Date.now()}`;
    setStagedItems((prev) => [
      ...prev,
      {
        id: newId,
        variant_id: item.variant_id,
        name: item.variant_name || item.product_name,
        category_name: item.category_name,
        product_name: item.product_name,
      },
    ]);
    setJustAddedId(newId);
    setTimeout(() => setJustAddedId((curr) => (curr === newId ? null : curr)), 800);

    const variantKey = item.variant_id;
    setJustAddedVariants((prev) => ({ ...prev, [variantKey]: Date.now() }));
    setTimeout(() => {
      setJustAddedVariants((prev) => {
        const next = { ...prev };
        delete next[variantKey];
        return next;
      });
    }, 1000);
  };

  const handleRemoveOneGrouped = (variantId) => {
    setStagedItems((prev) => {
      const reverseIdx = [...prev].reverse().findIndex((it) => it.variant_id === variantId);
      if (reverseIdx === -1) return prev;
      const realIdx = prev.length - 1 - reverseIdx;
      return prev.slice(0, realIdx).concat(prev.slice(realIdx + 1));
    });
  };

  const groupedStagedItems = useMemo(() => {
    const order = [];
    const byVariant = new Map();
    stagedItems.forEach((it) => {
      const key = String(it.variant_id);
      if (!byVariant.has(key)) {
        order.push(key);
        byVariant.set(key, { ...it, count: 1, firstId: it.id, lastId: it.id });
      } else {
        const cur = byVariant.get(key);
        cur.count += 1;
        cur.lastId = it.id;
      }
    });
    return order.map((k) => byVariant.get(k));
  }, [stagedItems]);

  const handleCreateDraft = async () => {
    if (stagedItems.length === 0) {
      toast.info("Add at least one product to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        is_tender: isTender ? 1 : 0,
        hotel_ids: selectedHotelIds,
        variants: stagedItems.map((it) => ({ variant_id: it.variant_id })),
      };
      if (queryMeta.rfq_id) payload.rfq_id = queryMeta.rfq_id;

      const response = await addProductsToDraft(payload);
      const result = response?.data || response;
      const rfq_id = result?.rfq_id || queryMeta.rfq_id;
      if (!rfq_id) throw new Error("Draft was not created. Please try again.");
      setSuccessData({ rfq_id, count: stagedItems.length });
    } catch (_) {
      toast.error("Failed to create draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMoreFromSuccess = () => {
    if (successData?.rfq_id && !queryMeta.rfq_id) {
      router.replace(
        { pathname: router.pathname, query: { ...router.query, rfq_id: successData.rfq_id } },
        undefined,
        { shallow: true }
      );
    }
    setStagedItems([]);
    setSearchProduct("");
    setSuggestions([]);
    setSuccessData(null);
  };

  const handleEditDraft = () => {
    if (successData?.rfq_id) {
      router.push(
        `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${successData.rfq_id}`
      );
    }
  };

  const confirmDeleteDraft = async () => {
    if (!deletingDraft) return;
    try {
      const res = await deleteDraft(deletingDraft.id);
      if (res?.status === 1) {
        toast.success("Draft deleted");
        setDraftPage(1);
        setDrafts((prev) => prev.filter((d) => d.id !== deletingDraft.id));
      } else {
        toast.error("Failed to delete draft");
      }
    } catch (_) {
      toast.error("Failed to delete draft");
    } finally {
      setDeletingDraft(null);
    }
  };

  // ── Subcomponents ─────────────────────────
  const PageHeader = ({ title, sub, breadcrumb }) => (
    <div className={styles.pageHeader}>
      {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      <h1 className={styles.pageTitle}>{title}</h1>
      {sub && <p className={styles.pageSub}>{sub}</p>}
    </div>
  );

  // ── Render: LANDING ───────────────────────
  const renderLanding = () => {
    const totalPages = Math.max(1, Math.ceil(draftsTotal / DRAFTS_PER_PAGE));
    return (
      <>
        <PageHeader
          title="Create RFQ"
          sub="Start a new RFQ, copy from a past one, or resume an in-progress draft."
        />

        <div className={styles.entryGrid}>
          <button type="button" className={styles.entryCard} onClick={handleStartNew}>
            <span className={`${styles.entryIcon} ${styles.entryIconPrimary}`}>
              <FilePlus2 size={18} />
            </span>
            <div className={styles.entryBody}>
              <div className={styles.entryHead}>
                <span className={styles.entryTitle}>Start new</span>
                <span className={styles.entryCta}>
                  Start <ArrowRight size={13} />
                </span>
              </div>
              <span className={styles.entryDesc}>
                Pick the business units and add the products you need quotes for.
              </span>
            </div>
          </button>

          <button
            type="button"
            className={styles.entryCard}
            onClick={() => setShowCopyFromModal(true)}
          >
            <span className={styles.entryIcon}>
              <Copy size={18} />
            </span>
            <div className={styles.entryBody}>
              <div className={styles.entryHead}>
                <span className={styles.entryTitle}>Copy from existing</span>
                <span className={styles.entryCta}>
                  Browse <ArrowRight size={13} />
                </span>
              </div>
              <span className={styles.entryDesc}>
                Clone a past RFQ — copy its products, BUs and vendors as a starting point.
              </span>
            </div>
          </button>
        </div>

        <div className={styles.inlineNote}>
          <Info size={12} className={styles.inlineNoteIc} />
          <span>
            AI vendor suggestions appear during the wizard — ranked by past on-time
            delivery, response speed, and your approved-vendor list.
          </span>
        </div>

        <section className={styles.draftsPanel}>
          <div className={styles.draftsHead}>
            <div className={styles.draftsTitleRow}>
              <span className={styles.draftsTitle}>RFQ drafts</span>
              {draftsTotal > 0 && (
                <span className={styles.draftsCount}>{draftsTotal}</span>
              )}
            </div>
            <span className={styles.draftsSub}>
              Resume where you left off
            </span>
          </div>

          <div className={styles.draftsBody}>
            {draftsLoading ? (
              <div className={styles.draftsSkel}>
                {[0, 1, 2].map((i) => (
                  <div className={styles.draftRowSkel} key={i}>
                    <span className={`${styles.skelBar}`} style={{ width: "42%" }} />
                    <span className={`${styles.skelBar}`} style={{ width: "18%" }} />
                    <span className={`${styles.skelBar}`} style={{ width: "14%" }} />
                    <span className={`${styles.skelBar}`} style={{ width: "12%" }} />
                  </div>
                ))}
              </div>
            ) : drafts.length === 0 ? (
              <div className={styles.draftsEmpty}>
                <div className={styles.draftsEmptyIc}>
                  <FilePlus2 size={18} />
                </div>
                <div className={styles.draftsEmptyTitle}>No drafts yet</div>
                <div className={styles.draftsEmptyDesc}>
                  Drafts you start and don't finish will appear here.
                </div>
              </div>
            ) : (
              <>
                <div className={styles.draftsTableHead}>
                  <span>RFQ</span>
                  <span>Business units</span>
                  <span className={styles.draftsColRight}>Items</span>
                  <span>Created by</span>
                  <span className={styles.draftsColRight}>Created</span>
                  <span />
                </div>
                <div className={styles.draftsList}>
                  {drafts.map((d) => {
                    const itemsCount = d.items_count ?? d.products_count ?? d.product_count ?? 0;
                    const created = d.timestamp ? moment(d.timestamp).format("DD MMM") : "—";
                    const title = d.title || "Untitled";
                    const number = d.rfq_no ? `#${d.rfq_no}` : "—";

                    // Business units (array of {id, name}) — show first + " +N more".
                    const hotels = Array.isArray(d.hotels) ? d.hotels : [];
                    const buFirst = hotels[0]?.name;
                    const buMore = hotels.length > 1 ? hotels.length - 1 : 0;

                    // Ownership — drives the "View only" badge + the view_only=true URL param.
                    const myId = userProfile?.id ?? userProfile?.user_id;
                    const ownedByMe =
                      myId != null && d?.created_by != null && Number(myId) === Number(d.created_by);
                    const creator = d.creator_name || (ownedByMe ? "You" : "—");

                    return (
                      <button
                        type="button"
                        key={d.id}
                        className={styles.draftRow}
                        onClick={() => handleResumeDraft(d)}
                      >
                        <span className={styles.draftCellId}>
                          <span className={styles.draftNumber}>{number}</span>
                          <span className={styles.draftTitle}>{title}</span>
                        </span>
                        <span className={styles.draftCellBu}>
                          {buFirst ? (
                            <>
                              <Building2 size={11} className={styles.draftMetaIc} />
                              <span className={styles.draftBuName} title={hotels.map((h) => h.name).join(", ")}>
                                {buFirst}
                              </span>
                              {buMore > 0 && (
                                <span className={styles.draftBuMore}>+{buMore}</span>
                              )}
                            </>
                          ) : (
                            <span className={styles.draftMuted}>—</span>
                          )}
                        </span>
                        <span className={`${styles.draftCellNum} ${styles.draftsColRight}`}>
                          {itemsCount > 0 ? `${itemsCount} item${itemsCount === 1 ? "" : "s"}` : "—"}
                        </span>
                        <span className={styles.draftCellCreator}>
                          <span className={styles.draftCreatorName} title={creator}>
                            {creator}
                          </span>
                          {!ownedByMe && (
                            <span className={styles.viewOnlyPill}>
                              <Eye size={9} strokeWidth={2.4} /> View only
                            </span>
                          )}
                        </span>
                        <span className={`${styles.draftCellDate} ${styles.draftsColRight}`}>
                          {created}
                        </span>
                        <span className={styles.draftActions}>
                          {ownedByMe && (
                            <button
                              type="button"
                              className={styles.draftDelBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingDraft(d);
                              }}
                              aria-label="Delete draft"
                              title="Delete draft"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          <ChevronRight size={13} className={styles.draftChev} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className={styles.draftsPaging}>
                    <button
                      type="button"
                      className={styles.draftsPgBtn}
                      onClick={() => setDraftPage((p) => Math.max(1, p - 1))}
                      disabled={draftPage <= 1}
                    >
                      <ChevronLeft size={12} /> Prev
                    </button>
                    <span className={styles.draftsPgInfo}>
                      Page <b>{draftPage}</b> of <b>{totalPages}</b>
                    </span>
                    <button
                      type="button"
                      className={styles.draftsPgBtn}
                      onClick={() => setDraftPage((p) => Math.min(totalPages, p + 1))}
                      disabled={draftPage >= totalPages}
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </>
    );
  };

  // ── Render: BU SELECTION ───────────────────
  const renderBu = () => (
    <>
      <PageHeader
        title="Pick the business units"
        sub={
          isTender
            ? "Tenders can span multiple business units. Select all that this procurement applies to."
            : "An RFQ applies to a single business unit. Pick the one this procurement is for."
        }
        breadcrumb={
          <>
            <button type="button" className={styles.breadcrumbLink} onClick={handleBackToLanding}>
              Create RFQ
            </button>
            <ChevronRight size={11} className={styles.breadcrumbSep} />
            <span className={styles.breadcrumbHere}>Business units</span>
          </>
        }
      />

      {userHotelMappings.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIc}>
            <Building size={20} />
          </div>
          <div className={styles.emptyStateTitle}>No business unit access</div>
          <div className={styles.emptyStateDesc}>
            Contact your administrator to get access.
          </div>
        </div>
      ) : (
        <div className={styles.buList}>
          {userHotelMappings.map((m) => {
            const id = m.hospitality_hotel_id || m.hotel_id;
            const isActive = selectedHotelIds.includes(id);
            return (
              <button
                type="button"
                key={id}
                className={`${styles.buRow} ${isActive ? styles.buRowActive : ""}`}
                onClick={() => handleSelectHotel(id)}
              >
                <span className={`${styles.buCheck} ${isTender ? styles.buCheckSquare : ""}`}>
                  {isActive && <Check size={12} strokeWidth={3} />}
                </span>
                <Building2 size={15} className={styles.buIcon} />
                <span className={styles.buInfo}>
                  <span className={styles.buName}>
                    {m.hotel_name || m.name || "Business Unit"}
                  </span>
                  {m.company_name && (
                    <span className={styles.buMeta}>{m.company_name}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.stepActions}>
        <button type="button" className={styles.btnGhost} onClick={handleBackToLanding}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={selectedHotelIds.length === 0}
          onClick={() => setAdvancedToProducts(true)}
        >
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </>
  );

  // ── Render: PRODUCTS ──────────────────────
  const renderProducts = () => (
    <>
      <PageHeader
        title={queryMeta.rfq_id ? `Add products to ${entityLabel}` : "Add products"}
        sub={
          queryMeta.rfq_id
            ? "Search and stage products, then add them to your draft."
            : "Search and add the items you need quotes for."
        }
        breadcrumb={
          <>
            <button type="button" className={styles.breadcrumbLink} onClick={handleBackToLanding}>
              Create RFQ
            </button>
            <ChevronRight size={11} className={styles.breadcrumbSep} />
            {!queryMeta.rfq_id && (
              <>
                <button type="button" className={styles.breadcrumbLink} onClick={handleBackToBu}>
                  Business units
                </button>
                <ChevronRight size={11} className={styles.breadcrumbSep} />
              </>
            )}
            <span className={styles.breadcrumbHere}>Products</span>
          </>
        }
      />

      {isAccessDenied && (
        <div className={styles.bannerWrap}>
          <AccessDeniedPage showBackButton={false} />
        </div>
      )}
      {isReadOnly && !isAccessDenied && (
        <div className={styles.bannerWrap}>
          <ReadOnlyBanner
            title="View Only Mode"
            message="You have read-only access for the selected business units."
          />
        </div>
      )}

      <div className={styles.productLayout}>
        {/* LEFT: search + recommendations */}
        <div className={styles.productLeft}>
          <div className={styles.searchBox} ref={searchRef}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search products by name (e.g. Pipes, Valves, Flanges…)"
              value={searchProduct}
              onChange={handleSearchChange}
              onFocus={() => searchProduct.length > 2 && setShowSuggestions(true)}
              disabled={isReadOnly || isAccessDenied}
            />
            {searchProduct && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => {
                  setSearchProduct("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                aria-label="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* AI vendor matching — the prototype's panel and analysis, carried
              across unchanged. It sits above the results, as it does in the
              prototype: the recommendation is read before vendors are picked. */}
          <WwAiPanel
            id="ai-vendor-match"
            className="vm-ai-panel"
            title="AI vendor matching"
            sub="Ranked on past on-time delivery, response speed and your approved-vendor list"
            runLabel="Match vendors"
            buildPlan={() =>
              buildVendorMatchPlan({
                staged: stagedFromNames(stagedItems.map((it) => it.variant_name || it.product_name)),
                bypass: {},
              })
            }
          />

          {searchProduct.length > 0 ? (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <Search size={12} />
                <span>
                  {searchProduct.length < 3
                    ? "Type at least 3 characters"
                    : suggestionLoading
                    ? "Searching…"
                    : `${suggestions.length} result${suggestions.length === 1 ? "" : "s"} for "${searchProduct}"`}
                </span>
              </div>
              {suggestionLoading ? (
                <div className={styles.panelLoading}>
                  <div className={styles.spinner} />
                  <span>Finding products…</span>
                </div>
              ) : suggestions.length === 0 && searchProduct.length >= 3 ? (
                <div className={styles.panelEmpty}>
                  <Package size={22} className={styles.panelEmptyIc} />
                  <div>No products match &ldquo;{searchProduct}&rdquo;</div>
                  <div className={styles.panelEmptyHint}>
                    Try a different keyword or category name.
                  </div>
                </div>
              ) : (
                <div className={styles.resultList}>
                  {suggestions.map((item, idx) => {
                    const noVendors =
                      item.vendor_count !== undefined &&
                      parseInt(item.vendor_count) === 0;
                    const wasAdded = !!justAddedVariants[item.variant_id];
                    return (
                      <div
                        key={`${item.variant_id}-${idx}`}
                        className={`${styles.resultRow} ${noVendors ? styles.resultRowNoVendors : ""} ${wasAdded ? styles.resultRowAdded : ""}`}
                        onClick={() => handleSuggestionClick(item)}
                      >
                        <span className={styles.resultIcon}>
                          <Package size={13} />
                        </span>
                        <div className={styles.resultMain}>
                          <div className={styles.resultName}>
                            {item.variant_name || item.product_name}
                          </div>
                          {(item.category_name || item.product_name) && (
                            <div className={styles.resultMeta}>
                              {item.category_name}
                              {item.category_name && item.product_name && " · "}
                              {item.variant_name &&
                                item.product_name !== item.variant_name &&
                                item.product_name}
                            </div>
                          )}
                        </div>
                        <div className={styles.resultActions}>
                          {noVendors && !wasAdded && (
                            <span
                              className={styles.noVendorsHint}
                              title="No vendors are currently mapped for this product. You can still add it — vendors can be assigned later."
                            >
                              <AlertCircle size={10} strokeWidth={2.4} /> No vendors
                            </span>
                          )}
                          {wasAdded ? (
                            <span className={`${styles.addBtn} ${styles.addBtnDone}`}>
                              <Check size={11} strokeWidth={3} /> Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.addBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuggestionClick(item);
                              }}
                            >
                              <Plus size={11} /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <Sparkles size={12} className={styles.panelHeadIc} />
                <span>Recommended for you</span>
                <span className={styles.panelHint}>
                  Based on your history{stagedItems.length > 0 ? " & selected items" : ""}
                </span>
              </div>
              {recommendationsLoading ? (
                <div className={styles.panelLoading}>
                  <div className={styles.spinner} />
                  <span>Finding recommendations…</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className={styles.panelEmpty}>
                  <Sparkles size={22} className={styles.panelEmptyIc} />
                  <div>No recommendations yet</div>
                  <div className={styles.panelEmptyHint}>
                    Start by searching products above. As you add items, we&apos;ll
                    suggest related products based on your history.
                  </div>
                </div>
              ) : (
                <div className={styles.resultList}>
                  {recommendations.map((item, idx) => {
                    const noVendors =
                      item.vendor_count !== undefined &&
                      parseInt(item.vendor_count) === 0;
                    const wasAdded = !!justAddedVariants[item.variant_id];
                    return (
                      <div
                        key={`rec-${item.variant_id}-${idx}`}
                        className={`${styles.resultRow} ${noVendors ? styles.resultRowNoVendors : ""} ${wasAdded ? styles.resultRowAdded : ""}`}
                        onClick={() => handleSuggestionClick(item)}
                      >
                        <span className={`${styles.resultIcon} ${styles.resultIconRec}`}>
                          <Sparkles size={12} />
                        </span>
                        <div className={styles.resultMain}>
                          <div className={styles.resultName}>
                            {item.variant_name || item.product_name}
                          </div>
                          {item.category_name && (
                            <div className={styles.resultMeta}>{item.category_name}</div>
                          )}
                        </div>
                        <div className={styles.resultActions}>
                          {noVendors && !wasAdded && (
                            <span
                              className={styles.noVendorsHint}
                              title="No vendors are currently mapped for this product. You can still add it — vendors can be assigned later."
                            >
                              <AlertCircle size={10} strokeWidth={2.4} /> No vendors
                            </span>
                          )}
                          {wasAdded ? (
                            <span className={`${styles.addBtn} ${styles.addBtnDone}`}>
                              <Check size={11} strokeWidth={3} /> Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.addBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuggestionClick(item);
                              }}
                            >
                              <Plus size={11} /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: staged */}
        <aside className={styles.productRight}>
          <div className={styles.stagedHead}>
            <ShoppingBag size={13} />
            <span className={styles.stagedTitle}>Your selection</span>
            <span className={styles.stagedCount}>{stagedItems.length}</span>
          </div>

          <div className={styles.stagedBody}>
            {queryMeta.rfq_id && existingProducts.length > 0 && (
              <>
                <div className={styles.stagedSection}>
                  Previously added · {existingProducts.length}
                </div>
                <div className={styles.existingNote}>
                  <Info size={12} className={styles.existingNoteIc} />
                  <span>
                    Previously added items can be removed from the{" "}
                    <button
                      type="button"
                      className={styles.inlineLink}
                      onClick={() => handleOpenDraftEdit(queryMeta.rfq_id)}
                    >
                      Edit Draft
                    </button>{" "}
                    page. Add more here, or go there to manage existing items.
                  </span>
                </div>
                <div className={styles.stagedList}>
                  {existingProducts.map((it) => (
                    <div
                      key={it.id}
                      className={`${styles.stagedItem} ${styles.stagedItemReadonly}`}
                      title="Already on this draft"
                    >
                      <span className={styles.stagedDot}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <div className={styles.stagedItemInfo}>
                        <div className={styles.stagedItemName}>{it.name}</div>
                        {it.category_name && (
                          <div className={styles.stagedItemCat}>{it.category_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {groupedStagedItems.length > 0 ? (
              <>
                {queryMeta.rfq_id && existingProducts.length > 0 && (
                  <div className={styles.stagedSection}>
                    Adding now · {stagedItems.length}
                  </div>
                )}
                <div className={styles.stagedList}>
                  {groupedStagedItems.map((it) => (
                    <div
                      key={it.firstId}
                      className={`${styles.stagedItem} ${justAddedId === it.lastId ? styles.stagedItemAdded : ""}`}
                    >
                      <span className={styles.stagedDot}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <div className={styles.stagedItemInfo}>
                        <div className={styles.stagedItemName}>
                          {it.name}
                          {it.count > 1 && (
                            <span className={styles.qtyBadge}>×{it.count}</span>
                          )}
                        </div>
                        {it.category_name && (
                          <div className={styles.stagedItemCat}>{it.category_name}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveOneGrouped(it.variant_id)}
                        aria-label={it.count > 1 ? "Remove one" : "Remove"}
                        title={it.count > 1 ? "Remove one" : "Remove"}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              (!queryMeta.rfq_id || existingProducts.length === 0) && (
                <div className={styles.stagedEmpty}>
                  <ShoppingBag size={22} className={styles.stagedEmptyIc} />
                  <div className={styles.stagedEmptyTitle}>No products yet</div>
                  <div className={styles.stagedEmptyDesc}>
                    Search or pick from recommendations to add products.
                  </div>
                </div>
              )
            )}
          </div>

          <div className={styles.stagedFooter}>
            <button
              type="button"
              className={`${styles.btnPrimary} ${styles.btnBlock}`}
              disabled={stagedItems.length === 0 || submitting}
              onClick={handleCreateDraft}
            >
              {submitting
                ? queryMeta.rfq_id
                  ? "Adding…"
                  : "Creating draft…"
                : queryMeta.rfq_id
                ? `Add items to Draft (${stagedItems.length})`
                : `Create Draft (${stagedItems.length})`}
              {!submitting && <ArrowRight size={13} />}
            </button>
          </div>
        </aside>
      </div>
    </>
  );

  // ── Page render ───────────────────────────
  return (
    <div className={styles.page}>
      {view === VIEW.LANDING && renderLanding()}
      {view === VIEW.BU && renderBu()}
      {view === VIEW.PRODUCTS && renderProducts()}

      {/* Success modal */}
      {successData && (
        <div className={styles.successOverlay} onClick={() => setSuccessData(null)}>
          <div className={styles.successCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.successClose}
              onClick={() => setSuccessData(null)}
              aria-label="Close"
            >
              <X size={14} />
            </button>
            <div className={styles.successHead}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={18} strokeWidth={2} />
              </div>
              <div>
                <h3 className={styles.successTitle}>Draft saved</h3>
                <p className={styles.successDesc}>
                  {successData.count} product{successData.count > 1 ? "s" : ""}{" "}
                  added to your {entityLabel.toLowerCase()} draft.
                </p>
              </div>
            </div>
            <div className={styles.successActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={handleAddMoreFromSuccess}
              >
                <Plus size={12} /> Add more
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleEditDraft}
              >
                Edit draft <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete-draft confirm */}
      <ConfirmationModal
        isOpen={!!deletingDraft}
        onClose={() => setDeletingDraft(null)}
        onConfirm={confirmDeleteDraft}
        title="Delete this draft?"
        description={`Draft ${
          deletingDraft?.rfq_no ? `#${deletingDraft.rfq_no}` : ""
        } will be removed permanently. This can't be undone.`}
        confirmButtonColor="danger"
        confirmButtonText="Delete"
        cancelButtonText="Keep draft"
      />

      <CopyFromExistingModal
        isOpen={showCopyFromModal}
        onClose={() => setShowCopyFromModal(false)}
      />

      <LoginContainer
        loading={isLoading}
        setIsLoading={setIsLoading}
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
      />
    </div>
  );
};

export default StartRFQ;
