import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { Badge } from "react-bootstrap";
import { BsBellFill } from "react-icons/bs";
import CreateRFQ from "./createRFQ/CreateRFQ";
import ManageRFQ from "./manageRFQ/ManageRFQ";
import DraftRFQ from "./draftRFQ/DraftRFQ";
import PendingApprovalsList from "./manageRFQ/PendingApprovalsList";
import FilterSection from "@/components/shared/FilterSection";

const RfqManagement = () => {
  const [activeTab, setActiveTab] = useState("pendingRFQs");
  const [pendingCount, setPendingCount] = useState(0);
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
  const router = useRouter();
  const {tab} = router.query;

  const handlePendingCountChange = (count) => {
    setPendingCount(count);
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ''; // Modern browsers require an empty string.
      return "Data will be lost if you leave the page, are you sure?";
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if(tab && tab == 'create-rfq'){
      setActiveTab('createRFQs')
    } else if(tab && tab == 'draft-rfq'){
      setActiveTab('draftRFQs')
    } else if (tab && tab == 'processing-rfq') {
      setActiveTab('processingRFQs')
    } else if (tab && tab == 'manage-rfq') {
      setActiveTab('manageRFQs')
    } else {
      setActiveTab('pendingRFQs')
    }
  }, [router])
  


const handleTabChange = (tabKey) => {
  let newQuery = { tab: '' };

  if (tabKey === 'pendingRFQs') {
    newQuery.tab = 'pending-rfq';
  } else if (tabKey === 'manageRFQs') {
    newQuery.tab = 'manage-rfq';
  } else if (tabKey === 'createRFQs') {
    newQuery.tab = 'create-rfq';
  } else if (tabKey === 'draftRFQs') {
    newQuery.tab = 'draft-rfq';
    // Reset draft_id when switching to draft tab
    newQuery = { tab: 'draft-rfq' };
  }

  setActiveTab(tabKey);
  // Reset filter page when switching tabs
  setFilterData((prev) => ({ ...prev, page: 1 }));
  router.push(
    { pathname: router.pathname, query: newQuery },
    undefined,
    { shallow: true }
  );
};





 

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Tender / RFQ Management</h1>
        </div>
      </section>

      <section className="buyer-rfq-sec-1 buyer-rfq-sec-tab">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="tabs-container">
                <button
                  id="pending_rfqs-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "pendingRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("pendingRFQs")}
                >
                  <span>Pending Tender / RFQ</span>
                  {pendingCount > 0 && (
                    <Badge bg="danger" pill style={{ fontSize: "0.7rem", marginLeft: "8px" }}>
                      {pendingCount}
                    </Badge>
                  )}
                </button>
                <button
                  id="manage_group_rfq-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "manageRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("manageRFQs")}
                >
                  Manage Tender / RFQ
                </button>
                <button
                  id="create_rfqs-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "createRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("createRFQs")}
                >
                  Create Tender / RFQ
                </button>
                <button
                  id="draft_rfqs-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "draftRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("draftRFQs")}
                >
                  Draft Tender / RFQ
                </button>
              </div>

              {/* Filter Section - Shared across pending and manage tabs */}
              {(activeTab === "pendingRFQs" || activeTab === "manageRFQs") && (
                <div className="manage-rfq-con pb-0">
                  <FilterSection setFilterData={setFilterData} />
                </div>
              )}

              {activeTab === "pendingRFQs" && (
                <div className="manage-rfq-con">
                  <PendingApprovalsList
                    filterData={filterData}
                    setFilterData={setFilterData}
                    onCountChange={handlePendingCountChange}
                  />
                </div>
              )}
              {activeTab === "manageRFQs" && (
                <ManageRFQ filterData={filterData} setFilterData={setFilterData} />
              )}
              {activeTab === "createRFQs" && (
                <CreateRFQ/>
              )}
              {activeTab === "draftRFQs" && (
                <DraftRFQ/>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default RfqManagement;
