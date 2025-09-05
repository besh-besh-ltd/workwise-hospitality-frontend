import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const ViewRFQ = ({ data, onCloseRFQ, closeLoading }) => {
  console.log("RFQ Data in ViewRFQ:", data);

  // Convert status to number for consistent comparison
  const rfqStatus = data?.status ? Number(data.status) : 0;

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">RFQ Management</h1>
        </div>
      </section>

      <section className="buyer-rfq-det-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="manage-rfq-con">
                {/* Content for Manage RFQs tab */}
                <span className="title">RFQ #{data.rfq_no} details</span>

                <div className="details-table">
                  <div className="table-responsive">
                    <table className="table table-striped ">
                      <thead>
                        <tr>
                          <th>Name of product</th>
                          <th>Size specifications & Quantity</th>
                          <th>
                            Datasheet
                            <br /> (Optional)
                          </th>
                          <th>
                            QAP <br />
                            (Optional)
                          </th>
                          <th>Comments (Optional)</th>
                          <th>Selected vendors</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Carbon steel pipes</td>
                          <td>
                            <div className="size-specification">
                              <input
                                type="text"
                                name="size"
                                id="size"
                                placeholder="Size"
                                disabled
                              />
                              <input
                                type="text"
                                name="spec"
                                id="spec"
                                placeholder="Spec"
                                disabled
                              />
                              <input
                                type="text"
                                name="qty"
                                id="qty"
                                placeholder="Quantity"
                                disabled
                              />
                              <input
                                type="text"
                                name="unit"
                                id="unit"
                                placeholder="Unit"
                                disabled
                              />
                              <FontAwesomeIcon icon={faEye} />
                            </div>
                          </td>

                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>Lorem ipsum placeholder</td>
                          <td>
                            <span>
                              <Link
                                href="rfq-management-vendor"
                                className="page-link"
                              >
                                View
                              </Link>
                            </span>
                          </td>
                        </tr>

                        <tr>
                          <td>Carbon steel pipes</td>
                          <td>
                            <div className="size-specification">
                              <input
                                type="text"
                                name="size"
                                id="size"
                                placeholder="Size"
                                disabled
                              />
                              <input
                                type="text"
                                name="spec"
                                id="spec"
                                placeholder="Spec"
                                disabled
                              />
                              <input
                                type="text"
                                name="qty"
                                id="qty"
                                placeholder="Quantity"
                                disabled
                              />
                              <input
                                type="text"
                                name="unit"
                                id="unit"
                                placeholder="Unit"
                                disabled
                              />
                              <FontAwesomeIcon icon={faEye} />
                            </div>
                          </td>

                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>Lorem ipsum placeholder</td>
                          <td>
                            <span>
                              <Link
                                href="rfq-management-vendor"
                                className="page-link"
                              >
                                View
                              </Link>
                            </span>
                          </td>
                        </tr>

                        <tr>
                          <td>Carbon steel pipes</td>
                          <td>
                            <div className="size-specification">
                              <input
                                type="text"
                                name="size"
                                id="size"
                                placeholder="Size"
                                disabled
                              />
                              <input
                                type="text"
                                name="spec"
                                id="spec"
                                placeholder="Spec"
                                disabled
                              />
                              <input
                                type="text"
                                name="qty"
                                id="qty"
                                placeholder="Quantity"
                                disabled
                              />
                              <input
                                type="text"
                                name="unit"
                                id="unit"
                                placeholder="Unit"
                                disabled
                              />
                              <FontAwesomeIcon icon={faEye} />
                            </div>
                          </td>

                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>Lorem ipsum placeholder</td>
                          <td>
                            <span>
                              <Link
                                href="rfq-management-vendor"
                                className="page-link"
                              >
                                View
                              </Link>
                            </span>
                          </td>
                        </tr>

                        <tr>
                          <td>Carbon steel pipes</td>
                          <td>
                            <div className="size-specification">
                              <input
                                type="text"
                                name="size"
                                id="size"
                                placeholder="Size"
                                disabled
                              />
                              <input
                                type="text"
                                name="spec"
                                id="spec"
                                placeholder="Spec"
                                disabled
                              />
                              <input
                                type="text"
                                name="qty"
                                id="qty"
                                placeholder="Quantity"
                                disabled
                              />
                              <input
                                type="text"
                                name="unit"
                                id="unit"
                                placeholder="Unit"
                                disabled
                              />
                              <FontAwesomeIcon icon={faEye} />
                            </div>
                          </td>

                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span>
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span>
                                <Image
                                  src="/assets/images/download-icon.png"
                                  alt="Workwise"
                                  width={16}
                                  height={16}
                                  priority={true}
                                />
                              </span>
                            </div>
                          </td>
                          <td>Lorem ipsum placeholder</td>
                          <td>
                            <span>
                              <Link
                                href="rfq-management-vendor"
                                className="page-link"
                              >
                                View
                              </Link>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <form>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="col-md-6">
                        <div className="form-group">
                          <select
                            name="location"
                            id="location"
                            className="location"
                            disabled
                          >
                            <option value="Delivery location">
                              Delivery location
                            </option>
                          </select>

                          <input
                            type="text"
                            name="date"
                            id="date"
                            placeholder="Bid Due Date :22 January, 2023"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-group">
                          <label htmlFor="wapp" className="form-label">
                            Email*
                          </label>
                          <input
                            type="text"
                            id="wapp"
                            className="form-control"
                            name="wapp"
                            placeholder="lorem@email.com"
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label htmlFor="wapp" className="form-label">
                            Contact person
                          </label>
                          <input
                            type="text"
                            id="wapp"
                            className="form-control"
                            name="wapp"
                            placeholder="John Doe"
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-group">
                          <label htmlFor="wapp" className="form-label">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            id="wapp"
                            className="form-control"
                            name="wapp"
                            placeholder="1234567890"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-8">
                        <h4>Terms & Conditions</h4>

                        <ol>
                          <li>
                            Lorem Ipsum is simply dummy text of the printing and
                            typesetting industry. Lorem Ipsum has been the
                            industry's standard dummy text ever since the 1500s,
                            lorem .
                          </li>
                          <li>
                            Lorem Ipsum is simply dummy text of the printing and
                            typesetting industry. Lorem Ipsum has been the
                            industry's standard dummy text ever since the 1500s,
                            lorem .
                          </li>
                          <li>
                            Lorem Ipsum is simply dummy text of the printing and
                            typesetting industry. Lorem Ipsum has been the
                            industry's standard dummy text ever since the 1500s,
                            lorem .
                          </li>
                          <li>
                            Lorem Ipsum is simply dummy text of the printing and
                            typesetting industry. Lorem Ipsum has been the
                            industry's standard dummy text ever since the 1500s,
                            lorem .
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="d-flex gap-3">
                      {rfqStatus === 1 && (
                        <Link 
                          href={`/dashboard/buyer/edit-rfq/${data.rfq_no}`} 
                          className="btn btn-primary"
                        >
                          Edit RFQ
                        </Link>
                      )}
                      {rfqStatus === 1 && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={onCloseRFQ}
                          disabled={closeLoading}
                        >
                          {closeLoading ? "Processing..." : "Mark RFQ as Closed"}
                        </button>
                      )}
                      {rfqStatus === 2 && (
                        <button type="button" className="btn btn-danger" disabled>
                          RFQ is Closed
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ViewRFQ;