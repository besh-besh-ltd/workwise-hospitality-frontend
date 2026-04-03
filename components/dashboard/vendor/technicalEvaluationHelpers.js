const STATUS_CONFIG = {
  PENDING_VENDOR_RESPONSE: {
    label: "Technical Evaluation Pending",
    shortLabel: "Pending Response",
    tone: {
      color: "#475569",
      background: "#f8fafc",
      border: "#cbd5e1",
      accent: "#64748b"
    }
  },
  TECHNICAL_EVALUATION_PENDING: {
    label: "Technical Evaluation Pending",
    shortLabel: "Evaluation Pending",
    tone: {
      color: "#854d0e",
      background: "#fefce8",
      border: "#fde68a",
      accent: "#eab308"
    }
  },
  TECHNICAL_APPROVAL_PENDING: {
    label: "Technical Approval Pending",
    shortLabel: "Approval Pending",
    tone: {
      color: "#7c2d12",
      background: "#fff7ed",
      border: "#fdba74",
      accent: "#f97316"
    }
  },
  RE_EVALUATION_REQUIRED: {
    label: "Re-evaluation Required",
    shortLabel: "Re-evaluation",
    tone: {
      color: "#991b1b",
      background: "#fef2f2",
      border: "#fecaca",
      accent: "#ef4444"
    }
  },
  COMPLETED: {
    label: "Completed",
    shortLabel: "Completed",
    tone: {
      color: "#166534",
      background: "#f0fdf4",
      border: "#bbf7d0",
      accent: "#22c55e"
    }
  },
  NO_TE: {
    label: "Not Applicable",
    shortLabel: "N/A",
    tone: {
      color: "#475569",
      background: "#f8fafc",
      border: "#e2e8f0",
      accent: "#94a3b8"
    }
  }
};

const VENDOR_GROUP_CONFIG = {
  TECHNICAL_APPROVAL_PENDING: {
    label: "Technical Approval Pending",
    description: "Submitted in the current round and waiting for approver action."
  },
  TECHNICAL_EVALUATION_PENDING: {
    label: "Technical Evaluation Pending",
    description: "Vendor response is available and waiting for buyer-side evaluation."
  },
  PENDING_VENDOR_RESPONSE: {
    label: "Pending Vendor Response",
    description: "Vendor has not completed the technical response yet."
  },
  TECHNICALLY_CLEARED: {
    label: "Technically Cleared",
    description: "Vendor has cleared technical evaluation."
  },
  TECHNICALLY_REJECTED: {
    label: "Technically Rejected",
    description: "Vendor did not clear technical evaluation."
  },
  REPLACED_IN_LATER_ROUND: {
    label: "Replaced In Later Round",
    description: "Vendor was rejected in an earlier round and replaced."
  }
};

const normaliseSelectedVendor = (vendor) => {
  if (!vendor) return null;

  const vendorId = vendor.vendor_id ?? vendor.user_id ?? null;
  if (!vendorId) return null;

  return {
    vendor_id: vendorId,
    vendor_name: vendor.vendor_name ?? vendor?.user_details?.name ?? null,
    vendor_email: vendor.vendor_email ?? vendor?.user_details?.email ?? null,
    company_name:
      vendor.company_name ??
      vendor?.user_details?.company_name ??
      vendor?.user_details?.organization_name ??
      null,
    rfq_product_vendor_id: vendor.rfq_product_vendor_id ?? vendor.id ?? null
  };
};

const dedupeVendors = (vendors = []) => {
  const seen = new Map();

  vendors.forEach((vendor) => {
    const normalised = normaliseSelectedVendor(vendor);
    if (!normalised?.vendor_id || seen.has(normalised.vendor_id)) return;
    seen.set(normalised.vendor_id, normalised);
  });

  return Array.from(seen.values());
};

const buildVendorLookup = (vendors = []) => {
  const lookup = new Map();
  vendors.forEach((vendor) => {
    if (vendor?.vendor_id) {
      lookup.set(vendor.vendor_id, vendor);
    }
  });
  return lookup;
};

const getLatestRound = (rounds = []) =>
  Array.isArray(rounds) && rounds.length > 0 ? rounds[rounds.length - 1] : null;

const vendorMetaSuffix = (vendor) => {
  if (vendor?.calculated_score !== undefined && vendor?.calculated_score !== null) {
    return `${vendor.calculated_score}%`;
  }

  if (vendor?.reject_message) {
    return vendor.reject_message;
  }

  if (vendor?.replaced_by_rfq_product_vendor_id) {
    return `Replaced by ${formatVendorCode({
      rfq_product_vendor_id: vendor.replaced_by_rfq_product_vendor_id
    })}`;
  }

  return null;
};

export const formatVendorCode = (vendor) => {
  if (vendor?.rfq_product_vendor_id) {
    return `VEN-${vendor.rfq_product_vendor_id}`;
  }

  if (vendor?.vendor_id) {
    return `VEN-${vendor.vendor_id}`;
  }

  return "Vendor";
};

export const getBuyerTechEvalStatusConfig = (stateKey) =>
  STATUS_CONFIG[stateKey] || STATUS_CONFIG.TECHNICAL_EVALUATION_PENDING;

export const buildBuyerTechEvalProductSummary = (product, techEvalData) => {
  const hasTechEval =
    product?.tech_evaluation_status?.has_tech_eval === true || !!techEvalData?.tech_evaluation_id;

  if (!hasTechEval) {
    return {
      productId: product?.id,
      productName: product?.product_details?.[0]?.name || "Product",
      stateKey: "NO_TE",
      statusConfig: STATUS_CONFIG.NO_TE,
      vendorGroups: [],
      selectedVendorCount: 0,
      passedCount: 0,
      failedCount: 0,
      pendingEvaluationCount: 0,
      pendingVendorResponseCount: 0,
      approvalPendingCount: 0,
      vendorsNeeded: 0,
      currentRound: 0,
      latestApprovalStatus: null,
      summaryText: "Technical evaluation is not configured for this product.",
      helperText: "No technical evaluation workflow is required."
    };
  }

  const selectedVendors = dedupeVendors([
    ...(techEvalData?.vendors?.selected || []),
    ...(product?.vendor_details || [])
  ]);
  const selectedLookup = buildVendorLookup(selectedVendors);

  const passedVendors = dedupeVendors(techEvalData?.vendors?.passed_verified || []);
  const failedVendors = dedupeVendors(techEvalData?.vendors?.failed_verified || []);
  const pendingEvaluationVendors = dedupeVendors(techEvalData?.vendors?.pending_evaluation || []);

  const passedLookup = buildVendorLookup(passedVendors);
  const failedLookup = buildVendorLookup(failedVendors);
  const pendingEvaluationLookup = buildVendorLookup(pendingEvaluationVendors);

  const currentRound = techEvalData?.current_round || 1;
  const latestRound = getLatestRound(techEvalData?.rounds || []);
  const latestApprovalStatus = latestRound?.approval_status || null;
  const isComplete = techEvalData?.is_complete === true;
  const vendorsNeeded = techEvalData?.summary?.vendors_needed ?? 0;
  const currentPendingApprovers = (techEvalData?.current_pending_approvers || [])
    .map((approver) => approver?.user_name)
    .filter(Boolean);
  const evaluatorNames = (product?.technical_evaluators || [])
    .map((user) => user?.name)
    .filter(Boolean);

  const vendorGroups = {
    TECHNICAL_APPROVAL_PENDING: [],
    TECHNICAL_EVALUATION_PENDING: [],
    PENDING_VENDOR_RESPONSE: [],
    TECHNICALLY_CLEARED: [],
    TECHNICALLY_REJECTED: [],
    REPLACED_IN_LATER_ROUND: []
  };

  selectedVendors.forEach((selectedVendor) => {
    const vendorId = selectedVendor.vendor_id;
    const passedVendor = passedLookup.get(vendorId);
    const failedVendor = failedLookup.get(vendorId);
    const pendingVendor = pendingEvaluationLookup.get(vendorId);

    let bucket = "PENDING_VENDOR_RESPONSE";
    let bucketSource = selectedVendor;

    if (passedVendor) {
      bucket = "TECHNICALLY_CLEARED";
      bucketSource = { ...selectedVendor, ...passedVendor };
    } else if (failedVendor?.replaced_by_vendor_id || failedVendor?.replaced_by_rfq_product_vendor_id) {
      bucket = "REPLACED_IN_LATER_ROUND";
      bucketSource = { ...selectedVendor, ...failedVendor };
    } else if (failedVendor) {
      bucket = "TECHNICALLY_REJECTED";
      bucketSource = { ...selectedVendor, ...failedVendor };
    } else if (pendingVendor && latestApprovalStatus === "PENDING") {
      bucket = "TECHNICAL_APPROVAL_PENDING";
      bucketSource = { ...selectedVendor, ...pendingVendor };
    } else if (pendingVendor) {
      bucket = "TECHNICAL_EVALUATION_PENDING";
      bucketSource = { ...selectedVendor, ...pendingVendor };
    }

    vendorGroups[bucket].push({
      ...bucketSource,
      displayCode: formatVendorCode(bucketSource),
      meta: vendorMetaSuffix(bucketSource)
    });
  });

  const unmatchedPendingVendors = pendingEvaluationVendors.filter(
    (vendor) => !selectedLookup.has(vendor.vendor_id)
  );

  unmatchedPendingVendors.forEach((vendor) => {
    const bucket = latestApprovalStatus === "PENDING"
      ? "TECHNICAL_APPROVAL_PENDING"
      : "TECHNICAL_EVALUATION_PENDING";

    vendorGroups[bucket].push({
      ...vendor,
      displayCode: formatVendorCode(vendor),
      meta: vendorMetaSuffix(vendor)
    });
  });

  const pendingVendorResponseCount = vendorGroups.PENDING_VENDOR_RESPONSE.length;
  const pendingEvaluationCount = vendorGroups.TECHNICAL_EVALUATION_PENDING.length;
  const approvalPendingCount = vendorGroups.TECHNICAL_APPROVAL_PENDING.length;
  const passedCount = vendorGroups.TECHNICALLY_CLEARED.length;
  const failedCount =
    vendorGroups.TECHNICALLY_REJECTED.length + vendorGroups.REPLACED_IN_LATER_ROUND.length;

  // Build lookup of vendors who have submitted a quote (from backend has_submitted_quote flag)
  const quotedVendorIds = new Set(
    (techEvalData?.vendors?.selected || [])
      .filter((v) => v.has_submitted_quote)
      .map((v) => v.vendor_id)
  );

  // Count vendors who have BOTH submitted tech eval AND sent a quote
  const teAndQuoteVendorCount = Object.values(vendorGroups)
    .flat()
    .filter((v) => v.vendor_id && v.vendor_id !== undefined)
    .filter((v) => quotedVendorIds.has(v.vendor_id))
    .filter((v) => {
      // Exclude vendors still in pending vendor response bucket (haven't submitted TE yet)
      return !vendorGroups.PENDING_VENDOR_RESPONSE.some((pv) => pv.vendor_id === v.vendor_id);
    }).length;

  let stateKey = "TECHNICAL_EVALUATION_PENDING";
  let summaryText = `${passedCount} cleared, ${failedCount} rejected, ${vendorsNeeded} more needed.`;
  let helperText = `Round ${currentRound} is in progress.`;
  let compactLine = `${passedCount}/${selectedVendors.length || 0} passed`;
  let compactDetail = `Round ${currentRound}`;
  const evaluatedCount = passedCount + failedCount + pendingEvaluationCount + approvalPendingCount;
  let followUpNames = [];
  let followUpLabel = null;

  if (latestApprovalStatus === "REJECTED") {
    stateKey = "RE_EVALUATION_REQUIRED";
    summaryText = "The latest technical approval was rejected. Re-evaluation is required.";
    helperText = `Round ${currentRound} was sent back by the approver.`;
    compactLine = `${evaluatedCount}/${selectedVendors.length || 0} evaluated`;
    compactDetail = "Sent back for re-evaluation";
    followUpNames = evaluatorNames;
    followUpLabel = evaluatorNames.length > 0 ? "Evaluation pending by" : null;
  } else if (isComplete || (vendorsNeeded === 0 && passedCount > 0)) {
    stateKey = "COMPLETED";
    summaryText = `${passedCount} vendor${passedCount === 1 ? "" : "s"} technically cleared.`;
    helperText = "Technical evaluation and approval are complete.";
    compactLine = `${evaluatedCount}/${selectedVendors.length || 0} evaluated`;
    compactDetail = `${passedCount} passed${failedCount > 0 ? ` • ${failedCount} failed` : ""}`;
  } else if (latestApprovalStatus === "PENDING") {
    stateKey = "TECHNICAL_APPROVAL_PENDING";
    summaryText = `${approvalPendingCount || pendingEvaluationCount} vendor${approvalPendingCount + pendingEvaluationCount === 1 ? "" : "s"} submitted in Round ${currentRound}.`;
    helperText = `Round ${currentRound} is awaiting approver action.`;
    compactLine = `${passedCount}/${selectedVendors.length || 0} passed`;
    compactDetail = `${approvalPendingCount || pendingEvaluationCount} approval pending`;
    followUpNames = currentPendingApprovers;
    followUpLabel = currentPendingApprovers.length > 0 ? "Approval pending by" : null;
  } else if (pendingEvaluationCount > 0) {
    stateKey = "TECHNICAL_EVALUATION_PENDING";
    summaryText = `${pendingEvaluationCount} vendor${pendingEvaluationCount === 1 ? "" : "s"} ready for technical evaluation.`;
    helperText = vendorsNeeded > 0
      ? `${vendorsNeeded} more cleared vendor${vendorsNeeded === 1 ? "" : "s"} needed to complete this product.`
      : `Round ${currentRound} evaluation is in progress.`;
    compactLine = `${passedCount}/${selectedVendors.length || 0} passed`;
    compactDetail = `${pendingEvaluationCount} under evaluation`;
    followUpNames = evaluatorNames;
    followUpLabel = evaluatorNames.length > 0 ? "Evaluation pending by" : null;
  } else if (pendingVendorResponseCount > 0) {
    stateKey = "PENDING_VENDOR_RESPONSE";
    summaryText = `${pendingVendorResponseCount} vendor${pendingVendorResponseCount === 1 ? "" : "s"} still need to respond.`;
    helperText = `Waiting for vendor submissions in Round ${currentRound}.`;
    compactLine = `${pendingVendorResponseCount}/${selectedVendors.length || 0} response pending`;
    compactDetail = passedCount > 0 ? `${passedCount} already passed` : "Waiting for vendor response";
  }

  return {
    productId: product?.id,
    productName: product?.product_details?.[0]?.name || "Product",
    stateKey,
    statusConfig: getBuyerTechEvalStatusConfig(stateKey),
    currentRound,
    latestApprovalStatus,
    latestRound,
    selectedVendorCount: selectedVendors.length,
    teAndQuoteVendorCount,
    passedCount,
    failedCount,
    pendingEvaluationCount,
    pendingVendorResponseCount,
    approvalPendingCount,
    vendorsNeeded,
    rounds: techEvalData?.rounds || [],
    vendorGroups: Object.entries(vendorGroups)
      .filter(([, vendors]) => vendors.length > 0)
      .map(([key, vendors]) => ({
        key,
        label: VENDOR_GROUP_CONFIG[key].label,
        description: VENDOR_GROUP_CONFIG[key].description,
        vendors
      })),
    summaryText,
    helperText,
    compactLine,
    compactDetail,
    evaluatedCount,
    followUpNames,
    followUpLabel
  };
};

export const buildBuyerTechEvalOverview = (products = [], techEvalStatusByProduct = {}) => {
  const teProducts = products
    .filter((product) => product?.tech_evaluation_status?.has_tech_eval)
    .map((product) => buildBuyerTechEvalProductSummary(product, techEvalStatusByProduct[product.id]))
    .filter((product) => product.stateKey !== "NO_TE");

  const counters = {
    totalProducts: teProducts.length,
    completedProducts: teProducts.filter((product) => product.stateKey === "COMPLETED").length,
    approvalPendingProducts: teProducts.filter((product) => product.stateKey === "TECHNICAL_APPROVAL_PENDING").length,
    reevaluationProducts: teProducts.filter((product) => product.stateKey === "RE_EVALUATION_REQUIRED").length,
    pendingProducts: teProducts.filter((product) =>
      product.stateKey === "PENDING_VENDOR_RESPONSE" || product.stateKey === "TECHNICAL_EVALUATION_PENDING"
    ).length,
    totalPendingVendorResponses: teProducts.reduce((sum, product) => sum + product.pendingVendorResponseCount, 0),
    totalPendingEvaluations: teProducts.reduce((sum, product) => sum + product.pendingEvaluationCount, 0),
    totalApprovalPending: teProducts.reduce((sum, product) => sum + product.approvalPendingCount, 0),
    totalCleared: teProducts.reduce((sum, product) => sum + product.passedCount, 0),
    totalRejected: teProducts.reduce((sum, product) => sum + product.failedCount, 0)
  };

  let overallStateKey = "NO_TE";

  if (teProducts.length === 0) {
    overallStateKey = "NO_TE";
  } else if (counters.reevaluationProducts > 0) {
    overallStateKey = "RE_EVALUATION_REQUIRED";
  } else if (counters.approvalPendingProducts > 0) {
    overallStateKey = "TECHNICAL_APPROVAL_PENDING";
  } else if (counters.completedProducts === teProducts.length) {
    overallStateKey = "COMPLETED";
  } else {
    overallStateKey = "TECHNICAL_EVALUATION_PENDING";
  }

  return {
    products: teProducts,
    counters,
    overallStateKey,
    overallStatusConfig: getBuyerTechEvalStatusConfig(overallStateKey)
  };
};

export const buildRfqConditionSummary = (rfqDetails, overview) => {
  const lifecycleStage = rfqDetails?.lifecycle_stage || null;
  const evaluatorNames = (rfqDetails?.technical_evaluators || [])
    .map((user) => user?.name)
    .filter(Boolean);
  const approvalNames = Array.from(new Set(
    (overview?.products || [])
      .filter((product) => product.stateKey === "TECHNICAL_APPROVAL_PENDING")
      .flatMap((product) => product.followUpNames || [])
      .filter(Boolean)
  ));
  const counters = overview?.counters || {};

  const stageMap = {
    RFQ_APPROVAL: {
      label: "RFQ Approval Ongoing",
      tone: "neutral"
    },
    TECHNICAL_EVALUATING: {
      label: "Technical Evaluation Ongoing",
      tone: "info"
    },
    TECHNICAL_APPROVING: {
      label: "Technical Approval Ongoing",
      tone: "warning"
    },
    TECHNICAL_REJECTED: {
      label: "Technical Re-evaluation Required",
      tone: "danger"
    },
    COMMERCIAL_EVALUATION: {
      label: "Commercial Evaluation Ongoing",
      tone: "primary"
    },
    NEGOTIATION_ONGOING: {
      label: "Commercial Negotiation Ongoing",
      tone: "warning"
    },
    QUOTATION_APPROVAL: {
      label: "Commercial Approval Ongoing",
      tone: "accent"
    },
    AWAITING_PO: {
      label: "Awaiting PO Initiation",
      tone: "success"
    },
    PO_APPROVAL: {
      label: "PO Approval Ongoing",
      tone: "accent"
    },
    APPROVED_COMPLETED: {
      label: "Approved & Completed",
      tone: "success"
    }
  };

  const fallbackKey = overview?.overallStateKey === "TECHNICAL_APPROVAL_PENDING"
    ? "TECHNICAL_APPROVING"
    : overview?.overallStateKey === "RE_EVALUATION_REQUIRED"
    ? "TECHNICAL_REJECTED"
    : overview?.overallStateKey === "COMPLETED"
    ? "COMMERCIAL_EVALUATION"
    : "TECHNICAL_EVALUATING";

  const stage = stageMap[lifecycleStage] || stageMap[fallbackKey];

  let blockerText = "No technical evaluation blockers.";

  if (lifecycleStage === "TECHNICAL_APPROVING") {
    blockerText = `${counters.approvalPendingProducts || 0} product${counters.approvalPendingProducts === 1 ? "" : "s"} awaiting technical approval.`;
  } else if (lifecycleStage === "TECHNICAL_REJECTED") {
    blockerText = `${counters.reevaluationProducts || 0} product${counters.reevaluationProducts === 1 ? "" : "s"} sent back for re-evaluation.`;
  } else if (lifecycleStage === "TECHNICAL_EVALUATING" || !lifecycleStage) {
    const responsePending = counters.totalPendingVendorResponses || 0;
    const evaluationPending = counters.totalPendingEvaluations || 0;

    if (responsePending > 0 && evaluationPending > 0) {
      blockerText = `${responsePending} vendor response${responsePending === 1 ? "" : "s"} pending, ${evaluationPending} vendor${evaluationPending === 1 ? "" : "s"} under evaluation.`;
    } else if (responsePending > 0) {
      blockerText = `${responsePending} vendor response${responsePending === 1 ? "" : "s"} pending.`;
    } else if (evaluationPending > 0) {
      blockerText = `${evaluationPending} vendor${evaluationPending === 1 ? "" : "s"} currently under technical evaluation.`;
    } else if ((counters.totalProducts || 0) > 0) {
      blockerText = `${counters.completedProducts || 0}/${counters.totalProducts || 0} technically evaluated product${counters.totalProducts === 1 ? "" : "s"} completed.`;
    }
  } else if (lifecycleStage === "COMMERCIAL_EVALUATION") {
    blockerText = "Technical evaluation is complete. RFQ is ready for commercial comparison.";
  } else if (lifecycleStage === "NEGOTIATION_ONGOING") {
    blockerText = "Commercial negotiation rounds are active.";
  } else if (lifecycleStage === "QUOTATION_APPROVAL") {
    blockerText = "Commercially selected quotes are awaiting approval.";
  }

  const owner = lifecycleStage === "TECHNICAL_APPROVING"
    ? approvalNames.length > 0
      ? `Approver${approvalNames.length === 1 ? "" : "s"}: ${approvalNames.join(", ")}`
      : "Awaiting technical approver action"
    : lifecycleStage === "TECHNICAL_EVALUATING" || lifecycleStage === "TECHNICAL_REJECTED"
    ? evaluatorNames.length > 0
      ? `Evaluator${evaluatorNames.length === 1 ? "" : "s"}: ${evaluatorNames.join(", ")}`
      : rfqDetails?.technical_evaluation_by_name
      ? `Evaluator: ${rfqDetails.technical_evaluation_by_name}`
      : "Evaluator not assigned"
    : null;

  return {
    ...stage,
    blockerText,
    owner
  };
};
