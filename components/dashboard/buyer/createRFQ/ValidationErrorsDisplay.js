import { addProductToDraft } from "@/services/rfq";
import React from "react";
import { toast } from "react-toastify";

const ValidationErrorsDisplay = ({ selectedSheet, rfq_id, refetchRFQ, setLoading }) => {
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
        console.error(error);
        toast.error(error.message || 'Something went wrong while adding product!');
    } finally {
        setLoading(false);
    }
  }

  return (
    <div style={{marginTop: '4rem'}}>
      <h4 className="mb-3 fw-medium">Validation Errors</h4>

      {validationErrors.map((error, index) => {
        const errorMessages = Object.values(error.errors || {});

        const isProductNotFound =
          errorMessages.length === 1 &&
          errorMessages[0]?.toLowerCase().includes("product not found");

        const isVendorNotFound =
          errorMessages.length === 1 &&
          errorMessages[0]?.toLowerCase().includes("no vendors found");

        return (
          <>
            <div key={index} className="mb-2">
              <div className={`alert ${isProductNotFound ? 'alert-danger' : 'alert-warning'}`}>
                <strong>Product:</strong> {error.name} <br />
                {errorMessages.map((msg, i) => (
                  <div key={i}>
                    <span className={`badge ${isProductNotFound ? 'bg-danger' : 'bg-warning'}`}>{msg}</span>
                  </div>
                ))}
              </div>

              {isProductNotFound && error.similar_products?.length > 0 && (
                <div className="mb-2">
                  <h5 className="text-black">🔎 Similar Products Found</h5>
                  <div className="row">
                    {error.similar_products.slice(0, 4).map((product) => (
                      <div
                        className="col-12 col-sm-6 col-md-3 mb-2"
                        key={product.variant_id}
                      >
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title fw-medium mb-1">
                              {product.raw_product_name}
                            </h6>
                            <p className="card-text text-sm mb-2">
                              <p className="mb-0">Variant ID: {product.variant_id}</p>
                            </p>
                            <button
                              onClick={() =>
                                handleSelectProduct(
                                  error.name,
                                  product.variant_id,
                                  error.quantity,
                                  error.unit,
                                  error.unit,
                                  error.description
                                )
                              }
                              className="btn border-black btn-sm p-2"
                            >
                              Select Product
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isVendorNotFound && (
                <div className="alert alert-warning">
                  ⚠️ No vendors found for this product.
                </div>
              )}
            </div>
            <hr className="mb-4" />
          </>
        );
      })}
    </div>
  );
};

export default ValidationErrorsDisplay;
