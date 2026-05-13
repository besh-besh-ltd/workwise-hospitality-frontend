import React, { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import Link from "next/link";
import { getRfqs, getRFQById } from "@/services/rfq";
import { getPoData, getPoDetails, handleMarkGRN, handlePOApproval, handlePOInitialization, updatePODetails } from "@/services/po";
import { useRouter } from "next/router";
import POListing from "./POListing";
import PurchaseOrderDetails from "./PODetails";
import { toast } from "react-toastify";
import { getCompanyUsers } from "@/services/Auth";
import RejectRemarksModal from "./RejectRemarksModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import UpdateGRNModal from "./UpdateGRNModal";
import { Badge, Alert } from "react-bootstrap";
import { BsFileEarmarkText } from "react-icons/bs";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import { useSelector } from "react-redux";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import useIsMobile from "@/hooks/useIsMobile";
import { BsList } from "react-icons/bs";
import styles from "./PurchaseOrder.module.scss";

const PurchaseOrders = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { rfq, po, edit } = router.query;
  const [listLoading, setListLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [rfqMetaLoading, setRfqMetaLoading] = useState(false);
  const [rfqMetaError, setRfqMetaError] = useState(false);
  const [rfqLoading, setRFQLoading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [rfqNo, setRfqNo] = useState(null);
  const [poData, setPOData] = useState(null);
  const [totalData, setTotalData] = useState(0);
  const [approvalLevel, setApprovalLevel] = useState(null);
  const [poDetails, setPODetails] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPODetail, setSelectedPODetail] = useState({
    po_id: null,
    data: null,
    selectedPO: null,
  })
  const [initiatePOModal, setInitiatePOModal] = useState({
    selectedPO: null,
    showModal: false
  });

  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(100);
  const [isEditing, setIsEditing] = useState(edit == 'true')
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [currentRfqData, setCurrentRfqData] = useState(null);

  const [poMeta, setPOMeta] = useState({
    page: 1,
    limit: 10,
  })

  // Permission check for PO module (moduleKey: "awarding")
  const hotelIds = useMemo(() => {
    if (currentRfqData) {
      if (currentRfqData.hotel_id != null) return [currentRfqData.hotel_id];
      if (currentRfqData.hospitality_hotel_id != null) return [currentRfqData.hospitality_hotel_id];
    }
    if (userHotelMappings && userHotelMappings.length > 0) {
      return userHotelMappings.map(h => h.hospitality_hotel_id).filter(Boolean);
    }
    return [];
  }, [currentRfqData, userHotelMappings]);

  const {
    canRead,
    canUpdate,
    canCreate,
    canApprove,
    canRegenerate: rawCanRegenerate,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds: hotelIds,
    departmentId: currentRfqData?.department_id || null,
    enabled: !!currentRfqData,
  });

  // A closed RFQ (status=2) is fully locked — no PO edits, no approval actions
  const isRfqClosed = String(currentRfqData?.status) === '2';
  const rawCanWrite = canUpdate || canCreate;
  const canWrite = rawCanWrite && !isRfqClosed;
  const canRegenerate = rawCanRegenerate && !isRfqClosed;

  // Fetch RFQ metadata when rfq changes (for permission context).
  // rfqMetaLoading must gate the loader, otherwise the panel is blank during
  // this window: useModulePermissions stays disabled until currentRfqData is
  // set, so canRead is false and none of the render branches match.
  useEffect(() => {
    if (!rfq) {
      setCurrentRfqData(null);
      setRfqMetaLoading(false);
      setRfqMetaError(false);
      return;
    }
    setRfqMetaLoading(true);
    setRfqMetaError(false);
    getRFQById(rfq)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setCurrentRfqData(data || null);
        if (!data) setRfqMetaError(true);
      })
      .catch(() => { setCurrentRfqData(null); setRfqMetaError(true); })
      .finally(() => setRfqMetaLoading(false));
  }, [rfq]);

  const fetchCompanyUsers = async () => {
    try {
      const res = await getCompanyUsers();
      setCompanyUsers(res.data);
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? 'Something went wrong while fetching company users!');
    }
  };

  const getAllRFQs = (rfqNumberChange = false) => {
    setRFQLoading(true);
    getRfqs({
      tech_eval: false,
      po: true,
      page,
      limit,
      rfq_no: rfqNo ? parseInt(rfqNo.replace("#", "")) : null,
      sort: "DESC",
      module_keys: "po",
      hotel_id: selectedHotelIds && selectedHotelIds.length > 0 ? selectedHotelIds[0] : null,
    })
      .then((res) => {
        setRFQLoading(false);
        const newData = Array.isArray(res) ? res : [];

        if (rfqNumberChange) {
          setpage(1);
          setlimit(100);
          setmyRFQs(newData);
        } else {
          setmyRFQs((prevRFQs) => {
            const all = [...prevRFQs, ...newData];
            const unique = [];
            const seen = new Set();
            for (const rfq of all) {
              if (!seen.has(rfq.id)) {
                unique.push(rfq);
                seen.add(rfq.id);
              }
            }
            return unique;
          });
        }
      })
      .finally(() => {
        setRFQLoading(false);
      });
  };

  const getPOData = async (filters = {}) => {
    if(!rfq) return;

    const requestedRfq = rfq;
    setListLoading(true);
    try {
      const value = await getPoData(requestedRfq, { ...poMeta, ...filters });
      if (requestedRfq !== rfq) return; // stale — a newer rfq is now selected
      if(value) {
        setPOData(value.data);
        setTotalData(value.total);
        setApprovalLevel(value.approval_level);
      }
    } finally {
      if (requestedRfq === rfq) setListLoading(false);
    }
  };

  const openRejectRemarksModal = (po_id, data, selectedPO) => {
    setSelectedPODetail({
      po_id,
      data,
      selectedPO,
    })
    setShowRejectModal(true);
  }

  const openApproveRemarksModal = (po_id, data) => {
    setSelectedPODetail({
      po_id,
      data,
    })
    setShowApproveModal(true);
  }

  const openGRNUpdateModal = (po_id, data, selectedPO) => {
    setSelectedPODetail({
      po_id,
      data,
      selectedPO,
    })
    setShowGRNModal(true);
  }

  const rejectWithRemarks = async (remarks) => {
    const res = await handlePOApproval(selectedPODetail.po_id, {...selectedPODetail.data, remarks});
    if(res) {
      toast.success(res.message);
    } else {
      throw new Error("Something went wrong while making a decision, please try again!")
    }
    setShowRejectModal(false);
    await getPOData();
    if (po) await getPODetails();
  }

  const approveWithRemarks = async (remarks) => {
    const res = await handlePOApproval(selectedPODetail.po_id, {...selectedPODetail.data, remarks});
    if(res) {
      toast.success(res.message);
    } else {
      throw new Error("Something went wrong while making a decision, please try again!")
    }
    setShowApproveModal(false);
    await getPOData();
    if (po) await getPODetails();
  }

  const handleConfirmGRNUpdate = async (file) => {
    await handleMarkGRN(selectedPODetail.po_id, file);
    toast.success(`GRN Marked for PO #${selectedPODetail.data.po_number}`);
    setShowGRNModal(false);
    await getPOData();
    if (po) await getPODetails();
  }

  const handlePODecision = async (po_id, data, selectedPO) => {
    try {
      if(data.type == 'approval') {
        if (data.remarks !== undefined) {
          const res = await handlePOApproval(po_id, { ...data, remarks: data.remarks });
          const message = res?.data?.message || res?.message || "Purchase order updated successfully!";
          if (!data.silent) {
            toast.success(message);
          }
          await getPOData();
          if (po) await getPODetails();
          return { success: true, message };
        }

        if(data.decision == 'rejected') {
          openRejectRemarksModal(po_id, data, selectedPO);
          return { success: true, deferred: true };
        } else {
          openApproveRemarksModal(po_id, data);
          return { success: true, deferred: true };
        }
      } else {
        openGRNUpdateModal(po_id, data, selectedPO);
        return { success: true, deferred: true };
      }
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || error.message || 'Something went wrong while making a decision, please try again!';
      if (!data?.silent) {
        toast.error(message);
      }
      return { success: false, error: message };
    }
  }

  const handleInitiatePO = async (po_id) => {
   setInitiatePOModal({
    showModal: true,
    selectedPO: po_id,
   }) 
  }

  const confirmInitiatePO = async () => {
    try {
      const res = await handlePOInitialization(initiatePOModal.selectedPO);
      if(res) {
        toast.success(res.message);
      } else {
        throw new Error("Something went wrong while making a decision, please try again!")
      }
      // Refetch both listing and details to reflect the new status
      await getPOData(poMeta);
      if (po) {
        await getPODetails();
      }
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || error.message || 'Something went wrong while making a decision, please try again!'
      toast.error(message)
    } finally {
      setInitiatePOModal({
        showModal: false,
        selectedPO: null
      })
    }
  }

  const getPODetails = async () => {
    if(!po) return;

    const requestedPo = po;
    setDetailsLoading(true);
    try {
      const value = await getPoDetails(requestedPo);
      if (requestedPo !== po) return; // stale — a newer po is now selected
      if(value) setPODetails(value);
    } finally {
      if (requestedPo === po) setDetailsLoading(false);
    }
  }

  const handlePOEdit = async (payload) => {
    if(!po) return;

    const response = await updatePODetails(po, payload)
    console.log("PO UPDATE RESPONSE:", response);
  }

  const fetchUserHotelMappings = () => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(m => m.hospitality_hotel_id != null);
    setUserHotelMappings(mappings);
  };

  useEffect(() => {
    // Clear stale data immediately when RFQ changes
    setPOData(null);
    setPODetails(null);
    setTotalData(0);
    getPOData();
  }, [rfq]);

  useEffect(() => { fetchCompanyUsers(); }, [])

  useEffect(() => {
    // Clear stale PO details when switching POs
    if (po) {
      setPODetails(null);
      getPODetails();
    }
  }, [po]);

  useEffect(() => {
    console.log("EDIT:", edit)
    setIsEditing(edit == 'true')
  }, [edit])

  useEffect(() => {
    const handler = setTimeout(() => {
      getAllRFQs(true);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [rfqNo, selectedHotelIds]);

  useEffect(() => {
      fetchUserHotelMappings();
    }, []);

  return (
    <>
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Purchase Order Management</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className={styles.layoutRow}>
              {isMobile && (
                <button className={styles.mobileSidebarToggle} onClick={() => setSidebarOpen(true)}>
                  <BsList size={18} /> Select RFQ
                </button>
              )}
              <RFQListSidebar
                title="Purchase Orders"
                mobileOpen={isMobile ? sidebarOpen : undefined}
                onMobileClose={() => setSidebarOpen(false)}
                rfqList={myRFQs}
                loading={rfqLoading}
                selectedRfqId={rfq}
                linkPrefix="/dashboard/buyer/purchase-order"
                linkQueryKey="rfq"
                tabs={[
                  {
                    key: 'action_required',
                    label: 'Action Required',
                    filter: (item) => {
                      // Closed RFQs are read-only — only show in All tab
                      if (String(item.status) === '2') return false;
                      if (item.po_completed === true) return false;
                      return item.has_draft_po === true || item.approval_required === true || item.has_po_rejection === true;
                    },
                  },
                  {
                    key: 'in_progress',
                    label: 'In Progress',
                    filter: (item) => {
                      if (String(item.status) === '2') return false;
                      if (item.po_completed === true) return false;
                      if (item.has_draft_po === true || item.approval_required === true) return false;
                      return item.has_pending_po_approval === true;
                    },
                  },
                  { key: 'all', label: 'All', filter: null },
                ]}
                defaultTab="action_required"
                rfqNo={rfqNo}
                onRfqNoChange={(val) => setRfqNo(val)}
                searchPlaceholder="Search by number..."
                userHotelMappings={userHotelMappings}
                selectedHotelIds={selectedHotelIds}
                onHotelSelectionChange={(ids) => setSelectedHotelIds(ids)}
                showTypeFilter={false}
                getItemTags={(item) => {
                  if (String(item.status) === '2') return [{ label: 'Closed', variant: 'danger' }];
                  if (item.po_completed) return [{ label: 'Completed', variant: 'success' }];
                  if (item.has_po_rejection) return [{ label: 'PO Rejected', variant: 'danger' }];
                  if (item.approval_required) return [{ label: 'Approval Pending', variant: 'warning' }];
                  if (item.has_draft_po) return [{ label: 'Draft', variant: 'neutral' }];
                  if (item.has_pending_po_approval) return [{ label: 'In Approval', variant: 'info' }];
                  return [{ label: 'In Progress', variant: 'info' }];
                }}
                pageId="purchase_order"
              />
            <div className={styles.contentColumn}>
              {/* Empty state - no RFQ selected */}
              {!rfq && !permissionsLoading && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <BsFileEarmarkText size={24} />
                  </div>
                  <h4 className={styles.emptyStateTitle}>Select an RFQ to View Purchase Orders</h4>
                  <p className={styles.emptyStateDesc}>
                    Choose an RFQ or Tender from the sidebar to view and manage its purchase orders.
                  </p>
                </div>
              )}

              {/* Unified loader for RFQ metadata + permissions check + data fetch.
                  rfqMetaLoading must be included or the panel goes blank while
                  useModulePermissions is still disabled (canRead=false). */}
              {rfq && !rfqMetaError && (rfqMetaLoading || permissionsLoading || (!permissionsLoading && canRead && (listLoading || detailsLoading) && !poData && !poDetails)) && (
                <div className={styles.emptyState} style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className={styles.emptyStateIcon} style={{ background: 'rgba(46, 91, 168, 0.08)', margin: '0 auto 12px' }}>
                      <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px' }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                    <h4 className={styles.emptyStateTitle}>Loading Purchase Orders</h4>
                    <p className={styles.emptyStateDesc}>
                      {rfqMetaLoading ? 'Loading RFQ details...' : permissionsLoading ? 'Verifying access permissions...' : 'Fetching data...'}
                    </p>
                  </div>
                </div>
              )}

              {/* RFQ metadata fetch failed — otherwise the panel would stay blank forever */}
              {rfq && !rfqMetaLoading && rfqMetaError && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <BsFileEarmarkText size={24} />
                  </div>
                  <h4 className={styles.emptyStateTitle}>Unable to load this RFQ</h4>
                  <p className={styles.emptyStateDesc}>
                    We couldn't fetch details for this RFQ. It may have been removed,
                    or you may not have access. Please pick another from the sidebar.
                  </p>
                </div>
              )}

              {/* Access Denied */}
              {rfq && !rfqMetaLoading && !rfqMetaError && !permissionsLoading && currentRfqData && !canRead && (
                <AccessDeniedPage
                  title="Access Denied"
                  message="You do not have permission to view Purchase Orders for this RFQ. Contact your administrator to request access."
                  showBackButton={false}
                />
              )}

              {/* Content area */}
              {rfq && !rfqMetaLoading && !rfqMetaError && !permissionsLoading && canRead && (
                <>

                  {/* Closed-RFQ Lock Banner — supersedes the read-only banner. Wait for content to load. */}
                  {isRfqClosed && currentRfqData && (poData || poDetails) && (
                    <ReadOnlyBanner
                      variant="danger"
                      title="Purchase Orders Locked"
                      message={`This ${currentRfqData?.is_tender === 1 ? 'tender' : 'RFQ'} has been closed. Editing purchase orders, approvals, and other actions are no longer permitted.`}
                      badgeText={`${currentRfqData?.is_tender === 1 ? 'Tender' : 'RFQ'} Closed`}
                    />
                  )}

                  {/* PO Listing */}
                  {!po && poData && (
                    <>
                    {!rawCanWrite && !isRfqClosed && (
                      <ReadOnlyBanner
                        title="View Only Mode"
                        message="You have read-only access to purchase orders. Contact your administrator to request edit permissions."
                      />
                    )}
                    <POListing
                      poList={poData}
                      totalData={totalData}
                      rfq_id={rfq}
                      refetchPOList={getPOData}
                      handlePODecision={(canWrite || canApprove) ? handlePODecision : undefined}
                      handleInitiatePO={canWrite ? handleInitiatePO : undefined}
                      onSelect={(po_id) =>
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}&po=${po_id}`,
                          undefined,
                          { shallow: true }
                        )
                      }
                      onEdit={canWrite ? (po_id) =>
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}&po=${po_id}&edit=true`,
                          undefined,
                          { shallow: true }
                        ) : undefined
                      }
                      companyUsers={companyUsers}
                      approvalLevel={approvalLevel}
                      canWrite={canWrite}
                      canApprove={canApprove}
                      canRegenerate={canRegenerate}
                    />
                    </>
                  )}

                  {/* PO Details loading */}
                  {po && !poDetails && detailsLoading && (
                    <div className={styles.emptyState} style={{ minHeight: '250px' }}>
                      <div className={styles.emptyStateIcon} style={{ background: 'rgba(46, 91, 168, 0.08)' }}>
                        <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                      <h4 className={styles.emptyStateTitle}>Loading PO Details</h4>
                      <p className={styles.emptyStateDesc}>Fetching purchase order details...</p>
                    </div>
                  )}

                  {/* PO Details */}
                  {po && poDetails && (
                    <>
                    {!rawCanWrite && !isRfqClosed && (
                      <ReadOnlyBanner
                        title="View Only Mode"
                        message="You have read-only access to purchase orders. Contact your administrator to request edit permissions."
                      />
                    )}
                    <PurchaseOrderDetails
                      data={poDetails}
                      currentRfqData={currentRfqData}
                      handlePODecision={(canWrite || canApprove) ? handlePODecision : undefined}
                      refetchPODetails={getPODetails}
                      handleInitiatePO={canWrite ? handleInitiatePO : undefined}
                      handleBack={() => {
                        setPODetails(null);
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}`,
                          null,
                          { shallow: true }
                        );
                      }}
                      companyUsers={companyUsers}
                      isEditing={canWrite ? isEditing : false}
                      setIsEditing={canWrite ? setIsEditing : () => {}}
                      handleUpdatePO={canWrite ? async (payload) => {
                        console.log("PO EDIT PAYLOAD:", payload)
                        await handlePOEdit(payload);
                      } : undefined}
                      canWrite={canWrite}
                      canApprove={canApprove}
                      canRegenerate={canRegenerate}
                    />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <UpdateGRNModal 
        show={showGRNModal} 
        onClose={() => setShowGRNModal(false)} 
        onAction={handleConfirmGRNUpdate}
      />

      <RejectRemarksModal show={showRejectModal} poData={selectedPODetail.selectedPO} onClose={() => setShowRejectModal(false)} onAction={(remarks) => rejectWithRemarks(remarks)}/>
      <RejectRemarksModal type="approve" show={showApproveModal} onClose={() => setShowApproveModal(false)} onAction={(remarks) => approveWithRemarks(remarks)}/>
      <ConfirmationModal
        isOpen={initiatePOModal.showModal}
        onClose={() => setInitiatePOModal({
          showModal: false,
          selectedPO: null
        })}
        onConfirm={confirmInitiatePO}
        title="Initiate this PO"
        description={`Are you sure you want to initiate this PO? Once initiated this action cannot be reversed!`}
        confirmButtonColor="warning"
        confirmButtonText="Initiate PO"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default PurchaseOrders;
