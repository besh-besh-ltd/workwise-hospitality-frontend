import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { getRFQById, closeRFQ, withdrawPublish } from "@/services/rfq";
import ViewRFQ from "./manageRFQ/ViewRFQ";
import { toast } from "react-toastify";
import { getEntityLabel } from "@/utils/sharedFunctions";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

const RfqManagementDetails = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);
  const [rfqDetails, setrfqDetails] = useState('')
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [showWithdrawConfirmModal, setShowWithdrawConfirmModal] = useState(false);
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const {id} = router.query

  const isCreator = rfqDetails && userProfile && String(rfqDetails.created_by) === String(userProfile.id);

  useEffect(() => {
    if(id && id !== '') {
      getRFQById(id).then(res => {
        setrfqDetails(res.data)
      }).catch((err) => {
        console.error("Error fetching RFQ:", err);
      })
    }
  }, [router])

  const handleCloseRFQ = async () => {
    setCloseLoading(true);
    try {
      const response = await closeRFQ(id);
      if (response && response.status === 1) {
        toast.success(`${getEntityLabel(rfqDetails?.is_tender)} closed successfully`);
        // Refresh RFQ data to show updated status
        const updatedRfq = await getRFQById(id);
        setrfqDetails(updatedRfq.data);
      } else {
        toast.error(`Failed to close ${getEntityLabel(rfqDetails?.is_tender)}`);
      }
    } catch (error) {
      console.error("Error closing RFQ:", error);
      toast.error(`Error closing ${getEntityLabel(rfqDetails?.is_tender)}`);
    } finally {
      setCloseLoading(false);
      setShowCloseConfirmModal(false);
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
        const updatedRfq = await getRFQById(id);
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

  return (
    <>
      <ViewRFQ
        data={rfqDetails}
        onCloseRFQ={handleCloseConfirm}
        closeLoading={closeLoading}
        isCreator={isCreator}
        onWithdrawPublish={() => setShowWithdrawConfirmModal(true)}
        withdrawLoading={withdrawLoading}
      />

      {/* Close RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseConfirmModal}
        onClose={handleCloseCancel}
        onConfirm={handleCloseRFQ}
        title="Close RFQ"
        description={`Are you sure you want to close RFQ #${rfqDetails?.rfq_no || 'this RFQ'}?\nOnce closed, vendors will no longer be able to submit quotes.`}
        confirmButtonColor="warning"
        confirmButtonText="Close RFQ"
        cancelButtonText="Cancel"
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
