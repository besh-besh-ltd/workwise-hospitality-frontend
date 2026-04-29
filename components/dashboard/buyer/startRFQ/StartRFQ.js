import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { debounce } from "lodash";
import { toast } from "react-toastify";
import {
  ArrowLeft, ArrowRight, Search, Building2, FileText, Gavel,
  Check, Plus, X, FilePlus2, Building, CheckCircle2, Edit3,
  Sparkles, ShoppingBag, Package,
} from "lucide-react";

import { searchProductsV2 } from "@/services/products";
import { getRFQHotels } from "@/services/hospitality";
import { addProductsToDraft, getRecommendedProducts } from "@/services/rfq";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";

import styles from "./StartRFQ.module.scss";

const STEP_LABELS = ["Type", "Business Units", "Products"];

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
  // Each item: { variant_id, name, category_name, product_name }
  const [stagedItems, setStagedItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null); // { rfq_id, count } when shown
  // Explicit advance flag — set true when user clicks Continue on Step 2.
  // Without this, selecting the first BU on Tender would auto-skip to Step 3.
  const [advancedToProducts, setAdvancedToProducts] = useState(false);
  // Recommended products (top 4 based on user history + staged categories + popularity)
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  // Pulse animation flag fired briefly when an item is added — gives instant feedback
  const [justAddedId, setJustAddedId] = useState(null);
  // Tracks variant_ids that were just added — used to show "Added" on the
  // search/recommendation row for ~2s after a click.
  const [justAddedVariants, setJustAddedVariants] = useState({});

  const searchRef = useRef(null);

  // ── Debounced search ──
  const debouncedFetchSuggestions = useRef(
    debounce(async (val, hotelIds) => {
      setSuggestionLoading(true);
      try {
        const rsp = await searchProductsV2(
          { search_key: val.trim(), hotel_ids: hotelIds || [] },
          "products"
        );
        setSuggestions(rsp.data || []);
      } catch (error) {
        console.error("Suggestion fetch failed:", error);
        setSuggestions([]);
      } finally {
        setSuggestionLoading(false);
      }
    }, 300)
  ).current;

  // ── Derived ──
  const isProcurementMode = !!(queryMeta.orderType || queryMeta.rfq_id);
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
    enabled: selectedHotelIds.length > 0 && isProcurementMode,
  });

  const hasWriteAccess = selectedHotelIds.length === 0 || permissionsLoading || canCreate;
  const isReadOnly = selectedHotelIds.length > 0 && !permissionsLoading && canRead && !canCreate;
  const isAccessDenied = selectedHotelIds.length > 0 && !permissionsLoading && !canRead;

  const currentStep = useMemo(() => {
    if (!queryMeta.orderType && !queryMeta.rfq_id) return 1;
    // Existing draft → jump straight to products
    if (queryMeta.rfq_id) return 3;
    // Stay on Step 2 until user clicks Continue (lets Tender pick multiple BUs)
    if (!advancedToProducts) return 2;
    if (selectedHotelIds.length === 0) return 2;
    return 3;
  }, [queryMeta.orderType, queryMeta.rfq_id, selectedHotelIds, advancedToProducts]);

  // ── Click outside on search ──
  useEffect(() => {
    if (!showSuggestions) return;
    const listener = (event) => {
      if (!searchRef.current || searchRef.current.contains(event.target)) return;
      setShowSuggestions(false);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [showSuggestions]);

  // ── Effects ──
  useEffect(() => {
    const { rfq_id, sheet_id, orderType } = router.query;
    const parsedRfqId =
      rfq_id && rfq_id !== "null" && !isNaN(parseInt(rfq_id))
        ? parseInt(rfq_id) : null;
    const parsedSheetId =
      sheet_id && sheet_id !== "null" && !isNaN(parseInt(sheet_id))
        ? parseInt(sheet_id) : null;

    setQueryMeta({ rfq_id: parsedRfqId, sheet_id: parsedSheetId, orderType });

    if (parsedRfqId !== null) {
      getRfqMappedHotels(parsedRfqId);
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

  // Fetch recommendations whenever the staged set or hotel selection changes.
  // Debounced lightly so rapid additions don't trigger many requests.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (selectedHotelIds.length === 0) {
      setRecommendations([]);
      return;
    }
    if (currentStep !== 3) return;

    const stagedVariantIds = stagedItems.map((it) => it.variant_id);
    const handle = setTimeout(async () => {
      setRecommendationsLoading(true);
      try {
        const res = await getRecommendedProducts({
          hotel_ids: selectedHotelIds,
          variant_ids: stagedVariantIds,
          limit: 5,
        });
        const data = res?.data || res;
        setRecommendations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [
    isLoggedIn,
    currentStep,
    JSON.stringify(selectedHotelIds),
    stagedItems.length,
  ]);

  const getRfqMappedHotels = async (rfq_id) => {
    try {
      const response = await getRFQHotels(rfq_id);
      const mappings = response?.data || [];
      setUserHotelMappings(mappings);
      const hotelIds = mappings.map((item) => item.hotel_id);
      setSelectedHotelIds(hotelIds);
    } catch (error) {
      console.error("Error fetching RFQ hotels", error);
    }
  };

  // ── Handlers ──
  const handleOrderTypeSelect = (selectedType) => {
    if (!isLoggedIn) {
      setOpenAuthModal(true);
      return;
    }
    router.replace(
      { pathname: router.pathname, query: { ...router.query, orderType: selectedType } },
      undefined,
      { shallow: true }
    );
    setQueryMeta((prev) => ({ ...prev, orderType: selectedType }));
  };

  // Step-aware back: walk through 3 → 2 → 1 → exit, never jumps to drafts list.
  const handleBack = () => {
    if (currentStep === 3) {
      // Go back to BU selection — keep selected hotels so user can adjust
      setAdvancedToProducts(false);
      setStagedItems([]);
      setSearchProduct("");
      setSuggestions([]);
      return;
    }
    if (currentStep === 2) {
      const { orderType: _o, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
      setQueryMeta((prev) => ({ ...prev, orderType: null }));
      setSelectedHotelIds([]);
      return;
    }
    // step 1 → leave the page entirely
    router.push("/dashboard/buyer/rfq-management");
  };

  const handleSelectHotel = (hotelId) => {
    if (queryMeta.rfq_id) return; // locked when editing existing draft
    if (isTender) {
      // multi-select toggle
      setSelectedHotelIds((prev) =>
        prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
      );
    } else {
      // single-select — clicking a card always selects that one (replaces previous)
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

  // Stage product locally — keeps dropdown open, doesn't filter the suggestion list.
  // Backend is only hit when "Create Draft" is clicked.
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
    // Pulse animation on the new item for instant visual feedback
    setJustAddedId(newId);
    setTimeout(() => setJustAddedId((curr) => (curr === newId ? null : curr)), 800);

    // Show "Added" feedback on the source row for ~1s
    const variantKey = item.variant_id;
    setJustAddedVariants((prev) => ({ ...prev, [variantKey]: Date.now() }));
    setTimeout(() => {
      setJustAddedVariants((prev) => {
        const next = { ...prev };
        delete next[variantKey];
        return next;
      });
    }, 1000);
    // Don't close suggestions — user may want to add more
  };

  const handleRemoveStaged = (id) => {
    setStagedItems((prev) => prev.filter((it) => it.id !== id));
  };

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

      if (!rfq_id) {
        throw new Error("Draft was not created. Please try again.");
      }
      setSuccessData({ rfq_id, count: stagedItems.length });
    } catch (error) {
      console.error("Bulk add failed:", error);
      toast.error("Failed to create draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMoreFromSuccess = () => {
    // Update URL with the new rfq_id so further adds append, then reset staging
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

  // ── Render ──
  return (
    <div className={styles.page}>
      {/* Header — back button on the LEFT for prominence */}
      <div className={styles.pageHeader}>
        <button type="button" className={styles.backBtnLeft} onClick={handleBack}>
          <ArrowLeft size={16} />
          {currentStep === 1 ? "Cancel" : "Back"}
        </button>
        <div className={styles.pageTitleBlock}>
          <h1 className={styles.pageTitle}>
            {queryMeta.rfq_id
              ? `Add products to ${entityLabel}`
              : "Start a new procurement"}
          </h1>
          <p className={styles.pageSubtitle}>
            {queryMeta.rfq_id
              ? `Search and stage products, then create or update your draft.`
              : "Create a Tender or RFQ in 3 simple steps."}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className={styles.progress}>
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          return (
            <React.Fragment key={label}>
              <div
                className={`${styles.progressStep} ${
                  isActive ? styles.progressStepActive : ""
                } ${isDone ? styles.progressStepDone : ""}`}
              >
                <div className={styles.progressCircle}>
                  {isDone ? <Check size={14} strokeWidth={3} /> : stepNum}
                </div>
                <span className={styles.progressLabel}>{label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div
                  className={`${styles.progressBar} ${
                    isDone ? styles.progressBarFilled : ""
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ═══ STEP 1: Type Selection ═══ */}
      {currentStep === 1 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>What would you like to create?</h2>
            <p className={styles.stepDesc}>
              Choose the procurement type that fits your need.
            </p>
          </div>

          <div className={styles.typeGrid}>
            <div
              className={styles.typeCard}
              onClick={() => handleOrderTypeSelect("tender")}
            >
              <div className={styles.typeCardIcon}>
                <Gavel size={22} />
              </div>
              <h3 className={styles.typeCardName}>Tender</h3>
              <p className={styles.typeCardDesc}>
                Formal procurement with multi-level approvals, technical
                evaluation, and award documents. Best for large or strategic
                purchases.
              </p>
              <div className={styles.typeCardFooter}>
                <span className={styles.typeCardTag}>Multi-BU · ARC</span>
                <span className={styles.typeCardArrow}>
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>

            <div
              className={styles.typeCard}
              onClick={() => handleOrderTypeSelect("rfq")}
            >
              <div className={styles.typeCardIcon}>
                <FileText size={22} />
              </div>
              <h3 className={styles.typeCardName}>RFQ</h3>
              <p className={styles.typeCardDesc}>
                Quick quote requests for routine purchases. Send to vendors,
                receive bids, and finalize fast — without heavy approvals.
              </p>
              <div className={styles.typeCardFooter}>
                <span className={styles.typeCardTag}>Single BU · Fast</span>
                <span className={styles.typeCardArrow}>
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </div>

          {!isLoggedIn && (
            <div className={styles.loginHint}>
              You need to be logged in to create a procurement request.{" "}
              <span
                className={styles.loginLink}
                onClick={() => setOpenAuthModal(true)}
              >
                Log in
              </span>
            </div>
          )}

          <div className={styles.guide}>
            <h4 className={styles.guideTitle}>How it works</h4>
            <div className={styles.guideList}>
              <div className={styles.guideItem}>
                <span className={styles.guideNum}>1</span>
                <span className={styles.guideText}>
                  Pick Tender for formal procurement, RFQ for quick quotes
                </span>
              </div>
              <div className={styles.guideItem}>
                <span className={styles.guideNum}>2</span>
                <span className={styles.guideText}>
                  Choose which business units this procurement applies to
                </span>
              </div>
              <div className={styles.guideItem}>
                <span className={styles.guideNum}>3</span>
                <span className={styles.guideText}>
                  Search and add products — vendors are auto-matched
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Business Units ═══ */}
      {currentStep === 2 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <span className={styles.typeBadge}>
              {isTender ? <Gavel size={11} /> : <FileText size={11} />}
              {entityLabel}
            </span>
            <h2 className={styles.stepTitle} style={{ marginTop: 8 }}>
              Select business units
            </h2>
            <p className={styles.stepDesc}>
              {isTender
                ? "Tenders can span multiple business units. Select all that this procurement applies to."
                : "An RFQ applies to a single business unit. Pick the one this procurement is for."}
            </p>
          </div>

          {userHotelMappings.length === 0 ? (
            <div className={styles.huEmpty}>
              <Building size={20} style={{ marginBottom: 8, color: "#cbd5e1" }} />
              <div>You don't have access to any business units yet.</div>
              <div className={styles.addedSubtext}>
                Contact your administrator to get access.
              </div>
            </div>
          ) : (
            <div className={styles.huList}>
              {userHotelMappings.map((m) => {
                const id = m.hospitality_hotel_id || m.hotel_id;
                const isActive = selectedHotelIds.includes(id);
                return (
                  <div
                    key={id}
                    className={`${styles.huItem} ${
                      isActive ? styles.huItemActive : ""
                    }`}
                    onClick={() => handleSelectHotel(id)}
                  >
                    {/* Checkbox only for Tender (multi-select).
                        RFQ uses card-only single-select to avoid misleading UI. */}
                    {isTender && (
                      <div className={styles.huCheck}>
                        {isActive && <Check size={13} strokeWidth={3} />}
                      </div>
                    )}
                    <Building2
                      size={18}
                      style={{
                        color: isActive ? "var(--primary-color, #2E5BA8)" : "#94a3b8",
                        flexShrink: 0,
                      }}
                    />
                    <div className={styles.huInfo}>
                      <div className={styles.huName}>
                        {m.hotel_name || m.name || "Business Unit"}
                      </div>
                      {m.company_name && (
                        <div className={styles.huMeta}>{m.company_name}</div>
                      )}
                    </div>
                    {/* Active radio indicator for RFQ (single-select) */}
                    {!isTender && isActive && (
                      <div className={styles.huActiveDot}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.stepActions}>
            <div />
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={selectedHotelIds.length === 0}
              onClick={() => setAdvancedToProducts(true)}
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Products — 70/30 layout ═══ */}
      {currentStep === 3 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <span className={styles.typeBadge}>
              {isTender ? <Gavel size={11} /> : <FileText size={11} />}
              {entityLabel}
            </span>
            <h2 className={styles.stepTitle} style={{ marginTop: 8 }}>
              Add products
            </h2>
            <p className={styles.stepDesc}>
              Search and add the items you need quotes for.
              {selectedHotelIds.length > 0 &&
                ` ${selectedHotelIds.length} business unit${
                  selectedHotelIds.length > 1 ? "s" : ""
                } selected.`}
            </p>
          </div>

          {/* Permission banners */}
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

          {/* 70/30 grid: Left = search + recommendations, Right = staged products */}
          <div className={styles.productLayout}>
            {/* ── LEFT pane: search + results + recommendations ── */}
            <div className={styles.productLeft}>
              {/* Search input */}
              <div className={styles.searchBox} ref={searchRef}>
                <div className={styles.searchInputWrap}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search products by name (e.g. Pipes, Valves, Flanges...)"
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
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline results panel — replaces the floating dropdown.
                  Always shown when searching; otherwise shows recommendations. */}
              {searchProduct.length > 0 ? (
                <div className={styles.resultsPanel}>
                  <div className={styles.resultsPanelHeader}>
                    <Search size={13} />
                    <span>
                      {searchProduct.length < 3
                        ? "Type at least 3 characters"
                        : suggestionLoading
                        ? "Searching..."
                        : `${suggestions.length} result${suggestions.length === 1 ? "" : "s"} for "${searchProduct}"`}
                    </span>
                  </div>
                  {suggestionLoading ? (
                    <div className={styles.resultsLoading}>
                      <div className={styles.spinner} />
                      <span>Finding products...</span>
                    </div>
                  ) : suggestions.length === 0 && searchProduct.length >= 3 ? (
                    <div className={styles.resultsEmpty}>
                      <Package size={28} style={{ color: "#cbd5e1", marginBottom: 8 }} />
                      <div>No products match "{searchProduct}"</div>
                      <div className={styles.resultsEmptyHint}>
                        Try a different keyword or category name.
                      </div>
                    </div>
                  ) : (
                    <div className={styles.resultsList}>
                      {suggestions.map((item, idx) => {
                        const noVendors =
                          item.vendor_count !== undefined &&
                          parseInt(item.vendor_count) === 0;
                        const wasAdded = !!justAddedVariants[item.variant_id];
                        return (
                          <div
                            key={`${item.variant_id}-${idx}`}
                            className={`${styles.resultItem} ${
                              noVendors ? styles.resultItemNoVendors : ""
                            } ${wasAdded ? styles.resultItemAdded : ""}`}
                            onClick={() => handleSuggestionClick(item)}
                          >
                            <div className={styles.resultIcon}>
                              <Package size={16} />
                            </div>
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
                            {noVendors ? (
                              <span className={styles.noVendorsBadge}>
                                No vendors
                              </span>
                            ) : wasAdded ? (
                              <span className={`${styles.addPillBtn} ${styles.addPillBtnAdded}`}>
                                <Check size={13} strokeWidth={3} /> Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={styles.addPillBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSuggestionClick(item);
                                }}
                              >
                                <Plus size={13} /> Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Recommendations — shown when search is empty */
                <div className={styles.resultsPanel}>
                  <div className={styles.resultsPanelHeader}>
                    <Sparkles size={13} className={styles.recIcon} />
                    <span>Recommended for you</span>
                    <span className={styles.recHint}>
                      Based on your history{stagedItems.length > 0 ? " & selected items" : ""}
                    </span>
                  </div>
                  {recommendationsLoading ? (
                    <div className={styles.resultsLoading}>
                      <div className={styles.spinner} />
                      <span>Finding recommendations...</span>
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className={styles.resultsEmpty}>
                      <Sparkles size={28} style={{ color: "#cbd5e1", marginBottom: 8 }} />
                      <div>No recommendations yet</div>
                      <div className={styles.resultsEmptyHint}>
                        Start by searching products above. As you add items, we'll
                        suggest related products based on your history.
                      </div>
                    </div>
                  ) : (
                    <div className={styles.resultsList}>
                      {recommendations.map((item, idx) => {
                        const noVendors =
                          item.vendor_count !== undefined &&
                          parseInt(item.vendor_count) === 0;
                        const wasAdded = !!justAddedVariants[item.variant_id];
                        return (
                          <div
                            key={`rec-${item.variant_id}-${idx}`}
                            className={`${styles.resultItem} ${styles.resultItemRec} ${
                              noVendors ? styles.resultItemNoVendors : ""
                            } ${wasAdded ? styles.resultItemAdded : ""}`}
                            onClick={() => handleSuggestionClick(item)}
                          >
                            <div className={styles.resultIconRec}>
                              <Sparkles size={14} />
                            </div>
                            <div className={styles.resultMain}>
                              <div className={styles.resultName}>
                                {item.variant_name || item.product_name}
                              </div>
                              {item.category_name && (
                                <div className={styles.resultMeta}>
                                  {item.category_name}
                                </div>
                              )}
                            </div>
                            {noVendors ? (
                              <span className={styles.noVendorsBadge}>No vendors</span>
                            ) : wasAdded ? (
                              <span className={`${styles.addPillBtn} ${styles.addPillBtnAdded}`}>
                                <Check size={13} strokeWidth={3} /> Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={styles.addPillBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSuggestionClick(item);
                                }}
                              >
                                <Plus size={13} /> Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT pane: staged products + sticky CTA ── */}
            <aside className={styles.productRight}>
              <div className={styles.stagedHeader}>
                <ShoppingBag size={14} />
                <span className={styles.stagedTitle}>Your selection</span>
                <span className={styles.stagedCount}>{stagedItems.length}</span>
              </div>

              <div className={styles.stagedBody}>
                {stagedItems.length > 0 ? (
                  <div className={styles.stagedList}>
                    {stagedItems.map((it) => (
                      <div
                        key={it.id}
                        className={`${styles.stagedItem} ${
                          justAddedId === it.id ? styles.stagedItemAdded : ""
                        }`}
                      >
                        <span className={styles.stagedDot}>
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <div className={styles.stagedItemInfo}>
                          <div className={styles.stagedItemName}>{it.name}</div>
                          {it.category_name && (
                            <div className={styles.stagedItemCat}>
                              {it.category_name}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRemoveStaged(it.id)}
                          aria-label="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.stagedEmpty}>
                    <ShoppingBag
                      size={28}
                      style={{ color: "#cbd5e1", marginBottom: 8 }}
                    />
                    <div className={styles.stagedEmptyTitle}>No products yet</div>
                    <div className={styles.stagedEmptyDesc}>
                      Search or pick from recommendations to add products.
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.stagedFooter}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={stagedItems.length === 0 || submitting}
                  onClick={handleCreateDraft}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {submitting
                    ? "Creating draft..."
                    : queryMeta.rfq_id
                    ? `Add ${stagedItems.length} to draft`
                    : `Create draft (${stagedItems.length})`}
                  {!submitting && <ArrowRight size={14} />}
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Success modal — minimal, clean confirmation */}
      {successData && (
        <div
          className={styles.successOverlay}
          onClick={() => setSuccessData(null)}
        >
          <div
            className={styles.successCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.successClose}
              onClick={() => setSuccessData(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className={styles.successAccent} />

            <div className={styles.successHeader}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={22} strokeWidth={2} />
              </div>
              <div className={styles.successHeaderText}>
                <h3 className={styles.successTitle}>Draft saved</h3>
                <p className={styles.successDesc}>
                  {successData.count} product{successData.count > 1 ? "s" : ""}{" "}
                  added to your {entityLabel.toLowerCase()} draft.
                </p>
              </div>
            </div>

            <div className={styles.successDivider} />

            <p className={styles.successPrompt}>What would you like to do next?</p>

            <div className={styles.successActions}>
              <button
                type="button"
                className={styles.successBtnSecondary}
                onClick={handleAddMoreFromSuccess}
              >
                <Plus size={14} />
                <span>Add More</span>
              </button>
              <button
                type="button"
                className={styles.successBtnPrimary}
                onClick={handleEditDraft}
              >
                <span>Edit Draft</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

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
