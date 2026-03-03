import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { useRouter } from "next/router";
import { getRfqs, fetchVendorSelectionOption, getAllClauses, getRFQById, submitTechEvalForApproval } from "@/services/rfq";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import ClauseProductItem from "./ClauseProductItem";
import { toast } from "react-toastify";
import { getProjectList } from '@/services/project';
import { getUserMappings } from '@/services/hospitality';
import Select from 'react-select';
import { formatDisplayDate, formatRFQNumber, getEntityLabel } from "@/utils/sharedFunctions";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import { Badge, Modal } from "react-bootstrap";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import EvaluationProgressTracker from "./EvaluationProgressTracker";
import UnifiedSubmitForApproval from "./UnifiedSubmitForApproval";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import { BsBuilding, BsPerson, BsEnvelope, BsTelephone, BsCalendar3, BsGeoAlt, BsHouse, BsArrowRepeat, BsClipboardCheck, BsBoxArrowUpRight, BsTag, BsChatLeftText } from "react-icons/bs";
import { TARGET_PASSED_VENDORS } from "@/utils/constants/techEvalWorkflow";
import styles from "./TechnicalEvaluation.module.scss";



const BuyerTechnicalEvaluation = () => {
  const router = useRouter();
  const { rfq_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setcurrentRfq] = useState(null);
  const [vendorMap, setVendorMap] = useState(new Map());
  const [clauseMap, setClauseMap] = useState(null);
  const [rfqNo, setRfqNo] =useState(null);
  const [projects, setProjects] = useState(null);
  const [allProjects, setAllProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [clauseInfo, setClauseInfo] = useState(null);
  const [selectedVendorsMap, setSelectedVendorsMap] = useState(new Map());
  const [isTenderFilter, setIsTenderFilter] = useState(null);
  const [productEvaluationStatus, setProductEvaluationStatus] = useState(new Map());
  const [showUnifiedSubmitModal, setShowUnifiedSubmitModal] = useState(false);
  const [unifiedSubmitLoading, setUnifiedSubmitLoading] = useState(false);
  const [rfqCompletionMap, setRfqCompletionMap] = useState(new Map());

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
    enabled: !!currentRfq,
  });

  // For technical evaluation, "write" access means either update OR create permission
  const canWrite = canUpdate || canCreate;

  // Track if we've verified permissions for the current RFQ
  const [permissionsVerified, setPermissionsVerified] = useState(false);

  const getAllProjects = () => {
    getProjectList()
        .then((res) => {
            let d = [];
            (res.data.data || res.data || []).map((item) => {
                d.push({ label: item.name, value: item.id, hospitality_company_id: item.hospitality_company_id, hotel_id: item.hotel_id });
            });
            setProjects(d);
            setAllProjects(d);
        })
        .catch((error) => {
            console.log(error)
        })
  }

  const fetchUserHotelMappings = async () => {
    try {
      const response = await getUserMappings();
      const mappings = (response?.data || []).filter(m => m.hospitality_hotel_id != null);
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
    }
  }

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);
    
    // Filter projects based on selected hotels
    if (!hotelIds || hotelIds.length === 0) {
      setProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => hotelIds.includes(p.hotel_id));
      setProjects(filtered);
    }
    
    // Reset project selection when hotels change
    setSelectedproject(null);
  }

useEffect(() => {
  const handler = setTimeout(() => {
    getTechEvaluationRFQsByUser();
  }, 1000);

  return () => {
    clearTimeout(handler);
  };
}, [rfqNo,selectedproject, isTenderFilter]);

  const getUserDetails = async () => {
    try {
      const res = await getProfile();
      setcurrentUserProfile(res.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const getTechEvaluationRFQsByUser = async () => {
    try {
      setLoading(true);
      const res = await getRfqs({
        tech_eval: true,
        page: 1,
        limit: 100,
        project_id: selectedproject ? selectedproject : -1,
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
      return;
    }

    try {
      setLoading(true);
      const rfqDetailsRes = await getRFQById(rfq_id);
      const selectedRfq = Array.isArray(rfqDetailsRes.data) ? rfqDetailsRes.data[0] : rfqDetailsRes.data;

      if (!selectedRfq) {
        console.error('No RFQ found for ID:', rfq_id);
        setcurrentRfq(null);
        return;
      }

      // Set RFQ data for permission context (hotel_id is needed for permission check)
      setcurrentRfq(selectedRfq);
      setPermissionsVerified(false); // Reset when RFQ changes
    } catch (error) {
      console.log(error);
      toast.error(error.message || `Failed to load ${getEntityLabel(currentRfq?.is_tender)} details`);
      setcurrentRfq(null);
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Fetch full clause/evaluation data only after permissions verified
  const fetchEvaluationData = async () => {
    if (!rfq_id || !currentRfq) return;

    try {
      setLoading(true);
      const res = await getAllClauses(rfq_id, "tech_evaluation");
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
      setPermissionsVerified(true);
    } catch (error) {
      console.log(error);
      toast.error(error.message || 'Failed to load evaluation data');
    } finally {
      setLoading(false);
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

  // Count how many products have at least one vendor evaluated
  const evaluatedProductCount = useMemo(() => {
    if (!clauseInfo || clauseInfo.length === 0) return 0;
    return clauseInfo.filter(rfqProduct => {
      const vendors = rfqProduct?.vendors || [];
      return vendors.some(v => v.has_marks);
    }).length;
  }, [clauseInfo]);

  // Unified submit handler for all products
  const handleUnifiedSubmitForApproval = async () => {
    if (!currentRfq || !clauseInfo) return;

    try {
      setUnifiedSubmitLoading(true);

      // Only submit products that have at least one vendor evaluated
      const evaluatedProducts = clauseInfo.filter(rfqProduct => {
        const vendors = rfqProduct?.vendors || [];
        return vendors.some(v => v.has_marks);
      });

      if (evaluatedProducts.length === 0) {
        toast.error("No products have been evaluated yet.");
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
    getAllProjects();
    fetchUserHotelMappings();
  }, []);

  // Stage 1: Fetch RFQ metadata when rfq_id changes (for permission context)
  useEffect(() => {
    fetchRFQMetadata();
  }, [rfq_id]);

  // Stage 2: Fetch full evaluation data only after permissions are verified
  useEffect(() => {
    if (rfq_id && currentRfq && !permissionsLoading && canRead && !permissionsVerified) {
      fetchEvaluationData();
    }
  }, [rfq_id, currentRfq, permissionsLoading, canRead, permissionsVerified]);

  // Background check: determine which RFQs have completed tech evaluation
  // An RFQ is "Completed" only when ALL its products have >= TARGET_PASSED_VENDORS cleared vendors
  useEffect(() => {
    if (!rfqList || rfqList.length === 0) {
      setRfqCompletionMap(new Map());
      return;
    }

    let cancelled = false;

    const checkCompletion = async () => {
      const results = new Map();
      const batchSize = 5;

      for (let i = 0; i < rfqList.length; i += batchSize) {
        if (cancelled) return;
        const batch = rfqList.slice(i, i + batchSize);

        const promises = batch.map(async (rfq) => {
          try {
            const res = await getAllClauses(rfq.id, "tech_evaluation");
            const clauseData = res?.data ?? [];
            if (clauseData.length === 0) return { id: rfq.id, complete: false };

            const allComplete = clauseData.every(product => {
              const acceptedVendors = (product.vendors || []).filter(v => v.is_cleared === 1);
              return acceptedVendors.length >= TARGET_PASSED_VENDORS;
            });
            return { id: rfq.id, complete: allComplete };
          } catch {
            return { id: rfq.id, complete: false };
          }
        });

        const batchResults = await Promise.allSettled(promises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.set(result.value.id, result.value.complete);
          }
        });
      }

      if (!cancelled) {
        setRfqCompletionMap(new Map(results));
      }
    };

    checkCompletion();
    return () => { cancelled = true; };
  }, [rfqList]);

  // Keep rfqCompletionMap in sync when current RFQ's evaluation status changes
  useEffect(() => {
    if (!rfq_id || !clauseInfo || clauseInfo.length === 0) return;

    const productIds = clauseInfo.map(item => item.rfq_product_id);
    const allComplete = productIds.every(productId => {
      const status = productEvaluationStatus.get(productId);
      return status?.workflowComplete === true;
    });

    setRfqCompletionMap(prev => {
      const newMap = new Map(prev);
      newMap.set(parseInt(rfq_id), allComplete);
      return newMap;
    });
  }, [rfq_id, clauseInfo, productEvaluationStatus]);

  // Access Denied check - show when user has no read permission
  // Only check when an RFQ is selected and we have permission context
  const hasPermissionContext = hotelIds.length > 0 && !!currentRfq;

  // Permission loading state - show loading while permissions are being verified
  // Data is NOT fetched until permissions are verified
  if (currentRfq && (permissionsLoading || (!permissionsVerified && canRead))) {
    return (
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted">Verifying permissions...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hasPermissionContext && !permissionsLoading && !canRead) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message={`You do not have permission to view technical evaluations for this ${getEntityLabel(currentRfq?.is_tender)}. Contact your administrator to request access.`}
        backUrl="/dashboard/buyer"
        backLabel="Back to Dashboard"
      />
    );
  }

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
          <div className="row" style={{ flexWrap: 'nowrap', gap: '16px' }}>

            {/* RFQ List */}
              <RFQListSidebar
                title="Technical Evaluation"
                rfqList={rfqList}
                loading={loading}
                selectedRfqId={currentRfq?.id}
                linkPrefix="/dashboard/buyer/technical-evaluation"
                linkQueryKey="rfq_id"
                tabs={[
                  {
                    key: 'action_required',
                    label: 'Action Required',
                    filter: (item) => rfqCompletionMap.get(item.id) !== true,
                  },
                  {
                    key: 'action_completed',
                    label: 'Completed',
                    filter: (item) => rfqCompletionMap.get(item.id) === true,
                  },
                ]}
                defaultTab="action_required"
                rfqNo={rfqNo}
                onRfqNoChange={(val) => setRfqNo(val)}
                searchPlaceholder="Search by number..."
                userHotelMappings={userHotelMappings}
                selectedHotelIds={selectedHotelIds}
                onHotelSelectionChange={handleHotelSelectionChange}
                projects={projects || []}
                onProjectChange={(val) => setSelectedproject(val)}
                showTypeFilter={true}
                isTenderFilter={isTenderFilter}
                onTenderFilterChange={(val) => setIsTenderFilter(val)}
                getItemTags={(item, isSelected) => {
                  if (isSelected) return [];
                  const tags = [];
                  if (rfqCompletionMap.get(item.id) === true) {
                    tags.push({ label: 'Completed', variant: 'success' });
                  } else if (item.approval_required) {
                    tags.push({ label: 'Approval Pending', variant: 'warning' });
                  }
                  return tags;
                }}
                pageId="technical_evaluation"
              />

            {/* Main Container */}
            <div className="col-md-10" style={{ flex: '1 1 0%', width: 'auto', maxWidth: 'none', minWidth: 0, overflow: 'hidden' }}>
              <div className="quote-sec-table quote-sec-tab">

                {/* Empty State - when no RFQ selected */}
                {!loading && !currentRfq && (
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
                {!loading && currentRfq && (
                  <div className={styles.rfqHeader}>
                    {/* Hero Strip */}
                    <div className={styles.rfqHero}>
                      <div className={styles.rfqHeroLeft}>
                        <div className={styles.rfqHeroNumber}>
                          <span>{entityLabel} No: {currentRfq.rfq_no}</span>
                          <span className={`${styles.rfqTypeBadge} ${currentRfq.is_tender === 1 ? styles.tenderType : styles.rfqType}`}>
                            {currentRfq.is_tender === 1 ? 'Tender' : 'RFQ'}
                          </span>
                        </div>
                        {currentRfq.title && currentRfq.title != "" && (
                          <h3 className={styles.rfqHeroTitle}>{currentRfq.title}</h3>
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

                <div className="quote-sec-main">
                  <>
                    {!loading && currentRfq && clauseInfo && clauseInfo.length > 0 && (
                      <h3 className={styles.productsHeading}>{entityLabel} Products</h3>
                    )}

                    {/* Evaluation Progress Tracker */}
                    {clauseInfo && clauseInfo.length > 0 && (
                      <EvaluationProgressTracker
                        clauseInfo={clauseInfo}
                        productEvaluationStatus={productEvaluationStatus}
                      />
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
                              <div className={styles.productHeader}>
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
                              </div>

                              {/* Product Body */}
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
                                />
                              </div>
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
                      />
                    )}
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BuyerTechnicalEvaluation;