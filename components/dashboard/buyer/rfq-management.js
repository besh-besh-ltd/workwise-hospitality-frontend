import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { ClipboardCheck, FileText, FilePenLine, XCircle, CheckCircle2 } from "lucide-react";
import ManageRFQ from "./manageRFQ/ManageRFQ";
import CreateRFQ from "./createRFQ/CreateRFQ";
import DraftRFQ from "./draftRFQ/DraftRFQ";
import PendingApprovalsList from "./manageRFQ/PendingApprovalsList";
import FilterSection from "@/components/shared/FilterSection";
import { getPendingApprovalRFQs } from "@/services/rfq";
import { TwoPanelPage } from "@/components/layout/DashboardShell";
import useIsMobile from "@/hooks/useIsMobile";
import styles from "@/components/layout/DashboardShell/DashboardShell.module.css";

const TAB_CONFIG = [
  { key: "pendingRFQs", label: "Approval Pending RFQs", urlKey: "pending-rfq", Icon: ClipboardCheck, showBadge: true },
  { key: "manageRFQs", label: "Running RFQs", urlKey: "manage-rfq", Icon: FileText },
  { key: "draftRFQs", label: "Draft RFQs", urlKey: "draft-rfq", Icon: FilePenLine },
  { key: "closedRFQs", label: "Closed RFQs", urlKey: "closed-rfq", Icon: XCircle },
  { key: "completedRFQs", label: "Approved RFQs", urlKey: "completed-rfq", Icon: CheckCircle2 },
];

const URL_TO_TAB = {};
TAB_CONFIG.forEach(t => { URL_TO_TAB[t.urlKey] = t.key; });
// Hidden tab (not in sidebar nav, but accessible via URL)
URL_TO_TAB['create-rfq'] = 'createRFQs';

const RfqManagement = () => {
  const [activeTab, setActiveTab] = useState("pendingRFQs");
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRFQs, setPendingRFQs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const isMobile = useIsMobile();

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


  const showFilters = activeTab === "pendingRFQs" || activeTab === "manageRFQs" || activeTab === "closedRFQs" || activeTab === "completedRFQs";

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

  // Build the tab sub-sidebar
  const tabSidebar = (
    <div className={styles.tabSidebar}>
      <div className={styles.tabSidebarHeader}>
        <h2 className={styles.tabSidebarTitle}>Tender / RFQ Management</h2>
      </div>
      <nav className={styles.tabSidebarNav}>
        {TAB_CONFIG.map((tabItem) => {
          const isActive = activeTab === tabItem.key;
          const Icon = tabItem.Icon;
          return (
            <button
              key={tabItem.key}
              id={`${tabItem.key}-rfq_tabs-rfq_management_page`}
              className={`${styles.tabSidebarItem} ${isActive ? styles.tabSidebarItemActive : ""}`}
              onClick={() => handleTabChange(tabItem.key)}
            >
              <span className={styles.tabSidebarIcon}>
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className={styles.tabSidebarLabel}>{tabItem.label}</span>
              {tabItem.showBadge && pendingCount > 0 && (
                <span className={styles.tabSidebarBadge}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <TwoPanelPage
      title="Tender / RFQ Management"
      subtitle="Create, track, and manage your procurement requests."
      sidebar={tabSidebar}
      filters={showFilters ? <FilterSection setFilterData={setFilterData} disabled={pendingLoading || listLoading} /> : null}
      onMobileSidebarToggle={isMobile ? () => setSidebarOpen(true) : undefined}
      mobileToggleLabel="Switch view"
    >

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
        <DraftRFQ/>
      )}
      {activeTab === "closedRFQs" && (
        <ManageRFQ filterData={closedFilterData} setFilterData={setFilterData} onLoadingChange={setListLoading} />
      )}
      {activeTab === "completedRFQs" && (
        <ManageRFQ filterData={completedFilterData} setFilterData={setFilterData} onLoadingChange={setListLoading} />
      )}
    </TwoPanelPage>
  );
};

export default RfqManagement;
