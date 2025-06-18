import FileLink from '@/components/shared/FileLink';
import { addToTA, fetchVendorAgreement, getClausesByRfqProductId, getTechClearedVendorsResult } from '@/services/rfq';
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

const ClauseProductItem = ({ rfq_id, product, currentUserProfile, getVendors, clauseInfo, vendors : _vendors, refetch }) => {

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
    const tableRef = useRef(null);

    const addToTechnicallyAccepted = async (vendor = null) => {
        const payload = {
            vendor_id: vendor ? vendor.vendor_id : selectedVendor.vendor_id,
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
            // getTechEvalResult();
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

    useEffect(() => {
        if(_vendors) {
            setVendors(_vendors);
        }
    }, [_vendors])


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
                        vendors.map((vendor) => {
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
                                      >
                                        Talk with vendor
                                      </Dropdown.Item>
                                      <Dropdown.Item
                                        target="_blank"
                                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendor.vendor_id}`}
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
                    {buyerClauses &&
                      buyerClauses.length > 0 &&
                      buyerClauses.map((clauseItem, index) => (
                        <>
                        <tr key={`rfq_prod_clause_${clauseItem.clause_id}`}>
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
                            vendors.map((vendor) => {
                              const response = clauseItem.vendor_responses.find(
                                (response) =>
                                  vendor.vendor_id == response.vendor_id
                              );

                              return (
                                <td
                                  key={vendor.value}
                                  className="col-3"
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2
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
                                      {response?.vendor_response || "No Response"}
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
                            otherUser={selectedVendor.vendor_id}
                            token="" // only for vendor so that they fetch data when they are not login
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

        {openModal && (
          <TE_Modal
            openModal={openModal}
            closeModal={() => setOpenModal(false)}
            data={product}
            vendor_id={selectedVendor.value}
            getTechEvalResult={refetch}
          />
        )}

        <hr />
      </div>
    );
}

export default ClauseProductItem
