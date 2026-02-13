import React, { useState } from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Calendar, Clock, ChevronDown, ChevronUp, MessageCircle, User, Folder, Package, FileText, Gavel, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import moment from 'moment';
import { getRFQPublishState, formatRFQNumber, textCapitalize } from '@/utils/sharedFunctions';
import PublishDateTimer from '@/components/shared/PublishDateTimer';
import { getStatusConfig, STATUS_CONFIG } from './statusConfig';
import styles from './RFQCard.module.scss';

const RFQCard = ({ data, isPendingApproval = false, onSendReminder }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const publishState = getRFQPublishState(data);
  const isTender = data.is_tender === 1 || data.is_tender === true;
  const isBacklog = isPendingApproval && data.is_published === 1 && data.status === 1;
  const statusConfig = isBacklog ? STATUS_CONFIG.PUBLISHED_WITHOUT_APPROVAL : getStatusConfig(data, publishState);
  const StatusIcon = statusConfig.icon;

  // Calculate quote progress
  const totalVendors = data.vendors?.[0]?.total_vendors || 0;
  const quotesReceived = data.vendors?.[0]?.quote_received || 0;
  const quoteProgress = totalVendors > 0 ? (quotesReceived / totalVendors) * 100 : 0;
  const allQuotesReceived = totalVendors > 0 && quotesReceived === totalVendors;

  // Product list
  const products = data.products?.map(p => p.product_details?.[0]?.name).filter(Boolean) || [];
  const displayProducts = products.slice(0, 2);
  const remainingProducts = products.length - 2;

  // Click to expand/collapse
  const handleToggleExpand = () => setIsExpanded(!isExpanded);

  // Days remaining calculation
  const getDaysRemaining = () => {
    if (!data.bid_end_date) return null;
    const endDate = moment(data.bid_end_date);
    const today = moment();
    const days = endDate.diff(today, 'days');
    if (days < 0) return { text: 'Ended', urgent: true };
    if (days === 0) return { text: 'Ends today', urgent: true };
    if (days <= 3) return { text: `${days}d left`, urgent: true };
    return { text: `${days}d left`, urgent: false };
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card
      className={`${styles.rfqCard} ${isExpanded ? styles.expanded : ''} ${statusConfig.pulse ? styles.pulse : ''} ${isBacklog ? styles.backlogCard : ''}`}
      style={{
        borderLeftColor: statusConfig.borderColor,
      }}
    >
      {/* Compact Header - Always Visible */}
      <div className={styles.compactView} onClick={handleToggleExpand}>
        {/* Left Section: Status + Title */}
        <div className={styles.leftSection}>
          {/* Entity Type Badge */}
          <span className={`${styles.typeBadge} ${isTender ? styles.tenderType : styles.rfqType}`}>
            {isTender ? <Gavel size={11} /> : <FileText size={11} />}
            {isTender ? 'Tender' : 'RFQ'}
          </span>

          {/* Status Badge */}
          <span
            className={`${styles.statusBadge} ${statusConfig.pulse ? styles.pulseAnimation : ''}`}
            style={{
              backgroundColor: statusConfig.badgeBackground,
              color: statusConfig.badgeText,
            }}
          >
            <StatusIcon size={11} />
            <span>{statusConfig.label}</span>
          </span>

          {/* Title & Number */}
          <div className={styles.titleBlock}>
            <span className={styles.title}>{data.title || formatRFQNumber(data.rfq_no, data.is_tender)}</span>
            <span className={styles.rfqNumber}>{formatRFQNumber(data.rfq_no, data.is_tender)}</span>
          </div>

          {/* Project Name */}
          {data.project_name && (
            <div className={styles.projectChip}>
              <Folder size={12} />
              <span>{data.project_name}</span>
            </div>
          )}

          {/* Products Preview */}
          <div className={styles.productsPreview}>
            <Package size={12} className={styles.productsIcon} />
            {displayProducts.length > 0 ? (
              <>
                <span className={styles.productText}>{displayProducts.join(', ')}</span>
                {remainingProducts > 0 && (
                  <span className={styles.moreText}>+{remainingProducts}</span>
                )}
              </>
            ) : (
              <span className={styles.productText}>No products</span>
            )}  
          </div>
        </div>

        {/* Right Section: Metrics + Date + Actions */}
        <div className={styles.rightSection}>
          {/* TODO: Re-enable detailed quote progress when we have time to implement it properly */}
          {/* <div className={styles.progressBlock}>
            <div className={styles.progressLabel}>Quotes</div>
            <div className={styles.progressWrapper}>
              <ProgressBar
                now={quoteProgress}
                variant={allQuotesReceived ? 'success' : 'primary'}
                className={styles.progressBar}
              />
              <span className={styles.progressText}>{quotesReceived}/{totalVendors}</span>
            </div>
          </div> */}

          {/* Unread Queries */}
          {data.unseen_query_count > 0 && (
            <Badge bg="danger" className={styles.queryBadgeCompact}>
              <MessageCircle size={10} />
              <span>{data.unseen_query_count}</span>
            </Badge>
          )}

          {/* Date Info */}
          <div className={styles.dateBlock}>
            {publishState.isPrePublishState && data.tender_publish_date ? (
              <PublishDateTimer publishDate={data.tender_publish_date} variant="badge" showLabel={true} />
            ) : (
              <>
                <div className={styles.dateItem}>
                  <Calendar size={12} />
                  <span>{data.bid_end_date ? moment(data.bid_end_date).format('DD MMM') : '---'}</span>
                </div>
                {daysRemaining && (
                  <Badge
                    className={styles.daysLeftBadge}
                    style={{
                      backgroundColor: daysRemaining.urgent ? '#dc3545' : '#6c757d',
                      color: '#fff'
                    }}
                  >
                    {daysRemaining.text}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Expand Toggle */}
          <div className={styles.expandToggle}>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Backlog Warning Banner */}
      {isBacklog && (
        <div className={styles.backlogBanner}>
          <div className={styles.backlogIcon}>
            <AlertTriangle size={14} />
          </div>
          <div className={styles.backlogText}>
            <strong>Published without your approval.</strong>{' '}
            This {isTender ? 'tender' : 'RFQ'} was auto-published as the approval was not completed in time. No action is required from you.
          </div>
        </div>
      )}

      {/* Expanded View - Shown on Click */}
      <div className={`${styles.expandedView} ${isExpanded ? styles.visible : ''}`}>
        {/* Meta Information */}
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <User size={14} />
            <span>Created by: <strong>{data.contact_name || '---'}</strong></span>
          </div>
          {data.is_tender !== 1 && (
          <div className={styles.metaItem}>
            <span>Type: <strong>{textCapitalize(data.rfq_type) || 'N/A'}</strong></span>
          </div>
          )}
          <div className={styles.metaItem}>
            <span>Reverse Auction: <strong>{data.reverse_auction === 1 ? 'Enabled' : 'Disabled'}</strong></span>
          </div>
        </div>

        {/* Products List */}
        {products.length > 0 && (
          <div className={styles.productsList}>
            <span className={styles.productsLabel}>Products:</span>
            <div className={styles.productPills}>
              {products.map((product, idx) => (
                <span key={idx} className={styles.productPill}>{product}</span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className={styles.timelineRow}>
          {publishState.isPrePublishState && data.tender_publish_date ? (
            <div className={styles.timelineItem}>
              <Calendar size={14} />
              <span>Scheduled:</span>
              <PublishDateTimer publishDate={data.tender_publish_date} variant="full" />
            </div>
          ) : (
            <>
              <div className={styles.timelineItem}>
                <Calendar size={14} />
                <span>Published: <strong>{moment(data.timestamp).format('DD MMM YYYY')}</strong></span>
              </div>
              <div className={styles.timelineItem}>
                <Clock size={14} />
                <span>Ends: <strong>{data.bid_end_date ? moment(data.bid_end_date).format('DD MMM YYYY') : '---'}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/vendor/inquiries-details?type=buyer-view&id=${data.id}`}>
            <button className={`btn btn-sm ${styles.actionBtn} ${styles.viewBtn}`}>
              View Details
            </button>
          </Link>

          {/* Do not show Edit for pending-approval tenders */}
          {publishState.canEdit && !isPendingApproval && (
            <Link href={publishState.editUrl(data.id)}>
              <button className={`btn btn-sm ${styles.actionBtn} ${styles.editBtn}`}>
                Edit
              </button>
            </Link>
          )}

          {!publishState.isPrePublishState && (
            <Link href={`/dashboard/buyer/query?rfq_id=${data.id}&role=buyer`}>
              <button className={`btn btn-sm ${styles.actionBtn} ${styles.queryBtn}`}>
                Queries
                {data.unseen_query_count > 0 && (
                  <Badge bg="danger" className="ms-1" style={{ fontSize: '0.65rem' }}>{data.unseen_query_count}</Badge>
                )}
              </button>
            </Link>
          )}

          {!publishState.isPrePublishState && !allQuotesReceived && !data.is_finalized && publishState.isOpen && (
            <button
              className={`btn btn-sm ${styles.actionBtn} ${styles.reminderBtn}`}
              onClick={() => onSendReminder?.(data)}
            >
              Send Reminder
            </button>
          )}

          {isPendingApproval && !isBacklog && (
            <Link href={`/dashboard/vendor/inquiries-details?type=buyer-view&id=${data.id}`}>
              <button className={`btn btn-sm ${styles.actionBtn} ${styles.approveBtn}`}>
                View & Approve
              </button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RFQCard;
