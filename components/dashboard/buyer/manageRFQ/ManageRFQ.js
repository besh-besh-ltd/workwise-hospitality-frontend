import FullLoader from "@/components/shared/FullLoader";
import { getRFQS } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";
import FilterSection from "@/components/shared/FilterSection";

const ManageRFQ = () => {
  const [loading, setloading] = useState(false);
  const [filterData, setFilterData] = useState({
    project_id: -1,
    rfq_type: "",
    reverse_auction: "-1",
    sort: "DESC",
    rfq_no: null,
    page: 1,
    limit: 10,
  });
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
    console.log("CURRENT FILTER DATA:", filterData)
    getAllRFQs();
  }, [filterData]);

  return (
    <>
      <div className="manage-rfq-con">
        {/* Content for Manage RFQs tab */}
        {/* <h3 className="title">Manage RFQs</h3> */}

        <div className="details-table hasFullLoader mt-0">
          {/* Table Filter Section */}
          <FilterSection
            setFilterData={setFilterData}
          />

          {/* Table Data Section */}
          {loading && <FullLoader />}
          {!loading && myRFQs.length == 0 && (
            <p>You haven't created any RFQs yet!</p>
          )}
          {!loading && myRFQs && myRFQs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-striped ">
                <thead>
                  <tr>
                    <th>RFQ No & Project</th>
                    <th>Products</th>
                    <th>Timeline</th>
                    <th>Created By</th>
                    <th>RFQ Type</th>
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
