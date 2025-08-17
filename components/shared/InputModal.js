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

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  // Filter out vendors who have is_regret === 1
  const availableVendors =
    selectedProduct?.vendors?.filter((v) => v.is_regret !== 1) || [];

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
      targetPrice: parseFloat(numericValue),
    });
    onHide();
    window.location.reload(); // 🔄 Reload the page after successful submit
  } catch (error) {
    console.error("Submission error:", error);
  } finally {
    setIsSubmitting(false);
  }
};


  const handleVendorToggle = (vendorId) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVendorIds(availableVendors.map((v) => v.id));
    } else {
      setSelectedVendorIds([]);
    }
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
                const spec =
                  p.spec?.rfq_details?.find((d) => d.title === "Spec")?.value ||
                  "-";
                const size =
                  p.spec?.rfq_details?.find((d) => d.title === "Size")?.value ||
                  "-";
                return (
                  <tr
                    key={p.id}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedProductId === p.id ? "#cce5ff" : "transparent", // light blue
                      fontWeight: selectedProductId === p.id ? "600" : "normal",
                    }}
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <td
                      style={{
                        color:
                          selectedProductId === p.id ? "#004085" : "inherit",
                      }}
                    >
                      {p.name}
                    </td>
                    <td
                      style={{
                        color:
                          selectedProductId === p.id ? "#004085" : "inherit",
                      }}
                    >
                      {spec}
                    </td>
                    <td
                      style={{
                        color:
                          selectedProductId === p.id ? "#004085" : "inherit",
                      }}
                    >
                      {size}
                    </td>
                    <td
                      style={{
                        color:
                          selectedProductId === p.id ? "#004085" : "inherit",
                      }}
                    >
                      {p.quantity}
                    </td>
                    <td
                      style={{
                        color:
                          selectedProductId === p.id ? "#004085" : "inherit",
                      }}
                    >
                      {p.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Target Price (shown after product selection) */}
        {selectedProduct && (
          <Form.Group className="mb-3 mt-3">
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

        {/* Show Vendor List + Existing Prices only if target price is entered */}
        {numericValue && availableVendors.length > 0 && (
          <>
            {/* Selected Vendors Display */}
            {selectedVendorIds.length > 0 && (
              <Form.Group className="mb-3 mt-3">
                <Form.Label>Selected Vendors</Form.Label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {selectedVendorIds.map((vendorId) => {
                    const vendor = availableVendors.find((v) => v.id === vendorId);
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

            {/* Vendor Table with Select All */}
            <Form.Group className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Check
                  type="checkbox"
                  label="Select All Vendors"
                  checked={
                    selectedVendorIds.length > 0 &&
                    selectedVendorIds.length === availableVendors.length
                  }
                  onChange={handleSelectAll}
                />
              </div>

              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                <table className="table table-sm table-hover table-bordered">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>✔</th>
                      <th>Vendor</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableVendors.map((vendor) => {
                      const isSelected = selectedVendorIds.includes(vendor.id);
                      return (
                        <tr
                          key={vendor.id}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected
                              ? "#fff3cd"
                              : "transparent", // yellow highlight
                            color: isSelected ? "#856404" : "inherit",
                            fontWeight: isSelected ? "600" : "normal",
                          }}
                          onClick={() => handleVendorToggle(vendor.id)}
                        >
                          <td className="text-center">
                            <Form.Check
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleVendorToggle(vendor.id)}
                              onClick={(e) => e.stopPropagation()} // prevent row double toggle
                            />
                          </td>
                          <td>{vendor.name}</td>
                          <td>{vendor.email}</td>
                          <td>{vendor.mobile}</td>
                          <td>{vendor.organization_name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Form.Group>

            {/* Existing Target Prices Table */}
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
                    {availableVendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>{selectedProduct.name}</td>
                        <td>{vendor.name}</td>
                        <td>
                          {vendor.latest_target_price !== null &&
                          vendor.latest_target_price !== undefined ? (
                            vendor.latest_target_price
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
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
