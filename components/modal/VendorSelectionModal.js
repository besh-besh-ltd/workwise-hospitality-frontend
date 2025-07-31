import React, { useEffect, useState, useMemo } from 'react';
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

  // Calculate total products and handle duplicate names
  const { totalGlobalProducts, processedVendors } = useMemo(() => {
    let totalGlobal = 0;
    const processed = vendors.map(vendor => {
      const remainingProducts = vendor.remainingProducts || [];
      totalGlobal += remainingProducts.length;
      
      // Handle duplicate product names
      const productNameCounts = {};
      const processedProducts = remainingProducts.map(product => {
        const productKey = product.name;
        if (!productNameCounts[productKey]) {
          productNameCounts[productKey] = 0;
        }
        productNameCounts[productKey]++;
        
        const displayName = productNameCounts[productKey] === 1 
          ? product.name 
          : `${product.name} - ${productNameCounts[productKey] - 1}`;
        
        return {
          ...product,
          displayName
        };
      });
      
      return {
        ...vendor,
        remainingProducts: processedProducts,
        totalVendorProducts: remainingProducts.length
      };
    });
    
    return { totalGlobalProducts: totalGlobal, processedVendors: processed };
  }, [vendors]);

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
              {/* Global Summary */}
              <div className="alert alert-info mb-4" style={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Total Products Pending:</strong> {totalGlobalProducts}
                  </div>
                  <div>
                    <strong>Total Vendors:</strong> {vendors.length}
                  </div>
                </div>
              </div>

              {/* Select All Checkbox */}
              <div className="mb-3 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
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
              <div className="vendor-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {processedVendors.map((vendor) => (
                  <div key={vendor.user_id} className="mb-3 p-3 border rounded shadow-sm" style={{ backgroundColor: 'white' }}>
                    <label className="form-check-label d-flex align-items-start w-100">
                      <input
                        type="checkbox"
                        className="form-check-input me-3 mt-1"
                        checked={selectedVendors.includes(vendor.user_id)}
                        onChange={() => handleVendorToggle(vendor.user_id)}
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="fw-bold text-primary">{vendor.vendor_name}</div>
                          <span className="badge bg-warning text-dark">
                            {vendor.totalVendorProducts} pending
                          </span>
                        </div>
                        {vendor.remainingProducts && vendor.remainingProducts.length > 0 && (
                          <div className="mt-3">
                            <small className="text-info fw-semibold d-block mb-2">
                              Pending Products ({vendor.totalVendorProducts}):
                            </small>
                            <div className="d-flex flex-wrap gap-1">
                              {vendor.remainingProducts.slice(0, 4).map((product, idx) => (
                                <span key={idx} className="badge bg-light text-dark border me-1 mb-1">
                                  {product.displayName}
                                </span>
                              ))}
                              {vendor.remainingProducts.length > 4 && (
                                <span className="badge bg-info text-white">
                                  +{vendor.remainingProducts.length - 4} more
                                </span>
                              )}
                            </div>
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