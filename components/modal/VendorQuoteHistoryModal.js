import React from "react";
import Modal from "react-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faFileAlt,
  faCalendarAlt,
  faBox,
  faShippingFast,
  faReceipt,
  faTag,
  faUser,
  faComment,
  faRupeeSign
} from "@fortawesome/free-solid-svg-icons";
import Vendor from "../dashboard/vendor";

const VendorQuoteHistoryModal = (props) => {
  const { showModal, closeModal, quoteHistory } = props;

  const formatTimestampToIST = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);

    const day = istDate.getDate().toString().padStart(2, "0");
    const month = istDate.toLocaleString("en-US", { month: "short" });
    const year = istDate.getFullYear();
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");

    return `${day}-${month}-${year} ${formattedHours}:${minutes}${ampm}`;
  };

  if (!quoteHistory || quoteHistory.length === 0) {
    return null;
  }

  const productDetails = quoteHistory[0];

  return (
    <Modal
      isOpen={showModal}
      onRequestClose={closeModal}
      ariaHideApp={false}
      contentLabel="Quote History"
      className="quote-history-modal"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(5px)",
          zIndex: 10000,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px"
        },
        content: {
          position: "relative",
          inset: "auto",
          border: "none",
          background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)",
          borderRadius: "16px",
          padding: "0",
          width: "95%",
          maxWidth: "1200px",
          maxHeight: "90vh",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        }
      }}
    >
      {/* Header */}
      <div className="modal-header-sticky" style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        color: "white",
        padding: "1.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px"
      }}>
        <div className="d-flex align-items-center">
          <FontAwesomeIcon icon={faFileAlt} className="me-3" size="lg" />
          <h3 className="mb-0" style={{ fontWeight: 600 }}>Quote History</h3>
        </div>
        <button 
          onClick={closeModal} 
          className="btn-close-white"
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: "1.5rem",
            cursor: "pointer"
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      {/* Body */}
      <div className="modal-body-custom p-4" style={{
        overflowY: "auto",
        maxHeight: "calc(90vh - 100px)"
      }}>
        {/* Product Info Card */}
        <div className="product-info-card" style={{
          background: "white",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h5 style={{ 
                color: "#4f46e5", 
                marginBottom: "0.5rem",
                fontWeight: 600
              }}>
                {productDetails.product_name}
              </h5>
              <p className="text-muted mb-0">
                RFQ #: {productDetails.rfq_no}
              </p>
            </div>
            <div className="d-flex mt-2 mt-md-0">
              <div className="me-3">
                <small className="text-muted d-block">Quantity</small>
                <span style={{ fontWeight: 600 }}>{productDetails.quantity}</span>
              </div>
              <div>
                <small className="text-muted d-block">Variant</small>
                <span style={{ fontWeight: 600 }}>{productDetails.variant || "Standard"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quote History Table */}
        <div className="table-container" style={{
          background: "white",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
              }}>
                <tr>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>#</th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faTag} className="me-2" />
                    Base Price
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faBox} className="me-2" />
                    Packaging
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faShippingFast} className="me-2" />
                    Freight
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faReceipt} className="me-2" />
                    GST
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faRupeeSign} className="me-2" />
                    Total
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Delivery
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faComment} className="me-2" />
                    Comments
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Buyer
                  </th>
                  <th style={{ padding: "1rem", fontWeight: 600 }}>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Date & Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {quoteHistory.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "1rem", fontWeight: 500 }}>{index + 1}</td>
                    <td style={{ padding: "1rem" }}>
                      <span className="price-tag">₹{item.unit_price ?? "-"}</span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {item.package_price ? (
                        <>
                          <span className="value">{item.package_price}</span>
                          <span className="unit">{item.package_mode === "percentage" ? "%" : "₹"}</span>
                        </>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {item.freight_price ? (
                        <>
                          <span className="value">{item.freight_price}</span>
                          <span className="unit">{item.freight_mode === "percentage" ? "%" : "₹"}</span>
                        </>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {item.tax ? (
                        <>
                          <span className="value">{item.tax}</span>
                          <span className="unit">{item.tax_mode === "percentage" ? "%" : "₹"}</span>
                        </>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 600, color: "#059669" }}>
                      ₹{item.total_price ?? "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {item.delivery_period ? (
                        <span className="delivery-badge">
                          {item.delivery_period} days
                        </span>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "1rem", maxWidth: "200px" }}>
                      {item.comment ? (
                        <div className="comment-text" title={item.comment}>
                          {item.comment.length > 30 
                            ? `${item.comment.substring(0, 30)}...` 
                            : item.comment
                          }
                        </div>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span className="buyer-name">{item.buyer_name}</span>
                    </td>
                    <td style={{ padding: "1rem", color: "#64748b", fontSize: "0.9rem" }}>
                      {item.timestamp ? formatTimestampToIST(item.timestamp) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {quoteHistory.length > 0 && (
          <div className="summary-card mt-3" style={{
            background: "white",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted">Total Quotes: </span>
                <span className="fw-bold">{quoteHistory.length}</span>
              </div>
              <div>
                <span className="text-muted">Latest Quote: </span>
                <span className="fw-bold">
                  ₹{quoteHistory[0].total_price}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS */}
      <style>
        {`
          .quote-history-modal {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          
          .price-tag {
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
            color: #1e293b;
          }
          
          .value {
            font-weight: 500;
            margin-right: 2px;
          }
          
          .unit {
            font-size: 0.8rem;
            color: #64748b;
          }
          
          .delivery-badge {
            background: #dcfce7;
            color: #166534;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 500;
          }
          
          .comment-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .buyer-name {
            font-weight: 500;
            color: #4f46e5;
          }
          
          .table-hover tbody tr:hover {
            background-color: #f8fafc;
          }
          
          .btn-close-white:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
    </Modal>
  );
};

export default VendorQuoteHistoryModal;