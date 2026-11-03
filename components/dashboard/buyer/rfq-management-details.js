import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { getRFQById, withdrawPublish, reopenRfqItems } from "@/services/rfq";
import ViewRFQ from "./manageRFQ/ViewRFQ";
import RfqCloseModal from "./manageRFQ/RfqCloseModal";
import { toast } from "react-toastify";
import { getEntityLabel } from "@/utils/sharedFunctions";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";

const RfqManagementDetails = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);
  const [rfqDetails, setrfqDetails] = useState('')
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  // "Close remaining items" dialog, and the item being reopened (if any).
  const [showCloseItemsModal, setShowCloseItemsModal] = useState(false);
  const [reopenTarget, setReopenTarget] = useState(null);
  // Bumped after a close / reopen so ViewRFQ re-pulls its lifecycle timeline.
  const [lifecycleRefreshKey, setLifecycleRefreshKey] = useState(0);
  const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] = useState(false);
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const {id} = router.query

  const isCreator = rfqDetails && userProfile && String(rfqDetails.created_by) === String(userProfile.id);

  // Permission check for viewing this RFQ
  const moduleKey = rfqDetails?.is_tender == 1 ? 'boq' : 'rfq';
  const hotelIds = useMemo(() => {
    return rfqDetails?.hotel_id ? [rfqDetails.hotel_id] : [];
  }, [rfqDetails?.hotel_id]);
  const { canRead, loading: permLoading } = useModulePermissions({
    moduleKey,
    hotelIds,
    departmentId: rfqDetails?.department_id || null,
    enabled: !!rfqDetails,
  });
  const [apiForbidden, setApiForbidden] = useState(false);
  const isAccessDenied = apiForbidden || (rfqDetails && !permLoading && !canRead);

  useEffect(() => {
    if(id && id !== '') {
      getRFQById(id, undefined, true).then(res => {
        setrfqDetails(res.data)
      }).catch((err) => {
        const status = err?.response?.status || err?.message?.response?.status;
        if (status === 403) {
          setApiForbidden(true);
          return;
        }
        console.error("Error fetching RFQ:", err);
      })
    }
    // Keyed on the RFQ id only. `router` is a new object on every route change,
    // including the shallow ?stage= replace ViewRFQ does on each stage click,
    // and depending on it refetched the whole RFQ every time a stage was opened.
  }, [id])

  const refreshRfq = async () => {
    const updatedRfq = await getRFQById(id, undefined, true);
    setrfqDetails(updatedRfq.data);
    setLifecycleRefreshKey((k) => k + 1);
  };

  // RfqCloseModal has already called the server; this reports and refreshes.
  const handleCloseRFQDone = async () => {
    setCloseLoading(true);
    try {
      toast.success(`${getEntityLabel(rfqDetails?.is_tender)} closed successfully`);
      setShowCloseConfirmModal(false);
      await refreshRfq();
    } catch (error) {
      console.error("Error refreshing RFQ after close:", error);
    } finally {
      setCloseLoading(false);
    }
  };

  const handleCloseItemsDone = async (res) => {
    toast.success(res?.message || "Items closed without award");
    setShowCloseItemsModal(false);
    try {
      await refreshRfq();
    } catch (error) {
      console.error("Error refreshing RFQ after closing items:", error);
    }
  };

  const handleReopenItem = async (remarks) => {
    if (!reopenTarget) return;
    try {
      const res = await reopenRfqItems(id, { rfq_product_ids: [reopenTarget.id], remarks });
      if (res?.status === 1) {
        toast.success("Item reopened. Extend the bid date so vendors can quote it again.");
        setReopenTarget(null);
        await refreshRfq();
      } else {
        toast.error(res?.message || "Could not reopen the item");
      }
    } catch (error) {
      toast.error(error?.message?.response?.data?.message || "Could not reopen the item");
    }
  };

  const handleCloseConfirm = () => {
    setShowCloseConfirmModal(true);
  };

  const handleCloseCancel = () => {
    setShowCloseConfirmModal(false);
  };

  const handleWithdrawPublish = async () => {
    setWithdrawLoading(true);
    try {
      const response = await withdrawPublish(id);
      if (response && response.status === 1) {
        const updatedRfq = await getRFQById(id, undefined, true);
        setrfqDetails(updatedRfq.data);
        setShowWithdrawConfirmModal(false);
        setShowWithdrawSuccessModal(true);
      } else {
        toast.error('Failed to withdraw publish request');
        setShowWithdrawConfirmModal(false);
      }
    } catch (error) {
      console.error("Error withdrawing publish:", error);
      toast.error('Error withdrawing publish request');
      setShowWithdrawConfirmModal(false);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (isAccessDenied) {
    return <AccessDeniedPage />;
  }

  return (
    <>
      <ViewRFQ
        data={rfqDetails}
        onCloseRFQ={handleCloseConfirm}
        closeLoading={closeLoading}
        onCloseItems={() => setShowCloseItemsModal(true)}
        onReopenItem={(product) => setReopenTarget(product)}
        lifecycleRefreshKey={lifecycleRefreshKey}
        isCreator={isCreator}
        onWithdrawPublish={() => setShowWithdrawConfirmModal(true)}
        withdrawLoading={withdrawLoading}
      />

      {/* Close RFQ: names the items closed without award and what the close cancels */}
      <RfqCloseModal
        isOpen={showCloseConfirmModal}
        mode="rfq"
        rfq={rfqDetails}
        entity={getEntityLabel(rfqDetails?.is_tender)}
        onClose={handleCloseCancel}
        onDone={handleCloseRFQDone}
      />

      {/* Close the items that will not be awarded; the RFQ stays open */}
      <RfqCloseModal
        isOpen={showCloseItemsModal}
        mode="items"
        rfq={rfqDetails}
        entity={getEntityLabel(rfqDetails?.is_tender)}
        onClose={() => setShowCloseItemsModal(false)}
        onDone={handleCloseItemsDone}
      />

      {/* Reopen an item closed without award */}
      <ConfirmationModal
        isOpen={!!reopenTarget}
        onClose={() => setReopenTarget(null)}
        onConfirm={handleReopenItem}
        title="Reopen item"
        description={`Reopen this item so it can be awarded again? Vendors can quote it only after you extend the bid date.`}
        confirmButtonColor="primary"
        confirmButtonText="Reopen item"
        cancelButtonText="Cancel"
        requireComment
        commentLabel="Why is it being reopened?"
        commentPlaceholder="e.g. closed by mistake, a vendor can now supply it"
      />

      {/* Withdraw Publish Request Confirmation Modal */}
      <ConfirmationModal
        isOpen={showWithdrawConfirmModal}
        onClose={() => setShowWithdrawConfirmModal(false)}
        onConfirm={handleWithdrawPublish}
        title="Withdraw Publish Request"
        description={`Are you sure you want to withdraw the publish request for ${getEntityLabel(rfqDetails?.is_tender)} #${rfqDetails?.rfq_no || ''}?\nThis will cancel the scheduled publication and any pending approvals.`}
        confirmButtonColor="warning"
        confirmButtonText="Withdraw"
        cancelButtonText="Cancel"
      />

      {/* Withdraw Publish Success Modal */}
      <ConfirmationModal
        isOpen={showWithdrawSuccessModal}
        onClose={() => {
          setShowWithdrawSuccessModal(false);
          router.push('/dashboard/buyer/rfq-management?tab=manage-rfq');
        }}
        onConfirm={() => {
          setShowWithdrawSuccessModal(false);
          router.push(`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${rfqDetails?.id}`);
        }}
        title="Publish Request Withdrawn"
        description={`The publish request for ${getEntityLabel(rfqDetails?.is_tender)} #${rfqDetails?.rfq_no || ''} has been withdrawn successfully.\nThe ${getEntityLabel(rfqDetails?.is_tender)} has been moved back to draft. You can edit and re-submit it for publishing.`}
        confirmButtonColor="primary"
        confirmButtonText="Edit Draft"
        cancelButtonText="Go to Management"
      />
    </>
  );
};

export default RfqManagementDetails;
