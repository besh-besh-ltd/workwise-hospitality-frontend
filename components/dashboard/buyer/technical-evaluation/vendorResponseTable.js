import React, { useEffect, useRef, useState } from "react";
import { addToTA, addVendorAgreement, fetchVendorAgreement, getClausesByRfqProductId, getTechClearedVendorsResult } from "@/services/rfq";
import BuyerVendorChat from "./buyerVendorChat";
import FileLink from "@/components/shared/FileLink";
import { toast } from "react-toastify";
import NotTA from "./NotTA";
import FullLoader from "@/components/shared/FullLoader";
import Loader from "@/components/shared/Loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileUpload } from "@fortawesome/free-solid-svg-icons";
import { handleFileUpload } from "@/utils/sharedFunctions";


const VendorResponseTable = ({ data, type, rfq_id, currentUserProfile, selectedVendor }) => {
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
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);


  const handleAttachFileClick = () => {
    fileInputRef.current.click(); // Trigger the file input when the "Attach file" button is clicked
  };

  const uploadToServer = async (e) => {
    setFileLoading(true)
    try {
      const filePath = await handleFileUpload(e);
      const newList = [...files, filePath];
      setFiles(newList);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFileLoading(false);
      e.target.value = null;
    }
  }

  useEffect(() => {
    const getTechEvalResult = async () => {
      console.log("current user profile = ", currentUserProfile)
      const payload = {
        rfq_id: rfq_id,
        rfq_product_id: data.id,
        vendor_id: currentUserProfile.id
      }
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
      rfq_product_tech_evaluation_id: currentRfq.tbl_rfq_product_tech_evaluation_id,
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
    }));

    try {
      setIsLoading(true);
      const res = await addVendorAgreement(agreementList)
      console.log(res);
      setAgreementSent(true);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  const getVendorResponse = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      rfq_product_id: type === 'buyer' ? data.rfq_product_id : data.id,
      vendor_id: type === 'buyer' ? selectedVendor : currentUserProfile.id,
    }

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

      res.data.forEach((clause) => {
        newClauseMap.set(clause.clause_id, false);
        newAgreementMap.set(clause.clause_id, '');
        newRowAgreement[clause.clause_id] = '';
      });

      setClauseMap(newClauseMap);
      setAgreementMap(newAgreementMap);
      setRowAgreement(newRowAgreement);
      setClauseList(res.data);
    } catch (error) {
      console.error("Error fetching clauses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getClauses = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      // rfq_product_id: data.id
      // rfq_id: 35,
      rfq_product_id: 1848
    }
    try {
      const res = await getClausesByRfqProductId(payload)
      setBuyerClauses(res.data);
      console.log(res)
    } catch (error) {
      console.log(error)
    }
  }

  // const getVendorResponse = async ()=> {
  //   const payload = {
  //     vendor_id: selectedVendor,
  //     rfq_id: parseInt(rfq_id),
  //     rfq_product_id: data.rfq_product_id
  //   }

  //   try {
  //     const res = await fetchVendorAgreement(payload);
  //     console.log(res)
  //   } catch (error) {
  //     console.log(error)
  //   }
  // }


  useEffect(() => {
    getClauses();
  }, []);

  useEffect(() => {
    console.log(rfq_id, data)
    if (rfq_id && data)
      getVendorResponse();
  }, [rfq_id, data])

  return (
    <>
      {type === "vendor" &&
        <>
          {buyerClauses && buyerClauses?.length > 0 &&
            <>
              {status && techEvalClearedData.status === 0 ? <p className="badge text-bg-danger">Technically Not Accepted. Rejection message is {techEvalClearedData.reject_message}</p> : <p className="badge text-bg-success">Congratulations!!, you have been Technically accepted by the buyer.</p>}
              <div className="table-content" key={`product_item_${data.id}`}>
                {isLoading && <Loader />}
                <div className="table-elements">
                  <div className="table-row">
                    <div className="table-col">
                      <div className="table-si-row"></div>
                      {buyerClauses.map((clause) => {
                        return (
                          <div className="table-si-row" key={`tbl_row_${clause.clause_id}`}>
                            {clause.clause_text}
                          </div>
                        )
                      })}
                    </div>

                    {/* Files */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Attached Files</span>
                      </div>
                      {buyerClauses.map((clause) => {
                        return (
                          <div className="table-si-row" key={`agree_button_${clause.clause_id}`}>
                            {clause.files && clause.files.length > 0 ?
                              <FileLink Files={clause.files} />
                              : "N/A"}
                          </div>
                        )
                      })}
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
                            {/* Agree Button */}
                            <button
                              style={{
                                border: '1px solid lightgreen',
                                color: agreementStatus === 'I Agree' ? 'white' : 'lightgreen',
                                backgroundColor: agreementStatus === 'I Agree' ? 'lightgreen' : 'white',
                                padding: '1px 4px',
                                marginRight: '10px',
                                cursor: 'pointer',
                                borderRadius: '5px',
                              }}
                              onClick={() => handleAgreementChange(clause.clause_id, 'I Agree')}
                            >
                              I Agree
                            </button>

                            {/* Disagree Button */}
                            <button
                              style={{
                                border: '1px solid lightcoral',
                                color: agreementStatus === 'I Dont agree' ? 'white' : 'lightcoral',
                                backgroundColor: agreementStatus === 'I Dont agree' ? 'lightcoral' : 'white',
                                padding: '1px 4px',
                                cursor: 'pointer',
                                borderRadius: '5px',
                              }}
                              onClick={() => handleAgreementChange(clause.clause_id, 'I Dont agree')}
                            >
                              I Don't Agree
                            </button>
                          </div>
                        );
                      })}

                    </div>

                    {/* Files */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Attach Your Files</span>
                      </div>

                      {buyerClauses.map(() => {
                        return (
                          <div className="table-si-row">
                            <div className="d-flex justify-content-center" onClick={handleAttachFileClick}>
                              <FontAwesomeIcon icon={faFileUpload} className="me-2" />
                              Upload
                            </div>
                            {fileLoading &&
                              <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                            }

                            {/* Display the filename below the Attach file button if a file is selected */}
                            {files &&
                              <FileLink
                                Files={files}
                                ColumnClass="col-md-4"
                                Style={{ fontSize: "12px" }}
                                showDownload={false}
                              />
                            }

                            {/* Hidden file input field triggered by the "Attach file" button */}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                              style={{ display: 'none' }}
                              onChange={uploadToServer}
                            />
                          </div>
                        )
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
              {!agreementSent ? <div className="d-flex justify-content-center">
                <button type="button" className="btn btn-secondary border-0" onClick={handleSaveAgreement}>Save</button>
              </div>
                : <p>You have already submitted the response.</p>
              }
            </>
          }
        </>
      }


      {/* old table */}
      {type === "buyer" &&
        (isLoading ?
          <FullLoader />
          : (clauseList && clauseList.length > 0) &&
          <>
            {/* TA and Not TA */}
            {!evaluationStatus && (
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
            {!technicallyAccepted && showModel && <NotTA onClose={handleCloseModal} show={showModel} data={data} vendor_id={selectedVendor} />}

            <div className="table-content">
              <div className="table-elements">
                <div className="table-row">
                  <div className="table-col">
                    <div className="table-si-row"></div>
                    {clauseList.map((clause) => {
                      return (
                        <div className="table-si-row" key={`tbl_row_${clause.clause_id}`}>
                          {clause.clause_text}
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
                    {clauseList.map((clause) => {
                      return (
                        <div className="table-si-row" key={`tbl_row_${clause.vendor_response_files}`}>
                          {clause.vendor_response_files && clause.vendor_response_files.length > 0 &&
                            <FileLink Files={clause.vendor_response_files} />
                          }
                        </div>
                      )
                    })}
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
        )}

    </>
  );
};

export default VendorResponseTable;