import React, { useState } from "react";
import { formatDisplayDate, getEntityLabel } from "@/utils/sharedFunctions";

const statusMap = {
  QC: {
    label: "Under Review",
    icon: "bi-bar-chart-steps",
    color: "#5A3EC8",
    text: "#FFFFFF"
  },
  TE: {
    label: "Technical Evaluation",
    icon: "bi-cpu",
    color: "#198754",
    text: "#FFFFFF"
  },
  NEG: {
    label: "Negotiation",
    icon: "bi-handshake",
    color: "#D9480F",
    text: "#FFFFFF"
  },
  FIN: {
    label: "Finalization",
    icon: "bi-check2-circle",
    color: "#0FB5A9",
    text: "#073B3A"
  },
  CLOSED: {
    label: "Closed",
    icon: "bi-lock-fill",
    color: "#DC3545", // Bootstrap red
    text: "#FFFFFF"
  },
  default: {
    label: "Status Update",
    icon: "bi-flag",
    color: "#0D6EFD",
    text: "#FFFFFF"
  }
};

const QuoteStatus = ({ quoteStatus, onClose }) => {
  const [isRfqClosed] = useState(quoteStatus.rfqClosed);

  console.log("QuoteStatus Component - isRfqClosed:", isRfqClosed);

  return (
    <>
      {/* Modal */}
      <div
        className="modal fade show"
        style={{ display: "block" }}
        tabIndex="-1"
        role="dialog"
        aria-labelledby="quoteStatusModalLabel"
        aria-hidden="false"
      >
        <div className="modal-dialog modal-dialog-centered modal-md" role="document">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header bg-white border-0">
              <h5 className="modal-title fw-bold text-dark" id="quoteStatusModalLabel">
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Quote Status
              </h5>
              <button
  type="button"
  className="btn-close"
  style={{ marginRight: "-5px" }} // pull it slightly inward
  onClick={onClose}
  aria-label="Close"
></button>

            </div>

            <div className="modal-body p-2">
              {quoteStatus?.data?.length > 0 ? (
                <div className="timeline">
                  {quoteStatus.data.map((q, index) => {
                    const statusInfo = statusMap[q.current_status] || statusMap.default;
                    const statusLabel = q.current_status === "CLOSED"
                      ? `${getEntityLabel(quoteStatus?.is_tender)} Closed`
                      : statusInfo.label;
                    return (
                      <div key={q.id} className="timeline-item">
                        <div className="timeline-marker">
                          <div
                            className="marker-circle"
                            style={{ backgroundColor: statusInfo.color }}
                          >
                            <i className={`bi ${statusInfo.icon} text-white fs-6`}></i>
                          </div>
                          {index < quoteStatus.data.length - 1 && (
                            <div className="timeline-line"></div>
                          )}
                        </div>
                        <div className="timeline-details">
                          <span
                            className="fw-semibold d-block mb-1"
                            style={{ color: statusInfo.color }}
                          >
                            {statusLabel}
                          </span>
                          <small className="text-muted">
                            {formatDisplayDate(q.created_at, { includeTime: true })}
                          </small>
                        </div>
                      </div>
                    );
                  })}

                  {/* ✅ Add RFQ Closed as last timeline item */}
                  {isRfqClosed && (
                    <div className="timeline-item">
                      <div className="timeline-marker">
                        <div
                          className="marker-circle"
                          style={{ backgroundColor: statusMap.CLOSED.color }}
                        >
                          <i className={`bi ${statusMap.CLOSED.icon} text-white fs-6`}></i>
                        </div>
                      </div>
                      <div className="timeline-details">
                        <span
                          className="fw-semibold d-block mb-1"
                          style={{ color: statusMap.CLOSED.color }}
                        >
                          {getEntityLabel(quoteStatus?.is_tender)} Closed
                        </span>
                        <small className="text-muted">
                          {formatDisplayDate(new Date(), { includeTime: true })} {/* Or use closed_at if you have it */}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-muted"></i>
                  <p className="mt-3 mb-0 fw-medium text-secondary">
                    No status history yet
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer border-0">
              <button
                type="button"
                className="btn btn-primary rounded-pill px-4"
                onClick={onClose}
              >
                <i className="bi bi-x-circle me-1"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop fade show" onClick={onClose}></div>

      <style jsx>{`
        .modal-content {
  overflow: visible !important; /* prevents cropping */
}

.modal-header .btn-close {
  position: relative;
  z-index: 5; /* keeps it above rounded corners */
}

        .timeline {
          position: relative;
          margin-left: 10px;
        }
        .timeline-item {
          display: flex;
          position: relative;
          margin-bottom: 25px;
        }
        .timeline-marker {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 15px;
        }
        .marker-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
          z-index: 2;
        }
        .timeline-line {
          flex-grow: 1;
          width: 3px;
          background: linear-gradient(to bottom, #e9ecef, #dee2e6);
          margin-top: 5px;
          border-radius: 3px;
        }
        .timeline-details {
          flex: 1;
          padding-top: 5px;
        }
        .timeline-details span {
          font-size: 1rem;
        }
        .timeline-details small {
          font-size: 0.85rem;
        }
      `}</style>
    </>
  );
};

export default QuoteStatus;
