import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const InputModal = ({ 
  show, 
  onHide, 
  onSubmit, 
  productName,          // Static product name to display
  initialValue = '',    // Initial value for the numeric input
  numericLabel = "Target Price",
  modalTitle = "Set Target Price"
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
        <Form>
          <Form.Group className="mb-3" controlId="formProductName">
            <Form.Label>Product</Form.Label>
            <Form.Control
              type="text"
              value={productName}
              readOnly
              plaintext
            />
          </Form.Group>

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
        </Form>
      </Modal.Body>

      <Modal.Footer className="py-2 px-3">
        <div className="d-flex justify-content-between w-100">
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