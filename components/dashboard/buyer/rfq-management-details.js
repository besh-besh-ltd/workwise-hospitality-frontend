import React, { useEffect, useState } from "react";
import Link from "next/link";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useRouter } from "next/router";
import { getRFQById, closeRFQ } from "@/services/rfq";
import ViewRFQ from "./manageRFQ/ViewRFQ";
import { toast } from "react-toastify";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

const RfqManagementDetails = () => {
  const router = useRouter();
  const [rfqDetails, setrfqDetails] = useState('')
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const {id} = router.query
  
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
        toast.success("RFQ closed successfully");
        // Refresh RFQ data to show updated status
        const updatedRfq = await getRFQById(id);
        setrfqDetails(updatedRfq.data);
      } else {
        toast.error("Failed to close RFQ");
      }
    } catch (error) {
      console.error("Error closing RFQ:", error);
      toast.error("Error closing RFQ");
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
  
  return (
    <>
      <ViewRFQ 
        data={rfqDetails} 
        onCloseRFQ={handleCloseConfirm}
        closeLoading={closeLoading}
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
    </>
  );
};

export default RfqManagementDetails;
