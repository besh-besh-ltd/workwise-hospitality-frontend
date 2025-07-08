import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import { faTrash, faTrashRestore } from "@fortawesome/free-solid-svg-icons";

const ViewVendorModal = ({
  productData,
  isOpen,
  onClose,
  onAdd,
  onRemove,
  onSelectAll,
  updatableData,
  applyToOtherVariants,
}) => {
  const [initialVendors, setInitialVendors] = useState([]);
  const [vendors, setVendors] = useState(initialVendors);

  const [vendorSearchTerm, setVendorSearchTerm] = useState("");

  const filterVendors = () => {
    if(initialVendors) {
      setVendors(
        initialVendors.filter(
          (vendor) =>
            (vendor?.name ?? vendor.user_details?.name ?? '').toLowerCase().includes(vendorSearchTerm) ||
            vendor.user_details.name.toLowerCase().includes(vendorSearchTerm) ||
            vendor.user_details.company_name.toLowerCase().includes(vendorSearchTerm)
        )
      );
    }
  }

  const handleSelectAll = (event) => {
    const isChecked = event.target.checked;
    onSelectAll(isChecked);
  }

  useEffect(() => {
    if (vendorSearchTerm.length > 0 && vendorSearchTerm.length < 3) return;

    const handler = setTimeout(() => {
      filterVendors();
    }, 800);

    return () => {
      clearTimeout(handler);
    };
  }, [vendorSearchTerm]);

  useEffect(() => {
    setVendors(initialVendors);
  }, [initialVendors])

  useEffect(() => {
    setInitialVendors(productData.vendors);
  }, [productData.vendors])

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
                  <h5 className="modal-title">
                    RFQ Product #{productData.product?.id} Vendors List
                  </h5>
                  <div className="d-flex align-items-center gap-3">
                    {applyToOtherVariants && (
                      <button
                        onClick={applyToOtherVariants}
                        className="btn btn-sm btn-primary"
                        style={{
                          padding: '0.7rem'
                        }}
                      >
                        Apply to all
                      </button>
                    )}
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
                </div>
                <div
                  style={{
                    padding: "0 1.25rem",
                  }}
                  className="modal-body details-table"
                >
                  <div className="mb-3">
                    <label className="form-label fw-medium">Vendor Name</label>
                    <input
                      type="text"
                      name="product_name"
                      className={`form-control`}
                      value={vendorSearchTerm}
                      placeholder="Please enter atleast 3 letters"
                      onChange={(e) => {
                        setVendorSearchTerm(e.target.value);
                      }}
                    />
                  </div>
                  {vendors && vendors.length > 0 && (
                    <>
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Company Name</th>
                            <th style={{ maxWidth: "300px" }}>Region</th>
                            <th>Email</th>
                            <th>Mobile No.</th>
                            {/* <th>Industry</th> */}
                            <th style={{ minWidth: 150 }}>
                              <div className="d-flex flex-column gap-2">
                                <span>Action</span>
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    name="select-all"
                                    type="checkbox"
                                    checked={
                                      updatableData.vendors?.[
                                        productData.product.id
                                      ]?.deletable?.length == vendors.length
                                    }
                                    onChange={handleSelectAll}
                                  />
                                  <label htmlFor="select-all">Select All</label>
                                </div>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendors.map((item) => {
                            return (
                              <>
                                <tr key={`vendor-${item.name}`}>
                                  <td>{item.user_details.company_name}</td>
                                  <td
                                    className="text-truncate"
                                    style={{ maxWidth: "300px" }}
                                  >
                                    {item.user_details.address}
                                  </td>
                                  <td>{item.user_details.email}</td>
                                  <td>{item.user_details.mobile}</td>
                                  {/* <td>
                                    {item.organization_name
                                      ? item.organization_name
                                      : "N/A"}
                                  </td> */}
                                  <td className="d-flex flex-column justify-content-center gap-2 h-100">
                                    <Link
                                      href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${item.user_id}&origin=create-rfq`}
                                      className="page-links d-flex gap-2 align-items-center"
                                      target="_blank"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                      View
                                    </Link>
                                    {!updatableData.vendors?.[
                                      productData.product.id
                                    ]?.deletable?.includes(item.user_id) ? (
                                      <button
                                        href="#"
                                        className="page-linkd remove-icon d-flex gap-2 align-items-center"
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: "red",
                                        }}
                                        onClick={(e) => {
                                          // handleRemoveVendorFromStore(e, item)
                                          onAdd(item);
                                        }}
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                        Remove
                                      </button>
                                    ) : (
                                      <button
                                        href="#"
                                        className="page-linkd remove-icon d-flex gap-2 align-items-center"
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: "#BA8E23",
                                        }}
                                        onClick={(e) => {
                                          // handleRemoveVendorFromStore(e, item)
                                          onRemove(item);
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faTrashRestore}
                                        />
                                        Restore
                                      </button>
                                    )}
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

export default ViewVendorModal;
