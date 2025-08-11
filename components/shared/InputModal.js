import React, { useState } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';

const InputModal = ({ 
  show, 
  onHide, 
  onSubmit, 
  productName,
  initialValue = '',
  numericLabel = "Target Price",
  modalTitle = "Set Target Price",
  historyData = [] // <-- pass array directly
}) => {
  const [numericValue, setNumericValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!numericValue) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(parseFloat(numericValue) || 0);
      onHide();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      className="input-modal"
    >
      <Modal.Header closeButton className="py-2 px-3">
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Product Name */}
        <Form.Group className="mb-3" controlId="formProductName">
          <Form.Label>Product</Form.Label>
          <Form.Control
            type="text"
            value={productName}
            readOnly
            plaintext
          />
        </Form.Group>

        {/* Target Price */}
        <Form.Group className="mb-3" controlId="formNumericInput">
          <Form.Label>{numericLabel}</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="0.01"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            disabled={isSubmitting}
            placeholder={`Enter ${numericLabel.toLowerCase()}`}
          />
        </Form.Group>

        {/* Price History */}
        <div className="mt-4">
          <h6 className="mb-2">Price History</h6>
          {historyData?.length > 0 ? (
            <Table bordered hover size="sm" className="align-middle text-center">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Target Price</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="fw-semibold text-primary">
                        {item.target_price}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-muted fst-italic">No history available</div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="py-2 px-3">
        <div className="d-flex gap-2 ms-auto">
          <Button 
            variant="outline-secondary" 
            onClick={onHide}
            disabled={isSubmitting}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!numericValue || isSubmitting}
            size="sm"
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : 'Set Target Price'}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default InputModal;
