import React, { useState } from 'react';
import { Modal, Button, Form, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { submitQuotesForApproval } from '@/services/negotiation';

const QuoteApprovalSelectionModal = ({
  show,
  onHide,
  roundQuotes = [],
  roundQuotesSource = 'negotiation', // 'negotiation' | 'regular'
  activeRound,
  rfq_id,
  rfq_product_id,
  productName,
  vendorCodeMap = {},
  vendorNameMap = {},
  onSuccess,
  department_id = null
}) => {
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');

  const handleQuoteToggle = (quoteId) => {
    setSelectedQuotes(prev => {
      if (prev.includes(quoteId)) {
        return prev.filter(id => id !== quoteId);
      } else {
        return [...prev, quoteId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedQuotes.length === roundQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(roundQuotes.map(q => q.quote_id || q.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedQuotes.length === 0) {
      toast.error('Please select at least one quote for approval');
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitQuotesForApproval({
        rfq_id,
        rfq_product_id,
        quote_ids: selectedQuotes,
        quote_source: roundQuotesSource,
        remarks: remarks.trim() || undefined,
        department_id
      });
      toast.success(response?.message || 'Quotes submitted for approval successfully');
      setSelectedQuotes([]);
      setRemarks('');
      onHide();
      if (onSuccess) {
        onSuccess(response?.data);
      }
    } catch (error) {
      console.error('Error submitting quotes for approval:', error);
      toast.error(error?.message || 'Failed to submit quotes for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedQuotes([]);
    setRemarks('');
    onHide();
  };

  // Sort quotes by price (lowest first)
  const sortedQuotes = [...roundQuotes].sort((a, b) => {
    const priceA = parseFloat(a.quoted_price || a.total_price || 0);
    const priceB = parseFloat(b.quoted_price || b.total_price || 0);
    return priceA - priceB;
  });

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className='px-3 py-2'>
        <Modal.Title>
          Finalize Vendors
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>
            {productName} - Round {activeRound?.round_number || 1}
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {sortedQuotes.length === 0 ? (
          <Alert variant="info">No quotes available for this round.</Alert>
        ) : (
          <>
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <span className="text-muted">
                {selectedQuotes.length} of {sortedQuotes.length} quote(s) selected
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={handleSelectAll}
                className="p-0"
              >
                {selectedQuotes.length === sortedQuotes.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="quote-selection-list">
              {sortedQuotes.map((quote, index) => {
                const quoteId = quote.quote_id || quote.id;
                const isSelected = selectedQuotes.includes(quoteId);
                const vendorName = quote.vendor_name || quote.vendor?.organization_name || quote.vendor?.name || (quote.vendor_id && vendorNameMap[quote.vendor_id]) || `Vendor ${quote.vendor_id}`;
                const quotedPrice = parseFloat(quote.quoted_price || quote.total_price || 0);
                const previousPrice = parseFloat(quote.previous_price || 0);
                const priceDiff = previousPrice > 0 ? quotedPrice - previousPrice : 0;

                return (
                  <div
                    key={quoteId}
                    className={`p-3 mb-2 border rounded cursor-pointer ${isSelected ? 'border-primary bg-light' : ''}`}
                    onClick={() => handleQuoteToggle(quoteId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-start">
                      <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleQuoteToggle(quoteId)}
                        onClick={(e) => e.stopPropagation()}
                        className="me-3"
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong>{vendorName}</strong>
                            {index === 0 && (
                              <Badge bg="success" className="ms-2">Lowest</Badge>
                            )}
                          </div>
                          <div className="text-end">
                            <div className="fw-bold">
                              ₹{quotedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {previousPrice > 0 && (
                              <div className="small">
                                <span className="text-muted">Previous: ₹{previousPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                {priceDiff !== 0 && (
                                  <Badge
                                    bg={priceDiff < 0 ? 'success' : 'danger'}
                                    className="ms-2"
                                    style={{ fontSize: '0.7rem' }}
                                  >
                                    {priceDiff < 0 ? '↓' : '↑'} {Math.abs(priceDiff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Form.Group className="mt-3">
              <Form.Label>Remarks (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Add any remarks or notes for the approval..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting || selectedQuotes.length === 0}
        >
          {submitting ? 'Submitting...' : `Finalize ${selectedQuotes.length} Vendor(s)`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuoteApprovalSelectionModal;
