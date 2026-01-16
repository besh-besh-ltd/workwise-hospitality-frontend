import FullLoader from "@/components/shared/FullLoader";
import { getRFQS } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";

const ManageRFQ = ({ filterData, setFilterData }) => {
  const [loading, setloading] = useState(false);
  const [myRFQs, setmyRFQs] = useState([]);
  const [totalRFQs, settotalRFQs] = useState(0);

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

  return (
    <>
      <div className="manage-rfq-con">
        <div className="details-table hasFullLoader mt-0">
          {/* Table Data Section */}
          {loading && <FullLoader />}
          {!loading && myRFQs.length == 0 && (
            <p>You haven't created any Tender / RFQ yet!</p>
          )}
          {!loading && myRFQs && myRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped ">
                <thead>
                  <tr>
                    <th>Tender / RFQ No & Project</th>
                    <th>Products</th>
                    <th>Timeline</th>
                    <th>Created By</th>
                    <th>Tender / RFQ Type</th>
                    <th>Reverse Auction</th>
                    <th>Action</th>
                    <th>Query</th>
                    <th>Reminder for Quotes</th>
                  </tr>
                </thead>
                <tbody>
                  {myRFQs.map((item) => {
                    return <RFQItem key={`rfq_item_${item.id}`} data={item} />;
                  })}
                </tbody>
              </table>
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
    </>
  );
};

export default ManageRFQ;
