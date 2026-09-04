import React from "react";
import Modal from "react-modal";
import { formatDisplayDate } from "@/utils/sharedFunctions";
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

  // CSS variables for brand colors
  const modalStyles = {
    '--primary-color': '#2E5BA8',
    '--secondary-color': '#428B41',
  };

  const formatTimestampToIST = (timestamp) => {
    if (!timestamp) return "-";
    return formatDisplayDate(timestamp, { includeTime: true });
  };

  const hasData = quoteHistory && quoteHistory.length > 0;
  const productDetails = hasData ? quoteHistory[0] : null;

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
          background: "#fff",
          borderRadius: "12px",
          padding: "0",
          width: "95%",
          maxWidth: hasData ? "1100px" : "500px",
          maxHeight: "85vh",
          overflow: "hidden",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
          ...modalStyles
        },
      }}
    >
      {/* Header */}
      <div
        className="modal-header-sticky p-4"
        style={{
          backgroundColor: 'var(--primary-color)',
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px",
        }}
      >
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center mb-2">
            <FontAwesomeIcon icon={faFileAlt} className="me-2" />
            <h4 className="mb-0 text-white">Quote History</h4>
          </div>
          {productDetails && (
            <p className="mb-0 text-white opacity-90">
              {productDetails.product_name}
            </p>
          )}
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
          maxHeight: "calc(85vh - 100px)",
        }}
      >
        {hasData ? (
          <>
            {/* Quote History Table */}
            <div className="table-responsive rounded border">
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: '#428B41' }}>
                  <tr>
                    <th className="p-3 text-black fw-semibold">#</th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faTag} className="me-2" />
                      Base Price
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faBox} className="me-2" />
                      Packaging
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faShippingFast} className="me-2" />
                      Freight
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faReceipt} className="me-2" />
                      GST
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faRupeeSign} className="me-2" />
                      Total
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Delivery
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faComment} className="me-2" />
                      Comments
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Buyer
                    </th>
                    <th className="p-3 text-black fw-semibold">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                      Date & Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {quoteHistory.map((item, index) => (
                    <tr key={item.id} className="border-bottom">
                      <td className="p-3 fw-medium">{index + 1}</td>
                      <td className="p-3">
                        <span className="badge bg-light text-dark">
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
                      <td className="p-3 fw-bold" style={{ color: 'var(--secondary-color)' }}>
                        ₹{item.total_price ?? "-"}
                      </td>
                      <td className="p-3">
                        {item.delivery_period ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(66, 139, 65, 0.1)',
                              color: 'var(--secondary-color)'
                            }}
                          >
                            {item.delivery_period} days
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3" style={{ maxWidth: "180px" }}>
                        {item.comment ? (
                          <div className="text-truncate" title={item.comment}>
                            {item.comment}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3">
                        <span className="fw-medium" style={{ color: 'var(--primary-color)' }}>
                          {item.buyer_name}
                        </span>
                      </td>
                      <td className="p-3 text-muted small">
                        {item.timestamp
                          ? formatTimestampToIST(item.timestamp)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-light rounded p-3 mt-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted">Total Quotes: </span>
                <span className="fw-bold">{quoteHistory.length}</span>
              </div>
              <div>
                <span className="text-muted">Latest Quote: </span>
                <span className="fw-bold" style={{ color: 'var(--secondary-color)' }}>
                  ₹{quoteHistory[0].total_price}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted text-center py-4 mb-0">No previous quote was submitted.</p>
        )}
      </div>

      {/* Custom CSS */}
      <style>
        {`
          .quote-history-modal {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          
          .table-hover tbody tr:hover {
            background-color: rgba(46, 91, 168, 0.05) !important;
          }
          
          .btn-close-white:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
    </Modal>
  );
};

export default VendorQuoteHistoryModal;