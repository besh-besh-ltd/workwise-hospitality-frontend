import React, { useEffect, useState, useMemo } from 'react';
import Modal from "react-modal";

const VendorSelectionModal = ({
  isOpen,
  onClose,
  onSendReminder,
  vendors = [],
  loading = false,
  isTender = false
}) => {
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [sendLoading, setSendLoading] = useState(false);

  // Reset selection whenever modal closes or vendor list changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVendors([]);
      return;
    }

    // For tenders, always pre‑select ALL vendors and keep them selected.
    if (isTender && vendors.length > 0) {
      setSelectedVendors(vendors.map(v => v.user_id));
    }
  }, [isOpen, isTender, vendors]);

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
    // For tenders we always send reminders to ALL vendors; do not allow per‑vendor toggling
    if (isTender) return;

    setSelectedVendors(prev => {
      if (prev.includes(vendorId)) {
        return prev.filter(id => id !== vendorId);
      } else {
        return [...prev, vendorId];
      }
    });
  };

  const handleSelectAll = () => {
    // For tenders, "Select All" is effectively always on – nothing to toggle
    if (isTender) {
      setSelectedVendors(vendors.map(vendor => vendor.user_id));
      return;
    }

    if (selectedVendors.length === vendors.length) {
      setSelectedVendors([]);
    } else {
      setSelectedVendors(vendors.map(vendor => vendor.user_id));
    }
  };

  const handleSendReminder = async () => {
    // For tenders, reminders must go to ALL visible vendors (no names shown)
    const targetVendorIds = isTender
      ? vendors.map(vendor => vendor.user_id)
      : selectedVendors;

    if (targetVendorIds.length === 0) return;
    
    setSendLoading(true);
    try {
      await onSendReminder(targetVendorIds);
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
      className="contact-modal contact-modal-new vendor-selection-modal"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        },
        content: {
          position: "relative",
          top: "auto",
          left: "auto",
          right: "auto",
          bottom: "auto",
          transform: "none",
          maxWidth: "95vw",
          width: "600px",
          maxHeight: "90vh",
          height: "auto",
          border: "none",
          background: "white",
          borderRadius: "8px",
          overflow: "hidden",
          padding: "0",
          margin: "0",
        },
      }}
    >
      <div className="modal-header border-bottom p-3">
        <h4 className="mb-0 fw-bold">
          {isTender ? "Send Reminder to All Vendors" : "Select Vendors for Reminder"}
        </h4>
      </div>

      <div className="modal-body p-2">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-4 px-3">
            <p className="mb-0">No vendors need reminders for this {isTender ? "Tender" : "RFQ"}.</p>
          </div>
        ) : (
          <div className="vendor-modal-content">
            {/* Select All Checkbox (disabled for tenders – always all vendors) */}
            <div className="px-3 mb-3">
              <div className="p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                <label className="form-check-label d-flex align-items-center">
                  {!isTender && (
                    <input
                      type="checkbox"
                      className="form-check-input me-3"
                      checked={selectedVendors.length === vendors.length && vendors.length > 0}
                      onChange={handleSelectAll}
                    />
                  )}
                  <strong>
                    {isTender
                      ? `All ${vendors.length} vendors will receive a reminder`
                      : `Select All (${vendors.length} vendors)`}
                  </strong>
                </label>
                {isTender && (
                  <p className="mb-0 mt-1 small text-muted">
                    Vendor identities are hidden for tenders. Reminders are sent to all listed vendors.
                  </p>
                )}
              </div>
            </div>

            {/* Vendor List */}
            <div className="vendor-list-container">
              <div className="vendor-list">
                {processedVendors.map((vendor, index) => (
                  <div key={vendor.user_id} className="vendor-card">
                    <div className="p-3 border rounded shadow-sm" style={{ backgroundColor: 'white' }}>
                      <label className="form-check-label d-flex align-items-start w-100 h-100">
                        {!isTender && (
                          <input
                            type="checkbox"
                            className="form-check-input me-3 mt-1"
                            checked={selectedVendors.includes(vendor.user_id)}
                            onChange={() => handleVendorToggle(vendor.user_id)}
                          />
                        )}
                        <div className="flex-grow-1 d-flex flex-column h-100">
                          <div className="mb-2">
                            <div className="fw-bold text-primary text-break">
                              {isTender
                                ? (vendor.vendor_code
                                    ? `Vendor ${vendor.vendor_code}`
                                    : vendor.rfq_product_vendor_id
                                      ? `VEN-${vendor.rfq_product_vendor_id}`
                                      : `Vendor ${index + 1}`)
                                : vendor.vendor_name}
                            </div>
                          </div>
                          {vendor.remainingProducts && vendor.remainingProducts.length > 0 && (
                            <div className="mt-auto">
                              <small className="text-muted fw-semibold d-block mb-2">
                                Pending Products ({vendor.totalVendorProducts}):
                              </small>
                              <div className="product-tags">
                                {vendor.remainingProducts.slice(0, 3).map((product, idx) => (
                                  <span key={idx} className="product-tag">
                                    {product.displayName}
                                  </span>
                                ))}
                                {vendor.remainingProducts.length > 3 && (
                                  <span className="product-tag more-tag">
                                    +{vendor.remainingProducts.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="modal-footer border-top p-3">
        <div className="d-flex flex-column flex-sm-row gap-2 w-100">
          <button
            onClick={onClose}
            className="btn btn-secondary flex-fill"
            disabled={sendLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendReminder}
            className="btn btn-primary flex-fill"
            disabled={(!isTender && selectedVendors.length === 0) || sendLoading}
          >
            {sendLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Sending...
              </>
            ) : isTender ? (
              `Send Reminder (${vendors.length})`
            ) : (
              `Send Reminder (${selectedVendors.length})`
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .vendor-selection-modal {
          max-width: 95vw;
        }
        
        .vendor-modal-content {
          max-height: 60vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .vendor-list-container {
          flex: 1;
          overflow: hidden;
          padding: 0 1rem;
        }
        
        .vendor-list {
          max-height: 40vh;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        
        .vendor-card {
          margin-bottom: 1rem;
        }
        
        .product-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .product-tag {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          color: #495057;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .more-tag {
          background-color: #0dcaf0;
          color: white;
          border-color: #0dcaf0;
        }
        
        @media (max-width: 768px) {
          .vendor-selection-modal {
            max-width: 100vw;
          }
          
          .vendor-modal-content {
            max-height: 70vh;
          }
          
          .vendor-list {
            max-height: 50vh;
          }
          
          .product-tags {
            gap: 0.25rem;
          }
          
          .product-tag {
            font-size: 0.7rem;
            padding: 0.2rem 0.4rem;
          }
        }
        
        @media (max-width: 576px) {
          .vendor-selection-modal {
            margin: 0.25rem;
          }
          
          .vendor-modal-content {
            max-height: 80vh;
          }
          
          .vendor-list {
            max-height: 60vh;
          }
        }
      `}</style>
    </Modal>
  );
};

export default VendorSelectionModal; 