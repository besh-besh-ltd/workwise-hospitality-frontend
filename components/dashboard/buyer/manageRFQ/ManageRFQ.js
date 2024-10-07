import FullLoader from "@/components/shared/FullLoader";
import { getRFQS } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";

const ManageRFQ = () => {
  const [loading, setloading] = useState(false);
  const [page, setpage] = useState(1);
  const [limit, setlimit] = useState(10);
  const [myRFQs, setmyRFQs] = useState([]);
  const [totalRFQs, settotalRFQs] = useState(0);

  useEffect(() => {
    getAllRFQs();
  }, []);
  useEffect(() => {
    getAllRFQs();
  }, [page, limit]);

  const getAllRFQs = () => {
    setloading(true);
    getRFQS({ page, limit })
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

  return (
    <>
      <div className="manage-rfq-con">
        {/* Content for Manage RFQs tab */}
        <h3 className="title">Manage RFQs</h3>

        <div className="details-table hasFullLoader">

          {loading && <FullLoader />}
          {!loading && myRFQs.length == 0 && (
            <p>You haven't created any RFQs yet!</p>
          )}
          {!loading && myRFQs && myRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped ">
                <thead>
                  <tr>
                    <th>Group RFQ Code</th>
                    <th>Products</th>
                    <th>Published Date</th>
                    <th>End Date</th>
                    <th>RFQ Type</th>
                    <th>Status</th>
                    <th>Reverse Auction</th>
                    <th>Action</th>
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
              page={page}
              setPage={setpage}
              limit={limit}
              setLimit={setlimit}
              totalData={totalRFQs}
            />
          )}

        </div>
      </div>
    </>
  );
};

export default ManageRFQ;
