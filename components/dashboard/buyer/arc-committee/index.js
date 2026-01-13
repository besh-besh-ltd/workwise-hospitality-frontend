import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getArcRfqList, getTenderLifecycle, performArcAction, getArcDocument } from "@/services/arc";
import { getProjectList } from '@/services/project';
import { getUserMappings } from '@/services/hospitality';
import { formatRFQNumber } from "@/utils/sharedFunctions";
import { toast } from "react-toastify";
import FullLoader from "@/components/shared/FullLoader";
import Select from 'react-select';
import moment from 'moment';
import { Badge, Button, Modal, Form, Accordion, Table, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faTimesCircle, faArrowRight, faClock, faFileAlt, faUsers, faGavel } from "@fortawesome/free-solid-svg-icons";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";

const ArcCommittee = () => {
  const router = useRouter();
  const { rfq_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setCurrentRfq] = useState(null);
  const [lifecycleData, setLifecycleData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isTenderFilter, setIsTenderFilter] = useState(null);
  const [rfqNo, setRfqNo] = useState(null);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [arcDocuments, setArcDocuments] = useState({});

  // Extract hotel IDs for permission checks - use hotel_id from RFQ data or user mappings
  const hotelIds = useMemo(() => {
    // If we have lifecycle data with RFQ, use that hotel_id
    if (lifecycleData?.rfq) {
      const rfq = lifecycleData.rfq;
      // Primary: use hotel_id from RFQ
      if (rfq.hotel_id !== undefined && rfq.hotel_id !== null) {
        return [rfq.hotel_id];
      }
      // Alternative: try hospitality_hotel_id field
      if (rfq.hospitality_hotel_id !== undefined && rfq.hospitality_hotel_id !== null) {
        return [rfq.hospitality_hotel_id];
      }
    }
    // If we have currentRfq with hotel_id, use that
    if (currentRfq?.hotel_id !== undefined && currentRfq?.hotel_id !== null) {
      return [currentRfq.hotel_id];
    }
    // Fallback: use user's hotel mappings if available (for list view)
    if (userHotelMappings && userHotelMappings.length > 0) {
      return userHotelMappings.map(h => h.hospitality_hotel_id).filter(id => id !== undefined && id !== null);
    }
    return [];
  }, [lifecycleData, currentRfq, userHotelMappings]);

  // Permission hook for ARC Committee module
  // Use bulk permissions endpoint - only enabled when we have hotel IDs
  const {
    canRead,
    canUpdate,
    canCreate,
    canApprove,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: "arc",
    hotelIds: hotelIds,
    enabled: hotelIds.length > 0, // Only fetch when we have hotel IDs
  });

  const lifecycleStages = [
    { value: 'CREATED', label: 'RFQ Created' },
    { value: 'SUBMITTED', label: 'Submitted for Approval' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'TECH_EVAL', label: 'Technical Evaluation' },
    { value: 'QUOTES_RECEIVED', label: 'Quotes Received' },
    { value: 'NEGOTIATION', label: 'Negotiation' },
    { value: 'VENDOR_FINALIZED', label: 'Vendor Finalized' },
    { value: 'FINANCE_APPROVED', label: 'Finance Approved' },
    { value: 'ARC_REVIEW', label: 'ARC Review' }
  ];

  useEffect(() => {
    getAllProjects();
    fetchUserHotelMappings();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadRfqList();
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [selectedProject, isTenderFilter, rfqNo, selectedHotelIds]);

  useEffect(() => {
    if (rfq_id) {
      loadLifecycleData();
    }
  }, [rfq_id, selectedProductId]);

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
        console.log(error);
      });
  };

  const fetchUserHotelMappings = async () => {
    try {
      const response = await getUserMappings();
      const mappings = response?.data || [];
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
    }
  };

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
    setSelectedProject(null);
  };

  const loadRfqList = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 100,
        project_id: selectedProject || -1,
        is_tender: isTenderFilter !== null ? (isTenderFilter === '1' || isTenderFilter === 1) : null,
        rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null
      };
      const response = await getArcRfqList(params);
      if (response.status === 1) {
        setRfqList(response.data || []);
      }
    } catch (error) {
      console.error('Error loading RFQ list:', error);
      toast.error('Failed to load RFQ list');
    } finally {
      setLoading(false);
    }
  };

  const loadLifecycleData = async () => {
    try {
      setLoading(true);
      const response = await getTenderLifecycle(rfq_id);
      if (response.status === 1) {
        setLifecycleData(response.data);
        // Set current RFQ from lifecycle data if available
        if (response.data?.rfq) {
          setCurrentRfq({
            id: response.data.rfq.id,
            rfq_no: response.data.rfq.rfq_no,
            is_tender: response.data.rfq.is_tender,
            project_name: response.data.rfq.project_name || '',
            hotel_id: response.data.rfq.hotel_id,
            hospitality_hotel_id: response.data.rfq.hospitality_hotel_id
          });
        }
      }
    } catch (error) {
      console.error('Error loading lifecycle data:', error);
      toast.error('Failed to load tender lifecycle data');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type) => {
    setActionType(type);
    setShowActionModal(true);
    setRemarks('');
    setTargetStage('');
  };

  const handleSubmitAction = async () => {
    if (!actionType) return;

    if (actionType === 'send_to' && !targetStage) {
      toast.error('Please select a target stage');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get approval instance ID for selected product if available
      let approval_instance_id = null;
      let approval_instance_step_id = null;
      
      if (selectedProductId && lifecycleData?.arcApproval?.instances) {
        const productArc = lifecycleData.arcApproval.instances.find(
          inst => (inst.metadata?.rfq_product_id || inst.entity_id) === selectedProductId && inst.status === 'PENDING'
        );
        if (productArc) {
          approval_instance_id = productArc.id;
        }
      }
      
      const response = await performArcAction(
        rfq_id,
        actionType,
        actionType === 'send_to' ? targetStage : null,
        remarks || null,
        selectedProductId || null,
        approval_instance_id,
        approval_instance_step_id
      );

      if (response.status === 1) {
        toast.success(response.message || 'Action performed successfully');
        setShowActionModal(false);
        setSelectedProductId(null);
        loadLifecycleData(); // Reload data
      } else {
        toast.error(response.message || 'Failed to perform action');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(error.message || 'Failed to perform action');
    } finally {
      setSubmitting(false);
    }
  };

  const renderLifecycleTimeline = () => {
    if (!lifecycleData?.lifecycleHistory) return null;

    const history = lifecycleData.lifecycleHistory;
    const stages = [
      { stage: 'CREATED', label: 'RFQ Created', icon: faFileAlt },
      { stage: 'SUBMITTED', label: 'Submitted for Approval', icon: faClock },
      { stage: 'PUBLISHED', label: 'Published', icon: faCheckCircle },
      { stage: 'TECH_EVAL_STARTED', label: 'Technical Evaluation Started', icon: faUsers },
      { stage: 'TECH_EVAL_COMPLETED', label: 'Technical Evaluation Completed', icon: faCheckCircle },
      { stage: 'QUOTES_RECEIVED', label: 'Quotes Received', icon: faFileAlt },
      { stage: 'NEGOTIATION_STARTED', label: 'Negotiation Started', icon: faGavel },
      { stage: 'VENDOR_FINALIZED', label: 'Vendor Finalized', icon: faCheckCircle },
      { stage: 'FINANCE_APPROVED', label: 'Finance Approved', icon: faCheckCircle },
      { stage: 'ARC_REVIEW', label: 'ARC Review', icon: faGavel }
    ];

    return (
      <div className="mb-4">
        <h5 className="mb-3">Lifecycle Timeline</h5>
        <div className="timeline-container" style={{ position: 'relative', paddingLeft: '30px' }}>
          {stages.map((stage, index) => {
            const stageHistory = history.filter(h => 
              h.stage === stage.stage || 
              h.stage?.includes(stage.stage) ||
              h.action === stage.stage
            );
            const isCompleted = stageHistory.length > 0;
            const lastEvent = stageHistory[stageHistory.length - 1];

            return (
              <div key={stage.stage} className="mb-4" style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-25px',
                    top: '0',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#28a745' : '#dee2e6',
                    border: '3px solid white',
                    zIndex: 2
                  }}
                />
                {index < stages.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-16px',
                      top: '20px',
                      width: '2px',
                      height: 'calc(100% + 16px)',
                      backgroundColor: isCompleted ? '#28a745' : '#dee2e6',
                      zIndex: 1
                    }}
                  />
                )}
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <FontAwesomeIcon 
                        icon={stage.icon} 
                        color={isCompleted ? '#28a745' : '#6c757d'} 
                        size="sm"
                      />
                      <strong>{stage.label}</strong>
                      {isCompleted && (
                        <Badge bg="success" style={{ fontSize: '0.7rem' }}>
                          Completed
                        </Badge>
                      )}
                    </div>
                    {lastEvent && (
                      <div className="ms-4 text-muted" style={{ fontSize: '0.85rem' }}>
                        <div>By: {lastEvent.performed_by_name || 'Unknown'}</div>
                        <div>{moment(lastEvent.created_at).format('DD/MM/YYYY HH:mm')}</div>
                        {lastEvent.remarks && (
                          <div className="mt-1">
                            <strong>Remarks:</strong> {lastEvent.remarks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTenderDetails = () => {
    if (!lifecycleData?.rfq) return null;
    const rfq = lifecycleData.rfq;

    return (
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Tender Details</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>RFQ/Tender No:</strong> {rfq.rfq_no}</p>
              <p><strong>Company:</strong> {rfq.company_name}</p>
              <p><strong>Contact Person:</strong> {rfq.contact_name}</p>
              <p><strong>Email:</strong> {rfq.response_email}</p>
              <p><strong>Contact Number:</strong> {rfq.contact_number}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Type:</strong> {rfq.is_tender === 1 ? 'Tender' : 'RFQ'}</p>
              <p><strong>Bid End Date:</strong> {moment(rfq.bid_end_date).format('DD/MM/YYYY')}</p>
              <p><strong>Location:</strong> {rfq.location || 'N/A'}</p>
              <p><strong>Status:</strong> 
                <Badge bg={rfq.status === 1 ? 'success' : 'secondary'} className="ms-2">
                  {rfq.status === 1 ? 'Open' : 'Closed'}
                </Badge>
              </p>
            </div>
          </div>
          {rfq.comment && (
            <div className="mt-3">
              <strong>Comments:</strong>
              <p className="text-muted">{rfq.comment}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    if (!lifecycleData?.rfq?.products) return null;

    // Get ARC approval instances grouped by product
    const arcInstancesByProduct = {};
    if (lifecycleData?.arcApproval?.instances) {
      lifecycleData.arcApproval.instances.forEach(inst => {
        const rfq_product_id = inst.metadata?.rfq_product_id || inst.entity_id;
        if (!arcInstancesByProduct[rfq_product_id]) {
          arcInstancesByProduct[rfq_product_id] = [];
        }
        arcInstancesByProduct[rfq_product_id].push(inst);
      });
    }

    return (
      <div className="card mb-4">
        <div className="card-header bg-info text-white">
          <h5 className="mb-0">Product Details & ARC Approvals</h5>
        </div>
        <div className="card-body">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Specifications</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>ARC Status</th>
                <th>ARC Document</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lifecycleData.rfq.products.map((product) => {
                const specs = product.product_specs || [];
                const size = specs.find(s => s.title === 'Size')?.value || '-';
                const spec = specs.find(s => s.title === 'Spec')?.value || '-';
                const qty = specs.find(s => s.title === 'Quantity')?.value || '-';
                const unit = specs.find(s => s.title === 'Unit')?.value || '-';
                
                const productArcInstances = arcInstancesByProduct[product.id] || [];
                const pendingArc = productArcInstances.find(inst => inst.status === 'PENDING');
                const approvedArc = productArcInstances.find(inst => inst.status === 'APPROVED');
                const arcDocument = approvedArc ? arcDocuments[approvedArc.id] : null;

                return (
                  <tr key={product.id} style={{ backgroundColor: selectedProductId === product.id ? '#e7f3ff' : '' }}>
                    <td>{product.product_details?.[0]?.name || 'N/A'}</td>
                    <td>
                      <div><strong>Size:</strong> {size}</div>
                      <div><strong>Spec:</strong> {spec}</div>
                    </td>
                    <td>{qty}</td>
                    <td>{unit}</td>
                    <td>
                      {pendingArc ? (
                        <Badge bg="warning">Pending Approval</Badge>
                      ) : approvedArc ? (
                        <Badge bg="success">Approved</Badge>
                      ) : (
                        <Badge bg="secondary">No ARC</Badge>
                      )}
                    </td>
                    <td>
                      {arcDocument?.document_url ? (
                        <a 
                          href={arcDocument.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary text-decoration-underline"
                        >
                          <FontAwesomeIcon icon={faFileAlt} className="me-1" />
                          View Document
                        </a>
                      ) : approvedArc ? (
                        <span className="text-muted">Generating...</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {pendingArc && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            handleAction('approve');
                          }}
                        >
                          Review ARC
                        </Button>
                      )}
                      {!pendingArc && !approvedArc && (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>
    );
  };

  const renderQuotes = () => {
    if (!lifecycleData?.quotes || lifecycleData.quotes.length === 0) {
      return (
        <div className="card mb-4">
          <div className="card-header bg-warning text-dark">
            <h5 className="mb-0">Initial Quotes</h5>
          </div>
          <div className="card-body">
            <Alert variant="info">No quotes received yet</Alert>
          </div>
        </div>
      );
    }

    return (
      <div className="card mb-4">
        <div className="card-header bg-warning text-dark">
          <h5 className="mb-0">Initial Quotes ({lifecycleData.quotes.length})</h5>
        </div>
        <div className="card-body">
          <Accordion>
            {lifecycleData.quotes.map((quote, idx) => (
              <Accordion.Item key={quote.id} eventKey={idx.toString()}>
                <Accordion.Header>
                  <div className="d-flex justify-content-between w-100 me-3">
                    <span>
                      <strong>{quote.vendor_name || quote.organization_name || 'Unknown Vendor'}</strong>
                    </span>
                    <span className="text-muted">
                      {moment(quote.created_at).format('DD/MM/YYYY HH:mm')}
                    </span>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="mb-2">
                    <strong>Vendor:</strong> {quote.vendor_name || quote.organization_name || 'N/A'}<br />
                    <strong>Email:</strong> {quote.vendor_email || 'N/A'}<br />
                    <strong>Status:</strong> 
                    <Badge bg={quote.status === 1 ? 'success' : 'secondary'} className="ms-2">
                      {quote.status === 1 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {quote.quote_items && quote.quote_items.length > 0 && (
                    <Table striped bordered size="sm">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Freight</th>
                          <th>Packaging</th>
                          <th>Tax</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.quote_items.map((item, itemIdx) => (
                          <tr key={itemIdx}>
                            <td>{item.product_name}</td>
                            <td>{item.quantity} {item.unit}</td>
                            <td>₹{parseFloat(item.unit_price || 0).toLocaleString()}</td>
                            <td>₹{parseFloat(item.freight_price || 0).toLocaleString()}</td>
                            <td>₹{parseFloat(item.package_price || 0).toLocaleString()}</td>
                            <td>₹{parseFloat(item.tax || 0).toLocaleString()}</td>
                            <td><strong>₹{parseFloat(item.total_price || 0).toLocaleString()}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    );
  };

  const renderTechEvaluation = () => {
    if (!lifecycleData?.techEvaluation || lifecycleData.techEvaluation.length === 0) {
      return (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Technical Evaluation</h5>
          </div>
          <div className="card-body">
            <Alert variant="info">No technical evaluation data available</Alert>
          </div>
        </div>
      );
    }

    return (
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0">Technical Evaluation</h5>
        </div>
        <div className="card-body">
          <Accordion>
            {lifecycleData.techEvaluation.map((techEval, idx) => (
              <Accordion.Item key={techEval.id} eventKey={idx.toString()}>
                <Accordion.Header>
                  Product: {techEval.rfq_product_id}
                </Accordion.Header>
                <Accordion.Body>
                  {techEval.vendor_evaluations && techEval.vendor_evaluations.length > 0 && (
                    <Table striped bordered size="sm">
                      <thead>
                        <tr>
                          <th>Vendor</th>
                          <th>Status</th>
                          <th>Score</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {techEval.vendor_evaluations.map((vendor, vIdx) => (
                          <tr key={vIdx}>
                            <td>{vendor.vendor_name}</td>
                            <td>
                              <Badge bg={vendor.is_accepted ? 'success' : 'danger'}>
                                {vendor.is_accepted ? 'Accepted' : 'Rejected'}
                              </Badge>
                            </td>
                            <td>{vendor.score || 'N/A'}</td>
                            <td>{vendor.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    );
  };

  const renderNegotiationRounds = () => {
    if (!lifecycleData?.negotiationRounds || lifecycleData.negotiationRounds.length === 0) {
      return (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Negotiation Rounds</h5>
          </div>
          <div className="card-body">
            <Alert variant="info">No negotiation rounds conducted</Alert>
          </div>
        </div>
      );
    }

    return (
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Negotiation Rounds ({lifecycleData.negotiationRounds.length})</h5>
        </div>
        <div className="card-body">
          <Accordion>
            {lifecycleData.negotiationRounds.map((round, idx) => (
              <Accordion.Item key={round.id} eventKey={idx.toString()}>
                <Accordion.Header>
                  Round {round.round_number} - Target: ₹{parseFloat(round.target_price).toLocaleString()}
                  <Badge bg={round.status === 'ACTIVE' ? 'success' : round.status === 'PENDING_APPROVAL' ? 'warning' : 'secondary'} className="ms-2">
                    {round.status}
                  </Badge>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="mb-3">
                    <p><strong>Target Price:</strong> ₹{parseFloat(round.target_price).toLocaleString()}</p>
                    <p><strong>End Date:</strong> {moment(round.end_date).format('DD/MM/YYYY HH:mm')}</p>
                    <p><strong>Status:</strong> 
                      <Badge bg={round.status === 'ACTIVE' ? 'success' : round.status === 'PENDING_APPROVAL' ? 'warning' : 'secondary'} className="ms-2">
                        {round.status}
                      </Badge>
                    </p>
                  </div>
                  {round.quotes && round.quotes.length > 0 && (
                    <div>
                      <h6>Quotes for this Round:</h6>
                      <Table striped bordered size="sm">
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Quoted Price</th>
                            <th>Previous Price</th>
                            <th>Submitted At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {round.quotes.map((quote, qIdx) => (
                            <tr key={qIdx}>
                              <td>{quote.vendor_name || quote.vendor_company_name || 'N/A'}</td>
                              <td>₹{parseFloat(quote.quoted_price || 0).toLocaleString()}</td>
                              <td>{quote.previous_price ? `₹${parseFloat(quote.previous_price).toLocaleString()}` : '-'}</td>
                              <td>{moment(quote.submitted_at).format('DD/MM/YYYY HH:mm')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    );
  };

  const renderVendorRankings = () => {
    if (!lifecycleData?.vendorRankings || Object.keys(lifecycleData.vendorRankings).length === 0) {
      return (
        <div className="card mb-4">
          <div className="card-header bg-dark text-white">
            <h5 className="mb-0">Vendor Rankings (L1-L5)</h5>
          </div>
          <div className="card-body">
            <Alert variant="info">No vendor finalization data available</Alert>
          </div>
        </div>
      );
    }

    return (
      <div className="card mb-4">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">Vendor Rankings (L1-L5)</h5>
        </div>
        <div className="card-body">
          {Object.entries(lifecycleData.vendorRankings).map(([productKey, rankings]) => (
            <div key={productKey} className="mb-4">
              <h6>Product: {productKey}</h6>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Vendor</th>
                    <th>Quoted Price</th>
                    <th>Finalized At</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ranking, idx) => (
                    <tr key={ranking.id}>
                      <td><strong>L{idx + 1}</strong></td>
                      <td>{ranking.vendor_name || ranking.organization_name || 'N/A'}</td>
                      <td>₹{parseFloat(ranking.quoted_price || 0).toLocaleString()}</td>
                      <td>{moment(ranking.created_at).format('DD/MM/YYYY HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Check permissions - show access denied if no read permission
  // Only check when we have hotel context (RFQ selected) and permissions have been loaded
  // For list view (no RFQ selected), allow access since backend ACL already handles it
  const hasPermissionContext = hotelIds.length > 0 && !!rfq_id;
  if (hasPermissionContext && !permissionsLoading && !canRead) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message="You do not have permission to view ARC Committee reviews. Contact your administrator to request access."
        backUrl="/dashboard/buyer/rfq-management"
        backLabel="Back to RFQ Management"
      />
    );
  }

  return (
    <>
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">ARC Committee Review</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">
            {/* RFQ List */}
            <div className="col-md-2">
              <div className="hasFullLoader">
                <h5 className="title">List Of RFQ's</h5>

                {loading && <FullLoader />}

                <div className="py-1">
                    <label>Search RFQ No.</label>
                    <input
                        className="form-control react-select" 
                        style={{ borderRadius: '0.25rem', borderColor: '#ced4da', boxShadow: 'none' }}
                        value={rfqNo || ''}
                        onChange={(e)=> setRfqNo(e.target.value)}
                        name="rfq_type"
                        placeholder="Ex. 123456"
                        id="search_rfq_no-rfq_list-arc_committee_page"
                    />
                </div>
                {userHotelMappings.length > 0 && (
                  <div className="py-2">
                    <label>Select Hotels</label>
                    <Select
                      isMulti
                      options={userHotelMappings}
                      value={userHotelMappings.filter(opt => 
                        selectedHotelIds.includes(opt.hospitality_hotel_id)
                      )}
                      onChange={(selectedOptions) => {
                        const ids = selectedOptions 
                          ? selectedOptions.map(opt => opt.hospitality_hotel_id)
                          : [];
                        handleHotelSelectionChange(ids);
                      }}
                      placeholder="Select Hotels..."
                      closeMenuOnSelect={false}
                      classNamePrefix="react-select"
                      isClearable
                      formatOptionLabel={(option) => (
                        <div>
                          <span>{option.hotel_name}</span>
                        </div>
                      )}
                      getOptionValue={(option) => option.hospitality_hotel_id}
                      id="select_hotels_filter-rfq_list-arc_committee_page"
                    />
                  </div>
                )}
                <div className="py-2">
                    <label>Select Project</label>
                    <Select
                        options={projects}
                        onChange={(selectedOption) => setSelectedProject(selectedOption?.value ? selectedOption.value : -1)}
                        value={selectedProject && selectedProject !== -1 ? projects.find(p => p.value === selectedProject) : null}
                        name="project_id"
                        placeholder="Select"
                        isClearable
                        id="select_project_filter-rfq_list-arc_committee_page"
                    />
                </div>
                {/* ARC is only for tenders - no need for filter */}
                <Alert variant="info" className="mt-2" style={{ fontSize: "12px" }}>
                  <strong>Note:</strong> ARC approvals are only applicable for tenders.
                </Alert>

                {!loading && rfqList.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No RFQs yet!</p>
                ) : (
                  <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {rfqList.map((item) => {
                      const rfqId = item.rfq_id || item.id;
                      return (
                      <li
                        className={rfqId === currentRfq?.id ? "active" : ""}
                        key={`rfq_no_${item.rfq_no}-${item.rfq_product_id || ''}`}
                      >
                        <Link
                          href={`/dashboard/buyer/arc-committee?rfq_id=${rfqId}`}
                          className={
                            rfqId === currentRfq?.id ? "text-white" : "text-dark"
                          }
                          id={`rfq_${item.rfq_no}-rfq_list-arc_committee_page`}
                        >
                          {formatRFQNumber(item.rfq_no, item.is_tender)}
                          {item.project_name && item.project_name != "" &&
                            <b className="d-block fw-semibold" style={{ fontSize: "14px" }}>
                              {item.project_name}
                            </b>}
                          {item.product_name && (
                            <div className="mt-1" style={{ fontSize: "12px", opacity: 0.9 }}>
                              <Badge bg="info" style={{ fontSize: "10px" }}>
                                {item.product_name}
                              </Badge>
                              {item.approval_status && (
                                <Badge 
                                  bg={item.approval_status === 'PENDING' ? 'warning' : item.approval_status === 'APPROVED' ? 'success' : 'secondary'} 
                                  className="ms-1"
                                  style={{ fontSize: "10px" }}
                                >
                                  {item.approval_status}
                                </Badge>
                              )}
                            </div>
                          )}
                        </Link>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Main Container */}
            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">
              {!rfq_id ? (
                <Alert variant="info">Please select an RFQ from the list to view details</Alert>
              ) : lifecycleData ? (
                <div>
                  {/* Action Buttons */}
                  {lifecycleData?.arcApproval?.pending && (
                    <div className="card mb-4 border-primary">
                      <div className="card-body">
                        <div className="d-flex gap-2 flex-wrap align-items-center">
                          {selectedProductId && (
                            <Alert variant="info" className="mb-0 me-auto">
                              Reviewing ARC for selected product
                            </Alert>
                          )}
                          <Button
                            variant="success"
                            onClick={() => handleAction('approve')}
                            disabled={submitting}
                          >
                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleAction('reject')}
                            disabled={submitting}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                            Reject
                          </Button>
                          <Button
                            variant="warning"
                            onClick={() => handleAction('send_to')}
                            disabled={submitting}
                          >
                            <FontAwesomeIcon icon={faArrowRight} className="me-2" />
                            Send To Stage
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Product Selection Info */}
                  {lifecycleData?.arcApproval?.instances && lifecycleData.arcApproval.instances.length > 0 && (
                    <Alert variant="info" className="mb-3">
                      <strong>Note:</strong> ARC approvals are product-wise. Select a product from the table below to review its ARC approval.
                    </Alert>
                  )}

                  {/* Lifecycle Timeline */}
                  {renderLifecycleTimeline()}

                  {/* Tender Details */}
                  {renderTenderDetails()}

                  {/* Products */}
                  {renderProducts()}

                  {/* Initial Quotes */}
                  {renderQuotes()}

                  {/* Technical Evaluation */}
                  {renderTechEvaluation()}

                  {/* Negotiation Rounds */}
                  {renderNegotiationRounds()}

                  {/* Vendor Rankings */}
                  {renderVendorRankings()}
                </div>
              ) : (
                <Alert variant="warning">Loading tender lifecycle data...</Alert>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Modal */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionType === 'approve' && 'Approve Tender'}
            {actionType === 'reject' && 'Reject Tender'}
            {actionType === 'send_to' && 'Send Tender To Stage'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionType === 'send_to' && (
            <Form.Group className="mb-3">
              <Form.Label>Target Stage</Form.Label>
              <Select
                options={lifecycleStages}
                value={lifecycleStages.find(s => s.value === targetStage)}
                onChange={(option) => setTargetStage(option?.value || '')}
                placeholder="Select target stage"
              />
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Remarks {actionType === 'reject' && <span className="text-danger">*</span>}</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              required={actionType === 'reject'}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActionModal(false)}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'approve' ? 'success' : actionType === 'reject' ? 'danger' : 'warning'}
            onClick={handleSubmitAction}
            disabled={submitting || (actionType === 'reject' && !remarks) || (actionType === 'send_to' && !targetStage)}
          >
            {submitting ? 'Processing...' : 'Submit'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ArcCommittee;

