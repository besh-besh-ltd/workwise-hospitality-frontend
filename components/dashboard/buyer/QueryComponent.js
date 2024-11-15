import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VendorList from "./vendorList.js";
import ChatBox from "./chatBox.js";
import { listQueryMessages, listQueries, getRfqDetails } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";

const QueryComponent = () => {
  const router = useRouter();
  const { rfq_id, role } = router.query;

  const [vendors, setVendors] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [vendorName, setVendorName] = useState("");
  const [debouncedVendorName, setDebouncedVendorName] = useState(vendorName);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const loadVendors = async (name = "") => {
    setVendorsLoading(true);
    try {
      const payload = { rfq_id, user_name: name };
      const response = await listQueries(payload);
      setVendors(response.data);
      if (!selectedVendor) {
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
      setMessagesLoading(true);
      try {
        const payload = { rfq_id, receiver_id: selectedVendor.user_id };
        const response = await listQueryMessages(payload);
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setMessagesLoading(false);
      }
    }
  };

  const handleSelectVendor = (vendor) => {
    setSelectedVendor(vendor);
    setVendors((prevVendors) =>
      prevVendors.map((v) =>
        v.user_id === vendor.user_id ? { ...v, unseen_count: 0 } : v
      )
    );
  };

  const loadRfqDetails = async () => {
    try {
      const response = await getRfqDetails({ rfq_id });
      setRfqDetails(response.data);

      if (role === "vendor") {
        setSelectedVendor({
          user_id: response.data.created_by,
          user_name: response.data.contact_name,
        });
      }
    } catch (error) {
      console.error("Error fetching RFQ details:", error);
    }
  };

  const handleMessageSent = async () => {
    await loadMessages();
    await loadVendors();
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

  return (
    <>
      <section className="small-size-heading buyer-common-header">
        <div className="container-fluid">
          <h1 className="heading">{`Queries for RFQ#${rfqDetails?.rfq_no}`}</h1>
        </div>
      </section>
      <div className="container-fluid">
        <div className="row">
          {role === "buyer" ? (
            <div className="col-md-4 my-3">
              <VendorList
                vendors={vendors}
                onSelectVendor={handleSelectVendor}
                vendorName={vendorName}
                setVendorName={setVendorName}
                loading={vendorsLoading}
              />
            </div>
          ) : null}
          <div
            className={`col-md-${
              role === "buyer" ? "8" : "12"
            } p-3 my-3 border rounded shadow-sm`}
            style={{ height: "65vh" }}
          >
            {messagesLoading ? (
              <div className="hasFullLoader h-100">
                <FullLoader />
              </div>
            ) : selectedVendor ? (
              <ChatBox
                messages={messages}
                vendor={selectedVendor}
                rfq_id={rfq_id}
                onMessageSent={handleMessageSent}
              />
            ) : (
              <p>Select a vendor to view messages</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default QueryComponent;
