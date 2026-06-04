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
import RfqTermsModal from "@/components/modal/RfqTermsModal";
import EvaluationProgressTracker from "./EvaluationProgressTracker";
import UnifiedSubmitForApproval from "./UnifiedSubmitForApproval";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import { TwoPanelPage } from "@/components/layout/DashboardShell";
import useIsMobile from "@/hooks/useIsMobile";
import { BsBuilding, BsPerson, BsEnvelope, BsTelephone, BsCalendar3, BsGeoAlt, BsHouse, BsArrowRepeat, BsClipboardCheck, BsBoxArrowUpRight, BsTag, BsChatLeftText, BsList, BsChevronDown, BsLock, BsClock, BsCheckCircleFill, BsCheck2All } from "react-icons/bs";
import styles from "./TechnicalEvaluation.module.scss";
import { Tooltip } from "react-tooltip";



const BuyerTechnicalEvaluation = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const isMobile = useIsMobile();
  const reduxUserProfile = useSelector((state) => state.userProfile);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rfq_id, setRfqId] = useState(router.query.rfq_id || null);
  const targetProdId = router.query.prod_id || null; // rfq_product_id from URL to auto-expand & highlight
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
  const [showFailedVendors, setShowFailedVendors] = useState(false);
  const [productEvaluationStatus, setProductEvaluationStatus] = useState(new Map());
  const [showUnifiedSubmitModal, setShowUnifiedSubmitModal] = useState(false);
  const [unifiedSubmitLoading, setUnifiedSubmitLoading] = useState(false);
  const [showTncModal, setShowTncModal] = useState(false);
  const [rfqCompletionMap, setRfqCompletionMap] = useState(new Map());
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [techEvalDashboard, setTechEvalDashboard] = useState(null);
  const hasUserToggledRef = useRef(false);

  const toggleProductExpand = (productId) => {
    hasUserToggledRef.current = true;
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  // Reset the manual-toggle tracker whenever the RFQ changes
  useEffect(() => {
    hasUserToggledRef.current = false;
    setTechEvalDashboard(null);
  }, [rfq_id]);

  // Memoized set of completed product ids (string-keyed for safe comparison)
  const completedProductIdSet = useMemo(() => {
    if (!Array.isArray(techEvalDashboard?.completed_product_ids)) return new Set();
    return new Set(techEvalDashboard.completed_product_ids.map(id => String(id)));
  }, [techEvalDashboard]);

  // True when every product in the current RFQ is marked completed
  const allProductsCompleted = useMemo(() => {
    if (!currentRfq?.products?.length) return false;
    if (completedProductIdSet.size === 0) return false;
    return currentRfq.products.every(p => completedProductIdSet.has(String(p.id)));
  }, [currentRfq, completedProductIdSet]);

  // Once the dashboard data arrives, if the user hasn't manually toggled,
  // auto-expand the first non-completed product instead of a completed one.
  useEffect(() => {
    if (hasUserToggledRef.current) return;
    if (!currentRfq?.products?.length) return;
    if (!techEvalDashboard) return;

    // If URL has a prod_id target, respect it (handled elsewhere on initial load)
    if (targetProdId) return;

    const firstNonCompleted = currentRfq.products.find(
      p => !completedProductIdSet.has(String(p.id))
    );
    // If everything is completed, keep the first product expanded as a fallback
    const expandId = firstNonCompleted ? firstNonCompleted.id : currentRfq.products[0].id;
    setExpandedProducts(new Set([expandId]));
  }, [techEvalDashboard, currentRfq, completedProductIdSet, targetProdId]);

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
  // BUT: a closed RFQ (status=2) is fully locked — no scoring, no submit, no approvals
  const isRfqClosed = String(currentRfq?.status) === '2';
  const rawCanWrite = canUpdate || canCreate;
  const canWrite = rawCanWrite && !isRfqClosed;

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
  }, [rfqNo, isTenderFilter, selectedHotelIds]);

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
        module_keys: "technical",
        hotel_id: selectedHotelIds && selectedHotelIds.length > 0 ? selectedHotelIds[0] : null,
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
  // silent = true: background refresh — no loading state, no accordion reset
  const fetchEvaluationData = async ({ silent = false } = {}) => {
    if (!rfq_id || !currentRfq) return;

    const requestId = rfq_id; // Capture for stale check

    try {
      if (!silent) setContentLoading(true);
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

      // Only auto-expand on initial load, not on background refresh
      if (!silent && currentRfq?.products?.length > 0) {
        // If prod_id is in URL, expand that product; otherwise expand first product
        const targetProduct = targetProdId
          ? currentRfq.products.find(p => String(p.id) === String(targetProdId))
          : null;
        const expandId = targetProduct ? targetProduct.id : currentRfq.products[0].id;
        setExpandedProducts(new Set([expandId]));

        // Scroll to the target product after a brief delay for DOM render
        if (targetProduct) {
          setTimeout(() => {
            const el = document.getElementById(`product-card-${targetProduct.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    } catch (error) {
      if (activeRfqRef.current !== requestId) return; // Stale — ignore
      if (!silent) {
        console.log(error);
        toast.error(error.message || 'Failed to load evaluation data');
      }
    } finally {
      if (activeRfqRef.current === requestId) {
        setPermissionsVerified(true);
        if (!silent) setContentLoading(false);
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

  // Pre-compute evaluation status from clauseInfo for ALL products (even unexpanded ones)
  // This ensures the Submit All button has accurate counts without requiring accordion expansion
  useEffect(() => {
    if (!clauseInfo || clauseInfo.length === 0) return;

    setProductEvaluationStatus(prev => {
      const newMap = new Map(prev);
      clauseInfo.forEach(rfqProduct => {
        // Skip products that already have status from ClauseProductItem (more accurate with workflow state)
        if (newMap.has(rfqProduct.rfq_product_id) && newMap.get(rfqProduct.rfq_product_id)?.workflowState) return;

        const vendors = rfqProduct?.vendors || [];
        const clauses = rfqProduct?.clauses || [];

        // A vendor is fully scored if every clause has a scored response (score_timestamp != response_timestamp)
        const isVendorScored = (vendorId) => {
          if (!clauses || clauses.length === 0) return false;
          return clauses.every(clause => {
            const resp = clause.vendor_responses?.find(r => String(r.vendor_id) === String(vendorId));
            return resp?.score_timestamp && resp.score_timestamp !== resp.response_timestamp;
          });
        };

        // Only count vendors that are scored AND not already verified from previous rounds
        const unverifiedVendors = vendors.filter(v => v.is_verified !== true);
        const evaluatedVendorCount = unverifiedVendors.filter(v => isVendorScored(v.vendor_id)).length;
        const isFullyEvaluated = evaluatedVendorCount > 0 && unverifiedVendors.length > 0 &&
          unverifiedVendors.every(v => isVendorScored(v.vendor_id));

        newMap.set(rfqProduct.rfq_product_id, {
          isFullyEvaluated,
          evaluatedVendorCount,
          totalVendors: vendors.length,
          isPendingApproval: false,
          workflowComplete: false,
          workflowState: null // Will be overridden by ClauseProductItem when expanded
        });
      });
      return newMap;
    });
  }, [clauseInfo]);

  // Bid end date must have passed before evaluation/submission is allowed
  const isBidExpired = useMemo(() => {
    return currentRfq?.bid_end_date ? checkBidExpired(currentRfq.bid_end_date) : false;
  }, [currentRfq?.bid_end_date]);

  // Check if all submittable products are fully evaluated
  const areAllProductsEvaluated = useMemo(() => {
    if (!clauseInfo || clauseInfo.length === 0) return false;

    const productIds = clauseInfo.map(item => item.rfq_product_id);

    // Only consider products that are not already complete or pending
    const submittableProducts = productIds.filter(productId => {
      const status = productEvaluationStatus.get(productId);
      return !status?.workflowComplete && !status?.isPendingApproval;
    });

    if (submittableProducts.length === 0) return false;

    return submittableProducts.every(productId => {
      const status = productEvaluationStatus.get(productId);
      return status?.isFullyEvaluated;
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

  // Count how many products are submittable (evaluated, not complete, not pending)
  const evaluatedProductCount = useMemo(() => {
    if (!clauseInfo || clauseInfo.length === 0) return 0;
    let count = 0;
    for (const [, status] of productEvaluationStatus) {
      if (status?.evaluatedVendorCount > 0 && !status?.workflowComplete && !status?.isPendingApproval) count++;
    }
    return count;
  }, [clauseInfo, productEvaluationStatus]);

  // Per-product submit handler
  const handleProductSubmit = async (productId) => {
    try {
      await submitTechEvalForApproval({
        rfq_id: parseInt(rfq_id),
        rfq_product_id: productId,
        is_tender: currentRfq?.is_tender === 1,
      });
      toast.success("Product submitted for approval");
      await fetchEvaluationData();
    } catch (err) {
      toast.error(err?.message || "Failed to submit for approval");
    }
  };

  // Get per-product submit state
  const getProductSubmitState = (productId) => {
    const pStatus = productEvaluationStatus.get(productId);
    const canSubmit = canWrite && !permissionsLoading && isBidExpired
      && pStatus?.evaluatedVendorCount > 0
      && !pStatus?.workflowComplete
      && !pStatus?.isPendingApproval;
    return {
      canSubmit,
      isComplete: pStatus?.workflowComplete || false,
      isPending: pStatus?.isPendingApproval || false,
      hasEvaluated: (pStatus?.evaluatedVendorCount || 0) > 0,
    };
  };

  // Unified submit handler for all products
  const handleUnifiedSubmitForApproval = async () => {
    if (!currentRfq || !clauseInfo || !isBidExpired) return;

    try {
      setUnifiedSubmitLoading(true);

      // Only submit products that have evaluated vendors AND are not already complete/pending
      const submittableProducts = clauseInfo.filter(rfqProduct => {
        const status = productEvaluationStatus.get(rfqProduct.rfq_product_id);
        return status?.evaluatedVendorCount > 0
          && !status?.workflowComplete
          && !status?.isPendingApproval;
      });

      if (submittableProducts.length === 0) {
        toast.error("No products ready for submission. Products may already be complete or pending approval.");
        return;
      }

      // Submit sequentially to avoid race conditions with concurrent approval instance creation
      let successCount = 0;
      for (const rfqProduct of submittableProducts) {
        try {
          const payload = {
            rfq_id: parseInt(rfq_id),
            rfq_product_id: rfqProduct.rfq_product_id,
            is_tender: currentRfq?.is_tender === 1,
          };
          await submitTechEvalForApproval(payload);
          successCount++;
        } catch (err) {
          console.error(`Failed to submit product ${rfqProduct.rfq_product_id}:`, err);
          // Continue with remaining products even if one fails
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} product(s) submitted for approval successfully!`);
      } else {
        toast.error("Failed to submit any products for approval.");
      }
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
    return items;
  };

  const techEvalSidebar = (
    <RFQListSidebar
      title={null}
      embedded
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
          filter: (item) => {
            // Closed RFQs are read-only — no action possible
            if (String(item.status) === '2') return false;
            // Bid submission window must have closed before evaluation/approval is meaningful
            const bidEnded = item.bid_end_date && new Date(item.bid_end_date) < new Date();
            if (!bidEnded) return false;
            // Current user must have something to do: a product to evaluate,
            // a rejected evaluation to redo, or a pending approval where they are the approver.
            return item.has_pending_evaluation || item.te_approval_rejected || item.approval_required;
          },
        },
        {
          key: 'in_progress',
          label: 'In Progress',
          filter: (item) => {
            if (String(item.status) === '2') return false;
            return !item.has_pending_evaluation && !item.te_approval_rejected
              && !item.approval_required && item.has_pending_te_approval;
          },
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
      getItemTags={(item) => {
        if (String(item.status) === '2') return [{ label: 'Closed', variant: 'danger' }];
        if (item.te_approval_rejected) return [{ label: 'Evaluation Rejected', variant: 'danger' }];
        if (item.approval_required) return [{ label: 'Approval Pending', variant: 'warning' }];
        if (item.has_pending_te_approval) return [{ label: 'In Approval', variant: 'info' }];
        if (item.te_completed === true) return [{ label: 'Completed', variant: 'success' }];
        return [];
      }}
      pageId="technical_evaluation"
    />
  );

  const commentHasContent =
    currentRfq?.comment && currentRfq.comment.replace(/<[^>]*>/g, "").trim() !== "";

  return (
    <>
      <TwoPanelPage
        title="Technical Evaluation"
        subtitle="Review vendor submissions against technical clauses."
        sidebar={techEvalSidebar}
        onMobileSidebarToggle={isMobile ? () => setSidebarOpen(v => !v) : undefined}
        mobileSidebarOpen={sidebarOpen}
        mobileToggleLabel="Select RFQ"
      >
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
                            bg={isRfqClosed ? 'danger' : currentRfq.te_approval_rejected ? 'danger' : currentRfq.te_completed === true ? 'success' : currentRfq.approval_required ? 'warning' : 'info'}
                            className={styles.rfqStatusBadge}
                          >
                            {isRfqClosed ? 'Closed' : currentRfq.te_approval_rejected ? 'Evaluation Rejected' : currentRfq.te_completed === true ? 'Completed' : currentRfq.approval_required ? 'Pending Approval' : 'In Progress'}
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

                    {commentHasContent && (
                      <div className={styles.rfqCommentRow}>
                        <div className={styles.rfqMetaIcon}>
                          <BsChatLeftText size={14} />
                        </div>
                        <div className={styles.rfqCommentContent}>
                          <span className={styles.rfqMetaLabel}>Terms &amp; Conditions</span>
                          <button
                            type="button"
                            onClick={() => setShowTncModal(true)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 0,
                              marginTop: 2,
                              border: "none",
                              background: "transparent",
                              color: "#2E5BA8",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <BsChatLeftText size={12} />
                            View
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bid End Date Lock Banner — suppressed when RFQ is closed (the closed-RFQ banner takes over) */}
                {!isContentLoading && !isAccessDenied && currentRfq && !isBidExpired && !isRfqClosed && (
                  <div className={styles.bidLockBanner}>
                    <div className={styles.bidLockIconWrapper}>
                      <BsLock size={20} />
                    </div>
                    <div className={styles.bidLockContent}>
                      <h5 className={styles.bidLockTitle}>Evaluation Locked</h5>
                      <p className={styles.bidLockMessage}>
                        The technical evaluation will only be enabled after the submission deadline is over.
                        {currentRfq.bid_end_date && (
                          <>
                            {' '}Deadline: <strong>{formatDisplayDate(currentRfq.bid_end_date, { includeTime: true })}</strong>
                          </>
                        )}
                      </p>
                    </div>
                    <div className={styles.bidLockTimerBadge}>
                      <BsClock size={13} />
                      <span>Wait Please.</span>
                    </div>
                  </div>
                )}

                {/* Closed-RFQ Lock Banner — supersedes the read-only banner */}
                {!isContentLoading && !isAccessDenied && isRfqClosed && currentRfq && (
                  <ReadOnlyBanner
                    variant="danger"
                    title="Evaluation Locked"
                    message={`This ${entityLabel} has been closed. Scoring, evaluation, and approvals are no longer permitted.`}
                    badgeText={`${entityLabel} Closed`}
                  />
                )}

                {/* Evaluation Completed Banner */}
                {!isContentLoading && !isAccessDenied && currentRfq && allProductsCompleted && !isRfqClosed && (
                  <div className={styles.evaluationCompletedBanner}>
                    <div className={styles.evaluationCompletedIconWrapper}>
                      <BsCheck2All size={22} />
                    </div>
                    <div className={styles.evaluationCompletedContent}>
                      <h5 className={styles.evaluationCompletedTitle}>Evaluation Completed</h5>
                      <p className={styles.evaluationCompletedMessage}>
                        The technical evaluation has been completed for all products.
                      </p>
                    </div>
                    <div className={styles.evaluationCompletedBadge}>
                      <BsCheckCircleFill size={13} />
                      <span>All Done</span>
                    </div>
                  </div>
                )}

                {/* Read-Only Banner — only when the user lacks write perms (not when RFQ is locked) */}
                {!isContentLoading && !isAccessDenied && hasPermissionContext && !permissionsLoading && !rawCanWrite && canRead && !isRfqClosed && (
                  <ReadOnlyBanner
                    title="View Only Mode"
                    message="You have read-only access to this technical evaluation. Contact your administrator to request edit permissions."
                  />
                )}

                {!isContentLoading && !isAccessDenied && <div className="quote-sec-main">
                  <>
                    {!contentLoading && currentRfq && currentRfq.products && currentRfq.products.length > 0 && (
                      <h3 className={styles.productsHeading}>{entityLabel} Products</h3>
                    )}

                    {/* Evaluation Progress Tracker */}
                    {clauseInfo && clauseInfo.length > 0 && (
                      <EvaluationProgressTracker rfqId={rfq_id} onDataLoaded={setTechEvalDashboard} />
                    )}

                    {/* Quoted Vendors Filter */}
                    {clauseInfo && clauseInfo.length > 0 && (
                      <div className="d-flex align-items-center gap-3 mb-3 mt-2" style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, width: 'fit-content' }}>
                        <Form.Check
                          type="switch"
                          id="quoted-vendors-toggle"
                          label="Quoted Vendors Only"
                          checked={quotedVendorsOnly}
                          onChange={(e) => { setQuotedVendorsOnly(e.target.checked); if (e.target.checked) setShowFailedVendors(false); }}
                          disabled={showFailedVendors}
                          style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}
                        />
                        <div style={{ width: 1, height: 18, background: '#dee2e6' }} />
                        <Form.Check
                          type="switch"
                          id="failed-vendors-toggle"
                          label="Show Failed Vendors"
                          checked={showFailedVendors}
                          onChange={(e) => { setShowFailedVendors(e.target.checked); if (e.target.checked) setQuotedVendorsOnly(false); }}
                          style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}
                        />
                      </div>
                    )}

                    {currentRfq && clauseInfo !== undefined &&
                      currentRfq.products?.map((product, productIndex) => {
                        const hasClauses = clauseMap && clauseMap.get(product.id);
                        const rfqProduct = hasClauses
                          ? clauseInfo?.find(ci => ci.rfq_product_id == product.id)
                          : null;
                        const productSelectedVendors = selectedVendorsMap.get(product.id) || [];

                        const isTargetProduct = targetProdId && String(product.id) === String(targetProdId);
                        const isProductCompleted = Array.isArray(techEvalDashboard?.completed_product_ids) &&
                          techEvalDashboard.completed_product_ids.some(id => String(id) === String(product.id));

                        return (
                          <div className={`${styles.productCard} ${isTargetProduct ? styles.productCardHighlight : ''} ${isProductCompleted ? styles.productCardCompleted : ''}`} key={`product_${product.id}`} id={`product-card-${product.id}`}>
                            {/* Product Header */}
                            <div className={`${styles.productHeader} ${expandedProducts.has(product.id) ? styles.productHeaderActive : ''}`} onClick={() => toggleProductExpand(product.id)}>
                              <div className={styles.productHeaderLeft}>
                                <div className={styles.productHeaderTopRow}>
                                  <span className={styles.productBadge}>
                                    Product {productIndex + 1} of {currentRfq.products.length}
                                  </span>
                                  <h4 className={styles.productName}>
                                    {product.product_details?.[0]?.name || 'Unnamed Product'}
                                  </h4>
                                  {(() => {
                                    const specs = {};
                                    product.product_specs?.forEach(s => { if (s.value) specs[s.title] = s.value; });
                                    const qtyText = specs.Quantity ? `${specs.Quantity}${specs.Unit ? ` ${specs.Unit}` : ''}` : (specs.Unit ? specs.Unit : null);
                                    return qtyText ? <span className={styles.productQtyBadge}>{qtyText}</span> : null;
                                  })()}
                                  {isProductCompleted && (
                                    <span className={styles.allVendorsEvaluatedBadge}>
                                      <BsCheckCircleFill size={12} />
                                      All vendors are evaluated
                                    </span>
                                  )}
                                </div>
                                <div className={styles.productMeta}>
                                  {(() => {
                                    const specs = {};
                                    product.product_specs?.forEach(s => { if (s.value) specs[s.title] = s.value; });
                                    return (
                                      <>
                                        {specs.Size && (
                                          <span
                                            className={`${styles.productMetaChip} ${styles.productMetaChipTruncate}`}
                                            data-tooltip-id="spec-tooltip"
                                            data-tooltip-content={specs.Size}
                                          >
                                            <strong>Size:</strong> {specs.Size}
                                          </span>
                                        )}
                                        {specs.Spec && (
                                          <span
                                            className={`${styles.productMetaChip} ${styles.productMetaChipTruncate}`}
                                            data-tooltip-id="spec-tooltip"
                                            data-tooltip-content={specs.Spec}
                                          >
                                            <strong>Spec:</strong> {specs.Spec}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className={`${styles.expandToggle} ${expandedProducts.has(product.id) ? styles.expanded : ''}`}>
                                <BsChevronDown size={18} />
                              </div>
                            </div>

                            {/* Product Body */}
                            {expandedProducts.has(product.id) && (
                              <div className={styles.productBody}>
                                {hasClauses && rfqProduct ? (
                                  <>
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
                                    showFailedVendors={showFailedVendors}
                                  />

                                  {/* Per-product submit button */}
                                  {(() => {
                                    const ps = getProductSubmitState(product.id);
                                    if (ps.isComplete) return <div className={styles.productSubmitRow}><span className={styles.productSubmitDone}>Evaluation Complete</span></div>;
                                    if (ps.isPending) return <div className={styles.productSubmitRow}><span className={styles.productSubmitPending}>Approval Pending</span></div>;
                                    return (
                                      <div className={styles.productSubmitRow}>
                                        <button
                                          className={`btn btn-sm ${styles.productSubmitBtn}`}
                                          disabled={!ps.canSubmit}
                                          onClick={(e) => { e.stopPropagation(); handleProductSubmit(product.id); }}
                                          title={!isBidExpired ? "Bid deadline hasn't passed yet" : !ps.hasEvaluated ? "Score at least one vendor first" : "Submit this product for approval"}
                                        >
                                          Submit for Approval
                                        </button>
                                      </div>
                                    );
                                  })()}
                                  </>
                                ) : (
                                  <div className="text-center py-4" style={{ background: '#f8f9fa', borderRadius: 8 }}>
                                    <p className="text-muted mb-1" style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                                      No Clauses Available
                                    </p>
                                    <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                                      No technical evaluation clauses have been configured for this product.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

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
      </TwoPanelPage>
      <Tooltip id="spec-tooltip" place="top" style={{ maxWidth: 320, fontSize: 12, borderRadius: 8, zIndex: 9999, wordBreak: 'break-word' }} />
      <RfqTermsModal
        open={showTncModal}
        onClose={() => setShowTncModal(false)}
        rfq={currentRfq}
      />
    </>
  );
};

export default BuyerTechnicalEvaluation;