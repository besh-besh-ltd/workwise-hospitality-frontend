import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Accordion } from 'react-bootstrap';
import {
  BsCheckCircleFill, BsCircle, BsXCircleFill,
  BsPersonFill, BsShieldCheck, BsShieldX, BsSkipForwardFill,
  BsLightningChargeFill, BsBoxSeam, BsGraphUpArrow,
  BsFileEarmarkCheck, BsExclamationTriangleFill,
  BsCalendar3, BsClipboardCheck, BsArrowRight,
} from 'react-icons/bs';
import { toast } from 'react-toastify';
import moment from 'moment';
import { getLifecycleSummary } from '@/services/rfq';
import { submitApprovalAction } from '@/services/approval';
import ApprovalTimeline from '@/components/dashboard/buyer/approval/ApprovalTimeline';
import ApprovalActionModal from '@/components/dashboard/buyer/approval/ApprovalActionModal';
import styles from './RFQLifecycleJourney.module.scss';

const PHASE_ICONS = {
  rfq_approval: BsFileEarmarkCheck,
  technical: BsClipboardCheck,
  commercial: BsGraphUpArrow,
  purchase_order: BsBoxSeam,
};

const fmt = (d) => d ? moment.utc(d).utcOffset('+05:30').format('DD MMM YYYY') : null;
const fmtTime = (d) => d ? moment.utc(d).utcOffset('+05:30').format('DD MMM, hh:mm a') : null;
const BID_TIMEZONE_OFFSET = '+05:30';
const HAS_EXPLICIT_TIMEZONE = /([zZ]|[+-]\d{2}:?\d{2})$/;
const parseBidDeadline = (value) => {
  if (!value) return null;
  const parsed = HAS_EXPLICIT_TIMEZONE.test(value)
    ? moment.parseZone(value).utcOffset(BID_TIMEZONE_OFFSET)
    : moment(value).utcOffset(BID_TIMEZONE_OFFSET, true);
  return parsed.isValid() ? parsed : null;
};
const fmtBidDeadline = (d) => {
  const parsed = parseBidDeadline(d);
  return parsed ? parsed.format('DD MMM, hh:mm a') : null;
};

// ---- Helpers ----
// Extract product name from an instance's metadata (multiple fallback paths)
const getProductName = (inst) => {
  const m = inst.metadata;
  if (!m) return 'Unknown Product';
  if (m.product_name) return m.product_name;
  if (m.po_payload?.product_info?.product_name) return m.po_payload.product_info.product_name;
  // Fallback: try to find product name from other metadata fields
  if (m.rfq_product_id) return `Product #${m.rfq_product_id}`;
  if (inst.entity_id) return `Product #${inst.entity_id}`;
  return 'Unknown Product';
};

// Mask vendor name to vendor code (VEN-XXX) for confidentiality
const maskVendor = (vendor) => {
  if (vendor.rfq_product_vendor_id) return `VEN-${vendor.rfq_product_vendor_id}`;
  if (vendor.vendor_id) return `VEN-${vendor.vendor_id}`;
  return 'Vendor';
};

// Group instances by product
const groupByProduct = (instances) => {
  const map = {};
  (instances || []).forEach(inst => {
    const key = inst.metadata?.rfq_product_id || inst.entity_id || 'unknown';
    if (!map[key]) map[key] = { product_id: key, product_name: getProductName(inst), instances: [] };
    map[key].instances.push(inst);
  });
  return Object.values(map);
};

// For technical: further group by evaluation_round within a product
const groupByRound = (instances) => {
  const map = {};
  instances.forEach(inst => {
    const round = inst.metadata?.evaluation_round || 1;
    if (!map[round]) map[round] = [];
    map[round].push(inst);
  });
  return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
};

// ============================================
// Main Component
// ============================================
const RFQLifecycleJourney = ({ rfqId, isTender = false, onActionComplete }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionContext, setActionContext] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!rfqId) return;
    setLoading(true);
    try {
      const res = await getLifecycleSummary(rfqId);
      const apiResp = res?.data || res;
      const ld = apiResp?.data || apiResp;
      if (ld?.phases?.length > 0) {
        setData(ld);
        // Auto-expand current phase only (not expired)
        const cur = ld.phases.find(p => p.status === 'current');
        if (cur) setExpandedPhases(prev => ({ ...prev, [cur.key]: true }));
      }
    } catch (err) { console.error('Lifecycle fetch error:', err); }
    finally { setLoading(false); }
  }, [rfqId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const togglePhase = (key) => setExpandedPhases(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (comment) => {
    if (!actionContext) return;
    setActionLoading(true);
    try {
      const p = { approval_instance_id: actionContext.id, action: actionType };
      if (actionContext.user_approval_step_id) p.approval_instance_step_id = actionContext.user_approval_step_id;
      if (comment?.trim()) p.comment = comment.trim();
      await submitApprovalAction(p);
      toast.success(`${actionType === 'APPROVE' ? 'Approved' : 'Rejected'} successfully`);
      setShowActionModal(false);
      fetchData(); onActionComplete?.();
    } catch (err) { toast.error(err?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const openAction = (type, inst) => { setActionType(type); setActionContext(inst); setShowActionModal(true); };
  const entityLabel = isTender ? 'Tender' : 'RFQ';

  if (loading) return (
    <div className={styles.root}><div className={styles.header}><h6 className={styles.title}>{entityLabel} Lifecycle Journey</h6></div><div className={styles.loading}><div className={styles.spinner} />Loading...</div></div>
  );
  if (!data?.phases?.length) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h6 className={styles.title}>{entityLabel} Lifecycle Journey</h6>
        <div className='d-flex gap-1 ms-3'>
          {data.current_stage === 'APPROVED_COMPLETED'
            ? <Badge bg="success" className={styles.curBadge}><BsCheckCircleFill size={10} className="me-1" />Completed</Badge>
            : data.current_phase && <Badge bg="warning" text="dark" className={styles.curBadge}><BsLightningChargeFill size={10} className="me-1" />{data.phases.find(p => p.status === 'current')?.label || 'In Progress'}</Badge>
          }
          {data.user_action_required && (
            <Badge bg="danger" className={styles.curBadge} style={{ marginLeft: 6 }}>
              <BsExclamationTriangleFill size={10} className="me-1" />{data.user_action_label || 'Action Required'}
            </Badge>
          )}
        </div>
        {data.user_can_approve && (() => {
          const inst = data.phases
            .flatMap(p => p.approval_instances || [])
            .find(i => i.id === data.user_approval_instance_id);
          if (!inst) return null;
          return (
            <div className={styles.headerActions} style={{ marginLeft: 'auto' }}>
              <Button variant="success" size="sm" className={styles.headerActBtn} onClick={() => openAction('APPROVE', inst)}>
                <BsShieldCheck size={13} className="me-1" />Approve
              </Button>
              <Button variant="danger" size="sm" className={styles.headerActBtn} onClick={() => openAction('REJECT', inst)}>
                <BsShieldX size={13} className="me-1" />Reject
              </Button>
            </div>
          );
        })()}
      </div>
      <div className={styles.tl}>
        {data.phases.map((phase, idx) => {
          console.log('phase', phase);
          const isLast = idx === data.phases.length - 1;
          const isOpen = !!expandedPhases[phase.key];
          const canOpen = phase.status !== 'upcoming' && phase.status !== 'skipped';
          const Icon = PHASE_ICONS[phase.key] || BsCircle;
          const isBlocked = phase.sub_status === 'no_vendors_participated';
          const isCancelled = (phase.is_cancelled || isBlocked) && phase.status === 'current';
          const isActionRequired = !isCancelled && phase.status === 'current' && data.user_action_required && data.user_action_phase === phase.key;
          const statusKey = isCancelled ? 'cancelled' : isActionRequired ? 'action_required' : phase.status;
          const rowClass = styles[`row_${statusKey}`] || styles[`row_${phase.status}`];
          const nodeClass = styles[`node_${statusKey}`] || styles[`node_${phase.status}`];
          const cardClass = styles[`card_${statusKey}`] || styles[`card_${phase.status}`];
          return (
            <div key={phase.key} className={`${styles.row} ${rowClass}`}>
              <div className={styles.rail}>
                <div className={`${styles.node} ${nodeClass}`}>
                  {phase.status === 'completed' && <BsCheckCircleFill size={14} />}
                  {phase.status === 'current' && !isCancelled && !isActionRequired && <div className={styles.pulse} />}
                  {phase.status === 'current' && isActionRequired && <div className={styles.pulse_action_required} />}
                  {isCancelled && <div className={styles.pulse_cancelled} />}
                  {phase.status === 'expired' && <BsExclamationTriangleFill size={14} />}
                  {phase.status === 'skipped' && <BsSkipForwardFill size={12} />}
                  {phase.status === 'upcoming' && <BsCircle size={14} />}
                </div>
                {!isLast && <div className={`${styles.wire} ${styles[`wire_${statusKey}`] || styles[`wire_${phase.status}`]}`} />}
              </div>
              <div className={styles.body}>
                <div className={`${styles.card} ${cardClass}`} onClick={() => canOpen && togglePhase(phase.key)} style={canOpen ? { cursor: 'pointer' } : undefined}>
                  <div className={styles.cardHead}>
                    <Icon size={15} className={styles.phaseIcon} />
                    <span className={styles.cardLabel}>{phase.label}</span>
                    {phase.status === 'current' && !isCancelled && !isActionRequired && <span className={styles.tagCur}>Current</span>}
                    {isActionRequired && <span className={styles.tagActionRequired}>Action Required</span>}
                    {isCancelled && <span className={styles.tagCurCancelled}>Current</span>}
                    {isBlocked && <span className={styles.tagCurCancelled}>Blocked</span>}
                    {isCancelled && !isBlocked && <span className={styles.tagCurCancelled}>Cancelled</span>}
                    {phase.status === 'expired' && <span className={styles.tagExp}>Expired</span>}
                    {phase.status === 'skipped' && <span className={styles.tagSkip}>Skipped</span>}
                    {phase.sub_status && phase.status === 'current' && !isCancelled && <span className={styles.tagSub}>{phase.sub_status.replace(/_/g, ' ')}</span>}
                    <span style={{ flex: 1 }} />
                    {/* Approve/Reject buttons are now in the top-level header for all stages */}
                    {phase.completed_at && <span className={styles.dateTag}><BsCalendar3 size={9} /> {fmt(phase.completed_at)}</span>}
                    {canOpen && <span className={styles.chev}>{isOpen ? '▲' : '▼'}</span>}
                  </div>
                  {phase.summary && <div className={styles.cardSum}>{phase.summary}</div>}
                  {/* Actors preview for upcoming phases only (current phases show inside the detail body) */}
                  {phase.status === 'upcoming' && (
                    <UpcomingActors actors={phase.upcoming_actors} phaseKey={phase.key} />
                  )}
                </div>
                {canOpen && isOpen && (
                  <div className={styles.detail}>
                    {phase.status === 'expired' && <div className={styles.expBanner}><BsExclamationTriangleFill size={14} />This {entityLabel.toLowerCase()} was auto-published. Approval was not completed in time.</div>}
                    <PhaseContent phase={phase} isExpired={phase.status === 'expired'} onApprove={(i) => openAction('APPROVE', i)} onReject={(i) => openAction('REJECT', i)} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ApprovalActionModal show={showActionModal} actionType={actionType} onClose={() => setShowActionModal(false)} onSubmit={handleSubmit} loading={actionLoading} entityLabel={entityLabel} />
    </div>
  );
};

// ============================================
// Phase Content Router
// ============================================
const PhaseContent = ({ phase, isExpired, onApprove, onReject }) => {
  const instances = phase.approval_instances || [];

  // RFQ Approval: flat list (no product grouping)
  if (phase.key === 'rfq_approval') {
    return <InstanceList instances={instances} isExpired={isExpired} onApprove={onApprove} onReject={onReject} />;
  }

  // Technical: group by product → by round
  if (phase.key === 'technical') {
    if (phase.awaiting_quotes) {
      return (
        <AwaitingQuotesPanel
          phase={phase}
          title={
            phase.sub_status === 'no_vendors_participated'
              ? 'Quote submission window closed without any eligible vendor participation'
              : 'Waiting for vendor quotes before technical evaluation can begin'
          }
        />
      );
    }

    const productGroups = groupByProduct(instances);
    const hasProducts = phase.products?.length > 0;
    const isEvaluating = phase.sub_status === 'evaluating';
    const isAwaitingQuotes = phase.sub_status === 'awaiting_quotes';

    // Resolve evaluators & approvers — always shown until the phase is completed
    const ah = phase.action_holders;
    const ua = phase.upcoming_actors;
    const evaluatorList = (ah?.users?.length ? ah.users : ua?.evaluators) || [];
    const evaluatorLabel = ah?.label || 'Technical Evaluators';
    const showActors = phase.status !== 'completed' && evaluatorList.length > 0;

    // If no approval instances yet (evaluating/awaiting stage), show who needs to act
    if (!productGroups.length && !hasProducts) {
      return (
        <div>
          {(isEvaluating || isAwaitingQuotes) && (
            <div className={styles.awaitingBanner}>
              <BsClipboardCheck size={14} />
              <div style={{ flex: 1 }}>
                <div><strong>{isAwaitingQuotes ? 'Waiting for vendor quotes before technical evaluation can begin' : 'Technical evaluation is in progress'}</strong></div>
                {evaluatorList.length > 0 && (
                  <div className={styles.actorSection}>
                    <span className={styles.actorLabel}>{evaluatorLabel}:</span>
                    <div className={styles.actionUserList}>
                      {evaluatorList.map((u, i) => (
                        <span key={u.id || i} className={styles.actionUserChip}><BsPersonFill size={10} /> {u.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {!isEvaluating && !isAwaitingQuotes && <div className={styles.empty}>No technical evaluation data</div>}
        </div>
      );
    }

    return (
      <div>
        {/* Always show evaluators/approvers until stage is completed */}
        {showActors && (
          <div className={styles.awaitingBanner} style={{ marginBottom: 12 }}>
            <BsClipboardCheck size={14} />
            <div style={{ flex: 1 }}>
              {evaluatorList.length > 0 && (
                <div className={styles.actorSection}>
                  <span className={styles.actorLabel}>{evaluatorLabel}:</span>
                  <div className={styles.actionUserList}>
                    {evaluatorList.map((u, i) => (
                      <span key={u.id || i} className={styles.actionUserChip}><BsPersonFill size={10} /> {u.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {phase.evaluators?.length > 0 && <div className={styles.evalBar}><BsPersonFill size={12} /> Evaluator{phase.evaluators.length > 1 ? 's' : ''}: <strong>{phase.evaluators.map(e => e.name).join(', ')}</strong></div>}
        <Accordion alwaysOpen defaultActiveKey={productGroups.map((pg, pi) => pg.instances.some(inst => inst.status === 'PENDING') ? String(pi) : null).filter(Boolean)} className={styles.prodAcc}>
          {productGroups.map((pg, pi) => {
            const rounds = groupByRound(pg.instances);
            const latestStatus = pg.instances[pg.instances.length - 1]?.status;
            return (
              <Accordion.Item key={pg.product_id} eventKey={String(pi)} className={styles.prodItem}>
                <Accordion.Header>
                  <div className={styles.prodHead}>
                    <span className={styles.prodBadge}>{pg.product_name}</span>
                    <Badge bg={latestStatus === 'APPROVED' ? 'success' : latestStatus === 'REJECTED' || latestStatus === 'CANCELLED' ? 'danger' : 'warning'} style={{ fontSize: '0.6rem' }}>{latestStatus}</Badge>
                    <span className={styles.pillMuted}>{pg.instances.length} attempt{pg.instances.length > 1 ? 's' : ''} · {rounds.length} round{rounds.length > 1 ? 's' : ''}</span>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  {rounds.map(([roundNum, roundInsts]) => (
                    <div key={roundNum} className={styles.roundSection}>
                      <div className={styles.roundHeader}>
                        <span className={styles.roundBadge}>Round {roundNum}</span>
                        <span className={styles.pillMuted}>
                          {roundInsts.length} attempt{roundInsts.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {roundInsts.map((inst, ii) => (
                        <TechInstanceCard key={inst.id} inst={inst} attemptNum={ii + 1} totalAttempts={roundInsts.length} isExpired={isExpired} onApprove={onApprove} onReject={onReject} isLast={ii === roundInsts.length - 1} />
                      ))}
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </div>
    );
  }

  // Commercial: group by product
  if (phase.key === 'commercial') {
    if (phase.awaiting_quotes) {
      return (
        <AwaitingQuotesPanel
          phase={phase}
          title={
            phase.sub_status === 'no_vendors_participated'
              ? 'Quote submission window closed without any eligible vendor participation'
              : 'Waiting for vendor quotes before commercial evaluation can begin'
          }
        />
      );
    }

    const productGroups = groupByProduct(instances);
    // Also merge in finalization/negotiation data from phase.products if available
    const phaseProducts = phase.products || [];

    // Merge phase products into groups
    phaseProducts.forEach(pp => {
      const existing = productGroups.find(pg => String(pg.product_id) === String(pp.product_id));
      if (existing) {
        existing.finalization = pp.finalization;
        existing.negotiation_rounds = pp.negotiation_rounds;
      } else if (pp.product_name) {
        productGroups.push({ product_id: pp.product_id, product_name: pp.product_name, instances: [], finalization: pp.finalization, negotiation_rounds: pp.negotiation_rounds });
      }
    });

    // Resolve actors — always shown until stage is completed
    const cAh = phase.action_holders;
    const cUa = phase.upcoming_actors;
    const isEval = phase.sub_status === 'evaluating';
    const isNeg = phase.sub_status === 'negotiating';
    const isApproving = phase.sub_status === 'approving';
    const currentActors = (cAh?.users?.length ? cAh.users : cUa?.evaluators) || [];
    const currentLabel = cAh?.label || (isApproving ? 'Pending Approvers' : 'Commercial Evaluators');
    const showCommercialActors = phase.status !== 'completed' && currentActors.length > 0;

    // Actors banner — reusable for both empty and data states
    const actorsBanner = showCommercialActors ? (
      <div className={styles.awaitingBanner} style={productGroups.length > 0 ? { marginBottom: 12 } : undefined}>
        <BsGraphUpArrow size={14} />
        <div style={{ flex: 1 }}>
          {!productGroups.length && <div><strong>{isEval ? 'Commercial evaluation is in progress' : isNeg ? 'Negotiation is ongoing' : isApproving ? 'Quotation approval is pending' : 'Commercial evaluation is in progress'}</strong></div>}
          {currentActors.length > 0 && (
            <div className={styles.actorSection}>
              <span className={styles.actorLabel}>{currentLabel}:</span>
              <div className={styles.actionUserList}>
                {currentActors.map((u, i) => (
                  <span key={u.id || i} className={styles.actionUserChip}><BsPersonFill size={10} /> {u.name}</span>
                ))}
                {cAh?.decision_rule && <span className={styles.futureRule}>{cAh.decision_rule === 'ANY' ? 'Any one' : 'All'}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null;

    if (!productGroups.length) {
      return actorsBanner || <div className={styles.empty}>No commercial evaluation data</div>;
    }
    return (
      <div>
        {actorsBanner}
      <Accordion alwaysOpen defaultActiveKey={productGroups.map((pg, pi) => pg.instances.some(inst => inst.status === 'PENDING') ? String(pi) : null).filter(Boolean)} className={styles.prodAcc}>
        {productGroups.map((pg, pi) => {
          const latestInst = pg.instances[pg.instances.length - 1];
          const latestStatus = latestInst?.status;
          // Try to get vendor/price from metadata
          const vendorName = latestInst?.metadata?.vendor_name || pg.finalization?.vendor_name || pg.finalization?.vendor_company;
          const totalValue = latestInst?.metadata?.po_payload?.total_value;
          return (
            <Accordion.Item key={pg.product_id} eventKey={String(pi)} className={styles.prodItem}>
              <Accordion.Header>
                <div className={styles.prodHead}>
                  <span className={styles.prodBadge}>{pg.product_name}</span>
                  {latestStatus && <Badge bg={latestStatus === 'APPROVED' ? 'success' : latestStatus === 'REJECTED' || latestStatus === 'CANCELLED' ? 'danger' : 'warning'} style={{ fontSize: '0.6rem' }}>{latestStatus}</Badge>}
                  {vendorName && <span className={styles.pillG}><BsArrowRight size={9} /> {vendorName}</span>}
                  {totalValue && <span className={styles.pillDark}>₹{Number(totalValue).toLocaleString('en-IN')}</span>}
                  {pg.instances.length > 0 && <span className={styles.pillMuted}>{pg.instances.length} attempt{pg.instances.length > 1 ? 's' : ''}</span>}
                </div>
              </Accordion.Header>
              <Accordion.Body>
                {/* Finalization */}
                {pg.finalization && (
                  <div className={styles.finCard}>
                    <div className={styles.finTitle}>Finalized Vendor</div>
                    <div className={styles.finRow}>
                      <BsCheckCircleFill size={14} style={{ color: '#22c55e' }} />
                      <span className={styles.finVendor}>{pg.finalization.vendor_company || pg.finalization.vendor_name}</span>
                      {pg.finalization.finalized_price != null && <span className={styles.finPrice}>₹{pg.finalization.finalized_price.toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                )}
                {/* Negotiation */}
                {pg.negotiation_rounds?.length > 0 && (
                  <div className={styles.negWrap}>
                    <div className={styles.secLabel}>Negotiation</div>
                    {pg.negotiation_rounds.map((r, ri) => (
                      <div key={ri} className={styles.negCard}>
                        <div className={styles.negHead}>
                          <strong>Round {r.round_number}</strong>
                          <Badge bg={r.status === 'ACTIVE' ? 'primary' : r.status === 'ENDED' ? 'warning' : 'secondary'} text={r.status === 'ENDED' ? 'dark' : undefined} style={{ fontSize: '0.58rem' }}>{r.status}</Badge>
                        </div>
                        {(r.target_price != null || r.end_date) && (
                          <div className={styles.negMeta}>
                            {r.target_price != null && (
                              <span className={styles.negMetaItem}>
                                <span className={styles.negMetaLabel}>Target:</span>
                                <span className={styles.negMetaValue}>₹{r.target_price.toLocaleString('en-IN')}</span>
                              </span>
                            )}
                            {r.end_date && (
                              <span className={styles.negMetaItem}>
                                <span className={styles.negMetaLabel}>Ends:</span>
                                <span className={styles.negMetaValue}>{moment.utc(r.end_date).local().format('DD/MM/YY, hh:mm A')}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {r.vendors?.map((v, vi) => (
                          <div key={vi} className={styles.negVRow}><span>{v.vendor_company || v.vendor_name}</span>{v.quoted_price != null ? <span className={styles.qPrice}>₹{v.quoted_price.toLocaleString('en-IN')}</span> : <span className={styles.noQ}>—</span>}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {/* Approval instances as timeline */}
                {pg.instances.length > 0 && (
                  <div>
                    <div className={styles.secLabel}>Quotation Approval History</div>
                    <InstanceList instances={pg.instances} isExpired={isExpired} onApprove={onApprove} onReject={onReject} hideProductName />
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
      </div>
    );
  }

  // Purchase Order — group approval instances by PO
  if (phase.key === 'purchase_order') {
    // Build PO summary rows
    const poSummary = phase.purchase_orders?.length > 0 ? (
      <div style={{ marginBottom: 10 }}>
        <div className={styles.secLabel}>Purchase Orders</div>
        {phase.purchase_orders.map((po, i) => (
          <div key={i} className={styles.poRow}>
            <strong>PO Number #{po.po_number || po.id}</strong>
            {po.product_names && <span className={styles.poGroupProducts}>{po.product_names}</span>}
            <span className={styles.poVendor}>{po.vendor_company || po.vendor_name}</span>
            <Badge bg={['approved','completed','sent'].includes(po.status) ? 'success' : po.status === 'pending_approval' ? 'warning' : ['rejected','rejected_by_vendor','cancelled'].includes(po.status) ? 'danger' : 'secondary'} style={{ fontSize: '0.6rem' }}>{po.status === 'rejected_by_vendor' ? 'Rejected by Vendor' : po.status?.replace(/_/g, ' ')}</Badge>
            {po.total_amount != null && <span className={styles.poBold} style={{ marginLeft: 'auto' }}>₹{po.total_amount.toLocaleString('en-IN')}</span>}
          </div>
        ))}
      </div>
    ) : null;

    // Group approval instances by PO (entity_id)
    const poGroups = {};
    (instances || []).forEach(inst => {
      const poId = inst.entity_id || 'unknown';
      if (!poGroups[poId]) poGroups[poId] = {
        po_id: poId,
        po_number: inst.metadata?.po_number,
        product_names: inst.metadata?.product_names,
        instances: [],
      };
      poGroups[poId].instances.push(inst);
    });
    const groups = Object.values(poGroups);

    return (
      <>
        {poSummary}
        {groups.length <= 1 && instances.length > 0 ? (
          <div>
            {groups[0]?.po_number && (
              <div className={styles.poGroupHeader}>
                <span>PO Number #{groups[0].po_number}</span>
                {groups[0].product_names && <span className={styles.poGroupProducts}>{groups[0].product_names}</span>}
              </div>
            )}
            <InstanceList instances={instances} isExpired={isExpired} onApprove={onApprove} onReject={onReject} />
          </div>
        ) : groups.length > 1 ? (
          <Accordion alwaysOpen defaultActiveKey={groups.map((g, i) => g.instances.some(inst => inst.status === 'PENDING') ? String(i) : null).filter(Boolean)} className={styles.prodAcc}>
            {groups.map((g, gi) => {
              const latestInst = g.instances[g.instances.length - 1];
              return (
                <Accordion.Item key={g.po_id} eventKey={String(gi)} className={styles.prodItem}>
                  <Accordion.Header>
                    <div className={styles.prodHead}>
                      <span className={styles.prodBadge}>PO Number #{g.po_number || g.po_id}</span>
                      {g.product_names && <span className={styles.poGroupProducts}>{g.product_names}</span>}
                      {latestInst?.status && <Badge bg={latestInst.status === 'APPROVED' ? 'success' : latestInst.status === 'REJECTED' || latestInst.status === 'CANCELLED' ? 'danger' : 'warning'} style={{ fontSize: '0.6rem' }}>{latestInst.status}</Badge>}
                      <span className={styles.pillMuted}>{g.instances.length} attempt{g.instances.length > 1 ? 's' : ''}</span>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body>
                    <InstanceList instances={g.instances} isExpired={isExpired} onApprove={onApprove} onReject={onReject} />
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        ) : null}
      </>
    );
  }

  return null;
};

const AwaitingQuotesPanel = ({ phase, title }) => {
  const stats = phase.awaiting_quotes || {};
  const ah = phase.action_holders;
  const ua = phase.upcoming_actors;
  const currentActors = (ah?.users?.length ? ah.users : ua?.evaluators) || [];
  const currentLabel = ah?.label || (phase.key === 'technical' ? 'Technical Evaluators' : 'Commercial Evaluators');
  const statCards = [
    { key: 'participated', label: 'Participated', value: stats.participated || 0 },
    { key: 'quotes', label: 'Sent Quotes', value: stats.sent_quotes || 0 },
    { key: 'remaining', label: 'Remaining', value: stats.remaining || 0 },
  ];

  return (
    <div className={styles.awaitingWrap}>
      <div className={`${styles.awaitingBanner} ${phase.sub_status === 'no_vendors_participated' ? styles.awaitingBannerClosed : ''}`}>
        <BsClipboardCheck size={14} />
        <div style={{ flex: 1 }}>
          <div><strong>{title}</strong></div>
          <div className={styles.awaitingMeta}>
            <span>{stats.total_invited || 0} vendor{stats.total_invited === 1 ? '' : 's'} invited</span>
            {stats.bid_end_date && <span>Deadline: {fmtBidDeadline(stats.bid_end_date)}</span>}
            {stats.regrets > 0 && <span>{stats.regrets} regret{stats.regrets === 1 ? '' : 's'}</span>}
          </div>
        </div>
      </div>

      <div className={styles.awaitingStats}>
        {statCards.map((card) => (
          <div key={card.key} className={styles.awaitingStatCard}>
            <div className={styles.awaitingStatValue}>{card.value}</div>
            <div className={styles.awaitingStatLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      {currentActors.length > 0 && (
        <div className={styles.actorSection}>
          <span className={styles.actorLabel}>{currentLabel}:</span>
          <div className={styles.actionUserList}>
            {currentActors.map((u, i) => (
              <span key={u.id || i} className={styles.actionUserChip}><BsPersonFill size={10} /> {u.name}</span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

// ============================================
// Tech Instance Card — shows metadata summary + ApprovalTimeline
// ============================================
const TechInstanceCard = ({ inst, attemptNum, totalAttempts, isExpired, onApprove, onReject, isLast }) => {
  const meta = inst.metadata || {};
  const vendors = meta.vendors || [];
  const passed = meta.passed_vendors || [];
  const failed = meta.failed_vendors || [];
  const notEval = meta.not_evaluated_vendors || [];
  const minScore = meta.minimum_passing_score;
  const effStatus = isExpired && inst.status === 'PENDING' ? 'EXPIRED' : inst.status;
  const statusBg = effStatus === 'APPROVED' ? 'success' : effStatus === 'REJECTED' || effStatus === 'EXPIRED' || effStatus === 'CANCELLED' ? 'danger' : 'warning';

  return (
    <div className={`${styles.instCard} ${styles[`inst_${effStatus.toLowerCase()}`]}`}>
      {/* Header */}
      <div className={styles.instHead}>
        <Badge bg={statusBg} style={{ fontSize: '0.6rem' }}>{effStatus === 'EXPIRED' ? 'Expired' : effStatus}</Badge>
        {totalAttempts > 1 && <span className={styles.instAttempt}>Attempt {attemptNum}</span>}
        {inst.initiated_by?.name && <span className={styles.instMeta}>by {inst.initiated_by.name}</span>}
        {inst.created_at && <span className={styles.instMeta}>{fmtTime(inst.created_at)}</span>}
      </div>

      {/* Tech eval summary from metadata */}
      {vendors.length > 0 && (
        <div className={styles.techSummary}>
          <div className={styles.techSummaryHead}>
            <span>Evaluation Results</span>
            {minScore != null && <span className={styles.pillA}>Min Score: {minScore}%</span>}
          </div>
          <div className={styles.vendorGrid}>
            {vendors.map((v, vi) => (
              <div key={vi} className={`${styles.vendorChip} ${v.is_passed ? styles.vendorChipPass : v.is_passed === false ? styles.vendorChipFail : styles.vendorChipNa}`}>
                <span className={styles.vendorChipName}>{maskVendor(v)}</span>
                {v.calculated_score != null && <span className={styles.vendorChipScore}>{v.calculated_score}%</span>}
                {v.status === 'NOT_EVALUATED' && <span className={styles.vendorChipNaLabel}>N/A</span>}
              </div>
            ))}
          </div>
          {notEval.length > 0 && (
            <div className={styles.notEvalRow}>
              Not evaluated: {notEval.map(v => maskVendor(v)).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Approval Timeline (reusing existing component) */}
      <div className={styles.timelineWrap}>
        <ApprovalTimeline
          steps={inst.steps || []}
          currentStep={inst.current_step}
          initiatedBy={inst.initiated_by}
          instanceStatus={isExpired && inst.status === 'PENDING' ? 'BACKLOG' : inst.status}
          isActionRequired={inst.can_user_approve && inst.status === 'PENDING' && !isExpired}
        />
      </div>

      {/* Action buttons */}
      {inst.status === 'PENDING' && inst.can_user_approve && isLast && !isExpired && (
        <div className={styles.actRow}>
          <Button variant="success" size="sm" className={styles.actBtn} onClick={() => onApprove(inst)}><BsShieldCheck size={13} className="me-1" />Approve</Button>
          <Button variant="outline-danger" size="sm" className={styles.actBtn} onClick={() => onReject(inst)}><BsShieldX size={13} className="me-1" />Reject</Button>
        </div>
      )}
    </div>
  );
};

// ============================================
// Instance List — for RFQ approval, commercial, PO (uses ApprovalTimeline)
// ============================================
const InstanceList = ({ instances, isExpired, onApprove, onReject, hideProductName = false }) => {
  if (!instances?.length) return null;
  return (
    <div className={styles.instList}>
      {instances.map((inst, i) => {
        const isLast = i === instances.length - 1;
        const effStatus = isExpired && inst.status === 'PENDING' ? 'EXPIRED' : inst.status;
        const statusBg = effStatus === 'APPROVED' ? 'success' : effStatus === 'REJECTED' || effStatus === 'EXPIRED' || effStatus === 'CANCELLED' ? 'danger' : 'warning';
        const ctx = [];
        if (!hideProductName && inst.metadata?.product_name) ctx.push(inst.metadata.product_name);
        if (inst.metadata?.evaluation_round) ctx.push(`Round ${inst.metadata.evaluation_round}`);
        else if (inst.metadata?.round_number) ctx.push(`Round ${inst.metadata.round_number}`);

        return (
          <div key={inst.id || i} className={`${styles.instCard} ${styles[`inst_${effStatus.toLowerCase()}`]}`}>
            <div className={styles.instHead}>
              <Badge bg={statusBg} style={{ fontSize: '0.6rem' }}>{effStatus === 'EXPIRED' ? 'Expired' : effStatus}</Badge>
              <span className={styles.instAttempt}>{instances.length > 1 ? `Attempt ${i + 1}` : 'Approval Instance'}</span>
              {ctx.length > 0 && <span className={styles.instCtx}>{ctx.join(' · ')}</span>}
              {inst.initiated_by?.name && <span className={styles.instMeta}>by {inst.initiated_by.name}</span>}
              {inst.created_at && <span className={styles.instMeta}>{fmtTime(inst.created_at)}</span>}
            </div>
            <div className={styles.timelineWrap}>
              <ApprovalTimeline
                steps={inst.steps || []}
                currentStep={inst.current_step}
                initiatedBy={inst.initiated_by}
                instanceStatus={isExpired && inst.status === 'PENDING' ? 'BACKLOG' : inst.status}
                isActionRequired={inst.can_user_approve && inst.status === 'PENDING' && !isExpired}
              />
            </div>
            {inst.status === 'PENDING' && inst.can_user_approve && isLast && !isExpired && (
              <div className={styles.actRow}>
                <Button variant="success" size="sm" className={styles.actBtn} onClick={() => onApprove(inst)}><BsShieldCheck size={13} className="me-1" />Approve</Button>
                <Button variant="outline-danger" size="sm" className={styles.actBtn} onClick={() => onReject(inst)}><BsShieldX size={13} className="me-1" />Reject</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// Upcoming Actors Preview (for future phases)
// ============================================
const UpcomingActors = ({ actors, phaseKey, isCurrent = false }) => {
  const hasActors = actors && (actors.evaluators?.length > 0 || actors.approver_steps?.length > 0);
  const prefix = isCurrent ? '' : 'Future ';
  const evalLabels = { technical: `${prefix}evaluators`, commercial: `${prefix}evaluators`, purchase_order: `${prefix}PO initiators` };
  const evalLabel = evalLabels[phaseKey] || `${prefix}evaluators`;

  return (
    <div className={styles.futureActors}>
      {actors?.evaluators?.length > 0 && (
        <div className={styles.futureRow}>
          <span className={styles.futureLabel}>{evalLabel}:</span>
          <span className={styles.futureNames}>{actors.evaluators.map(u => u.name).join(', ')}</span>
        </div>
      )}
      {actors?.approver_steps?.length > 0 ? actors.approver_steps.map((step, si) => (
        <div key={si} className={styles.futureRow}>
          <span className={styles.futureLabel}>
            {prefix}approvers{actors.approver_steps.length > 1 ? ` (Step ${step.step_order})` : ''}:
          </span>
          <span className={styles.futureNames}>{step.approvers.map(u => u.name).join(', ')}</span>
          <span className={styles.futureRule}>{step.decision_rule === 'ANY' ? 'Any one can approve' : 'All must approve'}</span>
        </div>
      )) : (
        <div className={styles.futureRow}>
          <span className={styles.futureNoPolicy}>No approval policy configured yet. Once approvers are set by the admin, they will appear here.</span>
        </div>
      )}
      {hasActors && !isCurrent && <div className={styles.futureDisclaimer}>Subject to change if admin updates the policy</div>}
    </div>
  );
};

export default RFQLifecycleJourney;
