import React, { useEffect, useState } from "react";
import { addVendorAgreement, fetchVendorAgreement, getClausesByRfqProductId,getTechClearedVendorsResult } from "@/services/rfq";
import BuyerVendorChat from "./buyerVendorChat";
import FileLink from "@/components/shared/FileLink";
import { toast } from "react-toastify";


const VendorResponseTable = ({ data, type, rfq_id, currentUserProfile, selectedVendor }) => {
  const [showMessages, setShowMessages] = useState(false);
  const [clauseList, setClauseList] = useState(null);
  const [isModelOpen, setIsModalOpen] = useState(false);
  const [rowAgreement, setRowAgreement] = useState({});
  const [clauseMap, setClauseMap] = useState(new Map());
  const [agreementMap, setAgreementMap] = useState(new Map());
  const [status, setStatus] = useState(false);
  const [techEvalClearedData, setTechEvalClearedData] = useState("");

useEffect(() => {
  const getTechEvalResult = async () =>{
    console.log("current user profile = ",currentUserProfile)
    const payload = {
      rfq_id:rfq_id,
      rfq_product_id:data.id,
      vendor_id:currentUserProfile.id
    }
    try{
      const res = await getTechClearedVendorsResult(payload);
      if(res.status === 1){
        setStatus(true);
        setTechEvalClearedData(res.data);
      } 
    }catch(error){
      console.error("Error in fetching tech evaluation cleared vendors",error);
    }
  }
  getTechEvalResult();
},[])
  

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
      const res = await addVendorAgreement(agreementList)
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }

  const getVendorResponse = async () => {
    const payload = {
      rfq_id: parseInt(rfq_id),
      rfq_product_id: type === 'buyer' ? data.rfq_product_id : data.id,
      vendor_id: type === 'buyer' ? selectedVendor : currentUserProfile.id,
    }

    try {
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
    }
  };

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


  // useEffect(() => {
  //   getClauses();
  // }, []);

  useEffect(()=> {
    console.log(rfq_id, data)
    if(rfq_id && data)
      getVendorResponse();
  }, [rfq_id, data])

  return (
    <>
      {type === "vendor" &&
        <>
          {clauseList && clauseList?.length > 0 &&
            <>
            {status && techEvalClearedData.status === 0 ? <p className="sub-heading mb-0">Technically Not Accepted. Rejection message is {techEvalClearedData.reject_message }</p>: <p className="sub-heading mb-0">Congratulations!!, you have been Technically accepted by the buyer.</p>}
              <div className="table-content" key={`product_item_${data.id}`}>
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

                    {/* Files */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Attached Files</span>
                      </div>
                      {clauseList.map((clause) => {
                        return (
                          <div className="table-si-row" key={`agree_button_${clause.clause_id}`}>
                            <FileLink Files={clause.files} />
                          </div>
                        )
                      })}
                    </div>

                    {/* Technical Evaluation */}
                    <div className="table-col">
                      <div className="table-si-row table-dark-row">
                        <span>Technical Evaluation</span>
                      </div>
                      {clauseList.map((clause) => {
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
              <div className="d-flex justify-content-center">
                <button type="button" className="btn btn-secondary border-0" onClick={handleSaveAgreement}>Save</button>
              </div>
            </>
          }
        </>
      }


      {/* old table */}
      {type === "buyer" && clauseList && clauseList.length > 0 &&
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
                  <span>Technical Evaluation</span>
                </div>
                <div className="table-si-row">Yes</div>
                <div className="table-si-row">Yes</div>
                <div className="table-si-row">No</div>
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
      }

    </>
  );
};

export default VendorResponseTable;