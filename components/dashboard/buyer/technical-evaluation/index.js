import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { useRouter } from "next/router";
import { getRfqs, fetchVendorSelectionOption, getAllClauses, getRFQById, submitTechEvalForApproval } from "@/services/rfq";
import { getUserDetails as getAuthUser } from "@/services/Auth";
import { useSelector } from "react-redux";
import ClauseProductItem from "./ClauseProductItem";
import { toast } from "react-toastify";
import Select from 'react-select';
import { formatDisplayDate, formatRFQNumber, getEntityLabel, checkBidExpired } from "@/utils/sharedFunctions";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import { Badge, Modal, Form } from "react-bootstrap";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import EvaluationProgressTracker from "./EvaluationProgressTracker";
import UnifiedSubmitForApproval from "./UnifiedSubmitForApproval";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import useIsMobile from "@/hooks/useIsMobile";
import { BsBuilding, BsPerson, BsEnvelope, BsTelephone, BsCalendar3, BsGeoAlt, BsHouse, BsArrowRepeat, BsClipboardCheck, BsBoxArrowUpRight, BsTag, BsChatLeftText, BsList, BsChevronDown } from "react-icons/bs";
import styles from "./TechnicalEvaluation.module.scss";



const BuyerTechnicalEvaluation = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const isMobile = useIsMobile();
  const reduxUserProfile = useSelector((state) => state.userProfile);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rfq_id, setRfqId] = useState(router.query.rfq_id || null);
  const activeRfqRef = useRef(rfq_id); // Track active rfq_id to prevent stale updates
  const [loading, setLoading] = useState(false); // sidebar RFQ list loading only
  const [contentLoading, setContentLoading] = useState(false); // right section loading

  // Sync rfq_id from URL on initial load / browser back-forward
  useEffect(() => {
    const queryRfqId = router.query.rfq_id || null;
    if (queryRfqId && queryRfqId !== rfq_id) {
      setRfqId(queryRfqId);
    }
  }, [router.query.rfq_id]);

  // Handle sidebar RFQ click — update state + URL silently (no route events)
  const handleRfqSelect = (id) => {
    const newId = String(id);
    if (newId === String(rfq_id)) return; // Already selected
    setRfqId(newId);
    // Update URL without triggering route events
    const url = `/dashboard/buyer/technical-evaluation?rfq_id=${newId}`;
    window.history.replaceState({ ...window.history.state, url, as: url }, '', url);
  };
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setcurrentRfq] = useState(null);
  const [vendorMap, setVendorMap] = useState(new Map());
  const [clauseMap, setClauseMap] = useState(null);
  const [rfqNo, setRfqNo] =useState(null);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [clauseInfo, setClauseInfo] = useState(null);
  const [selectedVendorsMap, setSelectedVendorsMap] = useState(new Map());
  const [isTenderFilter, setIsTenderFilter] = useState(null);
  const [quotedVendorsOnly, setQuotedVendorsOnly] = useState(true);
  const [productEvaluationStatus, setProductEvaluationStatus] = useState(new Map());
  const [showUnifiedSubmitModal, setShowUnifiedSubmitModal] = useState(false);
  const [unifiedSubmitLoading, setUnifiedSubmitLoading] = useState(false);
  const [rfqCompletionMap, setRfqCompletionMap] = useState(new Map());
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const toggleProductExpand = (productId) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  // Extract hotel IDs for permission checks - use hotel_id from RFQ data
  const hotelIds = useMemo(() => {
    if (currentRfq) {
      // Primary: use hotel_id from RFQ (technical evaluation has single hotel)
      if (currentRfq.hotel_id !== undefined && currentRfq.hotel_id !== null) {
        return [currentRfq.hotel_id];
      }
      // Alternative: try hospitality_hotel_id field
      if (currentRfq.hospitality_hotel_id !== undefined && currentRfq.hospitality_hotel_id !== null) {
        return [currentRfq.hospitality_hotel_id];
      }
      // Alternative: try mappedHotels array
      if (currentRfq.mappedHotels && currentRfq.mappedHotels.length > 0) {
        const ids = currentRfq.mappedHotels.map(h => h.hotel_id || h.hospitality_hotel_id).filter(id => id !== undefined && id !== null);
        if (ids.length > 0) return ids;
      }
    }
    // Fallback: use user's hotel mappings if available
    if (userHotelMappings && userHotelMappings.length > 0) {
      return userHotelMappings.map(h => h.hospitality_hotel_id).filter(id => id !== undefined && id !== null);
    }
    return [];
  }, [currentRfq, userHotelMappings]);

  // Permission hook for technical evaluation module
  // Always enabled when RFQ is selected - API will handle empty hotelIds gracefully
  const {
    canRead,
    canUpdate,
    canCreate,
    canApprove,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: "te",
    hotelIds: hotelIds,
    departmentId: currentRfq?.department_id || null,
    enabled: !!currentRfq,
  });

  // For technical evaluation, "write" access means either update OR create permission
  const canWrite = canUpdate || canCreate;

  // Track if we've verified permissions for the current RFQ
  const [permissionsVerified, setPermissionsVerified] = useState(false);

  const fetchUserHotelMappings = () => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(m => m.hospitality_hotel_id != null);
    setUserHotelMappings(mappings);
  }

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);
  }

  const filtersInitialized = useRef(false);
  useEffect(() => {
    // Skip the first run — mount useEffect already fetches the list
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    const handler = setTimeout(() => {
      getTechEvaluationRFQsByUser();
    }, 500);
    return () => clearTimeout(handler);
  }, [rfqNo, isTenderFilter]);

  const getUserDetails = () => {
    // Prefer Redux persisted profile (populated from /users/get-profile API with correct DB id)
    // Fall back to JWT decode only if Redux profile is unavailable
    if (reduxUserProfile && reduxUserProfile.id) {
      setcurrentUserProfile(reduxUserProfile);
    } else {
      const user = getAuthUser();
      if (user) {
        setcurrentUserProfile({ id: user.sub, name: user.name, ...user });
      }
    }
  };

  const getTechEvaluationRFQsByUser = async () => {
    try {
      setLoading(true);
      const res = await getRfqs({
        tech_eval: true,
        page: 1,
        limit: 100,
        rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
        sort: 'DESC',
        is_tender: isTenderFilter !== null ? (isTenderFilter === '1' || isTenderFilter === 1) : null,
        module_keys: "technical"
      });
      const newData = Array.isArray(res) ? res : [];
      setRfqList(newData);
    } catch (error) {
      console.error("Error fetching technical evaluation RFQs:", error);
    } finally {
      setLoading(false);
    }
  };


  const getVendorSelectionOption = async (rfq_product_id) => {
    if (!rfq_product_id) return [];
    const payload = {
      rfq_id,
      rfq_product_id
    };

    try {
      const res = await fetchVendorSelectionOption(payload);
      return res.data.map((vendor) => ({
        value: vendor.vendor_id,
        // Use anonymized vendor code instead of vendor name
        label: vendor.rfq_product_vendor_id ? `VEN-${vendor.rfq_product_vendor_id}` : `Vendor ${vendor.vendor_id}`,
      }));
    } catch (error) {
      console.error("Error fetching vendor options:", error);
      return [];
    }
  };

  // Stage 1: Fetch RFQ metadata for permission context (lightweight, no sensitive data)
  const fetchRFQMetadata = async () => {
    if (!rfq_id) {
      setcurrentRfq(null);
      setPermissionsVerified(false);
      setContentLoading(false);
      return;
    }

    const requestId = rfq_id; // Capture for stale check
    activeRfqRef.current = requestId;

    try {
      setContentLoading(true);
      setClauseInfo(null); // Clear previous evaluation data immediately
      setExpandedProducts(new Set());
      setProductEvaluationStatus(new Map());
      const rfqDetailsRes = await getRFQById(rfq_id);

      // Stale check — if user clicked another RFQ while this was loading, discard
      if (activeRfqRef.current !== requestId) return;

      const selectedRfq = Array.isArray(rfqDetailsRes.data) ? rfqDetailsRes.data[0] : rfqDetailsRes.data;

      if (!selectedRfq) {
        console.error('No RFQ found for ID:', rfq_id);
        setcurrentRfq(null);
        setContentLoading(false);
        return;
      }

      // Set RFQ data for permission context (hotel_id is needed for permission check)
      setcurrentRfq(selectedRfq);
      setPermissionsVerified(false); // Reset when RFQ changes
    } catch (error) {
      if (activeRfqRef.current !== requestId) return; // Stale — ignore
      console.log(error);
      toast.error(error.message || `Failed to load ${getEntityLabel(currentRfq?.is_tender)} details`);
      setcurrentRfq(null);
      setContentLoading(false);
    }
    // Note: contentLoading stays true — cleared by fetchEvaluationData or permission denial
  };

  // Stage 2: Fetch full clause/evaluation data only after permissions verified
  const fetchEvaluationData = async () => {
    if (!rfq_id || !currentRfq) return;

    const requestId = rfq_id; // Capture for stale check

    try {
      setContentLoading(true);
      const res = await getAllClauses(rfq_id, "tech_evaluation");

      // Stale check — if user switched RFQ while this was loading, discard
      if (activeRfqRef.current !== requestId) return;

      setClauseInfo(res?.data ?? null);

      const vMap = new Map();
      currentRfq?.products?.map((prodItem) => {
        vMap.set(prodItem.id, null);
      });

      let c_map = new Map();
      currentRfq?.products?.map((pItem) => {
        c_map.set(pItem.id, false);
      });

      res.data?.map((pItem) => {
        c_map.set(pItem.rfq_product_id, true);
      });

      setVendorMap(vMap);
      setClauseMap(c_map);

      // Auto-expand the first product
      if (res.data?.length > 0) {
        const firstProductId = res.data[0].rfq_product_id;
        const firstProduct = currentRfq?.products?.find(p => p.id == firstProductId);
        if (firstProduct) {
          setExpandedProducts(new Set([firstProduct.id]));
        }
      }
    } catch (error) {
      if (activeRfqRef.current !== requestId) return; // Stale — ignore
      console.log(error);
      toast.error(error.message || 'Failed to load evaluation data');
    } finally {
      if (activeRfqRef.current === requestId) {
        setPermissionsVerified(true);
        setContentLoading(false);
      }
    }
  };

  // Handler for evaluation status changes from child components
  const handleEvaluationStatusChange = (productId, status) => {
    setProductEvaluationStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(productId, status);
      return newMap;
    });
  };

  // Bid end date must have passed before evaluation/submission is allowed
  const isBidExpired = useMemo(() => {
    return currentRfq?.bid_end_date ? checkBidExpired(currentRfq.bid_end_date) : false;
  }, [currentRfq?.bid_end_date]);

  // Check if all products are fully evaluated
  const areAllProductsEvaluated = useMemo(() => {
    if (!clauseInfo || clauseInfo.length === 0) return false;

    // Get all product IDs that have clauses
    const productIds = clauseInfo.map(item => item.rfq_product_id);

    // Check if all products are fully evaluated
    return productIds.every(productId => {
      const status = productEvaluationStatus.get(productId);
      return status?.isFullyEvaluated && !status?.isPendingApproval;
    });
  }, [clauseInfo, productEvaluationStatus]);

  // Check if any product has pending approval
  const hasAnyPendingApproval = useMemo(() => {
    const statuses = Array.from(productEvaluationStatus.values());
    return statuses.some(status => status?.isPendingApproval);
  }, [productEvaluationStatus]);

  // Check vendor count constraint (at most 5 vendors)
  const vendorCountValid = useMemo(() => {
    if (!clauseInfo || clauseInfo.length === 0) return true;

    // Check each product has at most 5 vendors evaluated
    return clauseInfo.every(rfqProduct => {
      const vendors = rfqProduct?.vendors || [];
      const evaluatedVendors = vendors.filter(v => v.has_marks);
      return evaluatedVendors.length > 0 && evaluatedVendors.length <= 5;
    });
  }, [clauseInfo]);

  // Count how many products have at least one vendor fully evaluated (all clauses scored)
  // Uses productEvaluationStatus from child components which checks score_timestamp on every clause
  const evaluatedProductCount = useMemo(() => {
    if (!clauseInfo || clauseInfo.length === 0) return 0;
    let count = 0;
    for (const [, status] of productEvaluationStatus) {
      if (status?.evaluatedVendorCount > 0) count++;
    }
    return count;
  }, [clauseInfo, productEvaluationStatus]);

  // Unified submit handler for all products
  const handleUnifiedSubmitForApproval = async () => {
    if (!currentRfq || !clauseInfo || !isBidExpired) return;

    try {
      setUnifiedSubmitLoading(true);

      // Only submit products that have at least one vendor fully evaluated (all clauses scored)
      const evaluatedProducts = clauseInfo.filter(rfqProduct => {
        const status = productEvaluationStatus.get(rfqProduct.rfq_product_id);
        return status?.evaluatedVendorCount > 0;
      });

      if (evaluatedProducts.length === 0) {
        toast.error("No products have been fully evaluated yet. Score all clauses for at least one vendor per product.");
        return;
      }

      const promises = evaluatedProducts.map(async (rfqProduct) => {
        const payload = {
          rfq_id: parseInt(rfq_id),
          rfq_product_id: rfqProduct.rfq_product_id,
          is_tender: currentRfq?.is_tender === 1,
        };
        return await submitTechEvalForApproval(payload);
      });

      await Promise.all(promises);

      toast.success(`${evaluatedProducts.length} product(s) submitted for approval successfully!`);
      setShowUnifiedSubmitModal(false);

      // Refresh data
      await fetchEvaluationData();
    } catch (error) {
      toast.error(error?.message || "Failed to submit for approval");
    } finally {
      setUnifiedSubmitLoading(false);
    }
  };

  useEffect(() => {
    getUserDetails();
    getTechEvaluationRFQsByUser();
    fetchUserHotelMappings();
  }, []);

  // Stage 1: Fetch RFQ metadata when rfq_id changes
  useEffect(() => {
    fetchRFQMetadata();
  }, [rfq_id]); // rfq_id is now a state variable, guaranteed to trigger

  // Stage 2: Fetch full evaluation data only when we have confirmed read access
  // IMPORTANT: No else branch — never make "denied" decisions here because
  // canRead can be stale (from previous RFQ) when this fires.
  // Access denial is handled purely by isAccessDenied in the JSX.
  useEffect(() => {
    if (rfq_id && currentRfq && !permissionsLoading && canRead && !permissionsVerified) {
      fetchEvaluationData();
    }
  }, [rfq_id, currentRfq, permissionsLoading, canRead, permissionsVerified]);

  // Access Denied check - show when user has no read permission
  // Only check when an RFQ is selected and we have permission context
  const hasPermissionContext = hotelIds.length > 0 && !!currentRfq;
  const isAccessDenied = hasPermissionContext && !permissionsLoading && !canRead;

  // Inline loading state — shown inside the content area, sidebar stays visible
  // When access is denied, stop the loader so the AccessDenied banner can show
  // Use rfq_id check so loader shows immediately on click (before currentRfq is fetched)
  const isContentLoading = !!rfq_id && (permissionsLoading || (contentLoading && !isAccessDenied));

  const entityLabel = getEntityLabel(currentRfq?.is_tender);

  // Build metadata items for the RFQ header grid
  const getMetaItems = () => {
    if (!currentRfq) return [];
    const items = [
      { icon: <BsBuilding size={14} />, label: "Company", value: currentRfq.company_name },
      { icon: <BsPerson size={14} />, label: "Contact Person", value: currentRfq.contact_name },
      { icon: <BsEnvelope size={14} />, label: "Response Email", value: currentRfq.response_email },
      { icon: <BsTelephone size={14} />, label: "Contact Number", value: currentRfq.contact_number },
      { icon: <BsCalendar3 size={14} />, label: "Submission Deadline", value: formatDisplayDate(currentRfq.bid_end_date, { includeTime: true }) },
    ];
    if (currentRfq.location && currentRfq.location != "") {
      items.push({ icon: <BsGeoAlt size={14} />, label: "Delivery Location", value: currentRfq.location });
    }
    if (currentRfq?.hotel_name) {
      items.push({ icon: <BsHouse size={14} />, label: "Business Unit", value: currentRfq.hotel_name });
    }
    if (currentRfq.is_tender !== 1 && currentRfq.rfq_type && currentRfq.rfq_type != "") {
      items.push({ icon: <BsTag size={14} />, label: "RFQ Type", value: currentRfq.rfq_type });
    }
    items.push({ icon: <BsArrowRepeat size={14} />, label: "Reverse Auction", value: currentRfq.reverse_auction == 1 ? "Enabled" : "Disabled" });
    if (currentRfq.comment && currentRfq.comment != "") {
      items.push({ icon: <BsChatLeftText size={14} />, label: "Comment", value: currentRfq.comment });
    }
    return items;
  };

  return (
    <>
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Technical Evaluation</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className={styles.layoutRow}>

            {/* RFQ List */}
              {isMobile && (
                <button className={styles.mobileSidebarToggle} onClick={() => setSidebarOpen(true)}>
                  <BsList size={18} /> Select RFQ
                </button>
              )}
              <RFQListSidebar
                title="Technical Evaluation"
                mobileOpen={isMobile ? sidebarOpen : undefined}
                onMobileClose={() => setSidebarOpen(false)}
                rfqList={rfqList}
                loading={loading}
                selectedRfqId={rfq_id}
                onItemClick={handleRfqSelect}
                linkPrefix="/dashboard/buyer/technical-evaluation"
                linkQueryKey="rfq_id"
                tabs={[
                  {
                    key: 'action_required',
                    label: 'Action Required',
                    filter: (item) => item.has_pending_evaluation || item.te_approval_rejected || item.approval_required,
                  },
                  {
                    key: 'in_progress',
                    label: 'In Progress',
                    filter: (item) => !item.has_pending_evaluation && !item.te_approval_rejected
                      && !item.approval_required && item.has_pending_te_approval,
                  },
                  { key: 'all', label: 'All', filter: null },
                ]}
                defaultTab="action_required"
                rfqNo={rfqNo}
                onRfqNoChange={(val) => setRfqNo(val)}
                searchPlaceholder="Search by number..."
                userHotelMappings={userHotelMappings}
                selectedHotelIds={selectedHotelIds}
                onHotelSelectionChange={handleHotelSelectionChange}
                showTypeFilter={true}
                isTenderFilter={isTenderFilter}
                onTenderFilterChange={(val) => setIsTenderFilter(val)}
                getItemTags={(item, isSelected) => {
                  if (isSelected) return [];
                  if (item.te_approval_rejected) return [{ label: 'Evaluation Rejected', variant: 'danger' }];
                  if (item.approval_required) return [{ label: 'Approval Pending', variant: 'warning' }];
                  if (item.has_pending_te_approval) return [{ label: 'In Approval', variant: 'info' }];
                  if (item.te_completed === true) return [{ label: 'Completed', variant: 'success' }];
                  return [];
                }}
                pageId="technical_evaluation"
              />

            {/* Main Container */}
            <div className={styles.contentColumn}>
              <div className="quote-sec-table quote-sec-tab">

                {/* Inline loader - shows inside content area while loading/verifying */}
                {isContentLoading && (
                  <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                    <div className="text-center">
                      <div className="d-flex align-items-center justify-content-center mb-3" style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(46, 91, 168, 0.08)', margin: '0 auto'
                      }}>
                        <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a2730', marginBottom: 4 }}>
                        Loading Evaluation
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#6c757d', margin: 0 }}>
                        {permissionsLoading ? 'Verifying access permissions...' : 'Fetching evaluation data...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Access Denied - show inside content area so sidebar stays visible */}
                {!isContentLoading && isAccessDenied && (
                  <AccessDeniedPage
                    title="Access Denied"
                    message={`You do not have permission to view technical evaluations for this ${getEntityLabel(currentRfq?.is_tender)}. Contact your administrator to request access.`}
                    showBackButton={false}
                  />
                )}

                {/* Empty State - when no RFQ selected */}
                {!isContentLoading && !isAccessDenied && !rfq_id && (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>
                      <BsClipboardCheck size={36} />
                    </div>
                    <h4 className={styles.emptyStateTitle}>Select an {entityLabel || 'RFQ'} to Start Evaluating</h4>
                    <p className={styles.emptyStateDescription}>
                      Choose an RFQ or Tender from the sidebar to view and evaluate vendor clauses.
                    </p>
                  </div>
                )}

                {/* RFQ Header Card */}
                {!isContentLoading && !isAccessDenied && currentRfq && (
                  <div className={styles.rfqHeader}>
                    {/* Hero Strip */}
                    <div className={styles.rfqHero}>
                      <div className={styles.rfqHeroCenter}>
                        <div className={styles.rfqHeroNumberRow}>
                          <span>{entityLabel}</span>
                          <span className={styles.rfqHeroNum}>#{currentRfq.rfq_no}</span>
                          <Badge
                            bg={currentRfq.te_approval_rejected ? 'danger' : currentRfq.te_completed === true ? 'success' : currentRfq.approval_required ? 'warning' : 'info'}
                            className={styles.rfqStatusBadge}
                          >
                            {currentRfq.te_approval_rejected ? 'Evaluation Rejected' : currentRfq.te_completed === true ? 'Completed' : currentRfq.approval_required ? 'Pending Approval' : 'In Progress'}
                          </Badge>
                        </div>
                        {currentRfq.title && currentRfq.title != "" && (
                          <p className={styles.rfqHeroSubTitle}>{currentRfq.title}</p>
                        )}
                        {currentRfq.project_name && currentRfq.project_name != "" && (
                          <p className={styles.rfqHeroProject}>{currentRfq.project_name}</p>
                        )}
                      </div>
                      <div className={styles.rfqHeroActions}>
                        <Link
                          href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${currentRfq.id}`}
                          className={styles.viewRfqBtn}
                          id="view_rfq_details-technical_eval_page"
                        >
                          <BsBoxArrowUpRight size={13} />
                          View {entityLabel}
                        </Link>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className={styles.rfqMetaGrid}>
                      {getMetaItems().map((item, idx) => (
                        <div className={styles.rfqMetaItem} key={idx}>
                          <div className={styles.rfqMetaIcon}>{item.icon}</div>
                          <div className={styles.rfqMetaContent}>
                            <span className={styles.rfqMetaLabel}>{item.label}</span>
                            <span className={styles.rfqMetaValue}>{item.value || "N/A"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Read-Only Banner */}
                {hasPermissionContext && !permissionsLoading && !canWrite && canRead && (
                  <div className="mt-3 mb-3">
                    <ReadOnlyBanner
                      title="View Only Mode"
                      message="You have read-only access to this technical evaluation. Contact your administrator to request edit permissions."
                    />
                  </div>
                )}

                {!isContentLoading && !isAccessDenied && <div className="quote-sec-main">
                  <>
                    {!contentLoading && currentRfq && clauseInfo && clauseInfo.length > 0 && (
                      <h3 className={styles.productsHeading}>{entityLabel} Products</h3>
                    )}

                    {/* Evaluation Progress Tracker */}
                    {clauseInfo && clauseInfo.length > 0 && (
                      <EvaluationProgressTracker rfqId={rfq_id} />
                    )}

                    {/* Quoted Vendors Filter */}
                    {clauseInfo && clauseInfo.length > 0 && (
                      <div className="d-flex align-items-center gap-2 mb-3 mt-2" style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, width: 'fit-content' }}>
                        <Form.Check
                          type="switch"
                          id="quoted-vendors-toggle"
                          label="Quoted Vendors Only"
                          checked={quotedVendorsOnly}
                          onChange={(e) => setQuotedVendorsOnly(e.target.checked)}
                          style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}
                        />
                      </div>
                    )}

                    {currentRfq && clauseInfo &&
                      clauseInfo.map((rfqProduct, productIndex) => {
                        if (clauseMap.get(rfqProduct.rfq_product_id)) {
                          const product = currentRfq.products.find(product => product.id == rfqProduct.rfq_product_id)
                          if(!product) return null;
                          const productSelectedVendors = selectedVendorsMap.get(product.id) || [];

                          return (
                            <div className={styles.productCard} key={`product_${product.id}`}>
                              {/* Product Header */}
                              <div className={`${styles.productHeader} ${expandedProducts.has(product.id) ? styles.productHeaderActive : ''}`} onClick={() => toggleProductExpand(product.id)}>
                                <div className={styles.productHeaderLeft}>
                                  <span className={styles.productBadge}>
                                    Product {productIndex + 1} of {clauseInfo.length}
                                  </span>
                                  <h4 className={styles.productName}>
                                    {product.product_details[0]?.name}
                                  </h4>
                                  <p className={styles.productSpec}>
                                    Spec: {product.product_specs?.find((spec) => spec.title === "Spec" && spec.value)?.value || "N/A"}
                                  </p>
                                </div>
                                <div className={`${styles.expandToggle} ${expandedProducts.has(product.id) ? styles.expanded : ''}`}>
                                  <BsChevronDown size={18} />
                                </div>
                              </div>

                              {/* Product Body */}
                              {expandedProducts.has(product.id) && (
                                <div className={styles.productBody}>
                                  <ClauseProductItem
                                    type={"buyer"}
                                    rfq_id={rfq_id}
                                    product={{
                                      ...product,
                                      tbl_rfq_product_tech_evaluation_id: rfqProduct.evaluation_id
                                    }}
                                    currentUserProfile={currentUserProfile}
                                    currentRfq={currentRfq}
                                    getVendors={async () => await getVendorSelectionOption(product.id)}
                                    clauseInfo={rfqProduct?.clauses ?? []}
                                    vendors={rfqProduct?.vendors ?? []}
                                    refetch={fetchEvaluationData}
                                    selectedVendor={vendorMap.get(product.id)}
                                    selectedVendors={productSelectedVendors.map(vendor => vendor.value)}
                                    minimumPassingScore={rfqProduct?.minimum_passing_score}
                                    canWrite={canWrite}
                                    canApprove={canApprove}
                                    permissionsLoading={permissionsLoading}
                                    onEvaluationStatusChange={handleEvaluationStatusChange}
                                    quotedVendorsOnly={quotedVendorsOnly}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        }
                      }
                      )}

                    {/* Unified Submit for Approval Button */}
                    {clauseInfo && clauseInfo.length > 0 && (
                      <UnifiedSubmitForApproval
                        canWrite={canWrite}
                        permissionsLoading={permissionsLoading}
                        areAllProductsEvaluated={areAllProductsEvaluated}
                        hasAnyPendingApproval={hasAnyPendingApproval}
                        vendorCountValid={vendorCountValid}
                        unifiedSubmitLoading={unifiedSubmitLoading}
                        showUnifiedSubmitModal={showUnifiedSubmitModal}
                        onSubmitClick={() => setShowUnifiedSubmitModal(true)}
                        onConfirm={handleUnifiedSubmitForApproval}
                        onCancel={() => setShowUnifiedSubmitModal(false)}
                        productCount={clauseInfo.length}
                        evaluatedProductCount={evaluatedProductCount}
                        isBidExpired={isBidExpired}
                      />
                    )}
                  </>
                </div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BuyerTechnicalEvaluation;