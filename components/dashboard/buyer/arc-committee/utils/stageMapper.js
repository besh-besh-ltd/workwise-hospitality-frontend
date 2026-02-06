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
 * Get ALL events for a stage from lifecycle history (for full history display)
 * Returns events in chronological order
 */
const getAllStageEvents = (stageKey, lifecycleHistory) => {
  const stageDef = STAGE_DEFINITIONS.find(s => s.key === stageKey);
  if (!stageDef) return [];

  return lifecycleHistory.filter(h => matchesStageOrAction(h, stageDef));
};

/**
 * Get ALL events related to a stage including SENT_TO events targeting it
 * This gives the full picture: approvals, rejections, send-backs TO this stage
 */
const getFullStageHistory = (stageKey, lifecycleHistory) => {
  const directEvents = getAllStageEvents(stageKey, lifecycleHistory);

  // Also find SENT_TO events that target this stage
  const sentToEvents = lifecycleHistory.filter(h => {
    if (!h.stage?.startsWith('SENT_TO_')) return false;
    const targetStage = h.stage.replace('SENT_TO_', '');
    return mapStageNameToKey(targetStage) === stageKey;
  }).map(e => ({ ...e, _isSentBackTo: true }));

  // Also find SENT_TO events FROM this stage (ARC sending back)
  const sentFromEvents = stageKey === 'ARC_REVIEW' ? lifecycleHistory.filter(h =>
    h.stage?.startsWith('SENT_TO_') && h.action === 'SEND_TO'
  ).map(e => ({ ...e, _isSentBackFrom: true })) : [];

  // Merge and sort chronologically
  const allEvents = [...directEvents, ...sentToEvents, ...sentFromEvents];
  allEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Deduplicate by id
  const seen = new Set();
  return allEvents.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
};

/**
 * Get all revert events from lifecycle history
 * Returns array of { targetStage, timestamp, actor, remarks, fromStage }
 */
const getAllRevertEvents = (lifecycleData) => {
  const history = lifecycleData?.lifecycleHistory || [];

  // Look for all SENT_TO_* events
  const sentToEvents = history.filter(h => h.stage?.startsWith('SENT_TO_'));

  return sentToEvents.map(event => {
    const targetStage = event.stage.replace('SENT_TO_', '');
    return {
      targetStage,
      targetStageKey: mapStageNameToKey(targetStage),
      timestamp: event.created_at,
      actor: event.performed_by_name,
      remarks: event.remarks,
      fromStage: 'ARC_REVIEW', // For now, all reverts come from ARC
      metadata: event.metadata
    };
  });
};

/**
 * Map stage name to stage key
 */
const mapStageNameToKey = (stageName) => {
  const mapping = {
    'TECH_EVAL': 'TECH_EVAL',
    'TECHNICAL': 'TECH_EVAL',
    'TECHNICAL_EVALUATION': 'TECH_EVAL',
    'NEGOTIATION': 'NEGOTIATION',
    'QUOTES_RECEIVED': 'QUOTES_RECEIVED',
    'QUOTE_FINALIZED': 'QUOTE_FINALIZED',
    'PUBLISHED': 'PUBLISHED',
    'AUTHORITY_APPROVAL': 'AUTHORITY_APPROVAL'
  };
  return mapping[stageName] || stageName;
};

/**
 * Check if ARC was sent back to a specific stage (latest revert)
 */
const getArcSentBackStage = (lifecycleData) => {
  const revertEvents = getAllRevertEvents(lifecycleData);
  if (revertEvents.length > 0) {
    return revertEvents[revertEvents.length - 1].targetStage;
  }
  return null;
};

/**
 * Determine the current stage based on lifecycle data
 */
const getCurrentStage = (lifecycleData) => {
  const history = lifecycleData?.lifecycleHistory || [];

  // Check ARC status first (most advanced stage)
  if (lifecycleData?.arcApproval?.instances?.length > 0) {
    const hasPending = lifecycleData.arcApproval.instances.some(i => i.status === 'PENDING');
    // Only check non-cancelled instances for completion - cancelled ones are from previous rounds
    const activeInstances = lifecycleData.arcApproval.instances.filter(i => i.status !== 'CANCELLED');
    const allApproved = activeInstances.length > 0 && activeInstances.every(i => i.status === 'APPROVED');

    if (hasPending) return 'ARC_REVIEW';
    if (allApproved) return 'COMPLETED';

    // If only cancelled instances remain (sent back, no new ARC yet),
    // fall through to normal stage detection to track redo progress
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

    // Get full event history for this stage
    const stageHistory = getFullStageHistory(stageDef.key, history);

    // Build stage object
    const stage = {
      key: stageDef.key,
      label: stageDef.label,
      shortLabel: stageDef.shortLabel,
      // COMPLETED is a terminal state - never mark it as 'active'
      status: (isCurrent && stageDef.key !== 'COMPLETED') ? 'active' : (isCurrent && stageDef.key === 'COMPLETED') ? 'completed' : status,
      hasApproval: stageDef.hasApproval,
      approvalType: stageDef.approvalType,
      timestamp: event?.created_at || null,
      actor: event?.performed_by_name || null,
      remarks: event?.remarks || null,
      history: stageHistory,
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

      case 'ARC_REVIEW': {
        const arcInstances = lifecycleData.arcApproval?.instances || [];
        const hasCancelledArc = arcInstances.some(i => i.status === 'CANCELLED');
        const hasActiveArc = arcInstances.some(i => i.status === 'PENDING' || i.status === 'APPROVED');
        const sentBackStage = getArcSentBackStage(lifecycleData);

        // Only mark as reverted if sent back AND no new active instance exists
        if (hasCancelledArc && sentBackStage && !hasActiveArc) {
          stage.status = 'reverted';
          stage.revertedTo = sentBackStage;
          const sentToEvent = history.find(h => h.stage === `SENT_TO_${sentBackStage}`);
          if (sentToEvent) {
            stage.timestamp = sentToEvent.created_at;
            stage.actor = sentToEvent.performed_by_name;
            stage.remarks = sentToEvent.remarks;
          }
        }

        stage.details = {
          instances: arcInstances,
          products: rfq.products || [],
          sentBackTo: sentBackStage
        };
        break;
      }

      case 'COMPLETED': {
        const arcInstances = lifecycleData.arcApproval?.instances || [];
        const approvedInstances = arcInstances.filter(i => i.status === 'APPROVED');
        // Use the latest ARC approval timestamp as completion time if no direct event
        const lastApproval = approvedInstances.length > 0
          ? approvedInstances.reduce((latest, inst) => {
              const instDate = new Date(inst.updated_at || inst.created_at);
              return instDate > latest ? instDate : latest;
            }, new Date(0))
          : null;
        const completedAt = event?.created_at || (lastApproval ? lastApproval.toISOString() : null);

        // Populate timestamp/actor on the stage itself so timeline header shows them
        if (!stage.timestamp && completedAt) {
          stage.timestamp = completedAt;
        }
        if (!stage.actor && approvedInstances.length > 0) {
          const lastInst = approvedInstances[approvedInstances.length - 1];
          stage.actor = lastInst.performed_by_name || 'ARC Committee';
        }

        stage.details = {
          completedAt,
          products: rfq.products || [],
          arcInstances: approvedInstances,
          revertHistory: getAllRevertEvents(lifecycleData),
          rfqNo: rfq.rfq_no,
          projectName: rfq.project_name,
          companyName: rfq.company_name
        };
        break;
      }
    }

    return stage;
  });

  // Get all revert events for display
  const revertHistory = getAllRevertEvents(lifecycleData);

  // Mark stages that need to show revert indicator
  // Only mark as needsRedo if the redo is still in progress (not yet back to ARC or completed)
  if (revertHistory.length > 0) {
    const latestRevert = revertHistory[revertHistory.length - 1];
    const targetStageIndex = STAGE_DEFINITIONS.findIndex(s => s.key === latestRevert.targetStageKey);
    const arcStageIndex = STAGE_DEFINITIONS.findIndex(s => s.key === 'ARC_REVIEW');

    // Check if there's a new ARC instance after the last send-back (redo cycle complete)
    const arcInstances = lifecycleData.arcApproval?.instances || [];
    const lastSentBackAt = latestRevert.timestamp ? new Date(latestRevert.timestamp) : new Date(0);
    const hasNewArcAfterSendback = arcInstances.some(i => {
      if (i.status === 'CANCELLED') return false;
      const instDate = new Date(i.created_at);
      return instDate > lastSentBackAt;
    });

    // Only show needsRedo if redo is still in progress (no new ARC instance yet)
    if (!hasNewArcAfterSendback && currentStageKey !== 'COMPLETED') {
      const iterationNumber = revertHistory.length + 1;
      stages.forEach((stage, idx) => {
        if (idx >= targetStageIndex && idx < arcStageIndex) {
          stage.needsRedo = true;
          stage.revertedFrom = latestRevert;
          stage.redoIteration = iterationNumber;
        }
      });
    }
  }

  return {
    stages,
    currentStage: currentStageKey,
    rfq,
    revertHistory
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
