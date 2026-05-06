import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { getArcRfqList, getTenderLifecycle, performArcAction } from "@/services/arc";
import { getRFQById } from "@/services/rfq";
import { useSelector } from 'react-redux';
import { toast } from "react-toastify";
import Select from 'react-select';
import { Button, Modal, Form, Alert } from 'react-bootstrap';
import { BsList } from "react-icons/bs";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import useIsMobile from "@/hooks/useIsMobile";

// Decision-first redesigned components (replaces the old stepper +
// current-stage card + per-stage Stage* components). See
// docs/superpowers/specs/2026-05-07-arc-committee-review-redesign-design.md
import DecisionBrief from "./DecisionBrief";
import DecisionMatrix from "./DecisionMatrix";
import LifecycleAccordion from "./LifecycleAccordion";
import IterationHistoryPanel from "@/components/dashboard/buyer/tender/IterationHistoryPanel";
import SendBackModal from "@/components/dashboard/buyer/tender/SendBackModal";
import { mapLifecycleToStages, STAGE_DEFINITIONS } from "./utils/stageMapper";
import styles from "./ArcCommittee.module.scss";

const ArcCommittee = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const { rfq_id } = router.query;
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setCurrentRfq] = useState(null);
  const [lifecycleData, setLifecycleData] = useState(null);
  const [isTenderFilter, setIsTenderFilter] = useState(null);
  const [rfqNo, setRfqNo] = useState(null);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // (activeStageKey removed — the new layout has no per-stage drill-in;
  // the lifecycle accordion renders all stages flat.)
  const [refreshing, setRefreshing] = useState(false);

  // Click handler for the shared sidebar — push the rfq_id into the
  // route so the existing useEffect chain (rfq_id → fetchRFQMetadata →
  // permissions verify → loadLifecycleData) fires the same way it did
  // with the old <Link>-based custom sidebar.
  const handleRfqSelect = (id) => {
    router.push(`/dashboard/buyer/arc-committee?rfq_id=${id}`, undefined, { shallow: true });
  };

  // Mapped stage data
  const stageData = useMemo(() => {
    return mapLifecycleToStages(lifecycleData);
  }, [lifecycleData]);

  // Derive Decision Brief inputs from lifecycleData. Pure aggregation,
  // no side effects: total commitment, total saved, count of products
  // priced above last purchase (risk flag), recommendation verdict.
  //
  // BE response nests these under arcApproval (see arcController
  // getTenderLifecycle response shape). Reading them at the top level
  // returned undefined and silently produced an empty matrix.
  const arcEnvelopes = lifecycleData?.arcApproval?.envelopes || [];
  const arcItems = lifecycleData?.arcApproval?.items || [];
  const rfqProducts = lifecycleData?.rfq?.products || [];

  const briefMetrics = useMemo(() => {
    // Quantity lives in product_specs ([{title:'Quantity', value:'150'}, ...])
    // for the productQuery shape that getRfqById returns. Reading
    // rfqProduct.quantity directly is always 0 here, which made the
    // total commitment KPI render as ₹0 even with finalized vendors.
    const qtyOf = (rfqProduct) => {
      const specs = rfqProduct?.product_specs || rfqProduct?.specifications || [];
      if (Array.isArray(specs)) {
        const hit = specs.find((s) => /^quantity$/i.test(String(s?.title || "")));
        if (hit?.value != null) return Number(hit.value) || 0;
      }
      return Number(rfqProduct?.quantity) || 0;
    };
    let totalCommitment = 0;
    let totalLastValue = 0;
    let aboveBaselineCount = 0;
    const productSet = new Set();
    const vendorSet = new Set();
    for (const item of arcItems) {
      const rfqProduct = rfqProducts.find(
        (p) => p.id === item.rfq_product_id || String(p.id) === String(item.rfq_product_id)
      );
      const qty = qtyOf(rfqProduct);
      const unit = Number(item.unit_price) || 0;
      const last = Number(rfqProduct?.last_purchase_price) || 0;
      totalCommitment += unit * qty;
      totalLastValue += last * qty;
      if (last > 0 && unit > last) aboveBaselineCount += 1;
      productSet.add(item.rfq_product_id);
      vendorSet.add(item.vendor_id);
    }
    const totalSaved = totalLastValue - totalCommitment;
    const savingsPercent = totalLastValue > 0 ? (totalSaved / totalLastValue) * 100 : 0;
    return {
      totalCommitment,
      totalSaved,
      savingsPercent,
      productCount: productSet.size,
      vendorCount: vendorSet.size,
      riskFlagCount: aboveBaselineCount,
    };
  }, [arcItems, rfqProducts]);

  const recommendation = useMemo(() => {
    if (arcItems.length === 0) {
      return {
        verdict: "review",
        summary: "No vendors are finalized yet. The committee acts once at least one (product × vendor) line item is in the envelope.",
      };
    }
    if (briefMetrics.riskFlagCount > 0) {
      return {
        verdict: "review",
        summary: `${briefMetrics.riskFlagCount} ${briefMetrics.riskFlagCount === 1 ? "product is" : "products are"} priced above the last purchase. Review the matrix below before approving — consider whether the vendor's terms (lead time, payment) justify the price.`,
      };
    }
    if (briefMetrics.totalSaved > 0) {
      return {
        verdict: "approve",
        summary: `Every finalized line shows savings against the last purchase. No prior PO rejections detected on the chosen vendors. Safe to approve.`,
      };
    }
    return {
      verdict: "review",
      summary: `No clear savings vs the last purchase. Review the matrix line items to confirm pricing, lead time, and payment terms before approving.`,
    };
  }, [arcItems.length, briefMetrics]);

  // Lifecycle stage list for the bottom accordion. Maps the existing
  // stageData into a compact { key, state, performed_by_name, performed_at }
  // shape the LifecycleAccordion expects.
  const lifecycleAccordionStages = useMemo(() => {
    const stages = stageData?.stages || [];
    const normalize = (raw) => {
      const s = (raw || "").toString().toLowerCase();
      if (["completed", "approved", "done"].includes(s)) return "done";
      if (["in_progress", "current", "active"].includes(s)) return "current";
      if (["skipped", "not_configured", "not_applicable"].includes(s)) return "skipped";
      return "pending";
    };
    return stages.map((stage) => ({
      key: stage.key,
      state: stage.key === stageData?.currentStage ? "current" : normalize(stage.status),
      performed_by_name: stage.performedBy || stage.performer_name || null,
      performed_at: stage.performedAt || stage.completedAt || null,
    }));
  }, [stageData]);

  // Deduplicate sidebar list - group by rfq_id so each tender appears
  // once. Also normalises every entry so the shared RFQListSidebar can
  // consume it: items must carry `id` (sidebar keys + selectedRfqId
  // both match on this) and a stable `title`.
  const deduplicatedRfqList = useMemo(() => {
    const seen = new Map();
    for (const item of rfqList) {
      const rfqId = item.rfq_id || item.id;
      if (!seen.has(rfqId)) {
        seen.set(rfqId, {
          ...item,
          id: rfqId,                       // sidebar key
          title: item.project_name || '',  // sidebar's optional second-line title
          _productCount: 1,
        });
      } else {
        const existing = seen.get(rfqId);
        existing._productCount += 1;
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
    fetchUserHotelMappings();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadRfqList();
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [isTenderFilter, rfqNo, selectedHotelIds]);

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

  const fetchUserHotelMappings = () => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(m => m.hospitality_hotel_id != null);
    setUserHotelMappings(mappings);
  };

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);
  };

  const loadRfqList = async () => {
    try {
      setLoading(true);
      // Always pull "all" — the shared sidebar's tab system (Action
      // Required / In Progress / All) replaces the old `showAll`
      // toggle by client-side filtering on `approval_required` +
      // `pending_arc_count`.
      const params = {
        page: 1,
        limit: 100,
        is_tender: isTenderFilter !== null ? (isTenderFilter === '1' || isTenderFilter === 1) : null,
        rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
        module_keys: "arc",
        show_all: 1,
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
    },
    // Phase 3 matrix UI — per-cell action keyed on arc_item_id.
    // Calls the same /arc/tender/:rfq_id/action endpoint but pinpoints
    // the exact (product, vendor) cell rather than the whole product.
    onCellAction: async (arcItemId, action, comment) => {
      try {
        const response = await performArcAction(
          rfq_id,
          action.toLowerCase(), // BE expects 'approve' / 'reject'
          null,                  // target_stage
          comment,                // remarks
          null,                   // rfq_product_id (legacy, unused for cell action)
          null,                   // approval_instance_id (BE resolves from arc_item)
          null,                   // approval_instance_step_id
          lifecycleData?.rfq?.department_id || null,
          arcItemId,
        );
        if (response.status === 1) {
          return { success: true };
        }
        return { success: false, error: response.message || 'Action failed' };
      } catch (error) {
        return { success: false, error: error.message || 'Action failed' };
      }
    },
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

  const isAccessDenied = hasPermissionContext && !permissionsLoading && !canRead;

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
          <div className={styles.layoutRow}>
            {/* Tender List — shared sidebar (matches Tech Eval / QC / PO) */}
            {isMobile && (
              <button
                type="button"
                className={styles.mobileSidebarToggle}
                onClick={() => setSidebarOpen(true)}
              >
                <BsList size={18} /> Select Tender
              </button>
            )}
            <RFQListSidebar
              title="ARC Committee"
              mobileOpen={isMobile ? sidebarOpen : undefined}
              onMobileClose={() => setSidebarOpen(false)}
              rfqList={deduplicatedRfqList}
              loading={loading}
              selectedRfqId={rfq_id || currentRfq?.id}
              onItemClick={handleRfqSelect}
              linkPrefix="/dashboard/buyer/arc-committee"
              linkQueryKey="rfq_id"
              tabs={[
                {
                  key: 'action_required',
                  label: 'Action Required',
                  // Approver is the current user OR there's a pending
                  // committee decision for this tender.
                  filter: (item) => !!item.approval_required || (item.pending_arc_count || 0) > 0,
                },
                {
                  key: 'in_progress',
                  label: 'In Progress',
                  // Pending committee decision but not on this user's plate.
                  filter: (item) => !item.approval_required && (item.pending_arc_count || 0) > 0,
                },
                { key: 'all', label: 'All', filter: null },
              ]}
              defaultTab="action_required"
              rfqNo={rfqNo}
              onRfqNoChange={(val) => setRfqNo(val)}
              searchPlaceholder="Search by tender number..."
              userHotelMappings={userHotelMappings}
              selectedHotelIds={selectedHotelIds}
              onHotelSelectionChange={handleHotelSelectionChange}
              showTypeFilter={false}  // ARC committee is tenders-only by definition.
              getItemTags={(item, isSelected) => {
                const tags = [];
                if (!isSelected && item.approval_required) {
                  tags.push({ label: 'Your Approval Required', variant: 'danger' });
                }
                if ((item._productCount || 0) > 0) {
                  tags.push({
                    label: `${item._productCount} ${item._productCount === 1 ? 'Product' : 'Products'}`,
                    variant: 'info',
                  });
                }
                if ((item.pending_arc_count || 0) > 0) {
                  tags.push({ label: `${item.pending_arc_count} Pending`, variant: 'warning' });
                }
                if (item.approval_status && (item.pending_arc_count || 0) === 0) {
                  if (item.approval_status === 'APPROVED') {
                    tags.push({ label: 'Approved', variant: 'success' });
                  } else if (item.approval_status === 'CANCELLED') {
                    tags.push({ label: 'Sent Back', variant: 'neutral' });
                  } else {
                    tags.push({ label: item.approval_status, variant: 'neutral' });
                  }
                }
                return tags;
              }}
              pageId="arc_committee"
            />

            {/* Main Content */}
            <div className={styles.contentColumn}>
              <div className="quote-sec-table quote-sec-tab">
              {isAccessDenied ? (
                <AccessDeniedPage
                  title="Access Denied"
                  message="You do not have permission to view ARC Committee reviews. Contact your administrator to request access."
                  showBackButton={false}
                />
              ) : !rfq_id ? (
                <Alert variant="info">Please select a Tender from the list to view details</Alert>
              ) : lifecycleData ? (
                <div>
                  {/* Page heading — name of the page + status chip on the right */}
                  <div className={styles.pageHead}>
                    {lifecycleData?.arcApproval?.pending && (
                      <span className={styles.pageStatusChip}>Awaiting your decision</span>
                    )}
                  </div>

                  {/* Iteration history — only when this tender has
                      been sent back at least once. Renders above the
                      brief so the CXO sees prior decisions before
                      committing to a fresh one. */}
                  {lifecycleData?.rfq?.is_tender === 1 && (
                    <IterationHistoryPanel
                      rfqId={lifecycleData?.rfq?.id || rfq_id}
                      currentIteration={lifecycleData?.rfq?.iteration_number}
                    />
                  )}

                  {/* 1. Decision Brief — verdict + savings + scope */}
                  <DecisionBrief
                    rfq={lifecycleData?.rfq}
                    metrics={briefMetrics}
                    recommendation={recommendation}
                    hotelCount={
                      // Group ARC tenders carry the full coverage list
                      // in rfq.hotels (added by the lifecycle endpoint
                      // from tbl_rfq_hotel_mappings). For Single ARC
                      // tenders rfq.hotel_id is the only hotel. The
                      // legacy `hotel_id ? 1 : 0` fallback misreported
                      // Group ARC as 1 hotel even when 3 were mapped.
                      Number(lifecycleData?.rfq?.hotel_count) ||
                      (Array.isArray(lifecycleData?.rfq?.hotels) ? lifecycleData.rfq.hotels.length : 0) ||
                      (lifecycleData?.rfq?.tender_scope === 'GROUP' ? 0 : (lifecycleData?.rfq?.hotel_id ? 1 : 0))
                    }
                  />

                  {/* 2. Decision Matrix — products × vendors with
                      per-cell approve/reject. Bulk Approve all in
                      the matrix header. */}
                  <DecisionMatrix
                    rfq={lifecycleData?.rfq}
                    arcEnvelopes={arcEnvelopes}
                    arcItems={arcItems}
                    rfqProducts={rfqProducts}
                    arcHandlers={arcHandlers}
                    onAfterAction={handleRefresh}
                  />

                  {/* 3. Lifecycle accordion — collapsed audit trail */}
                  <LifecycleAccordion
                    stages={lifecycleAccordionStages}
                    rfq={lifecycleData?.rfq}
                  />

                  {/* Advanced Actions — send-back when an approval is
                      genuinely pending. Kept simple so the primary
                      "approve / reject in matrix" stays the dominant
                      affordance. */}
                  {lifecycleData?.arcApproval?.pending && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                      <button
                        type="button"
                        onClick={() => setSendBackOpen(true)}
                        disabled={submitting}
                        style={{
                          background: 'transparent',
                          border: '1px solid #f59e0b',
                          color: '#92400e',
                          padding: '8px 16px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.6 : 1,
                        }}
                      >
                        ↺ Send tender back to an earlier stage
                      </button>
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

      {/* Phase 3.5: bespoke send-back modal that calls the new
          tenderSendbackService via the existing performArcAction
          (action='send_to'). Captures the required ≥30-char reason
          and the target stage. On success, refreshes the lifecycle
          so the IterationHistoryPanel picks up the new entry. */}
      <SendBackModal
        isOpen={sendBackOpen}
        fromStage="ARC"
        targetOptions={[
          // Per product team: only two business-sensible targets.
          // VENDOR_FINALIZATION clears the ARC envelope + finalization
          // rows so the buyer re-picks vendors against the existing
          // negotiation/quote data. TECHNICAL_EVALUATION additionally
          // wipes negotiation rounds + tech-eval marks so the
          // evaluator re-runs everything. Vendor quotes are kept in
          // both cases — vendors don't re-submit.
          { value: 'VENDOR_FINALIZATION',  label: 'Vendor Finalization (de-finalize vendors)' },
          { value: 'TECHNICAL_EVALUATION', label: 'Technical Evaluation (clear evaluation, then re-finalize)' },
        ]}
        onClose={() => setSendBackOpen(false)}
        onSubmit={async (target_stage, reason) => {
          try {
            const response = await performArcAction(
              rfq_id,
              'send_to',
              target_stage,
              reason,
              null,
              null,
              null,
              lifecycleData?.rfq?.department_id || null
            );
            if (response.status === 1) {
              toast.success(response.message || 'Tender sent back successfully.');
              setSendBackOpen(false);
              loadLifecycleData(true);
            } else {
              toast.error(response.message || 'Failed to send tender back');
            }
          } catch (error) {
            toast.error(error.message || 'Failed to send tender back');
          }
        }}
      />
    </>
  );
};

export default ArcCommittee;
