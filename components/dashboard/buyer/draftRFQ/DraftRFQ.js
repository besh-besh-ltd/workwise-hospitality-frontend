import FullLoader from "@/components/shared/FullLoader";
import { getDraftRFQs } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import DraftRFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";
import FilterSection from "@/components/shared/FilterSection";
import { toast } from "react-toastify";
import { getEntityLabel } from "@/utils/sharedFunctions";

const initialFilterData = {
  project_id: -1,
  rfq_type: "",
  reverse_auction: "-1",
  sort: "DESC",
  rfq_no: null,
  is_tender: null,
}

const DraftRFQ = () => {
  const [loading, setloading] = useState(false);
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(10);
  const [filterData, setFilterData] = useState(initialFilterData);
  const [myDraftRFQs, setMyDraftRFQs] = useState([]);
  const [totalDraftRFQs, setTotalDraftRFQs] = useState(0);

  // Function to get all draft RFQs
  const getAllDraftRFQs = () => {
    setloading(true);

    getDraftRFQs({ ...filterData, page, limit })
      .then((res) => {
        setloading(false);
        if (res && res.status === 1) {
          setMyDraftRFQs(res.data || []);
          setTotalDraftRFQs(res.total_items || 0);
        } else {
          setMyDraftRFQs([]);
          setTotalDraftRFQs(0);
          toast.error(`Failed to fetch draft ${getEntityLabel(filterData?.is_tender, true)}`);
        }
      })
      .catch((err) => {
        setloading(false);
        toast.error(`Error fetching draft ${getEntityLabel(filterData?.is_tender, true)}`);
        setMyDraftRFQs([]);
        setTotalDraftRFQs(0);
      });
  };

  useEffect(() => {
    getAllDraftRFQs();
  }, [page, filterData]);

  return (
    <>
      <div className="manage-rfq-con">
        <div className="details-table hasFullLoader mt-0">
          {/* Table Filter Section */}
          <FilterSection setFilterData={setFilterData} />

          {/* Table Data Section */}
          {loading && <FullLoader />}
          {!loading && myDraftRFQs.length == 0 && (
            <p>You don't have any draft Tender / RFQs yet!</p>
          )}
          {!loading && myDraftRFQs && myDraftRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped ">
                <thead>
                  <tr>
                    <th>Tender / RFQ No & Project</th>
                    <th>Products</th>
                    <th>Timeline</th>
                    <th>Tender / RFQ Type</th>
                    <th>Reverse Auction</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myDraftRFQs.map((item) => {
                    return <DraftRFQItem key={`draft_rfq_item_${item.id}`} data={item} refetch = {getAllDraftRFQs} />;
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && myDraftRFQs.length > 0 && (
            <Pagination
              page={page}
              setPage={setpage}
              limit={limit}
              setLimit={setlimit}
              totalData={totalDraftRFQs}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default DraftRFQ;
