import React, { useState } from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Calendar, Clock, ChevronDown, ChevronUp, MessageCircle, User, UserCheck, Users, Folder, FileText, Gavel, AlertTriangle, Zap, Send } from 'lucide-react';
import Link from 'next/link';
import moment from 'moment';
import { getRFQPublishState, formatRFQNumber, textCapitalize } from '@/utils/sharedFunctions';
import PublishDateTimer from '@/components/shared/PublishDateTimer';
import { getStatusConfig, STATUS_CONFIG, getLifecycleConfig, LIFECYCLE_STAGES_ORDERED } from './statusConfig';
import styles from './RFQCard.module.scss';

const RFQCard = ({ data, isPendingApproval = false, onSendReminder, hasEditPermission = true, isDraft = false, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoPublished, setIsAutoPublished] = useState(false);
  const [showLifecycleTooltip, setShowLifecycleTooltip] = useState(false);

  const publishState = getRFQPublishState(data);
  const isTender = data.is_tender === 1 || data.is_tender === true;
  const isBacklog = isPendingApproval && data.is_published === 1 && data.status === 1;
  const statusConfig = isBacklog ? STATUS_CONFIG.PUBLISHED_WITHOUT_APPROVAL : isDraft ? STATUS_CONFIG.DRAFT : getStatusConfig(data, publishState);
  const StatusIcon = statusConfig.icon;

  const totalVendors = data.vendors?.[0]?.total_vendors || 0;
  const quotesReceived = data.vendors?.[0]?.quote_received || 0;
  const allQuotesReceived = totalVendors > 0 && quotesReceived === totalVendors;

  const lifecycleConfig = data.lifecycle_stage ? getLifecycleConfig(data.lifecycle_stage) : null;
  const currentStageIndex = data.lifecycle_stage ? LIFECYCLE_STAGES_ORDERED.indexOf(data.lifecycle_stage) : -1;

  const handleToggleExpand = () => setIsExpanded(!isExpanded);

  const getDaysRemaining = () => {
    if (!data.bid_end_date) return null;
    const endIST = moment.utc(data.bid_end_date).utcOffset('+05:30');
    const nowIST = moment().utcOffset('+05:30');
    if (endIST.isBefore(nowIST)) return { text: 'Ended', urgent: true };
    const endDay = endIST.clone().startOf('day');
    const todayDay = nowIST.clone().startOf('day');
    const days = endDay.diff(todayDay, 'days');
    if (days === 0) return { text: 'Ends today', urgent: true };
    if (days === 1) return { text: 'Ends tomorrow', urgent: true };
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
        {/* Left: Identity */}
        <div className={styles.leftSection}>
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

          <div className={styles.titleBlock}>
            <span className={styles.title} style={!data.title && isDraft ? { color: '#8c939a', fontStyle: 'italic' } : undefined} title={data.title || (isDraft ? 'Untitled' : formatRFQNumber(data.rfq_no, data.is_tender))}>{data.title || (isDraft ? 'Untitled' : formatRFQNumber(data.rfq_no, data.is_tender))}</span>
            <span className={styles.rfqNumber}>{formatRFQNumber(data.rfq_no, data.is_tender)}</span>
          </div>

          {data.project_name && (
            <div className={styles.projectChip}>
              <Folder size={12} /><span>{data.project_name}</span>
            </div>
          )}

          {!isDraft && (
            <>
              {/* Divider */}
              <span className={styles.sectionDivider} />

              {/* Vendor Stats */}
              <div className={styles.vendorChip}>
                <Users size={13} className={styles.vendorIconBlue} />
                <span className={styles.vendorNum}>{totalVendors}</span>
                <span className={styles.vendorLabel}>Invited</span>

                <span className={styles.vendorSep} />

                <Send size={13} className={allQuotesReceived ? styles.vendorIconGreen : styles.vendorIconOrange} />
                <span className={styles.vendorNum}>{quotesReceived}</span>
                <span className={styles.vendorLabel}>Participated</span>
              </div>
            </>
          )}
          {isDraft && data.status === 5 && (
            <>
              <span className={styles.sectionDivider} />
              <span className={styles.statusBadge} style={{ backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffc107', fontSize: '0.7rem' }}>
                Previously submitted for publishing
              </span>
            </>
          )}
        </div>

        {/* Right: Lifecycle + Date + Expand */}
        <div className={styles.rightSection}>
          {/* Lifecycle Pill - hidden for drafts and terminated RFQs */}
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
                    {/* Stage info */}
                    <div className={styles.lcTTTop}>
                      <span className={styles.lcTTDot} style={{ backgroundColor: lifecycleConfig.dotColor }} />
                      <div className={styles.lcTTInfo}>
                        <span className={styles.lcTTLabel}>{lifecycleConfig.label}</span>
                        <span className={styles.lcTTDesc}>{lifecycleConfig.description}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
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

                    {/* Action holders */}
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

          {/* Unread Queries */}
          {data.unseen_query_count > 0 && (
            <Badge bg="danger" className={styles.queryBadgeCompact}>
              <MessageCircle size={10} /><span>{data.unseen_query_count}</span>
            </Badge>
          )}

          {/* Date */}
          <div className={styles.dateBlock}>
            {publishState.isPrePublishState && data.tender_publish_date ? (
              <PublishDateTimer publishDate={data.tender_publish_date} variant="badge" showLabel={true} />
            ) : (
              <>
                <div className={styles.dateItem}>
                  <Calendar size={12} />
                  <span>{data.bid_end_date ? moment(data.bid_end_date).format('DD-MM-YYYY hh:mm A') : '---'}</span>
                </div>
                {daysRemaining && (
                  <Badge className={styles.daysLeftBadge} style={{ backgroundColor: daysRemaining.urgent ? '#dc3545' : '#6c757d', color: '#fff' }}>
                    {daysRemaining.text}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Expand */}
          <div className={styles.expandToggle}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
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
              <div className={styles.timelineItem}><Clock size={14} /><span>Bid Ends: <strong>{data.bid_end_date ? moment(data.bid_end_date).format('DD-MM-YYYY hh:mm A') : '---'}</strong></span></div>
            </>
          ) : publishState.isPrePublishState && data.tender_publish_date ? (
            <div className={styles.timelineItem}><Calendar size={14} /><span>Scheduled:</span><PublishDateTimer publishDate={data.tender_publish_date} variant="full" /></div>
          ) : (
            <>
              <div className={styles.timelineItem}><Calendar size={14} /><span>Published: <strong>{moment(data.timestamp).format('DD-MM-YYYY')}</strong></span></div>
              {data.vendor_clarification_date && (
                <div className={styles.timelineItem}><Clock size={14} /><span>Clarification Ends: <strong>{moment(data.vendor_clarification_date).format('DD-MM-YYYY hh:mm A')}</strong></span></div>
              )}
              <div className={styles.timelineItem}><Clock size={14} /><span>Bid Ends: <strong>{data.bid_end_date ? moment(data.bid_end_date).format('DD-MM-YYYY hh:mm A') : '---'}</strong></span></div>
            </>
          )}
        </div>
        <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
          {isDraft ? (
            <>
              <Link href={`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data.id}`}>
                <button className={`btn btn-sm ${styles.actionBtn} ${styles.editBtn}`}>Edit Draft</button>
              </Link>
              {onDelete && (
                <button className={`btn btn-sm ${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete(data)}>Delete</button>
              )}
            </>
          ) : (
            <>
              <Link href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data.id}`}>
                <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>
                  View Details
                </button>
              </Link>

              {/* Edit button: hidden if finalized, disabled if no permission or all POs approved */}
              {publishState.canEdit && !isPendingApproval && !data.is_finalized && (
                data.po_completed
                  ? <button className={`btn btn-sm ${styles.actionBtn} ${styles.editBtn}`} disabled title="For this RFQ, all products are finalized and awarded" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Edit</button>
                  : hasEditPermission
                    ? <Link href={publishState.editUrl(data.id)}><button className={`btn btn-sm ${styles.actionBtn} ${styles.editBtn}`}>Edit</button></Link>
                    : <button className={`btn btn-sm ${styles.actionBtn} ${styles.editBtn}`} disabled title="You do not have permission to edit this RFQ" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Edit</button>
              )}
              {!publishState.isPrePublishState && !isPendingApproval && statusConfig.key !== 'terminated' && (
                <Link href={`/dashboard/buyer/query?rfq_id=${data.id}&role=buyer&source=rfq-management`}>
                  <button className={`btn btn-sm ${styles.actionBtn} ${styles.queryBtn}`}>Queries{data.unseen_query_count > 0 && <Badge bg="danger" className="ms-1" style={{ fontSize: '0.65rem' }}>{data.unseen_query_count}</Badge>}</button>
                </Link>
              )}
              {!publishState.isPrePublishState && !allQuotesReceived && !data.is_finalized && publishState.isOpen && !isPendingApproval && (
                <button className={`btn btn-sm ${styles.actionBtn} ${styles.reminderBtn}`} onClick={() => onSendReminder?.(data)}>Send Reminder</button>
              )}
              {isPendingApproval && !isBacklog && (
                <Link href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${data.id}`}>
                  <button className={`btn btn-sm ${styles.actionBtn} ${styles.approveBtn}`}>
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
