import React, { useEffect, useState } from "react";
import { getRfqs } from "@/services/rfq";
import { getPoData, getPoDetails, handleMarkDispatched, handlePOApproval, handlePOInitialization, handleRaiseInvoice, handleAcceptPO, handleRejectPO } from "@/services/po";
import { useRouter } from "next/router";
import POListing from "./POListing";
import PurchaseOrderDetails from "./PODetails";
import { toast } from "react-toastify";
import { getCompanyUsers } from "@/services/Auth";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import RaiseInvoiceModal from "./RaiseInvoiceModal";
import RFQListSidebar from "@/components/shared/RFQListSidebar";
import { TwoPanelPage } from "@/components/layout/DashboardShell";
import useIsMobile from "@/hooks/useIsMobile";
import { BsFileEarmarkText } from "react-icons/bs";
import styles from "@/components/dashboard/buyer/purchase-order/PurchaseOrder.module.scss";

const OrderBook = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Vendors can view but not edit POs — no `edit` param is consumed here.
  const { rfq, po } = router.query;
  const [loading, setloading] = useState(false);
  const [rfqLoading, setRFQLoading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [rfqNo, setRfqNo] = useState(null);
  const [poData, setPOData] = useState(null);
  const [totalData, setTotalData] = useState(0);
  const [approvalLevel, setApprovalLevel] = useState(null);
  const [poDetails, setPODetails] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false);
  const [showMarkDispatchedModal, setShowMarkDispatchedModal] = useState(false);
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

  const [poMeta, setPOMeta] = useState({
    page: 1,
    limit: 10,
  })

  // Accept/Reject PO state
  const [acceptModal, setAcceptModal] = useState({ show: false, po: null });
  const [rejectModal, setRejectModal] = useState({ show: false, po: null });
  const [rejectionReason, setRejectionReason] = useState('');

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

  const getPOData = (filters = {}) => {
    if(!rfq) return;

    setloading(true);
    getPoData(rfq, { ...poMeta, ...filters }).then(value => {
        if(value) {
          setPOData(value.data);
          setTotalData(value.total);
          setApprovalLevel(value.approval_level);
        }
    }).finally(() => setloading(false));
  };

  const openRaiseInvoiceModal = (po_id, data, selectedPO) => {
    setSelectedPODetail({
      po_id,
      data,
      selectedPO,
    })
    setShowRaiseInvoiceModal(true);
  }

  const handleConfirmRaiseInvoice = async (file) => {
    await handleRaiseInvoice(selectedPODetail.po_id, file);
    toast.success(`Invoice Raised for PO #${selectedPODetail.data.po_number}`);
    setShowRaiseInvoiceModal(false);
    getPOData();
  }

  const markAsDispatched = async (po_id, po_number) => {
    try {
      await handleMarkDispatched(po_id);
      toast.success(`Marked as dispatched for PO #${po_number}`);
      setShowRaiseInvoiceModal(false);
      getPOData();
    } catch (error) {
      toast.warning("Something went wrong while marking this PO as dispatched!") 
    }
  }

  const handlePODecision = async (po_id, data, selectedPO) => {
    try {
      setloading(true);
      if(data.type == 'invoice') {
        openRaiseInvoiceModal(po_id, data, selectedPO);
        return;
      } else {
        await markAsDispatched(po_id, data.po_number);
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
      getPOData(poMeta);
      if(res) {
        toast.success(res.message);
      } else {
        throw new Error("Something went wrong while making a decision, please try again!")
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

  const onAcceptPO = (po) => {
    setAcceptModal({ show: true, po });
  };

  const onRejectPO = (po) => {
    setRejectionReason('');
    setRejectionError('');
    setRejectModal({ show: true, po });
  };

  const confirmAcceptPO = async () => {
    try {
      setloading(true);
      await handleAcceptPO(acceptModal.po.id);
      toast.success(`PO #${acceptModal.po.po_number} accepted successfully!`);
      setAcceptModal({ show: false, po: null });
      getPOData();
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Failed to accept PO';
      toast.error(msg);
    } finally {
      setloading(false);
    }
  };

  const [rejectionError, setRejectionError] = useState('');

  const confirmRejectPO = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Please provide a reason for rejection.');
      return;
    }
    setRejectionError('');
    try {
      setloading(true);
      await handleRejectPO(rejectModal.po.id, rejectionReason);
      toast.success(`PO #${rejectModal.po.po_number} rejected. The buyer has been notified.`);
      setRejectModal({ show: false, po: null });
      getPOData();
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || 'Failed to reject PO';
      toast.error(msg);
    } finally {
      setloading(false);
    }
  };

  const getPODetails = () => {
    if(!po) return;

    setloading(true);
    getPoDetails(po).then(value => {
        if(value)
            setPODetails(value);
    }).finally(() => setloading(false));
  }

  useEffect(() => {
    getPOData();
  }, [rfq]);

  useEffect(() => { fetchCompanyUsers(); }, [])

  useEffect(() => {
    getPODetails();
  }, [po]);

  useEffect(() => {
    const handler = setTimeout(() => {
      getAllRFQs(true);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [rfqNo]);

  const orderBookSidebar = (
    <RFQListSidebar
      title={null}
      embedded
      mobileOpen={isMobile ? sidebarOpen : undefined}
      onMobileClose={() => setSidebarOpen(false)}
      rfqList={myRFQs}
      loading={rfqLoading}
      selectedRfqId={rfq ? parseInt(rfq) : null}
      linkPrefix="/dashboard/vendor/order-book"
      linkQueryKey="rfq"
      rfqNo={rfqNo}
      onRfqNoChange={setRfqNo}
      searchPlaceholder="Search RFQ No."
      showTypeFilter={false}
      tabs={[
        {
          key: 'action_required',
          label: 'Action Required',
          filter: (item) => item.has_acceptance_pending
        },
        {
          key: 'all',
          label: 'All',
        }
      ]}
      defaultTab="action_required"
      getItemTags={(item) => {
        const tags = [];
        if (item.has_acceptance_pending) {
          tags.push({ label: 'Action Required', variant: 'warning' });
        }
        if (item.approval_required) {
          tags.push({ label: 'Approval Required', variant: 'danger' });
        }
        return tags;
      }}
      pageId="vendor-order-book"
    />
  );

  return (
    <>
      <TwoPanelPage
        title="Order Book"
        subtitle="View and manage your received orders."
        sidebar={orderBookSidebar}
        onMobileSidebarToggle={isMobile ? () => setSidebarOpen(v => !v) : undefined}
        mobileSidebarOpen={sidebarOpen}
        mobileToggleLabel="Select RFQ"
      >
        {!rfq && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <BsFileEarmarkText size={36} />
            </div>
            <h4 className={styles.emptyStateTitle}>Select an RFQ to View Your Orders</h4>
            <p className={styles.emptyStateDesc}>
              Choose an RFQ from the sidebar to view and manage your orders.
            </p>
          </div>
        )}

        {rfq && !po && poData && (
          <POListing
            poList={poData}
            totalData={totalData}
            handleProgressStatus={handlePODecision}
            rfq_id={rfq}
            refetchPOList={getPOData}
            handleInitiatePO={handleInitiatePO}
            onSelect={(po_id) =>
              router.push(
                `/dashboard/vendor/order-book/?rfq=${rfq}&po=${po_id}`
              )
            }
            companyUsers={companyUsers}
            approvalLevel={approvalLevel}
            onAcceptPO={onAcceptPO}
            onRejectPO={onRejectPO}
          />
        )}

        {po && poDetails && (
          <PurchaseOrderDetails
            data={poDetails}
            handlePODecision={handlePODecision}
            refetchPODetails={getPODetails}
            handleInitiatePO={handleInitiatePO}
            handleBack={() => {
              setPODetails(null);
              router.push(
                `/dashboard/vendor/order-book/?rfq=${rfq}`,
                null,
                { shallow: true }
              );
            }}
            companyUsers={companyUsers}
            onAcceptPO={onAcceptPO}
            onRejectPO={onRejectPO}
          />
        )}
      </TwoPanelPage>

      <RaiseInvoiceModal 
        show={showRaiseInvoiceModal} 
        onClose={() => setShowRaiseInvoiceModal(false)} 
        onAction={handleConfirmRaiseInvoice}
      />

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

      {/* Accept PO Confirmation */}
      <ConfirmationModal
        isOpen={acceptModal.show}
        onClose={() => setAcceptModal({ show: false, po: null })}
        onConfirm={confirmAcceptPO}
        title="Accept Purchase Order"
        description={`Are you sure you want to accept PO #${acceptModal.po?.po_number || ''}? This confirms your commitment to fulfill this order as per the specified terms.`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Accept PO"
        cancelButtonText="Cancel"
      />

      {/* Reject PO with Reason */}
      <ConfirmationModal
        isOpen={rejectModal.show}
        onClose={() => setRejectModal({ show: false, po: null })}
        onConfirm={confirmRejectPO}
        title="Reject Purchase Order"
        description={`Are you sure you want to reject PO #${rejectModal.po?.po_number || ''}? The buyer will be notified and will need to finalize another vendor.`}
        confirmButtonColor="danger"
        confirmButtonText="Reject PO"
        cancelButtonText="Cancel"
        customFooter={
          <div style={{ marginTop: 4 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
              Reason for rejection <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); if (rejectionError) setRejectionError(''); }}
              placeholder="Please provide a reason for rejecting this PO..."
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13.5,
                color: '#1e293b',
                border: `1px solid ${rejectionError ? '#ef4444' : '#e2e8f0'}`,
                borderRadius: 8,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = rejectionError ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
            {rejectionError && (
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#ef4444', fontWeight: 500 }}>{rejectionError}</p>
            )}
          </div>
        }
      />
    </>
  );
};

export default OrderBook;