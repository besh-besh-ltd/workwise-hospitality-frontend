import { addToTA, fetchVendorAgreement, getClausesByRfqProductId, getSummarisedDeviation, getTechClearedVendorsResult, updateBuyerMarks, submitTechEvalForApproval, submitTechEvalApprovalAction, fetchDeviationPreviews } from '@/services/rfq';
import React, { useEffect, useRef, useState } from 'react'
import BuyerVendorChat from './buyerVendorChat';
import VendorDeviationModal from './VendorDeviationModal';
import FullLoader from '@/components/shared/FullLoader';
import TE_Modal from './TE_Modal';
import { toast } from 'react-toastify';
import ReadMore from '@/components/shared/ReadMore';
import { Modal, Form } from 'react-bootstrap';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import { BsCheckCircleFill, BsXCircleFill, BsChatDots, BsPencilSquare, BsShieldCheck, BsFileEarmark, BsPersonCheck } from "react-icons/bs";
import { ApprovalWorkflowSection } from "@/components/dashboard/buyer/approval";
import { useTechEvalWorkflow } from '@/hooks/useTechEvalWorkflow';
import TechEvalWorkflowStatus from './TechEvalWorkflowStatus';
import { TECH_EVAL_WORKFLOW_STATES } from '@/utils/constants/techEvalWorkflow';
import { checkBidExpired } from '@/utils/sharedFunctions';
import styles from './TechnicalEvaluation.module.scss';


const ClauseProductItem = ({
  rfq_id,
  product,
  currentUserProfile,
  clauseInfo,
  currentRfq,
  vendors : _vendors,
  refetch,
  selectedVendor : _selectedVendor = null,
  selectedVendors,
  minimumPassingScore: _minimumPassingScore,
  canWrite = true,
  canApprove = false,
  permissionsLoading = false,
  onEvaluationStatusChange, // Callback to notify parent about evaluation status
  quotedVendorsOnly = true,
  showFailedVendors = false,
}) => {

  const multipleVendorsSelected = selectedVendors && selectedVendors.length > 1;
  
    const [buyerClauses, setBuyerClauses] = useState(clauseInfo);
    const [vendorResponse, setVendorResponse] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [chatMap, setChatMap] = useState(null);
    const [showDeviationModal, setShowDeviationModal] = useState(false);
    const [selectedDeviationClause, setSelectedDeviationClause] = useState(null);
    const [selectedDeviationVendor, setSelectedDeviationVendor] = useState(null);
    const [deviationPreviews, setDeviationPreviews] = useState({});
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
    const [savingScore, setSavingScore] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [approvalRefreshKey, setApprovalRefreshKey] = useState(0);
    // const [summarisedDeviation , setSummarisedDeviation] = useState();
    // const [updatedClauseInfoSummary , setUpdatedClauseInfoSummary] = useState(null);
    const tableRef = useRef(null);

    // Check if a response was actually scored by the evaluator.
    // score_timestamp is defaulted to creation time, so compare against response_timestamp.
    const isResponseScored = (resp) => {
      if (!resp?.score_timestamp) return false;
      return resp.response_timestamp !== resp.score_timestamp;
    };

    // Helper: Check if a vendor has been truly scored for ALL clauses
    const isVendorFullyScored = (vendorId) => {
      if (!clauseInfo || clauseInfo.length === 0) return false;
      return clauseInfo.every(clause => {
        const response = clause.vendor_responses?.find(r => String(r.vendor_id) == String(vendorId));
        return response && isResponseScored(response);
      });
    };

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

    const getRoundEntityId = (round) => {
        return round?.round_id || round?.id || round?.entity_id || null;
    };

    const pendingRound =
        rounds?.find((round) => ["PENDING", "IN_PROGRESS", "SUBMITTED"].includes(String(round?.status || "").toUpperCase())) || null;

    // TECHNICAL approval entity is round-based (pending round id), not rfq_product_id
    const approvalEntityId = getRoundEntityId(pendingRound) || getRoundEntityId(latestRound);

    // All round entity IDs for full approval history (across all rounds)
    const allRoundEntityIds = (rounds || []).map(getRoundEntityId).filter(Boolean);

    // Derived: Check if approval is pending (used for parent "Approval Pending" banner)
    const isPendingApproval =
        workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL || !!pendingRound;

    // Derived: Lock editing unless actively evaluating (EVALUATING = initial eval or after rejection)
    // Locked during: PENDING_APPROVAL (submitted), AWAITING_NEXT_ROUND (approved), COMPLETED
    const isEditLocked = workflowState !== TECH_EVAL_WORKFLOW_STATES.EVALUATING;

    // Derived: Check if quote submission deadline has NOT yet passed (lock tech eval edits until deadline)
    const isBidEndNotPassed = currentRfq?.bid_end_date ? !checkBidExpired(currentRfq.bid_end_date) : false;

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
                // TA added successfully
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

    const openDeviationModal = (clause, vendor) => {
        setSelectedDeviationClause(clause);
        setSelectedDeviationVendor(vendor);
        setShowDeviationModal(true);
    };

    const closeDeviationModal = () => {
        setShowDeviationModal(false);
        setSelectedDeviationClause(null);
        setSelectedDeviationVendor(null);
        // Refresh previews after modal closes (new messages may have been sent)
        if (product?.id) loadDeviationPreviews();
    };

    const loadDeviationPreviews = async () => {
        if (!product?.id) return;
        try {
            const res = await fetchDeviationPreviews(product.id);
            if (res?.data) {
                const grouped = {};
                res.data.forEach(msg => {
                    // Identify vendor by checking against the known vendors list
                    // This ensures messages from ANY evaluator to a vendor are grouped correctly
                    const isVendorSender = _vendors?.some(v => String(v.vendor_id) == String(msg.sender_id));
                    const vendorId = isVendorSender ? String(msg.sender_id) : String(msg.receiver_id);
                    const key = `${msg.clause_id}_${vendorId}`;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(msg);
                });
                setDeviationPreviews(grouped);
            }
        } catch (e) {
            console.error("Failed to load deviation previews:", e);
        }
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
            console.error("Error fetching buyer clauses:", error);
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

            // Trigger ApprovalWorkflowSection to refetch
            setApprovalRefreshKey(prev => prev + 1);

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

        // Validate marks: required, minimum 1, and must not exceed weightage
        if (buyerMarks === "" || buyerMarks === null || buyerMarks === undefined) {
            toast.error("Please enter marks for this clause");
            return;
        }

        const marksValue = parseInt(buyerMarks);
        if (isNaN(marksValue) || marksValue < 1) {
            toast.error("Marks must be at least 1");
            return;
        }

        const weightage = selectedClauseForRemark.weightage || 0;
        if (marksValue > weightage) {
            toast.error(`Marks (${marksValue}) cannot exceed the weightage (${weightage}) for this clause`);
            return;
        }

        const payload = {
            clause_id: selectedClauseForRemark.clause_id,
            vendor_id: selectedVendorForRemark.vendor_id || selectedVendorForRemark.value,
            buyer_marks: buyerMarks !== "" && buyerMarks !== null && buyerMarks !== undefined ? parseInt(buyerMarks) : null,
            buyer_remark: selectedClauseForRemark.clause_type === 'sampling' ? (buyerRemark || null) : null
        }

        setSavingScore(true);
        try {
            const res = await updateBuyerMarks(payload);
            toast.success(res.message || "Marks and remark saved successfully");

            // Optimistic local update — update clauseInfo in-place so user sees score instantly
            const updatedClauseInfo = clauseInfo.map(clause => {
                if (clause.clause_id === selectedClauseForRemark.clause_id) {
                    const updatedResponses = (clause.vendor_responses || []).map(resp => {
                        if (String(resp.vendor_id) === String(selectedVendorForRemark.vendor_id || selectedVendorForRemark.value)) {
                            return {
                                ...resp,
                                buyer_marks: parseInt(buyerMarks),
                                buyer_remark: selectedClauseForRemark.clause_type === 'sampling' ? (buyerRemark || null) : resp.buyer_remark,
                                score_timestamp: new Date().toISOString(),
                                scorer_name: currentUserProfile?.name || resp.scorer_name
                            };
                        }
                        return resp;
                    });
                    return { ...clause, vendor_responses: updatedResponses };
                }
                return clause;
            });
            setBuyerClauses(updatedClauseInfo);

            setShowRemarkModal(false);
            setBuyerRemark("");
            setBuyerMarks("");
            setSelectedClauseForRemark(null);
            setSelectedVendorForRemark(null);

            // Background refresh — silently sync without blocking UI or resetting accordions
            if (refetch) {
                refetch({ silent: true });
            }
        } catch (error) {
            toast.error(error.message || "Failed to save marks and remark");
        } finally {
            setSavingScore(false);
        }
    }

    const openRemarkModal = (clause, vendor) => {
        const response = clause.vendor_responses?.find(r => r.vendor_id == (vendor.vendor_id || vendor.value));
        setSelectedClauseForRemark(clause);
        setSelectedVendorForRemark(vendor);
        // Only set remark for sampling clauses
        setBuyerRemark(clause.clause_type === 'sampling' ? (response?.buyer_remark ?? "") : "");
        setBuyerMarks(isResponseScored(response) && response?.buyer_marks !== undefined && response?.buyer_marks !== null ? response.buyer_marks : "");
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

    useEffect(() => {
        if(_vendors) {
            setVendors(_vendors);
        }
    }, [_vendors])

    useEffect(() => {
        if (product?.id && clauseInfo && clauseInfo.length > 0) {
            loadDeviationPreviews();
        }
    }, [product?.id, clauseInfo]);

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

    // Notify parent about evaluation status for this product
    useEffect(() => {
        if (onEvaluationStatusChange && vendors && clauseInfo) {
            const allVendors = vendors || [];
            const evaluatedVendorCount = allVendors.filter(v => isVendorFullyScored(v.vendor_id)).length;

            // A product is fully evaluated if all vendors have scores for all clauses
            const isFullyEvaluated = evaluatedVendorCount > 0 && allVendors.length > 0 &&
                allVendors.every(vendor => isVendorFullyScored(vendor.vendor_id));

            onEvaluationStatusChange(product.id, {
                isFullyEvaluated,
                evaluatedVendorCount,
                totalVendors: allVendors.length,
                isPendingApproval,
                workflowComplete,
                workflowState
            });
        }
    }, [vendors, clauseInfo, isPendingApproval, workflowComplete, workflowState]);

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


        {/* Buyer All Clauses */}
        {loading ? (
          <FullLoader />
        ) : (
          <>
            {!vendorResponse && (
              <div className="mt-3">
                {minimumPassingScore !== null && (
                  <div className={styles.passingScore}>
                    <div className={styles.passingScoreIcon}>
                      <BsShieldCheck size={13} />
                    </div>
                    <span><strong>Minimum Passing Score:</strong> {minimumPassingScore} out of 100</span>
                  </div>
                )}
                {quotedVendorsOnly && vendors && vendors.length > 0 && !vendors.some(v => v.has_quoted) && (
                  <div className="text-center py-4" style={{ background: '#f8f9fa', borderRadius: 8 }}>
                    <p className="text-muted mb-1" style={{ fontSize: '0.88rem', fontWeight: 500 }}>No vendors have submitted quotes yet.</p>
                    <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>Turn off the "Quoted Vendors Only" filter to view all vendors.</p>
                  </div>
                )}
                {(!quotedVendorsOnly || !vendors || vendors.length === 0 || vendors.some(v => v.has_quoted)) && (
                <div className={styles.tableWrapper}>
                  <table className={styles.scoringTable}>
                    <thead>
                      <tr>
                        <th className="align-middle">Clause & Files</th>
                        {vendors && vendors.length > 0 &&
                          vendors
                            .filter(vendor => {
                              if (selectedVendors.length > 0 && !selectedVendors.includes(vendor.vendor_id)) return false;
                              const isReplacedOut = vendor.is_replaced_out === true;
                              if (showFailedVendors) return isReplacedOut;
                              if (isReplacedOut) return false;
                              if (quotedVendorsOnly && !vendor.has_quoted) return false;
                              return true;
                            })
                            .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                            .map((vendor) => {
                              const isCleared = vendor.is_cleared;
                              const vendorCode = vendor.rfq_product_vendor_id ? `VEN-${vendor.rfq_product_vendor_id}` : `Vendor ${vendor.vendor_id}`;
                              const vendorEvaluated = isVendorFullyScored(vendor.vendor_id);
                              const vendorPartial = !vendorEvaluated && clauseInfo.some(clause => {
                                const resp = clause.vendor_responses?.find(r => String(r.vendor_id) == String(vendor.vendor_id));
                                return resp && isResponseScored(resp);
                              });
                              const colTintClass = vendorEvaluated
                                ? (vendor.is_passed ? styles.vendorColPassed : styles.vendorColFailed)
                                : vendorPartial
                                ? styles.vendorColInProgress
                                : styles.vendorColNotEvaluated;
                              return (
                                <th key={vendor.vendor_id} className={`${styles.vendorHeader} ${colTintClass}`}>
                                  <div className={styles.vendorHeaderTop}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span className={styles.vendorCode}>{vendorCode}</span>
                                      {vendor.evaluation_round && (
                                        <span className="badge rounded-pill" style={{
                                          fontSize: '10px', fontWeight: 700, padding: '3px 10px', letterSpacing: '0.5px',
                                          background: vendor.is_replaced_out ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                                          color: vendor.is_replaced_out ? '#dc2626' : '#16a34a',
                                          border: `1px solid ${vendor.is_replaced_out ? 'rgba(220, 38, 38, 0.2)' : 'rgba(22, 163, 74, 0.2)'}`,
                                        }}>
                                          R{vendor.evaluation_round}
                                        </span>
                                      )}
                                      {!quotedVendorsOnly && !vendor.has_quoted && (
                                        <span className="badge rounded-pill py-1 px-2 text-bg-secondary" style={{ fontSize: '9px' }}>
                                          Not Quoted
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Score + status */}
                                  {vendorEvaluated && vendor.calculated_score !== undefined && vendor.calculated_score !== null ? (
                                    <div className={styles.vendorScoreLine}>
                                      <span className={styles.vendorScore}>{(!minimumPassingScore) ? 100 : vendor.calculated_score}%</span>
                                      {vendor.is_passed !== undefined && vendor.is_passed !== null && (
                                        <span className={`badge rounded-pill py-1 px-2 ${vendor.is_passed ? "text-bg-success" : "text-bg-danger"}`} style={{ fontSize: '10px' }}>
                                          {vendor.is_passed ? "Pass" : "Fail"}
                                        </span>
                                      )}
                                      {isCleared != null && (
                                        <span className={`badge rounded-pill py-1 px-2 ${isCleared == 1 ? "text-bg-success" : "text-bg-danger"}`} style={{ fontSize: '10px' }}>
                                          {isCleared == 1 ? "Accepted" : "Not Accepted"}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    vendorPartial ? (
                                      <span className="badge rounded-pill py-1 px-2" style={{ fontSize: '10px', background: '#2563eb', color: '#fff' }}>In Progress</span>
                                    ) : !vendorEvaluated && vendor.is_cleared === null ? (
                                      <span className="badge rounded-pill py-1 px-2 text-bg-light text-muted" style={{ fontSize: '10px' }}>N/A</span>
                                    ) : isCleared != null ? (
                                      <span className={`badge rounded-pill py-1 px-2 ${isCleared == 1 ? "text-bg-success" : "text-bg-danger"}`} style={{ fontSize: '10px' }}>
                                        {isCleared == 1 ? "Accepted" : "Not Accepted"}
                                      </span>
                                    ) : null
                                  )}

                                  {/* Eval / Appr */}
                                  {(vendor?.evaluated_by || vendor?.approved_by) && (
                                    <div className={styles.vendorMeta}>
                                      {vendor?.evaluated_by && (
                                        <div className={styles.vendorMetaItem}>
                                          <BsPersonCheck size={11} /> {vendor.evaluated_by}
                                        </div>
                                      )}
                                      {vendor?.approved_by && (
                                        <div className={styles.vendorMetaItem}>
                                          <BsShieldCheck size={11} /> {vendor.approved_by}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </th>
                              );
                            })}
                      </tr>
                    </thead>

                    <tbody>
                      {clauseInfo && clauseInfo.length > 0 &&
                        clauseInfo.map((clauseItem, index) => (
                          <React.Fragment key={`rfq_prod_clause_${clauseItem.clause_id}`}>
                            <tr>
                              <td>
                                <div className={styles.clauseCell}>
                                  <ReadMore content={`${index + 1}. ${clauseItem.clause_text}`} maxLines={3} />
                                  <div className={styles.clauseMeta}>
                                    <span className={styles.clauseWeightage}>W: {clauseItem.weightage || 0}</span>
                                    {clauseItem.files && clauseItem.files.length > 0 && (
                                      <div className={styles.fileButtons}>
                                        {clauseItem.files.map((file, fi) => (
                                          <a key={fi} href={file} target="_blank" rel="noopener noreferrer" className={styles.fileButton} title={`Attachment ${fi + 1}`}>
                                            <BsFileEarmark size={11} /> Attachment {clauseItem.files.length > 1 ? fi + 1 : ''}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {vendors && vendors.length > 0 &&
                                vendors
                                  .filter(vendor => {
                                    if (selectedVendors.length > 0 && !selectedVendors.includes(vendor.vendor_id)) return false;
                                    const isReplacedOut = vendor.is_replaced_out === true;
                                    if (showFailedVendors) return isReplacedOut;
                                    if (isReplacedOut) return false;
                                    if (quotedVendorsOnly && !vendor.has_quoted) return false;
                                    return true;
                                  })
                                  .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                                  .map((vendor) => {
                                    const response = clauseItem.vendor_responses.find(
                                      (response) => vendor.vendor_id == response.vendor_id
                                    );
                                    return (
                                      <td key={vendor.vendor_id}>
                                        {(() => {
                                          const isScored = isResponseScored(response);
                                          const disagrees = clauseItem.clause_type !== 'sampling' && response?.vendor_response == "I Dont Agree";
                                          const isVendorLocked = vendor.is_verified === true;
                                          const canEdit = canWrite && !permissionsLoading && !isEditLocked && !isBidEndNotPassed && !isVendorLocked;
                                          const previewKey = `${clauseItem.clause_id}_${String(vendor.vendor_id)}`;
                                          const previewMsgs = deviationPreviews[previewKey];
                                          const hasMessages = previewMsgs?.length > 0;
                                          const vendorLabel = vendor.rfq_product_vendor_id ? `VEN-${vendor.rfq_product_vendor_id}` : `Vendor ${vendor.vendor_id}`;
                                          return (
                                            <div className={styles.vendorCell}>
                                              {/* Response badge */}
                                              {clauseItem.clause_type !== 'sampling' && response?.vendor_response && (
                                                <span className={`badge rounded-pill py-1 px-2 ${
                                                  response.vendor_response == "I Agree" ? "text-bg-success"
                                                    : response.vendor_response == "I Dont Agree" ? "text-bg-danger"
                                                    : "text-bg-secondary"
                                                }`} style={{ width: "fit-content", fontSize: '10px' }}>
                                                  {response.vendor_response == "I Agree" && <BsCheckCircleFill size={9} className="me-1" />}
                                                  {response.vendor_response == "I Dont Agree" && <BsXCircleFill size={9} className="me-1" />}
                                                  {response.vendor_response == "I Agree" ? "Agrees" : response.vendor_response == "I Dont Agree" ? "Disagrees" : response.vendor_response}
                                                </span>
                                              )}

                                              {/* Score (clickable) + response files inline */}
                                              <div className={styles.vendorScoreRow}>
                                                <span
                                                  className={`${styles.scoreChip} ${isScored ? (disagrees ? styles.scoreChipAlert : styles.scoreChipScored) : styles.scoreChipUnscored} ${canEdit ? styles.scoreChipClickable : ''}`}
                                                  onClick={canEdit ? () => openRemarkModal(clauseItem, vendor) : undefined}
                                                  role={canEdit ? "button" : undefined}
                                                  tabIndex={canEdit ? 0 : undefined}
                                                  title={
                                                    isVendorLocked ? `Score verified in Round ${vendor.evaluation_round || ''}. Cannot edit.`
                                                      : !canWrite ? "No permission"
                                                      : isEditLocked ? "Evaluation locked"
                                                      : isBidEndNotPassed ? "Locked until bid submission deadline"
                                                      : isScored ? `${response.buyer_marks ?? '-'}/${clauseItem.weightage || 0} · Click to edit` : (canEdit ? "Click to score" : `-/${clauseItem.weightage || 0} · Not scored`)
                                                  }
                                                  id={`add_remark_${clauseItem.clause_id}_${vendor.vendor_id}-clause_actions-technical_evaluation_page`}
                                                >
                                                  {isScored ? (
                                                    <>{response.buyer_marks ?? '-'} / {clauseItem.weightage || 0}{canEdit && <BsPencilSquare size={10} className={styles.scoreEditIcon} />}</>
                                                  ) : (
                                                    canEdit ? <><BsPencilSquare size={11} /> Score</> : <>- / {clauseItem.weightage || 0}</>
                                                  )}
                                                </span>
                                                {response?.vendor_response_files && Array.isArray(response.vendor_response_files) && response.vendor_response_files.length > 0 && (
                                                  <div className={styles.fileButtons}>
                                                    {response.vendor_response_files.map((file, fi) => (
                                                      <a key={fi} href={file} target="_blank" rel="noopener noreferrer" className={styles.fileButton} title={`Vendor file ${fi + 1}`}>
                                                        <BsFileEarmark size={11} /> File {response.vendor_response_files.length > 1 ? fi + 1 : ''}
                                                      </a>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Scored by */}
                                              {isScored && response?.scorer_name && (
                                                <div className={styles.scorerTag}>
                                                  <BsPencilSquare size={9} />
                                                  <span>{response.scorer_name}</span>
                                                </div>
                                              )}

                                              {/* Sampling remark preview */}
                                              {clauseItem.clause_type === 'sampling' && response?.buyer_remark && (
                                                <div className={styles.samplingRemarkPreview} title={response.buyer_remark}>
                                                  <span className={styles.samplingRemarkLabel}>Remark:</span>
                                                  {response.buyer_remark.length > 60 ? response.buyer_remark.substring(0, 60) + '...' : response.buyer_remark}
                                                </div>
                                              )}

                                              {/* Deviation preview */}
                                              {clauseItem.clause_type !== 'sampling' && hasMessages && (
                                                    <div
                                                      className={styles.deviationPreview}
                                                      onClick={() => openDeviationModal(clauseItem, vendor)}
                                                      role="button"
                                                      tabIndex={0}
                                                    >
                                                      {previewMsgs.slice(0, 2).map((m, i) => {
                                                        const isVendor = _vendors?.some(v => String(v.vendor_id) == String(m.sender_id));
                                                        const name = isVendor ? vendorLabel : "Evaluator";
                                                        const text = m.text?.length > 35 ? m.text.substring(0, 35) + "..." : m.text;
                                                        return (
                                                          <div key={i} className={`${styles.deviationPreviewMsg} ${isVendor ? styles.deviationPreviewVendor : styles.deviationPreviewEvaluator}`} title={`${name}: ${m.text}`}>
                                                            <span className={styles.deviationPreviewName}>{name}:</span> {text}
                                                          </div>
                                                        );
                                                      })}
                                                      {previewMsgs.length > 2 && (
                                                        <div className={styles.deviationPreviewMore}>
                                                          +{previewMsgs.length - 2} more
                                                        </div>
                                                      )}
                                                    </div>
                                              )}
                                            </div>
                                          );
                                        })()}
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
                                token=""
                                product={product}
                                rfq_no={currentRfq}
                              />
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}
          </>
        )}

        {responseLoading ?
                <FullLoader />
                :
                vendorResponse && vendorResponse.length > 0 && !multipleVendorsSelected &&
                <>
                    <div className={styles.vendorResponseHeader}>
                        <h3 className={styles.vendorResponseTitle}>{selectedVendor?.label}</h3>

                        <div className={styles.vendorResponseActions}>
                            {techEvalStatus == 1 ? (
                                techEvalCleared.status == 1 ? (
                                    <span className={`${styles.vendorStatusTag} ${styles.vendorStatusAccepted}`}>
                                        Vendor is Technically Accepted
                                    </span>
                                ) : (
                                    <span className={`${styles.vendorStatusTag} ${styles.vendorStatusRejected}`}>
                                        Vendor is Not Technically Accepted
                                    </span>
                                )
                            ) : (
                                currentRfq?.is_tender === 1 ? null : (
                                    <>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.btnLg} ${(!canWrite || permissionsLoading || isEditLocked || isBidEndNotPassed) ? styles.btnDisabled : styles.btnSuccess}`}
                                            onClick={() => addToTechnicallyAccepted()}
                                            disabled={!canWrite || permissionsLoading || isEditLocked || isBidEndNotPassed}
                                            title={
                                              isEditLocked ? "Evaluation locked"
                                                : isBidEndNotPassed ? "Technical acceptance is locked until the bid submission deadline"
                                                : (!canWrite ? "You don't have permission to accept vendors" : "")
                                            }
                                            id="technically_accept_vendor-vendor_evaluation-technical_evaluation_page"
                                        >
                                            <BsCheckCircleFill size={14} /> Technically Accepted
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.btnLg} ${(!canWrite || permissionsLoading || isEditLocked || isBidEndNotPassed) ? styles.btnDisabled : styles.btnDanger}`}
                                            onClick={() => setShowRejectConfirmModal(true)}
                                            disabled={!canWrite || permissionsLoading || isEditLocked || isBidEndNotPassed}
                                            title={
                                              isEditLocked ? "Evaluation locked"
                                                : isBidEndNotPassed ? "Technical rejection is locked until the bid submission deadline"
                                                : (!canWrite ? "You don't have permission to reject vendors" : "")
                                            }
                                            id="technically_reject_vendor-vendor_evaluation-technical_evaluation_page"
                                        >
                                            <BsXCircleFill size={14} /> Technically Not Accepted
                                        </button>
                                    </>
                                )
                            )}
                        </div>
                    </div>

                    {/* Evaluated by / Approved by meta */}
                    {techEvalStatus == 1 && (techEvalCleared?.evaluated_by || techEvalCleared?.approved_by) && (
                      <div className={styles.vendorResponseMeta}>
                        {techEvalCleared?.evaluated_by && (
                          <span className={styles.vendorMetaItem}>
                            <BsPersonCheck size={13} /> Evaluated by: <strong>{techEvalCleared.evaluated_by}</strong>
                          </span>
                        )}
                        {techEvalCleared?.approved_by && (
                          <span className={styles.vendorMetaItem}>
                            <BsShieldCheck size={13} /> Approved by: <strong>{techEvalCleared.approved_by}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    <div className={`${styles.tableWrapper} mt-3`}>
                        <table className={styles.responseTable} ref={tableRef}>
                            <thead>
                                <tr>
                                    <th className={styles.responseTableCol1}>Clause Terms</th>
                                    <th className={styles.responseTableCol2}>Vendor Response</th>
                                    <th className={styles.responseTableCol3}>Cross Reference Documents</th>
                                    <th className={styles.responseTableCol4}>Comment</th>
                                </tr>
                            </thead>

                            <tbody>
                                {vendorResponse.map((clauseItem, index) => (
                                    <React.Fragment key={`ven_res_clause_${clauseItem.clause_id}`}>
                                        <tr>
                                            <td>
                                                <ReadMore content={`${index + 1}. ${clauseItem.clause_text}`} maxLines={4} />
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill py-1 px-2 ${clauseItem.vendor_response == "I Agree" ? 'text-bg-success' : 'text-bg-danger'}`}>
                                                    {clauseItem.vendor_response == "I Agree" && <BsCheckCircleFill size={10} className="me-1" />}
                                                    {clauseItem.vendor_response != "I Agree" && <BsXCircleFill size={10} className="me-1" />}
                                                    {clauseItem.vendor_response}
                                                </span>
                                            </td>
                                            <td>
                                                {clauseItem.vendor_response_files && clauseItem.vendor_response_files.length > 0
                                                    ? <div className={styles.fileButtons}>
                                                        {clauseItem.vendor_response_files.map((file, fi) => (
                                                          <a key={fi} href={file} target="_blank" rel="noopener noreferrer" className={styles.fileButton}>
                                                            <BsFileEarmark size={11} />
                                                            File {clauseItem.vendor_response_files.length > 1 ? fi + 1 : ''}
                                                          </a>
                                                        ))}
                                                      </div>
                                                    : "N/A"
                                                }
                                            </td>
                                            <td>
                                                {clauseItem.clause_type !== 'sampling' && (
                                                  <button
                                                      type="button"
                                                      className={`${styles.btn} ${(isEditLocked && !canApprove) ? styles.btnDisabled : styles.btnOutline}`}
                                                      onClick={() => toggleChat(clauseItem.clause_id)}
                                                      disabled={isEditLocked && !canApprove}
                                                      title={(isEditLocked && !canApprove) ? "Evaluation locked" : "View explanation / deviation"}
                                                      id={`explanation_deviation_${clauseItem.clause_id}-clause_actions-technical_evaluation_page`}
                                                  >
                                                      <BsChatDots size={12} /> Explanation / Deviation
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
                                                token=''
                                            />
                                        }
                                    </React.Fragment>)
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
        }} centered className={styles.scoreModal}>
          <div className={styles.scoreModalAccent} />
          <div className={styles.scoreModalHeader}>
            <div className={styles.scoreModalIcon}>
              <BsPencilSquare size={18} />
            </div>
            <h5 className={styles.scoreModalTitle}>
              {selectedClauseForRemark?.clause_type === 'sampling' ? 'Add Remark and Score' : 'Add Score'}
            </h5>
          </div>

          {/* Context strip */}
          {selectedClauseForRemark && selectedVendorForRemark && (
            <div className={styles.scoreModalContext}>
              <div className={styles.scoreModalContextItem}>
                <span className={styles.scoreModalContextLabel}>Clause:</span>
                <span>{selectedClauseForRemark.clause_text?.length > 80 ? selectedClauseForRemark.clause_text.substring(0, 80) + '...' : selectedClauseForRemark.clause_text}</span>
              </div>
              <div className={styles.scoreModalContextItem}>
                <span className={styles.scoreModalContextLabel}>Vendor:</span>
                <span>{selectedVendorForRemark.rfq_product_vendor_id ? `VEN-${selectedVendorForRemark.rfq_product_vendor_id}` : `Vendor ${selectedVendorForRemark.vendor_id || selectedVendorForRemark.value}`}</span>
              </div>
              <div className={styles.scoreModalContextItem}>
                <span className={styles.scoreModalContextLabel}>Weightage:</span>
                <span>{selectedClauseForRemark.weightage || 0}</span>
              </div>
            </div>
          )}

          <Modal.Body className={styles.scoreModalBody}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Give Score</label>

              <div className="d-flex align-items-center gap-2">
                <Form.Control
                  type="text"
                  placeholder="0"
                  value={buyerMarks}
                  disabled={savingScore}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setBuyerMarks(value);
                    }
                  }}
                  className={buyerMarks && parseInt(buyerMarks) > (selectedClauseForRemark?.weightage || 0)
                    ? 'border-danger'
                    : ''}
                  style={{ width: '80px' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !savingScore) {
                      e.preventDefault();
                      handleSaveBuyerMarks();
                    }
                  }}
                />
                <span className="fw-semibold text-muted" style={{ fontSize: '16px' }}>/ {selectedClauseForRemark?.weightage || 0}</span>
              </div>
              {buyerMarks && parseInt(buyerMarks) > (selectedClauseForRemark?.weightage || 0) && (
                <small className="text-danger">
                  Marks ({buyerMarks}) cannot exceed weightage ({selectedClauseForRemark?.weightage || 0})
                </small>
              )}
            </div>
            {selectedClauseForRemark?.clause_type === 'sampling' && (
              <div className="mb-3">
                <label className="form-label fw-semibold">Add Remark</label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter remark"
                  value={buyerRemark}
                  disabled={savingScore}
                  onChange={(e) => setBuyerRemark(e.target.value)}
                />
              </div>
            )}
          </Modal.Body>
          <div className={styles.scoreModalFooter}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
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
              className={`${styles.btn} ${(!canWrite || permissionsLoading || isBidEndNotPassed) ? styles.btnDisabled : styles.btnPrimary}`}
              onClick={handleSaveBuyerMarks}
              disabled={savingScore || !canWrite || permissionsLoading || isBidEndNotPassed}
              title={
                isBidEndNotPassed
                  ? "Technical evaluation edits are locked until the bid submission deadline"
                  : (!canWrite ? "You don't have permission to save marks" : "")
              }
            >
              {savingScore && <span className="spinner-border spinner-border-sm me-1" role="status" />}
              {savingScore ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>

        {/* Fully Approved Banner - shown when workflow is complete AND vendors actually passed */}
        {workflowComplete && !(blockedInsufficientVendors && totalPassedVerified === 0) && (
          <div className={styles.approvedBanner}>
            <div className={styles.approvedBannerIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className={styles.approvedBannerContent}>
              <div className={styles.approvedBannerTitle}>
                Technical Evaluation Fully Approved
              </div>
              <div className={styles.approvedBannerSubtitle}>
                {totalPassedVerified} of {requiredPassedVendors} required vendors have been verified and approved across {currentRound} {currentRound === 1 ? 'round' : 'rounds'}.
              </div>
            </div>
            <div className={styles.approvedBannerBadge}>
              COMPLETED
            </div>
          </div>
        )}

        {/* Tech Stuck Banner - all vendors failed, no replacements available */}
        {blockedInsufficientVendors && totalPassedVerified === 0 && (
          <div className={styles.approvedBanner} style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            borderColor: '#fca5a5',
          }}>
            <div className={styles.approvedBannerIcon} style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className={styles.approvedBannerContent}>
              <div className={styles.approvedBannerTitle} style={{ color: '#991b1b' }}>
                All Eligible Vendors Failed Technical Evaluation
              </div>
              <div className={styles.approvedBannerSubtitle} style={{ color: '#b91c1c' }}>
                0 of {requiredPassedVendors} required vendors passed across {currentRound} {currentRound === 1 ? 'round' : 'rounds'}. Extend the bid submission deadline and refresh vendors to proceed.
              </div>
            </div>
            <div className={styles.approvedBannerBadge} style={{
              background: 'rgba(220, 38, 38, 0.12)',
              color: '#991b1b',
              borderColor: '#fca5a5',
            }}>
              STUCK
            </div>
          </div>
        )}

        {/* Submit for Approval Button - Moved to main index.js for unified approval */}

        {/* Approval Workflow Section - per product, bound to pending round id */}
        {approvalEntityId && (
          <div className="mb-3 mt-2">
            <ApprovalWorkflowSection
              entityType="TECHNICAL"
              entityId={approvalEntityId}
              allEntityIds={allRoundEntityIds}
              entityLabel={`Technical Evaluation (Round ${pendingRound?.round || pendingRound?.round_number || latestRound?.round || latestRound?.round_number || currentRound})`}
              onCustomApprove={handleTechEvalApprove}
              onCustomReject={handleTechEvalReject}
              refreshTrigger={approvalRefreshKey}
              onActionComplete={async () => {
                await refetchWorkflow();
                setApprovalRefreshKey((prev) => prev + 1);
                if (refetch) refetch();
              }}
            />
          </div>
        )}

        {/* Submit for Approval Confirmation Modal - Moved to main index.js */}

        {/* Vendor Deviation Modal - NEW: Vendor-specific chat */}
        <VendorDeviationModal
          show={showDeviationModal}
          onHide={closeDeviationModal}
          vendor={selectedDeviationVendor}
          clause={selectedDeviationClause}
          userData={currentUserProfile}
          product={product}
          rfq_no={currentRfq}
        />

      </div>
    );
}

export default ClauseProductItem
