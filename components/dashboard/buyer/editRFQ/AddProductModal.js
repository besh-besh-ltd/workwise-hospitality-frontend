import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Select from "react-select";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import {
  faAdd,
  faTrash,
  faTrashRestore,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { searchProductsV2 } from "@/services/products";

const AddProductModal = ({
  rfqData,
  isOpen,
  onClose,
  onAdd,
}) => {
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    const values = {
      search_key: productSearchTerm,
    };
    try {
      const response = await searchProductsV2(values);
      setProducts(response.data);
    } catch (error) {
      toast.error(error.message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productSearchTerm.length < 3) return;

    const handler = setTimeout(() => {
      setLoading(true);
      fetchProducts(productSearchTerm);
    }, 800);

    return () => {
      clearTimeout(handler);
    };
  }, [productSearchTerm]);

  return (
    <>
      {isOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 1040,
            }}
          ></div>
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1050 }}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
              style={{ maxWidth: "80vw", width: "80vw" }}
            >
              <div className="modal-content">
                <div
                  className="modal-header"
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <h5 className="modal-title">Add Products to RFQ #10010</h5>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    style={{
                      fontSize: 24,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                    }}
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div
                  style={{
                    padding: "0 1.25rem",
                  }}
                  className="modal-body details-table"
                >
                  <div className="mb-3">
                    <label className="form-label fw-medium">Product Name</label>
                    <input
                      disabled={loading}
                      type="text"
                      name="product_name"
                      className={`form-control`}
                      value={loading ? `Fetching products for ${productSearchTerm}...` : productSearchTerm}
                      placeholder="Please enter atleast 3 letters"
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                      }}
                    />
                  </div>
                  {loading && (
                    <p className="mb-4">Fetching products...</p>
                  )}
                  {!loading && products && products.length > 0 && (
                    <>
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th style={{ maxWidth: "250px" }}>ID</th>
                            <th style={{ maxWidth: "300px" }}>Variant Name</th>
                            <th style={{ maxWidth: "300px" }}>Product Name</th>
                            <th>Category</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((item) => {
                            return (
                              <>
                                <tr key={`vendor-${item.product_name}`}>
                                  <td style={{ maxWidth: "250px" }}>
                                    {item.variant_id}
                                  </td>
                                  <td
                                    className="text-truncate"
                                    style={{ maxWidth: "300px" }}
                                  >
                                    {item.variant_name}
                                  </td>
                                  <td
                                    className="text-truncate"
                                    style={{ maxWidth: "300px" }}
                                  >
                                    {item.product_name}
                                  </td>
                                  <td>{item.category_name}</td>
                                  {/* <td>
                                    {item.organization_name
                                      ? item.organization_name
                                      : "N/A"}
                                  </td> */}
                                  <td className="d-flex flex-column justify-content-center gap-2 h-100">
                                    <button
                                    href="#"
                                    className="page-linkd remove-icon d-flex gap-2 align-items-center"
                                    style={{
                                        border: "none",
                                        background: "transparent",
                                        color: "green",
                                    }}
                                    onClick={() => onAdd(item)}
                                    >
                                    <FontAwesomeIcon icon={faAdd} />
                                    Select
                                    </button>
                                  </td>
                                </tr>
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AddProductModal;
