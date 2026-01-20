import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VendorList from "./vendorList.js";
import ChatBox from "./chatBox.js";
import { listQueryMessages, listQueries, getRfqDetails, broadcastMessage } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";
import { toast } from "react-toastify";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { getEntityLabel } from "@/utils/sharedFunctions";

const QueryComponent = () => {
  const router = useRouter();
  const { rfq_id, role, token } = router.query;

  const [vendors, setVendors] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [vendorName, setVendorName] = useState("");
  const [debouncedVendorName, setDebouncedVendorName] = useState(vendorName);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

    const selectedVendors = vendors.filter((v) => selectedVendorIds.includes(v.user_id));


// Toggle selection
const handleToggleVendor = (vendorId) => {
  setSelectedVendorIds((prev) =>
    prev.includes(vendorId)
      ? prev.filter((id) => id !== vendorId)
      : [...prev, vendorId]
  );
};



  const loadVendors = async (name = "") => {
    setVendorsLoading(true);
    try {
      const payload = { rfq_id, user_name: name };
      const response = await listQueries(payload, token);
      setVendors(response.data || []);
      if (!selectedVendor && response.data?.length) {
        handleSelectVendor(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setVendorsLoading(false);
    }
  };


  const loadMessages = async () => {
    if (rfq_id && selectedVendor) {
      try {
        const payload = { rfq_id, receiver_id: selectedVendor.user_id };
        const response = await listQueryMessages(payload, token);
        setMessages(response.data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }
  };

// Handle click on vendor name (single selection)
const handleSelectVendor = (vendor) => {
  setSelectedVendorIds([vendor.user_id]);
  setSelectedVendor(vendor);
  setVendors((prev) =>
    prev.map((v) =>
      v.user_id === vendor.user_id ? { ...v, unseen_count: 0 } : v
    )
  );
};

  const loadRfqDetails = async () => {
    try {
      const response = await getRfqDetails({ rfq_id }, token);
      setRfqDetails(response.data);

      if (role === "vendor") {
        setSelectedVendor({
          user_id: response.data.created_by,
          user_name: response.data.contact_name,
          company_name: response.data.company_name
        });
      }
    } catch (error) {
      console.error("Error fetching RFQ details:", error);
    }
  };

  const handleMessageSent = async () => {
    await loadMessages();
    await loadVendors();
    await loadRfqDetails()
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedVendorName(vendorName), 500);
    return () => clearTimeout(handler);
  }, [vendorName]);

  useEffect(() => {
    if (role === "buyer") {
      loadVendors(debouncedVendorName);
    }
  }, [rfq_id, debouncedVendorName]);

  useEffect(() => {
    if (rfq_id) {
      loadRfqDetails();
    }
  }, [rfq_id, role]);

  useEffect(() => {
    loadMessages();
  }, [rfq_id, selectedVendor]);

  // When multi-select, clear single vendor view; when 1 selected, set it
  useEffect(() => {
  if (selectedVendorIds.length > 1) {
    setMessages([]);
    setSelectedVendor(null);
  } else if (selectedVendorIds.length === 1) {
    const vendor = vendors.find(v => v.user_id === selectedVendorIds[0]);
    if (vendor) {
      setSelectedVendor(vendor);
    }
    } else {
      setSelectedVendor(null);
      setMessages([]);
    }
  }, [selectedVendorIds, vendors]);

  return (
    <>
  <section className="small-size-heading buyer-common-header ">
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="heading">{`Queries for ${getEntityLabel(rfqDetails?.is_tender)}#${rfqDetails?.rfq_no}`}</h1>
      </div>
    </div>
  </section>

  <div className="container-fluid">
    <div className="row">
      {role === "buyer" ? (
        <div className="col-md-4 my-3">
          <VendorList
  vendors={vendors}
  onSelectVendor={handleSelectVendor}
  onToggleVendor={handleToggleVendor}
  selectedVendorIds={selectedVendorIds}
  vendorName={vendorName}
  setVendorName={setVendorName}
  loading={vendorsLoading}
/>
        </div>
      ) : null}

      <div
        className={`col-md-${role === "buyer" ? "8" : "12"} p-3 my-3 border rounded shadow-sm`}
        style={{ height: "65vh" }}
      >
        {messagesLoading ? (
  <div className="hasFullLoader h-100">
    <FullLoader />
  </div>
) : (
  <ChatBox
    messages={messages}
    vendor={selectedVendor}
    rfq_id={rfq_id}
    role={role}
    onMessageSent={handleMessageSent}
    vendorwithoutlogintoken={token}
    selectedVendors={selectedVendors}   // <-- PASS THE ARRAY FOR BROADCAST
  />
)}
      </div>
    </div>
 </div>
</>
  );
};

export default QueryComponent;
