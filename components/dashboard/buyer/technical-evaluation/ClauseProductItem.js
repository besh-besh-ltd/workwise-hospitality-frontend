import FileLink from '@/components/shared/FileLink';
import { fetchVendorAgreement, getClausesByRfqProductId } from '@/services/rfq';
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useRef, useState } from 'react'
import BuyerVendorChat from './buyerVendorChat';
import FullLoader from '@/components/shared/FullLoader';

const ClauseProductItem = ({ rfq_id, product, currentUserProfile, selectedVendor = null }) => {
    const [buyerClauses, setBuyerClauses] = useState(null);
    const [vendorResponse, setVendorResponse] = useState(null);
    const [chatMap, setChatMap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [responseLoading, setResponseLoading] = useState(false);
    const tableRef = useRef(null);

    const getBuyerClauses = async () => {
        const payload = { rfq_product_id: product.id }
        try {
            setLoading(true);
            const res = await getClausesByRfqProductId(payload);
            console.log(res.data)
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
            vendor_id: selectedVendor.value
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

    useEffect(() => {
        if (product)
            getBuyerClauses();
    }, [product])

    useEffect(() => {
        if (selectedVendor)
            getVendorResponse();
        else {
            setChatMap(null);
            setVendorResponse(null);
        }
    }, [selectedVendor])


    return (
        <div className="col-12 text-sm mb-3 mt-2 hasFullLoader" key={`buyer_rfq_prod_${product.id}`}>

            {/* Buyer All Clauses */}
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

            {/* Vendor Responses */}
            <div className="hasFullLoader">
                {responseLoading ?
                    <FullLoader />
                    :
                    vendorResponse && vendorResponse.length > 0 &&
                    <>
                        <h3 className="fs-5 mb-3">
                            <span className="fw-semibold">{selectedVendor?.label}</span>
                        </h3>
                        <table className="table table-bordered table-striped" ref={tableRef}>
                            <thead>
                                <tr className="table-dark text-nowrap" style={{ backgroundColor: "var(--primary-color) !important" }}>
                                    <th>Clause Terms</th>
                                    <th>Vendor Response</th>
                                    <th>Vendor Files</th>
                                    <th>Chat Box</th>
                                </tr>
                            </thead>

                            <tbody>
                                {vendorResponse.map((clauseItem, index) => (
                                    <>
                                        <tr key={`ven_res_clause_${clauseItem.clause_id}`}>
                                            <td>
                                                {index + 1}{". "}{clauseItem.clause_text}
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill py-1 px-2 ${clauseItem.vendor_response == "I Agree" ? 'text-bg-success' : 'text-bg-danger'}`}>{clauseItem.vendor_response}</span>
                                            </td>
                                            <td style={{ maxWidth: "260px" }}>
                                                {clauseItem.vendor_response_files && clauseItem.vendor_response_files.length > 0 &&
                                                    <FileLink key={clauseItem.clause_id} Files={clauseItem.vendor_response_files} />
                                                }
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary text-sm border-0 p-1"
                                                    style={{ width: "100px" }}
                                                    onClick={() => toggleChat(clauseItem.clause_id)}
                                                >
                                                    <span className="d-flex justify-content-center align-items-center gap-2">
                                                        <FontAwesomeIcon icon={faMessage} fontSize={13} />
                                                        Chat
                                                    </span>
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
                                            />
                                        }
                                    </>)
                                )}
                            </tbody>
                        </table>
                    </>}
            </div>

            <hr />
        </div>
    )
}

export default ClauseProductItem
