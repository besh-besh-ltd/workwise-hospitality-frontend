import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";

const InputModal = ({
  show,
  onHide,
  onSubmit,
  modalTitle = "Set Target Price",
  products = [] // [{ id, name, product_variant_id, vendors: [...] }]
}) => {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [numericValue, setNumericValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find selected product object
  const selectedProduct = products.find(
    (p) => p.id === Number(selectedProductId)
  );

  // Reset vendors when product changes
  useEffect(() => {
    setSelectedVendorIds([]);
  }, [selectedProductId]);

  const handleSubmit = async () => {
    if (!selectedProductId || selectedVendorIds.length === 0 || !numericValue) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        productId: Number(selectedProductId),
        vendorIds: selectedVendorIds, // Pass array of vendor IDs
        targetPrice: parseFloat(numericValue)
      });
      onHide();
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVendorChange = (vendorId) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId) // Remove if already selected
        : [...prev, vendorId] // Add if not selected
    );
  };

  const removeVendor = (vendorId) => {
    setSelectedVendorIds((prev) => prev.filter((id) => id !== vendorId));
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
        {/* Product Dropdown */}
        <Form.Group className="mb-3">
          <Form.Label>Product</Form.Label>
          <Form.Select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">-- Select Product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* Selected Vendors Display */}
        {selectedVendorIds.length > 0 && (
          <Form.Group className="mb-3">
            <Form.Label>Selected Vendors</Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {selectedVendorIds.map((vendorId) => {
                const vendor = selectedProduct?.vendors?.find((v) => v.id === vendorId);
                return vendor ? (
                  <Badge
                    key={vendorId}
                    bg="primary"
                    className="d-flex align-items-center"
                    style={{ cursor: "pointer" }}
                    onClick={() => removeVendor(vendorId)}
                  >
                    {vendor.name}
                    <span className="ms-2">×</span>
                  </Badge>
                ) : null;
              })}
            </div>
          </Form.Group>
        )}

        {/* Vendor Checkboxes */}
        {selectedProduct?.vendors?.length > 0 && (
          <Form.Group className="mb-3">
            <Form.Label>Select Vendors</Form.Label>
            <div
              className="vendor-list"
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                border: "1px solid #ced4da",
                borderRadius: "0.25rem",
                padding: "0.5rem"
              }}
            >
              {selectedProduct.vendors.map((vendor) => (
                <Form.Check
                  key={vendor.id}
                  type="checkbox"
                  label={vendor.name}
                  checked={selectedVendorIds.includes(vendor.id)}
                  onChange={() => handleVendorChange(vendor.id)}
                  disabled={!selectedProductId || isSubmitting}
                />
              ))}
            </div>
          </Form.Group>
        )}

        {/* Target Price */}
        <Form.Group className="mb-3">
          <Form.Label>Target Price</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="0.01"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            disabled={isSubmitting}
            placeholder="Enter target price"
          />
        </Form.Group>
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
            vendorIds
            variant="primary"
            onClick={handleSubmit}
            disabled={
              !selectedProductId ||
              selectedVendorIds.length === 0 ||
              !numericValue ||
              isSubmitting
            }
            size="sm"
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Submitting...
              </>
            ) : (
              "Set Target Price"
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default InputModal;
