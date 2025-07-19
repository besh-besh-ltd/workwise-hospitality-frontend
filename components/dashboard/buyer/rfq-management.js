import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/router';
import CreateRFQ from "./createRFQ/CreateRFQ";
import ManageRFQ from "./manageRFQ/ManageRFQ";
import DraftRFQ from "./draftRFQ/DraftRFQ";

const RfqManagement = () => {
  const [activeTab, setActiveTab] = useState("manageRFQs");
  const router = useRouter();
  const {tab} = router.query;

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
  if (tab === 'create-rfq') {
    setActiveTab('createRFQs');
  } else if (tab === 'draft-rfq') {
    setActiveTab('draftRFQs');
  } else {
    // Default to manageRFQs
    setActiveTab('manageRFQs');
  }
}, [tab]);

  


const handleTabChange = (tabKey) => {
  let newQuery = { tab: '' };
  
  if (tabKey === 'manageRFQs') {
    newQuery.tab = 'manage-rfq';
  } else if (tabKey === 'createRFQs') {
    newQuery.tab = 'create-rfq';
  } else if (tabKey === 'draftRFQs') {
    newQuery.tab = 'draft-rfq';
    // Reset draft_id when switching to draft tab
    newQuery = { tab: 'draft-rfq' };
  }

  setActiveTab(tabKey);
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
          <h1 className="heading">RFQ Management</h1>
        </div>
      </section>

      <section className="buyer-rfq-sec-1 buyer-rfq-sec-tab">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="tabs-container">
                <button
                  className={`tab ${
                    activeTab === "manageRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("manageRFQs")}
                >
                  Manage Group RFQ
                </button>
                <button
                  className={`tab ${
                    activeTab === "createRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("createRFQs")}
                >
                  Create RFQs
                </button>
                <button
                  className={`tab ${
                    activeTab === "draftRFQs" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("draftRFQs")}
                >
                  Draft RFQs
                </button>
              </div>

              {activeTab === "manageRFQs" && (
               <ManageRFQ/>
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
