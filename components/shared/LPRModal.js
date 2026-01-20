import { getLastPurchaseDetails } from '@/services/rfq';
import { addCommasToNumber } from '@/utils/sharedFunctions';
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Table } from 'react-bootstrap';



/**
 * @note We have left the View LPR button to be displayed even if the Previous quotes are not there which needs to be corrected later 
 * @Updated Ayush Singh 22 JUNE 2025
 */
const LPRModal = ({ show, onHide, variantId , RFQ_no }) => {
  const [activeTab, setActiveTab] = useState('lpr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lprData, setLprData] = useState([]);
  const [allQuotesData, setAllQuotesData] = useState([]);

  // Format currency values
//   const formatCurrency = (value) => {
//   if (value === null || value === undefined) return '-';
//   return `₹${parseFloat(value).toFixed(2)}`;
// };


  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Fetch data when modal is shown or tab changes
  useEffect(() => {
    if (!show) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const payload = {
          variant_id: variantId,
          type: activeTab  // 'lpr' or 'lqr'
        };
        
        const res = await getLastPurchaseDetails(payload);
        
        // Assuming res.data contains the array of records
        if (activeTab === 'lpr') {
          setLprData(res || []);
        } else {
          setAllQuotesData(res || []);
        }
      } catch (err) {
        setError('Failed to load purchase history data');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [show, activeTab, variantId]);

  // Determine which data to display
  const displayData = activeTab === 'lpr' ? lprData : allQuotesData;

  const filteredData = useMemo(() => {
  return RFQ_no !== -1
    ? displayData.filter(item => item.rfq_no !== RFQ_no)
    : displayData;
}, [displayData, RFQ_no]);


  return (
   
      <Modal
        show={show}
        onHide={onHide}
        size="xl"
        centered
        backdrop="static"
        className="purchase-history-modal"
        dialogClassName="modal-super-xl"
      >
        <Modal.Header
          closeButton
          className="py-2 px-3 d-flex justify-content-between align-items-center"
        >
          <Modal.Title className="mb-0">Purchase History</Modal.Title>
          <div className="btn-group " style={{ width: "480px" }}>
            <Button
              variant={activeTab === "lpr" ? "primary" : "outline-secondary"}
              onClick={() => setActiveTab("lpr")}
              size="sm"
              disabled={loading}
              className="px-3"
            >
              LPR (Last Purchase Rate)
            </Button>
            <Button
              variant={activeTab === "lqr" ? "primary" : "outline-secondary"}
              onClick={() => setActiveTab("lqr")}
              size="sm"
              disabled={loading}
              className="px-3"
            >
             All Previous Quotes
            </Button>
          </div>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <div className="alert alert-danger m-3 d-flex justify-content-between align-items-center">
              <span>{error}</span>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setRetryCount((prev) => prev + 1)}
              >
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border text-primary"
                role="status"
                style={{ width: "3rem", height: "3rem" }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading purchase history...</p>
            </div>
          ) : (
            <div className="table-container">
              {filteredData.length > 0 ? (
                <Table striped hover className="mb-0">
                  <thead className="sticky-top bg-white">
                    <tr>
                      <th className='"bg-light'>Tender / RFQ No.</th>
                      <th className="bg-light">Vendor Details</th>
                      <th className="bg-light">Finalized By</th>
                      <th className="bg-light">Date</th>
                      <th className="bg-light text-end">Qty</th>
                      <th className="bg-light text-end">Freight (%)</th>
                      <th className="bg-light text-end">GST  (%)</th>
                      <th className="bg-light text-end">Packaging  (%)</th>
                      <th className="bg-light text-end">Unit Price  (₹)</th>
                      <th className="bg-light text-end">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    
                    {
                   filteredData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.rfq_no}</td>
                        <td>
                          <div className="fw-medium">{item.vendor_name}</div>
                          <div
                            className="small text-muted"
                            style={{ maxWidth: "300px" }}
                          >
                            {item.vendor_email}
                          </div>
                        </td>
                        <td>{item.created_by || '-'}</td>
                        <td className="text-nowrap">
                          {formatDate(item.quote_date)}
                        </td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">
                          {item?.freight_price || '-'}
                        </td>
                      <td className="text-end">
                        {item?.tax
                          ? item.tax_mode == "percentage"
                            ? `${item.tax}%`
                            : `₹${addCommasToNumber(item.tax)}`
                          : "-"}
                        </td>
                      <td className="text-end">
                        {item?.package_price
                          ? item.package_mode == "percentage"
                            ? `${item.package_price}%`
                            : `₹${addCommasToNumber(item.package_price)}`
                          : "-"}
                      </td>
                      <td className="text-end fw-medium">
                        ₹{addCommasToNumber(item?.unit_price)}
                      </td>
                      <td className="text-end fw-bold text-primary">
                        ₹{addCommasToNumber(item?.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {displayData.length > 5 && (
                  <tfoot className="sticky-bottom bg-light">
                    <tr>
                      <td colSpan="8" className="text-center small py-1">
                        Showing {displayData.length} records
                      </td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            ) : (
              <div className="text-center py-5">
                <div className="py-3">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <h5>
                    No {activeTab === "lpr" ? "Last Purchase" : "Quote"} Records
                    Found
                  </h5>
                  <p className="text-muted">
                    No purchase history available for this product
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="py-2 px-3">
        <div className="d-flex justify-content-between w-100 small">
          <div className="text-muted">
            {displayData.length > 0 && (
              <>
                Showing {displayData.length} records • Last updated:{" "}
                {new Date().toLocaleTimeString()}
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onHide}>
            Close
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default LPRModal;