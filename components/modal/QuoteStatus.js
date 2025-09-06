import React from "react";

const statusMap = {
  QC: { label: "Quote Compare", icon: "bi-bar-chart-steps", color: "#6f42c1" },
  TE: { label: "Technical Evaluation", icon: "bi-cpu", color: "#198754" },
  default: { label: "Status Update", icon: "bi-flag", color: "#0d6efd" }
};

const QuoteStatus = ({ quoteStatus, onClose }) => {
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
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body px-4 py-4">
              {quoteStatus.length > 0 ? (
                <div className="timeline">
                  {quoteStatus.map((q, index) => {
                    const statusInfo = statusMap[q.current_status] || statusMap.default;
                    return (
                      <div key={q.id} className="timeline-item">
                        <div className="timeline-marker">
                          <div
                            className="marker-circle"
                            style={{ backgroundColor: statusInfo.color }}
                          >
                            <i className={`bi ${statusInfo.icon} text-white fs-6`}></i>
                          </div>
                          {index < quoteStatus.length - 1 && (
                            <div className="timeline-line"></div>
                          )}
                        </div>
                        <div className="timeline-details">
                          <span
                            className="fw-semibold d-block mb-1"
                            style={{ color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                          <small className="text-muted">
                            {new Date(q.created_at).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    );
                  })}
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
