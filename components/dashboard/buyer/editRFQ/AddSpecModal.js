import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const AddSpecModal = ({
  headerTitle,
  isOpen,
  onEntry,
  onClose,
}) => {
  const [specData, setSpecData] = useState({
    Quantity: null,
    Unit: null,
  })

  return (
    <>
      {isOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 1040,
            }}
          ></div>
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1050 }}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
              style={{ maxWidth: "80vw", width: "80vw" }}
            >
              <div className="modal-content">
                <div
                  className="modal-header"
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <h5 className="modal-title">{headerTitle}</h5>
                  <button
                    className="btn btn-primary"
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    style={{
                      fontSize: 24,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                    }}
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div
                  style={{
                    padding: "0 1.25rem",
                  }}
                  className="modal-body details-table"
                >
                  <div className="mb-3">
                    <label className="form-label fw-medium">Quantity</label>
                    <input
                      type="text"
                      name="quantity"
                      className={`form-control`}
                      value={specData.Quantity}
                      placeholder="Please enter Quantity"
                      onChange={(e) => {
                        setSpecData(prev => ({
                          ...prev,
                          Quantity: e.target.value
                        }));
                      }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">Unit</label>
                    <input
                      type="text"
                      name="unit"
                      className={`form-control`}
                      value={specData.Unit}
                      placeholder="Please enter Unit"
                      onChange={(e) => {
                        setSpecData(prev => ({
                          ...prev,
                          Unit: e.target.value
                        }));
                      }}
                    />
                  </div>
                  <div className="mb-3 d-flex justify-content-end">
                    <button onClick={() => onEntry(specData)} className="btn btn-success text-white align-middle">
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AddSpecModal;
