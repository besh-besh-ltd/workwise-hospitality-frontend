import { getVendorsForReminder, sendSelectiveReminder } from "@/services/rfq";
import { textCapitalize, formatRFQNumber } from "@/utils/sharedFunctions";
import moment from "moment";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "react-toastify";
import VendorSelectionModal from "@/components/modal/VendorSelectionModal";

const RFQItem = ({ data }) => {
  const [loading, setloading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);


  const list_products = () => {
    let productTitles = [];

    if (data?.products && data?.products?.length > 0) {
      data.products.map((item) => {
        if (item?.product_details && item?.product_details?.length > 0) {
          let n = item?.product_details[0].name;
          if (!productTitles.includes(n)) {
            productTitles.push(n);
          }
        }
      });

      const limitedProducts = productTitles.slice(0, 3);
      return (
        <span className="mproducts">
          {limitedProducts.map((title, index) => (
            <React.Fragment key={index}>
              {title}
              <br />
            </React.Fragment>
          ))}
        </span>
      );
    }

    return "---";
  };


  const handleOpenVendorModal = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setShowVendorModal(true);
    
    try {
      const response = await getVendorsForReminder(data.id);
      setVendors(response.data || []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      toast.error("Failed to load vendors. Please try again.");
      setShowVendorModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendSelectiveReminder = async (selectedVendorIds) => {
    try {
      const response = await sendSelectiveReminder(data.id, selectedVendorIds);
      if (response.message && response.message !== "") {
        toast.success(response.message);
        }
      setShowVendorModal(false);
    } catch (err) {
      if (err?.message?.response?.status === 403) {
          toast.warning(err?.message?.response?.data?.message);
      } else {
        toast.error(err?.message?.response?.data?.message || "Failed to send reminder");
      }
    }
  };

  const handleCloseModal = () => {
    setShowVendorModal(false);
    setVendors([]);
  };
  const isRecievedFromAll = data.vendors[0]?.total_vendors == data.vendors[0]?.quote_received;

  return (
    <>
      <tr>
        <td>
          <span className="d-block fw-semibold">{formatRFQNumber(data?.rfq_no, data?.is_tender)}</span>
          <span className="text-truncate">{data?.project_name}</span>
        </td>
        <td>{list_products()}</td>
        <td style={{ width: "190px" }}>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">Published: </b>
            {moment(data.timestamp).format("DD/MM/YYYY")}
          </span>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">End Date: </b>
            {data.bid_end_date ? moment(data.bid_end_date).format("DD/MM/YYYY") : "---"}
          </span>
          <span>
            <b className="fw-semibold ">Status: </b>
            {data.status == 1
              ? <span className="badge rounded-pill text-bg-success ms-5">Open</span>
              : <span className="badge rounded-pill text-bg-danger ms-5">Closed</span>
            }
          </span>
        </td>

        <td> {data.contact_name} </td>

        <td>{(data.rfq_type == "" || data.rfq_type == null) ? "---" : textCapitalize(data.rfq_type)}</td>
        <td>{data.reverse_auction == 1 ? "Enabled" : "Disabled"}</td>
        <td>
          <div className="d-flex flex-column gap-2">
            <Link
              href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data?.id}`}
              className="page-link"
              id={`view_rfq_${data?.id}-rfq_actions-manage_rfq_page`}
            >
              View
            </Link>
            <Link
              href={`/dashboard/buyer/rfq-management-edit?id=${data?.id}`}
              className="page-link"
              id={`edit_rfq_${data?.id}-rfq_actions-manage_rfq_page`}
            >
              Edit
            </Link>
          </div>
        </td>
        <td>
          <Link
            href={`/dashboard/buyer/query?rfq_id=${data?.id}&role=buyer`}
          >
            <button
              type="button"
              className="page-link-btn border-0 text-white p-2 my-3 rounded-2"
              style={{ width: "120px", backgroundColor: "var(--primary-color)" }}
              id={`view_queries_${data?.id}-rfq_actions-manage_rfq_page`}
            >
              Queries 
              {data.unseen_query_count > 0 && <span className="badge text-bg-danger ms-1">{data.unseen_query_count} + </span>}
            </button>
          </Link>
        </td>
        <td>

          {data.vendors.length > 0 && (
            <button
              type="button"
              onClick={!isRecievedFromAll && !data.is_finalized && handleOpenVendorModal}
              className={`page-link-btn border-0 p-2 my-3 rounded-2 ${(isRecievedFromAll || data.status == 2 || data.is_finalized) ? "btn disabled" : ""}`}
              role="button"
              disabled={isRecievedFromAll || data.status == 2 || data.is_finalized}
              aria-disabled={isRecievedFromAll}
              style={{ width: "200px", backgroundColor: data.status == 2 ? 'var(--red-color)' : data.is_finalized ? "var(--secondary-color)" : (isRecievedFromAll || isHovered) ? "var(--primary-color)" : "var(--secondary-color)" }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              id={`send_reminder_${data?.id}-rfq_actions-manage_rfq_page`}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                  ></span>{" "}
                  Processing request...
                </>
              ) : data.status == 2 ? 'RFQ has been closed' : data.is_finalized ? "All Products Finalized" : (
                isRecievedFromAll
                  ? "All Quotes Received"
                  : `Send Reminder (${data.vendors[0].total_vendors - data.vendors[0].quote_received}/${data.vendors[0].total_vendors})`
              )
              }
            </button>
          )}

        </td>
      </tr>

      <VendorSelectionModal
        isOpen={showVendorModal}
        onClose={handleCloseModal}
        onSendReminder={handleSendSelectiveReminder}
        vendors={vendors}
        loading={modalLoading}
      />
    </>
  );
};

export default RFQItem;
