import FullLoader from "@/components/shared/FullLoader";
import { getDraftRFQs, getProcessingRFQs } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import ProcessingRFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";
import FilterSection from "@/components/shared/FilterSection";
import { toast } from "react-toastify";
import ProcessingErrorsModal from "./ProcessingErrorModal";

const initialFilterData = {
  project_id: -1,
  rfq_type: "",
  reverse_auction: "-1",
  sort: "DESC",
  rfq_no: null,
}

const ProcessingRFQ = ({ handleCreateRFQ }) => {
  const [loading, setloading] = useState(false);
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(10);
  const [filterData, setFilterData] = useState(initialFilterData);
  const [myProcessingRFQs, setMyProcessingRFQs] = useState([]);
  const [totalProcessingRFQs, setTotalProcessingRFQs] = useState(0);
  const [activeRFQ, setActiveRFQ] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Function to get all draft RFQs
  const getAllProcessingRFQs = () => {
    setloading(true);

    getProcessingRFQs({ ...filterData, page, limit })
      .then((res) => {
        setloading(false);
        if (res && res.status === 1) {
          setMyProcessingRFQs(res.data || []);
          setTotalProcessingRFQs(res.total_items || 0);
        } else {
          setMyProcessingRFQs([]);
          setTotalProcessingRFQs(0);
          toast.error("Failed to fetch processing RFQs");
        }
      })
      .catch((err) => {
        setloading(false);
        toast.error("Error fetching processing RFQs");
        setMyProcessingRFQs([]);
        setTotalProcessingRFQs(0);
      });
  };

  useEffect(() => {
    getAllProcessingRFQs();
  }, [page, filterData]);

  return (
    <>
      <div className="manage-rfq-con">
        <div className="details-table hasFullLoader mt-0">
          {/* Table Data Section */}
          {loading && <FullLoader />}
          {!loading && myProcessingRFQs.length == 0 && (
            <p>You don't have any processing RFQs yet!</p>
          )}
          {!loading && myProcessingRFQs && myProcessingRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>SR. No</th>
                    <th>File name</th>
                    <th>Action Performed</th>
                    <th>Status</th>
                    <th>Started At</th>
                    <th>Completed At</th>
                    <th>Time Taken</th>
                    <th>RFQ ID</th>
                    <th>Pending Items</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myProcessingRFQs.map((item, index) => {
                    return (
                      <ProcessingRFQItem
                        key={`processing_rfq_item_${item.id}`}
                        handleCreateRFQ={async (excel_link, file_name, raw_file_url) => {
                          await handleCreateRFQ(excel_link, file_name, raw_file_url);
                          getAllProcessingRFQs();
                        }}
                        data={item}
                        index={(page - 1) * limit + index + 1}
                        onViewErrors={() => {
                          setActiveRFQ(item);
                          setShowErrorModal(true);
                        }}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && myProcessingRFQs.length > 0 && (
            <Pagination
              page={page}
              setPage={setpage}
              limit={limit}
              setLimit={setlimit}
              totalData={totalProcessingRFQs}
            />
          )}

          <ProcessingErrorsModal
            show={showErrorModal}
            errors={activeRFQ?.errors}
            onClose={() => setShowErrorModal(false)}
          />
        </div>
      </div>
    </>
  );
};

export default ProcessingRFQ;
