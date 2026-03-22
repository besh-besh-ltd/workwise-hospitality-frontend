import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getArcRfqList, getTenderLifecycle, performArcAction } from "@/services/arc";
import { getRFQById } from "@/services/rfq";
import { getAllProjects as getAllProjectsService } from '@/services/project';
import { getUserMappings } from '@/services/hospitality';
import { formatRFQNumber } from "@/utils/sharedFunctions";
import { toast } from "react-toastify";
import FullLoader from "@/components/shared/FullLoader";
import Select from 'react-select';
import moment from 'moment';
import { Badge, Button, Modal, Form, Alert } from 'react-bootstrap';
import { BsArrowRight } from "react-icons/bs";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";

// New flow-based components
import TenderJourneyStepper from "./TenderJourneyStepper";
import CurrentStageSection from "./CurrentStageSection";
import StageTimeline from "./StageTimeline";
import { mapLifecycleToStages, STAGE_DEFINITIONS } from "./utils/stageMapper";

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
  const [activeStageKey, setActiveStageKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Mapped stage data
  const stageData = useMemo(() => {
    return mapLifecycleToStages(lifecycleData);
  }, [lifecycleData]);

  // Deduplicate sidebar list - group by rfq_id so each tender appears once
  const deduplicatedRfqList = useMemo(() => {
    const seen = new Map();
    for (const item of rfqList) {
      const rfqId = item.rfq_id || item.id;
      if (!seen.has(rfqId)) {
        seen.set(rfqId, { ...item, _productCount: 1 });
      } else {
        const existing = seen.get(rfqId);
        existing._productCount += 1;
        // Keep the most urgent status (PENDING > APPROVED > CANCELLED)
        if (item.approval_required && !existing.approval_required) {
          existing.approval_required = true;
        }
        if (item.approval_status === 'PENDING' && existing.approval_status !== 'PENDING') {
          existing.approval_status = 'PENDING';
        }
      }
    }
    return Array.from(seen.values());
  }, [rfqList]);

  // Extract hotel IDs for permission checks
  const hotelIds = useMemo(() => {
    if (lifecycleData?.rfq) {
      const rfq = lifecycleData.rfq;
      if (rfq.hotel_id !== undefined && rfq.hotel_id !== null) {
        return [rfq.hotel_id];
      }
      if (rfq.hospitality_hotel_id !== undefined && rfq.hospitality_hotel_id !== null) {
        return [rfq.hospitality_hotel_id];
      }
    }
    if (currentRfq?.hotel_id !== undefined && currentRfq?.hotel_id !== null) {
      return [currentRfq.hotel_id];
    }
    if (userHotelMappings && userHotelMappings.length > 0) {
      return userHotelMappings.map(h => h.hospitality_hotel_id).filter(id => id !== undefined && id !== null);
    }
    return [];
  }, [lifecycleData, currentRfq, userHotelMappings]);

  // Permission hook for ARC Committee module
  const {
    canRead,
    canUpdate,
    canCreate,
    canApprove,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds: hotelIds,
    enabled: hotelIds.length > 0,
  });

  // Track if we've verified permissions for the current RFQ
  const [permissionsVerified, setPermissionsVerified] = useState(false);

  const lifecycleStages = STAGE_DEFINITIONS.map(s => ({
    value: s.key,
    label: s.label
  }));

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
  }, [selectedProject, isTenderFilter, rfqNo, selectedHotelIds, showAll]);

  // Stage 1: Fetch RFQ metadata for permission context when rfq_id changes
  useEffect(() => {
    const fetchRFQMetadata = async () => {
      if (!rfq_id) {
        setCurrentRfq(null);
        setLifecycleData(null);
        setPermissionsVerified(false);
        return;
      }

      try {
        setLoading(true);
        const rfqDetailsRes = await getRFQById(rfq_id);
        const selectedRfq = Array.isArray(rfqDetailsRes.data) ? rfqDetailsRes.data[0] : rfqDetailsRes.data;

        if (selectedRfq) {
          setCurrentRfq({
            id: selectedRfq.id,
            rfq_no: selectedRfq.rfq_no,
            is_tender: selectedRfq.is_tender,
            project_name: selectedRfq.project_name || '',
            hotel_id: selectedRfq.hotel_id,
            hospitality_hotel_id: selectedRfq.hospitality_hotel_id
          });
        }
        setPermissionsVerified(false); // Reset when RFQ changes
      } catch (error) {
        console.error('Error fetching RFQ metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRFQMetadata();
  }, [rfq_id]);

  // Stage 2: Fetch full lifecycle data only after permissions are verified
  useEffect(() => {
    if (rfq_id && currentRfq && !permissionsLoading && canRead && !permissionsVerified) {
      loadLifecycleData();
      setPermissionsVerified(true);
    }
  }, [rfq_id, currentRfq, permissionsLoading, canRead, permissionsVerified]);

  // Set initial active stage when lifecycle data loads
  useEffect(() => {
    if (stageData.currentStage) {
      setActiveStageKey(stageData.currentStage);
    }
  }, [stageData.currentStage]);

  const getAllProjects = () => {
    getAllProjectsService()
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
      const mappings = (response?.data || []).filter(m => m.hospitality_hotel_id != null);
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
    }
  };

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);

    if (!hotelIds || hotelIds.length === 0) {
      setProjects(allProjects);
    } else {
      const filtered = allProjects.filter(p => hotelIds.includes(p.hotel_id));
      setProjects(filtered);
    }

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
        rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
        module_keys: "arc",
        show_all: showAll ? 1 : 0
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

  const loadLifecycleData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await getTenderLifecycle(rfq_id);
      if (response.status === 1) {
        setLifecycleData(response.data);
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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadLifecycleData(true);
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
        null,
        null,
        null,
        lifecycleData?.rfq?.department_id || null
      );

      if (response.status === 1) {
        toast.success(response.message || 'Tender sent to stage successfully');
        setShowActionModal(false);
        loadLifecycleData(true);
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

  // ARC handlers for product-level approval
  const arcHandlers = {
    onApprove: async (productId, comment, context = {}) => {
      try {
        const response = await performArcAction(
          rfq_id,
          'approve',
          null,
          comment || null,
          productId,
          context.approval_instance_id || null,
          context.approval_instance_step_id || null,
          lifecycleData?.rfq?.department_id || null
        );

        if (response.status === 1) {
          loadLifecycleData(true);
          return { success: true };
        } else {
          return { success: false, error: response.message || 'Failed to approve ARC' };
        }
      } catch (error) {
        return { success: false, error: error.message || 'Failed to approve ARC' };
      }
    },
    onReject: async (productId, comment, context = {}) => {
      try {
        const response = await performArcAction(
          rfq_id,
          'reject',
          null,
          comment,
          productId,
          context.approval_instance_id || null,
          context.approval_instance_step_id || null,
          lifecycleData?.rfq?.department_id || null
        );

        if (response.status === 1) {
          loadLifecycleData(true);
          return { success: true };
        } else {
          return { success: false, error: response.message || 'Failed to reject ARC' };
        }
      } catch (error) {
        return { success: false, error: error.message || 'Failed to reject ARC' };
      }
    }
  };

  // Handle stepper stage click
  const handleStageClick = (stageKey) => {
    setActiveStageKey(stageKey);
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
        <span><strong>Bid End:</strong> {moment(rfq.bid_end_date).format('DD-MM-YYYY hh:mm A')}</span>
        <Badge bg={rfq.status === 1 ? 'success' : 'secondary'} className="ms-auto">
          {rfq.status === 1 ? 'Open' : 'Closed'}
        </Badge>
      </div>
    );
  };

  // Check permissions
  const hasPermissionContext = hotelIds.length > 0 && !!rfq_id;

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
            {/* Tender List - Sidebar */}
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
                    <label>Select Business Units</label>
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
                      placeholder="Select Business Units..."
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
                <div className="py-2">
                  <Form.Check
                    type="switch"
                    id="show-all-tenders-toggle"
                    label={<span style={{ fontSize: "13px" }}>{showAll ? 'All Tenders' : 'Pending Actions Only'}</span>}
                    checked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                  />
                </div>
                <Alert variant="info" className="mt-2" style={{ fontSize: "12px" }}>
                  <strong>Note:</strong> ARC approvals are only applicable for tenders.
                </Alert>

                {!loading && deduplicatedRfqList.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No Tenders yet!</p>
                ) : (
                  <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {deduplicatedRfqList.map((item) => {
                      const rfqId = item.rfq_id || item.id;
                      const isSelected = rfqId === currentRfq?.id;
                      return (
                      <li
                        className={isSelected ? "active" : ""}
                        key={`rfq_no_${item.rfq_no}`}
                        style={!isSelected && item.approval_required ? { backgroundColor: '#fff3f3', borderLeft: '3px solid #dc3545' } : {}}
                      >
                        <Link
                          href={`/dashboard/buyer/arc-committee?rfq_id=${rfqId}`}
                          className={
                            isSelected ? "text-white" : "text-dark"
                          }
                          id={`rfq_${item.rfq_no}-rfq_list-arc_committee_page`}
                        >
                          <span className="d-flex align-items-center gap-1 flex-wrap">
                            {formatRFQNumber(item.rfq_no, item.is_tender)}
                            {!isSelected && item.approval_required && (
                              <Badge bg="danger" style={{ fontSize: '0.6rem', padding: '2px 5px' }}>Your Approval Required</Badge>
                            )}
                          </span>
                          {item.project_name && item.project_name != "" &&
                            <b className="d-block fw-semibold" style={{ fontSize: "14px" }}>
                              {item.project_name}
                            </b>}
                          <div className="mt-1 d-flex align-items-center gap-1 flex-wrap" style={{ fontSize: "12px", opacity: 0.9 }}>
                            {item._productCount > 0 && (
                              <Badge bg="info" style={{ fontSize: "10px" }}>
                                {item._productCount} {item._productCount === 1 ? 'Product' : 'Products'}
                              </Badge>
                            )}
                            {item.pending_arc_count > 0 && (
                              <Badge bg="warning" text="dark" style={{ fontSize: "10px" }}>
                                {item.pending_arc_count} Pending
                              </Badge>
                            )}
                            {item.approval_status && item.pending_arc_count === 0 && (
                              <Badge
                                bg={
                                  item.approval_status === 'APPROVED' ? 'success' :
                                  item.approval_status === 'CANCELLED' ? 'secondary' :
                                  'secondary'
                                }
                                style={{ fontSize: "10px" }}
                              >
                                {item.approval_status === 'CANCELLED' ? 'SENT BACK' : item.approval_status}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">
              {!rfq_id ? (
                <Alert variant="info">Please select a Tender from the list to view details</Alert>
              ) : lifecycleData ? (
                <div>
                  {/* 1. Compact Tender Summary */}
                  {renderTenderSummary()}

                  {/* 2. Journey Stepper - Visual Progress */}
                  <TenderJourneyStepper
                    stages={stageData.stages}
                    currentStage={stageData.currentStage}
                    onStageClick={handleStageClick}
                    revertHistory={stageData.revertHistory || []}
                    refreshing={refreshing}
                  />

                  {/* 3. Current Stage Section - Prominent Action Area */}
                  <CurrentStageSection
                    currentStage={stageData.currentStage}
                    stages={stageData.stages}
                    rfq={stageData.rfq}
                    lifecycleData={lifecycleData}
                    onRefresh={handleRefresh}
                    arcHandlers={arcHandlers}
                    refreshing={refreshing}
                  />

                  {/* 4. Stage Timeline - Full History */}
                  <StageTimeline
                    stages={stageData.stages}
                    currentStage={stageData.currentStage}
                    rfq={stageData.rfq}
                    lifecycleData={lifecycleData}
                    activeStageKey={activeStageKey}
                    onStageToggle={setActiveStageKey}
                    onRefresh={handleRefresh}
                    arcHandlers={arcHandlers}
                    revertHistory={stageData.revertHistory || []}
                    refreshing={refreshing}
                  />

                  {/* 5. Advanced Actions */}
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
