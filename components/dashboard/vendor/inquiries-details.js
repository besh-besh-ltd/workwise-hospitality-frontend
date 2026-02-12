import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { faEdit, faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { Router, useRouter } from "next/router";
import { closeRFQ, getAllClauses, getRFQById, sendQuotation, fetchVendorAgreement, getTechClearedVendorsResult, submitRFQApprovalAction } from "@/services/rfq";
import Loader from "@/components/shared/Loader";
import PlaceholderLoading from "react-placeholder-loading";
import { faCircleExclamation, faDownload } from "@fortawesome/free-solid-svg-icons";
import moment from "moment";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { checkBidExpired, extractfileName, formatDate, formatPrice, getEntityLabel, getRFQPublishState } from "@/utils/sharedFunctions";
import PublishDateTimer from "@/components/shared/PublishDateTimer";
import { renderFileLink } from "@/utils/elementFunctions";
import storageInstance from "@/utils/storageInstance";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import { toast } from "react-toastify";
import { ApprovalWorkflowSection, ApprovalPendingBanner } from "@/components/dashboard/buyer/approval";
import {
  ClarificationBlockingBanner,
  RaiseClarificationModal,
  ClarificationDetailModal,
  ClarificationListModal,
} from "@/components/dashboard/buyer/clarification";
import { getClarifications } from "@/services/clarification";
import NegotiationColumnCell from "@/components/dashboard/buyer/negotiation/NegotiationColumnCell";
import { Badge, Button, Alert } from "react-bootstrap";
import { BsCalendarEvent, BsClockFill, BsCheckCircleFill } from "react-icons/bs";

const TECH_EVAL_STYLES = {
  accepted: { bg: '#d1e7dd', border: '#198754', shadow: '0 2px 8px rgba(25, 135, 84, 0.2)' },
  rejected: { bg: '#f8d7da', border: '#dc3545', shadow: '0 2px 8px rgba(220, 53, 69, 0.2)' },
  pending_buyer: { bg: '#fff3cd', border: '#ffc107', shadow: '0 2px 8px rgba(255, 193, 7, 0.2)' },
  partial: { bg: '#ffe5d0', border: '#fd7e14', shadow: '0 2px 8px rgba(253, 126, 20, 0.2)' },
  submitted: { bg: '#cfe2ff', border: '#0d6efd', shadow: '0 2px 8px rgba(13, 110, 253, 0.2)' },
  pending_vendor: { bg: '#e9ecef', border: '#6c757d', shadow: '0 2px 8px rgba(108, 117, 125, 0.2)' },
};

const DEFAULT_STYLE = { bg: 'transparent', border: 'none', shadow: 'none' };
const RESPONSE_STYLE = { bg: '#e7f3ff', border: '#0d6efd', shadow: '0 2px 8px rgba(13, 110, 253, 0.15)' };

const buildRowStyle = (styleConfig) => ({
  backgroundColor: styleConfig.bg,
  borderLeft: styleConfig.border !== 'none' ? `5px solid ${styleConfig.border}` : '0',
  transition: 'all 0.3s ease',
  boxShadow: styleConfig.shadow,
});

const getTechEvalRowStyle = (techEvalStatus) => {
  if (!techEvalStatus) return { transition: 'all 0.3s ease' };
  const styleConfig = TECH_EVAL_STYLES[techEvalStatus.status] || (techEvalStatus.hasResponse ? RESPONSE_STYLE : DEFAULT_STYLE);
  return buildRowStyle(styleConfig);
};

const getTechEvalCellStyle = (techEvalStatus, hasTechEval, isLoading, isAccepted) => {
  let styleConfig = DEFAULT_STYLE;
  if (techEvalStatus) {
    styleConfig = TECH_EVAL_STYLES[techEvalStatus.status] || DEFAULT_STYLE;
  } else if (hasTechEval && !isLoading) {
    styleConfig = isAccepted ? TECH_EVAL_STYLES.accepted : TECH_EVAL_STYLES.pending_buyer;
  }
  return {
    ...buildRowStyle(styleConfig),
    padding: '12px',
    fontWeight: techEvalStatus || hasTechEval ? '500' : 'normal',
  };
};

const CONTAINER_BASE_STYLE = { padding: "8px 10px", borderRadius: "6px", minWidth: "160px" };

const getContainerStyle = ({ isAccepted, isRejected, awaitingBuyer, isPartiallySubmitted }) => {
  if (isAccepted) return { ...CONTAINER_BASE_STYLE, backgroundColor: "#d1e7dd", border: "1px solid #198754" };
  if (isRejected) return { ...CONTAINER_BASE_STYLE, backgroundColor: "#f8d7da", border: "1px solid #dc3545" };
  if (awaitingBuyer) return { ...CONTAINER_BASE_STYLE, backgroundColor: "#fff3cd", border: "1px solid #ffc107" };
  if (isPartiallySubmitted) return { ...CONTAINER_BASE_STYLE, backgroundColor: "#ffe5d0", border: "1px solid #fd7e14" };
  return { ...CONTAINER_BASE_STYLE, backgroundColor: "#f8f9fa", border: "1px solid #dee2e6" };
};

const BADGE_BASE_STYLE = { fontSize: "0.8rem", padding: "4px 10px", borderRadius: "4px", fontWeight: "500", width: "fit-content" };

const getBadgeStyle = ({ isAccepted, isRejected, awaitingBuyer, isPartiallySubmitted }) => {
  if (isAccepted) return { ...BADGE_BASE_STYLE, backgroundColor: "#198754", color: "#fff" };
  if (isRejected) return { ...BADGE_BASE_STYLE, backgroundColor: "#dc3545", color: "#fff" };
  if (awaitingBuyer) return { ...BADGE_BASE_STYLE, backgroundColor: "#ffc107", color: "#000" };
  if (isPartiallySubmitted) return { ...BADGE_BASE_STYLE, backgroundColor: "#fd7e14", color: "#fff" };
  return { ...BADGE_BASE_STYLE, backgroundColor: "#6c757d", color: "#fff" };
};

const getBadgeText = (status, isPartiallySubmitted) => {
  if (status.isAccepted) return "[ACCEPTED] Technically Accepted";
  if (status.isRejected) return status.detailedStatus?.statusText || status.backendStatus?.rejection_reason || "[REJECTED] Technically Rejected";
  if (status.detailedStatus?.statusText && !status.detailedStatus.statusText.includes('[IN PROGRESS]')) return status.detailedStatus.statusText;
  if (status.allClausesResponded && status.hasResponse) return status.isBuyerView ? "[AWAITING] Awaiting Your Evaluation" : "[AWAITING] Awaiting Buyer Evaluation";
  if (isPartiallySubmitted) return status.isBuyerView ? "[INCOMPLETE] Vendor Partially Submitted" : "[INCOMPLETE] Partially Submitted";
  return status.isBuyerView ? "[PENDING] Vendor Response Pending" : "[PENDING] Your Response Pending";
};

const getHelperText = (status, isPartiallySubmitted) => {
  if (status.isAccepted) return "Click to view details";
  if (status.isRejected) return status.backendStatus?.rejection_reason || status.detailedStatus?.techEvalCleared?.reject_message || "Click to view details";
  if (status.allClausesResponded && status.hasResponse) return status.isBuyerView ? "Awaiting your evaluation" : "Awaiting buyer evaluation";
  if (isPartiallySubmitted) return `${status.respondedCount} of ${status.totalClauses} clauses completed`;
  return status.isBuyerView ? "Click to view evaluation" : "Click to start evaluation";
};

const RfqManagementPreview = () => {
  const router = useRouter();
  const { id, type, token } = router.query;
  const [rfqDetails, setrfqDetails] = useState(null);
  const [loading, setloading] = useState(false);
  const [enableBuyerView, setEnableBuyerView] = useState(false);
  const [closeRFqLoading, setcloseRFqLoading] = useState(false);
  const [isSubmitAble, setIsSubmitable] = useState(true);
  const [productleftforbid, setproductleftforbid] = useState(true);
  const [regretModal, setregretModal] = useState(false);
  const [submitLoading, setsubmitLoading] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [quoteDisabled, setQuoteDisabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  // New state variables for enhanced RA logic
  const [isReverseAuctionActive, setIsReverseAuctionActive] = useState(false);
  const [showLowestPrice, setShowLowestPrice] = useState(false);
  const [wasEndDatePassed, setWasEndDatePassed] = useState(false);
  const [raStatusChanged, setRaStatusChanged] = useState(false);
  const [showTechEvalRestrictions, setShowTechEvalRestrictions] = useState(false);
  const [hasPendingTechEval, setHasPendingTechEval] = useState(false);
  // Enhanced tech eval status tracking for detailed status display
  const [productTechEvalDetails, setProductTechEvalDetails] = useState({});
  const [loadingTechEvalDetails, setLoadingTechEvalDetails] = useState({});

  // Clarification state
  const [clarifications, setClarifications] = useState([]);
  const [clarificationsLoading, setClarificationsLoading] = useState(false);
  const [hasOpenClarification, setHasOpenClarification] = useState(false);
  const [openClarification, setOpenClarification] = useState(null);
  const [isOwnerOfOpenClarification, setIsOwnerOfOpenClarification] = useState(false);
  const [showRaiseClarificationModal, setShowRaiseClarificationModal] = useState(false);
  const [showClarificationDetailModal, setShowClarificationDetailModal] = useState(false);
  const [showClarificationListModal, setShowClarificationListModal] = useState(false);
  const [selectedClarification, setSelectedClarification] = useState(null);

  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [isLoggedIn, setisLoggedIn] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [localId, setLocalId] = useState(router.query.id);

  // Update localId when router.query.id becomes available (after hydration)
  useEffect(() => {
    if (id && id !== localId) {
      setLocalId(id);
    }
  }, [id]);

  // Custom approval handler for RFQ/TENDER entity type
  const handleRFQApprove = async (comment, context) => {
    try {
      const payload = {
        approval_instance_id: context.approval_instance_id,
        approval_instance_step_id: context.approval_instance_step_id,
        action: 'APPROVE',
        comment: comment || ''
      };
      await submitRFQApprovalAction(id, payload);

      // Refresh RFQ details after approval
      getRFQdetails();

      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to approve' };
    }
  };

  // Custom rejection handler for RFQ/TENDER entity type
  const handleRFQReject = async (comment, context) => {
    try {
      const payload = {
        approval_instance_id: context.approval_instance_id,
        approval_instance_step_id: context.approval_instance_step_id,
        action: 'REJECT',
        comment: comment || ''
      };
      await submitRFQApprovalAction(id, payload);

      // Refresh RFQ details after rejection
      getRFQdetails();

      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || 'Failed to reject' };
    }
  };

  useEffect(() => {
    if (id) {
      getRFQdetails();
    }
  }, [id]);

  // Fetch clarifications for tenders
  const fetchClarifications = useCallback(async () => {
    if (!id || !rfqDetails?.is_tender) return;

    setClarificationsLoading(true);
    try {
      const response = await getClarifications(id, token);
      // API returns: { status: 1, data: { clarifications: [], open_clarification: null, has_open: false, is_own_clarification: boolean, is_buyer: boolean } }
      const responseData = response?.data?.data || response?.data || {};

      // Clarifications list - API only returns vendor's own clarifications (already filtered by backend)
      const clarificationsList = responseData?.clarifications || [];
      setClarifications(clarificationsList);

      // Use has_open and open_clarification from response
      setHasOpenClarification(responseData?.has_open || false);
      setOpenClarification(responseData?.open_clarification || null);

      // Use is_own_clarification from API (backend handles privacy)
      setIsOwnerOfOpenClarification(responseData?.is_own_clarification || false);
    } catch (error) {
      console.error("Error fetching clarifications:", error);
    } finally {
      setClarificationsLoading(false);
    }
  }, [id, token, rfqDetails?.is_tender]);

  // Fetch clarifications when RFQ details are loaded (for tenders only)
  useEffect(() => {
    if (rfqDetails?.is_tender === 1) {
      fetchClarifications();
    }
  }, [rfqDetails?.is_tender, fetchClarifications]);

  useEffect(() => {
    if (type === "buyer-view") {
      setEnableBuyerView(true);
    }

    const token = storageInstance.getStorage("token");
    if (token) {
      setisLoggedIn(true);
    }

    if (redirectAfterLogin) {
      router.push(redirectAfterLogin);
      setRedirectAfterLogin(null);
    }
  }, [router]);


  const handleTermsToggle = (e) => {
    e.preventDefault(); // Prevent any unintended navigation
    setOpenTerms(!openTerms);
  };

  // Notify user when RA status changes and allows quote submission again
  useEffect(() => {
    // Only show toast if:
    // 1. RA status has changed
    // 2. RA is active
    // 3. Bid end date has passed
    // 4. Not in buyer view
    // 5. There are products left for bidding (not all finalized)
    // 6. No products have been finalized for any vendor
    if (raStatusChanged &&
        isReverseAuctionActive &&
        wasEndDatePassed &&
        !enableBuyerView &&
        productleftforbid &&
        rfqDetails?.products?.every(item =>
          item.finalization_status !== "Another vendor is finalized" &&
          item.finalization_status !== "You are finalized"
        )
    ) {
      toast.info("The reverse auction has started. You can send quotes again.", {
        position: "top-right",
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setRaStatusChanged(false);
    }
  }, [raStatusChanged, isReverseAuctionActive, wasEndDatePassed, enableBuyerView, productleftforbid, rfqDetails]);

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id, token)
      .then((res) => {
        setloading(false);
        let val = checkBidExpired(res.data?.bid_end_date);
        setIsSubmitable(!val);

        // Normalize terms data to ensure consistent structure and content
        if (res.data && res.data.terms && Array.isArray(res.data.terms)) {
          res.data.terms = res.data.terms.map(term => {
            // Get term content with comprehensive fallbacks
            const termContent =
              term.term_content || // First try term_content
              term.name || // Then try name
              (term.content && Array.isArray(term.content) && term.content[0]?.title) || // Then try content array
              term.term_text || // Then try term_text
              (term.original?.term_content) || // Then try original term content
              (term.original?.name) || // Then try original name
              (term.original?.content && Array.isArray(term.original.content) && term.original.content[0]?.title) || // Then try original content
              `Term ${term.id || 'Unknown'}`; // Fallback to ID

            // Return normalized term object
            return {
              id: term.id || term.term_id,
              name: termContent,
              term_content: termContent,
              // Keep original data for reference
              original: term.original || term
            };
          });
        }

        // Check if any products are not finalized
        const hasUnfinalizedProducts = res.data?.products?.some(
          product => product.finalization_status !== "Another vendor is finalized" &&
                    product.finalization_status !== "You are finalized"
        );

        // Only set productleftforbid to true if there are unfinalized products
        setproductleftforbid(hasUnfinalizedProducts);

        setrfqDetails(res.data);
        checkIfQuotationSendIsPossible(res.data);
        updatecurrentLowest(res.data?.products);
      })
      .catch((error) => {
        setloading(false);
        console.error("Error fetching RFQ details:", error);
      });
  };

  // Helper to get status values from product
  const getStatusValues = (item) => {
    const detailedStatus = productTechEvalDetails[item.id];
    const backendStatus = item.tech_evaluation_status;
    const isBuyerView = type === "buyer-view";

    return {
      isAccepted: backendStatus?.is_accepted === true || detailedStatus?.isAccepted === true,
      isRejected: backendStatus?.is_rejected === true || detailedStatus?.isRejected === true,
      allClausesResponded: backendStatus?.all_clauses_responded !== undefined ? backendStatus.all_clauses_responded : detailedStatus?.allClausesResponded,
      hasResponse: backendStatus?.has_response !== undefined ? backendStatus.has_response : detailedStatus?.hasResponse,
      respondedCount: backendStatus?.responded_count !== undefined ? backendStatus.responded_count : detailedStatus?.respondedCount || 0,
      totalClauses: backendStatus?.total_clauses !== undefined ? backendStatus.total_clauses : detailedStatus?.vendorResponseCount || 0,
      detailedStatus,
      backendStatus,
      isBuyerView
    };
  };

  // Helper function to determine status from backend response
  const determineStatusFromBackend = (backendStatus, isBuyerView = false) => {
    const {
      has_tech_eval,
      is_accepted,
      is_rejected,
      has_response,
      all_clauses_responded,
      responded_count,
      total_clauses,
      rejection_reason
    } = backendStatus || {};

    let status = 'pending_vendor';
    let statusText = isBuyerView ? '[PENDING] Vendor Response Pending' : '[PENDING] Your Response Pending';
    let statusColor = '#6c757d';
    let bgColor = '#e9ecef';

    if (!has_tech_eval) {
      return {
        status: 'not_applicable',
        statusText: 'N/A',
        statusColor: '#6c757d',
        bgColor: '#f8f9fa',
        hasResponse: false,
        allClausesResponded: false,
        someClausesResponded: false,
        hasDeviation: false,
        isAccepted: false,
        isRejected: false,
        techEvalStatus: 0,
        techEvalCleared: null,
        vendorResponseCount: total_clauses || 0,
        respondedCount: 0
      };
    }

    if (is_accepted) {
      status = 'accepted';
      statusText = '[ACCEPTED] Technically Accepted';
      statusColor = '#198754';
      bgColor = '#d1e7dd';
    } else if (is_rejected) {
      status = 'rejected';
      statusText = '[REJECTED] Technically Rejected';
      statusColor = '#dc3545';
      bgColor = '#f8d7da';
    } else if (all_clauses_responded) {
      status = 'pending_buyer';
      statusText = isBuyerView ? '[AWAITING] Awaiting Your Evaluation' : '[AWAITING] Awaiting Buyer Evaluation';
      statusColor = '#ffc107';
      bgColor = '#fff3cd';
    } else if (has_response && responded_count > 0 && responded_count < total_clauses) {
      status = 'partial';
      statusText = isBuyerView ? '[INCOMPLETE] Vendor Partially Submitted' : '[INCOMPLETE] Partially Submitted';
      statusColor = '#fd7e14';
      bgColor = '#ffe5d0';
    } else {
      status = 'pending_vendor';
      statusText = isBuyerView ? '[PENDING] Vendor Response Pending' : '[PENDING] Your Response Pending';
      statusColor = '#6c757d';
      bgColor = '#e9ecef';
    }

    return {
      status,
      statusText,
      statusColor,
      bgColor,
      hasResponse: has_response || false,
      allClausesResponded: all_clauses_responded || false,
      someClausesResponded: has_response && !all_clauses_responded,
      hasDeviation: false,
      isAccepted: is_accepted || false,
      isRejected: is_rejected || false,
      techEvalStatus: is_rejected ? 1 : (is_accepted ? 1 : 0),
      techEvalCleared: is_accepted || is_rejected ? {
        status: is_accepted ? 1 : 0,
        rejection_reason: rejection_reason || null
      } : null,
      vendorResponseCount: total_clauses || 0,
      respondedCount: responded_count || 0
    };
  };

  // Fetch detailed tech eval status for a product
  const fetchProductTechEvalDetails = async (productId, rfqId) => {
    if (loadingTechEvalDetails[productId] || productTechEvalDetails[productId]) {
      return;
    }

    setLoadingTechEvalDetails(prev => ({ ...prev, [productId]: true }));

    try {
      let vendorId = null;
      try {
        const currentUser = storageInstance.getStorage("user");
        if (currentUser) {
          const userData = typeof currentUser === 'string' ? JSON.parse(currentUser) : currentUser;
          vendorId = userData?.id || null;
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }

      if (!vendorId || isNaN(parseInt(vendorId))) {
        const isBuyerView = type === "buyer-view";
        const pendingStatus = {
          status: 'pending_vendor',
          statusText: isBuyerView ? '[PENDING] Vendor Response Pending' : '[PENDING] Your Response Pending',
          statusColor: '#6c757d',
          bgColor: '#e9ecef',
          hasResponse: false,
          allClausesResponded: false,
          someClausesResponded: false,
          hasDeviation: false,
          isAccepted: false,
          isRejected: false,
          techEvalStatus: 0,
          techEvalCleared: null,
          vendorResponseCount: 0,
          respondedCount: 0
        };
        setProductTechEvalDetails(prev => ({ ...prev, [productId]: pendingStatus }));
        setLoadingTechEvalDetails(prev => ({ ...prev, [productId]: false }));
        return;
      }

      const payload = {
        rfq_id: rfqId,
        rfq_product_id: productId,
        vendor_id: parseInt(vendorId)
      };

      const responseRes = await fetchVendorAgreement(payload);
      const clearedRes = await getTechClearedVendorsResult(payload);

      if (!responseRes || !responseRes.status || !responseRes.data) {
        const isBuyerView = type === "buyer-view";
        const pendingStatus = {
          status: 'pending_vendor',
          statusText: isBuyerView ? '[PENDING] Vendor Response Pending' : '[PENDING] Your Response Pending',
          statusColor: '#6c757d',
          bgColor: '#e9ecef',
          hasResponse: false,
          allClausesResponded: false,
          someClausesResponded: false,
          hasDeviation: false,
          isAccepted: false,
          isRejected: false,
          techEvalStatus: 0,
          techEvalCleared: null,
          vendorResponseCount: 0,
          respondedCount: 0
        };
        setProductTechEvalDetails(prev => ({ ...prev, [productId]: pendingStatus }));
        return;
      }

      const vendorResponse = Array.isArray(responseRes.data) ? responseRes.data : [];
      const techEvalCleared = clearedRes?.data || null;
      const techEvalStatus = clearedRes?.status || 0;

      const respondedItems = vendorResponse.filter(
        item => item &&
                item.vendor_response &&
                typeof item.vendor_response === 'string' &&
                item.vendor_response.trim() !== '' &&
                item.vendor_response.trim() !== 'N/A'
      );
      const respondedCount = respondedItems.length;
      const vendorResponseCount = vendorResponse.length;

      const hasResponse = respondedCount > 0;
      const allClausesResponded = hasResponse && respondedCount === vendorResponseCount && vendorResponseCount > 0;
      const someClausesResponded = hasResponse && respondedCount > 0 && respondedCount < vendorResponseCount;
      const hasDeviation = vendorResponse && vendorResponse.some(
        item => item.has_deviation === true || item.has_deviation === 1
      );
      const isAccepted = techEvalCleared?.status === 1;
      const isRejected = techEvalCleared?.status === 0 && techEvalStatus === 1;

      const isBuyerView = type === "buyer-view";
      let status, statusText, statusColor, bgColor;

      if (isAccepted) {
        status = 'accepted';
        statusText = '[ACCEPTED] Technically Accepted';
        statusColor = '#198754';
        bgColor = '#d1e7dd';
      } else if (isRejected) {
        status = 'rejected';
        statusText = '[REJECTED] Technically Rejected';
        statusColor = '#dc3545';
        bgColor = '#f8d7da';
      } else if (allClausesResponded) {
        status = 'pending_buyer';
        statusText = isBuyerView ? '[AWAITING] Awaiting Your Evaluation' : '[AWAITING] Awaiting Buyer Evaluation';
        statusColor = '#ffc107';
        bgColor = '#fff3cd';
      } else if (someClausesResponded) {
        status = 'partial';
        statusText = isBuyerView ? '[INCOMPLETE] Vendor Partially Submitted' : '[INCOMPLETE] Partially Submitted';
        statusColor = '#fd7e14';
        bgColor = '#ffe5d0';
      } else {
        status = 'pending_vendor';
        statusText = isBuyerView ? '[PENDING] Vendor Response Pending' : '[PENDING] Your Response Pending';
        statusColor = '#6c757d';
        bgColor = '#e9ecef';
      }

      setProductTechEvalDetails(prev => ({
        ...prev,
        [productId]: {
          status,
          statusText,
          statusColor,
          bgColor,
          hasResponse,
          allClausesResponded,
          someClausesResponded,
          hasDeviation,
          isAccepted,
          isRejected,
          techEvalStatus,
          techEvalCleared,
          vendorResponseCount,
          respondedCount
        }
      }));
    } catch (error) {
      console.error(`Error fetching tech eval details for product ${productId}:`, error);
      const isBuyerView = type === "buyer-view";
      const pendingStatus = {
        status: 'pending_vendor',
        statusText: isBuyerView ? '[PENDING] Vendor Response Pending' : '[PENDING] Your Response Pending',
        statusColor: '#6c757d',
        bgColor: '#e9ecef',
        hasResponse: false,
        allClausesResponded: false,
        someClausesResponded: false,
        hasDeviation: false,
        isAccepted: false,
        isRejected: false,
        techEvalStatus: 0,
        techEvalCleared: null,
        vendorResponseCount: 0,
        respondedCount: 0
      };
      setProductTechEvalDetails(prev => ({ ...prev, [productId]: pendingStatus }));
    } finally {
      setLoadingTechEvalDetails(prev => ({ ...prev, [productId]: false }));
    }
  };

  const updatecurrentLowest = (products) => {
    if (products && Array.isArray(products)) {
      // Extract technical evaluation status for each product
      products.forEach(product => {
        if (product.tech_evaluation_status) {
          if (product.tech_evaluation_status.has_tech_eval && product.tech_evaluation_status.has_response !== undefined) {
            const status = determineStatusFromBackend(product.tech_evaluation_status, type === "buyer-view");
            setProductTechEvalDetails(prev => ({ ...prev, [product.id]: status }));
          } else if (id && product.id) {
            fetchProductTechEvalDetails(product.id, id);
          }
        } else if (id && product.id) {
          fetchProductTechEvalDetails(product.id, id);
        }
      });

      // Check if any product has pending/incomplete tech eval (blocks quote submission)
      const pendingTechEval = products.some(product => {
        const te = product.tech_evaluation_status;
        return te && te.has_tech_eval === true && te.all_clauses_responded !== true;
      });
      setHasPendingTechEval(pendingTechEval);

      // Determine if lowest quotation should be visible based on technical evaluation
      const hasLowestQuotation = products.some(product => {
        const hasTechEval = product.tech_evaluation_status?.has_tech_eval;
        const isAccepted = product.tech_evaluation_status?.is_accepted;

        return product.lowest_quotation !== null &&
               (!hasTechEval || (hasTechEval && isAccepted));
      });

      setCurrentLowest(hasLowestQuotation && showLowestPrice);
    } else {
      setCurrentLowest(null);
    }
  };

  const handleRFqClose = (e) => {
    e.preventDefault();
    setShowCloseConfirmModal(true);
  };

  const handleCloseConfirm = async () => {
    setcloseRFqLoading(true);
    try {
      await closeRFQ(id);
      getRFQdetails();
      toast.success(`${getEntityLabel(rfqDetails?.is_tender)} closed successfully`);
    } catch (err) {
      console.error("Error closing Tender / RFQ:", err);
      toast.error(`Failed to close ${getEntityLabel(rfqDetails?.is_tender)}`);
    } finally {
      setcloseRFqLoading(false);
      setShowCloseConfirmModal(false);
    }
  };

  const handleCloseCancel = () => {
    setShowCloseConfirmModal(false);
  };

  const checkIfQuotationSendIsPossible = useCallback(() => {
    // --- Initial Setup ---
    const now = new Date();
    // Consider memoizing date objects outside this callback with useMemo for performance optimization
    const bidEndDateRaw = rfqDetails?.bid_end_date ? new Date(rfqDetails.bid_end_date) : null;
    const bidEndDateEndOfDay = bidEndDateRaw ? new Date(bidEndDateRaw.getFullYear(), bidEndDateRaw.getMonth(), bidEndDateRaw.getDate(), 23, 59, 59, 999) : null;
    const raStartDate = rfqDetails?.ra_start_date ? new Date(rfqDetails.ra_start_date) : null;
    const raEndDate = rfqDetails?.ra_end_date ? new Date(rfqDetails.ra_end_date) : null;

    const isReverseAuction = rfqDetails?.reverse_auction == 1;
    const isRfqClosed = rfqDetails?.status == 2;
    const areAllProductsFinalized = !productleftforbid; // Assumes productleftforbid is boolean/truthy

    // --- Determine Status ---
    // Default state: Allowed to send quote during normal bidding period
    let isDisabled = false;
    let message = "Send Quote";
    let currentIsReverseAuctionActive = false;

    // Changes by Agnij 2025-05-05 [Ensure RFQ closed status takes precedence]
    // Priority 1: Tender / RFQ Closed (highest priority)
    if (isRfqClosed) {
      isDisabled = true;
      message = `${getEntityLabel(rfqDetails?.is_tender)} is Closed`;
    }
    // Priority 1.5: Open Clarification blocks quote submission (for tenders only)
    else if (rfqDetails?.is_tender === 1 && hasOpenClarification) {
      isDisabled = true;
      message = "Clarification in Progress";
    }
    // Priority 2: Active Reverse Auction (only if RFQ is not closed)
    else if (isReverseAuction && raStartDate && raEndDate && now >= raStartDate && now <= raEndDate) {
      isDisabled = false; // Explicitly allowed
      message = "Reverse Auction is Active";
      currentIsReverseAuctionActive = true;
    }
    // Check other disabling conditions only if RA is not currently active and RFQ is not closed
    else {
        // Priority 3: All Products Finalized
      if (areAllProductsFinalized) {
            isDisabled = true;
            message = "All Products are Finalized";
        }
        // Priority 4: Past Bid End Date
        // Changes by Agnij 2025-05-05 [Ensure quotes can be updated until end of bid end date]
        else if (bidEndDateEndOfDay && now > bidEndDateEndOfDay) {
            isDisabled = true; // Disable by default if bid ended
            if (isReverseAuction) {
                if (raEndDate && now > raEndDate) {
                    message = "Reverse Auction has Ended";
                } else if (raStartDate && now < raStartDate) {
                    message = "Bidding Period Ended (Reverse Auction Pending)";
                } else if (!raStartDate || !raEndDate) {
                    message = "Bidding Period Ended (RA Dates Invalid)";
                } else {
                    // Should not happen if Priority 1 caught active RA, but acts as fallback
                    message = "Bidding Period Ended";
                }
            } else {
                // No RA, bid just ended
                message = "Bidding Period has Ended";
            }
        }
        // Priority 5: Invalid RFQ State (No Bid End Date)
        else if (!bidEndDateRaw) {
            isDisabled = true;
            message = "RFQ Not Open for Bidding";
        }
        // If none of the above conditions met, the default "Send Quote" state remains.
    }

    // --- Update State ---
    setIsReverseAuctionActive(currentIsReverseAuctionActive);
    setQuoteDisabled(isDisabled);
    setStatusMessage(message);

    // Changes by Agnij 2025-05-05 [Only show technical evaluation restrictions during active RA]
    // Only apply technical evaluation restrictions during active reverse auction
    setShowTechEvalRestrictions(currentIsReverseAuctionActive);

    // Update current lowest visibility based on RA status
    setShowLowestPrice(currentIsReverseAuctionActive);

    // Track if current RA status is different from previous to notify user
    if (wasEndDatePassed !== (bidEndDateEndOfDay && now > bidEndDateEndOfDay)) {
      setWasEndDatePassed(bidEndDateEndOfDay && now > bidEndDateEndOfDay);
      if (isReverseAuction && raStartDate && now >= raStartDate) {
        setRaStatusChanged(true);
      }
    }

  }, [rfqDetails, productleftforbid, hasOpenClarification]);

  useEffect(() => {
    if (rfqDetails) {
      checkIfQuotationSendIsPossible();
    }
  }, [rfqDetails, checkIfQuotationSendIsPossible]);

  const handleRegretQuote = ({ regret_reason }, resetForm) => {
    let bidProducts = [];
    if (rfqDetails.products.length > 0) {
      rfqDetails.products.map((item, index) => {
        bidProducts.push({
          id: item.id,
          product_id: item.product_id,
          variant: item.variant,
          quantity: item?.product_specs?.find(spec => spec?.title === 'Quantity')?.value || 0,
          product_name: item.product_details
            ? item.product_details[0].name
            : "",
          unit_price: 0,
          package_price: 0,
          tax: 0,
          freight_price: 0,
          total_price: 0,
          comment: "",
          delivery_period: "",
        });
      });
    }

    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: bidProducts,
      is_regret: 1,
      regret_reason: regret_reason,
      globalPaymentTerms: "",
      globalComment: "",
    };

    setsubmitLoading(true);
    sendQuotation(payload, token)
      .then((res) => {
        setsubmitLoading(false);
        setregretModal(false);
        toast.success("Quote regret submitted successfully!")
        // toast.success("Quote regret submitted successfully!", {
        //   onClose: () => {
        //     // Reload the page after the toast is closed
        //     window.location.href = `/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`;
        //   }
        // });
        window.location.href = `/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`;
      })
      .catch((err) => {
        setsubmitLoading(false);
        setregretModal(false);
        toast.error("Failed to submit regret. Please try again.");
      });
  };

  const addCommasToNumber = (number) => {
    let numberString = number.toString();
    let parts = numberString.split(".");

    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const goToQuoteCreation = () => {
    // Changes by Agnij 2025-05-05 [Pass tech eval restriction flag to quote page]
    router.push(
      `/dashboard/vendor/send-quote?id=${id}${token !== undefined ? `&token=${token}` : ''}&showTechEvalRestrictions=${isReverseAuctionActive}`
    );
  };

  return (
    <>
      {loading && (
        <>
          <section className="buyer-common-header sc-pt-80 ">
            <div className="container-fluid">
              <h1 className="heading">
                <PlaceholderLoading shape="rect" width={600} height={50} />
              </h1>
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1 hasFullLoader">
            {loading && <Loader />}
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-12">
                  <div className="manage-rfq-con">
                    {/* Content for Manage RFQs tab */}
                    <span className="title">
                      <PlaceholderLoading
                        shape="rect"
                        width={200}
                        height={10}
                      />
                      <br />
                      <PlaceholderLoading
                        shape="rect"
                        width={200}
                        height={10}
                      />
                    </span>

                    <div className="details-table">
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr>
                              <th>Name of product</th>
                              <th>Size specifications & Quantity</th>
                              <th>TDS</th>
                              <th>Quality Assurance Plan (QAP)</th>
                              <th>Comments</th>
                              <th>Selected vendors</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={200}
                                  height={15}
                                />
                              </td>
                              <td>
                                <div className="size-specification">
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />

                                  <FontAwesomeIcon icon={faEye} />
                                </div>
                              </td>

                              <td>
                                <div>
                                  <span>
                                    <FontAwesomeIcon icon={faEye} />
                                  </span>
                                  <span>
                                    <Image
                                      src="/assets/images/download-icon.png"
                                      alt="Workwise"
                                      width={16}
                                      height={16}
                                      priority={true}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <span>
                                    <FontAwesomeIcon icon={faEye} />
                                  </span>
                                  <span>
                                    <Image
                                      src="/assets/images/download-icon.png"
                                      alt="Workwise"
                                      width={16}
                                      height={16}
                                      priority={true}
                                    />
                                  </span>
                                </div>
                              </td>
                              <td>
                                <PlaceholderLoading
                                  shape="rect"
                                  width={200}
                                  height={10}
                                />
                              </td>
                              <td>
                                <span>
                                  <PlaceholderLoading
                                    className="mr-4"
                                    shape="rect"
                                    width={50}
                                    height={10}
                                  />
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <form>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>

                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>
                              <div className="col-md-3">
                                <div className="form-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={10}
                                  />
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={300}
                                    height={40}
                                  />
                                </div>
                              </div>

                              <div className="col-md-12">
                                <div className="form-group">
                                  <div className="form-group">
                                    <PlaceholderLoading
                                      shape="rect"
                                      width={"100%"}
                                      height={10}
                                    />
                                    <PlaceholderLoading
                                      shape="rect"
                                      width={"100%"}
                                      height={150}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row">
                            <div className="col-md-8">
                              <h4>
                                {" "}
                                <PlaceholderLoading
                                  shape="rect"
                                  width={300}
                                  height={10}
                                />
                              </h4>

                              <ul style={{ listStyle: "none" }}>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                                <li>
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={"100%"}
                                    height={10}
                                  />
                                </li>
                              </ul>
                            </div>
                          </div>
                          <PlaceholderLoading
                            shape="rect"
                            width={200}
                            height={50}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      {/* // Not loading contents */}
      {!loading && rfqDetails && rfqDetails.id && (
        <>
          <section className="buyer-common-header sc-pt-80">
            <div className="container-fluid">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-4">
                <div>
                  {!enableBuyerView && (
                    <h1 className="heading mb-0">
                      Inquiry from {rfqDetails.company_name} ({getEntityLabel(rfqDetails?.is_tender)} #
                      {rfqDetails.rfq_no})
                    </h1>
                  )}
                </div>
                {!enableBuyerView && <div className="d-flex gap-3">
                  {/* Queries Button */}
                  <button
                    id="view_queries-rfq_header-inquiries_details_page"
                    type="button"
                    className="btn btn-primary position-relative"
                    style={{ minWidth: 140 }}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push({
                        pathname: `/dashboard/${
                          type === "buyer-view" ? "buyer" : "vendor"
                        }/query`,
                        query: {
                          rfq_id: rfqDetails.id,
                          role: type === "buyer-view" ? "buyer" : "vendor",
                          token: token,
                        },
                      });
                    }}
                  >
                    Queries
                    {rfqDetails.unseen_query_count > 0 && (
                      <span className="bg-danger px-2 rounded ms-2 text-white small position-absolute top-0 end-0 translate-middle">
                        {rfqDetails.unseen_query_count}+
                      </span>
                    )}
                  </button>

                  {/* Clarification Button - Only for Tenders */}
                  {rfqDetails?.is_tender === 1 && (
                    <>
                      {/* Main Clarification Button */}
                      {(() => {
                        const now = new Date();
                        const publishDate = rfqDetails?.tender_publish_date ? new Date(rfqDetails.tender_publish_date) : null;
                        const clarificationEndDate = rfqDetails?.vendor_clarification_date ? new Date(rfqDetails.vendor_clarification_date) : null;
                        
                        // Check if tender is published (status = 1 or is_published = 1)
                        // If status/is_published fields are not available, assume published if tender_publish_date is null or in the past
                        const publishState = getRFQPublishState(rfqDetails || {});
                        const isPublished = publishState?.isOpen || rfqDetails?.is_published === 1 || rfqDetails?.status === 1;
                        
                        // If published, only check clarification end date
                        // If not published, check both publish date and clarification end date
                        // If publishDate is null, allow clarifications (backward compatibility)
                        const isWithinClarificationPeriod = clarificationEndDate && now < clarificationEndDate &&
                          (isPublished || !publishDate || now >= publishDate);

                        // Case 1: No open clarification - can raise new one (if within period)
                        if (!hasOpenClarification) {
                          return isWithinClarificationPeriod ? (
                            <button
                              type="button"
                              className="btn btn-warning"
                              onClick={() => setShowRaiseClarificationModal(true)}
                            >
                              Raise Clarification
                            </button>
                          ) : null;
                        }

                        // Case 2: Current vendor's open clarification - view their clarification
                        if (isOwnerOfOpenClarification) {
                          return (
                            <button
                              type="button"
                              className="btn btn-warning position-relative"
                              onClick={() => {
                                setSelectedClarification(openClarification);
                                setShowClarificationDetailModal(true);
                              }}
                            >
                              View My Clarification
                              <Badge bg="light" text="dark" className="ms-2">
                                Pending
                              </Badge>
                            </button>
                          );
                        }

                        // Case 3: Someone else's open clarification - button disabled
                        return (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled
                            title="Another vendor has raised a clarification. Please wait for it to be resolved."
                          >
                            Clarification in Progress
                          </button>
                        );
                      })()}

                      {/* My Clarifications History Button - Only show if vendor has past clarifications */}
                      {clarifications.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-dark position-relative"
                          onClick={() => setShowClarificationListModal(true)}
                        >
                          My Clarifications
                          <Badge
                            bg={isOwnerOfOpenClarification ? "warning" : "secondary"}
                            className="ms-2"
                          >
                            {clarifications.length}
                          </Badge>
                        </button>
                      )}
                    </>
                  )}

                  {/* Regret Quote Button (conditional rendering example) */}
                  {!enableBuyerView &&
                    rfqDetails.quotations.length === 0 &&
                    productleftforbid && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.preventDefault();
                          setregretModal(true);
                        }}
                      disabled={
                        (quoteDisabled && statusMessage !== "Reverse Auction is Active") ||
                        rfqDetails.status == 2 ||
                        rfqDetails.products?.every(
                          (item) =>
                            item.finalization_status === "Another vendor is finalized" ||
                            item.finalization_status === "You are finalized"
                        )
                      }

                      >
                        Regret Quote
                      </button>
                    )}
                  {/* Send Quote Button / Disabled State */}
                  {!enableBuyerView && rfqDetails.quotations.length === 0 && (
                    <button
                      type="button"
                      className={`btn ${
                        isReverseAuctionActive ? "btn-success" : "btn-secondary"
                      }`}
                      onClick={goToQuoteCreation}
                      disabled={
                        hasPendingTechEval ||
                        (quoteDisabled &&
                          statusMessage !== "Reverse Auction is Active") ||
                        rfqDetails.status == 2 ||
                        rfqDetails.products?.every(
                          (item) =>
                            item.finalization_status ===
                              "Another vendor is finalized" ||
                            item.finalization_status === "You are finalized"
                        )
                      }
                      title={hasPendingTechEval ? "Technical evaluation is pending - complete all tech eval responses first" : ""}
                    >
                      {hasPendingTechEval ? "Tech Eval Pending" : isReverseAuctionActive ? "Send Quote" : statusMessage}
                    </button>
                  )}
                  {rfqDetails.status == 1 &&
                  !rfqDetails?.quotations[0]?.is_regret &&
                  productleftforbid &&
                  isSubmitAble &&
                  rfqDetails.quotations?.length > 0 &&
                  !(rfqDetails?.is_tender === 1 && hasOpenClarification) &&
                  !rfqDetails.products?.some(
                    (item) =>
                      item.finalization_status ===
                        "Another vendor is finalized" ||
                      item.finalization_status === "You are finalized"
                  ) ? (
                    <button
                      id="update_your_quote-rfq_header-inquiries_details_page"
                      type="button"
                      className="btn btn-secondary m-0 p-2"
                      style={{ width: "240px" }}
                      disabled={hasPendingTechEval}
                      title={hasPendingTechEval ? "Technical evaluation is pending - complete all tech eval responses first" : ""}
                      onClick={() => {
                        // Use localId which is guaranteed to be set after hydration
                        const rfqId = localId || id;
                        if (!rfqId) {
                          toast.error(`Unable to load ${getEntityLabel(rfqDetails?.is_tender)} details. Please refresh the page.`);
                          return;
                        }
                        router.push(
                          `/dashboard/vendor/send-quote?type=update-quote&id=${rfqId}${
                            token !== undefined ? `&token=${token}` : ""
                          }&showTechEvalRestrictions=${isReverseAuctionActive}`
                        );
                      }}
                    >
                      <>
                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                        {hasPendingTechEval ? "Tech Eval Pending" : "Update Your Quote"}
                      </>
                    </button>
                  ) : null}
                </div>}
              </div>
            </div>
          </section>

          <section className="buyer-rfq-det-sec-1">
            <div className="container-fluid">
              <div className="row">
                <div className="col-md-12">
                  {/* Approval Pending Banner - Shows at top for buyers when action is needed */}
                  {enableBuyerView && rfqDetails?.id && (
                    <section className="mt-3 mx-1">
                      <ApprovalPendingBanner
                        entityType={rfqDetails?.is_tender === 1 ? "TENDER" : "RFQ"}
                        entityId={id}
                        entityLabel={rfqDetails?.is_tender === 1 ? "Tender" : "RFQ"}
                      />
                    </section>
                  )}

                  {/* Ready to Publish Banner - Shows when RFQ is approved and awaiting publication */}
                  {enableBuyerView && rfqDetails?.is_published === 0 && rfqDetails?.status === 4 && rfqDetails?.tender_publish_date && (
                    <Alert
                      variant="info"
                      className="border-0 shadow-sm mt-3 mx-1"
                      style={{
                        background: "linear-gradient(135deg, #cce5ff 0%, #b8daff 100%)",
                        borderLeft: "4px solid #0d6efd",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 40,
                            height: 40,
                            backgroundColor: "#0d6efd",
                            flexShrink: 0,
                          }}
                        >
                          <BsCalendarEvent size={20} className="text-white" />
                        </div>
                        <div>
                          <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                            <BsCheckCircleFill className="text-success" size={16} />
                            Ready to Publish
                          </div>
                          <div className="text-dark opacity-75 small d-flex align-items-center gap-2">
                            This {getEntityLabel(rfqDetails?.is_tender).toLowerCase()} has been approved and will be published automatically.
                            <PublishDateTimer publishDate={rfqDetails.tender_publish_date} variant="badge" showLabel={true} />
                          </div>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Pending Approval Banner - Shows when RFQ is submitted for approval */}
                  {enableBuyerView && rfqDetails?.is_published === 0 && rfqDetails?.status === 3 && (
                    <Alert
                      variant="warning"
                      className="border-0 shadow-sm mt-3 mx-1"
                      style={{
                        background: "linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%)",
                        borderLeft: "4px solid #ffc107",
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 40,
                            height: 40,
                            backgroundColor: "#ffc107",
                            flexShrink: 0,
                          }}
                        >
                          <BsClockFill size={20} className="text-dark" />
                        </div>
                        <div>
                          <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                            <BsClockFill className="text-warning" size={16} />
                            Pending Approval
                          </div>
                          <div className="text-dark opacity-75 small">
                            This {getEntityLabel(rfqDetails?.is_tender).toLowerCase()} is currently under review and awaiting approval before publication.
                            {rfqDetails?.tender_publish_date && (
                              <span className="ms-2">
                                <PublishDateTimer publishDate={rfqDetails.tender_publish_date} variant="badge" showLabel={true} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Clarification Blocking Banner - Shows when a clarification is open */}
                  {!enableBuyerView && rfqDetails?.is_tender === 1 && hasOpenClarification && (
                    <section className="mt-3 mx-1">
                      <ClarificationBlockingBanner
                        clarification={openClarification}
                        onViewDetails={isOwnerOfOpenClarification ? () => {
                          setSelectedClarification(openClarification);
                          setShowClarificationDetailModal(true);
                        } : null}
                        clarificationDeadline={rfqDetails?.vendor_clarification_date}
                        isOwner={isOwnerOfOpenClarification}
                      />
                    </section>
                  )}

                  {/* RFQ Details Section */}
                  <div className="bg-light p-3 rounded-2">
                    <div className="row g-3">
                      {rfqDetails?.company_name && (
                        <div className="col-md-2 col-sm-6">
                          <strong>Company Name:</strong>
                          <div>{rfqDetails.company_name}</div>
                        </div>
                      )}
                      
                      {/* hotel list : currently usiing only company data here to display, need to change */}
                      {rfqDetails?.hotel_name && (
                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Hotels:</strong>
                          <div>{rfqDetails.hotel_name}</div>
                        </div>
                      )}

                      {rfqDetails?.contact_name && (
                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Contact Persone:</strong>
                          <div>{rfqDetails.contact_name}</div>
                        </div>
                      )}
                      {rfqDetails?.response_email && (
                        <div className="  col-md-2 col-sm-6">
                          <strong>Email:</strong>
                          <div className="text-break" style={{ wordBreak: "break-all", overflowWrap: "break-word" }}>{rfqDetails.response_email}</div>
                        </div>
                      )}

                      {rfqDetails?.contact_number && (
                        <div className="  col-md-2 col-sm-6">
                          <strong>Contact Number:</strong>
                          <div className="text-break" style={{ wordBreak: "break-all", overflowWrap: "break-word" }}>{rfqDetails.contact_number}</div>
                        </div>
                      )}

                        <div className="  col-md-2 col-sm-6"> 
                          <strong>Type:</strong>
                          <div>
                            {Number(rfqDetails.is_tender) == 1 ? "Tender" : `RFQ ${ rfqDetails?.rfq_type ||"" } `}
                          </div>
                        </div>


                {rfqDetails?.bid_end_date && (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Quote Submission Deadline:</strong>
                          <div>{rfqDetails.bid_end_date}</div>
                        </div>
                      )}

                {rfqDetails?.tender_publish_date && (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Tender Publish Date:</strong>
                          <div>{rfqDetails.tender_publish_date}</div>
                        </div>
                      )}

                {rfqDetails?.vendor_clarification_date && (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Clarification Date:</strong>
                          <div>{rfqDetails.vendor_clarification_date}</div>
                        </div>
                      )}
                      
                      {rfqDetails?.tender_fees && rfqDetails?.is_tender   ? (
                        <div className=" col-md-2 col-sm-6 ">
                          <strong>Tender Fees:</strong>
                          <div>₹{addCommasToNumber(rfqDetails.tender_fees / 100)}</div>
                        </div>
                      ):""}
                              
                      {rfqDetails?.ra_start_date && (
                        <div className="  col-md-4 col-sm-6 ">
                          <strong>Reverse Auction:</strong>
                          <div>
                         {new Date(rfqDetails.ra_start_date).toLocaleString("en-GB", {
                           day: "numeric",
                           month: "short",
                           year: "numeric",
                           hour: "numeric",
                           minute: "2-digit",
                           hour12: true,
                         })}
                         
                         <strong className="mx-1" > to </strong>

                         {new Date(rfqDetails.ra_end_date).toLocaleString("en-GB", {
                           day: "numeric",
                           month: "short",
                           year: "numeric",
                           hour: "numeric",
                           minute: "2-digit",
                           hour12: true,
                         })}
                          </div>
                        </div>
                      )}


                      {rfqDetails?.location && (
                        <div className="col-md-4 col-sm-6 ">
                          <strong>Delivery Location:</strong>
                          <div>{rfqDetails.location}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="manage-rfq-con">
                    {/* Content for Manage RFQs tab */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="title mb-0">
                        {getEntityLabel(rfqDetails?.is_tender)} #{rfqDetails.rfq_no} details
                      </span>

                      <div>
                        {/* Edit button - Hidden for pre-publish approval states (status=3/4) */}
                        {type === "buyer-view" && (
                          rfqDetails.is_published === 0 && (rfqDetails.status === 3 || rfqDetails.status === 4) ? null : (
                            rfqDetails.status === 1
                          ) && (
                            <Link
                              href={`/dashboard/buyer/rfq-management-edit?id=${rfqDetails.id}`}
                            >
                              <button
                                id="edit_rfq-rfq_header-inquiries_details_page"
                                type="button"
                                className="btn btn-primary me-2"
                                style={{ width: "auto" }}
                              >
                                <FontAwesomeIcon icon={faEdit} className="me-2" />
                                Edit {getEntityLabel(rfqDetails?.is_tender)}
                              </button>
                            </Link>
                          )
                        )}

                        {/* Compare Quotes - Hidden for pre-publish states */}
                        {type == "buyer-view" && !(rfqDetails.is_published === 0 && (rfqDetails.status === 3 || rfqDetails.status === 4)) &&
                          (rfqDetails?.is_quotes_present ? (
                            <Link
                              href={`/dashboard/buyer/quote-compare?rfq=${rfqDetails.id}`}
                            >
                              <button
                                id="compare_received_quotes-rfq_header-inquiries_details_page"
                                type="button"
                                className="btn btn-secondary "
                                style={{ width: "270px" }}
                              >
                                Compare Received Quotes
                              </button>
                            </Link>
                          ) : (
                            <button
                              id="no_quotes_received-rfq_header-inquiries_details_page"
                              type="button"
                              className="btn btn-primary"
                              style={{ width: "230px" }}
                              disabled
                            >
                              No Quotes Received
                            </button>
                          ))}

                        {/* Clarifications Button - For Buyer View on Tenders */}
                        {type == "buyer-view" && rfqDetails?.is_tender === 1 && (
                          <Link
                            href={`/dashboard/buyer/clarification-management?rfq_id=${rfqDetails.id}`}
                          >
                            <button
                              id="clarifications-rfq_header-inquiries_details_page"
                              type="button"
                              className={`btn ${hasOpenClarification ? "btn-danger" : "btn-warning"}`}
                              style={{ width: hasOpenClarification ? "200px" : "180px" }}
                            >
                              Clarifications
                              {hasOpenClarification && (
                                <Badge bg="light" text="danger" className="ms-2">
                                  OPEN
                                </Badge>
                              )}
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="details-table">
                      <div className="table-responsive">
                        <table className="table table-striped ">
                          <thead>
                            <tr className="text-nowrap">
                              <th>Name of product</th>
                              <th>Size & specifications</th>
                              <th>Quantity</th>
                              {isReverseAuctionActive && (
                                <th>Current Lowest</th>
                              )}
                              <th>TDS</th>
                              <th>QAP</th>
                              {type != "buyer-view" && (
                                <th>Finalization Status</th>
                              )}
                              <th>Comments</th>
                              {type == "buyer-view" && !rfqDetails.is_tender ? (
                                <th>Selected vendors</th>
                              ) : null}
                              <th>Negotiation</th>
                              {<th>Technical Evaluation</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {rfqDetails?.products?.map((item) => {
                              let size, spec, qty, unit;
                              item?.product_specs?.map((p_spec) => {
                                switch (p_spec.title) {
                                  case "Size":
                                    size = p_spec.value;
                                    break;
                                  case "Spec":
                                    spec = p_spec.value;
                                    break;
                                  case "Quantity":
                                    qty = p_spec.value;
                                    break;
                                  case "Unit":
                                    unit = p_spec.value;
                                    break;
                                  default:
                                    break;
                                }
                              });

                              const itemStatus = getStatusValues(item);
                              const isPartiallySubmitted = itemStatus.hasResponse && itemStatus.respondedCount > 0 && itemStatus.totalClauses > 0 && itemStatus.respondedCount < itemStatus.totalClauses;
                              const awaitingBuyer = itemStatus.allClausesResponded && itemStatus.hasResponse && !itemStatus.isAccepted && !itemStatus.isRejected;
                              const statusFlags = { isAccepted: itemStatus.isAccepted, isRejected: itemStatus.isRejected, awaitingBuyer, isPartiallySubmitted };

                              return (
                                <tr
                                  key={`${item?.id}_${item?.product_id}_${item?.variant}`}
                                  style={getTechEvalRowStyle(productTechEvalDetails[item.id])}
                                >
                                  <td>
                                    {item?.product_details[0]?.name}
                                  </td>
                                  <td
                                    style={{
                                      minWidth: "300px",
                                      maxWidth: "500px",
                                    }}
                                  >
                                    <div className="row">
                                      <div className="col-12 mb-1">
                                        <div className="d-flex align-items-start" style={{ gap: "0.5rem" }}>
                                          <strong style={{ whiteSpace: "nowrap" }}>Size: </strong>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            {size && size !== "----" ? (
                                              <ReadMore
                                                content={size}
                                                maxLines={3}
                                              />
                                            ) : (
                                              "----"
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="col-12 mb-1">
                                        <div className="d-flex align-items-start" style={{ gap: "0.5rem" }}>
                                          <strong style={{ whiteSpace: "nowrap" }}>Spec: </strong>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            {spec && spec !== "----" ? (
                                              <ReadMore
                                                content={spec}
                                                maxLines={3}
                                              />
                                            ) : (
                                              "----"
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="col-12 d-block  rounded-2 p-2 mb-1">
                                        {item.SPEC_files ? (
                                          <p className="fw-bold mb-1">
                                            File Attachments
                                          </p>
                                        ) : (
                                          ""
                                        )}
                                        <div className="row mx-1">
                                          {item.spec_file?.map(
                                            (file, index) => (
                                              <a
                                                key={index}
                                                href={file}
                                                target="_blank"
                                                className="col-md-6 page-link text-truncate mb-1"
                                                style={{ maxWidth: "200px" }}
                                              >
                                                <FontAwesomeIcon
                                                  icon={faDownload}
                                                  className="ms-0 me-2"
                                                />
                                                {extractfileName(file)}
                                              </a>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td>{`${qty ?? "N/A"}-${unit ?? "N/A"}`}</td>
                                  {isReverseAuctionActive &&
                                    (item?.lowest_quotation ? (
                                      <td>
                                        {addCommasToNumber(
                                          item?.lowest_quotation?.total_price
                                        )}
                                      </td>
                                    ) : (
                                      <td>--</td>
                                    ))}

                                  <td>
                                    {item.datasheet_file ? (
                                      <>{renderFileLink(item.datasheet_file)}</>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </td>
                                  <td>
                                    {item.qap_file ? (
                                      <>{renderFileLink(item.qap_file)}</>
                                    ) : (
                                      <span>N/A</span>
                                    )}
                                  </td>
                                  {type != "buyer-view" && (
                                    <td>
                                      {item.finalization_status ==
                                      "You are finalized" ? (
                                        <span
                                          className="text-success"
                                          style={{ pointerEvents: "none" }}
                                        >
                                          You are finalized
                                        </span>
                                      ) : item.finalization_status ==
                                        "Another vendor is finalized" ? (
                                        <span
                                          className="text-danger"
                                          style={{ pointerEvents: "none" }}
                                        >
                                          Another vendor is finalized
                                        </span>
                                      ) : (
                                        <span className="text-warning">
                                          No vendor finalized yet
                                        </span>
                                      )}
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      minWidth: "250px",
                                      maxWidth: "400px",
                                    }}
                                  >
                                    {item?.comment && item?.comment != "" ? (
                                      <ReadMore
                                        content={item.comment}
                                        maxLines={4}
                                        additionalClasses="text-sm"
                                      />
                                    ) : (
                                      "N/A"
                                    )}
                                  </td>

                                  {type == "buyer-view" && !rfqDetails.is_tender && (
                                    <td>
                                      <span className="fw-semibold">
                                        Selected vendors ({item.vendors_count})
                                      </span>
                                    </td>
                                  )}

                                  <NegotiationColumnCell
                                    rfq_id={rfqDetails?.id}
                                    rfq_product_id={item.id}
                                    productName={item?.product_details[0]?.name || ''}
                                  />

                                  <td
                                    style={getTechEvalCellStyle(
                                      productTechEvalDetails[item.id],
                                      item.tech_evaluation_status?.has_tech_eval,
                                      loadingTechEvalDetails[item.id],
                                      item.tech_evaluation_status?.is_accepted
                                    )}
                                  >
                                    {item.tech_evaluation_status?.has_tech_eval ? (
                                      <div>
                                        {loadingTechEvalDetails[item.id] ? (
                                          <div
                                            className="d-flex align-items-center justify-content-center"
                                            style={{
                                              padding: "8px 10px",
                                              borderRadius: "6px",
                                              backgroundColor: "#f8f9fa",
                                              border: "1px solid #dee2e6",
                                              minWidth: "160px"
                                            }}
                                          >
                                            <span className="badge bg-secondary" style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>Loading...</span>
                                          </div>
                                        ) : (
                                          <a
                                            href={`/dashboard/${
                                              type === "buyer-view"
                                                ? "buyer"
                                                : "vendor"
                                            }/technical-evaluation?rfq_id=${id}&prod_id=${
                                              item.id
                                            }&token=${token}`}
                                            style={{
                                              textDecoration: "none",
                                              display: "inline-block",
                                              width: "100%"
                                            }}
                                          >
                                            <div
                                              className="d-flex flex-column gap-1"
                                              style={getContainerStyle(statusFlags)}
                                            >
                                              <span
                                                className="badge"
                                                style={getBadgeStyle(statusFlags)}
                                              >
                                                {getBadgeText(itemStatus, isPartiallySubmitted)}
                                              </span>
                                              <div style={{ fontSize: "0.7rem", color: "#6c757d", marginTop: "2px" }}>
                                                {getHelperText(itemStatus, isPartiallySubmitted)}
                                              </div>
                                            </div>
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted">N/A</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <form>
                        <div className="row">
                          <div className="col-md-12">
                            <div className="row wacomnamepp">

                              {type == "buyer-view" &&
                                rfqDetails?.project_name &&
                                rfqDetails?.project_name != "" && (
                                  <div className="col-md-3">
                                    <div className="form-group mt-0 mb-2">
                                      <label
                                        htmlFor="project_name"
                                        className="form-label"
                                      >
                                        Project Name
                                      </label>
                                      <input
                                        type="text"
                                        id="project_name"
                                        className="form-control"
                                        name="project_name"
                                        disabled
                                        value={`${rfqDetails?.project_name}`}
                                      />
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>

                          {rfqDetails && rfqDetails?.id && (
                            <div className="col-md-12">
                              <div className="row terms-conditions">
                                <div className="col-md-6">
                                  <div className="mt-4 pt-3 border-top">
                                    <h4>Terms & Conditions</h4>
                                    {(!rfqDetails?.terms ||
                                      rfqDetails?.terms.length === 0) && (
                                      <p className="mt-3">
                                        No predefined terms selected!
                                      </p>
                                    )}
                                    {rfqDetails?.terms?.length > 0 && (
                                      <ol className="mt-3">
                                        {rfqDetails.terms.map((item, index) => {
                                          const termContent =
                                            item.term_content ||
                                            item.name ||
                                            (item.content &&
                                              item.content[0]?.title);
                                          if (!termContent) return null;

                                          return (
                                            <li
                                              key={`term-${item.id || index}`}
                                              className="mb-2"
                                            >
                                              {termContent}
                                            </li>
                                          );
                                        })}
                                      </ol>
                                    )}
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  {rfqDetails.finalizations &&
                                    rfqDetails.finalizations.length > 0 && (
                                      <div className="finalized-details"></div>
                                    )}

                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret ===
                                      0 && (
                                      <div className="submitted-quotation">
                                        <h4>
                                          You've already submitted a quotation
                                          on{" "}
                                          {moment
                                            .utc(
                                              rfqDetails?.quotations[0]
                                                ?.timestamp
                                            )
                                            .local()
                                            .format("hh:mm A - DD/MM/YYYY")}
                                        </h4>

                                        {rfqDetails.quotations[0]?.products?.length > 0 && (
                                          <p className="text-muted mb-2" style={{ fontSize: "0.9rem" }}>
                                            <strong>Grand Total (incl. GST):</strong>{" "}
                                            {formatPrice(
                                              rfqDetails.quotations[0].products.reduce(
                                                (sum, p) => sum + (Number(p.total_price) || 0), 0
                                              )
                                            )}
                                          </p>
                                        )}

                                        {rfqDetails.status === 2 ||
                                        !productleftforbid ||
                                        quoteDisabled ||
                                        rfqDetails.products?.every(
                                          (item) =>
                                            item.finalization_status ===
                                              "Another vendor is finalized" ||
                                            item.finalization_status ===
                                              "You are finalized"
                                        ) ? (
                                          <button
                                            type="button"
                                            className={`btn ${
                                              rfqDetails.status === 2
                                                ? "btn-danger"
                                                : wasEndDatePassed &&
                                                  isReverseAuctionActive
                                                ? "btn-success"
                                                : "btn-secondary"
                                            } m-0 mx-auto mt-2`}
                                            style={{
                                              width: "240px",
                                              opacity: "0.5",
                                            }}
                                            disabled={
                                              quoteDisabled ||
                                              rfqDetails.status === 2
                                            }
                                          >
                                            <FontAwesomeIcon
                                              icon={faCircleExclamation}
                                              className="me-2"
                                            />
                                            {rfqDetails.status === 2
                                              ? "RFQ is Closed"
                                              : rfqDetails.products?.some(
                                                  (item) =>
                                                    item.finalization_status ===
                                                      "Another vendor is finalized" ||
                                                    item.finalization_status ===
                                                      "You are finalized"
                                                )
                                              ? rfqDetails.products?.some(
                                                  (item) =>
                                                    item.finalization_status ===
                                                    "You are finalized"
                                                )
                                                ? "You are finalized"
                                                : "Another vendor is finalized"
                                              : statusMessage ||
                                                "All Products are Finalized"}
                                          </button>
                                        ) : hasPendingTechEval ? (
                                            <button
                                              type="button"
                                              className="btn btn-secondary m-0"
                                              style={{ width: "240px", opacity: "0.5" }}
                                              disabled
                                              title="Technical evaluation is pending - complete all tech eval responses first"
                                            >
                                              <FontAwesomeIcon
                                                icon={faCircleExclamation}
                                                className="me-2"
                                              />
                                              Tech Eval Pending
                                            </button>
                                          ) : (
                                          <Link
                                            className="mx-auto mt-2"
                                            href={`/dashboard/vendor/send-quote?type=update-quote&id=${localId || id || ''}${
                                              token !== undefined
                                                ? `&token=${token}`
                                                : ""
                                            }&showTechEvalRestrictions=${isReverseAuctionActive}`}
                                            onClick={(e) => {
                                              if (!localId && !id) {
                                                e.preventDefault();
                                                toast.error(`Unable to load ${getEntityLabel(rfqDetails?.is_tender)} details. Please refresh the page.`);
                                              }
                                            }}
                                          >
                                            <button
                                              type="button"
                                              className="btn btn-secondary m-0"
                                              style={{ width: "240px" }}
                                            >
                                              <FontAwesomeIcon
                                                icon={faEdit}
                                                className="me-2"
                                              />
                                              Update Your Quote
                                            </button>
                                          </Link>
                                        )}
                                      </div>
                                    )}

                                  {rfqDetails.quotations.length > 0 &&
                                    rfqDetails.quotations[0].is_regret ===
                                      1 && (
                                      <div className="submitted-quotation">
                                        <h4 className="text-center">
                                          You've{" "}
                                          <span style={{ color: "#f00" }}>
                                            declined
                                          </span>{" "}
                                          the RFQ request on{" "}
                                          {moment(
                                            rfqDetails?.quotations[0]?.timestamp
                                          )
                                            .add(5, "hours")
                                            .add(30, "minutes")
                                            .format("DD/MM/YYYY - hh:mm:ss A")}
                                        </h4>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}

                          {rfqDetails.TERM_files &&
                            rfqDetails.TERM_files.length > 0 && (
                              <div className="col-md-12 mb-2">
                                <div className="row">
                                  <div className="col-md-6">
                                    <h4>Terms & Conditions File</h4>
                                    <div className="row mt-2">
                                      {rfqDetails.TERM_files.map((file) => (
                                        <div className="col-md-6 col-lg-4">
                                          <a
                                            href={file}
                                            target="_blank"
                                            key={file}
                                            className="file-badge mb-2"
                                            type="button"
                                          >
                                            <FontAwesomeIcon
                                              icon={faDownload}
                                              className="ms-0 me-2"
                                            />
                                            <span className="text-truncate">
                                              {extractfileName(file)}
                                            </span>
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          <div className="col-md-12">
                            <div className="row">
                              <div className="col-md-6">
                                <h4>Additional Terms & Conditions</h4>
                                <div className="form-group">
                                  <textarea
                                    id="comment"
                                    className="form-control text-sm fw-normal"
                                    name="comment"
                                    placeholder="comment here"
                                    rows={5}
                                    disabled
                                    value={rfqDetails?.comment}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          {enableBuyerView && (
                            <>
                              {rfqDetails?.status == 1 && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={handleRFqClose}
                                  disabled={closeRFqLoading}
                                >
                                  {closeRFqLoading
                                    ? "Processing request..."
                                    : `Mark ${getEntityLabel(rfqDetails?.is_tender)} as Closed`}
                                </button>
                              )}
                              {rfqDetails?.status == 2 && (
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={(e) => e.preventDefault()}
                                  disabled={true}
                                >
                                  {getEntityLabel(rfqDetails?.is_tender)} has been closed
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Approval Workflow Section - Only visible to buyers */}
                        {enableBuyerView && rfqDetails?.id && (
                          <div className="approval-workflow-section mt-4">
                            <ApprovalWorkflowSection
                              entityType={rfqDetails?.is_tender === 1 ? "TENDER" : "RFQ"}
                              entityId={id}
                              entityLabel={rfqDetails?.is_tender === 1 ? "Tender" : "RFQ"}
                              hospitalityCompanyId={rfqDetails?.hospitality_company_id}
                              hotelId={rfqDetails?.hotel_id}
                              departmentId={rfqDetails?.department_id}
                              onCustomApprove={handleRFQApprove}
                              onCustomReject={handleRFQReject}
                              onActionComplete={() => {
                                getRFQdetails();
                              }}
                            />
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {!loading && rfqDetails && !rfqDetails.id && (
        <section className="buyer-common-header sc-pt-80">
          <div className="container-fluid">
            {<h1 className="heading">Tender / RFQ Not Available!</h1>}
          </div>
        </section>
      )}
      <RegretQuoteReasonModal
        handleRegretReason={handleRegretQuote}
        showModal={regretModal}
        closeModal={() => {
          setregretModal(false);
        }}
      />

      {/* ------------- Auth Modal ------------- */}
      <LoginContainer
        loading={loading}
        setloading={setloading}
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
      />

      {/* Close Tender / RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseConfirmModal}
        onClose={handleCloseCancel}
        onConfirm={handleCloseConfirm}
        title={`Close ${getEntityLabel(rfqDetails?.is_tender)}`}
        description={`Are you sure you want to close ${getEntityLabel(rfqDetails?.is_tender)} #${
          rfqDetails?.rfq_no || `this ${getEntityLabel(rfqDetails?.is_tender)}`
        }?\nOnce closed, vendors will no longer be able to submit quotes.`}
        confirmButtonColor="warning"
        confirmButtonText={`Close ${getEntityLabel(rfqDetails?.is_tender)}`}
        cancelButtonText="Cancel"
      />

      {/* Raise Clarification Modal */}
      <RaiseClarificationModal
        show={showRaiseClarificationModal}
        onHide={() => setShowRaiseClarificationModal(false)}
        rfqId={rfqDetails?.id}
        token={token}
        onSuccess={() => {
          fetchClarifications();
          setShowRaiseClarificationModal(false);
        }}
      />

      {/* Clarification Detail Modal */}
      <ClarificationDetailModal
        show={showClarificationDetailModal}
        onHide={() => {
          setShowClarificationDetailModal(false);
          setSelectedClarification(null);
        }}
        clarification={selectedClarification}
        isBuyer={false}
        isOwner={true}
        onSuccess={() => {
          fetchClarifications();
          setShowClarificationDetailModal(false);
          setSelectedClarification(null);
        }}
        token={token}
        onRefresh={fetchClarifications}
      />

      {/* Clarification List Modal - API already returns only vendor's own clarifications */}
      <ClarificationListModal
        show={showClarificationListModal}
        onHide={() => setShowClarificationListModal(false)}
        clarifications={clarifications}
        isBuyer={false}
        onRefresh={fetchClarifications}
        token={token}
      />
    </>
  );
};

export default RfqManagementPreview;