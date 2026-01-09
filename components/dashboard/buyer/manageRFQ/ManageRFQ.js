import FullLoader from "@/components/shared/FullLoader";
import { getRFQS } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";
import FilterSection from "@/components/shared/FilterSection";
import PendingApprovalsList from "./PendingApprovalsList";
import { Nav, Tab, Badge } from "react-bootstrap";
import { BsBellFill, BsListUl } from "react-icons/bs";

const ManageRFQ = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setloading] = useState(false);
  const [filterData, setFilterData] = useState({
    project_id: -1,
    rfq_type: "",
    reverse_auction: "-1",
    sort: "DESC",
    rfq_no: null,
    is_tender: null,
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
    console.log("CURRENT FILTER DATA:", filterData);
    if (activeTab === "all") {
      getAllRFQs();
    }
  }, [filterData, activeTab]);

  const handlePendingCountChange = (count) => {
    setPendingCount(count);
  };

  // Reset page when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilterData((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <>
      <div className="manage-rfq-con">
        {/* Filter Section - Shared across tabs */}
        <FilterSection setFilterData={setFilterData} />

        {/* Tab Navigation */}
        <Tab.Container activeKey={activeTab} onSelect={handleTabChange}>
          <Nav variant="tabs" className="mb-2 border-bottom-0">
            <Nav.Item>
              <Nav.Link
                eventKey="pending"
                className="d-flex align-items-center gap-1 py-2 px-3"
              >
                <BsBellFill size={12} />
                <span>Pending Approvals</span>
                {pendingCount > 0 && (
                  <Badge bg="danger" pill style={{ fontSize: "0.7rem" }}>
                    {pendingCount}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="all"
                className="d-flex align-items-center gap-1 py-2 px-3"
              >
                <BsListUl size={12} />
                <span>All Tender / RFQ</span>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            {/* Pending Approvals Tab */}
            <Tab.Pane eventKey="pending">
              <PendingApprovalsList
                filterData={filterData}
                setFilterData={setFilterData}
                onCountChange={handlePendingCountChange}
              />
            </Tab.Pane>

            {/* All RFQs Tab */}
            <Tab.Pane eventKey="all">
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
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </div>
    </>
  );
};

export default ManageRFQ;
