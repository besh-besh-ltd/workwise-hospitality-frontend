import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";

const InputModal = ({
  show,
  onHide,
  onSubmit,
  modalTitle = "Set Target Price",
  products = []
}) => {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [numericValue, setNumericValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products.find(
    (p) => p.id === Number(selectedProductId)
  );

  useEffect(() => {
    setSelectedVendorIds([]);
  }, [selectedProductId]);

  const handleSubmit = async () => {
    if (!selectedProductId || selectedVendorIds.length === 0 || !numericValue) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        productId: Number(selectedProductId),
        vendorIds: selectedVendorIds,
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
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
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
      dialogClassName="modal-xl"
    >
      <Modal.Header closeButton className="py-2 px-3">
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {/* Products Table */}
        <h6>Select Product</h6>
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          <table className="table table-sm table-hover table-bordered">
            <thead>
              <tr>
                <th>Product</th>
                <th>Spec</th>
                <th>Size</th>
                <th>Quantity</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const spec = p.spec?.rfq_details?.find(d => d.title === "Spec")?.value || "-";
                const size = p.spec?.rfq_details?.find(d => d.title === "Size")?.value || "-";
                return (
                  <tr
                    key={p.id}s
                    style={{
                      cursor: "pointer",
                      backgroundColor: selectedProductId === p.id ? "#e8f0fe" : "transparent",
                         color: selectedProductId === p.id ? "#2E5BA8" : "inherit", // blue text when selected
                      fontWeight: selectedProductId === p.id ? "600" : "normal", // optional bold
                    }}
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <td>{p.name}</td>
                    <td>{spec}</td>
                    <td>{size}</td>
                    <td>{p.quantity}</td>
                    <td>{p.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Vendors Display */}
        {selectedVendorIds.length > 0 && (
          <Form.Group className="mb-3 mt-3">
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
                padding: "0.5rem",
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
        {selectedProduct && (
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
        )}

        {/* Existing Target Prices Table */}
        {selectedProduct?.vendors?.length > 0 && (
          <div className="mt-3">
            <h6>Existing Target Prices</h6>
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th>Existing Target Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>{selectedProduct.name}</td>
                      <td>{vendor.name}</td>
                      <td>
                        {vendor.latest_target_price !== null &&
                        vendor.latest_target_price !== undefined
                          ? vendor.latest_target_price
                          : <span className="text-muted">N/A</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
