import React, { useEffect, useState } from 'react';
import Modal from "react-modal";

const VendorSelectionModal = ({
  isOpen,
  onClose,
  onSendReminder,
  vendors = [],
  loading = false
}) => {
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedVendors([]);
    }
  }, [isOpen]);

  const handleVendorToggle = (vendorId) => {
    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(vendors.map(vendor => vendor.user_id));
    }
  };

  const handleSendReminder = async () => {
    if (selectedVendors.length === 0) return;
    
    setSendLoading(true);
    try {
      await onSendReminder(selectedVendors);
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      contentLabel="Select Vendors for Reminder"
      className="contact-modal contact-modal-new"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
        },
        content: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "90vw",
          width: "600px",
          border: "none",
          background: "transparent",
          overflow: "hidden",
          padding: "30px",
          maxHeight: "90vh",
          height: "auto",
        },
      }}
    >
      <div className="modal-header">
        <button
          onClick={onClose}
          className="btn-close"
          aria-label="Close"
        ></button>
      </div>

      <div className="modal-body">
        <div className="p-4">
          <h4 className="mb-4 text-center">Select Vendors for Reminder</h4>
          
          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading vendors...</p>
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-center">No vendors need reminders for this RFQ.</p>
          ) : (
            <>
              {/* Select All Checkbox */}
              <div className="mb-3 p-3 border rounded">
                <label className="form-check-label d-flex align-items-center">
                  <input
                    type="checkbox"
                    className="form-check-input me-3"
                    checked={selectedVendors.length === vendors.length && vendors.length > 0}
                    onChange={handleSelectAll}
                  />
                  <strong>Select All ({vendors.length} vendors)</strong>
                </label>
              </div>

              {/* Vendor List */}
              <div className="vendor-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {vendors.map((vendor) => (
                  <div key={vendor.user_id} className="mb-2 p-3 border rounded">
                    <label className="form-check-label d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input me-3 mt-1"
                        checked={selectedVendors.includes(vendor.user_id)}
                        onChange={() => handleVendorToggle(vendor.user_id)}
                      />
                      <div className="flex-grow-1">
                        <div className="fw-bold">{vendor.vendor_name}</div>
                        <div className="text-muted small">{vendor.email}</div>
                        {vendor.remainingProducts && vendor.remainingProducts.length > 0 && (
                          <div className="text-warning small mt-1">
                            Pending products: {vendor.remainingProducts.map(p => p.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between mt-4">
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={sendLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReminder}
                  className="btn btn-primary"
                  disabled={selectedVendors.length === 0 || sendLoading}
                >
                  {sendLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Sending...
                    </>
                  ) : (
                    `Send Reminder (${selectedVendors.length})`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VendorSelectionModal; 