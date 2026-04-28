import React, { useState } from 'react';
import { Card, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Calendar, Clock, ChevronDown, ChevronUp, MessageCircle, User, UserCheck, Users, Folder, FileText, Gavel, AlertTriangle, Zap, Send, UserX } from 'lucide-react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { getRFQPublishState, formatRFQNumber, textCapitalize, canEditRfq } from '@/utils/sharedFunctions';
import PublishDateTimer from '@/components/shared/PublishDateTimer';
import { getStatusConfig, STATUS_CONFIG, getLifecycleConfig, LIFECYCLE_STAGES_ORDERED } from './statusConfig';
import styles from './RFQCard.module.scss';

const RFQ_TIMEZONE_OFFSET = '+05:30';
const HAS_EXPLICIT_TIMEZONE = /([zZ]|[+-]\d{2}:?\d{2})$/;

const parseBidEndDate = (value) => {
  if (!value) return null;
  const parsed = HAS_EXPLICIT_TIMEZONE.test(value)
    ? moment.parseZone(value).utcOffset(RFQ_TIMEZONE_OFFSET)
    : moment(value).utcOffset(RFQ_TIMEZONE_OFFSET, true);
  return parsed.isValid() ? parsed : null;
};

const RFQCard = ({ data, isPendingApproval = false, onSendReminder, hasEditPermission = true, isDraft = false, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoPublished, setIsAutoPublished] = useState(false);
  const [showLifecycleTooltip, setShowLifecycleTooltip] = useState(false);

  // WH-69: edit permission helper — see canEditRfq() in sharedFunctions.js
  const currentUser = useSelector((state) => state.userProfile);
  const editPermission = canEditRfq(data, currentUser);

  const publishState = getRFQPublishState(data);
  const isTender = data.is_tender === 1 || data.is_tender === true;
  const isBacklog = isPendingApproval && data.is_published === 1 && data.status === 1;
  const statusConfig = isBacklog ? STATUS_CONFIG.PUBLISHED_WITHOUT_APPROVAL : isDraft ? STATUS_CONFIG.DRAFT : getStatusConfig(data, publishState);
  const StatusIcon = statusConfig.icon;

  const totalVendors = data.vendors?.[0]?.total_vendors || 0;
  const quotesReceived = data.vendors?.[0]?.quote_received || 0;
  const quotesRegretted = data.vendors?.[0]?.quote_regretted || 0;
  const allQuotesReceived = totalVendors > 0 && (quotesReceived + quotesRegretted) === totalVendors;

  const lifecycleConfig = data.lifecycle_stage ? getLifecycleConfig(data.lifecycle_stage) : null;
  const currentStageIndex = data.lifecycle_stage ? LIFECYCLE_STAGES_ORDERED.indexOf(data.lifecycle_stage) : -1;
  const bidEndAt = parseBidEndDate(data.bid_end_date);
  const formattedBidEndDate = bidEndAt ? bidEndAt.format('DD-MM-YYYY hh:mm A') : '---';

  const handleToggleExpand = () => setIsExpanded(!isExpanded);

  const getDaysRemaining = () => {
    if (!bidEndAt) return null;
    const nowIST = moment().utcOffset(RFQ_TIMEZONE_OFFSET);
    if (bidEndAt.isSameOrBefore(nowIST)) return { text: 'Ended', urgent: true };
    const endDay = bidEndAt.clone().startOf('day');
    const todayDay = nowIST.clone().startOf('day');
    const days = endDay.diff(todayDay, 'days');
    if (days === 0) return { text: 'Ends Today', urgent: true };
    if (days === 1) return { text: 'Ends Tomorrow', urgent: true };
    if (days <= 3) return { text: `${days}d left`, urgent: true };
    return { text: `${days}d left`, urgent: false };
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card
      className={`${styles.rfqCard} ${isExpanded ? styles.expanded : ''} ${statusConfig.pulse ? styles.pulse : ''} ${isBacklog ? styles.backlogCard : ''}`}
      style={{ borderLeftColor: statusConfig.borderColor }}
    >
      <div className={styles.compactView} onClick={handleToggleExpand}>
        {/* ── Row 1: Badges + Title + Lifecycle + Expand ── */}
        <div className={styles.compactRow1}>
          <span className={`${styles.typeBadge} ${isTender ? styles.tenderType : styles.rfqType}`}>
            {isTender ? <Gavel size={11} /> : <FileText size={11} />}
            {isTender ? 'Tender' : 'RFQ'}
          </span>

          <span
            className={`${styles.statusBadge} ${statusConfig.pulse ? styles.pulseAnimation : ''}`}
            style={{ backgroundColor: statusConfig.badgeBackground, color: statusConfig.badgeText }}
          >
            <StatusIcon size={11} />
            <span>{statusConfig.label}</span>
          </span>

          {isAutoPublished && (
            <span className={styles.statusBadge} style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
              <Zap size={11} /><span>Auto Published</span>
            </span>
          )}

          <span className={styles.title} style={!data.title && isDraft ? { color: '#8c939a', fontStyle: 'italic' } : undefined} title={data.title || (isDraft ? 'Untitled' : formatRFQNumber(data.rfq_no, data.is_tender))}>
            {data.title || (isDraft ? 'Untitled' : formatRFQNumber(data.rfq_no, data.is_tender))}
          </span>

          <span className={styles.rfqNumberInline}>{formatRFQNumber(data.rfq_no, data.is_tender)}</span>

          {/* Unread Queries */}
          {data.unseen_query_count > 0 && (
            <Badge bg="danger" className={styles.queryBadgeCompact}>
              <MessageCircle size={10} /><span>{data.unseen_query_count}</span>
            </Badge>
          )}

          {/* Lifecycle Pill */}
          {lifecycleConfig && !isDraft && statusConfig.key !== 'terminated' && (() => {
            const stagesFiltered = LIFECYCLE_STAGES_ORDERED.filter(k => k !== 'TECHNICAL_REJECTED');
            const stepNum = stagesFiltered.indexOf(data.lifecycle_stage) + 1;
            return (
              <div
                className={styles.lifecycleWrap}
                onMouseEnter={() => setShowLifecycleTooltip(true)}
                onMouseLeave={() => setShowLifecycleTooltip(false)}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.lifecyclePill}>
                  <span className={styles.lcDot} style={{ backgroundColor: lifecycleConfig.dotColor }} />
                  <span className={styles.lcLabel}>{lifecycleConfig.label}</span>
                  {data.action_holders?.users?.length > 0 && (
                    <>
                      <span className={styles.lcSep} />
                      <span className={styles.lcActors}>
                        <User size={10} />
                        <span>{data.action_holders.users.length}</span>
                      </span>
                    </>
                  )}
                </div>

                {showLifecycleTooltip && (
                  <div className={styles.lcTooltip}>
                    <div className={styles.lcTTTop}>
                      <span className={styles.lcTTDot} style={{ backgroundColor: lifecycleConfig.dotColor }} />
                      <div className={styles.lcTTInfo}>
                        <span className={styles.lcTTLabel}>{lifecycleConfig.label}</span>
                        <span className={styles.lcTTDesc}>{lifecycleConfig.description}</span>
                      </div>
                    </div>
                    <div className={styles.lcTTProgress}>
                      <span className={styles.lcTTProgressLabel}>Progress</span>
                      <div className={styles.lcTTBar}>
                        {stagesFiltered.map((key, i) => {
                          const done = i < stepNum - 1;
                          const current = key === data.lifecycle_stage;
                          return <span key={key} className={`${styles.lcTTBarSeg} ${done ? styles.lcTTBarDone : ''} ${current ? styles.lcTTBarCur : ''}`} style={done || current ? { backgroundColor: lifecycleConfig.dotColor } : {}} />;
                        })}
                      </div>
                    </div>
                    {data.action_holders?.users?.length > 0 && (
                      <div className={styles.lcTTActors}>
                        <div className={styles.lcTTActorsHeader}>
                          <UserCheck size={12} />
                          <span>{data.action_holders.label}</span>
                          {data.action_holders.decision_rule && (
                            <span className={styles.lcTTRuleTag}>
                              {data.action_holders.decision_rule === "ANY" ? "Any one" : "All must approve"}
                            </span>
                          )}
                        </div>
                        <div className={styles.lcTTActorsList}>
                          {data.action_holders.users.map(user => (
                            <div key={user.id} className={styles.lcTTActor}>
                              <span className={styles.lcTTActorDot} />
                              <span className={styles.lcTTActorName}>{user.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div className={styles.expandToggle}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {/* ── Row 2: Metadata (vendors, date, project, created) ── */}
        <div className={styles.compactRow2}>
          {!isDraft && (
            <>
              <span className={styles.metaChip}>
                <Users size={12} className={styles.vendorIconBlue} />
                <span>{totalVendors} Invited</span>
              </span>
              <span className={styles.metaSep} />
              <span className={styles.metaChip}>
                <Send size={12} className={allQuotesReceived ? styles.vendorIconGreen : styles.vendorIconOrange} />
                <span>{quotesReceived} Participated</span>
              </span>
              {quotesRegretted > 0 && (
                <>
                  <span className={styles.metaSep} />
                  <span className={styles.metaChip}>
                    <UserX size={12} className={styles.vendorIconRed} />
                    <span>{quotesRegretted} Regretted</span>
                  </span>
                </>
              )}
            </>
          )}

          {!isDraft && (
            <>
              <span className={styles.metaSep} />
              {publishState.isPrePublishState && data.tender_publish_date ? (
                <span className={styles.metaChip}>
                  <PublishDateTimer publishDate={data.tender_publish_date} variant="badge" showLabel={true} />
                </span>
              ) : bidEndAt ? (
                <>
                  <span className={styles.metaChip}>
                    <Calendar size={12} />
                    <span>Bid ends {bidEndAt.format('DD MMM, YYYY')}</span>
                  </span>
                  {daysRemaining && (
                    <span className={`${styles.metaChip} ${
                      daysRemaining.text === 'Ended' ? styles.daysRed
                      : daysRemaining.urgent ? styles.daysYellow
                      : styles.daysGreen
                    }`}>
                      {daysRemaining.text}
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.metaChip}>
                  <Calendar size={12} />
                  <span>No deadline set</span>
                </span>
              )}
            </>
          )}

          {data.project_name && (
            <>
              <span className={styles.metaSep} />
              <span className={styles.metaChip}>
                <Folder size={12} />
                <span>{data.project_name}</span>
              </span>
            </>
          )}

          {data.contact_name && (
            <>
              <span className={styles.metaSep} />
              <span className={styles.metaChip}>
                <User size={12} />
                <span>{data.contact_name}</span>
              </span>
            </>
          )}

          {data.timestamp && (
            <>
              <span className={styles.metaSep} />
              <span className={styles.metaChip}>
                <Clock size={12} />
                <span>{moment(data.timestamp).format('DD MMM YYYY')}</span>
              </span>
            </>
          )}

          {isDraft && data.status === 5 && (
            <>
              <span className={styles.metaSep} />
              <span className={styles.statusBadge} style={{ backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffc107', fontSize: '0.7rem' }}>
                Previously submitted for publishing
              </span>
            </>
          )}
        </div>
      </div>

      {isBacklog && (
        <div className={styles.backlogBanner}>
          <div className={styles.backlogIcon}><AlertTriangle size={14} /></div>
          <div className={styles.backlogText}>
            <strong>Published without approval.</strong>{' '}
            This {isTender ? 'tender' : 'RFQ'} was auto-published as the approval was not completed in time. No action is required.
          </div>
        </div>
      )}

      <div className={`${styles.expandedView} ${isExpanded ? styles.visible : ''}`}>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}><User size={14} /><span>Created by: <strong>{data.contact_name || '---'}</strong></span></div>
          {data.is_tender !== 1 && <div className={styles.metaItem}><span>Type: <strong>{textCapitalize(data.rfq_type) || 'N/A'}</strong></span></div>}
          <div className={styles.metaItem}><span>Reverse Auction: <strong>{data.reverse_auction === 1 ? 'Enabled' : 'Disabled'}</strong></span></div>
        </div>
        <div className={styles.timelineRow}>
          {isDraft ? (
            <>
              <div className={styles.timelineItem}><Calendar size={14} /><span>Created: <strong>{moment(data.timestamp).format('DD-MM-YYYY')}</strong></span></div>
              <div className={styles.timelineItem}><Clock size={14} /><span>Bid Ends: <strong>{formattedBidEndDate}</strong></span></div>
            </>
          ) : publishState.isPrePublishState && data.tender_publish_date ? (
            <div className={styles.timelineItem}><Calendar size={14} /><span>Scheduled:</span><PublishDateTimer publishDate={data.tender_publish_date} variant="full" /></div>
          ) : (
            <>
              <div className={styles.timelineItem}><Calendar size={14} /><span>Published: <strong>{moment(data.tender_publish_date || data.timestamp).format('DD-MM-YYYY')}</strong></span></div>
              {data.vendor_clarification_date && (
                <div className={styles.timelineItem}><Clock size={14} /><span>Clarification Ends: <strong>{moment(data.vendor_clarification_date).format('DD-MM-YYYY hh:mm A')}</strong></span></div>
              )}
              <div className={styles.timelineItem}><Clock size={14} /><span>Bid Ends: <strong>{formattedBidEndDate}</strong></span></div>
            </>
          )}
        </div>
        <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
          {isDraft ? (
            <>
              {currentUser && String(data.created_by) === String(currentUser.id) ? (
                <>
                  <Link href={`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data.id}`}>
                    <button className={`btn btn-sm ${styles.actionBtn} ${styles.editBtn}`}>Edit Draft</button>
                  </Link>
                  {onDelete && (
                    <button className={`btn btn-sm ${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete(data)}>Delete</button>
                  )}
                </>
              ) : (
                <Link href={`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data.id}&view_only=true`}>
                  <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>View Draft</button>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data.id}`}>
                <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>
                  View Details
                </button>
              </Link>

              {/* WH-69: Edit button is always rendered, but disabled with a
                  hover tooltip when canEditRfq() says no. The user sees the
                  exact reason (not the creator, bid window passed, all POs
                  finalized, RFQ closed, etc). Same logic as the details page. */}
              {editPermission.allowed && hasEditPermission ? (
                <Link href={publishState.editUrl(data.id)}>
                  <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>Edit</button>
                </Link>
              ) : (
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id={`edit-disabled-${data.id}`}>
                      {!hasEditPermission
                        ? 'You do not have permission to edit this RFQ.'
                        : editPermission.reason}
                    </Tooltip>
                  }
                >
                  <span className="d-inline-block">
                    <button
                      className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}
                      disabled
                      style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}
                    >
                      Edit
                    </button>
                  </span>
                </OverlayTrigger>
              )}
              {!publishState.isPrePublishState && !isPendingApproval && statusConfig.key !== 'terminated' && (
                <Link href={`/dashboard/buyer/query?rfq_id=${data.id}&role=buyer&source=rfq-management`}>
                  <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>Queries{data.unseen_query_count > 0 && <Badge bg="danger" className="ms-1" style={{ fontSize: '0.65rem' }}>{data.unseen_query_count}</Badge>}</button>
                </Link>
              )}
              {!publishState.isPrePublishState && !allQuotesReceived && !data.is_finalized && publishState.isOpen && !isPendingApproval && (
                <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`} onClick={() => onSendReminder?.(data)}>Send Reminder</button>
              )}
              {isPendingApproval && !isBacklog && (
                <Link href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data.id}`}>
                  <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>
                    View Details
                  </button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RFQCard;
