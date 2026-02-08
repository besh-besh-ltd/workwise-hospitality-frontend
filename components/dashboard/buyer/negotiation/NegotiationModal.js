import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import {
  createNegotiationRound,
  approveNegotiationRound,
  rejectNegotiationRound,
  getRoundQuotes,
  getNegotiationRounds,
  getQuoteApprovalStatus
} from '@/services/negotiation';
import { getUserDetails, getProfile } from '@/services/Auth';
import { getEntityApprovalInstances, getApprovalInstanceDetails } from '@/services/approval';
import { toast } from 'react-toastify';
import moment from 'moment';
import NegotiationWorkflowModal from './NegotiationWorkflowModal';
import ApprovalActionModal from '../approval/ApprovalActionModal';

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

  useEffect(() => {
    // Load current user ID when modal opens
    const loadUser = async () => {
      try {
        const res = await getProfile();
        if (res?.data?.id) {
          setCurrentUserId(parseInt(res.data.id));
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to localStorage or JWT
        try {
          const localStorageUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');
          if (localStorageUserId) {
            setCurrentUserId(parseInt(localStorageUserId));
          } else {
            const userDetails = getUserDetails();
            if (userDetails?.sub || userDetails?.user_id || userDetails?.id) {
              const userId = userDetails.sub || userDetails.user_id || userDetails.id;
              setCurrentUserId(typeof userId === 'string' ? parseInt(userId.split('|')[0]) : parseInt(userId));
            }
          }
        } catch (e) {
          console.error('Error getting user ID from fallback:', e);
        }
      }
    };
    
    if (show) {
      loadUser();
    }
    
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
      case 'history': return 'Negotiation Rounds History';
      case 'view-approve': return 'View & Approve Negotiation Rounds';
      default: return 'Negotiation';
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

    return (
      <div className="mb-3 p-2 bg-light rounded border">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted fw-bold">Round Status Summary</small>
          <Badge bg="secondary" pill>{total} Total</Badge>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {counts.active > 0 && (
            <Badge bg="success" className="d-flex align-items-center gap-1 px-2 py-1">
              <span className="fw-bold">{counts.active}</span>
              <span>Active</span>
            </Badge>
          )}
          {counts.ended > 0 && (
            <Badge style={{ backgroundColor: '#fd7e14', color: '#fff' }} className="d-flex align-items-center gap-1 px-2 py-1">
              <span className="fw-bold">{counts.ended}</span>
              <span>Ended</span>
            </Badge>
          )}
          {counts.pending_approval > 0 && (
            <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1 px-2 py-1">
              <span className="fw-bold">{counts.pending_approval}</span>
              <span>Pending Approval</span>
            </Badge>
          )}
          {counts.rejected > 0 && (
            <Badge bg="danger" className="d-flex align-items-center gap-1 px-2 py-1">
              <span className="fw-bold">{counts.rejected}</span>
              <span>Rejected</span>
            </Badge>
          )}
          {counts.completed > 0 && (
            <Badge bg="info" className="d-flex align-items-center gap-1 px-2 py-1">
              <span className="fw-bold">{counts.completed}</span>
              <span>Completed</span>
            </Badge>
          )}
          {counts.closed > 0 && (
            <Badge bg="secondary" className="d-flex align-items-center gap-1 px-2 py-1">
              <span className="fw-bold">{counts.closed}</span>
              <span>Closed</span>
            </Badge>
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
        <Form.Group className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Form.Label className="mb-0 fw-bold">Select Product</Form.Label>
          </div>

          <Table bordered hover size="sm" className="mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Product</th>
                <th>Spec</th>
                <th>Size</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Vendor Names</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const hasRound = hasActiveRound(product.id);
                const quoteApproved = isQuoteApproved(product.id);
                const noQuotes = !hasQuotes(product);
                const isDisabled = hasRound || quoteApproved || noQuotes;
                const isSelected = selectedProducts.includes(product.id);
                const details = getProductDetails(product);

                return (
                  <tr
                    key={product.id}
                    onClick={() => !isDisabled && handleProductToggle(product.id)}
                    style={{
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isDisabled ? '#f8f9fa' : isSelected ? '#e3f2fd' : '#fff',
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                  >
                    <td className="text-center align-middle">
                      <Form.Check
                        type="radio"
                        name="selectedProduct"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => {}}
                        style={{ pointerEvents: 'none' }}
                      />
                    </td>
                    <td className="align-middle">
                      {details.name}
                      {quoteApproved && (
                        <Badge bg="success" className="ms-2" style={{ fontSize: '0.65rem' }}>
                          Approved
                        </Badge>
                      )}
                      {hasRound && !quoteApproved && (
                        <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.65rem' }}>
                          Active
                        </Badge>
                      )}
                      {noQuotes && !hasRound && !quoteApproved && (
                        <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.65rem' }}>
                          No Quotes
                        </Badge>
                      )}
                    </td>
                    <td className="align-middle">{details.spec}</td>
                    <td className="align-middle">{details.size}</td>
                    <td className="align-middle">{details.quantity}</td>
                    <td className="align-middle">{details.unit}</td>
                    <td className="align-middle">
                      <small className="text-muted">{getVendorNames(product)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {selectedProducts.length > 0 && (
            <Form.Text className="text-success mt-2 d-block">
              1 product selected
            </Form.Text>
          )}
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Target Price (₹) <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="number"
            step="0.01"
            min="0"
            value={formData.target_price}
            onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
            placeholder="Enter target price"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>End Date <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="datetime-local"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            required
          />
          <Form.Text className="text-muted">
            Vendors can submit one quote per product until this date
          </Form.Text>
        </Form.Group>

        <div className="d-flex justify-content-end gap-2">
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || selectedProducts.length === 0 || !canWrite || permissionsLoading}>
            {submitting ? <Spinner size="sm" /> : 'Create Round'}
          </Button>
        </div>
      </Form>
    );
  };

  const renderHistory = () => (
    <div>
      {renderRoundStatusSummary()}
      {roundsHistory.length === 0 ? (
        <Alert variant="info">No negotiation rounds found</Alert>
      ) : (
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Product</th>
              <th>Round #</th>
              <th>Target Price</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            {roundsHistory.map((round) => {
              const product = products.find(p => p.id === round.rfq_product_id);
              const productName = round.product_name || (product ? getProductName(product) : `Product ${round.rfq_product_id}`);
              // Get effective status considering approvals and end_date
              const effectiveStatus = getEffectiveRoundStatus(round);
              return (
                <tr key={round.id}>
                  <td>{productName}</td>
                  <td>{round.round_number}</td>
                  <td>₹{parseFloat(round.target_price).toLocaleString()}</td>
                  <td>{moment.utc(round.end_date).local().format('DD/MM/YYYY HH:mm')}</td>
                  <td>
                    <Badge bg={
                      effectiveStatus === 'REJECTED' ? 'danger' :
                      effectiveStatus === 'ENDED' ? 'secondary' :
                      effectiveStatus === 'ACTIVE' ? 'success' :
                      effectiveStatus === 'PENDING_APPROVAL' ? 'warning' :
                      effectiveStatus === 'COMPLETED' ? 'info' :
                      'secondary'
                    }>
                      {effectiveStatus}
                    </Badge>
                  </td>
                  <td>{round.created_by_name}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );

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
          <Alert variant="info">No active negotiation rounds</Alert>
        ) : (
          <>
            {pendingRounds.length > 0 && (
              <div className="mb-4">
                <h6 className="mb-3">Pending Approval</h6>
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
                      className="border rounded p-3 mb-3"
                      style={{
                        backgroundColor: isCurrentApprover ? '#fff3cd' : '#fff8e1',
                        border: isCurrentApprover ? '2px solid #ffc107' : '1px solid #dee2e6',
                        boxShadow: isCurrentApprover ? '0 0 10px rgba(255, 193, 7, 0.3)' : 'none'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{productName}</strong>
                          <Badge bg="warning" text="dark" className="ms-2">Round {round.round_number}</Badge>
                          {isCurrentApprover && (
                            <Badge bg="danger" className="ms-2">Your Action Required</Badge>
                          )}
                        </div>
                        <div className="d-flex flex-column gap-2 align-items-end">
                          {loadingApprovals ? (
                            <Spinner size="sm" />
                          ) : canApprove ? (
                            <div className="d-flex gap-2 p-2 rounded" style={{ backgroundColor: '#fff3cd' }}>
                              <Button
                                variant="success"
                                className='p-2'
                                onClick={() => openActionModal(round, 'APPROVE')}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Approve Round
                              </Button>
                              <Button
                                variant="danger"
                                className='p-2'
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
                            className='p-2'
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
                      <div className="row mb-2">
                        <div className="col-md-6">
                          <small className="text-muted">Target Price:</small>
                          <div className="fw-bold">₹{parseFloat(round.target_price).toLocaleString()}</div>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted">End Date:</small>
                          <div>{moment.utc(round.end_date).local().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                      </div>
                      
                      {/* Round Approval Status */}
                      {round.approvals && round.approvals.length > 0 && (
                        <div className="mt-2 pt-2 border-top">
                          <small className="text-muted d-block mb-1">
                            <strong>Round Approval Status</strong> (approvers for this negotiation round):
                          </small>
                          <div className="d-flex flex-wrap gap-2">
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
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {approval.status === 'APPROVED' ? '✓ Approved' :
                                   approval.status === 'REJECTED' ? '✗ Rejected' :
                                   '⏳ Pending'}
                                </small>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1">
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
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
                <h6 className="mb-3">Active Rounds</h6>
                {activeRoundsList.map((round) => {
                  const product = products.find(p => p.id === round.rfq_product_id);
                  const productName = round.product_name || (product ? getProductName(product) : `Product ${round.rfq_product_id}`);
                  return (
                    <div key={round.id} className="border rounded p-3 mb-3" style={{ backgroundColor: '#e8f5e9' }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{productName}</strong>
                          <Badge bg="success" className="ms-2">Round {round.round_number}</Badge>
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
                      <div className="row">
                        <div className="col-md-6">
                          <small className="text-muted">Target Price:</small>
                          <div className="fw-bold">₹{parseFloat(round.target_price).toLocaleString()}</div>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted">End Date:</small>
                          <div>{moment.utc(round.end_date).local().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

             {selectedRound && (
               <div className="mt-4 border-top pt-3">
                 <h6>Quotes for Round {selectedRound.round_number}</h6>
                 {loading ? (
                   <div className="text-center py-3">
                     <Spinner size="sm" />
                   </div>
                 ) : roundQuotes.length === 0 ? (
                   <Alert variant="info" className="mb-0">No quotes submitted yet</Alert>
                 ) : (
                   <Table striped bordered hover size="sm">
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
                           <td>{quote.submitted_at ? moment(quote.submitted_at).format('DD/MM/YYYY HH:mm') : '-'}</td>
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
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className='py-2 px-3 pb-0'>
        <Modal.Title>{getModalTitle()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
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
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
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
