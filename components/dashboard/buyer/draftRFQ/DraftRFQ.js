import FullLoader from "@/components/shared/FullLoader";
import { getDraftRFQs } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import DraftRFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";
import FilterSection from "@/components/shared/FilterSection";

const initialFilterData = {
  project_id: -1,
  rfq_type: "",
  reverse_auction: "-1",
  sort: "DESC",
  rfq_no: null,
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

    // For now, we'll simulate this with client-side state
    // This will be replaced with an actual API call when backend is ready
    // getDraftRFQs({ ...filterData, page })
    //   .then((res) => {
    //     setloading(false);
    //     setMyDraftRFQs(res.data);
    //     setTotalDraftRFQs(res.total_items);
    //   })
    //   .catch((err) => {
    //     setloading(false);
    //     console.log(err);
    //   });

    // Simulate API call with mock data
    setTimeout(() => {
      // Mock data for draft RFQs
      const mockDraftRFQs = [
        {
          id: 1001,
          rfq_no: "402763",
          project_name: "Project Alpha",
          products: [
            {
              product_details: [
                { name: "FLOW TRANSMITTER" }
              ]
            }
          ],
          timestamp: "2025-05-21",
          bid_end_date: "2025-06-13",
          status: 1,
          rfq_type: "",
          reverse_auction: 0,
          is_draft: true
        },
        {
          id: 1002,
          rfq_no: "402764",
          project_name: "Project Beta",
          products: [
            {
              product_details: [
                { name: "FLOW TRANSMITTER" }
              ]
            }
          ],
          timestamp: "2025-05-21",
          bid_end_date: "2025-06-13",
          status: 1,
          rfq_type: "",
          reverse_auction: 0,
          is_draft: true
        },
        {
          id: 1003,
          rfq_no: "402765",
          project_name: "Project Gamma",
          products: [
            {
              product_details: [
                { name: "FLOW TRANSMITTER" }
              ]
            }
          ],
          timestamp: "2025-05-21",
          bid_end_date: "2025-06-13",
          status: 1,
          rfq_type: "",
          reverse_auction: 0,
          is_draft: true
        }
      ];

      setMyDraftRFQs(mockDraftRFQs);
      setTotalDraftRFQs(mockDraftRFQs.length);
      setloading(false);
    }, 1000);
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
            <p>You don't have any draft RFQs yet!</p>
          )}
          {!loading && myDraftRFQs && myDraftRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped ">
                <thead>
                  <tr>
                    <th>RFQ No & Project</th>
                    <th>Products</th>
                    <th>Timeline</th>
                    <th>RFQ Type</th>
                    <th>Reverse Auction</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myDraftRFQs.map((item) => {
                    return <DraftRFQItem key={`draft_rfq_item_${item.id}`} data={item} />;
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
