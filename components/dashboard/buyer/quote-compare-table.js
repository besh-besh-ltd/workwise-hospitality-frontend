import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faEnvelope, faUser } from "@fortawesome/free-regular-svg-icons";
import { faAward, faHistory, faPhone } from "@fortawesome/free-solid-svg-icons";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import Dropdown from "react-bootstrap/Dropdown";
import CommonModal from "@/components/modal/CommonModal";
import ReadMore from "@/components/shared/ReadMore";
import { calculateTotal, extractfileName } from "@/utils/sharedFunctions";
import { useRouter } from "next/router";
import QuoteHistoryModal from "@/components/modal/QuoteHistoryModal";
import FinalizeVendorModal from "./FinalizeVendorModal";
import FinalizeHistoryModal from "./FinalizeHistoryModal";
import { toast } from "react-toastify";
import HierarchySelectionModal from "./HierarchySelectionModal";
import { Badge } from "react-bootstrap";
import RoundEndActions from "./negotiation/RoundEndActions";
import ApprovalWorkflowSection from "./approval/ApprovalWorkflowSection";
import SelectedQuotesDisplay from "./negotiation/SelectedQuotesDisplay";
import { getQuoteApprovalStatus, approveNegotiationQuotes, rejectNegotiationQuotes } from "@/services/negotiation";
import { getAvailableHierarchies } from "@/services/general";

const QuoteCompareTable = ({
  quotations,
  originalQuotations,
  quantity,
  handleFinalize,
  proditem,
  alreadyFinalized,
  isRfqClosed = false,
  projectId,
  availableBudget,
  targetPrice,
  targetHistory,
  normalizeFilter,
  freightFilter,
  vendorCodeMap = {},
  negotiationRoundQuotes = [], // Array of negotiation round quotes for this product
  activeRound = null, // Active negotiation round info
  onRoundEnded = null, // Callback when round ends
  canWrite = true,
  permissionsLoading = false,
  is_tender = false, // Whether this is a tender
  hospitalityCompanyId = null, // For approval workflow
  hotelId = null, // For approval workflow
  departmentId = null, // For approval workflow
}) => {
  // Common state to manage all the modals in the whole component
  const [activeModal, setActiveModal] = useState(null);

  // Helper function to check if vendor has missing freight or packaging costs
  const hasMissingCosts = (item) => {
    // Don't show highlighting when freight filter is active
    if (freightFilter) return false;

    if (!item) return false;

    // Ignore declined/regretted quotes
    if (item.is_regret == 1 || item?.quote_details?.is_regret == 1) return false;

    const freightPrice = parseFloat(item.freight_price) || 0;
    const packagePrice = parseFloat(item.package_price) || 0;
    
    return freightPrice === 0 || packagePrice === 0;
  };

  const [currentItem, setCurrentItem] = useState(null);
  const router = useRouter();
  const { rfq } = router.query;
  const [vendorData, setVendorData] = useState({});
  const [lowestQuote, setLowestQuote] = useState(null);
  const [quotehistorydata, setQuotehistorydata] = useState({
    product_details:[],
    previous_quotes:[]
  });
  const [existingPOId, setExistingPOId] = useState(null)
  const [availableHierarchies, setAvailableHierarchies] = useState([true]);
  const [useLegacyHierarchy, setUseLegacyHierarchy] = useState(true); // Default to true (legacy behavior)
  const [selectedRouteType, setSelectedRouteType] = useState(null); // 'ARC' or 'PO'
  const [quoteApprovalStatus, setQuoteApprovalStatus] = useState(null); // Quote approval status for tenders
  const [approvalRefreshKey, setApprovalRefreshKey] = useState(0); // Key to refresh approval 
  
  const fetchAvailableHierarchies = async () => {
    try {
      const result = await getAvailableHierarchies('po', projectId);
      setAvailableHierarchies(result.data || []);
      setUseLegacyHierarchy(result.use_legacy_hierarchy !== false); // false only if explicitly set to false
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    calculateLowestQuote();
    fetchAvailableHierarchies();
  }, []);

  // Load quote approval status for tenders
  useEffect(() => {
    if (is_tender && proditem?.id) {
      loadQuoteApprovalStatus();
    }
  }, [is_tender, proditem?.id, approvalRefreshKey]);

  const loadQuoteApprovalStatus = async () => {
    try {
      const response = await getQuoteApprovalStatus(proditem.id);
      if (response?.status === 1 && response?.data) {
        setQuoteApprovalStatus(response.data);
      }
    } catch (error) {
      // No approval status found, which is fine
      setQuoteApprovalStatus(null);
    }
  };

  const handleApprovalActionComplete = () => {
    // Refresh approval status after an action
    setApprovalRefreshKey(prev => prev + 1);
    if (onRoundEnded) {
      onRoundEnded();
    }
  };

  // Custom handlers for negotiation quote approval (using dedicated APIs)
  const handleCustomQuoteApprove = async (comment) => {
    try {
      await approveNegotiationQuotes(proditem.id, comment, departmentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to approve quotes' };
    }
  };

  const handleCustomQuoteReject = async (comment) => {
    try {
      await rejectNegotiationQuotes(proditem.id, comment, departmentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to reject quotes' };
    }
  };
//  console.log("logging the quotations recived ", quotations);
  const calculateLowestQuote = () => {
    const removeRegretQuotes = quotations.filter((item) => item.quote_details.is_regret != 1);
    if (removeRegretQuotes.length > 0) {
      const quoteWithLowestPrice = removeRegretQuotes?.reduce((lowest, currentItem) => {
        const curItemQuoteDetails = currentItem;
          const curItemVendorDetails = curItemQuoteDetails.quote_details.vendor_details;

          const lowestQuoteDetails = lowest;
          const lowestVendorDetails = lowestQuoteDetails.quote_details.vendor_details;

          const curQuantity = proditem.product_details[0].rfq_details.find(spec => spec.title == 'Quantity')?.value || curItemQuoteDetails.quantity
          const lowQuantity = proditem.product_details[0].rfq_details.find(spec => spec.title == 'Quantity')?.value || lowestQuoteDetails.quantity

          const currentTotal = calculateTotal(curItemQuoteDetails, curQuantity, normalizeFilter)
          const lowestTotal = calculateTotal(lowestQuoteDetails, lowQuantity, normalizeFilter)

          if (curItemQuoteDetails.unit_price > 0) {
            let curLowest = lowest;
            if (currentTotal < lowestTotal) curLowest = currentItem;
            else if (currentTotal == lowestTotal) {
              const curPrevWorked = curItemVendorDetails.prev_worked == 1;
              const lowestPrevWorked = lowestVendorDetails.prev_worked == 1;

              if (curPrevWorked && !lowestPrevWorked) curLowest = currentItem;
              else if (!curPrevWorked && lowestPrevWorked) curLowest = lowest;
              else {
                const curTimestamp = new Date(
                  currentItem.quote_details.timestamp.slice(0, 23)
                );
                const lowestTimestamp = new Date(
                  lowest.quote_details.timestamp.slice(0, 23)
                );

                if (curTimestamp < lowestTimestamp) curLowest = currentItem;
                else curLowest = lowest;
              }
            }

            return curLowest;
          }
          return lowest;
      });
      setLowestQuote(quoteWithLowestPrice);
    }
  };
  const handleNegotiate = (item) => {
    setVendorData(item?.quote_details?.vendor_details);
    setActiveModal('common');
  };

  const renderFileLink = (files,lable = "view file") => {
    return files.map((file, index) => (
      <a key={index} href={file.file_url} target="_blank" className="page-link text-truncate mb-1" style={{ maxWidth: "200px" }}>
        <FontAwesomeIcon icon={faDownload} className="ms-0 me-2" />
        {lable}
      </a>
    ));
  };

  const handleViewFinalizationHistory = () => {
    setActiveModal('finalize_history');
  }

  const productName = proditem?.product_details?.[0]?.product_name || 'Product';

  // For tenders, finalization is only allowed after quote approval is complete
  const isTenderAwaitingApproval = is_tender && (quoteApprovalStatus && quoteApprovalStatus?.approval_instance?.status !== 'APPROVED');
  const canFinalizeForTender = !is_tender || (quoteApprovalStatus?.approval_instance?.status === 'APPROVED');

  return (
    <>
      {/* Round End Actions - Show if round has ended */}
      {activeRound && (
        <RoundEndActions
          activeRound={activeRound}
          roundQuotes={negotiationRoundQuotes}
          rfq_id={rfq}
          rfq_product_id={proditem.id}
          productName={productName}
          onRoundCreated={onRoundEnded}
          onQuotesApproved={handleApprovalActionComplete}
          canWrite={canWrite}
          permissionsLoading={permissionsLoading}
          is_tender={is_tender}
          vendorCodeMap={vendorCodeMap}
          fullProduct={proditem}
          quoteApprovalStatus={quoteApprovalStatus}
          department_id={departmentId}
        />
      )}

      {/* Quote Approval Workflow Section - Show for tenders when approval is active */}
      {is_tender && quoteApprovalStatus?.approval_instance?.status && (
        <ApprovalWorkflowSection
          entityType="NEGOTIATION_QUOTE"
          entityId={proditem.id}
          entityLabel={`Quote Approval - ${productName}`}
          hospitalityCompanyId={hospitalityCompanyId}
          hotelId={hotelId}
          departmentId={departmentId}
          onCustomApprove={handleCustomQuoteApprove}
          onCustomReject={handleCustomQuoteReject}
          onActionComplete={handleApprovalActionComplete}
          vendorCodeMap={vendorCodeMap}
        />
      )}

      <div
        className="table-content"
        key={`${proditem.id}_${proditem.product_id}_${proditem.variant}`}
      >
        <div className="table-elements">
          <div className="table-row">
            <div className="table-col">
              <div className="table-si-row "></div>
              <div className="table-si-row table-grey-row">Quantity</div>
              <div className="table-si-row">Base Price</div>
              <div className="table-si-row fw-semibold table-grey-row">
                Sub Total Rate
              </div>
              <div className="table-si-row">Packaging (% / ₹)</div>
              <div className="table-si-row table-grey-row">Freight (% / ₹)</div>
              <div className="table-si-row">GST (% / ₹)</div>
              <div className="table-si-row fw-semibold table-grey-row">
                Total Rate
              </div>
              <div className="table-si-row fw-semibold">
                Target Price
              </div>
              <div className="table-si-row table-grey-row">Delivery Period (In Days)</div>
              <div className="table-si-row ">Comments</div>
              <div className="table-si-row table-grey-row">Vendor Documents</div>
              <div className="table-si-row ">
                Terms & Conditions
              </div>
              <div className="table-si-row table-grey-row">Payment Terms</div>
            </div>
            {quotations &&
              quotations.length > 0 &&
              quotations.map((item, index) => {
                // Check if the quote is updated
                let itemUpdated =
                  item.previous_quotes?.length > 0
                    ? item.previous_quotes[item.previous_quotes.length - 1]
                    : null;

                const rfqDetails = proditem?.product_details[0];
                const quantity =
                  rfqDetails?.rfq_details.find(
                    (spec) => spec.title == "Quantity"
                  )?.value || item.quantity;

                // Derive missing-costs using original quotations (pre-normalization)
                const originalItem = originalQuotations?.find(origItem => origItem.quote_id === item.quote_id) || item;
                const missingCosts = hasMissingCosts(originalItem);
                const isRegret = item?.quote_details?.is_regret == 1;

                // Check if this quote has a negotiation round quote
                const vendorId = item?.quote_details?.vendor_details?.id || item?.quote_details?.created_by;
                const roundQuote = negotiationRoundQuotes?.find(
                  rq => rq.vendor_id === vendorId && rq.rfq_product_id === proditem.id
                );

                // Determine background color based on price comparison
                let rowBgColor = 'transparent';
                let priceComparison = null;
                if (roundQuote && roundQuote.previous_price && roundQuote.quoted_price) {
                  const diff = roundQuote.quoted_price - roundQuote.previous_price;
                  if (diff < 0) {
                    rowBgColor = '#d4edda'; // Green - better (lower price)
                    priceComparison = 'better';
                  } else if (diff > 0) {
                    rowBgColor = '#f8d7da'; // Red - worse (higher price)
                    priceComparison = 'worse';
                  } else {
                    rowBgColor = '#fff3cd'; // Yellow - same
                    priceComparison = 'same';
                  }
                }

                // Quote approval status highlighting (takes precedence over round highlighting)
                const selectedQuoteIds = quoteApprovalStatus?.metadata?.selected_quotes?.map(q => q.quote_id) || [];
                const approvalStatus = quoteApprovalStatus?.approval_instance?.status;
                const isQuoteSelectedForApproval = selectedQuoteIds.includes(item.quote_id);

                // Check if this quote is ARC selected (by vendor_id)
                const isArcSelected = is_tender && quoteApprovalStatus?.metadata?.selected_quotes?.some(
                  sq => sq.vendor_id == vendorId
                ) && approvalStatus === 'APPROVED';

                // Determine border and background based on approval status
                let approvalBorderColor = roundQuote ? '#158993' : 'transparent';
                let approvalBorderWidth = roundQuote ? '2px' : '0';

                // ARC selected vendors get green border styling (override round quote border)
                if (isArcSelected) {
                  approvalBorderColor = '#198754'; // Success green
                  rowBgColor = '#d1e7dd';
                  approvalBorderWidth = '3px';
                } else if (isQuoteSelectedForApproval && approvalStatus) {
                  switch (approvalStatus) {
                    case 'PENDING':
                      approvalBorderColor = '#ffc107'; // Warning yellow
                      rowBgColor = '#fffbeb';
                      approvalBorderWidth = '3px';
                      break;
                    case 'APPROVED':
                      approvalBorderColor = '#198754'; // Success green
                      rowBgColor = '#d1e7dd';
                      approvalBorderWidth = '3px';
                      break;
                    case 'REJECTED':
                      approvalBorderColor = '#dc3545'; // Danger red
                      rowBgColor = '#f8d7da';
                      approvalBorderWidth = '3px';
                      break;
                  }
                }

                // Determine title text
                const titleText = isQuoteSelectedForApproval
                  ? `Quote ${approvalStatus === 'PENDING' ? 'pending approval' : approvalStatus === 'APPROVED' ? 'approved' : 'rejected'}`
                  : roundQuote
                    ? `This quote was submitted for Round ${activeRound?.round_number || ''}`
                    : '';

                return (
                  <div
                    className="table-col"
                    key={`tab_qq_${item.quote_id}_${index}`}
                    style={{
                      backgroundColor: rowBgColor,
                      border: approvalBorderWidth !== '0' ? `${approvalBorderWidth} solid ${approvalBorderColor}` : 'none',
                      borderRadius: '4px',
                      position: 'relative',
                      margin: '2px'
                    }}
                    title={titleText}
                  >
                    <div
                      className="table-si-row table-dark-row "
                      style={{ 
                        overflow: "visible"
                      }}
                    >
                      <span
                        className="d-block text-center fw-bold fs-5"
                        style={{ 
                          width: "100%"
                        }}
                      >
                        {(() => {
                          const vdRaw = item?.quote_details?.vendor_details || item?.vendor_details;
                          const vd = Array.isArray(vdRaw) ? vdRaw[0] : vdRaw;
                          const code = vd?.rfq_product_vendor_id
                            ? `VEN-${vd.rfq_product_vendor_id}`
                            : vd?.id && (vendorCodeMap?.[vd.id] || vendorCodeMap?.[String(vd.id)])
                            ? `VEN-${vendorCodeMap[vd.id] || vendorCodeMap[String(vd.id)]}`
                            : 'VEN-NA';
                          return code;
                        })()}
                        {roundQuote && activeRound && !isArcSelected && (
                          <Badge bg="info" className="ms-2" style={{ fontSize: "0.7rem" }}>
                            Round {activeRound.round_number} Quote
                          </Badge>
                        )}
                        {isArcSelected && (
                          <Badge
                            bg="success"
                            className="ms-2"
                            style={{ fontSize: "0.7rem" }}
                          >
                            ARC Selected
                          </Badge>
                        )}
                        {isQuoteSelectedForApproval && approvalStatus && !isArcSelected && (
                          <Badge
                            bg={approvalStatus === 'APPROVED' ? 'success' : approvalStatus === 'REJECTED' ? 'danger' : 'warning'}
                            className="ms-2"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {approvalStatus === 'APPROVED' ? 'Approved' :
                             approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending Approval'}
                          </Badge>
                        )}
                        {(() => {
                          // build dynamic missing note under the vendor header (non-regret only)
                          const orig = originalQuotations?.find(o => o.quote_id === item.quote_id);
                          const isRegret = item?.quote_details?.is_regret == 1;
                          if (!orig || isRegret || freightFilter) return null;
                          // prefer nested quote_details[0], else fall back to flat fields on orig
                          const d = (orig?.quote_details && Array.isArray(orig.quote_details)) ? orig.quote_details[0] : orig;
                          const pp0 = (parseFloat(d?.package_price) || 0) === 0;
                          const fp0 = (parseFloat(d?.freight_price) || 0) === 0;
                          const parts = [];
                          if (pp0) parts.push('Package');
                          if (fp0) parts.push('Freight');
                          return parts.length ? (
                            <div style={{ color: '#fff', fontSize: '14px', lineHeight: 1.25, marginTop: 6 }}>
                              {`Missing - ${parts.join(', ')}`}
                            </div>
                          ) : null;
                        })()}
                      </span>

                      {item?.quote_details?.is_regret == 1 && (
                        <div className="vendor_regreted_quote">
                          <div>
                            <span
                              style={{ fontWeight: "bold", fontSize: "1rem" }}
                            >
                              RFQ Declined by the vendor
                            </span>
                            <span style={{ fontSize: "0.85rem" }}>
                              {item?.quote_details?.regret_reason || ""}
                            </span>
                          </div>
                        </div>
                      )}

                      <Dropdown className="dots-nav-anchor">
                        <Dropdown.Toggle className="dots-nav">
                          <Image
                            src="/assets/images/3-dots-nav.svg"
                            width={4}
                            height={18}
                            alt="Nav"
                          />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item
                            target="_blank"
                            href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${item?.quote_details?.vendor_details?.id}`}
                            className=""
                            id={`view_vendor_profile_${item.quote_details.created_by}-vendor_actions-quote_compare_table`}
                          >
                           <FontAwesomeIcon icon={faUser} className="me-2"/> 
                            View Profile
                          </Dropdown.Item>
                          {!is_tender && !item.quote_details.is_regret == 1 &&
                            (!item.finalization ||
                              item.finalization.winning_vendor.id !=
                                item?.quote_details?.created_by) &&
                            canWrite && !permissionsLoading && (
                              <Dropdown.Item
                                href="#"
                                onClick={(e) => {
                                  setActiveModal("finalize");
                                  setCurrentItem(item);
                                  // handleFinalize(item, proditem);
                                }}
                                className=""
                                id={`finalize_vendor_${item.quote_details.created_by}-vendor_actions-quote_compare_table`}
                              >
                                <FontAwesomeIcon icon={faCheckCircle} className="me-2"/>
                                Finalize
                              </Dropdown.Item>
                            )}

                          {item.previous_quotes?.length > 0 && (
                            <Dropdown.Item
                              href="#"
                              onClick={() => {
                                setActiveModal("quote_history");
                                setQuotehistorydata({
                                  product_details: proditem.product_details,
                                  previous_quotes: item.previous_quotes,
                                });
                              }}
                              className=""
                              id={`view_quote_history_${item.quote_details.created_by}-vendor_actions-quote_compare_table`}
                            >
                            <FontAwesomeIcon icon={faHistory} className="me-2" />
                              Quote History
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    <div className="table-si-row table-grey-row">
                      {quantity}
                    </div>
                    <div className="table-si-row">
                      {item.unit_price}
                      {itemUpdated &&
                        itemUpdated.unit_price != item.unit_price && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {itemUpdated?.unit_price}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row table-grey-row fw-semibold">
                      {quantity * item.unit_price}
                      {itemUpdated &&
                        (itemUpdated.quantity != quantity ||
                          itemUpdated.unit_price != item.unit_price) && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {quantity * itemUpdated?.unit_price}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row">
                      {item?.package_price !== null
                        ? item.package_mode == "percentage"
                          ? `${item?.package_price || 0} %`
                          : `₹ ${item?.package_price || 0}`
                        : "0 %"}

                      {itemUpdated &&
                        itemUpdated.package_price != item.package_price && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {itemUpdated?.package_price !== null
                              ? itemUpdated.package_mode == "percentage"
                                ? `${itemUpdated?.package_price || 0} %`
                                : `₹ ${itemUpdated?.package_price || 0}`
                              : "0 %"}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row table-grey-row">
                      {item?.freight_price !== null
                        ? item.freight_mode == "percentage"
                          ? `${item?.freight_price || 0} %`
                          : `₹ ${item?.freight_price || 0}`
                        : "0 %"}

                      {itemUpdated &&
                        itemUpdated.freight_price != item.freight_price && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {itemUpdated?.freight_price !== null
                              ? itemUpdated.freight_mode == "percentage"
                                ? `${itemUpdated?.freight_price || 0} %`
                                : `₹ ${itemUpdated?.freight_price || 0}`
                              : "0 %"}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row">
                      {item?.tax !== null
                        ? item.tax_mode == "percentage"
                          ? `${item?.tax || 0} %`
                          : `₹ ${item?.tax || 0}`
                        : "0 %"}

                      {itemUpdated && itemUpdated.tax != item.tax && (
                        <span className="d-block buyer-individual-quote-compare-text-strike ">
                          {itemUpdated?.tax !== null
                            ? itemUpdated.tax_mode == "percentage"
                              ? `${itemUpdated?.tax || 0} %`
                              : `₹ ${itemUpdated?.tax || 0}`
                            : "0 %"}
                        </span>
                      )}
                    </div>
                    <div
                      className={`table-si-row fw-semibold  ${
                        item.is_lowest
                          ? "bg-success text-white d-flex justify-content-between "
                          : "table-grey-row"
                      }`}
                    >
                     {calculateTotal(item, quantity, normalizeFilter)}
                       {itemUpdated &&
                        calculateTotal(itemUpdated, quantity) !=
                          calculateTotal(item, quantity) && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {calculateTotal(itemUpdated, quantity)}
                          </span>
                        )}
                      {roundQuote && roundQuote.previous_price && (
                        <div className="small text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                          <div>Previous: ₹{parseFloat(roundQuote.previous_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          <div>Round: ₹{parseFloat(roundQuote.quoted_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                      {item.is_lowest && (
                        <span className="d-flex align-items-center gap-2 border border-light rounded-3 text-white px-3 py-2">
                          <FontAwesomeIcon icon={faAward} fontSize={16} />
                          Lowest
                        </span>
                      )}
                    </div>
                    <div
                      className={`table-si-row  ${
                        item.is_lowest
                          ? "bg-success text-white d-flex justify-content-between"
                          : ""
                      } `} // highlights in yellow-orange
                    >
                      {item.quote_details.latest_target_price && `₹ ${item.quote_details.latest_target_price}`}
                    </div>
                    <div className="table-si-row table-grey-row">
                      {item.delivery_period != "" && (
                        parseInt(item.delivery_period) <= 1
                          ? `${item.delivery_period || 0} Day`
                          : `${item.delivery_period || 0} Days`
                      )}
                      {itemUpdated &&
                        itemUpdated.delivery_period != item.delivery_period && (
                          <span className="d-block buyer-individual-quote-compare-text-strike ">
                            {parseInt(itemUpdated.delivery_period) <= 1
                              ? `${itemUpdated.delivery_period || 0} Day`
                              : `${itemUpdated.delivery_period || 0} Days`}
                          </span>
                        )}
                    </div>
                    <div className="table-si-row ">
                      {item?.comment && (
                        <ReadMore content={item?.comment} maxLines={2} />
                      )}
                      {item?.global_comment && (
                        <ReadMore content={item?.global_comment} maxLines={2} />
                      )}
                    </div>
                    <div className="table-si-row table-grey-row">
                      {item.document_files && (
                        <>{renderFileLink(item.document_files)}</>
                      )}
                    </div>
                    <div className="table-si-row">
                      {item.global_document_files && (
                        <>
                          {renderFileLink(
                            item.global_document_files,
                            "view file"
                          )}
                        </>
                      )}
                    </div>
                    <div className="table-si-row table-grey-row">
                        <ReadMore
                          content={item?.global_payment_term || ""}
                          maxLines={2}
                        />

                    {/* Payment terms list */}
                    {(() => {
                      const terms =item?.payment_terms
                      return (
                        <div className="">
                          {terms.length > 0 && (
                            <ul className="">
                              {terms.map((t, i) => (
                                <li key={t.id ?? i} className="d-flex justify-content-between py-1">
                                  <span className="text-capitalize">
                                    {!t.comment ? ` ${t.type} ${t.days ? t.days + ' days' : ''} ` : ""}

                                    {t.comment ? t.comment  : null}
                                  </span>
                                  <span className="fw-semibold">{t.value != null && `${t.value}%`}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      {/* Lowest bid area */}
      {alreadyFinalized?.length == 0 ? (
        <div className="quote-sec-bottom">
          {lowestQuote && (
            <div className="quote-sec-bottom-con">
              <div>
                <span>
                  <b>Lowest Bid</b> :{" "}
                  {lowestQuote?.quote_details?.vendor_details
                    ?.organization_name ||
                    lowestQuote?.quote_details?.vendor_details?.name}
                </span>
                <span>
                  <Link
                    href={
                      "mailto:" +
                      lowestQuote?.quote_details?.vendor_details?.email
                    }
                  >
                    <FontAwesomeIcon icon={faEnvelope} />
                  </Link>
                </span>

                <span>
                  <Link
                    href={
                      "tel: " +
                      lowestQuote[0]?.quote_details?.vendor_details?.mobile
                    }
                    id="call_lowest_bidder-quote_actions-quote_compare_table"
                  >
                    <FontAwesomeIcon icon={faPhone} />
                  </Link>
                </span>
              </div>
              {!is_tender && (
                isRfqClosed ? (
                  <button
                    type="submit"
                    className="btn btn-danger btn-outlined"
                    disabled
                  >
                    RFQ has been Closed
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    onClick={(e) => {
                      setActiveModal('finalize')
                      setCurrentItem(lowestQuote);
                      // handleFinalize(lowestQuote, proditem)
                    }}
                    title={
                      !canWrite || permissionsLoading ? "You don't have permission to finalize vendors" :
                      (useLegacyHierarchy && availableHierarchies.length <= 0) ? "You cannot finalize as you dont belong to the company's hierarchy" : ""
                    }
                    disabled={(useLegacyHierarchy && availableHierarchies.length <= 0) || !canWrite || permissionsLoading}
                    id="finalize_vendor-quote_actions-quote_compare_table"
                  >
                    Finalize
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="quote-sec-bottom">
          <div className="quote-sec-bottom-con">
            <div>
              {" "}
              <span>
                <b>Finalized vendor</b> :{" "}
                {alreadyFinalized[0]?.finalization?.winning_vendor
                  ?.organization_name ??
                  alreadyFinalized[0]?.finalization?.winning_vendor
                    ?.company_name}
              </span>
              <span>
                <Link
                  href={
                    "mailto:" +
                    alreadyFinalized[0]?.finalization?.winning_vendor?.email
                  }
                  id="email_finalized_vendor-finalization_actions-quote_compare_table"
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
              </span>
              <span>
                <Link
                  href={
                    "tel: " +
                    alreadyFinalized[0]?.finalization?.winning_vendor?.mobile
                  }
                  id="call_finalized_vendor-finalization_actions-quote_compare_table"
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </span>
              {Array.isArray(proditem.finalization_history) && proditem.finalization_history.length > 0 && (
                <button
                  className="btn btn-sm btn-success p-2"
                  style={{ minWidth: "230px", marginLeft: "10px" }}
                  onClick={handleViewFinalizationHistory}
                  id="view_finalization_history-finalization_actions-quote_compare_table"
                >
                  Finalization History
                </button>
              )}
            </div>

            <div>
              {" "}
              <span>
                <b>Finalized By</b> :{" "}
                {alreadyFinalized[0]?.finalization?.finilized_by?.name}
              </span>
              <span>
                <Link
                  href={
                    "mailto:" +
                    alreadyFinalized[0]?.finalization?.finilized_by?.email
                  }
                  id="email_finalized_by-finalization_actions-quote_compare_table"
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
              </span>
              <span>
                <Link
                  href={
                    "tel: " +
                    alreadyFinalized[0]?.finalization?.finilized_by?.mobile
                  }
                  id="call_finalized_by-finalization_actions-quote_compare_table"
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Lowest bid area end */}

      {/* ------------- Show Vendors contact info in Modal ------------- */}
      {activeModal == 'common' && (
        <CommonModal
          data={{
            title: "Contact Information",
            email: vendorData.email,
            mobile: vendorData.mobile,
          }}
          openCommonModal={activeModal == 'common'}
          closeModal={() => setActiveModal(null)}
        />
      )}
      {activeModal == 'quote_history' && (
        <QuoteHistoryModal
          showModal={activeModal == 'quote_history'}
          closeModal={() => {
            setActiveModal(null);
          }}
          quotehistorydata={quotehistorydata}
        />
      )}
      <FinalizeVendorModal
        show={activeModal == 'finalize'}
        onHide={() => setActiveModal(null)}
        onConfirm={(selectedPOId) => {
          setExistingPOId(selectedPOId);
          // Automatically determine route based on is_tender
          const isTender = proditem?.rfq?.[0]?.is_tender === 1 || proditem?.rfq?.[0]?.is_tender === true;
          const routeType = isTender ? 'ARC' : 'PO';
          setSelectedRouteType(routeType);
          
          if (routeType === 'ARC') {
            // ARC route: finalize directly without hierarchy selection
            handleFinalize(currentItem, proditem, existingPOId, null, 'ARC');
            setActiveModal(null);
          } else {
            // PO route
            if (!useLegacyHierarchy) {
              // Hospitality context: backend handles hierarchy, skip selection
              handleFinalize(currentItem, proditem, selectedPOId, null, 'PO');
              setActiveModal(null);
            } else if (availableHierarchies.length <= 0) {
              toast.error("You cannot finalize a vendor, as you don't belong to the company's PO approval hierarchy");
              setActiveModal(null);
              return;
            } else {
              setActiveModal('hierarchy');
            }
          }
        }}
        vendorName={
          currentItem?.quote_details?.vendor_details?.organization_name ||
          currentItem?.quote_details?.vendor_details?.name
        }
        vendorDetails={currentItem?.quote_details?.vendor_details}
        rfqId={rfq}
        quotedPrice={currentItem?.total_price}
        productDetails={proditem?.product_details}
        alreadyFinalized={alreadyFinalized}
        availableBudget={availableBudget}
      />
      <HierarchySelectionModal
        show={activeModal == 'hierarchy'}
        onHide={() => setActiveModal(null)}
        hierarchies={availableHierarchies}
        onConfirm={(selectedHierarchy) => {
          // Use selected route type (defaults to PO)
          handleFinalize(currentItem, proditem, existingPOId, selectedHierarchy, selectedRouteType || 'PO');
          setActiveModal(null);
        }}
      />
      <FinalizeHistoryModal
        show={proditem.finalization_history.length > 0 && activeModal == 'finalize_history'}
        onHide={() => setActiveModal(null)}
        history={proditem.finalization_history}
        quantity={proditem.product_details[0].rfq_details.find(spec => spec.title == 'Quantity')?.value}
        calculateTotal={calculateTotal}
      />
    </>
  );
};

export default QuoteCompareTable;
