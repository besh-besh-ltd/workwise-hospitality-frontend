import React, { useEffect, useRef, useState } from "react";
import { addToTA, addVendorAgreement, fetchVendorAgreement, getClausesByRfqProductId, getTechClearedVendorsResult} from "@/services/rfq";
import BuyerVendorChat from "./buyerVendorChat";
import FileLink from "@/components/shared/FileLink";
import { toast } from "react-toastify";
import NotTA from "./NotTA";
import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileUpload } from "@fortawesome/free-solid-svg-icons";
import { handleFileUpload } from "@/utils/sharedFunctions";
import { useDispatch } from "react-redux";
import {
  removeFiles,
} from "@/redux/slice";
import Link from "next/link";


const VendorResponseTable = ({ data, type, rfq_id, currentUserProfile, currentRfq, selectedVendor }) => {
  const [showMessages, setShowMessages] = useState(false);
  const [clauseList, setClauseList] = useState(null);
  const [isModelOpen, setIsModalOpen] = useState(false);
  const [rowAgreement, setRowAgreement] = useState({});
  const [clauseMap, setClauseMap] = useState(new Map());
  const [agreementMap, setAgreementMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const [technicallyAccepted, setTechnicallyAccepted] = useState(true);
  const [showModel, setShowModel] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState(null)

  const [status, setStatus] = useState(false);
  const [techEvalClearedData, setTechEvalClearedData] = useState("");
  const [buyerClauses, setBuyerClauses] = useState(null);
  const [agreementSent, setAgreementSent] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [filesList, setFilesList] = useState([]);

  const fileInputRef = useRef({});
  const [vendorResponse, setVendorResponse] = useState(null);
  const [isMessageSend, setIsMessageSend] = useState(false);
  const [files, setFiles] = useState(new Map());
  const dispatch = useDispatch();

  const handleRemoveFile = (clauseId, fileUrl) => {
    setFiles((prev) => {
      const updatedFiles = new Map(prev);
      const existingFiles = updatedFiles.get(clauseId) || [];
      updatedFiles.set(clauseId, existingFiles.filter((file) => file !== fileUrl));
      console.log("v u remove file = ", updatedFiles);
      return updatedFiles;
    });

    dispatch(
      removeFiles({
        value: fileUrl,
      })
    );
  };

  const handleMessageSend = () => {
    setIsMessageSend(true);
  }
  const handleAttachFileClick = (clauseId) => {
    if (fileInputRef.current[clauseId]) {
      fileInputRef.current[clauseId].click(); // Trigger the file input when the "Attach file" button is clicked
    }
  };

  const uploadToServer = async (e, clauseId) => {
    setFileLoading(true);
    console.log("clause ID of map = ", clauseId);
    try {
      const filePath = await handleFileUpload(e); // Get file path from the upload
      setFiles((prev) => {
        const newFiles = new Map(prev);
        const existingFiles = newFiles.get(clauseId) || [];
        newFiles.set(clauseId, [...existingFiles, filePath]);
        console.log("v u files = ", newFiles);
        return newFiles;
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFileLoading(false);
      e.target.value = null; // Reset file input value
    }
  };
  useEffect(() => {
    const getTechEvalResult = async () => {
      console.log("current user profile = ", currentUserProfile)
      const payload = {
        rfq_id: parseInt(rfq_id),
        rfq_product_id: type == "buyer" ? data.rfq_product_id - 1 : data.id - 1,

        vendor_id: type === 'buyer' ? selectedVendor : currentUserProfile.id
      }
      console.log("get tech eval result = ", payload);
      try {
        const res = await getTechClearedVendorsResult(payload);
        if (res.status === 1) {
          setStatus(true);
          setTechEvalClearedData(res.data);
        }
      } catch (error) {
        console.error("Error in fetching tech evaluation cleared vendors", error);
      }
    }
    getTechEvalResult();
  }, [])


  const addToTechnicallyAccepted = async () => {
    const payload = {
      vendor_id: selectedVendor,
      rfq_product_tech_evaluation_id: currentRfq.products[0].tbl_rfq_product_tech_evaluation_id,
      status: 1,
      reject_message: null
    }
    console.log("selected vendor = ", selectedVendor);
    console.log("padyload of TAA = ", payload);
    try {
      const res = await addToTA(payload);
      if (res.status == 1) {
        console.log("successfully added to TA");
      }
      toast.success("Congratulations, this Vendor is technically Accepted!!")

    } catch (error) {
      console.error("Error in the process:", error);
    }
  }
  const handleTechnicallyAccepted = () => {
    addToTechnicallyAccepted();
    setEvaluationStatus('accepted')
  }
  const handleTechnicallyNotAccepted = () => {
    setTechnicallyAccepted(false);
    setShowModel(true);
  }
  const handleCloseModal = () => {
    setShowModel(false);
  }

  const handleAgreementChange = (clause_id, status) => {
    setAgreementMap((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.set(clause_id, status);
      return newMap;
    });

    setRowAgreement((prev) => ({
      ...prev,
      [clause_id]: status,
    }));
  };

  // Function to retrieve current agreement status
  const getAgreementStatus = (clause_id) => rowAgreement[clause_id] || '';

  const toggleChat = (clause_id) => {
    setClauseMap((prevMap) => {
      const newMap = new Map(prevMap);
      for (let [key] of prevMap) {
        newMap.set(key, false);
      }
      newMap.set(clause_id, !prevMap.get(clause_id));
      return newMap;
    });
  };

  const handleSaveAgreement = async () => {
    const agreementList = Array.from(agreementMap.entries()).map(([clause_id, value]) => ({
      rfq_id,
      rfq_product_id: data.id,
      clause_id,
      vendor_response: value,
      vendor_id: currentUserProfile.id,
      file_url: files.has(clause_id) ? files.get(clause_id) : [],
    }));

    try {
      setIsLoading(true);
      const res = await addVendorAgreement(agreementList)
      console.log(res);
      setAgreementSent(true);
      getVendorResponse();
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  const getVendorResponse = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      rfq_product_id: type === 'buyer' ? data.rfq_product_id - 1 : data.id - 1,
      vendor_id: type === 'buyer' ? selectedVendor : currentUserProfile.id,
    }
    console.log("payload for vendor names = ", payload);

    try {
      setIsLoading(true);
      const res = await fetchVendorAgreement(payload);
      if (!res.status) {
        toast.warning(res.message);
        return;
      }

      const newClauseMap = new Map();
      const newAgreementMap = new Map();
      const newRowAgreement = {};
      const fileMap = new Map();

      res.data.forEach((clause) => {
        newClauseMap.set(clause.clause_id, false);
        newAgreementMap.set(clause.clause_id, '');
        newRowAgreement[clause.clause_id] = '';
      });

      setClauseMap(newClauseMap);
      setAgreementMap(newAgreementMap);
      setRowAgreement(newRowAgreement);
      setFiles(fileMap)
      console.log("file map = ", fileMap)
      setClauseList(res.data);
      setBuyerClauses(res.data);
    } catch (error) {
      console.error("Error fetching clauses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getClauses = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      rfq_product_id: type === 'buyer' ? data.rfq_product_id : data.id - 1,
    }
    try {
      const res = await getClausesByRfqProductId(payload)
      // setBuyerClauses(res.data);
      const vendor_response = res.vendor_response;
      console.log("vendor_respons = ", vendor_response)
      setVendorResponse(vendor_response);
      console.log("vendorResponse = ", vendorResponse);
      console.log("get clauses response = ", res)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getClauses();
  }, []);

  useEffect(() => {
    console.log("vendor response useeffect = ", vendorResponse);
  }, [vendorResponse])

  useEffect(() => {
    console.log("before calling v response", rfq_id, data)
    if (rfq_id && data)
      getVendorResponse();
  }, [rfq_id, data])

  return (
    <>
      {type === "vendor" &&
        <>
          {isLoading && <FullLoader />}
          {buyerClauses && buyerClauses?.length > 0 &&
            <>
              {status && techEvalClearedData.status === 0 && <p className="badge text-bg-danger">You have been technically Not Accepted for this product. Reason: <i>{techEvalClearedData.reject_message}</i></p>}
              {status && techEvalClearedData.status === 1 && <p className="badge text-bg-success">Congratulations!!, you have been Technically accepted by the buyer.</p>}
              <div className="table-content" key={`product_item_${data.id}`}>
                {isLoading && <Loader />}
                <div className="table-elements">
                  <div className="table-row">
                    <div className="table-col">

                      <div className="table-si-row"></div>
                      {buyerClauses.map((clause) => {
                        return (
                          <div className="table-si-row" key={`tbl_row_${clause.clause_id}`}>
                            {/* {clause.clause_text} */}
                            <div
                              style={{
                                maxWidth: '800px', // Approximate width to wrap after 100 characters
                                whiteSpace: 'normal',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                              }}
                            >
                              {clause.clause_text}
                            </div>

                          </div>
                        )
                      })}
                    </div>

                    {/* Files */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Attached Files</span>
                      </div>
                      {buyerClauses.map((clause) => (
                        <div className="table-si-row" key={clause.clause_id}>
                          {(clause.clause_files) && clause.clause_files.length > 0 ? (
                            clause.clause_files.map((file, idx) => (
                              <FileLink
                                Files={file}
                                ColumnClass="col-md-4"
                                Style={{ fontSize: "12px" }}
                                showDownload={false}
                              />
                            ))
                          ) : (
                            <p className="sub-heading mb-0">N/A</p>
                          )}
                        </div>
                      ))}

                    </div>

                    {/* Technical Evaluation */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Your Response</span>
                      </div>
                      {buyerClauses.map((clause) => {
                        const agreementStatus = getAgreementStatus(clause.clause_id); // Retrieve current agreement status

                        return (
                          <div className="table-si-row" key={`agree_button_${clause.clause_id}`}>
                            {
                              clause.vendor_response && clause.vendor_response !== "" ? (
                                <button
                                  style={{
                                    border: clause.vendor_response === "I Agree" ? "1px solid lightgreen" : "1px solid lightcoral",
                                    color: clause.vendor_response === "I Agree" ? "white" : clause.vendor_response === "I Dont agree" ? "white" : "lightgreen",
                                    backgroundColor: clause.vendor_response === "I Agree" ? "lightgreen" : clause.vendor_response === "I Dont agree" ? "lightcoral" : "white",
                                    padding: "1px 4px",
                                    marginRight: "10px",
                                    cursor: "not-allowed",
                                    borderRadius: "5px",
                                  }}
                                  disabled
                                >
                                  {clause.vendor_response}
                                </button>
                              ) : (
                                <>
                                  {/* Agree Button */}
                                  <button
                                    style={{
                                      border: "1px solid lightgreen",
                                      color: agreementStatus === "I Agree" ? "white" : "lightgreen",
                                      backgroundColor: agreementStatus === "I Agree" ? "lightgreen" : "white",
                                      padding: "1px 4px",
                                      marginRight: "10px",
                                      cursor: "pointer",
                                      borderRadius: "5px",
                                    }}
                                    onClick={() => handleAgreementChange(clause.clause_id, "I Agree")}
                                  >
                                    I Agree
                                  </button>

                                  {/* Disagree Button */}
                                  <button
                                    style={{
                                      border: "1px solid lightcoral",
                                      color: agreementStatus === "I Dont agree" ? "white" : "lightcoral",
                                      backgroundColor: agreementStatus === "I Dont agree" ? "lightcoral" : "white",
                                      padding: "1px 4px",
                                      cursor: "pointer",
                                      borderRadius: "5px",
                                    }}
                                    onClick={() => handleAgreementChange(clause.clause_id, "I Dont agree")}
                                  >
                                    I Don't Agree
                                  </button>
                                </>
                              )
                            }
                          </div>
                        );
                      })}

                    </div>

                    {/* Files */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        {(vendorResponse === 1 ? <span>Uploaded Files</span> : <span>Attach Your Files</span>)}
                      </div>

                      {buyerClauses.map((clause, i) => {
                        return (
                          <>
                            {(agreementSent === false && vendorResponse === 0) ? (
                              <div className="table-si-row" key={i}>
                                <div className="d-flex justify-content-start align-items-center" style={{ width: '100%', gap: "20px" }}>
                                  {/* Upload Button stays in place */}
                                  <div
                                    onClick={() => handleAttachFileClick(clause.clause_id)}
                                    style={{ cursor: "pointer", marginRight: '40px', fontSize: "14px" }}
                                  >
                                    <FontAwesomeIcon icon={faFileUpload} className="me-2" />
                                    Upload
                                  </div>

                                  <input
                                    ref={(el) => (fileInputRef.current[clause.clause_id] = el)}
                                    type="file"
                                    accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                    style={{ display: "none" }}
                                    onChange={(e) => uploadToServer(e, clause.clause_id)}
                                  />

                                  {/* File URL will appear to the right of the upload button */}
                                  {files.has(clause.clause_id) && files.get(clause.clause_id).length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center',flexDirection:"column" }}>
                                      {/* "x" symbol to the left of file URL */}
                                      {files.get(clause.clause_id).map((file, idx) => (
                                        <div key={idx} style={{ display: "inline-block", marginLeft: "5px" }}>
                                          {/* "x" symbol to the left of file URL */}
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              color: 'grey',
                                              cursor: 'pointer',
                                              marginRight: '5px',  // Space between "x" and file URL
                                              fontWeight: "800",
                                              textDecoration: 'none',
                                            }}
                                            onMouseOver={(e) => (e.target.style.color = 'darkred')}
                                            onMouseOut={(e) => (e.target.style.color = 'grey')}
                                            onClick={() => handleRemoveFile(clause.clause_id, file)}
                                          >
                                            X
                                          </span>
                                          <FileLink
                                            Files={file}
                                            ColumnClass="col-md-4"
                                            Style={{ fontSize: "10px" }}
                                            showDownload={false}
                                          />
                                        </div>
                                      ))}

                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              (agreementSent === true || vendorResponse === 1) && (
                                <div className="table-si-row">
                                  {/* Display files if the agreement is already sent or vendor response exists */}
                                  {(clause.vendor_response_files && clause.vendor_response_files.length > 0) ? (
                                    clause.vendor_response_files.map((file, idx) => (
                                      <FileLink
                                        key={idx}
                                        Files={file}
                                        ColumnClass="col-md-4"
                                        Style={{ fontSize: "12px" }}
                                        showDownload={false}
                                      />
                                    ))
                                  ) : (
                                    <p className="text-muted">N/A</p>
                                  )}
                                </div>
                              )
                            )}
                          </>
                        );
                      })}
                    </div>


                    {/* New "Messages" column */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Messages</span>
                      </div>

                      {buyerClauses.map((clause) => {
                        return (
                          <div className="table-si-row" key={`open_chat_${clause.clause_id}`}>
                            <button
                              className="text-dark-blue"
                              style={{
                                fontSize: '0.8rem',
                                padding: '5px 10px',
                                display: 'inline-block',
                                border: 'none',
                                backgroundColor: 'lightblue',
                                color: 'darkblue',
                                textDecoration: 'none',
                              }}
                              onClick={() => toggleChat(clause.clause_id)}
                            >
                              {clauseMap.get(clause.clause_id) === true ? 'Close Chat' : 'Open Chat '}
                            </button>
                            {clauseMap.get(clause.clause_id) === true && (
                              <BuyerVendorChat
                                showChat={clauseMap.get(clause.clause_id)}
                                closeChat={() => toggleChat(clause.clause_id)}
                                type="Buyer"
                                data={clause}
                                userData={currentUserProfile}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <>
                {!status ? (
                  <>
                    {(agreementSent === false && vendorResponse === 0) && (
                      <div className="d-flex justify-content-center">
                        <button
                          type="button"
                          className="btn btn-secondary border-0"
                          onClick={handleSaveAgreement}
                        >
                          Submit
                        </button>
                      </div>
                    )}
                    {(agreementSent === true || vendorResponse === 1) && (
                      <p className="d-flex justify-content-center">You have submitted the response.</p>
                    )}
                  </>
                ) : (
                  " "
                )}
              </>

            </>
          }
        </>
      }



      {/* old table */}
      {
        type === "buyer" &&
        (isLoading ?
          <FullLoader />
          : (clauseList && clauseList.length > 0) &&
          <>
            {/* TA and Not TA */}
            {((status && techEvalClearedData.status === 1) || evaluationStatus === 'accepted') ? (<p className="badge text-bg-success">Congratulations!!. You have technically Accepted this vendor.</p>) : ((status && techEvalClearedData.status === 0) || isMessageSend) ? (<p className="badge text-bg-danger">You have technically not Accepted this vendor.</p>) : (

              <>
                <button
                  href={`/dashboard/vendor/technical-evaluation`}
                  className="text-dark-blue"
                  style={{
                    fontSize: '0.8rem',
                    padding: '5px 10px',
                    display: 'inline-block',
                    border: 'none',
                    backgroundColor: 'lightblue',
                    color: 'darkblue',
                    textDecoration: 'none',
                    marginRight: "10px"
                  }}
                  onClick={() => handleTechnicallyAccepted()}
                >
                  Technically Accepted
                </button>

                <button
                  href={`/dashboard/vendor/technical-evaluation`}
                  className="text-dark-blue"
                  style={{
                    fontSize: '0.8rem',
                    padding: '5px 10px',
                    display: 'inline-block',
                    border: 'none',
                    backgroundColor: 'lightblue',
                    color: 'darkblue',
                    textDecoration: 'none',
                  }}
                  onClick={() => handleTechnicallyNotAccepted()}
                >
                  Technically Not Accepted
                </button>
              </>
            )}
            {!technicallyAccepted && showModel && <NotTA onClose={handleCloseModal} show={showModel} data={data} vendor_id={selectedVendor} onClickSend={handleMessageSend} />}

            <div className="table-content">
              <div className="table-elements">
                <div className="table-row">
                  <div className="table-col">
                    <div className="table-si-row"></div>
                    {clauseList.map((clause) => {
                      return (
                        <div className="table-si-row" key={`tbl_row_${clause.clause_id}`}>
                          <div
                            style={{
                              maxWidth: '800px', // Approximate width to wrap after 100 characters
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                          >
                            {clause.clause_text}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Attached Files</span>
                    </div>
                    {clauseList.map((clause) => {
                      return (
                        <div className="table-si-row" key={`tbl_row_${clause.clause_files}`}>
                          {clause.clause_files && clause.clause_files.length > 0 ?
                            clause.clause_files.map((file) => (
                              <FileLink
                                Files={file}
                                ColumnClass="col-md-4"
                                Style={{ fontSize: "12px" }}
                              />
                            ))
                            : "N/A"
                          }
                        </div>
                      )
                    })}
                  </div>

                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Vendor Response</span>
                    </div>
                    {clauseList.map((clause) => {
                      return (
                        <div className="table-si-row" key={`tbl_row_${clause.vendor_response}`}>
                          {clause.vendor_response}
                        </div>
                      )
                    })}
                  </div>

                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Vendor Response Files</span>
                    </div>
                    {clauseList.map((clause) => (
                        <div className="table-si-row" key={clause.clause_id}>
                          {(clause.vendor_response_files) && clause.vendor_response_files.length > 0 ? (
                            clause.vendor_response_files.map((file, idx) => (
                              <FileLink
                                Files={file}
                                ColumnClass="col-md-4"
                                Style={{ fontSize: "12px" }}
                                showDownload={false}
                              />
                            ))
                          ) : (
                            <p className="sub-heading mb-0">N/A</p>
                          )}
                        </div>
                      ))}

                  </div>

                  {/* New "Messages" column */}
                  <div className="table-col">
                    <div className="table-si-row table-dark-row">
                      <span>Messages</span>
                    </div>

                    {clauseList.map((clause) => {
                      return (
                        <div className="table-si-row" key={`open_chat_${clause.clause_id}`}>
                          <button
                            className="text-dark-blue"
                            style={{
                              fontSize: '0.8rem',
                              padding: '5px 10px',
                              display: 'inline-block',
                              border: 'none',
                              backgroundColor: 'lightblue',
                              color: 'darkblue',
                              textDecoration: 'none',
                            }}
                            onClick={() => toggleChat(clause.clause_id)}
                          >
                            {clauseMap.get(clause.clause_id) === true ? 'Close Chat' : 'Open Chat '}
                          </button>
                          {clauseMap.get(clause.clause_id) === true && (
                            <BuyerVendorChat
                              showChat={clauseMap.get(clause.clause_id)}
                              closeChat={() => toggleChat(clause.clause_id)}
                              type="Buyer"
                              data={clause}
                              userData={currentUserProfile}
                            />
                          )}
                        </div>
                      );
                    })}

                  </div>
                </div>
              </div>

            </div>
          </>
        )
      }

    </>
  );
};

export default VendorResponseTable;