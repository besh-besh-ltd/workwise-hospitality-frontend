import { getVendorsForReminder, sendSelectiveReminder } from "@/services/rfq";
import { textCapitalize, formatRFQNumber } from "@/utils/sharedFunctions";
import moment from "moment";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Badge } from "react-bootstrap";
import { BsExclamationCircleFill } from "react-icons/bs";
import VendorSelectionModal from "@/components/modal/VendorSelectionModal";
import { checkOpenClarification } from "@/services/clarification";

const RFQItem = ({ data, showReminder = true, isPendingApproval = false }) => {
  const [loading, setloading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [hasOpenClarification, setHasOpenClarification] = useState(false);

  // Check for open clarifications (only for tenders)
  useEffect(() => {
    const fetchClarificationStatus = async () => {
      if (data?.is_tender === 1 && data?.id) {
        try {
          const result = await checkOpenClarification(data.id);
          setHasOpenClarification(result.hasOpen);
        } catch (error) {
          console.error("Error checking clarification status:", error);
        }
      }
    };
    fetchClarificationStatus();
  }, [data?.id, data?.is_tender]);


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

  // Pending approval row styling
  const rowStyle = isPendingApproval
    ? {
        backgroundColor: "#fff8e6",
        borderLeft: "4px solid #ffc107",
      }
    : {};

  return (
    <>
      <tr style={rowStyle}>
        <td>
          <span className="d-block fw-semibold">{formatRFQNumber(data?.rfq_no, data?.is_tender)}</span>
          <span className="text-truncate">{data?.project_name}</span>
          {isPendingApproval && (
            <Badge bg="warning" text="dark" className="mt-1 d-flex align-items-center gap-1" style={{ width: "fit-content" }}>
              <BsExclamationCircleFill size={10} />
              Awaiting Your Approval
            </Badge>
          )}
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
            {isPendingApproval ? (
              <Link
                href={`/dashboard/vendor/inquiries-details?type=buyer-view&id=${data?.id}`}
                className="btn btn-warning btn-sm p-2 border-0 rounded-2 d-flex align-items-center justify-content-center gap-1"
                style={{ minWidth: "140px" }}
                id={`approve_rfq_${data?.id}-rfq_actions-pending_approval_page`}
              >
                <BsExclamationCircleFill size={14} />
                View & Approve
              </Link>
            ) : (
              <>
                <Link
                  href={`/dashboard/vendor/inquiries-details?type=buyer-view&id=${data?.id}`}
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
              </>
            )}
          </div>
        </td>
        <td>
          <Link
            href={`/dashboard/buyer/query?rfq_id=${data?.id}&role=buyer`}
          >
            <button
              type="button"
              className="page-link-btn border-0 text-white p-2 rounded-2"
              style={{ width: "120px", backgroundColor: "var(--primary-color)" }}
              id={`view_queries_${data?.id}-rfq_actions-manage_rfq_page`}
            >
              Queries
              {data.unseen_query_count > 0 && <span className="badge text-bg-danger ms-1">{data.unseen_query_count} + </span>}
            </button>
          </Link>
          {/* Clarifications Button - Only for Tenders */}
          {data?.is_tender === 1 && (
            <Link
              href={`/dashboard/buyer/clarification-management?rfq_id=${data?.id}`}
              className="d-block mt-2"
            >
              <button
                type="button"
                className="page-link-btn border-0 text-white p-2 rounded-2 position-relative"
                style={{
                  width: hasOpenClarification ? "145px" : "120px",
                  backgroundColor: hasOpenClarification ? "#dc3545" : "#ffc107",
                  color: hasOpenClarification ? "#fff" : "#000"
                }}
                id={`view_clarifications_${data?.id}-rfq_actions-manage_rfq_page`}
              >
                Clarifications
                {hasOpenClarification && (
                  <Badge
                    bg="light"
                    text="danger"
                    className="ms-1"
                    style={{ fontSize: "0.65rem" }}
                  >
                    OPEN
                  </Badge>
                )}
              </button>
            </Link>
          )}
        </td>
        {showReminder && (
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
        )}
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
