// WH-69: small "Previously: X" hint shown beneath edit-form fields on the
// Edit RFQ page. The `previousValues` map (built from /rfq/:id/edit-history
// in EditRFQ.js → fetchPreviousValues) keys composite strings to
// { old_value, changed_by_name, changed_at, change_type } describing the
// most recent change.
//
// Composite key shapes:
//   rfq:<field>                   — RFQ-level fields (title, location, …)
//   product:<rfq_product_id>:<f>  — product-level fields (currently `comment`)
//   spec:<rfq_product_id>:<title> — product spec fields (Quantity, Unit, …)
//   terms                         — terms list
//
// Two ways to use it:
//   1. Pass `keyName` + `previousValues` map (form-field call sites that
//      already have the whole map in scope).
//   2. Pass `meta` directly (callers that compute the lookup themselves
//      and don't want to thread the whole map down).
//
// `compact` prop:
//   When the input is wrapped by `CommonFormInput` (which adds its own
//   `form-group mb-3` div), the chip would otherwise sit ~20px below the
//   input. Pass `compact` to pull it up against the input visually. Plain
//   inputs that already live inside an `mb-3` wrapper should leave it off
//   so the chip gets natural spacing.
//
// `type` prop:
//   Pass `type="datetime"` for date / datetime fields (bid_end_date,
//   tender_publish_date, …) so the chip renders the value as a
//   human-readable IST date instead of the raw ISO blob the form sends
//   to the backend ("2026-04-09T11:11"). The same comparison still uses
//   the formatted form so the chip correctly hides itself once the user
//   reverts to the prior value.
//
// The hint is hidden when there is no recorded change OR when the recorded
// previous value already matches the current value (so the chip doesn't
// linger after the user reverts an in-progress edit).

import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { formatHistoryDateIST, formatPrevDateValue } from '@/utils/sharedFunctions';

const PrevHint = ({
  keyName,
  previousValues,
  meta: directMeta,
  currentValue,
  compact = false,
  type,
}) => {
  const meta = directMeta || (keyName ? previousValues?.[keyName] : null);
  if (!meta) return null;

  const isDate = type === 'datetime' || type === 'date';
  const formatVal = (v) => {
    if (v === null || v === undefined || v === '') return 'N/A';
    if (isDate) return formatPrevDateValue(v);
    return String(v);
  };

  const oldStr = formatVal(meta.old_value);
  // Compare in the rendered form so a date chip correctly disappears
  // when the user reverts an in-progress edit (the raw datetime-local
  // value the input emits won't match the stored snapshot value
  // character-for-character, but the formatted form will).
  const curStr = formatVal(currentValue);
  if (oldStr === curStr) return null;

  const className = compact
    ? 'prev-value-indicator prev-value-compact'
    : 'prev-value-indicator';

  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`prev-hint-${keyName || 'meta'}`}>
          Changed by {meta.changed_by_name || 'Unknown'}
          {meta.changed_at ? ` on ${formatHistoryDateIST(meta.changed_at)}` : ''}
        </Tooltip>
      }
    >
      <small className={className}>
        Previously: <span className="prev-value-strike">{oldStr}</span>
      </small>
    </OverlayTrigger>
  );
};

export default PrevHint;
