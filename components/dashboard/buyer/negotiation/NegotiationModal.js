import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Modal, Button, Form, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import {
  createNegotiationRound,
  approveNegotiationRound,
  rejectNegotiationRound,
  getRoundQuotes,
  getNegotiationRounds,
  getQuoteApprovalStatus
} from '@/services/negotiation';
import { getUserDetails } from '@/services/Auth';
import { getEntityApprovalInstances, getApprovalInstanceDetails } from '@/services/approval';
import { toast } from 'react-toastify';
import moment from 'moment';
import NegotiationWorkflowModal from './NegotiationWorkflowModal';
import ApprovalActionModal from '../approval/ApprovalActionModal';
import ApprovalTimeline from '../approval/ApprovalTimeline';
import styles from './NegotiationUI.module.scss';

const NegotiationModal = ({
  show,
  handleShow,
  onHide,
  mode,
  rfq_id,
  products = [],
  activeRounds = [],
  roundsHistory: initialRoundsHistory = [],
  onRefresh,
  canWrite = true,
  permissionsLoading = false,
  hospitalityCompanyId,
  hotelId,
  departmentId
}) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formData, setFormData] = useState({ target_price: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundQuotes, setRoundQuotes] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundsHistory, setRoundsHistory] = useState(initialRoundsHistory);
  const userProfile = useSelector((state) => state.userProfile);
  const [currentUserId, setCurrentUserId] = useState(null);
  // Workflow modal state
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedRoundForWorkflow, setSelectedRoundForWorkflow] = useState(null);
  // Approval instances fetched from hospitality approval API
  const [approvalInstances, setApprovalInstances] = useState({}); // Map of rfq_product_id -> approval instance
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  // Action modal state for approve/reject confirmation
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'APPROVE' or 'REJECT'
  const [selectedRoundForAction, setSelectedRoundForAction] = useState(null);
  // Quote approval status (for checking if quotes are already approved)
  const [quoteApprovalStatuses, setQuoteApprovalStatuses] = useState({}); // Map of productId -> approval status
  const [loadingQuoteApprovals, setLoadingQuoteApprovals] = useState(false);
  // Approval journey: all instances (including rejected) per round entity
  const [approvalJourneys, setApprovalJourneys] = useState({}); // Map of roundId -> { loading, instances[] }
  const [expandedApprovalJourney, setExpandedApprovalJourney] = useState(null); // roundId of expanded journey

  useEffect(() => {
    if (userProfile?.id) {
      setCurrentUserId(parseInt(userProfile.id));
    }
  }, [userProfile]);

  useEffect(() => {
    if (show && mode === 'create') {
      setSelectedProducts([]);
      setFormData({ target_price: '', end_date: '' });
      loadQuoteApprovalStatuses();
    }
    if (show && mode === 'view-approve' && activeRounds.length > 0) {
      const pendingRound = activeRounds.find(r => r.status === 'PENDING_APPROVAL');
      if (pendingRound) {
        setSelectedRound(pendingRound);
        loadRoundQuotes(pendingRound.id);
      }
      // Fetch approval status from hospitality approval API for accurate can_user_approve
      loadApprovalStatusForRounds(activeRounds);
    }
    if (show && mode === 'history') {
      loadHistoryData();
    }
    // Sync with prop when it changes
    if (initialRoundsHistory.length > 0) {
      setRoundsHistory(initialRoundsHistory);
    }
  }, [show, mode, activeRounds, initialRoundsHistory]);

  const loadHistoryData = async () => {
    if (!rfq_id) return;
    try {
      setLoading(true);
      const response = await getNegotiationRounds(rfq_id);
      console.log('Modal history raw response:', response);
      
      let rounds = [];
      
      if (response) {
        if (response.status === 1 && response.data) {
          rounds = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          rounds = response;
        } else if (Array.isArray(response.data)) {
          rounds = response.data;
        }
      }
      
      console.log('Modal parsed history rounds:', rounds, 'Count:', rounds.length);
      setRoundsHistory(rounds);
    } catch (error) {
      console.error('Error loading history in modal:', error);
      setRoundsHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch approval status from hospitality approval API for pending rounds
  const loadApprovalStatusForRounds = async (rounds) => {
    const pendingRounds = rounds.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'pending_approval');
    if (pendingRounds.length === 0) return;

    setLoadingApprovals(true);
    const instances = {};

    for (const round of pendingRounds) {
      try {
        const response = await getEntityApprovalInstances('NEGOTIATION', round.rfq_product_id);
        const instanceList = response?.data?.data || response?.data || [];

        if (instanceList && instanceList.length > 0) {
          // Get detailed instance with can_user_approve
          const detailResponse = await getApprovalInstanceDetails(instanceList[0].id);
          const detailedInstance = detailResponse?.data?.data || detailResponse?.data;
          instances[round.rfq_product_id] = detailedInstance;
        }
      } catch (error) {
        console.error(`Error loading approval for product ${round.rfq_product_id}:`, error);
      }
    }

    setApprovalInstances(instances);
    setLoadingApprovals(false);
  };

  // Load quote approval statuses to check if quotes are already approved
  const loadQuoteApprovalStatuses = async () => {
    if (!products || products.length === 0) return;

    setLoadingQuoteApprovals(true);
    const statuses = {};

    for (const product of products) {
      try {
        const response = await getQuoteApprovalStatus(product.id);
        if (response?.status === 1 && response?.data?.approval_instance) {
          statuses[product.id] = response.data.approval_instance;
        }
      } catch (error) {
        // Product may not have any approval instance - that's OK
      }
    }

    setQuoteApprovalStatuses(statuses);
    setLoadingQuoteApprovals(false);
  };

  // Check if product quotes are approved
  const isQuoteApproved = (productId) => {
    const approvalInstance = quoteApprovalStatuses[productId];
    return approvalInstance?.status === 'APPROVED';
  };

  // Load full approval journey (all instances) for a round
  const loadApprovalJourney = async (round) => {
    const roundId = round.id;
    setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: true, instances: [] } }));

    try {
      const response = await getEntityApprovalInstances('NEGOTIATION', round.rfq_product_id);
      const instanceList = response?.data?.data || response?.data || [];
      const allInstances = Array.isArray(instanceList) ? instanceList : [];

      // Fetch details for each instance
      const detailedInstances = [];
      for (const inst of allInstances) {
        try {
          const detailRes = await getApprovalInstanceDetails(inst.id);
          const detail = detailRes?.data?.data || detailRes?.data || detailRes;
          detailedInstances.push(detail);
        } catch (err) {
          // If detail fetch fails, use basic instance data
          detailedInstances.push(inst);
        }
      }

      // Sort by id ascending (oldest first to show the journey chronologically)
      detailedInstances.sort((a, b) => (a.id || 0) - (b.id || 0));

      setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: false, instances: detailedInstances } }));
    } catch (error) {
      console.error('Error loading approval journey for round:', roundId, error);
      setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: false, instances: [] } }));
    }
  };

  // Toggle approval journey expansion for a round
  const toggleApprovalJourney = (round) => {
    const roundId = round.id;
    if (expandedApprovalJourney === roundId) {
      setExpandedApprovalJourney(null);
      return;
    }
    setExpandedApprovalJourney(roundId);
    // Load if not already loaded
    if (!approvalJourneys[roundId]) {
      loadApprovalJourney(round);
    }
  };

  const loadRoundQuotes = async (roundId) => {
    try {
      setLoading(true);
      const response = await getRoundQuotes(roundId);
      if (response.status === 1) {
        setRoundQuotes(response.data || []);
      }
    } catch (error) {
      setRoundQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return [];
      } else {
        return [productId];
      }
    });
  };

  const handleSelectAll = () => {
    // Only allow selecting products that have quotes, no active round, and quotes not approved
    const availableProducts = products.filter(p => hasQuotes(p) && !hasActiveRound(p.id) && !isQuoteApproved(p.id));
    if (selectedProducts.length === availableProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(availableProducts.map(p => p.id));
    }
  };

  const hasActiveRound = (productId) => {
    return activeRounds.some(r =>
      r.rfq_product_id === productId &&
      r.status === 'ACTIVE' &&
      r.end_date &&
      moment.utc(r.end_date).isAfter(moment()) &&
      !r.approvals?.some(a => a.status === 'REJECTED') // Exclude rejected rounds
    );
  };

  // Safely get vendor details from a quotation (supports both legacy and normalized shapes)
  const getVendorDetailsFromQuote = (q) => {
    const vdRaw =
      q.vendor_details ||
      (q.quote_details && q.quote_details.vendor_details);
    if (!vdRaw) return null;
    return Array.isArray(vdRaw) ? vdRaw[0] : vdRaw;
  };

  // Check if a quotation is marked as regret (supports both legacy and normalized shapes)
  const isQuoteRegretted = (q) => {
    const topLevelRegret = q.is_regret;
    const nestedRegret = q.quote_details && q.quote_details.is_regret;
    return topLevelRegret == 1 || nestedRegret == 1;
  };

  // Check if a product has any valid quotes received (not regretted)
  const hasQuotes = (product) => {
    const quotations = product?.quotations || [];
    if (quotations.length === 0) return false;

    // Check for valid quotations (must have an id or quote_id and not be regretted)
    const validQuotations = quotations.filter(q => {
      const hasId = q.id != null || q.quote_id != null;
      if (!hasId) return false;
      if (isQuoteRegretted(q)) return false;
      return true;
    });

    return validQuotations.length > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0 || !formData.target_price || !formData.end_date) {
      toast.error('Please select a product and fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      // Convert local datetime to UTC ISO string
      // The datetime-local input gives us local time, we need to send UTC to backend
      const utcEndDate = moment(formData.end_date).utc().format();

      // Create rounds for each selected product
      for (const productId of selectedProducts) {
        await createNegotiationRound({
          rfq_id,
          rfq_product_id: parseInt(productId),
          target_price: parseFloat(formData.target_price),
          end_date: utcEndDate
        });
      }
      
      toast.success('Negotiation round created successfully');
      onRefresh();
      onHide();
    } catch (error) {
      toast.error(error.message || 'Failed to create negotiation round');
    } finally {
      setSubmitting(false);
    }
  };

  // Open action modal for approve/reject
  const openActionModal = (round, type) => {
    setSelectedRoundForAction(round);
    setActionType(type);
    onHide(); // Close the NegotiationModal first to avoid modal overlap
    setShowActionModal(true);
  };

  // Handle action modal submission
  const handleActionModalSubmit = async (comment) => {
    if (!selectedRoundForAction) return;

    const roundId = selectedRoundForAction.id;

    if (actionType === 'APPROVE') {
      await handleApprove(roundId, comment);
    } else if (actionType === 'REJECT') {
      await handleReject(roundId, comment);
    }

    setShowActionModal(false);
    setSelectedRoundForAction(null);
    setActionType(null);
  };

  const handleApprove = async (roundId, comment = '') => {
    setSubmitting(true);
    try {
      const response = await approveNegotiationRound(roundId, comment || null);
      console.log('Approve response:', response);

      // Response structure: { status: 1, data: {...}, message: "...", approved: true, ... }
      if (response.status === 1 || response.approved === true) {
        const message = response.message || 'Round approved successfully';
        toast.success(message);
        onRefresh();
        if (selectedRound?.id === roundId) {
          setSelectedRound(null);
          setRoundQuotes([]);
        }
      } else {
        toast.error(response.message || 'Failed to approve round');
      }
    } catch (error) {
      console.error('Approve error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to approve round';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (roundId, reason) => {
    if (!reason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const response = await rejectNegotiationRound(roundId, reason);
      console.log('Reject response:', response);

      // Response structure: { status: 1, data: {...}, message: "..." }
      if (response.status === 1) {
        const message = response.message || 'Round rejected successfully';
        toast.success(message);
        onRefresh();
        if (selectedRound?.id === roundId) {
          setSelectedRound(null);
          setRoundQuotes([]);
        }
      } else {
        toast.error(response.message || 'Failed to reject round');
      }
    } catch (error) {
      console.error('Reject error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to reject round';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Create Negotiation Round';
      case 'history': return 'Negotiation Rounds';
      case 'view-approve': return 'View & Approve Negotiation Rounds';
      default: return 'Negotiation';
    }
  };

  const getModalSubtitle = () => {
    switch (mode) {
      case 'create':
        return 'Select a product, define target price, and set round timeline.';
      case 'history':
        return 'Track all rounds with status progression and approval journey.';
      case 'view-approve':
        return 'Review pending rounds, take approval action, and inspect submitted quotes.';
      default:
        return 'Manage negotiation rounds and approval flow.';
    }
  };

  // Helper to get effective round status (considering end_date and approvals)
  // Note: end_date from server is in UTC, so use moment.utc() to parse it correctly
  const getEffectiveRoundStatus = (round) => {
    const status = (round?.status || '').toUpperCase();

    // Check if any approval is REJECTED - if so, round is rejected
    const hasRejectedApproval = round?.approvals?.some(a => a.status === 'REJECTED');
    if (hasRejectedApproval) {
      return 'REJECTED';
    }

    // If status is ACTIVE but end_date has passed, treat as ENDED
    if (status === 'ACTIVE' && round?.end_date && moment.utc(round.end_date).isBefore(moment())) {
      return 'ENDED';
    }

    return status;
  };

  // Compute round status counts for summary display
  const getRoundStatusCounts = () => {
    const allRounds = mode === 'history' ? roundsHistory : [...activeRounds, ...roundsHistory];

    // Deduplicate rounds by ID
    const uniqueRounds = allRounds.filter((round, index, self) =>
      index === self.findIndex(r => r.id === round.id)
    );

    const counts = {
      active: 0,
      pending_approval: 0,
      completed: 0,
      closed: 0,
      ended: 0,
      rejected: 0
    };

    uniqueRounds.forEach(round => {
      const effectiveStatus = getEffectiveRoundStatus(round);
      if (effectiveStatus === 'REJECTED') counts.rejected++;
      else if (effectiveStatus === 'ACTIVE') counts.active++;
      else if (effectiveStatus === 'PENDING_APPROVAL') counts.pending_approval++;
      else if (effectiveStatus === 'COMPLETED') counts.completed++;
      else if (effectiveStatus === 'CLOSED') counts.closed++;
      else if (effectiveStatus === 'ENDED') counts.ended++;
    });

    return counts;
  };

  // Round status summary component
  const renderRoundStatusSummary = () => {
    const counts = getRoundStatusCounts();
    const total = counts.active + counts.pending_approval + counts.completed + counts.closed + counts.ended + counts.rejected;

    if (total === 0) return null;

    const summaryItems = [
      { key: 'active', label: 'Active', tone: 'active' },
      { key: 'pending_approval', label: 'Pending Approval', tone: 'pending' },
      { key: 'ended', label: 'Ended', tone: 'ended' },
      { key: 'rejected', label: 'Rejected', tone: 'rejected' },
      { key: 'completed', label: 'Completed', tone: 'completed' },
      { key: 'closed', label: 'Closed', tone: 'closed' },
    ];

    return (
      <div className={`${styles.sectionCard} ${styles.summaryHeader}`}>
        <div className={styles.summaryTopRow}>
          <p className={styles.summaryLabel}>Round Status Summary</p>
          <p className={styles.summaryTotal}>{total} Total</p>
        </div>
        <div className={styles.summaryChips}>
          {summaryItems.map((item) =>
            counts[item.key] > 0 ? (
              <span
                key={item.key}
                className={`${styles.summaryChip} ${styles[`summaryChip_${item.tone}`]}`}
              >
                <strong>{counts[item.key]}</strong> {item.label}
              </span>
            ) : null
          )}
        </div>
      </div>
    );
  };

  const getProductName = (product) => {
    return product?.product_details?.[0]?.name || `Product ${product.id}`;
  };

  const getVendorDisplayName = (v) =>
    v?.organization_name || v?.company_name || v?.vendor_company_name || v?.name || v?.email || 'Unknown Vendor';

  const getVendorNames = (product) => {
    const quotations = product?.quotations || [];
    const allVendors = product?.all_vendors || [];

    if (quotations.length === 0) {
      const vendorsWithQuotes = allVendors.filter(v =>
        v.rfq_product_vendor_id && (v.has_quote || v.quote_submitted || v.total_price > 0 || v.unit_price > 0)
      );
      if (vendorsWithQuotes.length > 0) {
        const names = vendorsWithQuotes.slice(0, 3).map(v => getVendorDisplayName(v));
        if (vendorsWithQuotes.length > 3) {
          return `${names.join(', ')} +${vendorsWithQuotes.length - 3} more`;
        }
        return names.join(', ');
      }
      const vendorsWithCodes = allVendors.filter(v => v.rfq_product_vendor_id);
      if (vendorsWithCodes.length > 0) {
        const names = vendorsWithCodes.slice(0, 3).map(v => getVendorDisplayName(v));
        if (vendorsWithCodes.length > 3) {
          return `${names.join(', ')} +${vendorsWithCodes.length - 3} more`;
        }
        return names.join(', ');
      }
      return 'No quotes';
    }

    const validQuotations = quotations.filter(q => {
      const hasId = q.id != null || q.quote_id != null;
      return hasId && !isQuoteRegretted(q);
    });

    if (validQuotations.length === 0) {
      const vendorsWithCodes = allVendors.filter(v => v.rfq_product_vendor_id);
      if (vendorsWithCodes.length > 0) {
        return vendorsWithCodes.slice(0, 3).map(v => getVendorDisplayName(v)).join(', ');
      }
      return 'No quotes';
    }

    const names = validQuotations.slice(0, 3).map(q => {
      const vendorDetails = getVendorDetailsFromQuote(q);
      if (vendorDetails) {
        const name = getVendorDisplayName(vendorDetails);
        if (name !== 'Unknown Vendor') return name;
      }
      if (allVendors.length > 0 && q.created_by) {
        const allVendor = allVendors.find(
          v => v.id === q.created_by || v.user_id === q.created_by
        );
        if (allVendor) return getVendorDisplayName(allVendor);
      }
      if (allVendors.length > 0 && vendorDetails) {
        const allVendorByDetails = allVendors.find(
          v => v.id === vendorDetails.id || v.user_id === vendorDetails.user_id
        );
        if (allVendorByDetails) return getVendorDisplayName(allVendorByDetails);
      }
      if (allVendors.length === 1) return getVendorDisplayName(allVendors[0]);
      return null;
    }).filter(Boolean);

    if (names.length > 0) {
      if (validQuotations.length > 3) {
        return `${names.join(', ')} +${validQuotations.length - 3} more`;
      }
      return names.join(', ');
    }

    return `${validQuotations.length} quote(s)`;
  };

  const getProductDetails = (product) => {
    const details = product?.product_details?.[0] || {};
    const productSpecs = product?.product_specs || [];
    const rfqDetails = details?.rfq_details || [];
    
    const spec = productSpecs.find(s => s.title === 'Spec')?.value ||
                 rfqDetails.find(d => d.title === 'Spec')?.value;
    const size = productSpecs.find(s => s.title === 'Size')?.value ||
                 rfqDetails.find(d => d.title === 'Size')?.value;
    const quantity = rfqDetails.find(d => d.title === 'Quantity')?.value ||
                     product?.quantity;
    const unit = rfqDetails.find(d => d.title === 'Unit')?.value ||
                 product?.unit;
    
    return {
      name: details?.name || details?.product_name || `Product ${product.id}`,
      spec,
      size,
      quantity,
      unit
    };
  };

  const renderCreateForm = () => {
    // Products that can have negotiation: have quotes, no active round, quotes not approved
    const availableProducts = products.filter(p => hasQuotes(p) && !hasActiveRound(p.id) && !isQuoteApproved(p.id));

    return (
      <Form onSubmit={handleSubmit}>
        <section className={styles.createSurface}>
          <div className={styles.createHeaderRow}>
            <div>
              <p className={styles.createHeaderTitle}>Select Product</p>
              <p className={styles.createHeaderSub}>
                Only products with valid vendor quotes can start a new negotiation round.
              </p>
            </div>
            <span className={styles.createHeaderMeta}>
              {availableProducts.length} available
            </span>
          </div>

          {products.length === 0 ? (
            <div className={styles.createEmpty}>
              <p className={styles.createEmptyTitle}>No products found</p>
              <p className={styles.createEmptySub}>Load an RFQ with products to create rounds.</p>
            </div>
          ) : (
            <div className={styles.createProductList}>
              {products.map((product) => {
                const hasRound = hasActiveRound(product.id);
                const quoteApproved = isQuoteApproved(product.id);
                const noQuotes = !hasQuotes(product);
                const isDisabled = hasRound || quoteApproved || noQuotes;
                const isSelected = selectedProducts.includes(product.id);
                const details = getProductDetails(product);

                let statusLabel = 'Available';
                let statusClass = '';
                if (quoteApproved) {
                  statusLabel = 'Approved';
                  statusClass = styles.createStatusApproved;
                } else if (hasRound) {
                  statusLabel = 'Active Round';
                  statusClass = styles.createStatusActive;
                } else if (noQuotes) {
                  statusLabel = 'No Quotes';
                  statusClass = styles.createStatusNoQuotes;
                }

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => !isDisabled && handleProductToggle(product.id)}
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    className={`${styles.createProductRow} ${
                      isSelected ? styles.createProductRowSelected : ''
                    } ${isDisabled ? styles.createProductRowDisabled : ''}`}
                  >
                    <div className={styles.createProductMain}>
                      <input
                        type="radio"
                        name="selectedProduct"
                        checked={isSelected}
                        disabled={isDisabled}
                        readOnly
                        className={styles.createRadio}
                      />
                      <div className={styles.createTitleBlock}>
                        <p className={styles.createProductName}>{details.name}</p>
                        <div className={styles.createStatusRow}>
                          <span className={`${styles.createStatusBadge} ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.createMetaGrid}>
                      <div className={styles.createMetaItem}>
                        <p className={styles.createMetaLabel}>Spec</p>
                        <p className={styles.createMetaValue}>{details.spec || '-'}</p>
                      </div>
                      <div className={styles.createMetaItem}>
                        <p className={styles.createMetaLabel}>Size</p>
                        <p className={styles.createMetaValue}>{details.size || '-'}</p>
                      </div>
                      <div className={styles.createMetaItem}>
                        <p className={styles.createMetaLabel}>Qty</p>
                        <p className={styles.createMetaValue}>{details.quantity || '-'}</p>
                      </div>
                      <div className={styles.createMetaItem}>
                        <p className={styles.createMetaLabel}>Unit</p>
                        <p className={styles.createMetaValue}>{details.unit || '-'}</p>
                      </div>
                      <div className={styles.createMetaItem}>
                        <p className={styles.createMetaLabel}>Vendors</p>
                        <p className={styles.createMetaValue}>{getVendorNames(product)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedProducts.length > 0 && (
            <p className={styles.createSelectedNote}>
              {selectedProducts.length} product selected
            </p>
          )}
        </section>

        <div className={styles.formGrid}>
          <div className={styles.formCard}>
            <label htmlFor="neg-target-price" className={styles.formLabel}>
              Target Price (₹) <span className={styles.requiredMark}>*</span>
            </label>
            <input
              id="neg-target-price"
              type="number"
              step="0.01"
              min="0"
              value={formData.target_price}
              onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
              placeholder="Enter target price"
              required
              className={styles.fieldInput}
            />
          </div>

          <div className={styles.formCard}>
            <label htmlFor="neg-end-date" className={styles.formLabel}>
              End Date <span className={styles.requiredMark}>*</span>
            </label>
            <input
              id="neg-end-date"
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              required
              className={styles.fieldInput}
            />
            <p className={styles.formHint}>
              Vendors can submit one quote per product until this date.
            </p>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.actionSecondary} onClick={onHide} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.actionPrimary}
            disabled={submitting || selectedProducts.length === 0 || !canWrite || permissionsLoading}
          >
            {submitting ? <Spinner size="sm" /> : 'Create Round'}
          </button>
        </div>
      </Form>
    );
  };

  // Status config for consistent styling
  const statusConfig = {
    ACTIVE: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7', label: 'Active', icon: '●' },
    PENDING_APPROVAL: { bg: '#fff8e1', color: '#f57f17', border: '#ffcc80', label: 'Pending Approval', icon: '◷' },
    ENDED: { bg: '#fff3e0', color: '#e65100', border: '#ffab91', label: 'Ended', icon: '■' },
    COMPLETED: { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9', label: 'Completed', icon: '✓' },
    CLOSED: { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8', label: 'Closed', icon: '✓' },
    REJECTED: { bg: '#fce4ec', color: '#c62828', border: '#ef9a9a', label: 'Rejected', icon: '✗' },
  };

  const getStatusStyle = (status) => statusConfig[status] || statusConfig.CLOSED;

  const getStatusTone = (status) => {
    if (status === 'PENDING_APPROVAL') return 'pending';
    if (status === 'ACTIVE') return 'active';
    if (status === 'ENDED') return 'ended';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'COMPLETED') return 'completed';
    return 'closed';
  };

  const getJourneyTone = (status) => {
    if (status === 'APPROVED') return 'approved';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'CANCELLED') return 'cancelled';
    return 'pending';
  };

  // Get time remaining text for active rounds
  const getTimeRemaining = (endDate) => {
    if (!endDate) return null;
    const end = moment.utc(endDate);
    const now = moment();
    if (end.isBefore(now)) return null;
    const duration = moment.duration(end.diff(now));
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const mins = duration.minutes();
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  const renderHistory = () => {
    // Merge activeRounds (which have enriched approval data) with roundsHistory
    const allRounds = [...activeRounds, ...roundsHistory];
    const uniqueRounds = allRounds.filter((round, index, self) =>
      index === self.findIndex(r => r.id === round.id)
    );

    // Group by product
    const grouped = {};
    uniqueRounds.forEach(round => {
      const productId = round.rfq_product_id;
      if (!grouped[productId]) {
        const product = products.find(p => p.id === productId);
        grouped[productId] = {
          productName: round.product_name || (product ? getProductName(product) : `Product ${productId}`),
          productDetails: product ? getProductDetails(product) : null,
          rounds: []
        };
      }
      grouped[productId].rounds.push(round);
    });

    // Sort rounds within each group by round_number descending (latest first)
    Object.values(grouped).forEach(group => {
      group.rounds.sort((a, b) => (b.round_number || 0) - (a.round_number || 0));
    });

    const productGroups = Object.entries(grouped);

    // Summary counts
    const counts = getRoundStatusCounts();
    const total = Object.values(counts).reduce((s, c) => s + c, 0);

    return (
      <div>
        {total > 0 && renderRoundStatusSummary()}

        {uniqueRounds.length === 0 ? (
          <div className={styles.historyEmpty}>
            <p className={styles.historyEmptyTitle}>No negotiation rounds yet</p>
            <p className={styles.historyEmptySub}>Rounds will appear here once created.</p>
          </div>
        ) : (
          <div className={styles.historyGroup}>
            {productGroups.map(([productId, group]) => (
              <div key={productId} className={styles.historyProductCard}>
                <div className={styles.historyProductHead}>
                  <p className={styles.historyProductName}>{group.productName}</p>
                  <span className={styles.historyProductMeta}>
                    {group.rounds.length} round{group.rounds.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  {group.rounds.map((round) => {
                    const effectiveStatus = getEffectiveRoundStatus(round);
                    const cfg = getStatusStyle(effectiveStatus);
                    const roundTone = getStatusTone(effectiveStatus);
                    const timeLeft = effectiveStatus === 'ACTIVE' ? getTimeRemaining(round.end_date) : null;
                    const approvals = round.approvals || [];
                    const canApprove = effectiveStatus === 'PENDING_APPROVAL' && currentUserId &&
                      approvals.some(a => a.status === 'PENDING' && String(a.approver_user_id) === String(currentUserId));

                    return (
                      <div
                        key={round.id}
                        className={`${styles.roundCard} ${styles[`roundCard_${roundTone}`]}`}
                      >
                        <div>
                          <div className={styles.roundTopRow}>
                            <div className={styles.roundIdentity}>
                              <span className={styles.roundNumberDot}>
                                {round.round_number || '?'}
                              </span>
                              <span
                                className={`${styles.roundStatusBadge} ${styles[`historyStatus_${roundTone}`]}`}
                              >
                                {cfg.icon} {cfg.label}
                              </span>
                              {timeLeft && (
                                <span className={styles.roundTimeRemaining}>
                                  ⏱ {timeLeft}
                                </span>
                              )}
                            </div>
                            {canApprove && (
                              <div className={styles.roundActionGroup}>
                                <button
                                  type="button"
                                  className={`${styles.roundActionButton} ${styles.roundActionApprove}`}
                                  onClick={() => openActionModal(round, 'APPROVE')}
                                  disabled={submitting || !canWrite || permissionsLoading}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.roundActionButton} ${styles.roundActionReject}`}
                                  onClick={() => openActionModal(round, 'REJECT')}
                                  disabled={submitting || !canWrite || permissionsLoading}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Details row */}
                          <div className={styles.roundMeta}>
                            <div className={styles.roundMetaItem}>
                              <span className={styles.roundMetaLabel}>Target</span>
                              <div className={styles.roundMetaValue}>
                                ₹{parseFloat(round.target_price || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className={styles.roundMetaItem}>
                              <span className={styles.roundMetaLabel}>End Date</span>
                              <div className={styles.roundMetaValue}>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</div>
                            </div>
                            {round.created_by_name && (
                              <div className={styles.roundMetaItem}>
                                <span className={styles.roundMetaLabel}>Created By</span>
                                <div className={styles.roundMetaValue}>{round.created_by_name}</div>
                              </div>
                            )}
                          </div>

                          {/* Approval Workflow Journey */}
                          {(effectiveStatus === 'PENDING_APPROVAL' || effectiveStatus === 'REJECTED' || effectiveStatus === 'APPROVED') && (
                            <div>
                              <div
                                onClick={() => toggleApprovalJourney(round)}
                                className={styles.workflowToggle}
                              >
                                <span className={styles.workflowChevron}>
                                  {expandedApprovalJourney === round.id ? '▼' : '▶'}
                                </span>
                                Approval Workflow
                                {approvals.length > 0 && (
                                  <span className={styles.workflowMeta}>
                                    ({approvals.filter(a => a.status === 'PENDING').length} pending)
                                  </span>
                                )}
                              </div>

                              {expandedApprovalJourney === round.id && (
                                <div className={styles.workflowPanel}>
                                  {approvalJourneys[round.id]?.loading ? (
                                    <div className={styles.workflowLoading}>
                                      <Spinner size="sm" />
                                      <span> Loading approval history...</span>
                                    </div>
                                  ) : approvalJourneys[round.id]?.instances?.length > 0 ? (
                                    <div className={styles.journeyList}>
                                      {approvalJourneys[round.id].instances.map((instance, instIdx) => {
                                        const isLast = instIdx === approvalJourneys[round.id].instances.length - 1;
                                        const instStatus = (instance.status || '').toUpperCase();
                                        const attemptNum = instIdx + 1;
                                        const journeyTone = getJourneyTone(instStatus);

                                        const instIcon = instStatus === 'APPROVED' ? '✓' :
                                                        instStatus === 'REJECTED' ? '✗' :
                                                        instStatus === 'CANCELLED' ? '—' : '◷';
                                        const instLabel = instStatus === 'PENDING' ? 'In Progress' :
                                                         instStatus.charAt(0) + instStatus.slice(1).toLowerCase();

                                        return (
                                          <div key={instance.id || instIdx}>
                                            <div
                                              className={`${styles.journeyCard} ${
                                                isLast && instStatus === 'PENDING' ? styles.journeyCardCurrent : ''
                                              }`}
                                            >
                                              <div className={`${styles.journeyHeader} ${styles[`journeyHeader_${journeyTone}`]}`}>
                                                <div className={styles.journeyHeaderLeft}>
                                                  <span className={`${styles.journeyIcon} ${styles[`journeyIcon_${journeyTone}`]}`}>
                                                    {instIcon}
                                                  </span>
                                                  <span className={styles.journeyAttempt}>Attempt {attemptNum}</span>
                                                  <span className={`${styles.journeyStatus} ${styles[`journeyStatus_${journeyTone}`]}`}>
                                                    {instLabel}
                                                  </span>
                                                  {isLast && instStatus === 'PENDING' && (
                                                    <span className={styles.journeyCurrent}>
                                                      Current
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className={styles.journeyBody}>
                                                {instance.steps && instance.steps.length > 0 ? (
                                                  <ApprovalTimeline
                                                    steps={instance.steps}
                                                    currentStep={instance.current_step}
                                                    initiatedBy={instance.initiated_by}
                                                  />
                                                ) : (
                                                  <div className={styles.journeyEmpty}>
                                                    No step details available
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {!isLast && (
                                              <div className={styles.journeyConnector}>resubmitted</div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className={styles.journeyEmpty}>
                                      No approval workflow data found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderViewApprove = () => {
    // Helper to check if a round has been rejected via approvals
    const isRoundRejected = (round) => {
      return round?.approvals?.some(a => a.status === 'REJECTED');
    };

    // Helper to check if a round has ended based on end_date
    // Note: end_date from server is in UTC, so use moment.utc() to parse it correctly
    const isRoundEnded = (round) => {
      const status = (round?.status || '').toUpperCase();
      if (status === 'ACTIVE' && round?.end_date && moment.utc(round.end_date).isBefore(moment())) {
        return true;
      }
      return false;
    };

    // Exclude rejected rounds from pending
    const pendingRounds = activeRounds.filter(r =>
      (r.status === 'PENDING_APPROVAL' || r.status === 'pending_approval') && !isRoundRejected(r)
    );
    // Active rounds: status is ACTIVE, end_date has NOT passed, and not rejected
    const activeRoundsList = activeRounds.filter(r => {
      const status = (r?.status || '').toUpperCase();
      return status === 'ACTIVE' && !isRoundEnded(r) && !isRoundRejected(r);
    });

    return (
      <div>
        {renderRoundStatusSummary()}
        {pendingRounds.length === 0 && activeRoundsList.length === 0 ? (
          <div className={styles.sectionCard}>
            <Alert variant="info" className="mb-0">No active negotiation rounds</Alert>
          </div>
        ) : (
          <>
            {pendingRounds.length > 0 && (
              <div className="mb-4">
                <h6 className={styles.pendingSectionTitle}>Pending Approval</h6>
                {pendingRounds.map((round) => {
                  const product = products.find(p => p.id === round.rfq_product_id);
                  const productName = round.product_name || (product ? getProductName(product) : `Product ${round.rfq_product_id}`);
                  const approvals = round.approvals || [];

                  // Get approval instance from hospitality API (authoritative source for can_user_approve)
                  const approvalInstance = approvalInstances[round.rfq_product_id];

                  // Use approval instance data if available, otherwise fall back to round.approvals
                  const canApprove = approvalInstance
                    ? approvalInstance.can_user_approve === true
                    : (() => {
                        // Fallback: Use string comparison to avoid type issues
                        const userApproval = approvals.find(a =>
                          String(a.approver_user_id) === String(currentUserId)
                        );
                        return userApproval && (
                          userApproval.status === 'PENDING' ||
                          userApproval.status === 'pending' ||
                          !userApproval.status  // null/undefined treated as pending
                        );
                      })();

                  // Only show as current approver if not loading and canApprove is true
                  const isCurrentApprover = !loadingApprovals && canApprove;
                  const approvalStatus = approvalInstance?.status;

                  return (
                    <div
                      key={round.id}
                      className={`${styles.pendingCard} ${isCurrentApprover ? styles.pendingCardAttention : ''}`}
                    >
                      <div className={styles.pendingHeader}>
                        <div>
                          <p className={styles.pendingTitle}>{productName}</p>
                          <div className={styles.pendingBadgeRow}>
                            <Badge bg="warning" text="dark">Round {round.round_number}</Badge>
                            {isCurrentApprover && (
                              <Badge bg="danger">Your Action Required</Badge>
                            )}
                          </div>
                        </div>
                        <div className={styles.pendingActions}>
                          {loadingApprovals ? (
                            <Spinner size="sm" />
                          ) : canApprove ? (
                            <div className={styles.decisionActions}>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => openActionModal(round, 'APPROVE')}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Approve Round
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => openActionModal(round, 'REJECT')}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Reject Round
                              </Button>
                            </div>
                          ) : approvalInstance ? (
                            <Badge bg={approvalStatus === 'APPROVED' ? 'success' :
                                     approvalStatus === 'REJECTED' ? 'danger' : 'secondary'}>
                              {approvalStatus === 'PENDING' ? 'Awaiting Your Turn' : approvalStatus || 'Pending'}
                            </Badge>
                          ) : (
                            <Badge bg="secondary">Not an approver</Badge>
                          )}
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedRoundForWorkflow(round);
                              onHide();
                              setShowWorkflowModal(true);
                            }}
                          >
                            View Workflow Details
                          </Button>
                        </div>
                      </div>
                      <div className={styles.metaInlineRow}>
                        <div className={styles.metaInlineBlock}>
                          <span className={styles.metaInlineLabel}>Target Price</span>
                          <span className={styles.metaInlineValue}>₹{parseFloat(round.target_price).toLocaleString()}</span>
                        </div>
                        <div className={styles.metaInlineBlock}>
                          <span className={styles.metaInlineLabel}>End Date</span>
                          <span className={styles.metaInlineValue}>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</span>
                        </div>
                      </div>
                      
                      {/* Round Approval Status */}
                      {round.approvals && round.approvals.length > 0 && (
                        <div className={styles.approverBand}>
                          <p className={styles.approverBandTitle}>
                            Round Approval Status
                          </p>
                          <div className={styles.approverList}>
                            {round.approvals.map((approval, idx) => (
                              <div key={idx} className="d-flex align-items-center gap-1">
                                <Badge 
                                  bg={
                                    approval.status === 'APPROVED' ? 'success' :
                                    approval.status === 'REJECTED' ? 'danger' :
                                    'warning'
                                  }
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {approval.approver_name || `User ${approval.approver_user_id}`}
                                </Badge>
                                <small className={styles.approverStatus}>
                                  {approval.status === 'APPROVED' ? '✓ Approved' :
                                   approval.status === 'REJECTED' ? '✗ Rejected' :
                                   '⏳ Pending'}
                                </small>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1">
                            <small className={styles.approverStatus}>
                              {round.approvalStatus?.approved || 0} of {round.approvalStatus?.total || 0} approvers have approved this round
                            </small>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeRoundsList.length > 0 && (
              <div>
                <h6 className={styles.pendingSectionTitle}>Active Rounds</h6>
                {activeRoundsList.map((round) => {
                  const product = products.find(p => p.id === round.rfq_product_id);
                  const productName = round.product_name || (product ? getProductName(product) : `Product ${round.rfq_product_id}`);
                  return (
                    <div key={round.id} className={styles.pendingCard}>
                      <div className={styles.pendingHeader}>
                        <div>
                          <p className={styles.pendingTitle}>{productName}</p>
                          <div className={styles.pendingBadgeRow}>
                            <Badge bg="success">Round {round.round_number}</Badge>
                          </div>
                        </div>
                         <Button
                           variant={selectedRound?.id === round.id ? "primary" : "outline-primary"}
                           size="sm"
                           onClick={() => {
                             if (selectedRound?.id === round.id) {
                               setSelectedRound(null);
                               setRoundQuotes([]);
                             } else {
                               setSelectedRound(round);
                               loadRoundQuotes(round.id);
                             }
                           }}
                           disabled={loading}
                         >
                           {loading && selectedRound?.id === round.id ? (
                             <Spinner size="sm" />
                           ) : selectedRound?.id === round.id ? (
                             'Hide Quotes'
                           ) : (
                             'View Quotes'
                           )}
                         </Button>
                      </div>
                      <div className={styles.metaInlineRow}>
                        <div className={styles.metaInlineBlock}>
                          <span className={styles.metaInlineLabel}>Target Price</span>
                          <span className={styles.metaInlineValue}>₹{parseFloat(round.target_price).toLocaleString()}</span>
                        </div>
                        <div className={styles.metaInlineBlock}>
                          <span className={styles.metaInlineLabel}>End Date</span>
                          <span className={styles.metaInlineValue}>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

             {selectedRound && (
               <div className={styles.quotesSection}>
                 <h6 className={styles.quotesTitle}>Quotes for Round {selectedRound.round_number}</h6>
                 {loading ? (
                   <div className="text-center py-3">
                     <Spinner size="sm" />
                   </div>
                 ) : roundQuotes.length === 0 ? (
                   <Alert variant="info" className="mb-0">No quotes submitted yet</Alert>
                 ) : (
                   <Table striped bordered hover size="sm" className={styles.quotesTable}>
                     <thead>
                       <tr>
                         <th>Vendor</th>
                         <th>Quoted Price</th>
                         <th>Previous Price</th>
                         <th>Submitted At</th>
                       </tr>
                     </thead>
                     <tbody>
                       {roundQuotes.map((quote, idx) => (
                         <tr key={idx}>
                           <td>{quote.vendor_name || quote.vendor_company_name}</td>
                           <td>₹{parseFloat(quote.quoted_price || 0).toLocaleString()}</td>
                           <td>{quote.previous_price ? `₹${parseFloat(quote.previous_price).toLocaleString()}` : '-'}</td>
                           <td>{quote.submitted_at ? moment(quote.submitted_at).format('DD-MM-YYYY hh:mm A') : '-'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </Table>
                 )}
               </div>
             )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName={styles.negotiationModalDialog}>
      <Modal.Header closeButton className={styles.modalHeader}>
        <div className={styles.modalTitleWrap}>
          <Modal.Title className={styles.modalTitle}>{getModalTitle()}</Modal.Title>
          <p className={styles.modalSubtitle}>{getModalSubtitle()}</p>
        </div>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            {mode === 'create' && renderCreateForm()}
            {mode === 'history' && renderHistory()}
            {mode === 'view-approve' && renderViewApprove()}
          </>
        )}
      </Modal.Body>
      {mode !== 'create' && (
        <Modal.Footer className={styles.modalFooter}>
          <button className={styles.actionPrimary} onClick={onHide}>
            Close
          </button>
        </Modal.Footer>
      )}
    </Modal>

      {/* Workflow Modal */}
      <NegotiationWorkflowModal
        show={showWorkflowModal}
        onHide={() => {
          setShowWorkflowModal(false);
          handleShow();
        }}
        round={selectedRoundForWorkflow}
        hospitalityCompanyId={hospitalityCompanyId}
        hotelId={hotelId}
        departmentId={departmentId}
        onActionComplete={() => {
          setShowWorkflowModal(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Approval Action Modal for approve/reject confirmation */}
      <ApprovalActionModal
        show={showActionModal}
        actionType={actionType}
        onClose={() => {
          setShowActionModal(false);
          setSelectedRoundForAction(null);
          setActionType(null);
          handleShow(); // Re-open the NegotiationModal when action is cancelled
        }}
        onSubmit={handleActionModalSubmit}
        loading={submitting}
        entityLabel={`Negotiation Round ${selectedRoundForAction?.round_number || ''}`}
      />
    </>
  );
};

export default NegotiationModal;
