/**
 * Stage definitions for the tender lifecycle
 * Note: CREATED stage removed - SUBMITTED represents tender creation + submission
 */
export const STAGE_DEFINITIONS = [
  {
    key: 'AUTHORITY_APPROVAL',
    label: 'Submitted for Approval',
    shortLabel: 'Submitted',
    hasApproval: true,
    approvalType: 'TENDER',
    matchStages: ['SUBMITTED', 'AUTHORITY_APPROVAL', 'APPROVED'],
    matchActions: ['SUBMITTED', 'SUBMIT', 'AUTHORITY_APPROVAL', 'APPROVE']
  },
  {
    key: 'PUBLISHED',
    label: 'Published',
    shortLabel: 'Published',
    hasApproval: false,
    approvalType: null,
    matchStages: ['PUBLISHED'],
    matchActions: ['PUBLISHED', 'PUBLISH']
  },
  {
    key: 'QUOTES_RECEIVED',
    label: 'Quotes Received',
    shortLabel: 'Quotes',
    hasApproval: false,
    approvalType: null,
    matchStages: ['QUOTES_RECEIVED'],
    matchActions: ['QUOTES_RECEIVED', 'QUOTE_RECEIVED'],
    // Note: This stage uses fallback inference from quotes[] array if no lifecycle record
    inferFromData: true
  },
  {
    key: 'TECH_EVAL',
    label: 'Technical Evaluation',
    shortLabel: 'Tech Eval',
    hasApproval: true,
    approvalType: 'TECHNICAL',
    matchStages: ['TECH_EVAL', 'TECH_EVAL_STARTED', 'TECH_EVAL_COMPLETED'],
    matchActions: ['TECH_EVAL_STARTED', 'TECH_EVAL_COMPLETED', 'TECH_EVAL'],
    // Note: This stage uses fallback inference from techEvaluation[] array if no lifecycle record
    inferFromData: true
  },
  {
    key: 'NEGOTIATION',
    label: 'Negotiation Rounds',
    shortLabel: 'Negotiation',
    hasApproval: true,
    approvalType: 'NEGOTIATION',
    // Match all negotiation-related stages including dynamic round numbers
    matchStages: ['NEGOTIATION', 'NEGOTIATION_STARTED', 'NEGOTIATION_ROUND_1', 'NEGOTIATION_ROUND_2', 'NEGOTIATION_ROUND_3'],
    matchActions: ['NEGOTIATION_STARTED', 'CREATE_ROUND', 'ROUND_PUBLISHED', 'NEGOTIATION']
  },
  {
    key: 'QUOTE_FINALIZED',
    label: 'Quote Finalization',
    shortLabel: 'Finalized',
    hasApproval: true,
    approvalType: 'NEGOTIATION_QUOTE',
    matchStages: ['VENDOR_FINALIZED', 'QUOTE_FINALIZED', 'NEGOTIATION_QUOTES_SUBMITTED', 'NEGOTIATION_QUOTES_APPROVED'],
    matchActions: ['VENDOR_FINALIZED', 'QUOTE_FINALIZED', 'FINANCE_APPROVED', 'SUBMIT_FOR_APPROVAL', 'NEGOTIATION_QUOTES_APPROVED']
  },
  {
    key: 'ARC_REVIEW',
    label: 'ARC Committee Review',
    shortLabel: 'ARC Review',
    hasApproval: true,
    approvalType: 'ARC',
    matchStages: ['ARC_REVIEW', 'ARC_SUBMITTED', 'ARC_DOCUMENT_GENERATED', 'ARC_APPROVED', 'ARC_REJECTED'],
    matchActions: ['ARC_REVIEW', 'SUBMIT_ARC', 'GENERATE_DOCUMENT', 'ARC_DOCUMENT_GENERATED', 'ARC_APPROVED', 'ARC_REJECTED', 'APPROVE']
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    shortLabel: 'Completed',
    hasApproval: false,
    approvalType: null,
    matchStages: ['COMPLETED'],
    matchActions: ['COMPLETED']
  }
];

/**
 * Check if a stage/action matches definition (supports dynamic patterns like NEGOTIATION_ROUND_*)
 */
const matchesStageOrAction = (historyItem, stageDef) => {
  const { stage, action } = historyItem;

  // Direct match for stages
  if (stage && stageDef.matchStages.includes(stage)) return true;

  // Direct match for actions
  if (action && stageDef.matchActions.includes(action)) return true;

  // Dynamic matching for NEGOTIATION stage - match NEGOTIATION_ROUND_* pattern
  if (stageDef.key === 'NEGOTIATION') {
    if (stage && stage.startsWith('NEGOTIATION_ROUND_')) return true;
  }

  return false;
};

/**
 * Get status for a stage based on lifecycle history
 */
const getStageStatus = (stageKey, lifecycleHistory) => {
  const stageDef = STAGE_DEFINITIONS.find(s => s.key === stageKey);
  if (!stageDef) return 'pending';

  // Check if any matching stage/action exists in history
  const hasMatch = lifecycleHistory.some(h => matchesStageOrAction(h, stageDef));

  if (hasMatch) return 'completed';
  return 'pending';
};

/**
 * Get the last event for a stage from lifecycle history
 */
const getStageEvent = (stageKey, lifecycleHistory) => {
  const stageDef = STAGE_DEFINITIONS.find(s => s.key === stageKey);
  if (!stageDef) return null;

  // Find all matching events
  const events = lifecycleHistory.filter(h => matchesStageOrAction(h, stageDef));

  // Return the last one
  return events[events.length - 1] || null;
};

/**
 * Determine the current stage based on lifecycle data
 */
const getCurrentStage = (lifecycleData) => {
  const history = lifecycleData?.lifecycleHistory || [];

  // Check ARC status first (most advanced stage)
  if (lifecycleData?.arcApproval?.instances?.length > 0) {
    const hasPending = lifecycleData.arcApproval.instances.some(i => i.status === 'PENDING');
    const allApproved = lifecycleData.arcApproval.instances.every(i => i.status === 'APPROVED');

    if (hasPending) return 'ARC_REVIEW';
    if (allApproved) return 'COMPLETED';
  }

  // Check for vendor finalization
  if (lifecycleData?.vendorRankings && Object.keys(lifecycleData.vendorRankings).length > 0) {
    // Check if we have negotiation quotes approval pending
    if (lifecycleData?.negotiationQuotesApproval?.status === 'PENDING') {
      return 'QUOTE_FINALIZED';
    }
    return 'ARC_REVIEW';
  }

  // Check negotiation rounds
  if (lifecycleData?.negotiationRounds?.length > 0) {
    const activeRound = lifecycleData.negotiationRounds.find(r =>
      r.status === 'ACTIVE' || r.status === 'PENDING_APPROVAL'
    );
    if (activeRound) return 'NEGOTIATION';
    return 'QUOTE_FINALIZED';
  }

  // Check technical evaluation
  if (lifecycleData?.techEvaluation?.length > 0) {
    return 'TECH_EVAL';
  }

  // Check quotes
  if (lifecycleData?.quotes?.length > 0) {
    return 'QUOTES_RECEIVED';
  }

  // Check lifecycle history for stage markers
  const historyStages = history.map(h => h.stage || h.action);

  if (historyStages.some(s => ['PUBLISHED'].includes(s))) {
    return 'PUBLISHED';
  }

  if (historyStages.some(s => ['SUBMITTED', 'AUTHORITY_APPROVAL'].includes(s))) {
    // Check if tender approval is pending
    if (lifecycleData?.tenderApproval?.status === 'PENDING') {
      return 'AUTHORITY_APPROVAL';
    }
    return 'PUBLISHED';
  }

  // Default to first stage (AUTHORITY_APPROVAL) - CREATED stage no longer exists
  return 'AUTHORITY_APPROVAL';
};

/**
 * Map lifecycle data to stage-centric structure
 * @param {Object} lifecycleData - Raw lifecycle data from API
 * @returns {Object} Mapped stage data with current stage and stage details
 */
export const mapLifecycleToStages = (lifecycleData) => {
  if (!lifecycleData) return { stages: [], currentStage: null };

  const history = lifecycleData.lifecycleHistory || [];
  const rfq = lifecycleData.rfq || {};
  const currentStageKey = getCurrentStage(lifecycleData);

  // Get the index of current stage to determine which stages are "completed" by position
  const currentStageIndex = STAGE_DEFINITIONS.findIndex(s => s.key === currentStageKey);

  const stages = STAGE_DEFINITIONS.map((stageDef, stageIndex) => {
    let status = getStageStatus(stageDef.key, history);
    const event = getStageEvent(stageDef.key, history);
    const isCurrent = stageDef.key === currentStageKey;

    // Build stage object
    const stage = {
      key: stageDef.key,
      label: stageDef.label,
      shortLabel: stageDef.shortLabel,
      status: isCurrent ? 'active' : status,
      hasApproval: stageDef.hasApproval,
      approvalType: stageDef.approvalType,
      timestamp: event?.created_at || null,
      actor: event?.performed_by_name || null,
      remarks: event?.remarks || null,
      details: {}
    };

    // Fallback logic for stages that can be inferred from data arrays
    // QUOTES_RECEIVED - infer from quotes[] array if no lifecycle record
    if (stageDef.key === 'QUOTES_RECEIVED' && !event && status === 'pending') {
      const quotes = lifecycleData.quotes || [];
      if (quotes.length > 0) {
        // Has quotes, mark as completed
        stage.status = isCurrent ? 'active' : 'completed';
        // Use first quote's created_at as timestamp if available
        const firstQuote = quotes[0];
        stage.timestamp = firstQuote?.created_at || firstQuote?.timestamp || null;
        stage.actor = firstQuote?.vendor_name || `${quotes.length} vendor(s)`;
      }
    }

    // TECH_EVAL - infer from techEvaluation[] array if no lifecycle record
    if (stageDef.key === 'TECH_EVAL' && !event && status === 'pending') {
      const techEval = lifecycleData.techEvaluation || [];
      if (techEval.length > 0) {
        // Has tech evaluations, mark as completed
        stage.status = isCurrent ? 'active' : 'completed';
        // Use first evaluation's timestamp if available
        const firstEval = techEval[0];
        stage.timestamp = firstEval?.created_at || firstEval?.timestamp || null;
      }
    }

    // Position-based fallback: if current stage is beyond this stage, mark as completed
    // This handles test data with out-of-order timestamps
    if (status === 'pending' && !isCurrent && stageIndex < currentStageIndex) {
      stage.status = 'completed';
    }

    // Add stage-specific details
    switch (stageDef.key) {
      case 'AUTHORITY_APPROVAL':
        stage.details = {
          entityId: rfq.id,
          approvalData: lifecycleData.tenderApproval || null,
          // Include tender info for first stage context
          products: rfq.products || [],
          vendorCount: rfq.vendors?.length || 0,
          bidEndDate: rfq.bid_end_date,
          companyName: rfq.company_name,
          projectName: rfq.project_name
        };
        break;

      case 'PUBLISHED':
        stage.details = {
          publishDate: event?.created_at,
          bidEndDate: rfq.bid_end_date
        };
        break;

      case 'QUOTES_RECEIVED':
        stage.details = {
          quotes: lifecycleData.quotes || [],
          totalQuotes: lifecycleData.quotes?.length || 0
        };
        break;

      case 'TECH_EVAL':
        stage.details = {
          evaluations: lifecycleData.techEvaluation || [],
          approvalData: lifecycleData.techEvalApproval || null
        };
        break;

      case 'NEGOTIATION':
        stage.details = {
          rounds: lifecycleData.negotiationRounds || [],
          totalRounds: lifecycleData.negotiationRounds?.length || 0
        };
        break;

      case 'QUOTE_FINALIZED':
        stage.details = {
          rankings: lifecycleData.vendorRankings || {},
          approvalData: lifecycleData.negotiationQuotesApproval || null
        };
        break;

      case 'ARC_REVIEW':
        stage.details = {
          instances: lifecycleData.arcApproval?.instances || [],
          products: rfq.products || []
        };
        break;

      case 'COMPLETED':
        stage.details = {
          completedAt: event?.created_at
        };
        break;
    }

    return stage;
  });

  return {
    stages,
    currentStage: currentStageKey,
    rfq
  };
};

/**
 * Get stage index by key
 */
export const getStageIndex = (stageKey) => {
  return STAGE_DEFINITIONS.findIndex(s => s.key === stageKey);
};

/**
 * Get stage definition by key
 */
export const getStageDefinition = (stageKey) => {
  return STAGE_DEFINITIONS.find(s => s.key === stageKey);
};

export default {
  STAGE_DEFINITIONS,
  mapLifecycleToStages,
  getStageIndex,
  getStageDefinition
};
