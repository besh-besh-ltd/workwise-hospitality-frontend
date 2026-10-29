import React, { useState } from 'react';
import Link from 'next/link';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import styles from './TechnicalEvaluation.module.scss';

const formatDeadline = (raw) => (raw ? String(raw).replace('T', ' ').slice(0, 16) : '');

const WarnIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const Banner = ({ tone, title, children, action }) => {
  const tones = {
    red: { bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '#fca5a5', icon: 'linear-gradient(135deg, #ef4444, #b91c1c)', title: '#991b1b', body: '#b91c1c' },
    amber: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fcd34d', icon: 'linear-gradient(135deg, #f59e0b, #b45309)', title: '#92400e', body: '#b45309' },
  }[tone];
  return (
    <div className={styles.approvedBanner} style={{ background: tones.bg, borderColor: tones.border }}>
      <div className={styles.approvedBannerIcon} style={{ background: tones.icon }}><WarnIcon /></div>
      <div className={styles.approvedBannerContent}>
        <div className={styles.approvedBannerTitle} style={{ color: tones.title }}>{title}</div>
        <div className={styles.approvedBannerSubtitle} style={{ color: tones.body }}>{children}</div>
      </div>
      {action}
    </div>
  );
};

/**
 * Which status banner (if any) a product's tech evaluation shows besides the
 * "Fully Approved" one. Stuck wins; new vendors beat the plain reopened notice.
 */
export const TechEvalStatusBanner = ({
  isStuck,
  reopened,
  recoverable = false,
  bidWindowOpen,
  eligibleUnscoredCount = 0,
  nextRound = 1,
  bidEndDate,
  extendHref,
}) => {
  if (recoverable && eligibleUnscoredCount > 0) {
    return (
      <Banner tone="amber" title="New vendors ready for evaluation">
        {eligibleUnscoredCount} vendor(s) quoted since the last round. Evaluate them and submit Round {nextRound}.
      </Banner>
    );
  }
  if (isStuck) {
    return (
      <Banner
        tone="red"
        title="No vendor passed technical evaluation"
        action={extendHref ? (
          <Link href={extendHref} className="btn btn-sm btn-danger ms-3 text-nowrap">Extend deadline</Link>
        ) : null}
      >
        None of the evaluated vendors met the minimum passing score. Extend the bid deadline to let more vendors quote — technical evaluation reopens automatically, and vendors who quote can be evaluated once bidding closes. Or close this RFQ.
      </Banner>
    );
  }
  if (reopened && bidWindowOpen === true) {
    return (
      <Banner tone="amber" title="Technical evaluation reopened">
        Bidding is open{formatDeadline(bidEndDate) ? ` until ${formatDeadline(bidEndDate)}` : ''}. Vendors who quote can be evaluated after bidding closes.
      </Banner>
    );
  }
  return null;
};

export const UnquotedResponderLabel = () => (
  <span className="text-muted" style={{ fontSize: '11px', fontStyle: 'italic' }}>
    Hasn't quoted — can't be evaluated
  </span>
);

export const HiddenRespondersNotice = ({ count }) => {
  if (!count) return null;
  return (
    <div className="mb-2" role="status" style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: '0.82rem', color: '#92400e' }}>
      {count} vendor(s) answered the technical questions but haven't quoted, so they're hidden. Turn off "Quoted Vendors Only" to see them.
    </div>
  );
};

/** Per-product Submit button; asks first when responders would be left out. */
export const ProductSubmitButton = ({ disabled, title, leftOutWarning, onSubmit }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button
        className={`btn btn-sm ${styles.productSubmitBtn}`}
        disabled={disabled}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          if (leftOutWarning) setConfirming(true);
          else onSubmit();
        }}
      >
        Submit for Approval
      </button>
      <ConfirmationModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => { setConfirming(false); await onSubmit(); }}
        title="Submit for Approval"
        description={leftOutWarning || ''}
        confirmButtonColor="warning"
        confirmButtonText="Submit"
        cancelButtonText="Cancel"
      />
    </>
  );
};
