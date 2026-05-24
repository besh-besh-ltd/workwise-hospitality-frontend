import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VendorList from "./vendorList.js";
import ChatBox from "./chatBox.js";
import { listQueryMessages, listQueries, getRfqDetails, broadcastMessage } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";
import { toast } from "react-toastify";
import { getEntityLabel } from "@/utils/sharedFunctions";

const QueryComponent = () => {
  const router = useRouter();
  const { rfq_id, role, token, vendor_id, from_tech_eval, vendor_code, source } = router.query;

  const [vendors, setVendors] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [vendorName, setVendorName] = useState("");
  const [debouncedVendorName, setDebouncedVendorName] = useState(vendorName);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  // Check if we're in tech evaluation mode
  const isFromTechEval = from_tech_eval === '1';

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
      const rawVendors = response.data || [];

      // Enrich vendors with a display_name and vendor_code
      // Mask vendor names when coming from RFQ management (pre-commercial stage) or for tenders
      const isTender = rfqDetails?.is_tender === 1 || rfqDetails?.is_tender === "1";
      const shouldMaskVendors = isTender || source === 'rfq-management';
      const normalizedVendors = rawVendors.map((v) => {
        const vendor_code = `Vendor #${v.user_id}`;

        let display_name;
        if (shouldMaskVendors) {
          display_name = vendor_code;
        } else {
          display_name =
            v.company_name ||
            v.user_name ||
            v.name ||
            vendor_code;
        }

        return {
          ...v,
          display_name,
          vendor_code: shouldMaskVendors ? vendor_code : null,
        };
      });

      // If from tech evaluation, filter to show only selected vendor
      const filteredVendors = isFromTechEval && vendor_id
        ? normalizedVendors.filter(v => String(v.user_id) === String(vendor_id))
        : normalizedVendors;

      setVendors(filteredVendors);

      // Auto-select vendor from URL param, otherwise pick first
      if (!selectedVendor && filteredVendors.length) {
        const vendorFromUrl = vendor_id
          ? filteredVendors.find(v => String(v.user_id) === String(vendor_id))
          : null;
        handleSelectVendor(vendorFromUrl || filteredVendors[0]);
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

  // When RFQ details (particularly is_tender) load after vendors,
  // re-normalize vendor display names once to respect anonymity rules.
  useEffect(() => {
    if (!rfqDetails || vendors.length === 0) return;

    const isTender = rfqDetails.is_tender === 1 || rfqDetails.is_tender === "1";
    const shouldMask = isTender || source === 'rfq-management';
    if (!shouldMask) return;

    setVendors(prev =>
      prev.map((v) => {
        const vendor_code = `Vendor #${v.user_id}`;
        return { ...v, display_name: vendor_code, vendor_code };
      })
    );
  }, [rfqDetails?.is_tender, source]);

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
    <div className="query-page-root">
      <section className="query-page-header">
        <h1 className="heading">
          {isFromTechEval
            ? `Technical Evaluation Query - ${vendor_code || 'Vendor'}`
            : `Queries for ${getEntityLabel(rfqDetails?.is_tender)}#${rfqDetails?.rfq_no}`}
        </h1>
      </section>

      <div className="query-page-body">
        {role === "buyer" && !isFromTechEval ? (
          <div className="query-vendor-panel">
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

        <div className="query-chat-panel">
          {messagesLoading ? (
            <div className="hasFullLoader h-100">
              <FullLoader />
            </div>
          ) : (
            <ChatBox
              messages={messages}
              vendor={isFromTechEval && vendor_code ? { ...selectedVendor, display_name: vendor_code } : selectedVendor}
              rfq_id={rfq_id}
              role={role}
              onMessageSent={handleMessageSent}
              vendorwithoutlogintoken={token}
              selectedVendors={selectedVendors}
              isTender={rfqDetails?.is_tender === 1}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryComponent;
