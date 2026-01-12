import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { 
  createNegotiationRound, 
  approveNegotiationRound, 
  rejectNegotiationRound,
  getRoundQuotes,
  getNegotiationRounds
} from '@/services/negotiation';
import { getUserDetails, getProfile } from '@/services/Auth';
import { toast } from 'react-toastify';
import moment from 'moment';
import NegotiationWorkflowModal from './NegotiationWorkflowModal';

const NegotiationModal = ({
  show,
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
    }
    if (show && mode === 'view-approve' && activeRounds.length > 0) {
      const pendingRound = activeRounds.find(r => r.status === 'PENDING_APPROVAL');
      if (pendingRound) {
        setSelectedRound(pendingRound);
        loadRoundQuotes(pendingRound.id);
      }
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
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    const availableProducts = products.filter(p => !hasActiveRound(p.id));
    if (selectedProducts.length === availableProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(availableProducts.map(p => p.id));
    }
  };

  const hasActiveRound = (productId) => {
    return activeRounds.some(r => r.rfq_product_id === productId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0 || !formData.target_price || !formData.end_date) {
      toast.error('Please select at least one product and fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      // Create rounds for each selected product
      for (const productId of selectedProducts) {
        await createNegotiationRound({
          rfq_id,
          rfq_product_id: parseInt(productId),
          target_price: parseFloat(formData.target_price),
          end_date: formData.end_date
        });
      }
      
      toast.success(`Negotiation round${selectedProducts.length > 1 ? 's' : ''} created successfully`);
      onRefresh();
      onHide();
    } catch (error) {
      toast.error(error.message || 'Failed to create negotiation round');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (roundId) => {
    setSubmitting(true);
    try {
      const response = await approveNegotiationRound(roundId);
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

  const handleReject = async (roundId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

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

  // Helper to get effective round status (considering end_date)
  const getEffectiveRoundStatus = (round) => {
    const status = (round?.status || '').toUpperCase();

    // If status is ACTIVE but end_date has passed, treat as ENDED
    if (status === 'ACTIVE' && round?.end_date && moment(round.end_date).isBefore(moment())) {
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
      ended: 0
    };

    uniqueRounds.forEach(round => {
      const effectiveStatus = getEffectiveRoundStatus(round);
      if (effectiveStatus === 'ACTIVE') counts.active++;
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
    const total = counts.active + counts.pending_approval + counts.completed + counts.closed + counts.ended;

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

  const getVendorCodes = (product) => {
    const quotations = product?.quotations || [];
    if (quotations.length === 0) return 'No quotes';
    
    // Filter out regretted quotes and those without valid data
    const validQuotations = quotations.filter(q => 
      q.id != null && 
      q.is_regret !== 1 && 
      q.vendor_details
    );
    
    if (validQuotations.length === 0) return 'No quotes';
    
    const codes = validQuotations.slice(0, 3).map(q => {
      // vendor_details is an array at quotation level, not inside quote_details
      const vendorDetails = Array.isArray(q.vendor_details) ? q.vendor_details[0] : q.vendor_details;
      if (vendorDetails?.rfq_product_vendor_id) {
        return `VEN-${vendorDetails.rfq_product_vendor_id}`;
      }
      // Fallback: try to get from all_vendors using created_by
      if (q.created_by && product?.all_vendors) {
        const allVendor = product.all_vendors.find(v => v.id === q.created_by);
        if (allVendor?.rfq_product_vendor_id) {
          return `VEN-${allVendor.rfq_product_vendor_id}`;
        }
      }
      return null;
    }).filter(Boolean);
    
    if (validQuotations.length > 3) {
      return codes.length > 0 ? `${codes.join(', ')} +${validQuotations.length - 3} more` : 'No vendor codes';
    }
    return codes.length > 0 ? codes.join(', ') : 'No vendor codes';
  };

  const getProductDetails = (product) => {
    const details = product?.product_details?.[0] || {};
    const productSpecs = product?.product_specs || [];
    const rfqDetails = details?.rfq_details || [];
    
    const spec = productSpecs.find(s => s.title === 'Spec')?.value || 
                 rfqDetails.find(d => d.title === 'Spec')?.value || '-';
    const size = productSpecs.find(s => s.title === 'Size')?.value || 
                 rfqDetails.find(d => d.title === 'Size')?.value || '-';
    const quantity = rfqDetails.find(d => d.title === 'Quantity')?.value || 
                     product?.quantity || '-';
    const unit = rfqDetails.find(d => d.title === 'Unit')?.value || 
                 product?.unit || '-';
    
    return {
      name: details?.name || details?.product_name || `Product ${product.id}`,
      spec,
      size,
      quantity,
      unit
    };
  };

  const renderCreateForm = () => {
    const availableProducts = products.filter(p => !hasActiveRound(p.id));
    
    return (
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Form.Label className="mb-0 fw-bold">Select Product</Form.Label>
            {availableProducts.length > 1 && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleSelectAll}
                className="p-0"
              >
                {selectedProducts.length === availableProducts.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
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
                <th>Vendor Codes</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const hasRound = hasActiveRound(product.id);
                const isSelected = selectedProducts.includes(product.id);
                const details = getProductDetails(product);
                
                return (
                  <tr 
                    key={product.id}
                    onClick={() => !hasRound && handleProductToggle(product.id)}
                    style={{
                      cursor: hasRound ? 'not-allowed' : 'pointer',
                      backgroundColor: hasRound ? '#f8f9fa' : isSelected ? '#e3f2fd' : '#fff',
                      opacity: hasRound ? 0.6 : 1,
                    }}
                  >
                    <td className="text-center align-middle">
                      <Form.Check 
                        type="checkbox"
                        checked={isSelected}
                        disabled={hasRound}
                        onChange={() => {}}
                        style={{ pointerEvents: 'none' }}
                      />
                    </td>
                    <td className="align-middle">
                      {details.name}
                      {hasRound && (
                        <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: '0.65rem' }}>
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="align-middle">{details.spec}</td>
                    <td className="align-middle">{details.size}</td>
                    <td className="align-middle">{details.quantity}</td>
                    <td className="align-middle">{details.unit}</td>
                    <td className="align-middle">
                      <small className="text-muted">{getVendorCodes(product)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {selectedProducts.length > 0 && (
            <Form.Text className="text-success mt-2 d-block">
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
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
            {submitting ? <Spinner size="sm" /> : `Create Round${selectedProducts.length > 1 ? 's' : ''}`}
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
              return (
                <tr key={round.id}>
                  <td>{productName}</td>
                  <td>{round.round_number}</td>
                  <td>₹{parseFloat(round.target_price).toLocaleString()}</td>
                  <td>{moment(round.end_date).format('DD/MM/YYYY HH:mm')}</td>
                  <td>
                    <Badge bg={
                      round.status === 'ACTIVE' ? 'success' :
                      round.status === 'PENDING_APPROVAL' ? 'warning' :
                      round.status === 'COMPLETED' ? 'info' :
                      'secondary'
                    }>
                      {round.status}
                    </Badge>
                  </td>
                  <td>{round.created_by_name || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );

  const renderViewApprove = () => {
    const pendingRounds = activeRounds.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'pending_approval');
    const activeRoundsList = activeRounds.filter(r => r.status === 'ACTIVE' || r.status === 'active');

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
                  const userApproval = approvals.find(a => {
                    const approverId = parseInt(a.approver_user_id);
                    const userId = parseInt(currentUserId);
                    console.log('Comparing approver IDs:', {
                      approverId,
                      userId,
                      match: approverId === userId,
                      approverIdType: typeof approverId,
                      userIdType: typeof userId
                    });
                    return approverId === userId;
                  });
                  const canApprove = userApproval && (
                    userApproval.status === 'PENDING' || 
                    userApproval.status === 'pending' ||
                    userApproval.status === null ||
                    userApproval.status === undefined
                  );
                  
                  console.log('Round approval check:', {
                    roundId: round.id,
                    currentUserId,
                    currentUserIdType: typeof currentUserId,
                    userApproval,
                    canApprove,
                    approvals: approvals.map(a => ({
                      approver_user_id: a.approver_user_id,
                      approver_user_id_parsed: parseInt(a.approver_user_id),
                      status: a.status,
                      approver_name: a.approver_name
                    }))
                  });

                  return (
                    <div key={round.id} className="border rounded p-3 mb-3" style={{ backgroundColor: '#fff8e1' }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{productName}</strong>
                          <Badge bg="warning" text="dark" className="ms-2">Round {round.round_number}</Badge>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          {canApprove ? (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApprove(round.id)}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleReject(round.id)}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Reject
                              </Button>
                            </>
                          ) : userApproval ? (
                            <Badge bg={userApproval.status === 'APPROVED' || userApproval.status === 'approved' ? 'success' :
                                     userApproval.status === 'REJECTED' || userApproval.status === 'rejected' ? 'danger' : 'secondary'}>
                              {userApproval.status || 'N/A'}
                            </Badge>
                          ) : (
                            <Badge bg="secondary">Not an approver</Badge>
                          )}
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedRoundForWorkflow(round);
                              setShowWorkflowModal(true);
                            }}
                          >
                            View Workflow
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
                          <div>{moment(round.end_date).format('DD/MM/YYYY HH:mm')}</div>
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
                          <div>{moment(round.end_date).format('DD/MM/YYYY HH:mm')}</div>
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
                           <td>{quote.vendor_name || quote.vendor_company_name || 'N/A'}</td>
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
      <Modal.Header closeButton>
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
        onHide={() => setShowWorkflowModal(false)}
        round={selectedRoundForWorkflow}
        hospitalityCompanyId={hospitalityCompanyId}
        hotelId={hotelId}
        departmentId={departmentId}
        onActionComplete={() => {
          setShowWorkflowModal(false);
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
};

export default NegotiationModal;
