import { getRFQS, getVendorsForReminder, sendSelectiveReminder } from "@/services/rfq";
import RFQListSkeleton from "./RFQListSkeleton";
import React, { useEffect, useState } from "react";
import RFQCard from "./RFQCard";
import Pagination from "@/components/shared/Pagination";
import VendorSelectionModal from "@/components/modal/VendorSelectionModal";
import { toast } from "react-toastify";

const ManageRFQ = ({ filterData, setFilterData, onLoadingChange }) => {
  const [loading, setloading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [totalRFQs, settotalRFQs] = useState(0);

  // Reminder modal state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [vendorCount, setVendorCount] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);

  const getAllRFQs = () => {
    setloading(true);
    onLoadingChange?.(true);

    getRFQS({ ...filterData })
      .then((res) => {
        setloading(false);
        onLoadingChange?.(false);
        setmyRFQs(res.data);
        settotalRFQs(res.total_items);
      })
      .catch((err) => {
        setloading(false);
        onLoadingChange?.(false);
        console.log(err);
      });
  };

  useEffect(() => {
    getAllRFQs(); 
  }, [filterData]);

  // Handle send reminder
  const handleSendReminder = async (rfqData) => {
    setSelectedRFQ(rfqData);
    setModalLoading(true);
    setShowVendorModal(true);

    try {
      const response = await getVendorsForReminder(rfqData.id);
      setVendorCount(response.vendor_count || 0);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      toast.error("Failed to load vendors. Please try again.");
      setShowVendorModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendAllReminder = async () => {
    try {
      const response = await sendSelectiveReminder(selectedRFQ.id, []);
      if (response.message && response.message !== "") {
        toast.success(response.message);
      }
      setShowVendorModal(false);
    } catch (err) {
      if (err?.message?.response?.status === 403) {
        toast.warning(err?.message?.response?.data?.message);
      } else {
        toast.error(err?.message?.response?.data?.message || "Failed to send reminder");
      }
    }
  };

  const handleCloseModal = () => {
    setShowVendorModal(false);
    setVendorCount(0);
    setSelectedRFQ(null);
  };

  return (
    <>
      <div className="manage-rfq-con">
        <div style={{ marginTop: 0 }}>
          {loading && (
            <RFQListSkeleton
              count={Math.min(Math.max(filterData.limit || 10, 10), 15)}
            />
          )}
          {!loading && myRFQs.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "48px 20px",
              background: "#ffffff",
              border: "1px solid #ebebe6",
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}>
              <p style={{ fontSize: 13, margin: 0, color: "#a1a1aa", fontStyle: "italic", letterSpacing: "-0.005em" }}>
                No Tender / RFQs found for the selected filters.
              </p>
            </div>
          )}
          {!loading && myRFQs && myRFQs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myRFQs.map((item) => (
                <RFQCard
                  key={`rfq_card_${item.id}`}
                  data={item}
                  onSendReminder={handleSendReminder}
                  hasEditPermission={item.can_edit}
                />
              ))}
            </div>
          )}

          {!loading && myRFQs.length > 0 && (
            <Pagination
              page={filterData.page}
              setPage={(newPage) =>
                setFilterData((prev) => ({ ...prev, page: newPage }))
              }
              limit={filterData.limit}
              setLimit={(newLimit) =>
                setFilterData((prev) => ({ ...prev, limit: newLimit }))
              }
              totalData={totalRFQs}
            />
          )}
        </div>
      </div>

      <VendorSelectionModal
        isOpen={showVendorModal}
        onClose={handleCloseModal}
        onSendReminder={handleSendAllReminder}
        vendorCount={vendorCount}
        loading={modalLoading}
        isTender={selectedRFQ?.is_tender === 1}
      />
    </>
  );
};

export default ManageRFQ;
