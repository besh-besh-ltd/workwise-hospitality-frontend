import React, { useEffect, useRef, useState } from "react";
import { addVendorAgreement, fetchVendorAgreement, getClausesByRfqProductId, getTechClearedVendorsResult } from "@/services/rfq";
import FileLink from "@/components/shared/FileLink";
import { toast } from "react-toastify";
import FullLoader from "@/components/shared/FullLoader";
import { handleFileUpload } from "@/utils/sharedFunctions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMessage } from "@fortawesome/free-regular-svg-icons";
import BuyerVendorChat from "../../buyer/technical-evaluation/buyerVendorChat";
import { faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/shared/Loader";
import ReadMore from "@/components/shared/ReadMore";
import ConfirmationModal from "@/components/modal/ConfirmationModal";


const VendorResponseTable = ({ rfq_id, product, currentUserProfile, otherUser, token }) => {

  const [buyerClauses, setBuyerClauses] = useState(null);
  const [vendorResponse, setVendorResponse] = useState(null);
  const [chatMap, setChatMap] = useState(null);
  const [filesMap, setFilesMap] = useState(null);
  const [agreementMap, setAgreementMap] = useState(null);
  const [vendorResponseSent, setVendorResponseSent] = useState(0);
  const [techEvalStatus, setTechEvalStatus] = useState(0);
  const [techEvalCleared, setTechEvalCleared] = useState(false);

  const [loading, setLoading] = useState(false);
  const [responseLoading, setResponseLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);

  const fileInputRef = useRef(new Map());


  const handleAttachFileClick = (clauseId) => {
    fileInputRef.current.get(clauseId).click();
  };

  // Upload file to server
  const uploadToServer = async (e, clauseId) => {
    try {
      const filePath = await handleFileUpload(e, token);
      setFilesMap((prevFiles) => {
        const newFiles = new Map(prevFiles);
        const existingFiles = newFiles.get(clauseId) || [];
        newFiles.set(clauseId, [...existingFiles, filePath]);
        return newFiles;
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      e.target.value = null;
    }
  };


  // Fetch technical evaluation result
  const getTechEvalResult = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      rfq_product_id: product.id,
      vendor_id: currentUserProfile.id,
    };
    try {
      const res = await getTechClearedVendorsResult(payload);
      setTechEvalStatus(res.status);
      setTechEvalCleared(res.data)
    } catch (error) {
      console.error("Error fetching tech evaluation data", error);
    }
  };

  const getBuyerClauses = async () => {
    const payload = {
      rfq_product_id: product.id,
      vendor_id: currentUserProfile.id
    }
    try {
      setLoading(true);
      const res = await getClausesByRfqProductId(payload);
      setVendorResponseSent(res.vendor_response);
      setBuyerClauses(res.data);
    } catch (error) {
      toast.error("Unable to load clauses. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Fetch vendor response
  const getVendorResponse = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      rfq_product_id: product.id,
      vendor_id: currentUserProfile.id,
    };
    try {
      setResponseLoading(true);
      const res = await fetchVendorAgreement(payload);
      if (!res.status) {
        toast.warning(res.message);
        return;
      }

      let cMap = new Map();
      let aMap = new Map();
      let fMap = new Map();

      res.data.map((resItem) => {
        cMap.set(resItem.clause_id, false);
        aMap.set(resItem.clause_id, resItem.vendor_response);
        fMap.set(resItem.clause_id, resItem.vendor_response_files || []);
      })

      setChatMap(cMap);
      setAgreementMap(aMap);
      setFilesMap(fMap);
      setVendorResponse(res.data);
    } catch (error) {
      console.error("Error fetching clauses", error);
    } finally {
      setResponseLoading(false);
    }
  };

  const toggleChat = (clause_id) => {
    setChatMap((prevMap) => {
      const newMap = new Map(prevMap);
      for (let [key] of prevMap) {
        newMap.set(key, false);
      }
      newMap.set(clause_id, !prevMap.get(clause_id));
      return newMap;
    });
  };

  // Handle agreement status change
  const handleAgreementChange = (clauseId, status) => {
    setAgreementMap((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(clauseId, status);
      return newMap;
    });
  };

  const handleRemoveFile = (clauseId, file) => {
    setFilesMap((prevFiles) => {
      const newFiles = new Map(prevFiles);
      const existingFiles = newFiles.get(clauseId) || [];
      const updatedFiles = existingFiles.filter((fileItem) => fileItem != file);
      newFiles.set(clauseId, updatedFiles);
      return newFiles;
    });
  }

  // Submit the agreement
  const handleSendAgreement = async () => {
    setShowSubmitConfirmModal(true);
  };

  const handleSubmitConfirm = async () => {
    const payload = Array.from(agreementMap.entries()).map(([clause_id, value]) => ({
      rfq_id,
      rfq_product_id: product.id,
      clause_id,
      vendor_response: value,
      vendor_id: currentUserProfile.id,
      file_url: filesMap.get(clause_id) || [],
    }));

    try {
      setSubmitLoading(true);
      await addVendorAgreement(payload);
      getBuyerClauses();
      getVendorResponse();
      setShowSubmitConfirmModal(false);
    } catch (error) {
      toast.error("Failed to submit technical evaluation response. Please try again.");
      setShowSubmitConfirmModal(false);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmitCancel = () => {
    setShowSubmitConfirmModal(false);
  };

  // Initial data fetch
  useEffect(() => {
    getTechEvalResult();
    getVendorResponse();
  }, [rfq_id, product]);

  useEffect(() => {
    if (product)
      getBuyerClauses()
  }, [product])

  const hasVendorResponses = Array.isArray(vendorResponse) && vendorResponse.length > 0;
  let clauseTotal = 0;
  let clauseResponded = 0;
  let clausePct = 0;
  let clauseIsComplete = false;

  if (hasVendorResponses && agreementMap) {
    clauseTotal = vendorResponse.length;
    clauseResponded = vendorResponse.filter(
      (item) =>
        agreementMap.get(item.clause_id) === "I Agree" ||
        agreementMap.get(item.clause_id) === "I Dont Agree"
    ).length;
    clausePct = clauseTotal > 0 ? Math.round((clauseResponded / clauseTotal) * 100) : 0;
    clauseIsComplete = clauseResponded === clauseTotal;
  }

  return (
    <>
      {submitLoading && <Loader />}

      {/* Technical Evaluation Status */}
      {vendorResponseSent ?
        <div className="my-3">
          {techEvalStatus == 1 ?
            techEvalCleared.status == 1 ?
              <span
                className="fw-medium text-bg-success px-3 py-2"
                style={{ borderRadius: "0 18px 18px 0", fontSize: "16px" }}
              >
                Congratulations...! You are Technically Accepted
              </span>
              :
              <>
                <p className="sub-heading mb-3">
                  <b>Reject Reason</b>:{" "}
                  {techEvalCleared.reject_message}
                </p>
                <span
                  className="fw-medium text-bg-danger px-3 py-2 "
                  style={{ borderRadius: "0 18px 18px 0", fontSize: "16px" }}
                >
                  You are not Technically Cleared.
                </span>
              </>
            :
            <span
              className="fw-medium text-bg-warning px-3 py-2"
              style={{ borderRadius: "0 18px 18px 0", fontSize: "16px" }}
            >
              Your response has been sent. Please wait for Buyer Clearance. You may update your responses below.
            </span>}
        </div>
        : null
      }

      {/* Clause Progress */}
      {hasVendorResponses && (
        <div className="my-3">
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="fw-semibold" style={{ fontSize: "0.9rem" }}>
                Clause Progress: {clauseResponded} of {clauseTotal} responded
              </span>
              <span className={`badge ${clauseIsComplete ? "bg-success" : "bg-secondary"}`} style={{ fontSize: "0.8rem" }}>
                {clausePct}%
              </span>
            </div>
            <div className="progress" style={{ height: "8px" }}>
              <div
                className={`progress-bar ${clauseIsComplete ? "bg-success" : "bg-primary"}`}
                role="progressbar"
                style={{ width: `${clausePct}%`, transition: "width 0.3s ease" }}
                aria-valuenow={clausePct}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Buyer All Clauses */}
      {/* <div className="text-sm my-3 hasFullLoader" >
        {loading ?
          <FullLoader />
          :
          <table className="table table-bordered table-striped">
            <thead>
              <tr className="table-dark">
                <th className="col-8">Clause Terms</th>
                <th className="col-4">File Attachments</th>
              </tr>
            </thead>

            <tbody>
              {buyerClauses && buyerClauses.length > 0 &&
                buyerClauses.map((clauseItem, index) => (
                  <tr key={`rfq_prod_clause_${clauseItem.clause_id}`}>
                    <td className="col-8">
                      {index + 1}{". "}{clauseItem.clause_text}
                    </td>
                    <td className="col-4">
                      {clauseItem.files && clauseItem.files.length > 0 &&
                        <FileLink key={clauseItem.clause_id} Files={clauseItem.files} ColumnClass="col-md-6" />
                      }
                    </td>
                  </tr>)
                )}
            </tbody>
          </table>
        }
      </div> */}

      {/* Vendor Responses */}
      <div className="text-sm hasFullLoader">
        {responseLoading ?
          <FullLoader />
          :
          vendorResponse && vendorResponse.length > 0 &&
          <>
            <h3 className="fs-5 mb-3">
              <span className="fw-semibold">Action</span>
            </h3>
            <table className="table table-bordered table-striped" >
              <thead>
                <tr className="table-dark text-nowrap" style={{ backgroundColor: "var(--primary-color) !important" }}>
                  <th>Clause Terms</th>
                  <th>Attached Files</th>
                  <th>Vendor Response</th>
                  <th>Cross Reference Document</th>
                  <th>Comment</th>
                </tr>
              </thead>

              <tbody>
                {vendorResponse.map((clauseItem, index) => (
                  <>
                    <tr key={`ven_res_clause_${clauseItem.clause_id}`}>
                      <td>
                        <ReadMore content={`${index + 1}. ${clauseItem.clause_text}`} maxLines={4} />
                      </td>
                      <td style={{ maxWidth: "260px" }}>
                        {clauseItem.clause_files && clauseItem.clause_files?.length > 0
                          ? <FileLink Files={clauseItem.clause_files} />
                          : "N/A"
                        }
                      </td>
                      <td>
                        <span className="d-flex gap-2 text-nowrap">
                          <button
                            type="button"
                            className={`border border-success ${agreementMap.get(clauseItem.clause_id) == "I Agree" ? "bg-success text-white" : "bg-white text-success"} px-2 py-1 rounded-3`}
                            style={{ fontSize: "13px" }}
                            onClick={() => handleAgreementChange(clauseItem.clause_id, "I Agree")}
                            disabled={techEvalStatus == 1}
                            id="agree_clause-clause_actions-technical_evaluation_page"
                          >
                            I Agree
                          </button>
                          <button
                            type="button"
                            className={`border border-danger ${agreementMap.get(clauseItem.clause_id) == "I Dont Agree" ? "bg-danger text-white" : "bg-white text-danger"} px-2 py-1 rounded-3`}
                            style={{ fontSize: "13px" }}
                            onClick={() => handleAgreementChange(clauseItem.clause_id, "I Dont Agree")}
                            disabled={techEvalStatus == 1}
                            id="disagree_clause-clause_actions-technical_evaluation_page"
                          >
                            I Dont Agree
                          </button>
                        </span>
                      </td>
                      <td style={{ maxWidth: "260px" }}>
                        {techEvalStatus == 1 ?
                          clauseItem.vendor_response_files.length > 0 ?
                            <FileLink
                              key={clauseItem.clause_id}
                              Files={clauseItem.vendor_response_files}
                            />
                            : "N/A"
                          : <>
                            <span
                              role="button"
                              className="page-link d-block mx-auto"
                              style={{ textDecoration: "none" }}
                              onClick={() => handleAttachFileClick(clauseItem.clause_id)}
                              id={`upload_file_${clauseItem.clause_id}-clause_actions-technical_evaluation_page`}
                            >
                              <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                              Upload
                            </span>

                            {filesMap.get(clauseItem.clause_id)?.length > 0 &&
                              <FileLink
                                Files={filesMap.get(clauseItem.clause_id)}
                                showDownload={false}
                                RemoveFile={(fileType, file) => handleRemoveFile(clauseItem.clause_id, file)}
                              />
                            }

                            {/* Hidden file input field triggered by the "Attach file" button */}
                            <input
                              ref={(ref) => fileInputRef.current.set(clauseItem.clause_id, ref)}
                              type="file"
                              accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                              style={{ display: 'none' }}
                              onChange={(e) => uploadToServer(e, clauseItem.clause_id)}
                            />

                          </>
                        }
                      </td>
                      <td>
                        <button
                          type="button"
                          className="d-flex justify-content-center align-items-center border-0 p-1 rounded-2"
                          style={{ width: "100px", backgroundColor: "var(--primary-color)", color: "#ffffff", fontSize: "13px" }}
                          onClick={() => toggleChat(clauseItem.clause_id)}
                          id="explanation_deviation-clause_actions-technical_evaluation_page"
                        >
                          Explanation / Deviation
                        </button>
                      </td>

                    </tr>

                    {chatMap.get(clauseItem.clause_id) &&
                      <BuyerVendorChat
                        showChat={chatMap.get(clauseItem.clause_id)}
                        closeChat={() => toggleChat(clauseItem.clause_id)}
                        type="Vendor"
                        data={clauseItem}
                        userData={currentUserProfile}
                        otherUser={otherUser}
                        product = {product}
                        token ={token}
                      />
                    }
                  </>)
                )}
              </tbody>
            </table>

            {techEvalStatus != 1 && <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-secondary border-0"
                onClick={handleSendAgreement}
                id="submit_agreement-agreement_actions-technical_evaluation_page"
              >
                {vendorResponseSent ? "Update Response" : "Submit"}
              </button>
            </div>}
          </>}
      </div>

      {/* Submit Technical Evaluation Response Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSubmitConfirmModal}
        onClose={handleSubmitCancel}
        onConfirm={handleSubmitConfirm}
        title={vendorResponseSent ? "Update Technical Evaluation Response" : "Submit Technical Evaluation Response"}
        description={vendorResponseSent
          ? "Are you sure you want to update your technical evaluation response?\nThis action will send your updated response to the buyer."
          : "Are you sure you want to submit your technical evaluation response?\nThis action will send your response to the buyer."
        }
        confirmButtonColor="success"
        confirmButtonText={vendorResponseSent ? "Update Response" : "Submit Response"}
        cancelButtonText="Cancel"
      />

    </>
  );
};


export default VendorResponseTable;