import SmartButton from "@/components/shared/SmartButton";
import { addProductToDraft } from "@/services/rfq";
import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { toast } from "react-toastify";

const ProductDetailsModal = ({ show, onClose, error }) => {
  if (!error) return null;

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="mx-3 mt-3">Original Product Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col-12 mb-3">
            <strong>Product Name:</strong>
            <p className="mb-0 fw-semibold text-muted">{error.name}</p>
          </div>
          <div className="col-6 mb-3">
            <strong>Quantity:</strong>
            <p className="mb-0 text-muted">
              {error.quantity || "Not specified"}
            </p>
          </div>
          <div className="col-6 mb-3">
            <strong>Unit:</strong>
            <p className="mb-0 text-muted">
              {error.unit || "Not specified"}
            </p>
          </div>
          {error.size && (
            <div className="col-12 mb-3">
              <strong>Size:</strong>
              <p className="mb-0 text-muted">
                {error.size}
              </p>
            </div>
          )}
          {error.description && (
            <div className="col-12 mb-3">
              <strong>Description / Specifications:</strong>
              <p className="mb-0 text-muted">
                {error.description}
              </p>
            </div>
          )}
        </div>
        <div className="alert alert-info">
          <span>
            When you select a similar product, these details will be
            automatically copied to your new selection.
          </span>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" className="p-2" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const ValidationErrorsDisplay = ({ selectedSheet, rfq_id, refetchRFQ, setLoading }) => {
  const [selectedError, setSelectedError] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  
  const validationErrors = selectedSheet.validation_errors ?? [];

  if (!validationErrors || !Array.isArray(validationErrors)) {
    return null;
  }

  const handleSelectProduct = async (product_name, product_id, quantity, unit, size = '', spec = '') => {
    try {
        const payload = {
          rfq_id,
          sheet_id: selectedSheet?.value,
          variant_id: product_id,
          specs: {
            Quantity: quantity,
            Unit: unit,
            Size: size,
            Spec: spec,
          },
          isUnfoundProduct: true,
          unfoundName: product_name
        };
        setLoading(true);

        await addProductToDraft(payload);
        toast.success('Product has been added with given specifications!');
        await refetchRFQ();
    } catch (error) {
        const responseError = error.message?.response?.data?.message;
        toast.error(responseError || 'Something went wrong while adding product!');
    } finally {
        setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "4rem" }}>
      {/* Product Not Found Section */}
      {(() => {
        const productNotFoundErrors = validationErrors.filter((error) => {
          const errorMessages = Object.values(error.errors || {});
          return (
            errorMessages.length === 1 &&
            errorMessages[0]?.toLowerCase().includes("product not found")
          );
        });

        if (productNotFoundErrors.length === 0) return null;

        const productNotFoundCount = validationErrors.filter((error) => {
          const errorMessages = Object.values(error.errors || {});
          return (
            errorMessages.length === 1 &&
            errorMessages[0]?.toLowerCase().includes("product not found")
          );
        }).length;

        return (
          <div className="mb-5">
            <h4 className="mb-3 fw-medium text-danger">
              🚫 {productNotFoundCount} Products Not Found
            </h4>
            <div className="alert alert-info mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Quick Add:</strong> Click any similar product to add it to
              your RFQ with your original quantity, unit, size & specs
              pre-filled.
            </div>

            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th className="fw-medium">Product Name & Details</th>
                    <th className="text-center fw-medium">Similar Product 1</th>
                    <th className="text-center fw-medium">Similar Product 2</th>
                    <th className="text-center fw-medium">Similar Product 3</th>
                    <th className="text-center fw-medium">Similar Product 4</th>
                  </tr>
                </thead>
                <tbody>
                  {productNotFoundErrors.map((error, index) => (
                    <tr key={index}>
                      <td
                        className="align-middle"
                        style={{ minWidth: "250px" }}
                      >
                        <div>
                          <strong className="fs-6 d-block">
                            {error.name}
                          </strong>
                          <button
                            onClick={() => { setShowProductDetails(true); setSelectedError(error) }}
                            className="btn btn-outline-secondary btn-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                      {[0, 1, 2, 3].map((i) => (
                        <td
                          key={i}
                          className="text-center align-middle"
                          style={{ minWidth: "200px" }}
                        >
                          {error.similar_products?.[i] ? (
                            <div className="p-2">
                              <SmartButton
                                onClick={() =>
                                  handleSelectProduct(
                                    error.name,
                                    error.similar_products[i].variant_id,
                                    error.quantity,
                                    error.unit,
                                    error.size,
                                    error.description
                                  )
                                }
                                className="px-3"
                                label={error.similar_products[i].raw_product_name}
                              />
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Vendor Not Found Section - Similar structure */}
      {(() => {
        const vendorNotFoundErrors = validationErrors.filter((error) => {
          const errorMessages = Object.values(error.errors || {});
          return (
            errorMessages.length === 1 &&
            errorMessages[0]?.toLowerCase().includes("no vendors found")
          );
        });

        if (vendorNotFoundErrors.length === 0) return null;

        return (
          <div className="mb-5">
            <h4 className="mb-3 fw-medium text-warning">⚠️ No Vendors Found</h4>
            <div className="alert alert-info mb-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Quick Add:</strong> Click any similar product to add it to
              your RFQ with your original quantity, unit, size & specs
              pre-filled.
            </div>

            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th className="fw-medium">Product Name & Details</th>
                    <th className="text-center fw-medium">Similar Product 1</th>
                    <th className="text-center fw-medium">Similar Product 2</th>
                    <th className="text-center fw-medium">Similar Product 3</th>
                    <th className="text-center fw-medium">Similar Product 4</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorNotFoundErrors.map((error, index) => (
                    <tr key={index}>
                      <td
                        className="align-middle"
                        style={{ minWidth: "250px" }}
                      >
                        <div>
                          <strong className="fs-6 d-block">
                            {error.name}
                          </strong>
                          <button
                            onClick={() => { setShowProductDetails(true); setSelectedError(error) }}
                            className="btn btn-outline-secondary btn-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                      {[0, 1, 2, 3].map((i) => (
                        <td
                          key={i}
                          className="text-center align-middle"
                          style={{ minWidth: "200px" }}
                        >
                          {error.similar_products?.[i] ? (
                            <div className="p-2">
                              <SmartButton
                                onClick={() =>
                                  handleSelectProduct(
                                    error.name,
                                    error.similar_products[i].variant_id,
                                    error.quantity,
                                    error.unit,
                                    error.size,
                                    error.description
                                  )
                                }
                                className="px-3"
                                label={error.similar_products[i].raw_product_name}
                              />
                              {/* <button
                                onClick={() =>
                                  handleSelectProduct(
                                    error.name,
                                    error.similar_products[i].variant_id,
                                    error.quantity,
                                    error.unit,
                                    "",
                                    error.description
                                  )
                                }
                                className="btn btn-primary btn-sm"
                              >
                                ✅ Add This Product
                              </button> */}
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      <ProductDetailsModal show={showProductDetails} onClose={() => setShowProductDetails(false)} error={selectedError}/>
    </div>
  );
};

export default ValidationErrorsDisplay;
