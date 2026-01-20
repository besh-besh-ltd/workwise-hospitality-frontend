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
import {
  BsCheckCircleFill,
  BsArrowRight,
  BsClockFill,
  BsFileEarmarkText,
  BsPeopleFill,
  BsHammer,
  BsExclamationCircleFill,
  BsFileBreak
} from "react-icons/bs";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ApprovalPendingBanner from "@/components/dashboard/buyer/approval/ApprovalPendingBanner";
import ApprovalWorkflowSection from "@/components/dashboard/buyer/approval/ApprovalWorkflowSection";
import { MdClose } from "react-icons/md";

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
    { value: 'CREATED', label: 'Tender Created' },
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
      console.error('Error loading Tender list:', error);
      toast.error('Failed to load Tender list');
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

  const handleAction = () => {
    setShowActionModal(true);
    setRemarks('');
    setTargetStage('');
  };

  const handleSubmitAction = async () => {
    if (!targetStage) {
      toast.error('Please select a target stage');
      return;
    }

    try {
      setSubmitting(true);

      const response = await performArcAction(
        rfq_id,
        'send_to',
        targetStage,
        remarks || null,
        selectedProductId || null,
        null,
        null,
        lifecycleData?.rfq?.department_id || null
      );

      if (response.status === 1) {
        toast.success(response.message || 'Tender sent to stage successfully');
        setShowActionModal(false);
        setSelectedProductId(null);
        loadLifecycleData();
      } else {
        toast.error(response.message || 'Failed to send tender to stage');
      }
    } catch (error) {
      console.error('Error sending tender to stage:', error);
      toast.error(error.message || 'Failed to send tender to stage');
    } finally {
      setSubmitting(false);
    }
  };

  // Custom handlers for ARC approval using ARC-specific APIs
  const handleArcApprove = async (comment, context = {}) => {
    try {
      const response = await performArcAction(
        rfq_id,
        'approve',
        null,
        comment || null,
        selectedProductId,
        context.approval_instance_id || null,
        context.approval_instance_step_id || null,
        lifecycleData?.rfq?.department_id || null
      );

      if (response.status === 1) {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to approve ARC' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to approve ARC' };
    }
  };

  const handleArcReject = async (comment, context = {}) => {
    try {
      const response = await performArcAction(
        rfq_id,
        'reject',
        null,
        comment,
        selectedProductId,
        context.approval_instance_id || null,
        context.approval_instance_step_id || null,
        lifecycleData?.rfq?.department_id || null
      );

      if (response.status === 1) {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to reject ARC' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to reject ARC' };
    }
  };

  const handleApprovalComplete = () => {
    loadLifecycleData();
    setSelectedProductId(null);
  };

  // Get selected product name for display
  const getSelectedProductName = () => {
    if (!selectedProductId || !lifecycleData?.rfq?.products) return '';
    const product = lifecycleData.rfq.products.find(p => p.id === selectedProductId);
    return product?.product_details?.[0]?.name || `Product ${selectedProductId}`;
  };

  // Compact tender summary at top
  const renderTenderSummary = () => {
    const rfq = lifecycleData?.rfq;
    if (!rfq) return null;

    return (
      <div className="d-flex flex-wrap gap-3 mb-4 p-3 bg-light rounded align-items-center">
        <span><strong>Tender:</strong> #{rfq.rfq_no}</span>
        <span className="text-muted">|</span>
        <span><strong>Company:</strong> {rfq.company_name}</span>
        <span className="text-muted">|</span>
        <span><strong>Bid End:</strong> {moment(rfq.bid_end_date).format('DD/MM/YYYY')}</span>
        <Badge bg={rfq.status === 1 ? 'success' : 'secondary'} className="ms-auto">
          {rfq.status === 1 ? 'Open' : 'Closed'}
        </Badge>
      </div>
    );
  };

  // Prominent product selection with inline approval workflow
  const renderPendingArcProducts = () => {
    const instances = lifecycleData?.arcApproval?.instances || [];

    // Get products that have ARC instances (both pending and approved)
    const productsWithArc = lifecycleData?.rfq?.products?.filter(product => {
      return instances.some(inst =>
        (inst.metadata?.rfq_product_id || inst.entity_id) === product.id
      );
    }) || [];

    if (productsWithArc.length === 0) {
      return null;
    }

    // Helper to get ARC instance for a product
    const getProductArcInstance = (productId) => {
      return instances.find(inst =>
        (inst.metadata?.rfq_product_id || inst.entity_id) === productId
      );
    };

    // Separate pending and approved products
    const pendingProducts = productsWithArc.filter(p => getProductArcInstance(p.id)?.status === 'PENDING');
    const approvedProducts = productsWithArc.filter(p => getProductArcInstance(p.id)?.status === 'APPROVED');

    return (
      <div className="mb-4">
        {/* Pending Products Section */}
        {pendingProducts.length > 0 && (
          <>
            <h5 className="mb-3">
              <BsExclamationCircleFill className="me-2 text-warning" />
              Products Requiring ARC Approval
            </h5>
            <div className="row g-3 mb-4">
              {pendingProducts.map(product => {
                const isSelected = selectedProductId === product.id;
                const productName = product.product_details?.[0]?.name || 'N/A';
                const specs = product.product_specs || [];
                const qty = specs.find(s => s.title === 'Quantity')?.value || '-';
                const unit = specs.find(s => s.title === 'Unit')?.value || '';

                return (
                  <div key={product.id} className="col-md-4">
                    <div
                      className={`card h-100 ${isSelected ? 'border-primary border-2 shadow' : 'border'}`}
                      onClick={() => setSelectedProductId(isSelected ? null : product.id)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <div className="card-body">
                        <h6 className="card-title mb-2">{productName}</h6>
                        <div className="text-muted small mb-2">Qty: {qty} {unit}</div>
                        <Badge bg="warning" text="dark">Pending Approval</Badge>
                      </div>
                      {isSelected && (
                        <div className="card-footer bg-primary text-white text-center py-2">
                          <small>✓ Selected for Review</small>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Inline Approval Workflow when product is selected */}
        {selectedProductId && (
          <div className="mb-4 p-4 bg-light rounded border">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                Reviewing: <strong>{getSelectedProductName()}</strong>
              </h6>
              <Button
                variant="outline-secondary"
                size="sm"
                className="p-2"
                onClick={() => setSelectedProductId(null)}
              >
                <MdClose size={18}/> Close
              </Button>
            </div>
            <ApprovalPendingBanner
              entityType="ARC"
              entityId={selectedProductId}
              entityLabel="ARC Approval"
            />
            <ApprovalWorkflowSection
              entityType="ARC"
              entityId={selectedProductId}
              entityLabel="ARC Approval"
              hospitalityCompanyId={lifecycleData?.rfq?.hospitality_company_id}
              hotelId={lifecycleData?.rfq?.hotel_id}
              onCustomApprove={handleArcApprove}
              onCustomReject={handleArcReject}
              onActionComplete={handleApprovalComplete}
            />
          </div>
        )}

        {/* Approved Products Section */}
        {approvedProducts.length > 0 && (
          <>
            <h5 className="mb-3">
              <BsCheckCircleFill className="me-2 text-success" />
              Approved Products
            </h5>
            <div className="row g-3">
              {approvedProducts.map(product => {
                const productName = product.product_details?.[0]?.name || 'N/A';
                const specs = product.product_specs || [];
                const qty = specs.find(s => s.title === 'Quantity')?.value || '-';
                const unit = specs.find(s => s.title === 'Unit')?.value || '';
                const arcInstance = getProductArcInstance(product.id);
                const documentUrl = arcInstance?.metadata?.award_document_url;

                return (
                  <div key={product.id} className="col-md-4">
                    <div className="card h-100 border-success">
                      <div className="card-body">
                        <h6 className="card-title mb-2">{productName}</h6>
                        <div className="text-muted small mb-2">Qty: {qty} {unit}</div>
                        <Badge bg="success">Approved</Badge>
                      </div>
                      {documentUrl && (
                        <div className="card-footer bg-transparent">
                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-dark btn-sm w-100 p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BsFileBreak className="me-2" />
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderLifecycleTimeline = () => {
    if (!lifecycleData?.lifecycleHistory) return null;

    const history = lifecycleData.lifecycleHistory;
    const stages = [
      { stage: 'CREATED', label: 'Tender Created', icon: BsFileEarmarkText },
      { stage: 'SUBMITTED', label: 'Submitted for Approval', icon: BsClockFill },
      { stage: 'PUBLISHED', label: 'Published', icon: BsCheckCircleFill },
      { stage: 'TECH_EVAL_STARTED', label: 'Technical Evaluation Started', icon: BsPeopleFill },
      { stage: 'TECH_EVAL_COMPLETED', label: 'Technical Evaluation Completed', icon: BsCheckCircleFill },
      { stage: 'QUOTES_RECEIVED', label: 'Quotes Received', icon: BsFileEarmarkText },
      { stage: 'NEGOTIATION_STARTED', label: 'Negotiation Started', icon: BsHammer },
      { stage: 'VENDOR_FINALIZED', label: 'Vendor Finalized', icon: BsCheckCircleFill },
      { stage: 'FINANCE_APPROVED', label: 'Finance Approved', icon: BsCheckCircleFill },
      { stage: 'ARC_REVIEW', label: 'ARC Review', icon: BsHammer }
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
                      <stage.icon
                        color={isCompleted ? '#28a745' : '#6c757d'}
                        size={14}
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

  // Full tender details for reference accordion (no card wrapper)
  const renderTenderDetailsContent = () => {
    if (!lifecycleData?.rfq) {
      return <Alert variant="info" className="mb-0">No tender details available</Alert>;
    }
    const rfq = lifecycleData.rfq;

    return (
      <div className="row">
        <div className="col-md-6">
          <p className="mb-2"><strong>Tender No:</strong> {rfq.rfq_no}</p>
          <p className="mb-2"><strong>Company:</strong> {rfq.company_name}</p>
          <p className="mb-2"><strong>Contact Person:</strong> {rfq.contact_name}</p>
          <p className="mb-2"><strong>Email:</strong> {rfq.response_email}</p>
          <p className="mb-2"><strong>Contact Number:</strong> {rfq.contact_number}</p>
        </div>
        <div className="col-md-6">
          <p className="mb-2"><strong>Type:</strong> {rfq.is_tender === 1 ? 'Tender' : 'RFQ'}</p>
          <p className="mb-2"><strong>Bid End Date:</strong> {moment(rfq.bid_end_date).format('DD/MM/YYYY')}</p>
          <p className="mb-2"><strong>Location:</strong> {rfq.location || 'N/A'}</p>
          <p className="mb-2">
            <strong>Status:</strong>
            <Badge bg={rfq.status === 1 ? 'success' : 'secondary'} className="ms-2">
              {rfq.status === 1 ? 'Open' : 'Closed'}
            </Badge>
          </p>
        </div>
        {rfq.comment && (
          <div className="col-12 mt-2">
            <strong>Comments:</strong>
            <p className="text-muted mb-0">{rfq.comment}</p>
          </div>
        )}
      </div>
    );
  };

  // All products table for reference section (no card wrapper)
  const renderProductsTable = () => {
    if (!lifecycleData?.rfq?.products) {
      return <Alert variant="info" className="mb-0">No products available</Alert>;
    }

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
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Size</th>
            <th>Spec</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>ARC Status</th>
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

            return (
              <tr key={product.id}>
                <td>{product.product_details?.[0]?.name || 'N/A'}</td>
                <td>{size}</td>
                <td>{spec}</td>
                <td>{qty}</td>
                <td>{unit}</td>
                <td>
                  {pendingArc ? (
                    <Badge bg="warning" text="dark">Pending</Badge>
                  ) : approvedArc ? (
                    <Badge bg="success">Approved</Badge>
                  ) : (
                    <Badge bg="secondary">No ARC</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  // Simplified quotes summary (no inner accordion)
  const renderQuotesSummary = () => {
    if (!lifecycleData?.quotes || lifecycleData.quotes.length === 0) {
      return <Alert variant="info" className="mb-0">No quotes received yet</Alert>;
    }

    return (
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Email</th>
            <th>Items</th>
            <th>Submitted</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {lifecycleData.quotes.map((quote) => (
            <tr key={quote.id}>
              <td><strong>{quote.vendor_name || quote.organization_name || 'Unknown'}</strong></td>
              <td>{quote.vendor_email || 'N/A'}</td>
              <td>{quote.quote_items?.length || 0} items</td>
              <td>{moment(quote.created_at).format('DD/MM/YYYY')}</td>
              <td>
                <Badge bg={quote.status === 1 ? 'success' : 'secondary'}>
                  {quote.status === 1 ? 'Active' : 'Inactive'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  // Simplified tech evaluation summary (no inner accordion)
  const renderTechEvalSummary = () => {
    if (!lifecycleData?.techEvaluation || lifecycleData.techEvaluation.length === 0) {
      return <Alert variant="info" className="mb-0">No technical evaluation data available</Alert>;
    }

    // Flatten all vendor evaluations into a single table
    const allEvaluations = lifecycleData.techEvaluation.flatMap(techEval =>
      (techEval.vendor_evaluations || []).map(v => ({
        ...v,
        productId: techEval.rfq_product_id
      }))
    );

    if (allEvaluations.length === 0) {
      return <Alert variant="info" className="mb-0">No vendor evaluations recorded</Alert>;
    }

    return (
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Score</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {allEvaluations.map((item, idx) => (
            <tr key={idx}>
              <td>{item.productId}</td>
              <td>{item.vendor_name}</td>
              <td>
                <Badge bg={item.is_accepted ? 'success' : 'danger'}>
                  {item.is_accepted ? 'Accepted' : 'Rejected'}
                </Badge>
              </td>
              <td>{item.score || 'N/A'}</td>
              <td>{item.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  // Simplified negotiation summary (no inner accordion)
  const renderNegotiationSummary = () => {
    if (!lifecycleData?.negotiationRounds || lifecycleData.negotiationRounds.length === 0) {
      return <Alert variant="info" className="mb-0">No negotiation rounds conducted</Alert>;
    }

    return (
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Round</th>
            <th>Target Price</th>
            <th>End Date</th>
            <th>Quotes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {lifecycleData.negotiationRounds.map((round) => (
            <tr key={round.id}>
              <td><strong>Round {round.round_number}</strong></td>
              <td>₹{parseFloat(round.target_price || 0).toLocaleString()}</td>
              <td>{moment(round.end_date).format('DD/MM/YYYY')}</td>
              <td>{round.quotes?.length || 0} vendors</td>
              <td>
                <Badge bg={round.status === 'ACTIVE' ? 'success' : round.status === 'PENDING_APPROVAL' ? 'warning' : 'secondary'}>
                  {round.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  // Simplified vendor rankings (no card wrapper)
  const renderVendorRankingsSummary = () => {
    if (!lifecycleData?.vendorRankings || Object.keys(lifecycleData.vendorRankings).length === 0) {
      return <Alert variant="info" className="mb-0">No vendor finalization data available</Alert>;
    }

    // Flatten all rankings into a single table
    const allRankings = Object.entries(lifecycleData.vendorRankings).flatMap(([productKey, rankings]) =>
      rankings.map((r, idx) => ({
        ...r,
        productKey,
        rank: idx + 1
      }))
    );

    return (
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Product</th>
            <th>Rank</th>
            <th>Vendor</th>
            <th>Quoted Price</th>
            <th>Finalized At</th>
          </tr>
        </thead>
        <tbody>
          {allRankings.map((ranking, idx) => (
            <tr key={idx}>
              <td>{ranking.productKey}</td>
              <td><strong>L{ranking.rank}</strong></td>
              <td>{ranking.vendor_name || ranking.organization_name || 'N/A'}</td>
              <td>₹{parseFloat(ranking.quoted_price || 0).toLocaleString()}</td>
              <td>{moment(ranking.created_at).format('DD/MM/YYYY')}</td>
            </tr>
          ))}
        </tbody>
      </Table>
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
        backLabel="Back to Tender / RFQ Management"
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
            {/* Tender List */}
            <div className="col-md-2">
              <div className="hasFullLoader">
                <h5 className="title">List Of Tenders</h5>

                {loading && <FullLoader />}

                <div className="py-1">
                    <label>Search Tender No.</label>
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
                  <p style={{ textAlign: "center" }}>No Tenders yet!</p>
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
                <Alert variant="info">Please select a Tender from the list to view details</Alert>
              ) : lifecycleData ? (
                <div>
                  {/* 1. Compact Tender Summary */}
                  {renderTenderSummary()}

                  {/* 2. Prominent: Products Requiring Approval (with inline workflow) */}
                  {renderPendingArcProducts()}

                  {/* 3. Reference Data - Single accordion with all items */}
                  <Accordion className="mb-4">
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>Full Tender Details</Accordion.Header>
                      <Accordion.Body>
                        {renderTenderDetailsContent()}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="1">
                      <Accordion.Header>All Product Details</Accordion.Header>
                      <Accordion.Body>
                        {renderProductsTable()}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="2">
                      <Accordion.Header>Lifecycle Timeline</Accordion.Header>
                      <Accordion.Body>
                        {renderLifecycleTimeline()}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="3">
                      <Accordion.Header>Quote Summary ({lifecycleData?.quotes?.length || 0})</Accordion.Header>
                      <Accordion.Body>
                        {renderQuotesSummary()}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="4">
                      <Accordion.Header>Technical Evaluation</Accordion.Header>
                      <Accordion.Body>
                        {renderTechEvalSummary()}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="5">
                      <Accordion.Header>Negotiation Rounds ({lifecycleData?.negotiationRounds?.length || 0})</Accordion.Header>
                      <Accordion.Body>
                        {renderNegotiationSummary()}
                      </Accordion.Body>
                    </Accordion.Item>
                    <Accordion.Item eventKey="6">
                      <Accordion.Header>Vendor Rankings (L1-L5)</Accordion.Header>
                      <Accordion.Body>
                        {renderVendorRankingsSummary()}
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>

                  {/* 4. Secondary Action - Send To Stage */}
                  {lifecycleData?.arcApproval?.pending && (
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="text-muted mb-2">Advanced Actions</h6>
                      <Button
                        variant="outline-secondary"
                        className="p-2"
                        onClick={handleAction}
                        disabled={submitting}
                      >
                        <BsArrowRight className="me-2" />
                        Send To Stage
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Alert variant="warning">Loading tender lifecycle data...</Alert>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Send To Stage Modal */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Send Tender To Stage</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Target Stage</Form.Label>
            <Select
              options={lifecycleStages}
              value={lifecycleStages.find(s => s.value === targetStage)}
              onChange={(option) => setTargetStage(option?.value || '')}
              placeholder="Select target stage"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks (optional)..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActionModal(false)}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleSubmitAction}
            disabled={submitting || !targetStage}
          >
            {submitting ? 'Processing...' : 'Send To Stage'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ArcCommittee;

