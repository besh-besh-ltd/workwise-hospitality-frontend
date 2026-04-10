// WH-69 — Edit History modal for the RFQ details page.
//
// Triggered by an "Edit History" button in the top-right action area on
// /dashboard/buyer/rfq-management-details. Originally rendered as an inline
// panel below the lifecycle journey, but the page is so tall that nobody
// scrolled to it — so now it's a focused modal with a vertical timeline
// design (newest-first), grouping per-edit-session entries.
//
// Data source: GET /rfq/:id/edit-history (rfqController.getEditHistory)
//
// Props:
//   rfqId   — number, required. The RFQ to fetch history for.
//   isOpen  — boolean, required. Modal open state.
//   onClose — function, required. Close handler.

import React, { useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import {
  FaHistory,
  FaTimes,
  FaArrowRight,
} from 'react-icons/fa';
import { getRfqEditHistory } from '@/services/rfq';
import {
  formatHistoryDateIST,
  formatHistoryRelative,
  formatPrevDateValue,
} from '@/utils/sharedFunctions';
import styles from './RFQEditHistory.module.scss';

// ── Field name → human label ──────────────────────────────────────────────
// Mirrors RFQ_FIELD_LABELS in the backend rfqController. Anything missing
// here falls back to a humanised version of the raw field name.
const FIELD_LABELS = {
  title: 'Title',
  comment: 'Comment',
  contact_name: 'Contact name',
  contact_number: 'Contact number',
  response_email: 'Response email',
  location: 'Delivery location',
  bid_end_date: 'Quote submission end date',
  tender_publish_date: 'Tender publish date',
  tender_fees: 'Tender fees',
  vendor_clarification_date: 'Vendor clarification end date',
  rfq_type: 'RFQ type',
  reverse_auction: 'Reverse auction',
  ra_start_date: 'Reverse auction start',
  ra_end_date: 'Reverse auction end',
  project_id: 'Project',
  qap_file: 'QAP file',
  spec_file: 'Spec file',
  datasheet_file: 'Datasheet',
  vendor: 'Vendor',
  clauses: 'Tech evaluation clauses',
};

const ENTITY_LABELS = {
  RFQ: 'RFQ details',
  PRODUCT: 'Product',
  PRODUCT_SPEC: 'Product spec',
  PRODUCT_FILE: 'Product file',
  PRODUCT_VENDOR: 'Product vendor',
  PRODUCT_TECH_EVAL: 'Tech evaluation',
  TERMS: 'Terms',
};

// Field names whose values are wall-clock IST datetimes — render them via
// formatPrevDateValue so the user sees "09 Apr 2026, 11:11 am" instead of
// the raw "2026-04-09T11:11:00" blob the form posts to the backend.
const DATE_FIELDS = new Set([
  'bid_end_date',
  'tender_publish_date',
  'vendor_clarification_date',
  'ra_start_date',
  'ra_end_date',
]);

const humanise = (s) =>
  String(s)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const labelFor = (change) => {
  const fname = change.field_name;
  const base = FIELD_LABELS[fname] || (fname ? humanise(fname) : null);
  if (change.entity_type && change.entity_type.startsWith('PRODUCT') && change.entity_label) {
    if (base) return `${change.entity_label} · ${base}`;
    return change.entity_label;
  }
  if (change.entity_type === 'TERMS') return 'Terms & conditions';
  return base || ENTITY_LABELS[change.entity_type] || change.entity_type;
};

const renderValue = (v) => {
  if (v === null || v === undefined || v === '') return 'N/A';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch (_) {
      return String(v);
    }
  }
  return String(v);
};

// Group changes within a single session by their parent entity (the
// "X — Quantity changed", "X — Unit changed" rows look much cleaner stacked
// under one X header than as five sibling rows).
//
// Two extra responsibilities:
//   1. When a product is added or removed in the same session, the backend
//      writes the parent PRODUCT/CREATE (or DELETE) row PLUS one
//      PRODUCT_VENDOR row per auto-attached vendor. Those vendor rows are
//      already represented by the consolidated card we render from the
//      parent row's `new_value.vendor_count`, so we drop them from the
//      visible change list to avoid the "Vendor Added 414, 415, 416, …"
//      noise the user complained about.
//   2. We surface the lifecycle row (the PRODUCT/CREATE or PRODUCT/DELETE)
//      directly on the group object so the renderer can show a friendly
//      add/remove card instead of falling back to the generic two-column
//      diff row that leaks raw JSON.
const groupChangesByEntity = (changes = []) => {
  const groups = new Map();

  // Pass 1 — find every entity_id that has a parent PRODUCT lifecycle
  // (CREATE or DELETE) row in this session. Sibling PRODUCT_VENDOR rows
  // for those entity_ids will be filtered out below.
  const productLifecycleEntityIds = new Set();
  for (const c of changes) {
    if (
      c.entity_type === 'PRODUCT' &&
      (c.change_type === 'CREATE' || c.change_type === 'DELETE') &&
      c.entity_id != null
    ) {
      productLifecycleEntityIds.add(c.entity_id);
    }
  }

  // Pass 2 — bucket the surviving rows into entity groups.
  for (const c of changes) {
    // Drop the per-vendor noise that's already covered by the parent
    // PRODUCT lifecycle card.
    if (
      c.entity_type === 'PRODUCT_VENDOR' &&
      productLifecycleEntityIds.has(c.entity_id)
    ) {
      continue;
    }

    let groupKey;
    let groupLabel;
    if (c.entity_type && c.entity_type.startsWith('PRODUCT') && c.entity_label) {
      groupKey = `product:${c.entity_id}`;
      groupLabel = c.entity_label;
    } else if (c.entity_type === 'TERMS') {
      groupKey = 'terms';
      groupLabel = 'Terms & conditions';
    } else {
      groupKey = 'rfq';
      groupLabel = 'RFQ details';
    }
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { key: groupKey, label: groupLabel, changes: [], lifecycle: null });
    }
    const group = groups.get(groupKey);

    // If this is the parent PRODUCT lifecycle row, hoist it onto the
    // group as `lifecycle` so the renderer can show the friendly card
    // instead of a generic ChangeRow. Don't push it into `changes` —
    // we don't want to render the same row twice.
    if (
      c.entity_type === 'PRODUCT' &&
      (c.change_type === 'CREATE' || c.change_type === 'DELETE')
    ) {
      group.lifecycle = c;
      continue;
    }

    group.changes.push(c);
  }
  return Array.from(groups.values());
};

const initials = (name) => {
  if (!name) return '?';
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
};

// Friendly add/remove summary for a product lifecycle row. Replaces the
// generic "Added {raw json blob}" / "Vendor Added 414, 415, …" treatment
// with a single card that lists every spec in a clean key/value table and
// shows a "with N vendors" badge. The backend stores `specs`, `vendor_count`,
// and `product_name` directly on the new_value/old_value JSON of the parent
// PRODUCT/CREATE | PRODUCT/DELETE row (see rfqUpdateHelpers.js).
const ProductLifecycleCard = ({ row }) => {
  const isAdded = row.change_type === 'CREATE';
  const payload = isAdded ? row.new_value : row.old_value;
  if (!payload || typeof payload !== 'object') {
    // Defensive fallback for legacy rows that didn't carry the rich
    // metadata — render a plain pill so the user still sees something.
    return (
      <div className={styles.lifecycleCard}>
        <div className={styles.lifecycleHeader}>
          <span className={isAdded ? styles.lifecyclePillAdded : styles.lifecyclePillRemoved}>
            {isAdded ? 'Product added' : 'Product removed'}
          </span>
          <span className={styles.lifecycleProductName}>
            {row.entity_label || 'Product'}
          </span>
        </div>
      </div>
    );
  }

  const specs = payload.specs || {};
  const specEntries = Object.entries(specs).filter(
    ([, v]) => v !== '' && v !== null && v !== undefined
  );
  const vendorCount = Number(payload.vendor_count) || 0;
  const productName = payload.product_name || row.entity_label || 'Product';

  return (
    <div className={styles.lifecycleCard}>
      <div className={styles.lifecycleHeader}>
        <span className={isAdded ? styles.lifecyclePillAdded : styles.lifecyclePillRemoved}>
          {isAdded ? 'Product added' : 'Product removed'}
        </span>
        <span className={styles.lifecycleProductName}>{productName}</span>
        {vendorCount > 0 && (
          <span className={styles.lifecycleVendorBadge}>
            {isAdded ? 'with' : 'had'} {vendorCount} {vendorCount === 1 ? 'vendor' : 'vendors'}
          </span>
        )}
      </div>

      {specEntries.length > 0 && (
        <div className={styles.lifecycleSpecGrid}>
          {specEntries.map(([title, value]) => (
            <div className={styles.lifecycleSpecItem} key={title}>
              <div className={styles.lifecycleSpecTitle}>{title}</div>
              <div className={styles.lifecycleSpecValue}>{renderValue(value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Per-change row used inside a session group. Layout is two columns:
// the field label on the left, and a "old → new" / "Added value" /
// "Removed value" pill block on the right. No icons — just clean typography
// with subtle colour cues from the change-type pills.
const ChangeRow = ({ change }) => {
  const isCreate = change.change_type === 'CREATE';
  const isDelete = change.change_type === 'DELETE';

  // For PRODUCT_SPEC the entity-group already shows the product label, so
  // strip the prefix from the per-row label to keep things tight.
  let rawLabel = labelFor(change);
  if (rawLabel && rawLabel.includes(' · ')) {
    rawLabel = rawLabel.split(' · ').slice(1).join(' · ') || rawLabel;
  }

  // Date-typed fields render via formatPrevDateValue so the user sees a
  // human-friendly IST datetime instead of the raw "2026-04-09T11:11:00"
  // blob. Falls back to renderValue for everything else.
  const isDateField = DATE_FIELDS.has(change.field_name);
  const display = (v) => {
    if (v === null || v === undefined || v === '') return 'N/A';
    if (isDateField) return formatPrevDateValue(v);
    return renderValue(v);
  };

  return (
    <div className={styles.changeRow}>
      <div className={styles.changeLabel}>{rawLabel}</div>
      <div className={styles.changeValues}>
        {isCreate && (
          <>
            <span className={styles.tagAdded}>Added</span>
            <span className={styles.newValue}>{display(change.new_value)}</span>
          </>
        )}
        {isDelete && (
          <>
            <span className={styles.tagRemoved}>Removed</span>
            <span className={styles.oldValue}>{display(change.old_value)}</span>
          </>
        )}
        {!isCreate && !isDelete && (
          <>
            <span className={styles.oldValue}>{display(change.old_value)}</span>
            <FaArrowRight className={styles.arrow} />
            <span className={styles.newValue}>{display(change.new_value)}</span>
          </>
        )}
      </div>
    </div>
  );
};

const RFQEditHistory = ({ rfqId, isOpen, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !rfqId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRfqEditHistory(rfqId)
      .then((res) => {
        if (cancelled) return;
        setSessions(res?.data?.sessions || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load edit history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rfqId, isOpen]);

  const editCount = sessions.length;
  const materialCount = useMemo(
    () => sessions.filter((s) => s.material).length,
    [sessions]
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      contentLabel="Edit History"
      style={{
        overlay: {
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '40px 16px',
          zIndex: 1060,
          overflowY: 'auto',
        },
        content: {
          position: 'relative',
          inset: 'auto',
          maxWidth: '720px',
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: 0,
          overflow: 'visible',
          margin: 'auto',
        },
      }}
    >
      <div className={styles.modal}>
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              <FaHistory />
            </span>
            <div>
              <h2 className={styles.modalTitle}>Edit History</h2>
              <div className={styles.modalSubtitle}>
                Every change made to this RFQ since it was created
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* ── Stats strip (only when we have data) ──────────────────────── */}
        {!loading && !error && editCount > 0 && (
          <div className={styles.statsStrip}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{editCount}</span>
              <span className={styles.statLabel}>{editCount === 1 ? 'edit' : 'edits'}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{materialCount}</span>
              <span className={styles.statLabel}>material</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{editCount - materialCount}</span>
              <span className={styles.statLabel}>cosmetic</span>
            </div>
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className={styles.modalBody}>
          {loading && (
            <div className={styles.loading}>
              <span className={styles.spinner} />
              Loading edit history…
            </div>
          )}

          {!loading && error && (
            <div className={styles.errorState}>
              <FaTimes />
              <div>{error}</div>
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FaHistory />
              </div>
              <h4>No edits yet</h4>
              <p>This RFQ has not been changed since it was created.</p>
            </div>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div className={styles.timeline}>
              {sessions.map((session, idx) => {
                const groups = groupChangesByEntity(session.changes || []);
                const isLast = idx === sessions.length - 1;
                return (
                  <div className={styles.timelineItem} key={session.edit_session_id}>
                    {/* Timeline rail */}
                    <div className={styles.timelineRail}>
                      <div
                        className={`${styles.timelineDot} ${
                          session.material ? styles.timelineDotMaterial : ''
                        }`}
                      />
                      {!isLast && <div className={styles.timelineLine} />}
                    </div>

                    {/* Card */}
                    <div className={styles.sessionCard}>
                      <div className={styles.sessionCardHeader}>
                        <div className={styles.author}>
                          <span className={styles.avatar}>
                            {initials(session.changed_by_name)}
                          </span>
                          <div className={styles.authorInfo}>
                            <div className={styles.authorName}>
                              {session.changed_by_name || 'Unknown user'}
                              {session.material ? (
                                <span className={`${styles.pill} ${styles.pillMaterial}`}>
                                  Material
                                </span>
                              ) : (
                                <span className={`${styles.pill} ${styles.pillCosmetic}`}>
                                  Cosmetic
                                </span>
                              )}
                            </div>
                            {session.changed_by_email && (
                              <div className={styles.authorEmail}>
                                {session.changed_by_email}
                              </div>
                            )}
                            <div className={styles.authorMeta}>
                              {formatHistoryRelative(session.changed_at)} ·{' '}
                              {formatHistoryDateIST(session.changed_at, {
                                includeTime: true,
                              })}{' '}
                              IST
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.sessionCardBody}>
                        {groups.map((group) => {
                          // The lifecycle row counts as one "change" in the
                          // header tally so the user still sees a total.
                          const totalChanges =
                            group.changes.length + (group.lifecycle ? 1 : 0);
                          return (
                            <div key={group.key} className={styles.entityGroup}>
                              <div className={styles.entityGroupHeader}>
                                {group.label}
                                <span className={styles.entityGroupCount}>
                                  {totalChanges}{' '}
                                  {totalChanges === 1 ? 'change' : 'changes'}
                                </span>
                              </div>
                              <div className={styles.entityGroupBody}>
                                {group.lifecycle && (
                                  <ProductLifecycleCard row={group.lifecycle} />
                                )}
                                {group.changes.map((c) => (
                                  <ChangeRow key={c.id} change={c} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RFQEditHistory;
