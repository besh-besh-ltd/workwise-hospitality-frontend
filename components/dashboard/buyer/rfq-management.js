import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { Badge } from "react-bootstrap";
import { BsBellFill } from "react-icons/bs";
import ManageRFQ from "./manageRFQ/ManageRFQ";
import CreateRFQ from "./createRFQ/CreateRFQ";
import DraftRFQ from "./draftRFQ/DraftRFQ";
import PendingApprovalsList from "./manageRFQ/PendingApprovalsList";
import FilterSection from "@/components/shared/FilterSection";
import { getPendingApprovalRFQs } from "@/services/rfq";

const RfqManagement = () => {
  const [activeTab, setActiveTab] = useState("pendingRFQs");
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRFQs, setPendingRFQs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
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

  const isInitialMount = useRef(true);

  const fetchPendingApprovals = (filters) => {
    setPendingLoading(true);
    getPendingApprovalRFQs({ ...filters })
      .then((body) => {
        const list = Array.isArray(body?.data) ? body.data : [];
        const total = typeof body?.total_items === "number" ? body.total_items : 0;
        setPendingRFQs(list);
        setPendingCount(total);
      })
      .catch(() => {
        setPendingRFQs([]);
      })
      .finally(() => {
        setPendingLoading(false);
      });
  };

  // Fetch pending approvals — once on mount (for badge), then only when filterData changes on the pending tab
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchPendingApprovals(filterData);
      return;
    }
    if (activeTab === "pendingRFQs") {
      fetchPendingApprovals(filterData);
    }
  }, [filterData]);

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
    } else if (tab && tab == 'completed-rfq') {
      setActiveTab('completedRFQs')
    } else if (tab && tab == 'closed-rfq') {
      setActiveTab('closedRFQs')
    } else if (tab && tab == 'manage-rfq') {
      setActiveTab('manageRFQs')
    } else {
      setActiveTab('pendingRFQs')
    }
  }, [router])
  


  const activeFilterData = useMemo(() => ({ ...filterData, completed_status: 'active' }), [filterData]);
  const completedFilterData = useMemo(() => ({ ...filterData, completed_status: 'completed' }), [filterData]);
  const closedFilterData = useMemo(() => ({ ...filterData, completed_status: 'closed' }), [filterData]);

const handleTabChange = (tabKey) => {
  let newQuery = { tab: '' };

  if (tabKey === 'pendingRFQs') {
    newQuery.tab = 'pending-rfq';
  } else if (tabKey === 'manageRFQs') {
    newQuery.tab = 'manage-rfq';
  } else if (tabKey === 'draftRFQs') {
    newQuery.tab = 'draft-rfq';
    // Reset draft_id when switching to draft tab
    newQuery = { tab: 'draft-rfq' };
  } else if (tabKey === 'completedRFQs') {
    newQuery.tab = 'completed-rfq';
  } else if (tabKey === 'closedRFQs') {
    newQuery.tab = 'closed-rfq';
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
                  id="draft_rfqs-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "draftRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("draftRFQs")}
                >
                  Draft Tender / RFQ
                </button>
                <button
                  id="closed_rfqs-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "closedRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("closedRFQs")}
                >
                  Closed Tender / RFQ
                </button>
                <button
                  id="completed_rfqs-rfq_tabs-rfq_management_page"
                  className={`tab ${
                    activeTab === "completedRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("completedRFQs")}
                >
                  Approved Tender / RFQ
                </button>
              </div>

              {/* Filter Section - Shared across pending, manage, and completed tabs */}
              {(activeTab === "pendingRFQs" || activeTab === "manageRFQs" || activeTab === "closedRFQs" || activeTab === "completedRFQs") && (
                <div className="manage-rfq-con pb-0">
                  <FilterSection setFilterData={setFilterData} />
                </div>
              )}

              {activeTab === "pendingRFQs" && (
                <div className="manage-rfq-con">
                  <PendingApprovalsList
                    filterData={filterData}
                    setFilterData={setFilterData}
                    pendingRFQs={pendingRFQs}
                    totalRFQs={pendingCount}
                    loading={pendingLoading}
                  />
                </div>
              )}

              {activeTab === "createRFQs" && (
                <CreateRFQ/>
              )}
              {activeTab === "manageRFQs" && (
                <ManageRFQ filterData={activeFilterData} setFilterData={setFilterData} />
              )}
              {activeTab === "draftRFQs" && (
                <DraftRFQ/>
              )}
              {activeTab === "closedRFQs" && (
                <ManageRFQ filterData={closedFilterData} setFilterData={setFilterData} />
              )}
              {activeTab === "completedRFQs" && (
                <ManageRFQ filterData={completedFilterData} setFilterData={setFilterData} />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default RfqManagement;
