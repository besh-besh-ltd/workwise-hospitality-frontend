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
import { getUserMappings } from "@/services/hospitality";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import useIsMobile from "@/hooks/useIsMobile";
import { BsList } from "react-icons/bs";
import styles from "./PurchaseOrder.module.scss";

const PurchaseOrders = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { rfq, po, edit } = router.query;
  const [loading, setloading] = useState(false);
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
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds: hotelIds,
    departmentId: currentRfqData?.department_id || null,
    enabled: !!currentRfqData,
  });

  const canWrite = canUpdate || canCreate;

  // Fetch RFQ metadata when rfq changes (for permission context)
  useEffect(() => {
    if (!rfq) {
      setCurrentRfqData(null);
      return;
    }
    getRFQById(rfq).then(res => {
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      setCurrentRfqData(data || null);
    }).catch(() => setCurrentRfqData(null));
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

    setloading(true);
    try {
      const value = await getPoData(rfq, { ...poMeta, ...filters });
      if(value) {
        setPOData(value.data);
        setTotalData(value.total);
        setApprovalLevel(value.approval_level);
      }
    } finally {
      setloading(false);
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
      setloading(true);
      if(data.type == 'approval') {
        if(data.decision == 'rejected') {
          openRejectRemarksModal(po_id, data, selectedPO);
          return;
        } else if (data.remarks !== undefined) {
          // Remarks already provided (from merged approve modal) — call API directly
          const res = await handlePOApproval(po_id, { ...data, remarks: data.remarks });
          if (res) { toast.success(res.message); } else { throw new Error("Something went wrong while making a decision, please try again!"); }
          await getPOData();
          if (po) await getPODetails();
          return;
        } else {
          openApproveRemarksModal(po_id, data);
          return;
        }
      } else {
        openGRNUpdateModal(po_id, data, selectedPO);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? 'Something went wrong while making a decision, please try again!')
    } finally {
      setloading(false);
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
      setloading(true);
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
      setloading(false);
      setInitiatePOModal({
        showModal: false,
        selectedPO: null
      })
    }
  }

  const getPODetails = async () => {
    if(!po) return;

    setloading(true);
    try {
      const value = await getPoDetails(po);
      if(value) setPODetails(value);
    } finally {
      setloading(false);
    }
  }

  const handlePOEdit = async (payload) => {
    if(!po) return;

    try {
      setloading(true);
      const response = await updatePODetails(po, payload)
      console.log("PO UPDATE RESPONSE:", response);
    } finally {
      setloading(false);
    }
  }

  const fetchUserHotelMappings = async () => {
    try {
      const response = await getUserMappings();
      const mappings = (response?.data || []).filter(m => m.hospitality_hotel_id != null);
      setUserHotelMappings(mappings);
    } catch (error) {
      console.error("Error fetching user hotel mappings", error);
    }
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
  }, [rfqNo]);

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
                    filter: (item) => !item.po_completed,
                  },
                  {
                    key: 'action_completed',
                    label: 'Completed',
                    filter: (item) => item.po_completed === true,
                  },
                ]}
                defaultTab="action_required"
                rfqNo={rfqNo}
                onRfqNoChange={(val) => setRfqNo(val)}
                searchPlaceholder="Search by number..."
                userHotelMappings={userHotelMappings}
                selectedHotelIds={selectedHotelIds}
                onHotelSelectionChange={(ids) => setSelectedHotelIds(ids)}
                showTypeFilter={false}
                getItemTags={(item, isSelected) => {
                  if (isSelected) return [];
                  const tags = [];
                  if (item.po_completed) {
                    tags.push({ label: 'Completed', variant: 'success' });
                  } else if (item.approval_required) {
                    tags.push({ label: 'Approval Pending', variant: 'warning' });
                  } else {
                    tags.push({ label: 'In Progress', variant: 'info' });
                  }
                  return tags;
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

              {/* Inline loader while verifying permissions */}
              {rfq && permissionsLoading && (
                <div className={styles.emptyState} style={{ minHeight: '300px' }}>
                  <div className={styles.emptyStateIcon} style={{ background: 'rgba(46, 91, 168, 0.08)' }}>
                    <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <h4 className={styles.emptyStateTitle}>Loading Purchase Orders</h4>
                  <p className={styles.emptyStateDesc}>Verifying access permissions...</p>
                </div>
              )}

              {/* Access Denied */}
              {rfq && !permissionsLoading && currentRfqData && !canRead && (
                <AccessDeniedPage
                  title="Access Denied"
                  message="You do not have permission to view Purchase Orders for this RFQ. Contact your administrator to request access."
                  showBackButton={false}
                />
              )}

              {/* Content area */}
              {rfq && !permissionsLoading && canRead && (
                <>
                  {/* Loading state for PO data */}
                  {loading && !poData && !poDetails && (
                    <div className={styles.emptyState} style={{ minHeight: '250px' }}>
                      <div className={styles.emptyStateIcon} style={{ background: 'rgba(46, 91, 168, 0.08)' }}>
                        <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                      <h4 className={styles.emptyStateTitle}>Loading Purchase Orders</h4>
                      <p className={styles.emptyStateDesc}>Fetching data...</p>
                    </div>
                  )}

                  {/* PO Listing */}
                  {!po && poData && (
                    <>
                    {!canWrite && (
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
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}&po=${po_id}`
                        )
                      }
                      onEdit={canWrite ? (po_id) =>
                        router.push(
                          `/dashboard/buyer/purchase-order/?rfq=${rfq}&po=${po_id}&edit=true`
                        ) : undefined
                      }
                      companyUsers={companyUsers}
                      approvalLevel={approvalLevel}
                      canWrite={canWrite}
                      canApprove={canApprove}
                    />
                    </>
                  )}

                  {/* PO Details loading */}
                  {po && !poDetails && loading && (
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
                    {!canWrite && (
                      <ReadOnlyBanner
                        title="View Only Mode"
                        message="You have read-only access to purchase orders. Contact your administrator to request edit permissions."
                      />
                    )}
                    <PurchaseOrderDetails
                      data={poDetails}
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