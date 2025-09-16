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
          padding: "20px",
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
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      {/* Header with Product Name */}
      <div
        className="modal-header-sticky bg-primary text-white p-4"
        style={{
          backgroundColor: '#2E5BA8',
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
        }}
      >
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center mb-2">
            <FontAwesomeIcon icon={faFileAlt} className="me-3" size="lg" />
            <h3 className="mb-0" style={{ fontWeight: 600 }}>
              Quote History
            </h3>
          </div>
          <h5 className="mb-0 text-light fw-normal">
            {productDetails.product_name}
          </h5>
        </div>
        <button
          onClick={closeModal}
          className="btn-close btn-close-white"
          aria-label="Close"
        />
      </div>

      {/* Body */}
      <div
        className="modal-body-custom p-4"
        style={{
          overflowY: "auto",
          maxHeight: "calc(90vh - 120px)",
        }}
      >
        {/* Quote History Table */}
        <div
          className="table-container bg-white rounded shadow-sm"
          style={{
            overflow: "hidden",
          }}
        >
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-secondary text-dark">
                <tr>
                  <th className="p-3 fw-semibold">#</th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faTag} className="me-2" />
                      Base Price
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faBox} className="me-2" />
                      Packaging
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faShippingFast} className="me-2" />
                      Freight
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faReceipt} className="me-2" />
                      GST
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faRupeeSign} className="me-2" />
                      Total
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Delivery
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faComment} className="me-2" />
                      Comments
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Buyer
                    </div>
                  </th>
                  <th className="p-3 fw-semibold">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Date & Time
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {quoteHistory.map((item, index) => (
                  <tr key={item.id} className="border-bottom">
                    <td className="p-3 fw-medium">{index + 1}</td>
                    <td className="p-3">
                      <span className="badge bg-light text-dark fs-6">
                        ₹{item.unit_price ?? "-"}
                      </span>
                    </td>
                    <td className="p-3">
                      {item.package_price ? (
                        <span className="d-inline-flex align-items-center">
                          <span className="fw-medium me-1">{item.package_price}</span>
                          <small className="text-muted">
                            {item.package_mode === "percentage" ? "%" : "₹"}
                          </small>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      {item.freight_price ? (
                        <span className="d-inline-flex align-items-center">
                          <span className="fw-medium me-1">{item.freight_price}</span>
                          <small className="text-muted">
                            {item.freight_mode === "percentage" ? "%" : "₹"}
                          </small>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      {item.tax ? (
                        <span className="d-inline-flex align-items-center">
                          <span className="fw-medium me-1">{item.tax}</span>
                          <small className="text-muted">
                            {item.tax_mode === "percentage" ? "%" : "₹"}
                          </small>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 fw-bold text-success">
                      ₹{item.total_price ?? "-"}
                    </td>
                    <td className="p-3">
                      {item.delivery_period ? (
                        <span className="badge bg-success bg-opacity-10 text-success">
                          {item.delivery_period} days
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3" style={{ maxWidth: "200px" }}>
                      {item.comment ? (
                        <div className="text-truncate" title={item.comment}>
                          {item.comment}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      <span className="fw-medium text-primary">{item.buyer_name}</span>
                    </td>
                    <td className="p-3 text-muted small" style={{ minWidth: "150px" }}>
                      {item.timestamp
                        ? formatTimestampToIST(item.timestamp)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {quoteHistory.length > 0 && (
          <div className="bg-light rounded p-3 mt-3 d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted">Total Quotes: </span>
              <span className="fw-bold">{quoteHistory.length}</span>
            </div>
            <div>
              <span className="text-muted">Latest Quote: </span>
              <span className="fw-bold text-success">₹{quoteHistory[0].total_price}</span>
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
          
          .table-hover tbody tr:hover {
            background-color: rgba(13, 110, 253, 0.05) !important;
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