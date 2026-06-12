import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/router';
import ManageRFQ from "./manageRFQ/ManageRFQ";
import CreateRFQ from "./createRFQ/CreateRFQ";
import DraftRFQ from "./draftRFQ/DraftRFQ";
import PendingApprovalsList from "./manageRFQ/PendingApprovalsList";
import FilterSection from "@/components/shared/FilterSection";
import { getPendingApprovalRFQs } from "@/services/rfq";
import { TwoPanelPage } from "@/components/layout/DashboardShell";
import styles from "./rfq-management.module.scss";

const TAB_CONFIG = [
  { key: "pendingRFQs", label: "Approval Pending", urlKey: "pending-rfq", showBadge: true },
  { key: "manageRFQs", label: "Running", urlKey: "manage-rfq" },
  { key: "draftRFQs", label: "Drafts", urlKey: "draft-rfq" },
  { key: "closedRFQs", label: "Closed", urlKey: "closed-rfq" },
  { key: "completedRFQs", label: "Approved", urlKey: "completed-rfq" },
];

const URL_TO_TAB = {};
TAB_CONFIG.forEach(t => { URL_TO_TAB[t.urlKey] = t.key; });
// Hidden tab (not in pill nav, but accessible via URL)
URL_TO_TAB['create-rfq'] = 'createRFQs';

const RfqManagement = () => {
  const [activeTab, setActiveTab] = useState("pendingRFQs");
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRFQs, setPendingRFQs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [filterData, setFilterData] = useState({
    project_id: -1,
    rfq_type: "",
    reverse_auction: "-1",
    sort: "DESC",
    search_val: null,
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
      event.returnValue = '';
      return "Data will be lost if you leave the page, are you sure?";
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (tab && URL_TO_TAB[tab]) {
      setActiveTab(URL_TO_TAB[tab]);
    } else if (!tab) {
      setActiveTab('pendingRFQs');
    }
  }, [router])


  const showFilters = activeTab === "pendingRFQs" || activeTab === "manageRFQs" || activeTab === "closedRFQs" || activeTab === "completedRFQs" || activeTab === "draftRFQs";

  const activeFilterData = useMemo(() => ({ ...filterData, completed_status: 'active' }), [filterData]);
  const completedFilterData = useMemo(() => ({ ...filterData, completed_status: 'completed' }), [filterData]);
  const closedFilterData = useMemo(() => ({ ...filterData, completed_status: 'closed' }), [filterData]);

  const handleTabChange = (tabKey) => {
    const tabCfg = TAB_CONFIG.find(t => t.key === tabKey);
    const newQuery = { tab: tabCfg ? tabCfg.urlKey : '' };

    setActiveTab(tabKey);
    setFilterData((prev) => ({ ...prev, page: 1 }));
    router.push(
      { pathname: router.pathname, query: newQuery },
      undefined,
      { shallow: true }
    );
  };

  // Tab pill bar — minimal flat group (no icons, inline count after label)
  const tabPillBar = (
    <div className={styles.tabPills}>
      {TAB_CONFIG.map((tabItem) => {
        const isActive = activeTab === tabItem.key;
        const showCount = tabItem.showBadge && pendingCount > 0;
        return (
          <button
            key={tabItem.key}
            id={`${tabItem.key}-rfq_tabs-rfq_management_page`}
            type="button"
            className={`${styles.tabPill} ${isActive ? styles.tabPillActive : ""}`}
            onClick={() => handleTabChange(tabItem.key)}
          >
            <span>{tabItem.label}</span>
            {showCount && (
              <span className={styles.tabPillCount}>{pendingCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  // The shell header should reflect what's actually being shown — when the
  // (URL-only) Create RFQ tab is active, the listing-page title would be
  // misleading and competes with the form's own context strip.
  const isCreateTab = activeTab === "createRFQs";
  const pageTitle = isCreateTab
    ? "New Tender / RFQ"
    : "Tender / RFQ Management";
  const pageSubtitle = isCreateTab
    ? "Define products, vendors, and a timeline for a new procurement request."
    : "Create, track, and manage your procurement requests.";

  return (
    <TwoPanelPage
      title={pageTitle}
      subtitle={pageSubtitle}
      filters={
        !isCreateTab ? (
          <>
            {tabPillBar}
            {showFilters && (
              <FilterSection setFilterData={setFilterData} disabled={pendingLoading || listLoading} />
            )}
          </>
        ) : null
      }
    >

      <div className="mt-2">
        {activeTab === "pendingRFQs" && (
          <PendingApprovalsList
            filterData={filterData}
            setFilterData={setFilterData}
            pendingRFQs={pendingRFQs}
            totalRFQs={pendingCount}
            loading={pendingLoading}
          />
        )}

        {activeTab === "createRFQs" && (
          <CreateRFQ/>
        )}
        {activeTab === "manageRFQs" && (
          <ManageRFQ filterData={activeFilterData} setFilterData={setFilterData} onLoadingChange={setListLoading} />
        )}
        {activeTab === "draftRFQs" && (
          <DraftRFQ filterData={filterData} setFilterData={setFilterData} />
        )}
        {activeTab === "closedRFQs" && (
          <ManageRFQ filterData={closedFilterData} setFilterData={setFilterData} onLoadingChange={setListLoading} />
        )}
        {activeTab === "completedRFQs" && (
          <ManageRFQ filterData={completedFilterData} setFilterData={setFilterData} onLoadingChange={setListLoading} />
        )}
      </div>
    </TwoPanelPage>
  );
};

export default RfqManagement;
