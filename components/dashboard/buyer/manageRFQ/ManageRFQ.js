import FullLoader from "@/components/shared/FullLoader";
import { getRFQS, getVendorsForReminder, sendSelectiveReminder } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQCard from "./RFQCard";
import Pagination from "@/components/shared/Pagination";
import VendorSelectionModal from "@/components/modal/VendorSelectionModal";
import { toast } from "react-toastify";

const ManageRFQ = ({ filterData, setFilterData }) => {
  const [loading, setloading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [totalRFQs, settotalRFQs] = useState(0);

  // Reminder modal state
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const getAllRFQs = () => {
    setloading(true);

    getRFQS({ ...filterData })
      .then((res) => {
        setloading(false);
        setmyRFQs(res.data);
        settotalRFQs(res.total_items);
      })
      .catch((err) => {
        setloading(false);
        console.log(err);
      });
  };

  useEffect(() => {
    console.log("CURRENT FILTER DATA:", filterData);
    getAllRFQs();
  }, [filterData]);

  // Handle send reminder
  const handleSendReminder = async (rfqData) => {
    setSelectedRFQ(rfqData);
    setModalLoading(true);
    setShowVendorModal(true);

    try {
      const response = await getVendorsForReminder(rfqData.id);
      setVendors(response.data || []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      toast.error("Failed to load vendors. Please try again.");
      setShowVendorModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendSelectiveReminder = async (selectedVendorIds) => {
    try {
      const response = await sendSelectiveReminder(selectedRFQ.id, selectedVendorIds);
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
    setVendors([]);
    setSelectedRFQ(null);
  };

  return (
    <>
      <div className="manage-rfq-con">
        <div className="hasFullLoader mt-0">
          {/* Card List Section */}
          {loading && <FullLoader />}
          {!loading && myRFQs.length == 0 && (
            <div className="text-center py-5">
              <p className="text-muted">You haven't created any Tender / RFQ yet!</p>
            </div>
          )}
          {!loading && myRFQs && myRFQs.length > 0 && (
            <div className="d-flex flex-column gap-2">
              {myRFQs.map((item) => (
                <RFQCard
                  key={`rfq_card_${item.id}`}
                  data={item}
                  onSendReminder={handleSendReminder}
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
        onSendReminder={handleSendSelectiveReminder}
        vendors={vendors}
        loading={modalLoading}
      />
    </>
  );
};

export default ManageRFQ;
