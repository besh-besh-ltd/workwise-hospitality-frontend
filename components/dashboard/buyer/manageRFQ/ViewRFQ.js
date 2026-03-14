import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { getEntityLabel } from "@/utils/sharedFunctions";
import ReadMore from "@/components/shared/ReadMore";

const ViewRFQ = ({ data, onCloseRFQ, closeLoading }) => {
  console.log("RFQ Data in ViewRFQ:", data);

  // Convert status to number for consistent comparison
  const rfqStatus = data?.status ? Number(data.status) : 0;

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Tender / RFQ Management</h1>
        </div>
      </section>

      <section className="buyer-rfq-det-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="manage-rfq-con">
                {/* Content for Manage RFQs tab */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="title">
                    {data.title && <ReadMore content={data.title} maxLines={2} additionalClasses="fw-bold" />}
                    {getEntityLabel(data?.is_tender)} #{data.rfq_no} details
                  </span>
                  
                  <div className="d-flex gap-2">
                    <Link
                      href={`/dashboard/buyer/query?rfq_id=${data.rfq_no}&role=buyer`}
                      className="btn btn-primary"
                      id="queries_button-rfq_header-view_rfq_page"
                    >
                      Queries
                    </Link>
                    <Link
                      href={`/dashboard/buyer/quote-compare?rfq_id=${data.rfq_no}`}
                      className="btn btn-primary"
                      id="compare_quotes_button-rfq_header-view_rfq_page"
                    >
                      Compare Quotes
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled
                      id="no_quotes_received-rfq_header-view_rfq_page"
                    >
                      No Quotes Received
                    </button>
                    <Link
                      href={`/dashboard/buyer/technical-evaluation?rfq_id=${data.rfq_no}`}
                      className="btn btn-info"
                      id="technical_evaluation-rfq_header-view_rfq_page"
                    >
                      Technical Evaluation
                    </Link>
                  </div>
                </div>

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
                              <span id="view_tds_file_1-file_actions-view_rfq_page">
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span id="download_tds_file_1-file_actions-view_rfq_page">
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
                              <span id="view_qap_file_1-file_actions-view_rfq_page">
                                <FontAwesomeIcon icon={faEye} />
                              </span>
                              <span id="download_qap_file_1-file_actions-view_rfq_page">
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
                                id="view_selected_vendors_1-vendor_section-view_rfq_page"
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
                                id="view_selected_vendors_3-vendor_section-view_rfq_page"
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
                        <div className="d-flex justify-content-between align-items-center">
                          <h4>Terms & Conditions</h4>
                          <Link
                            href="#"
                            className="btn btn-sm btn-outline-primary"
                            id="view_terms_conditions_file-terms_section-view_rfq_page"
                          >
                            View T&C File
                          </Link>
                        </div>

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
                          id="edit_rfq-rfq_actions-view_rfq_page"
                        >
                          Edit {getEntityLabel(data?.is_tender)}
                        </Link>
                      )}
                      {rfqStatus === 1 && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          id="close_rfq-rfq_actions-view_rfq_page"
                          onClick={onCloseRFQ}
                          disabled={closeLoading}
                        >
                          {closeLoading ? "Processing..." : `Mark ${getEntityLabel(data?.is_tender)} as Closed`}
                        </button>
                      )}
                      {rfqStatus === 2 && (
                        <button type="button" className="btn btn-danger" disabled id="rfq_closed-rfq_status-view_rfq_page">
                          {getEntityLabel(data?.is_tender)} is Closed
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