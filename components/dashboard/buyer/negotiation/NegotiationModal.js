import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Modal, Form, Spinner } from 'react-bootstrap';
import {
  createNegotiationRound,
  approveNegotiationRound,
  rejectNegotiationRound,
  getRoundQuotes,
  getNegotiationRounds,
  getQuoteApprovalStatus
} from '@/services/negotiation';
import { getUserDetails } from '@/services/Auth';
import { getEntityApprovalInstances, getApprovalInstanceDetails } from '@/services/approval';
import { toast } from 'react-toastify';
import moment from 'moment';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { calculateTotal } from '@/utils/sharedFunctions';
import VendorAccordionPanel from './VendorAccordionPanel';
import NegotiationFieldsSelect from './NegotiationFieldsSelect';
import NegotiationWorkflowModal from './NegotiationWorkflowModal';
import ApprovalActionModal from '../approval/ApprovalActionModal';
import ApprovalTimeline from '../approval/ApprovalTimeline';
import styles from './NegotiationUI.module.scss';

ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, ChartTooltip);

// Custom Chart.js plugin: draws price labels on top of each bar
const barLabelsPlugin = {
  id: 'barLabels',
  afterDatasetsDraw: (chart) => {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di);
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value == null) return;
        ctx.save();
        ctx.fillStyle = '#1f3d63';
        ctx.font = '700 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`₹${Number(value).toLocaleString('en-IN')}`, bar.x, bar.y - 6);
        ctx.restore();
      });
    });
  }
};

// Custom Chart.js plugin: draws a dashed target price line
const targetLinePlugin = {
  id: 'targetLine',
  afterDraw: (chart, args, pluginOptions) => {
    const { targetPrice } = pluginOptions || {};
    if (!targetPrice || targetPrice <= 0) return;
    const { ctx, chartArea, scales: { y } } = chart;
    if (!chartArea || !y) return;
    const yPos = y.getPixelForValue(targetPrice);
    if (yPos < chartArea.top || yPos > chartArea.bottom) return;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, yPos);
    ctx.lineTo(chartArea.right, yPos);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.font = '600 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Target: ₹${Number(targetPrice).toLocaleString('en-IN')}`, chartArea.right, yPos - 4);
    ctx.restore();
  }
};

const NegotiationModal = ({
  show,
  handleShow,
  onHide,
  mode,
  rfq_id,
  products = [],
  activeRounds = [],
  roundsHistory: initialRoundsHistory = [],
  onRefresh,
  canWrite = true,
  permissionsLoading = false,
  hospitalityCompanyId,
  hotelId,
  departmentId,
  preloadedApprovalBundle = null,
  preSelectedProductId = null,
}) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formData, setFormData] = useState({
    end_date: '',
    negotiation_fields: [],
    target_base_price: '',
    target_freight: '',
    target_freight_mode: 'percentage',
    target_packaging: '',
    target_packaging_mode: 'percentage',
    target_delivery_date: '',
    target_payment_terms: '',
    target_vendor_tc: '',
    target_comments: '',
  });
  // Per-vendor local targets: { [vendorId]: { base_price: '', freight: '', ... } }
  const [vendorTargets, setVendorTargets] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundQuotes, setRoundQuotes] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundsHistory, setRoundsHistory] = useState(initialRoundsHistory);
  const userProfile = useSelector((state) => state.userProfile);
  const [currentUserId, setCurrentUserId] = useState(null);
  // Workflow modal state
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedRoundForWorkflow, setSelectedRoundForWorkflow] = useState(null);
  // Approval instances fetched from hospitality approval API
  const [approvalInstances, setApprovalInstances] = useState({}); // Map of rfq_product_id -> approval instance
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  // Action modal state for approve/reject confirmation
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'APPROVE' or 'REJECT'
  const [selectedRoundForAction, setSelectedRoundForAction] = useState(null);
  // Quote approval status (for checking if quotes are already approved)
  const [quoteApprovalStatuses, setQuoteApprovalStatuses] = useState({}); // Map of productId -> approval status
  const [loadingQuoteApprovals, setLoadingQuoteApprovals] = useState(false);
  // Approval journey: all instances (including rejected) per round entity
  const [approvalJourneys, setApprovalJourneys] = useState({}); // Map of roundId -> { loading, instances[] }
  const [expandedApprovalJourney, setExpandedApprovalJourney] = useState(null); // roundId of expanded journey
  // Chart flip state for create mode product rows
  const [flippedCards, setFlippedCards] = useState({});
  const [chartTypes, setChartTypes] = useState({}); // { [productId]: 'bar' | 'line' }
  // Vendor selection for parallel rounds
  const [selectedVendors, setSelectedVendors] = useState({}); // { [productId]: [vendorId, ...] }

  const toggleCardFlip = (productId, e) => {
    e.stopPropagation();
    setFlippedCards(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  useEffect(() => {
    if (userProfile?.id) {
      setCurrentUserId(parseInt(userProfile.id));
    }
  }, [userProfile]);

  useEffect(() => {
    if (show && mode === 'create') {
      setSelectedProducts(preSelectedProductId ? [preSelectedProductId] : []);
      setFormData({
        end_date: '',
        negotiation_fields: [],
        target_base_price: '',
        target_freight: '',
        target_freight_mode: 'percentage',
        target_packaging: '',
        target_packaging_mode: 'percentage',
        target_delivery_date: '',
        target_payment_terms: '',
        target_vendor_tc: '',
        target_comments: '',
      });
      setVendorTargets({});
      setFlippedCards({});
      setSelectedVendors({});
      loadQuoteApprovalStatuses();
    }
    if (show && mode === 'view-approve' && activeRounds.length > 0) {
      const pendingRound = activeRounds.find(r => r.status === 'PENDING_APPROVAL');
      if (pendingRound) {
        setSelectedRound(pendingRound);
        loadRoundQuotes(pendingRound.id);
      }
      // Fetch approval status from hospitality approval API for accurate can_user_approve
      loadApprovalStatusForRounds(activeRounds);
    }
    if (show && mode === 'history') {
      loadHistoryData();
    }
    // Sync with prop when it changes
    if (initialRoundsHistory.length > 0) {
      setRoundsHistory(initialRoundsHistory);
    }
  }, [show, mode, activeRounds, initialRoundsHistory]);

  // Enrich PENDING_APPROVAL rounds with approval data from the hospitality approval engine
  const enrichRoundsWithApprovals = async (rounds) => {
    for (const round of rounds) {
      if (round.status !== 'PENDING_APPROVAL' || round.approvals) continue;
      try {
        const instancesRes = await getEntityApprovalInstances('NEGOTIATION', round.id);
        const instances = instancesRes?.data?.data || instancesRes?.data || instancesRes || [];
        const pendingInstance = (Array.isArray(instances) ? instances : []).find(inst => inst.status === 'PENDING');
        if (pendingInstance) {
          const detailRes = await getApprovalInstanceDetails(pendingInstance.id);
          const detail = detailRes?.data?.data || detailRes?.data || detailRes || {};
          const currentStep = (detail.steps || []).find(s => s.step_order === detail.current_step);
          if (currentStep?.approvers) {
            round.approvals = currentStep.approvers.map(a => ({
              approver_user_id: a.approver_user_id || a.user_id,
              approver_name: a.user_name,
              approver_email: a.user_email,
              status: a.status
            }));
          }
        }
      } catch (err) {
        // Skip enrichment on error
      }
    }
    return rounds;
  };

  const loadHistoryData = async () => {
    if (!rfq_id) return;

    // Use prop data if available
    if (initialRoundsHistory.length > 0) {
      const enriched = await enrichRoundsWithApprovals([...initialRoundsHistory]);
      setRoundsHistory(enriched);
      return;
    }

    // Fallback: fetch from API
    try {
      setLoading(true);
      const response = await getNegotiationRounds(rfq_id);

      let rounds = [];
      if (response) {
        if (response.status === 1 && response.data) {
          rounds = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          rounds = response;
        } else if (Array.isArray(response.data)) {
          rounds = response.data;
        }
      }

      const enriched = await enrichRoundsWithApprovals(rounds);
      setRoundsHistory(enriched);
    } catch (error) {
      console.error('Error loading history in modal:', error);
      setRoundsHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch approval status from hospitality approval API for pending rounds
  const loadApprovalStatusForRounds = async (rounds) => {
    const pendingRounds = rounds.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'pending_approval');
    if (pendingRounds.length === 0) return;

    // Use preloaded bundle if available
    // Bundle may be keyed by round.id (new) or rfq_product_id (old) — try both
    if (preloadedApprovalBundle) {
      const instances = {};
      for (const round of pendingRounds) {
        const byRoundId = preloadedApprovalBundle.negotiation_instances?.[String(round.id)] || [];
        const byProductId = preloadedApprovalBundle.negotiation_instances?.[String(round.rfq_product_id)] || [];
        const bundled = byRoundId.length > 0 ? byRoundId : byProductId;
        // Find the instance matching this specific round
        const matched = bundled.find(inst => {
          const meta = inst.metadata || {};
          return meta.round_id == null || String(meta.round_id) === String(round.id);
        });
        if (matched) {
          instances[round.id] = matched;
        }
      }
      setApprovalInstances(instances);
      return;
    }

    // Fallback: fetch from API
    setLoadingApprovals(true);
    const instances = {};

    for (const round of pendingRounds) {
      try {
        const response = await getEntityApprovalInstances('NEGOTIATION', round.id);
        const instanceList = response?.data?.data || response?.data || [];

        if (instanceList && instanceList.length > 0) {
          const detailResponse = await getApprovalInstanceDetails(instanceList[0].id);
          const detailedInstance = detailResponse?.data?.data || detailResponse?.data;
          instances[round.id] = detailedInstance;
        }
      } catch (error) {
        console.error(`Error loading approval for round ${round.id}:`, error);
      }
    }

    setApprovalInstances(instances);
    setLoadingApprovals(false);
  };

  // Load quote approval statuses to check if quotes are already approved
  const loadQuoteApprovalStatuses = async () => {
    if (!products || products.length === 0) return;

    // Use preloaded bundle if available
    if (preloadedApprovalBundle) {
      const statuses = {};
      for (const product of products) {
        const bundled = preloadedApprovalBundle.negotiation_quote_instances?.[String(product.id)];
        if (bundled && bundled.length > 0) {
          statuses[product.id] = bundled[0]; // Latest instance
        }
      }
      setQuoteApprovalStatuses(statuses);
      return;
    }

    // Fallback: fetch from API
    setLoadingQuoteApprovals(true);
    const statuses = {};

    for (const product of products) {
      try {
        const response = await getQuoteApprovalStatus(product.id);
        if (response?.status === 1 && response?.data?.approval_instance) {
          statuses[product.id] = response.data.approval_instance;
        }
      } catch (error) {
        // Product may not have any approval instance - that's OK
      }
    }

    setQuoteApprovalStatuses(statuses);
    setLoadingQuoteApprovals(false);
  };

  // Check if product quotes are approved
  const isQuoteApproved = (productId) => {
    const approvalInstance = quoteApprovalStatuses[productId];
    return approvalInstance?.status === 'APPROVED';
  };

  // Load full approval journey (all instances) for a round
  const loadApprovalJourney = async (round) => {
    const roundId = round.id;
    setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: true, instances: [] } }));

    // Filter instances to only those belonging to this specific round (by metadata.round_id)
    const filterByRound = (instances) => {
      return instances.filter(inst => {
        const meta = inst.metadata || {};
        // Match by round_id in metadata; if no round_id in metadata, include it (legacy)
        return meta.round_id == null || String(meta.round_id) === String(roundId);
      });
    };

    // Use preloaded bundle if available
    // Bundle may be keyed by round.id (new) or rfq_product_id (old) — try both
    if (preloadedApprovalBundle) {
      const byRoundId = preloadedApprovalBundle.negotiation_instances?.[String(round.id)] || [];
      const byProductId = preloadedApprovalBundle.negotiation_instances?.[String(round.rfq_product_id)] || [];
      const bundled = byRoundId.length > 0 ? byRoundId : byProductId;
      const filtered = filterByRound(bundled);
      const sorted = [...filtered].sort((a, b) => (a.id || 0) - (b.id || 0));
      setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: false, instances: sorted } }));
      return;
    }

    // Fallback: fetch from API
    try {
      const response = await getEntityApprovalInstances('NEGOTIATION', round.id);
      const instanceList = response?.data?.data || response?.data || [];
      const allInstances = Array.isArray(instanceList) ? instanceList : [];

      const detailedInstances = [];
      for (const inst of allInstances) {
        try {
          const detailRes = await getApprovalInstanceDetails(inst.id);
          const detail = detailRes?.data?.data || detailRes?.data || detailRes;
          detailedInstances.push(detail);
        } catch (err) {
          detailedInstances.push(inst);
        }
      }

      const filtered = filterByRound(detailedInstances);
      filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
      setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: false, instances: filtered } }));
    } catch (error) {
      console.error('Error loading approval journey for round:', roundId, error);
      setApprovalJourneys(prev => ({ ...prev, [roundId]: { loading: false, instances: [] } }));
    }
  };

  // Toggle approval journey expansion for a round
  const toggleApprovalJourney = (round) => {
    const roundId = round.id;
    if (expandedApprovalJourney === roundId) {
      setExpandedApprovalJourney(null);
      return;
    }
    setExpandedApprovalJourney(roundId);
    // Load if not already loaded
    if (!approvalJourneys[roundId]) {
      loadApprovalJourney(round);
    }
  };

  const loadRoundQuotes = async (roundId) => {
    try {
      setLoading(true);
      const response = await getRoundQuotes(roundId);
      if (response.status === 1) {
        setRoundQuotes(response.data || []);
      }
    } catch (error) {
      setRoundQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        setSelectedVendors(sv => { const next = { ...sv }; delete next[productId]; return next; });
        return [];
      } else {
        // Auto-select available vendors (not in round, or rejected)
        const product = products.find(p => p.id === productId);
        if (product) {
          const allVendorIds = Array.from(getVendorIdsForProduct(product));
          const activeRound = product.active_round;
          const vendorApprovals = activeRound?.vendor_approvals || [];
          const roundVendorIds = new Set((activeRound?.vendor_ids || []).map(Number));

          const availableIds = allVendorIds.filter(vid => {
            if (!roundVendorIds.has(vid)) return true;
            const approval = vendorApprovals.find(va => Number(va.vendor_id) === vid);
            return approval && approval.status === 'REJECTED';
          });
          setSelectedVendors(sv => ({ ...sv, [productId]: availableIds }));
        }
        return [productId];
      }
    });
  };

  const handleSelectAll = () => {
    const availableProducts = products.filter(p => !getProductRoundStatus(p.id).isDisabled);
    if (selectedProducts.length === availableProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(availableProducts.map(p => p.id));
    }
  };

  // Safely get vendor details from a quotation (supports both legacy and normalized shapes)
  const getVendorDetailsFromQuote = (q) => {
    const vdRaw =
      q.vendor_details ||
      (q.quote_details && q.quote_details.vendor_details);
    if (!vdRaw) return null;
    return Array.isArray(vdRaw) ? vdRaw[0] : vdRaw;
  };

  // Check if a quotation is marked as regret (supports both legacy and normalized shapes)
  const isQuoteRegretted = (q) => {
    const topLevelRegret = q.is_regret;
    const nestedRegret = q.quote_details && q.quote_details.is_regret;
    return topLevelRegret == 1 || nestedRegret == 1;
  };

  // Check if a product has any valid quotes received (not regretted)
  const hasQuotes = (product) => {
    const quotations = product?.quotations || [];
    if (quotations.length === 0) return false;

    // Check for valid quotations (must have an id, quote_id, or quote_item_id and not be regretted)
    const validQuotations = quotations.filter(q => {
      const hasId = q.id != null || q.quote_id != null || q.quote_item_id != null;
      if (!hasId) return false;
      if (isQuoteRegretted(q)) return false;
      return true;
    });

    return validQuotations.length > 0;
  };

  // Get all vendor IDs for a product from product_vendors
  const getVendorIdsForProduct = (product) => {
    const productVendors = product?.product_vendors || [];
    const ids = new Set();
    productVendors.forEach(v => {
      const vid = Number(v.id || v.user_id);
      if (vid) ids.add(vid);
    });
    return ids;
  };

  // Determine product's disabled state and status badge based on vendor approval statuses
  const getProductRoundStatus = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { isDisabled: true, statusLabel: '', statusClass: '' };

    // Priority 1: Hospitality approval workflow
    if (isQuoteApproved(productId)) {
      return { isDisabled: true, statusLabel: 'Approved', statusClass: styles.createStatusApproved };
    }

    // Priority 2: No valid quotes
    if (!hasQuotes(product)) {
      return { isDisabled: true, statusLabel: 'No Quotes', statusClass: styles.createStatusNoQuotes };
    }

    const activeRound = product.active_round;

    // Priority 3: No active round
    if (!activeRound) {
      return { isDisabled: false, statusLabel: 'Available', statusClass: '' };
    }

    const vendorApprovals = activeRound.vendor_approvals || [];
    const roundVendorIds = activeRound.vendor_ids;

    // Priority 4: Old-style round (vendor_ids null)
    if (roundVendorIds === null || roundVendorIds === undefined) {
      return { isDisabled: true, statusLabel: 'Pending Approval', statusClass: styles.createStatusPending };
    }

    // Priority 5: Check vendor approval statuses
    const hasRejected = vendorApprovals.some(va => va.status === 'REJECTED');
    const allApproved = vendorApprovals.length > 0 && vendorApprovals.every(va => va.status === 'APPROVED');

    // ENABLED: any vendor rejected
    if (hasRejected) {
      return { isDisabled: false, statusLabel: 'Rejected', statusClass: styles.createStatusRejected };
    }

    // ENABLED: some product_vendors not in the round
    const productVendors = product.product_vendors || [];
    const roundVendorIdSet = new Set(roundVendorIds.map(Number));
    const vendorsNotInRound = productVendors.some(v => {
      const vid = Number(v.id || v.user_id);
      return vid && !roundVendorIdSet.has(vid);
    });
    if (vendorsNotInRound) {
      const coveredCount = roundVendorIds.length;
      return { isDisabled: false, statusLabel: `${coveredCount} vendor${coveredCount !== 1 ? 's' : ''} in round`, statusClass: styles.createStatusPartial };
    }

    // DISABLED: all approved
    if (allApproved) {
      return { isDisabled: true, statusLabel: 'Approved', statusClass: styles.createStatusApproved };
    }

    // DISABLED: all pending, or mixed pending+approved
    return { isDisabled: true, statusLabel: 'Pending Approval', statusClass: styles.createStatusPending };
  };

  // Vendor toggle handler for negotiation round creation
  const handleVendorToggle = (productId, vendorId) => {
    setSelectedVendors(prev => {
      const current = [...(prev[productId] || [])];
      const idx = current.indexOf(vendorId);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(vendorId);
      }
      return { ...prev, [productId]: current };
    });
  };

  // Select/deselect all available vendors for a product
  const handleSelectAllVendors = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const allVendorIds = Array.from(getVendorIdsForProduct(product));
    const activeRound = product.active_round;
    const vendorApprovals = activeRound?.vendor_approvals || [];
    const roundVendorIds = new Set((activeRound?.vendor_ids || []).map(Number));

    const availableIds = allVendorIds.filter(vid => {
      if (!roundVendorIds.has(vid)) return true;
      const approval = vendorApprovals.find(va => Number(va.vendor_id) === vid);
      return approval && approval.status === 'REJECTED';
    });

    setSelectedVendors(prev => {
      const current = prev[productId] || [];
      const allSelected = availableIds.every(id => current.includes(id));
      if (allSelected) {
        return { ...prev, [productId]: [] };
      } else {
        return { ...prev, [productId]: availableIds };
      }
    });
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const effectiveFields = getEffectiveFields();

    if (selectedProducts.length === 0 || !formData.end_date) {
      toast.error('Please select a product and set an end date');
      return;
    }

    // Validate vendor selection
    const productId = selectedProducts[0];
    const vendorIds = selectedVendors[productId] || [];
    if (vendorIds.length === 0) {
      toast.error('Please select at least one vendor');
      return;
    }

    // Validate that at least one numeric target is set if numeric fields are selected
    const numericFields = ['base_price', 'freight', 'packaging', 'delivery_period'];
    const hasAnyNumericField = effectiveFields.some(f => numericFields.includes(f));
    const hasNumericTarget = (
      (effectiveFields.includes('base_price') && formData.target_base_price) ||
      (effectiveFields.includes('freight') && formData.target_freight) ||
      (effectiveFields.includes('packaging') && formData.target_packaging) ||
      (effectiveFields.includes('delivery_period') && formData.target_delivery_date)
    );
    if (hasAnyNumericField && !hasNumericTarget) {
      toast.error('Please set at least one target value for the selected negotiation fields');
      return;
    }

    setSubmitting(true);
    try {
      // Convert local datetime to UTC ISO string
      // The datetime-local input gives us local time, we need to send UTC to backend
      const utcEndDate = moment(formData.end_date).utc().format();

      // Create rounds for each selected product
      for (const pid of selectedProducts) {
        // Build per-vendor targets (exclude internal _localFields key)
        const productVendorIds = selectedVendors[pid] || [];
        const perVendorTargets = {};
        productVendorIds.forEach(vid => {
          const vt = vendorTargets[vid];
          if (!vt) return;
          const cleaned = {};
          Object.keys(vt).forEach(k => {
            if (k === '_localFields') return;
            if (vt[k]) cleaned[k] = vt[k];
          });
          if (Object.keys(cleaned).length > 0) {
            perVendorTargets[vid] = cleaned;
          }
        });

        await createNegotiationRound({
          rfq_id,
          rfq_product_id: parseInt(pid),
          end_date: utcEndDate,
          vendor_ids: productVendorIds,
          negotiation_fields: effectiveFields,
          target_base_price: effectiveFields.includes('base_price') ? parseFloat(formData.target_base_price) || null : null,
          target_freight: effectiveFields.includes('freight') ? parseFloat(formData.target_freight) || null : null,
          target_freight_mode: formData.target_freight_mode,
          target_packaging: effectiveFields.includes('packaging') ? parseFloat(formData.target_packaging) || null : null,
          target_packaging_mode: formData.target_packaging_mode,
          target_delivery_date: effectiveFields.includes('delivery_period') ? formData.target_delivery_date : null,
          target_payment_terms: effectiveFields.includes('payment_terms') ? formData.target_payment_terms || null : null,
          target_vendor_tc: effectiveFields.includes('vendor_tc') ? formData.target_vendor_tc || null : null,
          target_comments: effectiveFields.includes('comments') ? formData.target_comments || null : null,
          vendor_targets: Object.keys(perVendorTargets).length > 0 ? perVendorTargets : null,
        });
      }

      toast.success('Negotiation round created successfully');
      onRefresh();
      onHide();
    } catch (error) {
      toast.error(error.message || 'Failed to create negotiation round');
    } finally {
      setSubmitting(false);
    }
  };

  // Open action modal for approve/reject
  const openActionModal = (round, type) => {
    setSelectedRoundForAction(round);
    setActionType(type);
    onHide(); // Close the NegotiationModal first to avoid modal overlap
    setShowActionModal(true);
  };

  // Handle action modal submission
  const handleActionModalSubmit = async (comment) => {
    if (!selectedRoundForAction) return;

    const roundId = selectedRoundForAction.id;

    if (actionType === 'APPROVE') {
      await handleApprove(roundId, comment);
    } else if (actionType === 'REJECT') {
      await handleReject(roundId, comment);
    }

    setShowActionModal(false);
    setSelectedRoundForAction(null);
    setActionType(null);
  };

  const handleApprove = async (roundId, comment = '') => {
    setSubmitting(true);
    try {
      const response = await approveNegotiationRound(roundId, comment || null);
      console.log('Approve response:', response);

      // Response structure: { status: 1, data: {...}, message: "...", approved: true, ... }
      if (response.status === 1 || response.approved === true) {
        const message = response.message || 'Round approved successfully';
        toast.success(message);
        onRefresh();
        if (selectedRound?.id === roundId) {
          setSelectedRound(null);
          setRoundQuotes([]);
        }
      } else {
        toast.error(response.message || 'Failed to approve round');
      }
    } catch (error) {
      console.error('Approve error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to approve round';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (roundId, reason) => {
    if (!reason) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      const response = await rejectNegotiationRound(roundId, reason);
      console.log('Reject response:', response);

      // Response structure: { status: 1, data: {...}, message: "..." }
      if (response.status === 1) {
        const message = response.message || 'Round rejected successfully';
        toast.success(message);
        onRefresh();
        if (selectedRound?.id === roundId) {
          setSelectedRound(null);
          setRoundQuotes([]);
        }
      } else {
        toast.error(response.message || 'Failed to reject round');
      }
    } catch (error) {
      console.error('Reject error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to reject round';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Create Negotiation Round';
      case 'history': return 'Negotiation Rounds';
      case 'view-approve': return 'View & Approve Negotiation Rounds';
      default: return 'Negotiation';
    }
  };

  const getModalSubtitle = () => {
    switch (mode) {
      case 'create':
        return 'Select a product, define target price, and set round timeline.';
      case 'history':
        return 'Track all rounds with status progression and approval journey.';
      case 'view-approve':
        return 'Review pending rounds, take approval action, and inspect submitted quotes.';
      default:
        return 'Manage negotiation rounds and approval flow.';
    }
  };

  // Helper to get effective round status (considering approvals)
  const getEffectiveRoundStatus = (round) => {
    const status = (round?.status || '').toUpperCase();

    // Check if any approval is REJECTED - if so, round is rejected
    const hasRejectedApproval = round?.approvals?.some(a => a.status === 'REJECTED');
    if (hasRejectedApproval) {
      return 'REJECTED';
    }

    return status;
  };

  // Compute round status counts for summary display
  const getRoundStatusCounts = () => {
    const allRounds = mode === 'history' ? roundsHistory : [...activeRounds, ...roundsHistory];

    // Deduplicate rounds by ID
    const uniqueRounds = allRounds.filter((round, index, self) =>
      index === self.findIndex(r => r.id === round.id)
    );

    const counts = {
      active: 0,
      pending_approval: 0,
      ended: 0,
      expired: 0,
      completed: 0,
      closed: 0,
      rejected: 0
    };

    uniqueRounds.forEach(round => {
      const effectiveStatus = getEffectiveRoundStatus(round);
      if (effectiveStatus === 'REJECTED') counts.rejected++;
      else if (effectiveStatus === 'ACTIVE') counts.active++;
      else if (effectiveStatus === 'PENDING_APPROVAL') counts.pending_approval++;
      else if (effectiveStatus === 'EXPIRED') counts.expired++;
      else if (effectiveStatus === 'COMPLETED') counts.completed++;
      else if (effectiveStatus === 'CLOSED') counts.closed++;
      else if (effectiveStatus === 'ENDED') counts.ended++;
    });

    return counts;
  };

  // Round status summary component
  const renderRoundStatusSummary = () => {
    const counts = getRoundStatusCounts();
    const total = counts.active + counts.pending_approval + counts.ended + counts.expired + counts.completed + counts.closed + counts.rejected;

    if (total === 0) return null;

    const summaryItems = [
      { key: 'active', label: 'Active', tone: 'active' },
      { key: 'pending_approval', label: 'Pending Approval', tone: 'pending' },
      { key: 'ended', label: 'Ended', tone: 'ended' },
      { key: 'expired', label: 'Expired', tone: 'expired' },
      { key: 'completed', label: 'Completed', tone: 'completed' },
      { key: 'closed', label: 'Closed', tone: 'closed' },
      { key: 'rejected', label: 'Rejected', tone: 'rejected' },
    ];

    return (
      <div className={`${styles.sectionCard} ${styles.summaryHeader}`}>
        <div className={styles.summaryTopRow}>
          <p className={styles.summaryLabel}>Round Status Summary</p>
          <p className={styles.summaryTotal}>{total} Total</p>
        </div>
        <div className={styles.summaryChips}>
          {summaryItems.map((item) =>
            counts[item.key] > 0 ? (
              <span
                key={item.key}
                className={`${styles.summaryChip} ${styles[`summaryChip_${item.tone}`]}`}
              >
                <strong>{counts[item.key]}</strong> {item.label}
              </span>
            ) : null
          )}
        </div>
      </div>
    );
  };

  const getProductName = (product) => {
    return product?.product_details?.[0]?.name || product?.product_details?.[0]?.product_name || product?.product_name || product?.name || `Product ${product.id}`;
  };

  const getVendorDisplayName = (v) =>
    v?.organization_name || v?.company_name || v?.vendor_company_name || v?.name || v?.email || 'Unknown Vendor';

  const getVendorNames = (product) => {
    const productVendors = product?.product_vendors || [];
    const quotations = product?.quotations || [];

    // Primary source: product_vendors from API
    if (productVendors.length > 0) {
      const names = productVendors.slice(0, 3).map(v => getVendorDisplayName(v));
      if (productVendors.length > 3) {
        return `${names.join(', ')} +${productVendors.length - 3} more`;
      }
      return names.join(', ');
    }

    // Fallback: extract from quotations
    const validQuotations = quotations.filter(q => {
      const hasId = q.id != null || q.quote_id != null || q.quote_item_id != null;
      return hasId && !isQuoteRegretted(q);
    });

    if (validQuotations.length === 0) return 'No quotes';

    const names = validQuotations.slice(0, 3).map(q => {
      const vendorDetails = getVendorDetailsFromQuote(q);
      if (vendorDetails) {
        const name = getVendorDisplayName(vendorDetails);
        if (name !== 'Unknown Vendor') return name;
      }
      return null;
    }).filter(Boolean);

    if (names.length > 0) {
      if (validQuotations.length > 3) {
        return `${names.join(', ')} +${validQuotations.length - 3} more`;
      }
      return names.join(', ');
    }

    return `${validQuotations.length} quote(s)`;
  };

  const getProductDetails = (product) => {
    const details = product?.product_details?.[0] || {};
    const productSpecs = product?.product_specs || [];
    const rfqDetails = details?.rfq_details || [];
    
    const spec = productSpecs.find(s => s.title === 'Spec')?.value ||
                 rfqDetails.find(d => d.title === 'Spec')?.value;
    const size = productSpecs.find(s => s.title === 'Size')?.value ||
                 rfqDetails.find(d => d.title === 'Size')?.value;
    const quantity = rfqDetails.find(d => d.title === 'Quantity')?.value ||
                     product?.quantity;
    const unit = rfqDetails.find(d => d.title === 'Unit')?.value ||
                 product?.unit;
    
    return {
      name: details?.name || details?.product_name || `Product ${product.id}`,
      spec,
      size,
      quantity,
      unit
    };
  };

  // Get effective negotiation fields (defaults to base_price if none selected)
  const getEffectiveFields = () => {
    return formData.negotiation_fields.length > 0 ? formData.negotiation_fields : ['base_price'];
  };

  // Get vendor price data for chart and L1 display
  // Data shape: pricing fields (unit_price, total_price, freight_price, etc.) are FLAT on quotation object.
  // quote_details is an object { vendor_details, is_regret, ... } — NOT pricing data.
  const getVendorPriceData = (product) => {
    const quotations = product?.quotations || [];
    const validQuotations = quotations.filter(q => {
      const hasId = q.id != null || q.quote_id != null || q.quote_item_id != null;
      return hasId && !isQuoteRegretted(q);
    });

    if (validQuotations.length === 0) return { vendors: [], l1: null };

    const vendors = validQuotations.map(q => {
      const vendorDetails = getVendorDetailsFromQuote(q);
      const vendorName = vendorDetails ? getVendorDisplayName(vendorDetails) : 'Unknown';

      // Pricing fields are flat on the quotation object (q.unit_price, q.total_price, etc.)
      // Use pre-computed total_price first (most reliable), then try calculateTotal on flat fields
      let totalPrice = parseFloat(q.total_price || 0);
      if (totalPrice === 0) {
        const quantity = q.quantity || product?.quantity || 0;
        totalPrice = parseFloat(calculateTotal(q, quantity, false)) || 0;
      }
      // Alternate data shape: quote_details is an array with pricing nested inside
      if (totalPrice === 0 && Array.isArray(q.quote_details) && q.quote_details[0]) {
        const qd = q.quote_details[0];
        totalPrice = parseFloat(qd.total_price || 0);
        if (totalPrice === 0) {
          const qty = qd?.rfq_details?.find(s => s.title === 'Quantity')?.value || qd?.quantity || 0;
          totalPrice = parseFloat(calculateTotal(qd, qty, false)) || 0;
        }
      }

      // Extract flat pricing fields for tooltip breakdown
      const src = (Array.isArray(q.quote_details) && q.quote_details[0]) || q;
      const unitPrice = parseFloat(src.unit_price || 0);
      const freightPrice = parseFloat(src.freight_price || 0);
      const freightMode = src.freight_mode || 'percentage';
      const packagePrice = parseFloat(src.package_price || 0);
      const packageMode = src.package_mode || 'percentage';
      const tax = parseFloat(src.tax || 0);
      const taxMode = src.tax_mode || 'percentage';
      const quantity = parseFloat(src.quantity || q.quantity || product?.quantity || 0);

      // Extract additional quote fields for accordion cards
      const deliveryPeriod = src.delivery_period || null;
      const paymentTerms = src.payment_terms || null;
      const vendorTC = (() => {
        const gpt = src.global_payment_term;
        return Array.isArray(gpt) ? (gpt[0]?.details || '') : (typeof gpt === 'string' ? gpt : '');
      })();
      const comment = src.comment || src.global_comment || null;
      const vendorId = (() => {
        const vd = getVendorDetailsFromQuote(q);
        return Number(vd?.id || vd?.user_id || q.vendor_id || q.created_by || 0);
      })();

      return {
        vendorName, totalPrice, unitPrice, quantity,
        freightPrice, freightMode, packagePrice, packageMode, tax, taxMode,
        deliveryPeriod, paymentTerms, vendorTC, comment, vendorId,
      };
    }).filter(v => v.totalPrice > 0);

    vendors.sort((a, b) => a.totalPrice - b.totalPrice);
    const l1 = vendors.length > 0 ? vendors[0].totalPrice : null;
    vendors.forEach(v => { v.isL1 = v.totalPrice === l1; });

    return { vendors, l1 };
  };

  // Build Chart.js config for vendor price chart (bar or line)
  const CHART_COLORS = ['#2e5ba8', '#428B41', '#e67e22', '#8e44ad', '#16a085', '#c0392b', '#2c3e50', '#f39c12'];

  const buildChartConfig = (vendorPriceData, targetPrice, chartType = 'bar') => {
    const { vendors } = vendorPriceData;

    const isLine = chartType === 'line';

    const dataset = isLine
      ? {
          label: 'Total Price (₹)',
          data: vendors.map(v => v.totalPrice),
          borderColor: '#2e5ba8',
          backgroundColor: 'rgba(46, 91, 168, 0.08)',
          pointBackgroundColor: vendors.map((v, i) => v.isL1 ? '#2e7d32' : CHART_COLORS[i % CHART_COLORS.length]),
          pointBorderColor: vendors.map((v, i) => v.isL1 ? '#1b5e20' : CHART_COLORS[i % CHART_COLORS.length]),
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBorderWidth: 2,
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
        }
      : {
          label: 'Total Price (₹)',
          data: vendors.map(v => v.totalPrice),
          backgroundColor: vendors.map((v, i) => v.isL1 ? '#2e7d32CC' : (CHART_COLORS[i % CHART_COLORS.length] + 'CC')),
          borderColor: vendors.map((v, i) => v.isL1 ? '#1b5e20' : CHART_COLORS[i % CHART_COLORS.length]),
          borderWidth: vendors.map(v => v.isL1 ? 2 : 1),
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
        };

    const data = {
      labels: vendors.map(v => v.vendorName),
      datasets: [dataset]
    };

    const maxPrice = Math.max(...vendors.map(v => v.totalPrice), targetPrice || 0);
    const minPrice = Math.min(...vendors.map(v => v.totalPrice), targetPrice || Infinity);
    // Smart y-axis min: start from 0 if values are close to 0, otherwise floor to ~70% of min for bar differentiation
    const yMin = minPrice > 0 ? Math.floor(minPrice * 0.7) : 0;

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          backgroundColor: '#1a2730',
          titleFont: { size: 12, weight: '700' },
          bodyFont: { size: 11 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const v = vendors[ctx.dataIndex];
              const fmt = (val) => `₹${Number(val).toLocaleString('en-IN')}`;
              const fmtCharge = (val, mode) => mode === 'percentage' ? `${val}%` : fmt(val);
              const lines = [
                `Unit Price: ${fmt(v.unitPrice)}`,
                `Qty: ${v.quantity || '-'}`,
              ];
              if (v.packagePrice) lines.push(`Packaging: ${fmtCharge(v.packagePrice, v.packageMode)}`);
              if (v.freightPrice) lines.push(`Freight: ${fmtCharge(v.freightPrice, v.freightMode)}`);
              if (v.tax) lines.push(`GST: ${fmtCharge(v.tax, v.taxMode)}`);
              lines.push(`Total: ${fmt(v.totalPrice)}`);
              if (v.isL1) lines.push('★ L1 (Lowest)');
              return lines;
            }
          }
        },
        targetLine: { targetPrice: targetPrice || null },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 10, weight: '600' },
            color: '#4d6582',
            maxRotation: 25,
            minRotation: 0,
            callback: function(value) {
              const label = this.getLabelForValue(value);
              return label.length > 18 ? label.slice(0, 18) + '…' : label;
            }
          }
        },
        y: {
          beginAtZero: false,
          suggestedMin: yMin,
          suggestedMax: maxPrice * 1.12,
          grid: { color: '#e8eef5', drawBorder: false },
          ticks: {
            font: { size: 10 },
            color: '#6d829a',
            callback: (value) => '₹' + Number(value).toLocaleString('en-IN'),
            maxTicksLimit: 6
          },
          title: {
            display: false
          }
        }
      }
    };

    return { data, options };
  };

  const renderCreateForm = () => {
    const availableProducts = products.filter(p => !getProductRoundStatus(p.id).isDisabled);

    return (
      <Form onSubmit={handleSubmit}>
        <section className={styles.createSurface}>
          <div className={styles.createHeaderRow}>
            <div>
              <p className={styles.createHeaderTitle}>Select Product</p>
              <p className={styles.createHeaderSub}>
                Only products with valid vendor quotes can start a new negotiation round.
              </p>
            </div>
            <span className={styles.createHeaderMeta}>
              {availableProducts.length} available
            </span>
          </div>

          {products.length === 0 ? (
            <div className={styles.createEmpty}>
              <p className={styles.createEmptyTitle}>No products found</p>
              <p className={styles.createEmptySub}>Load an RFQ with products to create rounds.</p>
            </div>
          ) : (
            <div className={styles.createProductList}>
              {products.map((product) => {
                const { isDisabled, statusLabel, statusClass } = getProductRoundStatus(product.id);
                const isSelected = selectedProducts.includes(product.id);
                const details = getProductDetails(product);

                const priceData = getVendorPriceData(product);
                const isFlipped = flippedCards[product.id];

                return (
                  <div
                    key={product.id}
                    className={`${styles.flipContainer} ${isFlipped ? styles.flipContainerFlipped : ''}`}
                  >
                    <div className={styles.flipInner}>
                      {/* FRONT FACE - Product Info */}
                      <button
                        type="button"
                        onClick={() => !isDisabled && handleProductToggle(product.id)}
                        disabled={isDisabled}
                        aria-pressed={isSelected}
                        className={`${styles.flipFace} ${styles.flipFront} ${styles.createProductRow} ${
                          isSelected ? styles.createProductRowSelected : ''
                        } ${isDisabled ? styles.createProductRowDisabled : ''}`}
                      >
                        <div className={styles.createProductMain}>
                          <input
                            type="radio"
                            name="selectedProduct"
                            checked={isSelected}
                            disabled={isDisabled}
                            readOnly
                            className={styles.createRadio}
                          />
                          <div className={styles.createTitleBlock}>
                            <p className={styles.createProductName}>{details.name}</p>
                            {statusLabel !== 'Available' && (
                              <div className={styles.createStatusRow}>
                                <span className={`${styles.createStatusBadge} ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.createMetaGrid}>
                          <div className={styles.createMetaItem}>
                            <p className={styles.createMetaLabel}>Spec</p>
                            <p className={`${styles.createMetaValue} ${styles.createMetaValueClamp}`} title={details.spec || ''}>{details.spec || '-'}</p>
                          </div>
                          <div className={styles.createMetaItem}>
                            <p className={styles.createMetaLabel}>Size</p>
                            <p className={`${styles.createMetaValue} ${styles.createMetaValueClamp}`} title={details.size || ''}>{details.size || '-'}</p>
                          </div>
                          <div className={styles.createMetaItem}>
                            <p className={styles.createMetaLabel}>Qty & Unit</p>
                            <p className={styles.createMetaValue}>
                              {details.quantity || '-'}{details.unit ? ` ${details.unit}` : ''}
                            </p>
                          </div>
                          <div className={`${styles.createMetaItem} ${styles.createMetaItemL1}`}>
                            <p className={styles.createMetaLabel}>L1</p>
                            <p className={`${styles.createMetaValue} ${styles.createMetaValueL1}`}>
                              {priceData.l1 ? `₹${priceData.l1.toLocaleString('en-IN')}` : '-'}
                            </p>
                          </div>
                          <div className={styles.createMetaItem}>
                            <p className={styles.createMetaLabel}>Vendors</p>
                            <p className={`${styles.createMetaValue} ${styles.createMetaValueClampVendor}`} title={getVendorNames(product)}>{getVendorNames(product)}</p>
                          </div>
                        </div>

                        <div className={styles.chartToggleRow}>
                          <span
                            role="button"
                            tabIndex={0}
                            className={`${styles.chartToggleBtn} ${!hasQuotes(product) ? styles.chartToggleBtnDisabled : ''}`}
                            onClick={(e) => { if (hasQuotes(product)) toggleCardFlip(product.id, e); }}
                            onKeyDown={(e) => { if (hasQuotes(product) && (e.key === 'Enter' || e.key === ' ')) toggleCardFlip(product.id, e); }}
                          >
                            View Chart →
                          </span>
                        </div>
                      </button>

                      {/* BACK FACE - Vendor Price Chart */}
                      <div className={`${styles.flipFace} ${styles.flipBack} ${styles.createProductRow}`}>
                        <div className={styles.chartFaceHeader}>
                          <div className={styles.chartFaceHeaderLeft}>
                            <p className={styles.chartFaceTitle}>{details.name}</p>
                            <div className={styles.chartTypeSwitch}>
                              <button
                                type="button"
                                className={`${styles.chartTypeSwitchBtn} ${(chartTypes[product.id] || 'bar') === 'bar' ? styles.chartTypeSwitchBtnActive : ''}`}
                                onClick={() => setChartTypes(prev => ({ ...prev, [product.id]: 'bar' }))}
                              >
                                Bar
                              </button>
                              <button
                                type="button"
                                className={`${styles.chartTypeSwitchBtn} ${chartTypes[product.id] === 'line' ? styles.chartTypeSwitchBtnActive : ''}`}
                                onClick={() => setChartTypes(prev => ({ ...prev, [product.id]: 'line' }))}
                              >
                                Line
                              </button>
                            </div>
                          </div>
                          <span
                            role="button"
                            tabIndex={0}
                            className={styles.chartBackBtn}
                            onClick={(e) => toggleCardFlip(product.id, e)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCardFlip(product.id, e); }}
                          >
                            ← Back to product
                          </span>
                        </div>
                        <div className={styles.chartContainer}>
                          {isFlipped && (() => {
                            if (priceData.vendors.length === 0) {
                              return <p className={styles.chartEmpty}>No price data available</p>;
                            }
                            const activeChartType = chartTypes[product.id] || 'bar';
                            const targetPrice = formData.target_base_price ? parseFloat(formData.target_base_price) : null;
                            const { data, options } = buildChartConfig(priceData, targetPrice, activeChartType);
                            const ChartComp = activeChartType === 'line' ? Line : Bar;
                            return <ChartComp data={data} options={options} plugins={[targetLinePlugin, barLabelsPlugin]} />;
                          })()}
                        </div>
                        <div className={styles.chartLegend}>
                          {priceData.l1 && (
                            <span className={styles.chartLegendL1}>L1: ₹{priceData.l1.toLocaleString('en-IN')}</span>
                          )}
                          <span className={styles.chartLegendCount}>{priceData.vendors.length} vendor(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedProducts.length > 0 && (
            <p className={styles.createSelectedNote}>
              {selectedProducts.length} product selected
            </p>
          )}
        </section>

        {selectedProducts.length > 0 && (() => {
          const selectedProduct = products.find(p => p.id === selectedProducts[0]);
          if (!selectedProduct) return null;
          const priceData = getVendorPriceData(selectedProduct);
          const hasVendorsSelected = (selectedVendors[selectedProduct.id] || []).length > 0;
          return (
            <>
              <NegotiationFieldsSelect
                selectedFields={formData.negotiation_fields}
                onToggleField={(fieldValue) => {
                  setFormData(prev => {
                    const current = prev.negotiation_fields;
                    const next = current.includes(fieldValue)
                      ? current.filter(f => f !== fieldValue)
                      : [...current, fieldValue];
                    return { ...prev, negotiation_fields: next };
                  });
                }}
                formData={formData}
                onFormChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
                disabled={!hasVendorsSelected}
              />

              <VendorAccordionPanel
                product={selectedProduct}
                selectedVendorIds={selectedVendors[selectedProduct.id] || []}
                onVendorToggle={(vid) => handleVendorToggle(selectedProduct.id, vid)}
                onSelectAll={() => handleSelectAllVendors(selectedProduct.id)}
                getVendorDisplayName={getVendorDisplayName}
                selectedFields={getEffectiveFields()}
                vendorPriceData={priceData}
                vendorTargets={vendorTargets}
                onVendorTargetChange={(vendorId, fieldKey, value) => {
                  setVendorTargets(prev => ({
                    ...prev,
                    [vendorId]: { ...(prev[vendorId] || {}), [fieldKey]: value }
                  }));
                }}
                onVendorLocalFieldToggle={(vendorId, fieldKey) => {
                  setVendorTargets(prev => {
                    const vendorData = prev[vendorId] || {};
                    const localFields = vendorData._localFields || [];
                    const nextFields = localFields.includes(fieldKey)
                      ? localFields.filter(f => f !== fieldKey)
                      : [...localFields, fieldKey];
                    return { ...prev, [vendorId]: { ...vendorData, _localFields: nextFields } };
                  });
                }}
                globalFormData={formData}
              />

            </>
          );
        })()}
      </Form>
    );
  };

  // Status config for consistent styling
  const statusConfig = {
    ACTIVE: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7', label: 'Active', icon: '●' },
    PENDING_APPROVAL: { bg: '#fff8e1', color: '#f57f17', border: '#ffcc80', label: 'Pending Approval', icon: '◷' },
    ENDED: { bg: '#fff3e0', color: '#e65100', border: '#ffab91', label: 'Ended', icon: '■' },
    COMPLETED: { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9', label: 'Completed', icon: '✓' },
    CLOSED: { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8', label: 'Closed', icon: '✓' },
    REJECTED: { bg: '#fce4ec', color: '#c62828', border: '#ef9a9a', label: 'Rejected', icon: '✗' },
    EXPIRED: { bg: '#fce4ec', color: '#c62828', border: '#ef9a9a', label: 'Expired', icon: '⊘' },
  };

  const getStatusStyle = (status) => statusConfig[status] || statusConfig.CLOSED;

  const getStatusTone = (status) => {
    if (status === 'PENDING_APPROVAL') return 'pending';
    if (status === 'ACTIVE') return 'active';
    if (status === 'ENDED') return 'ended';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'EXPIRED') return 'expired';
    if (status === 'COMPLETED') return 'completed';
    return 'closed';
  };

  const getJourneyTone = (status) => {
    if (status === 'APPROVED') return 'approved';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'CANCELLED') return 'cancelled';
    return 'pending';
  };

  // Get time remaining text for active rounds
  const getTimeRemaining = (endDate) => {
    if (!endDate) return null;
    const end = moment.utc(endDate);
    const now = moment();
    if (end.isBefore(now)) return null;
    const duration = moment.duration(end.diff(now));
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const mins = duration.minutes();
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  const renderHistory = () => {
    // Merge activeRounds (which have enriched approval data) with roundsHistory
    const allRounds = [...activeRounds, ...roundsHistory];
    const uniqueRounds = allRounds.filter((round, index, self) =>
      index === self.findIndex(r => r.id === round.id)
    );

    // Group by product
    const grouped = {};
    uniqueRounds.forEach(round => {
      const productId = round.rfq_product_id;
      if (!grouped[productId]) {
        const product = products.find(p => String(p.id) === String(productId));
        grouped[productId] = {
          productName: round.product_name || (product ? getProductName(product) : `Product ${productId}`),
          productDetails: product ? getProductDetails(product) : null,
          rounds: []
        };
      }
      grouped[productId].rounds.push(round);
    });

    // Sort rounds within each group by round_number descending (latest first)
    Object.values(grouped).forEach(group => {
      group.rounds.sort((a, b) => (b.round_number || 0) - (a.round_number || 0));
    });

    const productGroups = Object.entries(grouped);

    // Summary counts
    const counts = getRoundStatusCounts();
    const total = Object.values(counts).reduce((s, c) => s + c, 0);

    return (
      <div>
        {total > 0 && renderRoundStatusSummary()}

        {uniqueRounds.length === 0 ? (
          <div className={styles.historyEmpty}>
            <p className={styles.historyEmptyTitle}>No negotiation rounds yet</p>
            <p className={styles.historyEmptySub}>Rounds will appear here once created.</p>
          </div>
        ) : (
          <div className={styles.historyGroup}>
            {productGroups.map(([productId, group]) => (
              <div key={productId} className={styles.historyProductCard}>
                <div className={styles.historyProductHead}>
                  <p className={styles.historyProductName}>{group.productName}</p>
                  <span className={styles.historyProductMeta}>
                    {group.rounds.length} round{group.rounds.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div>
                  {group.rounds.map((round) => {
                    const effectiveStatus = getEffectiveRoundStatus(round);
                    const cfg = getStatusStyle(effectiveStatus);
                    const roundTone = getStatusTone(effectiveStatus);
                    const timeLeft = effectiveStatus === 'ACTIVE' ? getTimeRemaining(round.end_date) : null;
                    const approvals = round.approvals || [];
                    const canApprove = effectiveStatus === 'PENDING_APPROVAL' && currentUserId &&
                      approvals.some(a => a.status === 'PENDING' && String(a.approver_user_id) === String(currentUserId));

                    return (
                      <div
                        key={round.id}
                        className={`${styles.roundCard} ${styles[`roundCard_${roundTone}`]}`}
                      >
                        <div>
                          <div className={styles.roundTopRow}>
                            <div className={styles.roundIdentity}>
                              <span className={styles.roundNumberDot}>
                                {round.round_number || '?'}
                              </span>
                              <span
                                className={`${styles.roundStatusBadge} ${styles[`historyStatus_${roundTone}`]}`}
                              >
                                {cfg.icon} {cfg.label}
                              </span>
                              {timeLeft && (
                                <span className={styles.roundTimeRemaining}>
                                  ⏱ {timeLeft}
                                </span>
                              )}
                            </div>
                            {canApprove && (
                              <div className={styles.roundActionGroup}>
                                <button
                                  type="button"
                                  className={`${styles.roundActionButton} ${styles.roundActionApprove}`}
                                  onClick={() => openActionModal(round, 'APPROVE')}
                                  disabled={submitting || !canWrite || permissionsLoading}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.roundActionButton} ${styles.roundActionReject}`}
                                  onClick={() => openActionModal(round, 'REJECT')}
                                  disabled={submitting || !canWrite || permissionsLoading}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Details row */}
                          <div className={styles.roundMeta}>
                            <div className={styles.roundMetaItem}>
                              <span className={styles.roundMetaLabel}>Target</span>
                              <div className={styles.roundMetaValue}>
                                ₹{parseFloat(round.target_price || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className={styles.roundMetaItem}>
                              <span className={styles.roundMetaLabel}>End Date</span>
                              <div className={styles.roundMetaValue}>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</div>
                            </div>
                            {round.created_by_name && (
                              <div className={styles.roundMetaItem}>
                                <span className={styles.roundMetaLabel}>Created By</span>
                                <div className={styles.roundMetaValue}>{round.created_by_name}</div>
                              </div>
                            )}
                          </div>

                          {/* Vendors in this round */}
                          {round.vendors && round.vendors.length > 0 && (
                            <div className={styles.roundVendorList}>
                              <span className={styles.roundMetaLabel}>Vendors</span>
                              <div className={styles.roundVendorBadges}>
                                {round.vendors.map((v, i) => (
                                  <span key={i} className={styles.roundVendorBadge}>
                                    {v.organization_name || v.name || `Vendor ${v.id}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Approval Workflow Journey — show for all rounds that went through approval */}
                          {(effectiveStatus !== 'DRAFT') && (
                            <div>
                              <div
                                onClick={() => toggleApprovalJourney(round)}
                                className={styles.workflowToggle}
                              >
                                <span className={styles.workflowChevron}>
                                  {expandedApprovalJourney === round.id ? '▼' : '▶'}
                                </span>
                                Approval Workflow
                                {approvals.length > 0 && effectiveStatus === 'PENDING_APPROVAL' && (
                                  <span className={styles.workflowMeta}>
                                    ({approvals.filter(a => a.status === 'PENDING').length} pending)
                                  </span>
                                )}
                                {(effectiveStatus === 'ACTIVE' || effectiveStatus === 'ENDED' || effectiveStatus === 'COMPLETED') && (
                                  <span className={styles.workflowMeta} style={{ color: '#198754' }}>
                                    (approved)
                                  </span>
                                )}
                                {(effectiveStatus === 'EXPIRED') && (
                                  <span className={styles.workflowMeta} style={{ color: '#dc3545' }}>
                                    (cancelled)
                                  </span>
                                )}
                              </div>

                              {expandedApprovalJourney === round.id && (
                                <div className={styles.workflowPanel}>
                                  {approvalJourneys[round.id]?.loading ? (
                                    <div className={styles.workflowLoading}>
                                      <Spinner size="sm" />
                                      <span> Loading approval history...</span>
                                    </div>
                                  ) : approvalJourneys[round.id]?.instances?.length > 0 ? (
                                    <div className={styles.journeyList}>
                                      {approvalJourneys[round.id].instances.map((instance, instIdx) => {
                                        const isLast = instIdx === approvalJourneys[round.id].instances.length - 1;
                                        const rawInstStatus = (instance.status || '').toUpperCase();
                                        // If the round itself ended/expired/closed without approval, treat pending instance as cancelled for display
                                        const roundEnded = ['EXPIRED', 'ENDED', 'CLOSED'].includes(effectiveStatus);
                                        const instStatus = (roundEnded && rawInstStatus === 'PENDING') ? 'CANCELLED' : rawInstStatus;
                                        const attemptNum = instIdx + 1;
                                        const journeyTone = getJourneyTone(instStatus);

                                        const instIcon = instStatus === 'APPROVED' ? '✓' :
                                                        instStatus === 'REJECTED' ? '✗' :
                                                        instStatus === 'CANCELLED' ? '—' : '◷';
                                        const instLabel = instStatus === 'PENDING' ? 'In Progress' :
                                                         instStatus.charAt(0) + instStatus.slice(1).toLowerCase();

                                        return (
                                          <div key={instance.id || instIdx}>
                                            <div
                                              className={`${styles.journeyCard} ${
                                                isLast && instStatus === 'PENDING' ? styles.journeyCardCurrent : ''
                                              }`}
                                            >
                                              <div className={`${styles.journeyHeader} ${styles[`journeyHeader_${journeyTone}`]}`}>
                                                <div className={styles.journeyHeaderLeft}>
                                                  <span className={`${styles.journeyIcon} ${styles[`journeyIcon_${journeyTone}`]}`}>
                                                    {instIcon}
                                                  </span>
                                                  <span className={styles.journeyAttempt}>Attempt {attemptNum}</span>
                                                  <span className={`${styles.journeyStatus} ${styles[`journeyStatus_${journeyTone}`]}`}>
                                                    {instLabel}
                                                  </span>
                                                  {isLast && instStatus === 'PENDING' && (
                                                    <span className={styles.journeyCurrent}>
                                                      Current
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className={styles.journeyBody}>
                                                {instance.steps && instance.steps.length > 0 ? (
                                                  <ApprovalTimeline
                                                    steps={instance.steps}
                                                    currentStep={instance.current_step}
                                                    initiatedBy={instance.initiated_by}
                                                    instanceStatus={instStatus}
                                                  />
                                                ) : (
                                                  <div className={styles.journeyEmpty}>
                                                    No step details available
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {!isLast && (
                                              <div className={styles.journeyConnector}>resubmitted</div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className={styles.journeyEmpty}>
                                      No approval workflow data found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderViewApprove = () => {
    const isRoundRejected = (round) => {
      return round?.approvals?.some(a => a.status === 'REJECTED');
    };

    const pendingRounds = activeRounds.filter(r =>
      (r.status === 'PENDING_APPROVAL' || r.status === 'pending_approval') && !isRoundRejected(r)
    );
    const activeRoundsList = activeRounds.filter(r => {
      const status = (r?.status || '').toUpperCase();
      return status === 'ACTIVE' && !isRoundRejected(r);
    });

    return (
      <div>
        {renderRoundStatusSummary()}
        {pendingRounds.length === 0 && activeRoundsList.length === 0 ? (
          <div className={styles.vaEmptyState}>No active negotiation rounds</div>
        ) : (
          <>
            {pendingRounds.length > 0 && (
              <div className={styles.vaSection}>
                <p className={styles.vaSectionTitle}>Pending Approval</p>
                {pendingRounds.map((round) => {
                  const product = products.find(p => String(p.id) === String(round.rfq_product_id));
                  const productName = round.product_name || (product ? getProductName(product) : `Product ${round.rfq_product_id}`);
                  const approvals = round.approvals || [];
                  const approvalInstance = approvalInstances[round.id];
                  const canApprove = approvalInstance
                    ? approvalInstance.can_user_approve === true
                    : (() => {
                        const userApproval = approvals.find(a =>
                          String(a.approver_user_id) === String(currentUserId)
                        );
                        return userApproval && (
                          userApproval.status === 'PENDING' ||
                          userApproval.status === 'pending' ||
                          !userApproval.status
                        );
                      })();
                  const isCurrentApprover = !loadingApprovals && canApprove;
                  const approvalStatus = approvalInstance?.status;
                  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;

                  return (
                    <div
                      key={round.id}
                      className={`${styles.vaCard} ${isCurrentApprover ? styles.vaCardAttention : ''}`}
                    >
                      <div className={styles.vaCardHead}>
                        <div>
                          <p className={styles.vaProductName}>{productName}</p>
                          <div className={styles.vaBadgeRow}>
                            <span className={`${styles.vaRoundBadge} ${styles.vaRoundBadgePending}`}>
                              Round {round.round_number}
                            </span>
                            {isCurrentApprover && (
                              <span className={styles.vaActionRequired}>Your Action Required</span>
                            )}
                          </div>
                          {round.vendors && round.vendors.length > 0 && (
                            <div className={styles.roundVendorBadges} style={{ marginTop: '4px' }}>
                              {round.vendors.map((v, i) => (
                                <span key={i} className={styles.roundVendorBadge}>
                                  {v.organization_name || v.name || `Vendor ${v.id}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={styles.vaActions}>
                          {loadingApprovals ? (
                            <Spinner size="sm" />
                          ) : canApprove ? (
                            <div className={styles.vaDecisionRow}>
                              <button
                                type="button"
                                className={styles.vaBtnApprove}
                                onClick={() => openActionModal(round, 'APPROVE')}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Approve Round
                              </button>
                              <button
                                type="button"
                                className={styles.vaBtnReject}
                                onClick={() => openActionModal(round, 'REJECT')}
                                disabled={submitting || !canWrite || permissionsLoading}
                              >
                                Reject Round
                              </button>
                            </div>
                          ) : approvalInstance ? (
                            <span className={styles.vaStatusBadge}>
                              {approvalStatus === 'PENDING' ? 'Awaiting Approval' : approvalStatus || 'Pending'}
                            </span>
                          ) : (
                            <span className={styles.vaStatusBadge}>Not an approver</span>
                          )}
                          <button
                            type="button"
                            className={styles.vaBtnOutline}
                            onClick={() => {
                              setSelectedRoundForWorkflow(round);
                              onHide();
                              setShowWorkflowModal(true);
                            }}
                          >
                            View Workflow Details
                          </button>
                        </div>
                      </div>

                      <div className={styles.vaMetaRow}>
                        <div className={styles.vaMetaBlock}>
                          <span className={styles.vaMetaLabel}>Target Price</span>
                          <span className={styles.vaMetaValue}>₹{parseFloat(round.target_price).toLocaleString()}</span>
                        </div>
                        <div className={styles.vaMetaBlock}>
                          <span className={styles.vaMetaLabel}>End Date</span>
                          <span className={styles.vaMetaValue}>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</span>
                        </div>
                      </div>

                      {/* Vendors in this round with quoted prices */}
                      {(() => {
                        const roundVendorIds = (round.vendor_ids || []).map(Number);
                        if (roundVendorIds.length === 0) return null;
                        const quotations = product?.quotations || [];
                        const productVendors = product?.product_vendors || [];
                        const vendors = roundVendorIds.map(vid => {
                          const pv = productVendors.find(v => Number(v.id || v.user_id) === vid);
                          const name = pv ? (pv.organization_name || pv.company_name || pv.name || 'Unknown Vendor') : 'Unknown Vendor';
                          const matchedQuote = quotations.find(q => {
                            const vd = q.quote_details?.vendor_details;
                            return Number(vd?.id || vd?.user_id || q.vendor_id || q.created_by) === vid;
                          });
                          return { id: vid, name, totalPrice: parseFloat(matchedQuote?.total_price || 0) };
                        });
                        return (
                          <div className={styles.wfVendorSection}>
                            <p className={styles.wfSectionLabel}>Vendors ({vendors.length})</p>
                            <div className={styles.wfVendorList}>
                              {vendors.map(v => (
                                <div key={v.id} className={styles.wfVendorRow}>
                                  <span className={styles.wfVendorName}>{v.name}</span>
                                  {v.totalPrice > 0 && (
                                    <span className={styles.wfVendorPriceValue}>₹{v.totalPrice.toLocaleString('en-IN')}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {approvals.length > 0 && (
                        <div className={styles.vaApproverBand}>
                          <p className={styles.vaApproverTitle}>Round Approval Status</p>
                          <div className={styles.vaApproverList}>
                            {approvals.map((approval, idx) => (
                              <span
                                key={idx}
                                className={`${styles.vaApproverChip} ${
                                  approval.status === 'APPROVED' ? styles.vaApproverApproved :
                                  approval.status === 'REJECTED' ? styles.vaApproverRejected :
                                  styles.vaApproverPending
                                }`}
                              >
                                {approval.approver_name || `User ${approval.approver_user_id}`}
                                {' '}
                                {approval.status === 'APPROVED' ? '✓' :
                                 approval.status === 'REJECTED' ? '✗' : '⏳'}
                              </span>
                            ))}
                          </div>
                          <p className={styles.vaApproverNote}>
                            {approvedCount} of {approvals.length} approvers have approved this round
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeRoundsList.length > 0 && (
              <div className={styles.vaSection}>
                <p className={styles.vaSectionTitle}>Active Rounds</p>
                {activeRoundsList.map((round) => {
                  const product = products.find(p => String(p.id) === String(round.rfq_product_id));
                  const productName = round.product_name || (product ? getProductName(product) : `Product ${round.rfq_product_id}`);
                  return (
                    <div key={round.id} className={styles.vaCard}>
                      <div className={styles.vaCardHead}>
                        <div>
                          <p className={styles.vaProductName}>{productName}</p>
                          <div className={styles.vaBadgeRow}>
                            <span className={`${styles.vaRoundBadge} ${styles.vaRoundBadgeActive}`}>
                              Round {round.round_number}
                            </span>
                          </div>
                          {round.vendors && round.vendors.length > 0 && (
                            <div className={styles.roundVendorBadges} style={{ marginTop: '4px' }}>
                              {round.vendors.map((v, i) => (
                                <span key={i} className={styles.roundVendorBadge}>
                                  {v.organization_name || v.name || `Vendor ${v.id}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.vaMetaRow}>
                        <div className={styles.vaMetaBlock}>
                          <span className={styles.vaMetaLabel}>Target Price</span>
                          <span className={styles.vaMetaValue}>₹{parseFloat(round.target_price).toLocaleString()}</span>
                        </div>
                        <div className={styles.vaMetaBlock}>
                          <span className={styles.vaMetaLabel}>End Date</span>
                          <span className={styles.vaMetaValue}>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</span>
                        </div>
                      </div>

                      {/* Vendors in this round with quoted prices */}
                      {(() => {
                        const roundVendorIds = (round.vendor_ids || []).map(Number);
                        if (roundVendorIds.length === 0) return null;
                        const quotations = product?.quotations || [];
                        const productVendors = product?.product_vendors || [];
                        const vendors = roundVendorIds.map(vid => {
                          const pv = productVendors.find(v => Number(v.id || v.user_id) === vid);
                          const name = pv ? (pv.organization_name || pv.company_name || pv.name || 'Unknown Vendor') : 'Unknown Vendor';
                          const matchedQuote = quotations.find(q => {
                            const vd = q.quote_details?.vendor_details;
                            return Number(vd?.id || vd?.user_id || q.vendor_id || q.created_by) === vid;
                          });
                          return { id: vid, name, totalPrice: parseFloat(matchedQuote?.total_price || 0) };
                        });
                        return (
                          <div className={styles.wfVendorSection}>
                            <p className={styles.wfSectionLabel}>Vendors ({vendors.length})</p>
                            <div className={styles.wfVendorList}>
                              {vendors.map(v => (
                                <div key={v.id} className={styles.wfVendorRow}>
                                  <span className={styles.wfVendorName}>{v.name}</span>
                                  {v.totalPrice > 0 && (
                                    <span className={styles.wfVendorPriceValue}>₹{v.totalPrice.toLocaleString('en-IN')}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName={styles.negotiationModalDialog}>
      <Modal.Header className={styles.modalHeader}>
        <div className={styles.modalTitleWrap}>
          <Modal.Title className={styles.modalTitle}>{getModalTitle()}</Modal.Title>
          <p className={styles.modalSubtitle}>{getModalSubtitle()}</p>
        </div>
        <button
          type="button"
          className={styles.modalCloseBtn}
          onClick={onHide}
          aria-label="Close"
        >
          ✕
        </button>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            {mode === 'create' && renderCreateForm()}
            {mode === 'history' && renderHistory()}
            {mode === 'view-approve' && renderViewApprove()}
          </>
        )}
      </Modal.Body>
      {mode === 'create' && (
        <div className={styles.createStickyFooter}>
          <div className={`${styles.endDateInline} ${!(selectedVendors[selectedProducts[0]] || []).length ? styles.targetInputsDisabled : ''}`}>
            <label htmlFor="neg-end-date" className={styles.formLabel}>
              End Date <span className={styles.requiredMark}>*</span>
            </label>
            <input
              id="neg-end-date"
              type="datetime-local"
              value={formData.end_date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              required
              disabled={!(selectedVendors[selectedProducts[0]] || []).length}
              className={styles.fieldInput}
            />
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.actionSecondary} onClick={onHide} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.actionPrimary}
              disabled={submitting || selectedProducts.length === 0 || !(selectedVendors[selectedProducts[0]] || []).length || !canWrite || permissionsLoading}
              onClick={handleSubmit}
            >
              {submitting ? <Spinner size="sm" /> : 'Create Round'}
            </button>
          </div>
        </div>
      )}
      {mode !== 'create' && (
        <Modal.Footer className={styles.modalFooter}>
          <button className={styles.actionPrimary} onClick={onHide}>
            Close
          </button>
        </Modal.Footer>
      )}
    </Modal>

      {/* Workflow Modal */}
      <NegotiationWorkflowModal
        show={showWorkflowModal}
        onHide={() => {
          setShowWorkflowModal(false);
          handleShow();
        }}
        round={selectedRoundForWorkflow}
        products={products}
        hospitalityCompanyId={hospitalityCompanyId}
        hotelId={hotelId}
        departmentId={departmentId}
        onActionComplete={() => {
          setShowWorkflowModal(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Approval Action Modal for approve/reject confirmation */}
      <ApprovalActionModal
        show={showActionModal}
        actionType={actionType}
        onClose={() => {
          setShowActionModal(false);
          setSelectedRoundForAction(null);
          setActionType(null);
          handleShow(); // Re-open the NegotiationModal when action is cancelled
        }}
        onSubmit={handleActionModalSubmit}
        loading={submitting}
        entityLabel={`Negotiation Round ${selectedRoundForAction?.round_number || ''}`}
      />
    </>
  );
};

export default NegotiationModal;
