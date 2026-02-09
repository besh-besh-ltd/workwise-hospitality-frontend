import FileLink from '@/components/shared/FileLink';
import { addToTA, fetchVendorAgreement, getClausesByRfqProductId, getSummarisedDeviation, getTechClearedVendorsResult, updateBuyerMarks, submitTechEvalForApproval, submitTechEvalApprovalAction } from '@/services/rfq';
import { faMessage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useRef, useState } from 'react'
import BuyerVendorChat from './buyerVendorChat';
import FullLoader from '@/components/shared/FullLoader';
import TE_Modal from './TE_Modal';
import { toast } from 'react-toastify';
import ReadMore from '@/components/shared/ReadMore';
import { Dropdown, Modal, Form } from 'react-bootstrap';
import Image from 'next/image';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import { FiSend } from "react-icons/fi";
import { ApprovalWorkflowSection } from "@/components/dashboard/buyer/approval";
import { getEntityApprovalInstances } from "@/services/approval";
import { useTechEvalWorkflow } from '@/hooks/useTechEvalWorkflow';
import TechEvalWorkflowStatus from './TechEvalWorkflowStatus';
import TechEvalFailedHistory from './TechEvalFailedHistory';
import { TECH_EVAL_WORKFLOW_STATES } from '@/utils/constants/techEvalWorkflow';


const ClauseProductItem = ({ rfq_id, product, currentUserProfile, clauseInfo, currentRfq ,  vendors : _vendors, refetch, selectedVendor : _selectedVendor = null, selectedVendors, minimumPassingScore: _minimumPassingScore, canWrite = true, canApprove = false, permissionsLoading = false }) => {
    
  const multipleVendorsSelected = selectedVendors && selectedVendors.length > 1;
  
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
    const [showAcceptConfirmModal, setShowAcceptConfirmModal] = useState(false);
    const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
    const [vendorScores, setVendorScores] = useState({});
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [selectedClauseForRemark, setSelectedClauseForRemark] = useState(null);
    const [selectedVendorForRemark, setSelectedVendorForRemark] = useState(null);
    const [buyerRemark, setBuyerRemark] = useState("");
    const [buyerMarks, setBuyerMarks] = useState("");
    const [minimumPassingScore, setMinimumPassingScore] = useState(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isSubmittedForApproval, setIsSubmittedForApproval] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [approvalStatusLoading, setApprovalStatusLoading] = useState(false);
    // const [summarisedDeviation , setSummarisedDeviation] = useState();
    // const [updatedClauseInfoSummary , setUpdatedClauseInfoSummary] = useState(null);
    const tableRef = useRef(null);

    // Technical Evaluation Workflow Hook - Multi-round approval support
    const {
      workflowState,
      currentRound,
      totalPassedVerified,
      requiredPassedVendors,
      isComplete: workflowComplete,
      blockedInsufficientVendors,
      rounds,
      latestRound,
      passedVerifiedVendors,
      failedVerifiedVendors,
      pendingEvaluationVendors,
      summary: workflowSummary,
      remainingNeeded,
      loading: workflowLoading,
      refetch: refetchWorkflow
    } = useTechEvalWorkflow({ rfq_product_id: product?.id, enabled: !!product?.id });

    // Derived: Check if approval is pending (freeze all actions)
    const isPendingApproval = workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL || isSubmittedForApproval;

    // Fetch approval status for this product
    const fetchApprovalStatus = async () => {
        if (!product?.id) return;

        try {
            setApprovalStatusLoading(true);
            const response = await getEntityApprovalInstances("TECHNICAL", product.id);
            const instances = response?.data?.data || response?.data || [];

            // Check if there's any pending or in-progress approval instance
            const hasPendingApproval = instances.some(
                instance => instance.status === 'PENDING' || instance.status === 'IN_PROGRESS'
            );

            // Check if there's an approved instance
            const hasApprovedInstance = instances.some(
                instance => instance.status === 'APPROVED'
            );

            setIsSubmittedForApproval(hasPendingApproval);
            setIsApproved(hasApprovedInstance);
        } catch (error) {
            console.error("Error fetching approval status:", error);
            // Don't set error state, just keep the current state
        } finally {
            setApprovalStatusLoading(false);
        }
    };


    const addToTechnicallyAccepted = async (vendor = null) => {
        // When triggered from the ellipsis menu, a vendor object is passed.
        // Ensure that becomes the currently selected vendor so confirmation works.
        if (vendor) {
            // Normalise to the shape used elsewhere: { label, value, vendor_id, vendor_name }
            const normalizedVendor = {
                label: vendor.label || vendor.vendor_name,
                value: vendor.value || vendor.vendor_id,
                vendor_id: vendor.vendor_id || vendor.value,
                vendor_name: vendor.vendor_name || vendor.label,
            };
            setSelectedVendor(normalizedVendor);
        }
        setShowAcceptConfirmModal(true);
    }

    const handleAcceptConfirm = async () => {
        try {
            // Check if we have a valid vendor selected
            const currentVendor = selectedVendor || _selectedVendor;
            if (!currentVendor || (!currentVendor.value && !currentVendor.vendor_id)) {
                toast.error("No vendor selected for technical acceptance");
                setShowAcceptConfirmModal(false);
                return;
            }

            // Check if product has required data
            if (!product || !product.tbl_rfq_product_tech_evaluation_id) {
                toast.error("Product data is incomplete for technical acceptance");
                setShowAcceptConfirmModal(false);
                return;
            }

            const payload = {
                product :  product?.product_details,
                rfq_id : rfq_id,
                vendor :  currentVendor,
                vendor_id: currentVendor.vendor_id || currentVendor.value,
                rfq_product_tech_evaluation_id: product.tbl_rfq_product_tech_evaluation_id,
                status: 1,
                reject_message: null
            }

            setLoading(true)
            const res = await addToTA(payload);
            if (res.status == 1) {
                console.log("successfully added to TA");
            }
            
            // Close modal first to avoid state update issues
            setShowAcceptConfirmModal(false);
            
            // Then update other states
            if (selectedVendor) {
                getTechEvalResult();
            }
            if (refetch) {
                refetch();
            }
            toast.success("Congratulations, this Vendor is technically Accepted!!")

        } catch (error) {
            toast.error("Failed to accept vendor technically. Please try again.");
            setShowAcceptConfirmModal(false);
        } finally {
            setLoading(false)
        }
    }

    const handleAcceptCancel = () => {
        setShowAcceptConfirmModal(false);
    }

    const handleRejectConfirm = () => {
        setShowRejectConfirmModal(false);
        setOpenModal(true);
    }

    const handleRejectCancel = () => {
        setShowRejectConfirmModal(false);
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

    // Handler for submitting technical evaluation for approval (product level)
    const handleSubmitForApproval = async () => {
        if (!product?.id) {
            toast.error("Product information is missing");
            return;
        }

        try {
            setSubmitLoading(true);
            const payload = {
                rfq_id: parseInt(rfq_id),
                rfq_product_id: product.id,
                is_tender: currentRfq?.is_tender === 1,
            };

            const response = await submitTechEvalForApproval(payload);

            // Response now includes round_id and round_number for multi-round workflow
            const { round_id, round_number } = response?.data?.data || response?.data || {};

            toast.success(`Round ${round_number || currentRound} submitted for approval`);
            setShowSubmitModal(false);

            // Refresh workflow status to update UI
            await refetchWorkflow();

            // Refresh the approval status to update UI
            await fetchApprovalStatus();

            // Refresh the data to show updated approval status
            if (refetch) refetch();
        } catch (error) {
            toast.error(error?.message || "Failed to submit for approval");
        } finally {
            setSubmitLoading(false);
        }
    };

    // Custom approval handler for TECHNICAL entity type
    const handleTechEvalApprove = async (comment, context) => {
        try {
            const payload = {
                approval_instance_id: context.approval_instance_id,
                approval_instance_step_id: context.approval_instance_step_id,
                action: 'APPROVE',
                comment: comment || ''
            };
            await submitTechEvalApprovalAction(payload);

            // Refresh workflow status after approval
            await refetchWorkflow();
            if (refetch) refetch();

            return { success: true };
        } catch (error) {
            return { success: false, error: error?.message || 'Failed to approve' };
        }
    };

    // Custom rejection handler for TECHNICAL entity type
    const handleTechEvalReject = async (comment, context) => {
        try {
            const payload = {
                approval_instance_id: context.approval_instance_id,
                approval_instance_step_id: context.approval_instance_step_id,
                action: 'REJECT',
                comment: comment || ''
            };
            await submitTechEvalApprovalAction(payload);

            // Refresh workflow status after rejection
            await refetchWorkflow();
            if (refetch) refetch();

            return { success: true };
        } catch (error) {
            return { success: false, error: error?.message || 'Failed to reject' };
        }
    };

    const handleSaveBuyerMarks = async () => {
        if (!selectedClauseForRemark || !selectedVendorForRemark) {
            toast.error("Missing clause or vendor information");
            return;
        }

        // Validate marks against weightage
        if (buyerMarks) {
            const marksValue = parseInt(buyerMarks);
            const weightage = selectedClauseForRemark.weightage || 0;
            
            if (marksValue > weightage) {
                toast.error(`Marks (${marksValue}) cannot exceed the weightage (${weightage}) for this clause`);
                return;
            }
        }

        const payload = {
            clause_id: selectedClauseForRemark.clause_id,
            vendor_id: selectedVendorForRemark.vendor_id || selectedVendorForRemark.value,
            buyer_marks: buyerMarks ? parseInt(buyerMarks) : null,
            buyer_remark: selectedClauseForRemark.clause_type === 'sampling' ? (buyerRemark || null) : null
        }

        setLoading(true);
        try {
            const res = await updateBuyerMarks(payload);
            toast.success(res.message || "Marks and remark saved successfully");
            setShowRemarkModal(false);
            setBuyerRemark("");
            setBuyerMarks("");
            setSelectedClauseForRemark(null);
            setSelectedVendorForRemark(null);
            if (refetch) {
                refetch();
            }
        } catch (error) {
            toast.error(error.message || "Failed to save marks and remark");
        } finally {
            setLoading(false);
        }
    }

    const openRemarkModal = (clause, vendor) => {
        const response = clause.vendor_responses?.find(r => r.vendor_id == (vendor.vendor_id || vendor.value));
        setSelectedClauseForRemark(clause);
        setSelectedVendorForRemark(vendor);
        // Only set remark for sampling clauses
        setBuyerRemark(clause.clause_type === 'sampling' ? (response?.buyer_remark ?? "") : "");
        setBuyerMarks(response?.buyer_marks !== undefined && response?.buyer_marks !== null ? response.buyer_marks : "");
        setShowRemarkModal(true);
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
        if (!_selectedVendor || !_selectedVendor.value) {
            console.error("No selected vendor for tech evaluation result");
            return;
        }
        
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

    // Fetch approval status on mount and when product changes
    useEffect(() => {
        if (product?.id) {
            fetchApprovalStatus();
        }
    }, [product?.id]);

    useEffect(() => {
        if(_vendors) {
            setVendors(_vendors);
        }
    }, [_vendors])

    useEffect(() => {
        if (_minimumPassingScore !== undefined && _minimumPassingScore !== null) {
            setMinimumPassingScore(_minimumPassingScore);
        }
    }, [_minimumPassingScore])
    
    useEffect(() => {
    if (multipleVendorsSelected) {
        // MULTI-VENDOR MODE → clear single vendor data
        setVendorResponse(null);
        setChatMap(null);
        return;
    }

    if (_selectedVendor) {
        fetchVendorResults(); // SINGLE VENDOR MODE
    } else {
        setVendorResponse(null);
        setChatMap(null);
    }
}, [_selectedVendor, selectedVendors]);

    return (
      <div
        className="col-12 text-sm mb-3 mt-2 hasFullLoader"
        key={`buyer_rfq_prod_${product.id}`}
      >
        {/* TODO: Tech eval progress bar disabled — not sure how to fix it and it's not really impactful */}
        {/* Workflow Status Banner - Multi-round evaluation progress */}
        {/* {!workflowLoading && product?.id && (
          <TechEvalWorkflowStatus
            workflowState={workflowState}
            currentRound={currentRound}
            totalPassedVerified={totalPassedVerified}
            requiredPassedVendors={requiredPassedVendors}
            remainingNeeded={remainingNeeded}
            blockedInsufficientVendors={blockedInsufficientVendors}
          />
        )} */}

        {/* Failed Vendor History - Grouped by round */}
        {failedVerifiedVendors.length > 0 && (
          <TechEvalFailedHistory vendors={failedVerifiedVendors} />
        )}

        {/* Buyer All Clauses */}
        {loading ? (
          <FullLoader />
        ) : (
          <>
            {!vendorResponse && (
              <div style={{ maxWidth: "100%", overflow: "auto" }}>
                      <div className="mt-3">
                        {minimumPassingScore !== null && (
                          <p className="mb-2">
                            <strong>Minimum Passing Score (out of 100):</strong> {minimumPassingScore}
                          </p>
                        )}
                        <table className="table table-bordered table-striped" style={{ tableLayout: "fixed", width: "100%" }}>
                          <thead>
                            <tr className="table-dark">
                              <th style={{ width: "30%" }} className="align-middle">Clause And Files</th>
                              {vendors && vendors.length > 0 &&
                                vendors
                                  .filter(vendor => selectedVendors.length <= 0 ? true : selectedVendors.includes(vendor.vendor_id))
                                  .sort((a, b) => {
                                    // Sort by rank (L1-L5), if rank is not available, maintain original order
                                    const rankA = a.rank || 999;
                                    const rankB = b.rank || 999;
                                    return rankA - rankB;
                                  })
                                  .map((vendor) => {
                                    const isCleared = vendor.is_cleared;
                                    // Always use anonymized vendor code - never show vendor name
                                    const vendorCode = vendor.rfq_product_vendor_id ? `VEN-${vendor.rfq_product_vendor_id}` : `Vendor ${vendor.vendor_id}`;
                                    return (
                                      <th
                                        key={vendor.vendor_id}
                                        className="align-middle"
                                      >
                                        <div className="d-flex justify-content-between gap-2 align-items-center">
                                          <div className="d-flex flex-column align-items-center w-100">
                                            <span>
                                              {vendorCode}
                                            </span>
                                            {/* Only show Score when marks have been given and we have a real score (not default 0 before evaluation) */}
                                            {vendor.calculated_score !== undefined && vendor.calculated_score !== null && vendor.has_marks && (vendor.calculated_score > 0) && (
                                              <p className="mb-1 mt-1">
                                                <strong>Score:</strong> {vendor.calculated_score}%
                                              </p>
                                            )}
                                            {/* Only show Pass/Fail when vendor has been evaluated (has_marks) and not default 0% before any marks */}
                                            {vendor.is_passed !== undefined && vendor.is_passed !== null && (vendor.has_marks) && (vendor.calculated_score > 0) && (
                                              <p
                                                className={`badge rounded-pill py-2 px-3 ${
                                                  vendor.is_passed
                                                    ? "text-bg-success"
                                                    : "text-bg-danger"
                                                }`}
                                                style={{
                                                  marginTop: 5,
                                                  marginBottom: 0,
                                                  width: "fit-content",
                                                }}
                                              >
                                                {vendor.is_passed ? "Pass" : "Fail"}
                                              </p>
                                            )}
                                            {/* Show "Not evaluated" when no marks given yet or score is still default 0 (not yet evaluated) */}
                                            {((!vendor.has_marks && vendor.is_cleared === null) || (Number(vendor.calculated_score) === 0 && vendor.is_cleared === null)) && (
                                              <p
                                                className="badge rounded-pill py-2 px-3 text-bg-secondary"
                                                style={{
                                                  marginTop: 5,
                                                  marginBottom: 0,
                                                  width: "fit-content",
                                                }}
                                              >
                                                Not Evaluated
                                              </p>
                                            )}
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
                                              {/* Hide View Profile for tenders to preserve vendor anonymity */}
                                              {currentRfq?.is_tender !== 1 && (
                                                <Dropdown.Item
                                                  target="_blank"
                                                  href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendor.vendor_id}`}
                                                  id={`view_vendor_profile_${vendor.vendor_id}-vendor_actions-technical_evaluation_page`}
                                                >
                                                  View Profile
                                                </Dropdown.Item>
                                              )}
                                              {/* Hide per-vendor Accept / Reject for tenders */}
                                              {currentRfq?.is_tender !== 1 && isCleared == null && canWrite && !permissionsLoading && !isPendingApproval && (
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
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <ReadMore
                                content={`${index + 1}. ${
                                  clauseItem.clause_text
                                }`}
                                maxLines={4}
                              />
                            </div>
                            <p className="text-sm mt-1">
                              <strong>Weightage:</strong> {clauseItem.weightage || 0}
                            </p>
                            {clauseItem.files && clauseItem.files.length > 0 ? (
                              <FileLink
                                key={clauseItem.clause_id}
                                Files={clauseItem.files}
                                ColumnClass="col-md-6"
                              />
                            ) : null}
                          </td>
                          {vendors && vendors.length > 0 &&
                            vendors
                              .filter(vendor => selectedVendors.length <= 0 ? true : selectedVendors.includes(vendor.vendor_id))
                              .sort((a, b) => {
                                // Sort by rank (L1-L5), if rank is not available, maintain original order
                                const rankA = a.rank || 999;
                                const rankB = b.rank || 999;
                                return rankA - rankB;
                              })
                              .map((vendor) => {
                              const response = clauseItem.vendor_responses.find(
                                (response) =>
                                  vendor.vendor_id == response.vendor_id
                              );
                              console.log("checking the console for vendor", vendor);
                              return (
                                <td key={vendor.vendor_id}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2,
                                    }}
                                  >
                                    {/* Don't show vendor response for sampling clauses */}
                                    {clauseItem.clause_type !== 'sampling' && (
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
                                    )}
                                    {response?.vendor_response_files && (
                                      <FileLink
                                        key={response.vendor_id}
                                        Files={response.vendor_response_files}
                                        ColumnClass="col-md-6"
                                      />
                                    )}
                                    {/* Show marks only if buyer has actually saved marks (score_timestamp exists) */}
                                    {response?.score_timestamp ? (
                                      <p className="mb-1 mt-1">
                                        <strong>Marks:</strong> {response.buyer_marks ?? 0} / {clauseItem.weightage || 0}
                                      </p>
                                    ) : (
                                      /* Show "No score assigned yet" when buyer hasn't saved marks (avoids showing 0 / weightage) */
                                      <p className="mb-1 mt-1 text-muted small">
                                        No score assigned yet
                                      </p>
                                    )}
                                    {clauseItem.clause_type !== 'sampling' && (
                                    <button
                                      type="button"
                                      className="d-flex justify-content-center align-items-center border-0 p-1 rounded-2 mt-1"
                                      style={{
                                        maxWidth: "100px",
                                        backgroundColor: isPendingApproval ? "#cccccc" : "var(--primary-color)",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        cursor: isPendingApproval ? "not-allowed" : "pointer",
                                      }}
                                      onClick={() => {
                                        toggleChat(clauseItem.clause_id);
                                        setSelectedVendor(vendor);
                                      }}
                                      disabled={isPendingApproval}
                                      title={isPendingApproval ? "Actions frozen during pending approval" : ""}
                                      id={`view_deviation_${clauseItem.clause_id}_${vendor.vendor_id}-deviation_actions-technical_evaluation_page`}
                                    >
                                     Deviation
                                    </button>
                                    )}
                                    <button
                                      type="button"
                                      className="d-flex justify-content-center align-items-center border-0 p-1 rounded-2 mt-1"
                                      style={{
                                        maxWidth: "120px",
                                        backgroundColor: (!canWrite || permissionsLoading || isPendingApproval) ? "#cccccc" : "var(--primary-color)",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        cursor: (!canWrite || permissionsLoading || isPendingApproval) ? "not-allowed" : "pointer",
                                      }}
                                      onClick={() => openRemarkModal(clauseItem, vendor)}
                                      disabled={!canWrite || permissionsLoading || isPendingApproval}
                                      title={isPendingApproval ? "Actions frozen during pending approval" : (!canWrite ? "You don't have permission to add marks" : "")}
                                      id={`add_remark_${clauseItem.clause_id}_${vendor.vendor_id}-clause_actions-technical_evaluation_page`}
                                    >
                                      {clauseItem.clause_type === 'sampling' ? 'Add Marks/Remarks' : 'Add Marks'}
                                    </button>
                                    {/* Show remark for sampling clauses - at the bottom */}
                                    {clauseItem.clause_type === 'sampling' && response?.buyer_remark && (
                                      <div className="mb-1 mt-2">
                                        <strong>Remark:</strong>{" "}
                                        <ReadMore
                                          content={response.buyer_remark}
                                          maxLines={3}
                                          additionalClasses="text-sm"
                                          additionalStyles={{ marginTop: "2px" }}
                                        />
                                      </div>
                                    )}

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
              </div>
            )}
          </>
        )}

        {responseLoading ?
                <FullLoader />
                :
                vendorResponse && vendorResponse.length > 0 && !multipleVendorsSelected &&
                <>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h3 className="fs-5 mb-0">
                            <span className="fw-semibold">{selectedVendor?.label}</span>
                        </h3>

                        {/* START: review status with evaluated by */}
                        <div className="">
                        
                        {/* start : status tag */}
                        <div>
                            {techEvalStatus == 1 ? (
                                techEvalCleared.status == 1 ? (
                                    <span
                                        className="fw-medium text-bg-success px-3 py-2"
                                        style={{ borderRadius: "18px 0 0 18px", fontSize: "16px" }}
                                    >
                                        Vendor is Technically Accepted
                                    </span>
                                ) : (
                                    <span
                                        className="fw-medium text-bg-danger px-3 py-2"
                                        style={{ borderRadius: "18px 0 0 18px", fontSize: "16px" }}
                                    >
                                        Vendor is Not Technically Accepted
                                    </span>
                                )
                            ) : (
                                /* For tenders, hide the big Technically Accepted / Not Accepted buttons */
                                currentRfq?.is_tender === 1 ? null : (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-secondary border-0 p-2"
                                            style={{ width: "220px", marginRight: 10, opacity: (!canWrite || permissionsLoading || isPendingApproval) ? 0.6 : 1 }}
                                            onClick={() => addToTechnicallyAccepted()}
                                            disabled={!canWrite || permissionsLoading || isPendingApproval}
                                            title={isPendingApproval ? "Actions frozen during pending approval" : (!canWrite ? "You don't have permission to accept vendors" : "")}
                                            id="technically_accept_vendor-vendor_evaluation-technical_evaluation_page"
                                        >
                                            Technically Accepted
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger border-0 p-2"
                                            style={{ width: "255px", opacity: (!canWrite || permissionsLoading || isPendingApproval) ? 0.6 : 1 }}
                                            onClick={() => setShowRejectConfirmModal(true)}
                                            disabled={!canWrite || permissionsLoading || isPendingApproval}
                                            title={isPendingApproval ? "Actions frozen during pending approval" : (!canWrite ? "You don't have permission to reject vendors" : "")}
                                            id="technically_reject_vendor-vendor_evaluation-technical_evaluation_page"
                                        >
                                            Technically Not Accepted
                                        </button>
                                    </>
                                )
                            )}
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
                                                <div className="d-flex align-items-center gap-2">
                                                    <ReadMore content={`${index + 1}. ${clauseItem.clause_text}`} maxLines={4} />
                                                </div>
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
                                                {clauseItem.clause_type !== 'sampling' && (
                                                <button
                                                    type="button"
                                                    className="d-flex justify-content-center align-items-center border-0 p-1 rounded-2"
                                                    style={{
                                                        width: "100px",
                                                        backgroundColor: isPendingApproval ? "#cccccc" : "var(--primary-color)",
                                                        color: "#ffffff",
                                                        fontSize: "13px",
                                                        cursor: isPendingApproval ? "not-allowed" : "pointer"
                                                    }}
                                                    onClick={() => toggleChat(clauseItem.clause_id)}
                                                    disabled={isPendingApproval}
                                                    title={isPendingApproval ? "Actions frozen during pending approval" : ""}
                                                    id={`explanation_deviation_${clauseItem.clause_id}-clause_actions-technical_evaluation_page`}
                                                >
                                                    Explanation / Deviation
                                                </button>
                                                )}
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

        {/* Technical Acceptance Confirmation Modal */}
        <ConfirmationModal
          isOpen={showAcceptConfirmModal}
          onClose={handleAcceptCancel}
          onConfirm={handleAcceptConfirm}
          title="Technically Accept Vendor"
          description="Are you sure you want to technically accept this vendor?\nThis action will mark the vendor as technically accepted for this product."
          confirmButtonColor="success"
          confirmButtonText="Accept"
          cancelButtonText="Cancel"
        />

        {/* Technical Rejection Confirmation Modal */}
        <ConfirmationModal
          isOpen={showRejectConfirmModal}
          onClose={handleRejectCancel}
          onConfirm={handleRejectConfirm}
          title="Technically Reject Vendor"
          description="Are you sure you want to technically reject this vendor?\nThis action will mark the vendor as not technically accepted and require a rejection reason."
          confirmButtonColor="danger"
          confirmButtonText="Reject"
          cancelButtonText="Cancel"
        />

        {/* Add Remark Modal */}
        <Modal show={showRemarkModal} onHide={() => {
          setShowRemarkModal(false);
          setBuyerRemark("");
          setBuyerMarks("");
          setSelectedClauseForRemark(null);
          setSelectedVendorForRemark(null);
        }} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedClauseForRemark?.clause_type === 'sampling' ? 'Add Remark and Score' : 'Add Score'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label">Give Score</label>
              {selectedClauseForRemark?.weightage && (
                <div className="alert alert-info mb-2 p-2" style={{ fontSize: "12px" }}>
                  <strong>Clause Weightage:</strong> {selectedClauseForRemark.weightage}
                  <br />
                  <small>Maximum marks allowed: {selectedClauseForRemark.weightage}</small>
                </div>
              )}
              <Form.Control
                type="number"
                placeholder="Enter score"
                min="0"
                max={selectedClauseForRemark?.weightage || 100}
                value={buyerMarks}
                onChange={(e) => {
                  const value = e.target.value;
                  setBuyerMarks(value);
                }}
                className={buyerMarks && parseInt(buyerMarks) > (selectedClauseForRemark?.weightage || 0) 
                  ? 'border-danger' 
                  : ''}
              />
              {buyerMarks && parseInt(buyerMarks) > (selectedClauseForRemark?.weightage || 0) && (
                <small className="text-danger">
                  Marks ({buyerMarks}) cannot exceed weightage ({selectedClauseForRemark?.weightage || 0})
                </small>
              )}
            </div>
            {selectedClauseForRemark?.clause_type === 'sampling' && (
              <div className="mb-3">
                <label className="form-label">Add Remark</label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter remark"
                  value={buyerRemark}
                  onChange={(e) => setBuyerRemark(e.target.value)}
                />
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowRemarkModal(false);
                setBuyerRemark("");
                setBuyerMarks("");
                setSelectedClauseForRemark(null);
                setSelectedVendorForRemark(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveBuyerMarks}
              disabled={loading || !canWrite || permissionsLoading}
              title={!canWrite ? "You don't have permission to save marks" : ""}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </Modal.Footer>
        </Modal>

        {/* Submit for Approval Button - Product Level (Multi-round support) */}
        <div className="d-flex justify-content-end mt-4 mb-3">
          <button
            type="button"
            className={`btn btn-sm p-2 ${
              workflowComplete ? 'btn-success' :
              workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL ? 'btn-warning' :
              'btn-primary'
            }`}
            style={{width: 260}}
            onClick={() => setShowSubmitModal(true)}
            disabled={
              !canWrite ||
              permissionsLoading ||
              submitLoading ||
              workflowComplete ||
              workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL ||
              pendingEvaluationVendors.length === 0
            }
            title={
              workflowComplete ? `Completed (${totalPassedVerified}/${requiredPassedVendors} vendors cleared)` :
              workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL ? `Round ${currentRound} pending approval` :
              pendingEvaluationVendors.length === 0 ? "No vendors pending evaluation" :
              !canWrite ? "You don't have permission to submit for approval" :
              "Submit evaluation for approval"
            }
            id={`submit_for_approval_product_${product?.id}-technical_evaluation_page`}
          >
            {submitLoading ? "Submitting..." :
             workflowComplete ? `Completed (${totalPassedVerified}/${requiredPassedVendors})` :
             workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL ? `Round ${currentRound} Pending Approval` :
             `Submit Round ${currentRound} for Approval`}
          </button>
        </div>

        {/* Approval Workflow Section - Round Level (Multi-round support) */}
        {latestRound?.round_id && (
          <div className="buyer-rfq-approval-sec mt-3 mb-3">
            <ApprovalWorkflowSection
              entityType="TECHNICAL"
              entityId={latestRound.round_id}
              entityLabel={`Round ${latestRound.round_number || currentRound} Evaluation`}
              hospitalityCompanyId={currentRfq?.hospitality_company_id}
              hotelId={currentRfq?.hotel_id}
              departmentId={currentRfq?.department_id}
              onCustomApprove={handleTechEvalApprove}
              onCustomReject={handleTechEvalReject}
              onActionComplete={() => {
                // Refresh workflow status after approval action
                refetchWorkflow();
                if (refetch) refetch();
              }}
            />
          </div>
        )}

        {/* Fallback: Show approval for product if no round exists yet (legacy support) */}
        {!latestRound?.round_id && product?.id && (
          <div className="buyer-rfq-approval-sec mt-3 mb-3">
            <ApprovalWorkflowSection
              entityType="TECHNICAL"
              entityId={product.id}
              entityLabel={`Evaluation of ${product?.product_details?.[0]?.name || 'Product'}`}
              hospitalityCompanyId={currentRfq?.hospitality_company_id}
              hotelId={currentRfq?.hotel_id}
              departmentId={currentRfq?.department_id}
              onCustomApprove={handleTechEvalApprove}
              onCustomReject={handleTechEvalReject}
            />
          </div>
        )}

        {/* Submit for Approval Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onConfirm={handleSubmitForApproval}
          title="Submit for Approval"
          description={`Are you sure you want to submit the technical evaluation for "${product?.product_details?.[0]?.name || 'this product'}" for approval?\n\nOnce submitted, it will be sent to the technical approver for review.`}
          confirmButtonColor="primary"
          confirmButtonText={submitLoading ? "Submitting..." : "Submit"}
          cancelButtonText="Cancel"
        />

        <hr />
      </div>
    );
}

export default ClauseProductItem
