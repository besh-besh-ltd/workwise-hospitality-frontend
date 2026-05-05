import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BsClipboardData,
  BsFileText,
  BsBuilding,
  BsSearch,
  BsArrowRight,
} from "react-icons/bs";
import { searchProductsV2 } from "@/services/products";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import { debounce } from "lodash";
import { getRFQHotels } from "@/services/hospitality";
import { useSelector } from "react-redux";
import AddTenderItemModal from "@/components/modal/AddTenderItemModal";
import ContractedItemModal from "@/components/dashboard/buyer/editRFQ/ContractedItemModal";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ProcurementHeader from "./ProcurementHeader";
import ProductSearch from "./ProductSearch";
import styles from "./Search.module.css";

const GUIDE_STEPS = [
  {
    num: 1,
    icon: <BsClipboardData size={22} />,
    title: "Choose Procurement Type",
    desc: "Select Tender for large procurements requiring formal approvals, or RFQ for routine purchases and quick vendor quotes.",
  },
  {
    num: 2,
    icon: <BsBuilding size={22} />,
    title: "Select Business Units",
    desc: "Choose the hotels or business units this procurement applies to. Products and vendors are matched per unit.",
  },
  {
    num: 3,
    icon: <BsSearch size={22} />,
    title: "Search & Add Products",
    desc: "Search products by name, select items to add them to your draft. Vendors are automatically matched and added.",
  },
];

const Search = ({ title, type }) => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const { loggedin } = router.query;

  // ── State ───────────────────────────────────
  const [open, setOpen] = useState({ input: false });
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [queryMeta, setQueryMeta] = useState({
    rfq_id: null,
    sheet_id: null,
    orderType: null,
  });
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [openTenderItemModal, setOpenTenderItemModal] = useState(false);
  const [tenderProduct, setTenderProduct] = useState(null);
  // Phase 6: when the buyer clicks a suggestion that is already covered
  // by an active ARC, open the ContractedItemModal first so they can
  // route to the release-PO flow or explicitly bypass via RFQ override.
  const [contractedItem, setContractedItem] = useState(null);

  // ── Refs ────────────────────────────────────
  const searchRef = useRef(null);

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

  // ── Derived State ───────────────────────────
  const isProcurementMode = !!(queryMeta.orderType || queryMeta.rfq_id);

  // ── Permissions ────────────────────────────
  const moduleKey = queryMeta.orderType === "tender" ? "boq" : "rfq";
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
    if (selectedHotelIds.length === 0) return 2;
    return 3;
  }, [queryMeta.orderType, queryMeta.rfq_id, selectedHotelIds]);

  // ── Click Outside ───────────────────────────
  function useClickOutside(ref, handler, active = true) {
    useEffect(() => {
      if (!active) return;
      const listener = (event) => {
        if (!ref.current || ref.current.contains(event.target)) return;
        handler(event);
      };
      document.addEventListener("mousedown", listener);
      return () => document.removeEventListener("mousedown", listener);
    }, [ref, handler, active]);
  }

  useClickOutside(
    searchRef,
    () => setOpen({ ...open, input: false }),
    open.input
  );

  // ── Effects ─────────────────────────────────

  // Parse query params
  useEffect(() => {
    const { rfq_id, sheet_id, orderType } = router.query;

    const parsedRfqId =
      rfq_id && rfq_id !== "null" && !isNaN(parseInt(rfq_id))
        ? parseInt(rfq_id)
        : null;
    const parsedSheetId =
      sheet_id && sheet_id !== "null" && !isNaN(parseInt(sheet_id))
        ? parseInt(sheet_id)
        : null;

    setQueryMeta({ rfq_id: parsedRfqId, sheet_id: parsedSheetId, orderType });

    if (parsedRfqId !== null) {
      getRfqMappedHotels(parsedRfqId);
    }
  }, [router.query]);

  // Auth & hotel mappings
  useEffect(() => {
    if (localStorage.getItem("token")) {
      setIsLoggedIn(true);
      getUSerMappedHotelsAndCompanies();
    }
    if (redirectAfterLogin) {
      router.push(redirectAfterLogin);
    }
    setRedirectAfterLogin(null);
  }, [router, loggedin]);

  // ── API Functions ───────────────────────────
  const getUSerMappedHotelsAndCompanies = () => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(
      (m) => m.hospitality_hotel_id != null
    );
    setUserHotelMappings(mappings);
  };

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

  // ── Handlers ────────────────────────────────
  const handleOrderTypeSelect = (selectedType) => {
    if (!isLoggedIn) {
      setOpenAuthModal(true);
      return;
    }
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, orderType: selectedType },
      },
      undefined,
      { shallow: true }
    );
    setQueryMeta((prev) => ({ ...prev, orderType: selectedType }));
  };

  const addRfqIdParam = (rfq_id) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, rfq_id },
      },
      undefined,
      { shallow: true }
    );
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchProduct(val);

    if (
      (queryMeta.orderType === "tender" || queryMeta.orderType === "rfq") &&
      selectedHotelIds.length === 0
    ) {
      debouncedFetchSuggestions.cancel();
      setSuggestions([]);
      if (val.length > 2) {
        setOpen({ ...open, input: true });
      }
      return;
    }

    if (val.length > 2) {
      debouncedFetchSuggestions(val, selectedHotelIds);
      setOpen({ ...open, input: true });
    } else {
      debouncedFetchSuggestions.cancel();
      setSuggestions([]);
    }
  };

  const handleAutocompleteClick = (item) => {
    if (
      queryMeta.orderType &&
      !queryMeta.rfq_id &&
      selectedHotelIds.length === 0
    ) {
      toast.info(
        queryMeta.orderType === "rfq"
          ? "Please select a business unit before choosing products."
          : "Please select business unit(s) before choosing products."
      );
      return;
    }

    if (!hasWriteAccess) {
      toast.warn("Only members with write permissions can add products.");
      return;
    }

    // Phase 6: contracted item — route through the dedicated modal so
    // the buyer makes an explicit choice (release PO vs bypass-and-RFQ)
    // instead of silently adding it to the draft.
    if (item.arc_info?.is_under_arc) {
      setContractedItem(item);
      setOpen((prev) => ({ ...prev, input: false }));
      return;
    }

    setTenderProduct({
      name: item.variant_name || item.product_name,
      variant_id: item.variant_id,
    });
    setOpenTenderItemModal(true);
    setOpen((prev) => ({ ...prev, input: false }));
  };

  // Branch 1 of ContractedItemModal: jump to the ARC release flow.
  // Phase 7 will land the actual release wizard route; for now we route
  // the user to the ARC release entry point with the contracted item
  // pre-selected. The release page will gracefully degrade if that
  // route isn't deployed yet.
  const handleCreatePoFromContract = () => {
    if (!contractedItem) return;
    const arc = contractedItem.arc_info?.arcs?.[0];
    if (!arc) {
      toast.warn("No active contract found for this item.");
      setContractedItem(null);
      return;
    }
    const params = new URLSearchParams({
      arc_id: String(arc.arc_id),
      arc_item_id: String(arc.arc_item_id),
      hotel_id: String(arc.hotel_id),
    });
    setContractedItem(null);
    router.push(`/dashboard/buyer/arc-release/new?${params.toString()}`);
  };

  // Branch 2 of ContractedItemModal: continue with an open-market RFQ.
  // Phase 8 will capture the bypass-ARC reason; for now we proceed to
  // the existing add-tender-item flow but tag the product so the
  // downstream save can prompt for the reason.
  const handleContinueWithRfq = () => {
    if (!contractedItem) return;
    const item = contractedItem;
    setContractedItem(null);
    setTenderProduct({
      name: item.variant_name || item.product_name,
      variant_id: item.variant_id,
      __bypass_arc_pending: true,
    });
    setOpenTenderItemModal(true);
  };

  // ── Render ──────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ═══ Order Type Selection ═══ */}
      {!isProcurementMode && (
        <>
          <div className={styles.typeSelector}>
            <div className={styles.typeSelectorInner}>
              <h1 className={styles.typeSelectorTitle}>
                What would you like to create?
              </h1>
              <p className={styles.typeSelectorSubtitle}>
                Choose your procurement type to get started
              </p>
              <div className={styles.typeCards}>
                <div
                  className={styles.typeCard}
                  onClick={() => handleOrderTypeSelect("tender")}
                >
                  <div className={styles.typeIcon}>
                    <BsClipboardData size={26} />
                  </div>
                  <h2 className={styles.typeTitle}>Tender</h2>
                  <p className={styles.typeDesc}>
                    Best for large procurements that require multi-level
                    approvals and formal vendor evaluation
                  </p>
                  <div className={styles.typeCardArrow}>
                    <BsArrowRight size={16} />
                  </div>
                </div>
                <div
                  className={styles.typeCard}
                  onClick={() => handleOrderTypeSelect("rfq")}
                >
                  <div className={styles.typeIcon}>
                    <BsFileText size={26} />
                  </div>
                  <h2 className={styles.typeTitle}>RFQ</h2>
                  <p className={styles.typeDesc}>
                    Quick quotes from vendors for smaller purchases and routine
                    procurement needs
                  </p>
                  <div className={styles.typeCardArrow}>
                    <BsArrowRight size={16} />
                  </div>
                </div>
              </div>
              {!isLoggedIn && (
                <p className={styles.loginHint}>
                  Please{" "}
                  <span
                    className={styles.loginHintLink}
                    onClick={() => setOpenAuthModal(true)}
                  >
                    log in
                  </span>{" "}
                  to start creating procurement requests
                </p>
              )}
            </div>
          </div>

          {/* How It Works Guide */}
          <div className={styles.guideSection}>
            <h3 className={styles.guideSectionTitle}>How It Works</h3>
            <p className={styles.guideSectionSubtitle}>
              Create your procurement request in 3 simple steps
            </p>
            <div className={styles.guideCards}>
              {GUIDE_STEPS.map((step) => (
                <div className={styles.guideCard} key={step.num}>
                  <div className={styles.guideCardIcon}>{step.icon}</div>
                  <div className={styles.guideCardContent}>
                    <div className={styles.guideCardNum}>Step {step.num}</div>
                    <h4 className={styles.guideCardTitle}>{step.title}</h4>
                    <p className={styles.guideCardDesc}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ Procurement Mode (type selected or existing draft) ═══ */}
      {isProcurementMode && (
        <>
          <ProcurementHeader
            currentStep={currentStep}
            orderType={queryMeta.orderType}
            selectedHotelIds={selectedHotelIds}
            userHotelMappings={userHotelMappings}
            queryMeta={queryMeta}
            onHotelChange={setSelectedHotelIds}
            isLoading={isLoading}
            disableHotelSelect={!!queryMeta.rfq_id}
          />

          {isAccessDenied && (
            <div style={{ padding: '0 clamp(16px, 3vw, 40px)', marginBottom: 16 }}>
              <AccessDeniedPage showBackButton={false} />
            </div>
          )}

          {isReadOnly && !isAccessDenied && (
            <div style={{ padding: '0 clamp(16px, 3vw, 40px)', marginBottom: 16 }}>
              <ReadOnlyBanner
                title="View Only Mode"
                message="You have read-only access for the selected business units. Only members with create permissions can add products."
              />
            </div>
          )}

          {(
            <ProductSearch
              searchProduct={searchProduct}
              onSearchChange={handleSearchChange}
              suggestions={suggestions}
              suggestionLoading={suggestionLoading}
              isOpen={open.input}
              onSuggestionClick={handleAutocompleteClick}
              onClose={() => setOpen({ ...open, input: false })}
              searchRef={searchRef}
              readOnly={isReadOnly || isAccessDenied}
              showHotelWarning={
                (queryMeta.orderType === "tender" ||
                  queryMeta.orderType === "rfq") &&
                selectedHotelIds.length === 0
              }
            />
          )}

        </>
      )}

      {/* ═══ Modals ═══ */}
      <AddTenderItemModal
        open={openTenderItemModal}
        onClose={() => setOpenTenderItemModal(false)}
        product={tenderProduct}
        rfqId={queryMeta.rfq_id}
        addRfqIdParam={addRfqIdParam}
        hotelIds={selectedHotelIds}
        isTender={queryMeta.orderType === "tender"}
      />

      <ContractedItemModal
        isOpen={!!contractedItem}
        onClose={() => setContractedItem(null)}
        product={contractedItem}
        arcs={contractedItem?.arc_info?.arcs || []}
        onCreatePoDirectly={handleCreatePoFromContract}
        onContinueWithRfq={handleContinueWithRfq}
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

export default Search;
