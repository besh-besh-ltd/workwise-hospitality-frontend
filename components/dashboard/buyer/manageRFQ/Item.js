import { getVendorsForReminder, sendSelectiveReminder } from "@/services/rfq";
import { textCapitalize, formatRFQNumber, getRFQPublishState, canEditRfq } from "@/utils/sharedFunctions";
import moment from "moment";
// `timestamp` is a UTC wall clock — see the note on the two conventions in ViewRFQ.js.
import { parseNegotiationTime } from "@/utils/negotiationTime";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { BsExclamationCircleFill, BsClockFill, BsCheckCircleFill } from "react-icons/bs";
import VendorSelectionModal from "@/components/modal/VendorSelectionModal";
import PublishDateTimer from "@/components/shared/PublishDateTimer";
const RFQItem = ({ data, showReminder = true, isPendingApproval = false }) => {
  const [loading, setloading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // WH-69: edit permission helper
  const currentUser = useSelector((state) => state.userProfile);
  const editPermission = canEditRfq(data, currentUser);


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

  // Get RFQ publish state for status badges and button visibility
  const publishState = getRFQPublishState(data);

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
          {data?.title && <span className="d-block fw-bold" title={data.title}>{data.title}</span>}
          <span className="d-block">{formatRFQNumber(data?.rfq_no, data?.is_tender)}</span>
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
            {moment(parseNegotiationTime(data.timestamp)).utcOffset(330).format("DD-MM-YYYY")}
          </span>
          <span className="d-flex justify-content-between">
            <b className="fw-semibold">End Date: </b>
            {data.bid_end_date ? moment(data.bid_end_date).format("DD-MM-YYYY hh:mm A") : "---"}
          </span>
          <span>
            <b className="fw-semibold ">Status: </b>
            {publishState.isPendingApproval ? (
              <span
                className="badge rounded-pill ms-2 d-inline-flex align-items-center gap-1"
                style={{ backgroundColor: '#ffc107', color: '#664d03' }}
              >
                <BsClockFill size={10} />
                Pending Approval
              </span>
            ) : publishState.isReadyToPublish ? (
              <span
                className="badge rounded-pill ms-2 d-inline-flex align-items-center gap-1"
                style={{ backgroundColor: '#cff4fc', color: '#055160' }}
              >
                <BsCheckCircleFill size={10} />
                Ready to Publish
              </span>
            ) : data.status == 1 ? (
              <span
                className="badge rounded-pill ms-5"
                style={{ backgroundColor: '#d1e7dd', color: '#0f5132' }}
              >
                Open
              </span>
            ) : data.close_comment ? (
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id={`close-info-${data?.id}`}>{data.close_comment}</Tooltip>}
              >
                <span
                  className="badge rounded-pill ms-5"
                  style={{ backgroundColor: '#e9ecef', color: '#495057', cursor: 'pointer' }}
                >
                  Closed
                </span>
              </OverlayTrigger>
            ) : (
              <span
                className="badge rounded-pill ms-5"
                style={{ backgroundColor: '#e9ecef', color: '#495057' }}
              >
                Closed
              </span>
            )}
          </span>
          {publishState.isUnpublished && data.tender_publish_date && (
            <span className="d-block mt-1">
              <PublishDateTimer publishDate={data.tender_publish_date} />
            </span>
          )}
        </td>

        <td> {data.contact_name} </td>

        <td>{data.is_tender === 1 ? "---" : ((data.rfq_type == "" || data.rfq_type == null) ? "---" : textCapitalize(data.rfq_type))}</td>
        <td>{data.reverse_auction == 1 ? "Enabled" : "Disabled"}</td>
        <td>
          <div className="d-flex flex-column gap-2">
            {isPendingApproval ? (
              <Link
                href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data?.id}`}
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
                  href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data?.id}`}
                  className="page-link"
                  id={`view_rfq_${data?.id}-rfq_actions-manage_rfq_page`}
                >
                  View
                </Link>
                {/* WH-69: Edit link gated by canEditRfq() — disabled with
                    a hover tooltip when the user can't edit. */}
                {editPermission.allowed ? (
                  <Link
                    href={publishState.editUrl(data?.id)}
                    className="page-link"
                    id={`edit_rfq_${data?.id}-rfq_actions-manage_rfq_page`}
                  >
                    Edit
                  </Link>
                ) : (
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`edit-disabled-${data?.id}`}>
                        {editPermission.reason}
                      </Tooltip>
                    }
                  >
                    <span className="d-inline-block">
                      <span
                        className="page-link"
                        style={{
                          opacity: 0.5,
                          cursor: 'not-allowed',
                          pointerEvents: 'none'
                        }}
                        id={`edit_rfq_${data?.id}-rfq_actions-manage_rfq_page`}
                      >
                        Edit
                      </span>
                    </span>
                  </OverlayTrigger>
                )}
              </>
            )}
          </div>
        </td>
        {!isPendingApproval && !publishState.isPrePublishState && (
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
          </td>
        )}
        {showReminder && !publishState.isPrePublishState && (
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
                ) : data.status == 2 ? 'Tender / RFQ has been closed' : data.is_finalized ? "All Products Finalized" : (
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
