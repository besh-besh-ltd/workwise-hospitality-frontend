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

const PHASE_META = {
  rfq_approval: { icon: BsFileEarmarkCheck, color: '#f59e0b' },
  technical: { icon: BsClipboardCheck, color: '#0ea5e9' },
  commercial: { icon: BsGraphUpArrow, color: '#6366f1' },
  purchase_order: { icon: BsBoxSeam, color: '#14b8a6' },
};

const fmt = (d) => d ? moment.utc(d).utcOffset('+05:30').format('DD MMM YYYY') : null;
const fmtTime = (d) => d ? moment.utc(d).utcOffset('+05:30').format('DD MMM, hh:mm a') : null;

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
        const cur = ld.phases.find(p => p.status === 'current' || p.status === 'expired');
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
        {data.current_phase && <Badge bg="warning" text="dark" className={styles.curBadge}><BsLightningChargeFill size={10} className="me-1" />{data.phases.find(p => p.status === 'current')?.label || 'In Progress'}</Badge>}
      </div>
      <div className={styles.tl}>
        {data.phases.map((phase, idx) => {
          const isLast = idx === data.phases.length - 1;
          const isOpen = !!expandedPhases[phase.key];
          const canOpen = phase.status !== 'upcoming' && phase.status !== 'skipped';
          const m = PHASE_META[phase.key];
          const Icon = m.icon;
          return (
            <div key={phase.key} className={`${styles.row} ${styles[`row_${phase.status}`]}`}>
              <div className={styles.rail}>
                <div className={`${styles.node} ${styles[`node_${phase.status}`]}`}>
                  {phase.status === 'completed' && <BsCheckCircleFill size={20} style={{ color: m.color }} />}
                  {phase.status === 'current' && <div className={styles.pulse} style={{ background: m.color }} />}
                  {phase.status === 'expired' && <BsExclamationTriangleFill size={18} style={{ color: '#dc3545' }} />}
                  {phase.status === 'skipped' && <BsSkipForwardFill size={14} style={{ color: '#cbd5e1' }} />}
                  {phase.status === 'upcoming' && <BsCircle size={18} style={{ color: '#d1d5db' }} />}
                </div>
                {!isLast && <div className={styles.wire} style={phase.status === 'completed' ? { background: m.color } : phase.status === 'expired' ? { background: '#fca5a5' } : undefined} />}
              </div>
              <div className={styles.body}>
                <div className={`${styles.card} ${styles[`card_${phase.status}`]}`} onClick={() => canOpen && togglePhase(phase.key)} style={canOpen ? { cursor: 'pointer' } : undefined}>
                  <div className={styles.cardHead}>
                    <Icon size={16} style={{ color: phase.status === 'skipped' || phase.status === 'upcoming' ? '#94a3b8' : m.color, flexShrink: 0 }} />
                    <span className={styles.cardLabel}>{phase.label}</span>
                    {phase.status === 'current' && <span className={styles.tagCur}>Current</span>}
                    {phase.status === 'expired' && <span className={styles.tagExp}>Expired</span>}
                    {phase.status === 'skipped' && <span className={styles.tagSkip}>Skipped</span>}
                    {phase.sub_status && phase.status === 'current' && <span className={styles.tagSub}>{phase.sub_status.replace(/_/g, ' ')}</span>}
                    <span style={{ flex: 1 }} />
                    {phase.completed_at && <span className={styles.dateTag}><BsCalendar3 size={9} /> {fmt(phase.completed_at)}</span>}
                    {canOpen && <span className={styles.chev}>{isOpen ? '▲' : '▼'}</span>}
                  </div>
                  {phase.summary && <div className={styles.cardSum}>{phase.summary}</div>}
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
    const productGroups = groupByProduct(instances);
    const hasProducts = phase.products?.length > 0;
    const isEvaluating = phase.sub_status === 'evaluating';

    // If no approval instances yet (evaluating stage), show who needs to act
    if (!productGroups.length && !hasProducts) {
      const ah = phase.action_holders;
      const actionUsers = ah?.users?.map(u => u.name).filter(Boolean) || [];
      return (
        <div>
          {isEvaluating && (
            <div className={styles.awaitingBanner}>
              <BsClipboardCheck size={14} />
              <div>
                <div><strong>Technical evaluation is in progress</strong></div>
                {actionUsers.length > 0 ? (
                  <div style={{ marginTop: 4 }}>
                    {ah?.label || 'Awaiting action from'}:
                    <div className={styles.actionUserList}>
                      {actionUsers.map((name, i) => (
                        <span key={i} className={styles.actionUserChip}><BsPersonFill size={10} /> {name}</span>
                      ))}
                    </div>
                  </div>
                ) : phase.evaluators?.length > 0 ? (
                  <div style={{ marginTop: 4 }}>Awaiting evaluation from {phase.evaluators.map(e => e.name).join(', ')}</div>
                ) : null}
              </div>
            </div>
          )}
          {!isEvaluating && <div className={styles.empty}>No technical evaluation data</div>}
        </div>
      );
    }

    return (
      <div>
        {phase.evaluators?.length > 0 && <div className={styles.evalBar}><BsPersonFill size={12} /> Evaluator{phase.evaluators.length > 1 ? 's' : ''}: <strong>{phase.evaluators.map(e => e.name).join(', ')}</strong></div>}
        <Accordion alwaysOpen className={styles.prodAcc}>
          {productGroups.map((pg, pi) => {
            const rounds = groupByRound(pg.instances);
            const latestStatus = pg.instances[pg.instances.length - 1]?.status;
            return (
              <Accordion.Item key={pg.product_id} eventKey={String(pi)} className={styles.prodItem}>
                <Accordion.Header>
                  <div className={styles.prodHead}>
                    <span className={styles.prodBadge}>{pg.product_name}</span>
                    <Badge bg={latestStatus === 'APPROVED' ? 'success' : latestStatus === 'REJECTED' ? 'danger' : 'warning'} style={{ fontSize: '0.6rem' }}>{latestStatus}</Badge>
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

    if (!productGroups.length) {
      // Show who needs to act when no data yet
      const ah = phase.action_holders;
      const actionUsers = ah?.users?.map(u => u.name).filter(Boolean) || [];
      const isEval = phase.sub_status === 'evaluating';
      const isNeg = phase.sub_status === 'negotiating';
      const isApproving = phase.sub_status === 'approving';

      if (actionUsers.length > 0 || isEval || isNeg || isApproving) {
        const stageText = isEval ? 'Commercial evaluation is in progress' : isNeg ? 'Negotiation is ongoing' : isApproving ? 'Quotation approval is pending' : 'Commercial evaluation is in progress';
        return (
          <div className={styles.awaitingBanner}>
            <BsGraphUpArrow size={14} />
            <div>
              <div><strong>{stageText}</strong></div>
              {actionUsers.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {ah?.label || 'Awaiting action from'}:
                  <div className={styles.actionUserList}>
                    {actionUsers.map((name, i) => (
                      <span key={i} className={styles.actionUserChip}><BsPersonFill size={10} /> {name}</span>
                    ))}
                  </div>
                  {ah?.decision_rule && (
                    <span className={styles.ruleChip}>{ah.decision_rule === 'ANY' ? 'Any one can approve' : 'All must approve'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }
      return <div className={styles.empty}>No commercial evaluation data</div>;
    }
    return (
      <Accordion alwaysOpen className={styles.prodAcc}>
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
                  {latestStatus && <Badge bg={latestStatus === 'APPROVED' ? 'success' : latestStatus === 'REJECTED' ? 'danger' : 'warning'} style={{ fontSize: '0.6rem' }}>{latestStatus}</Badge>}
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
                        <strong>Round {r.round_number}</strong>
                        <Badge bg={r.status === 'ACTIVE' ? 'primary' : 'secondary'} style={{ fontSize: '0.58rem' }} className="ms-2">{r.status}</Badge>
                        {r.vendors?.map((v, vi) => (
                          <div key={vi} className={styles.negVRow}><span>{v.vendor_company || v.vendor_name}</span>{v.quoted_price != null ? <span className={styles.qPrice}>₹{v.quoted_price.toLocaleString('en-IN')}</span> : <span className={styles.noQ}>—</span>}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {/* Approval instances as timeline */}
                {pg.instances.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div className={styles.secLabel}>Quotation Approval History</div>
                    <InstanceList instances={pg.instances} isExpired={isExpired} onApprove={onApprove} onReject={onReject} />
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    );
  }

  // Purchase Order
  if (phase.key === 'purchase_order') {
    return (
      <>
        {phase.purchase_orders?.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div className={styles.secLabel}>Purchase Orders</div>
            {phase.purchase_orders.map((po, i) => (
              <div key={i} className={styles.poRow}>
                <strong>{po.po_number || `PO #${po.id}`}</strong>
                <span className={styles.poVendor}>{po.vendor_company || po.vendor_name}</span>
                <Badge bg={['approved','completed','sent'].includes(po.status) ? 'success' : po.status === 'pending_approval' ? 'warning' : 'secondary'} style={{ fontSize: '0.6rem' }}>{po.status?.replace(/_/g, ' ')}</Badge>
                {po.total_amount != null && <span className={styles.poBold} style={{ marginLeft: 'auto' }}>₹{po.total_amount.toLocaleString('en-IN')}</span>}
              </div>
            ))}
          </div>
        )}
        {instances.length > 0 && <InstanceList instances={instances} isExpired={isExpired} onApprove={onApprove} onReject={onReject} />}
      </>
    );
  }

  return null;
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
  const statusBg = effStatus === 'APPROVED' ? 'success' : effStatus === 'REJECTED' || effStatus === 'EXPIRED' ? 'danger' : 'warning';

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
const InstanceList = ({ instances, isExpired, onApprove, onReject }) => {
  if (!instances?.length) return null;
  return (
    <div className={styles.instList}>
      {instances.map((inst, i) => {
        const isLast = i === instances.length - 1;
        const effStatus = isExpired && inst.status === 'PENDING' ? 'EXPIRED' : inst.status;
        const statusBg = effStatus === 'APPROVED' ? 'success' : effStatus === 'REJECTED' || effStatus === 'EXPIRED' ? 'danger' : 'warning';
        const ctx = [];
        if (inst.metadata?.product_name) ctx.push(inst.metadata.product_name);
        if (inst.metadata?.round_number) ctx.push(`Round ${inst.metadata.round_number}`);
        if (inst.metadata?.po_number) ctx.push(inst.metadata.po_number);

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

export default RFQLifecycleJourney;
