import React, { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import {
  faAdd,
  faTrash,
  faTrashRestore,
} from "@fortawesome/free-solid-svg-icons";

const AddVendorModal = ({
  headerTitle,
  productData,
  vendors,
  isOpen,
  onClose,
  onAdd,
  onRemove,
  submitText,
  onSubmit,
  addedVendorsList,
  updatableData,
  setUpdatableData,
}) => {
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
                  <h5 className="modal-title">{headerTitle}</h5>
                  <div className="d-flex align-items-center gap-3">
                    {onSubmit && (
                        <button onClick={onSubmit} style={{height: 40}} className="btn btn-success text-white pt-2 btn-sm">
                            {submitText}
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
                  {vendors && vendors.length > 0 && (
                    <>
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th style={{ maxWidth: "250px" }}>Company Name</th>
                            <th style={{ maxWidth: "300px" }}>Region</th>
                            <th>Email</th>
                            <th>Mobile No.</th>
                            {/* <th>Industry</th> */}
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendors.map((item) => {
                            return (
                              <>
                                <tr key={`vendor-${item.name}`}>
                                  <td style={{ maxWidth: "250px" }}>{item.company_name}</td>
                                  <td
                                    className="text-truncate"
                                    style={{ maxWidth: "300px" }}
                                  >
                                    {item.address ?? "-"}
                                  </td>
                                  <td>{item.email}</td>
                                  <td>{item.mobile}</td>
                                  {/* <td>
                                    {item.organization_name
                                      ? item.organization_name
                                      : "N/A"}
                                  </td> */}
                                  <td className="d-flex flex-column justify-content-center gap-2 h-100">
                                    {
                                    // !updatableData.vendors?.[
                                    //   productData.product.id
                                    // ]?.addable
                                    !addedVendorsList.includes(item.id) ? (
                                      <button
                                        href="#"
                                        className="page-linkd remove-icon d-flex gap-2 align-items-center"
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: "green",
                                        }}
                                        onClick={(e) =>
                                          // handleRemoveVendorFromStore(e, item)
                                          onAdd(item)
                                        }
                                      >
                                        <FontAwesomeIcon icon={faAdd} />
                                        Add to list
                                      </button>
                                    ) : (
                                      <button
                                        href="#"
                                        className="page-linkd remove-icon d-flex gap-2 align-items-center"
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          color: "red",
                                        }}
                                        onClick={(e) => onRemove(item)}
                                      >
                                        <FontAwesomeIcon
                                          icon={faTrashRestore}
                                        />
                                        Remove
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

export default AddVendorModal;
