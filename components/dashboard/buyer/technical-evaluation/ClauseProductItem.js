import FileLink from '@/components/shared/FileLink';
import { addToTA, fetchVendorAgreement, getClausesByRfqProductId, getSummarisedDeviation, getTechClearedVendorsResult } from '@/services/rfq';
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useRef, useState } from 'react'
import BuyerVendorChat from './buyerVendorChat';
import FullLoader from '@/components/shared/FullLoader';
import TE_Modal from './TE_Modal';
import { toast } from 'react-toastify';
import ReadMore from '@/components/shared/ReadMore';
import { Dropdown } from 'react-bootstrap';
import Image from 'next/image';


const ClauseProductItem = ({ rfq_id, product, currentUserProfile, clauseInfo, currentRfq ,  vendors : _vendors, refetch, selectedVendor : _selectedVendor = null, selectedVendors }) => {
    

  
    const [buyerClauses, setBuyerClauses] = useState(clauseInfo);
    const [vendorResponse, setVendorResponse] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [chatMap, setChatMap] = useState(null);
    const [techEvalStatus, setTechEvalStatus] = useState(0);
    const [techEvalCleared, setTechEvalCleared] = useState(false);
    const [loading, setLoading] = useState(false);
    const [responseLoading, setResponseLoading] = useState(false);
    const [vendors, setVendors] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);
    // const [summarisedDeviation , setSummarisedDeviation] = useState();
    // const [updatedClauseInfoSummary , setUpdatedClauseInfoSummary] = useState(null);
    const tableRef = useRef(null);
    
 
    const addToTechnicallyAccepted = async (vendor = null) => {
        const payload = {
            product :  product?.product_details,
            rfq_id : rfq_id,
            vendor :  vendor ? vendor : selectedVendor ? selectedVendor : _selectedVendor,
            vendor_id: vendor ? vendor.vendor_id : selectedVendor ? selectedVendor.vendor_id : _selectedVendor.value,
            rfq_product_tech_evaluation_id: product.tbl_rfq_product_tech_evaluation_id,
            status: 1,
            reject_message: null
        }

        try {
            setLoading(true)
            const res = await addToTA(payload);
            if (res.status == 1) {
                console.log("successfully added to TA");
            }
            selectedVendor && getTechEvalResult();
            refetch && refetch();
            toast.success("Congratulations, this Vendor is technically Accepted!!")

        } catch (error) {
            console.error("Error in the process:", error);
        } finally {
            setLoading(false)
        }
    }

    const toggleChat = (clause_id) => {
        setChatMap((prevMap) => {
            if(!prevMap) {
                const newMap = new Map();
                newMap.set(clause_id, true);

                return newMap;
            } else {
                const newMap = new Map(prevMap);
                for (let [key] of prevMap) {
                    newMap.set(key, false);
                }
                newMap.set(clause_id, !prevMap.get(clause_id));
                return newMap;
            }
        });
    };

    const getBuyerClauses = async () => {
        const payload = {
            rfq_product_id: product.id,
            vendor_id: _selectedVendor?.value || null
        }
        try {
            setLoading(true);
            const res = await getClausesByRfqProductId(payload);
            setBuyerClauses(res.data);
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false);
        }
    }
    
    const getVendorResponse = async () => {
        const payload = {
            rfq_id: rfq_id,
            rfq_product_id: product.id,
            vendor_id: _selectedVendor.value
        }

        try {
            setResponseLoading(true);
            const res = await fetchVendorAgreement(payload);
            if (!res.status) {
                toast.warning(res.message);
                return;
            }

            let cMap = new Map();
            res.data.map((resItem) => {
                cMap.set(resItem.clause_id, false);
            })
            setChatMap(cMap);
            setVendorResponse(res.data);

        } catch (error) {
            console.error("Error fetching response:", error);
        } finally {
            setResponseLoading(false);
        }
    };

    const getTechEvalResult = async () => {
        const payload = {
            rfq_id: parseInt(rfq_id),
            rfq_product_id: product.id,
            vendor_id: _selectedVendor.value,
        };
        try {
            const res = await getTechClearedVendorsResult(payload);
            if (res.status === 1) {
                setTechEvalStatus(1)
            } else {
                setTechEvalStatus(0)
            }
            setTechEvalCleared(res.data)
        } catch (error) {
            console.error("Error fetching tech evaluation data", error);
        }
    };
  
    const fetchVendorResults = async () => {
      await getTechEvalResult();
      await getVendorResponse();
      await getBuyerClauses();
    }

// useEffect(() => {
//     setUpdatedClauseInfoSummary(clauseInfo);


//   // if (summarisedDeviation) {

//   // // Clone the original clauseInfo so we don't mutate state directly
//   // const updatedClauseInfo = clauseInfo.map(clause => {
//   //   // Get all relevant messages for this clause_id
//   //   const matchingMessages = summarisedDeviation.filter(
//   //     msg => msg.clause_id === clause.clause_id
//   //   );

//   //   // Attach summarisedDeviation to each vendor_response if there's a matching message
//   //   const updatedVendorResponses = clause.vendor_responses?.map(vendorResp => {
//   //     const matchedMessage = matchingMessages.find(
//   //       msg => msg.sender_id === vendorResp.vendor_id || msg.receiver_id === vendorResp.vendor_id
//   //     );
//   //     return {
//   //       ...vendorResp,
//   //       summarisedDeviation: matchedMessage?.summarisedDeviation || null,
//   //     };
//   //   });

//   //   return {
//   //     ...clause,
//   //     vendor_responses: updatedVendorResponses,
//   //   };
//   // });

//   // setUpdatedClauseInfoSummary(updatedClauseInfo);
//   // }
//   // else{
//   //   setUpdatedClauseInfoSummary(clauseInfo);

//   // }

// }, [summarisedDeviation]);



    // const fetchSummarisedDeviation = async ()=>{
    //   const deviation = await getSummarisedDeviation(rfq_id);
    //  setSummarisedDeviation(deviation);
      
    // }
    // useEffect(()=>{
    //  fetchSummarisedDeviation();
    // },[])
    // console.log("gettig this dine ", summarisedDeviation);
    useEffect(() => {
        if(_vendors) {
            setVendors(_vendors);
        }
    }, [_vendors])
    
    useEffect(() => {
      if(_selectedVendor) {
        fetchVendorResults();
      } else {
        setVendorResponse(null);
        setChatMap(null);
        // setBuyerClauses(clauseInfo);
      }
    }, [_selectedVendor])
    return (
      <div
        className="col-12 text-sm mb-3 mt-2 hasFullLoader"
        key={`buyer_rfq_prod_${product.id}`}
      >
        {/* Buyer All Clauses */}
        {loading ? (
          <FullLoader />
        ) : (
          <>
            {!vendorResponse && (
              <div style={{ maxWidth: "100%", overflow: "auto" }}>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr className="table-dark">
                      <th className="col-4 align-middle">Clause And Files</th>
                      {vendors && vendors.length > 0 &&
                        vendors.filter(vendor => selectedVendors.length <= 0 ? true : selectedVendors.includes(vendor.vendor_id)).map((vendor) => {
                            const isCleared = vendor.is_cleared;
                            return (
                              <th
                                key={vendor.vendor_id}
                                className="col-3 align-middle"
                              >
                                <div className="d-flex justify-content-between gap-2 align-items-center">
                                  <div className="d-flex flex-column align-items-center w-100">
                                    <span>{vendor.vendor_name}</span>
                                    <p
                                      className={`badge rounded-pill py-2 px-3 ${
                                        isCleared != null
                                          ? isCleared == 1
                                            ? "text-bg-success"
                                            : "text-bg-danger"
                                          : ""
                                      }`}
                                      style={{
                                        marginTop: 5,
                                        marginBottom: 0,
                                        width: "fit-content",
                                      }}
                                    >
                                      {isCleared != null
                                        ? isCleared == 1
                                          ? "Technically Accepted"
                                          : "Technically Not Accepted"
                                        : ""}
                                    </p>
                                    {isCleared != null && vendor?.evaluated_by && (
                                      <div className="text-light mt-2 fw-normal">
                                        <strong>Evaluated by: </strong> {vendor?.evaluated_by}
                                      </div>
                                    )}
                                  </div>
                                  <Dropdown className="dots-nav-anchor">
                                    <Dropdown.Toggle
                                      as="button"
                                      className="dots-nav p-0 border-0 bg-transparent"
                                    >
                                      <Image
                                        src="/assets/images/3-dots-nav.svg"
                                        width={4}
                                        height={18}
                                        alt="Nav"
                                      />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                      <Dropdown.Item
                                        href={`/dashboard/buyer/query?rfq_id=${rfq_id}&role=buyer`}
                                        id={`talk_with_vendor_${vendor.vendor_id}-vendor_actions-technical_evaluation_page`}
                                      >
                                        Talk with vendor
                                      </Dropdown.Item>
                                      <Dropdown.Item
                                        target="_blank"
                                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendor.vendor_id}`}
                                        id={`view_vendor_profile_${vendor.vendor_id}-vendor_actions-technical_evaluation_page`}
                                      >
                                        View Profile
                                      </Dropdown.Item>
                                      {isCleared == null && (
                                        <>
                                          <Dropdown.Item
                                            href="#"
                                            onClick={() =>
                                              addToTechnicallyAccepted(vendor)
                                            }
                                            id={`accept_vendor_${vendor.vendor_id}-vendor_evaluation-technical_evaluation_page`}
                                          >
                                            Accept
                                          </Dropdown.Item>

                                          <Dropdown.Item
                                            href="#"
                                            onClick={() => {
                                              setSelectedVendor({
                                                label: vendor.vendor_name,
                                                value: vendor.vendor_id,
                                              });
                                              setOpenModal(true);
                                            }}
                                            id={`reject_vendor_${vendor.vendor_id}-vendor_evaluation-technical_evaluation_page`}
                                          >
                                            Reject
                                          </Dropdown.Item>
                                        </>
                                      )}
                                    </Dropdown.Menu>
                                  </Dropdown>
                                </div>
                              </th>
                            );
                        }
                        )}
                    </tr>
                  </thead>

                  <tbody style={{ overflowX: "auto" }}>
                    {clauseInfo &&
                      clauseInfo.length > 0 &&
                      clauseInfo.map((clauseItem, index) => (
                        <>
                        <tr key={`rfq_prod_clause_${clauseItem.clause_id}`}>
                          {console.log("chcking th e clause id ", clauseItem.clause_id)}
                          <td className="col-4">
                            <ReadMore
                              content={`${index + 1}. ${
                                clauseItem.clause_text
                              }`}
                              maxLines={4}
                            />
                            {clauseItem.files && clauseItem.files.length > 0 ? (
                              <FileLink
                                key={clauseItem.clause_id}
                                Files={clauseItem.files}
                                ColumnClass="col-md-6"
                              />
                            ) : null}
                          </td>
                          {vendors && vendors.length > 0 &&
                            vendors.filter(vendor => selectedVendors.length <= 0 ? true : selectedVendors.includes(vendor.vendor_id)).map((vendor) => {
                              const response = clauseItem.vendor_responses.find(
                                (response) =>
                                  vendor.vendor_id == response.vendor_id
                              );
                              console.log("checking the console for vendor", vendor);
                              return (
                                <td key={vendor.value} className="col-3">
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2,
                                    }}
                                  >
                                    <span
                                      className={`badge rounded-pill py-2 px-3 ${
                                        response?.vendor_response == "I Agree"
                                          ? "text-bg-success"
                                          : response?.vendor_response ==
                                            "I Dont Agree"
                                          ? "text-bg-danger"
                                          : "text-bg-secondary"
                                      }`}
                                      style={{ width: "fit-content" }}
                                    >
                                      {response?.vendor_response ||
                                        "No Response"}
                                    </span>
                                    {response?.vendor_response_files && (
                                      <FileLink
                                        key={response.vendor_id}
                                        Files={response.vendor_response_files}
                                        ColumnClass="col-md-6"
                                      />
                                    )}
                                    

<button
                                      type="button"
                                      className="d-flex justify-content-center align-items-center border-0 p-1 rounded-2 mt-1"
                                      style={{
                                        maxWidth: "100px",
                                        backgroundColor: "var(--primary-color)",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                      }}
                                      onClick={() => {
                                        toggleChat(clauseItem.clause_id);
                                        setSelectedVendor(vendor);
                                      }}
                                      id={`view_deviation_${clauseItem.clause_id}_${vendor.vendor_id}-deviation_actions-technical_evaluation_page`}
                                    >
                                     Deviation
                                    </button>

                                  </div>
                                </td>
                              );
                            })}
                        </tr>
                        {chatMap && chatMap.get(clauseItem.clause_id) && (
                          <BuyerVendorChat
                            showChat={chatMap.get(clauseItem.clause_id)}
                            closeChat={() => toggleChat(clauseItem.clause_id)}
                            type="Buyer"
                            data={clauseItem}
                            userData={currentUserProfile}
                            otherUser={selectedVendor}
                            token="" // only for vendor so that they fetch data when they are not login
                            product = {product}
                            rfq_no = {currentRfq}
                          />
                        )}
                        </>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {responseLoading ?
                <FullLoader />
                :
                vendorResponse && vendorResponse.length > 0 &&
                <>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h3 className="fs-5 mb-0">
                            <span className="fw-semibold">{selectedVendor?.label}</span>
                        </h3>

                        {/* START: review status with evaluated by */}
                        <div className="">
                        
                        {/* start : status tag */}
                        <div>
                            {techEvalStatus == 1 ?
                                techEvalCleared.status == 1
                                    ? <span
                                        className="fw-medium text-bg-success px-3 py-2"
                                        style={{ borderRadius: "18px 0 0 18px", fontSize: "16px" }}
                                    >
                                        Vendor is Technically Accepted
                                    </span>
                                    : <span
                                        className="fw-medium text-bg-danger px-3 py-2"
                                        style={{ borderRadius: "18px 0 0 18px", fontSize: "16px" }}
                                    >
                                        Vendor is Not Technically Accepted
                                    </span>
                                :
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-secondary border-0 p-2"
                                        style={{ width: "220px", marginRight: 10 }}
                                        onClick={() => addToTechnicallyAccepted()}
                                        id="technically_accept_vendor-vendor_evaluation-technical_evaluation_page"
                                    >
                                        Technically Accepted
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger border-0 p-2"
                                        style={{ width: "255px" }}
                                        onClick={() => setOpenModal(true)}
                                        id="technically_reject_vendor-vendor_evaluation-technical_evaluation_page"
                                    >
                                        Technically Not Accepted
                                    </button>
                                </>
                            }
                            </div>
                        {/* end : status tag */}


                          {/* Display evaluated_by only when available */}
                          {techEvalStatus == 1 && techEvalCleared?.evaluated_by && (
                            <div className="text-muted mt-2 ">
                              <strong>Evaluated by: </strong> {techEvalCleared.evaluated_by}
                            </div>
                          )}
                        </div>
                      {/* END: review status with evaluated by */}


                    </div>

                    <div className="table-responsive w-100">
                        <table className="table table-bordered table-striped" ref={tableRef} style={{ tableLayout: "fixed" }}>
                            <colgroup>
                                <col style={{ width: "600px" }} />
                                <col style={{ width: "140px" }} />
                                <col style={{ width: "230px" }} />
                                <col style={{ width: "125px" }} />
                            </colgroup>
                            <thead>
                                <tr className="table-dark text-nowrap" style={{ backgroundColor: "var(--primary-color) !important" }}>
                                    <th scope="col" >Clause Terms</th>
                                    <th scope="col" >Vendor Response</th>
                                    <th scope="col" >Cross Reference Documents</th>
                                    <th scope="col" >Comment</th>
                                </tr>
                            </thead>

                            <tbody>
                                {vendorResponse.map((clauseItem, index) => (
                                    <>
                                        <tr key={`ven_res_clause_${clauseItem.clause_id}`}>
                                            <td>
                                                <ReadMore content={`${index + 1}. ${clauseItem.clause_text}`} maxLines={4} />
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill py-1 px-2 ${clauseItem.vendor_response == "I Agree" ? 'text-bg-success' : 'text-bg-danger'}`}>{clauseItem.vendor_response}</span>
                                            </td>
                                            <td style={{ maxWidth: "260px" }}>
                                                {clauseItem.vendor_response_files && clauseItem.vendor_response_files.length > 0
                                                    ? <FileLink key={clauseItem.clause_id} Files={clauseItem.vendor_response_files} />
                                                    : "N/A"
                                                }
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="d-flex justify-content-center align-items-center border-0 p-1 rounded-2"
                                                    style={{ width: "100px", backgroundColor: "var(--primary-color)", color: "#ffffff", fontSize: "13px" }}
                                                    onClick={() => toggleChat(clauseItem.clause_id)}
                                                    id={`explanation_deviation_${clauseItem.clause_id}-clause_actions-technical_evaluation_page`}
                                                >
                                                    Explanation / Deviation
                                                </button>
                                            </td>

                                        </tr>
                                        {chatMap.get(clauseItem.clause_id) &&
                                            <BuyerVendorChat
                                                showChat={chatMap.get(clauseItem.clause_id)}
                                                closeChat={() => toggleChat(clauseItem.clause_id)}
                                                type="Buyer"
                                                data={clauseItem}
                                                userData={currentUserProfile}
                                                otherUser={_selectedVendor ? _selectedVendor.value : selectedVendor.value}
                                                token='' // only for vendor so that they fetch data when they are not login
                                            />
                                        }
                                    </>)
                                )}
                            </tbody>
                        </table>
                    </div>
                </>}

        {openModal && (
          <TE_Modal
            openModal={openModal}
            closeModal={() => setOpenModal(false)}
            rfq_id = {rfq_id}
            data={product}
            vendor_id={_selectedVendor ? _selectedVendor.value : selectedVendor.value}
            getTechEvalResult={_selectedVendor ? getTechEvalResult : refetch}
          />
        )}

        <hr />
      </div>
    );
}

export default ClauseProductItem
