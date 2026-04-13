import { faEye } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaHistory } from "react-icons/fa";
import moment from "moment";
import { getEntityLabel, canEditRfq, getRFQPublishState } from "@/utils/sharedFunctions";
import PublishDateTimer from "@/components/shared/PublishDateTimer";
import ReadMore from "@/components/shared/ReadMore";
import NoTechClausesBanner from "@/components/shared/NoTechClausesBanner";
import useHasTechClauses from "@/hooks/useHasTechClauses";
import RFQEditHistory from "./RFQEditHistory/RFQEditHistory";

// WH-69: Edit button that uses canEditRfq() to decide whether to render
// enabled (a Link) or disabled (a button with a hover tooltip explaining
// the reason). Used everywhere the details page offers an Edit action.
const EditRfqButton = ({ data, currentUser, label, idAttr }) => {
  const { allowed, reason } = canEditRfq(data, currentUser);
  if (allowed) {
    return (
      <Link
        href={`/dashboard/buyer/rfq-management-edit?id=${data.id}`}
        className="btn btn-primary"
        id={idAttr}
      >
        {label}
      </Link>
    );
  }
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`edit-disabled-${data?.id || 'x'}`}>{reason}</Tooltip>}
    >
      <span className="d-inline-block">
        <button
          type="button"
          className="btn btn-primary"
          disabled
          style={{ cursor: 'not-allowed', opacity: 0.65, pointerEvents: 'none' }}
          id={idAttr}
        >
          {label}
        </button>
      </span>
    </OverlayTrigger>
  );
};

const ViewRFQ = ({ data, onCloseRFQ, closeLoading, isCreator, onWithdrawPublish, withdrawLoading, onTerminate }) => {
  console.log("RFQ Data in ViewRFQ:", data);

  // WH-69: Edit history modal open/close state
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);

  // WH-69: shared edit-permission helper. Pulls the current user from Redux
  // since this component already has many other props and we don't want to
  // thread it through.
  const currentUser = useSelector((state) => state.userProfile);

  // Check if RFQ has any technical clauses
  const { hasClauses, loading: clauseLoading } = useHasTechClauses({ rfq_id: data?.id });

  // Convert status to number for consistent comparison
  const rfqStatus = data?.status ? Number(data.status) : 0;
  const publishState = getRFQPublishState(data);

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

                {!clauseLoading && hasClauses === false && data?.id && (
                  <NoTechClausesBanner entityLabel={getEntityLabel(data?.is_tender)} />
                )}

                {/* Key dates info bar */}
                {data?.id && (
                  <div className="d-flex flex-wrap gap-4 mb-3 p-3 bg-light rounded border">
                    {publishState.isPrePublishState && data.tender_publish_date ? (
                      <div>
                        <small className="text-muted d-block">Scheduled Publish</small>
                        <PublishDateTimer publishDate={data.tender_publish_date} variant="full" />
                      </div>
                    ) : data.is_published === 1 && (
                      <div>
                        <small className="text-muted d-block">Published On</small>
                        <strong>{moment(data.tender_publish_date || data.timestamp).format('DD MMM YYYY, hh:mm A')}</strong>
                      </div>
                    )}
                    {data.bid_end_date && (
                      <div>
                        <small className="text-muted d-block">Bid Submission Deadline</small>
                        <strong>{moment(data.bid_end_date).format('DD MMM YYYY, hh:mm A')}</strong>
                      </div>
                    )}
                    {data.vendor_clarification_date && (
                      <div>
                        <small className="text-muted d-block">Clarification Deadline</small>
                        <strong>{moment(data.vendor_clarification_date).format('DD MMM YYYY, hh:mm A')}</strong>
                      </div>
                    )}
                    <div>
                      <small className="text-muted d-block">Created On</small>
                      <strong>{moment(data.timestamp).format('DD MMM YYYY')}</strong>
                    </div>
                  </div>
                )}

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
                      {/* WH-69: Edit button gated by canEditRfq() — disabled
                          with an explanatory tooltip whenever the current user
                          is not the creator, the RFQ is closed, the bid window
                          has passed, or every product has been finalized. */}
                      {rfqStatus === 1 && (
                        <EditRfqButton
                          data={data}
                          currentUser={currentUser}
                          label={`Edit ${getEntityLabel(data?.is_tender)}`}
                          idAttr="edit_rfq-rfq_actions-view_rfq_page"
                        />
                      )}
                      {rfqStatus === 1 && isCreator && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          id="close_rfq-rfq_actions-view_rfq_page"
                          onClick={onCloseRFQ}
                          disabled={closeLoading}
                        >
                          {closeLoading ? "Processing..." : `Close ${getEntityLabel(data?.is_tender)}`}
                        </button>
                      )}
                      {rfqStatus === 2 && (
                        <button type="button" className="btn btn-danger" disabled id="rfq_closed-rfq_status-view_rfq_page">
                          {getEntityLabel(data?.is_tender)} is Closed
                        </button>
                      )}
                      {(rfqStatus === 3 || rfqStatus === 4) && (
                        <>
                          {/* WH-69: creators can now edit during the
                              pending-approval / ready-to-publish window */}
                          <EditRfqButton
                            data={data}
                            currentUser={currentUser}
                            label={`Edit ${getEntityLabel(data?.is_tender)}`}
                            idAttr="edit_rfq-rfq_actions-view_rfq_page"
                          />
                          {/* Withdraw and Terminate are creator-only actions */}
                          {isCreator && (
                            <>
                              <button
                                type="button"
                                className="btn btn-warning"
                                id="withdraw_publish-rfq_actions-view_rfq_page"
                                onClick={onWithdrawPublish}
                                disabled={withdrawLoading}
                              >
                                {withdrawLoading ? "Processing..." : "Withdraw Publish Request"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger"
                                id="terminate_rfq-rfq_actions-view_rfq_page"
                                onClick={onTerminate}
                                disabled={false}
                              >
                                Terminate {getEntityLabel(data?.is_tender)}
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {rfqStatus === 5 && (
                        <>
                          <EditRfqButton
                            data={data}
                            currentUser={currentUser}
                            label={`Edit ${getEntityLabel(data?.is_tender)}`}
                            idAttr="edit_rfq-rfq_actions-view_rfq_page"
                          />
                          <button type="button" className="btn btn-secondary" disabled id="rfq_withdrawn-rfq_status-view_rfq_page">
                            Publish Request Withdrawn
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* WH-69: Edit history modal — opened from the floating
                  "Edit History" button below. */}
              {data?.id && (
                <>
                  <div className="container-fluid mt-3 d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => setShowEditHistoryModal(true)}
                    >
                      <FaHistory style={{ marginRight: 8 }} />
                      Show Edit History
                    </button>
                  </div>
                  <RFQEditHistory
                    rfqId={data.id}
                    isOpen={showEditHistoryModal}
                    onClose={() => setShowEditHistoryModal(false)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ViewRFQ;