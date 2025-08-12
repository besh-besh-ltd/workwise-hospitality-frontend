import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VendorList from "./vendorList.js";
import ChatBox from "./chatBox.js";
import { listQueryMessages, listQueries, getRfqDetails, broadcastMessage } from "@/services/rfq";
import FullLoader from "@/components/shared/FullLoader";
import BroadcastModal from "@/components/shared/BroadcastModal.js";
import { toast } from "react-toastify";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";

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
  const [broadcastPayload , setBroadcastPayload] = useState({});
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const loadVendors = async (name = "") => {
    setVendorsLoading(true);
    try {
      const payload = { rfq_id, user_name: name };
      const response = await listQueries(payload, token);
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
  
 const handleBroadCastMessage = async (message) => {
  let payload = {
    receiver_ids: [], // initialize as array
    rfq_id: rfqDetails.id,
    message_text: message
  };

  if (vendors.length > 0) {
    vendors.forEach((vendor) => {
      payload.receiver_ids.push({id : vendor.user_id});
    });
  }

  const res =  await broadcastMessage(payload);

  if(res){
    toast.success("Message sent to All vendors")
  }
  else {
    toast.error("Can not deliver message to Vendors")
  }

};

  
  const loadMessages = async () => {
    if (rfq_id && selectedVendor) {
      // setMessagesLoading(true);
      try {
        const payload = { rfq_id, receiver_id: selectedVendor.user_id };
        const response = await listQueryMessages(payload, token);
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
      //  finally {
      //   setMessagesLoading(false);
      // }
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
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="heading">{`Queries for RFQ#${rfqDetails?.rfq_no}`}</h1>
        {role === "buyer" && (
          <Button
            className="page-link backBtn btn btn-secondary text-white px-2"
            style={{ minWidth: "280px" }}
            onClick={() => setShowBroadcastModal(true)}
          >
            {" "}
              <FontAwesomeIcon
                icon={faWandMagicSparkles}
                className="me-2"
              />{" "}
            Broadcast Message
          </Button>
        )}
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
            role={role}
            onMessageSent={handleMessageSent}
            vendorwithoutlogintoken={token}
          />
        ) : (
          <p>Select a vendor to view messages</p>
        )}
      </div>
    </div>
    
    {/* Broadcast Modal */}
    {role === "buyer" && (
      <BroadcastModal
        show={showBroadcastModal}
        onHide={() => setShowBroadcastModal(false)}
        onSendMessage={handleBroadCastMessage}
        vendorCount={vendors.length}
        loading={false} // you can wire your loading state here
        rfqNumber={rfqDetails?.rfq_no}
      />
    )}
  </div>
</>
  );
};

export default QueryComponent;
