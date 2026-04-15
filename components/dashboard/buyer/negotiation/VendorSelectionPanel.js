import React, { useMemo } from 'react';
import styles from './NegotiationUI.module.scss';

/**
 * VendorSelectionPanel — Checkbox-based vendor selection for negotiation round creation.
 * Uses product_vendors + active_round.vendor_approvals for per-vendor approval status.
 */
const VendorSelectionPanel = ({
  product,
  selectedVendorIds = [],
  onVendorToggle,
  onSelectAll,
  getVendorDisplayName,
}) => {
  const vendors = useMemo(() => {
    const productVendors = product?.product_vendors || [];
    const quotations = product?.quotations || [];
    const activeRound = product?.active_round;
    const vendorApprovals = activeRound?.vendor_approvals || [];
    const roundVendorIds = new Set((activeRound?.vendor_ids || []).map(Number));

    return productVendors.map(v => {
      const vendorId = Number(v.id || v.user_id);

      // Find matching quotation to get total price
      const matchedQuote = quotations.find(q => {
        const vd = q.quote_details?.vendor_details;
        const qVendorId = vd?.id || vd?.user_id || q.vendor_id || q.created_by;
        return Number(qVendorId) === vendorId;
      });

      // Determine approval status from active_round.vendor_approvals
      const isInRound = roundVendorIds.has(vendorId) || !!v.in_active_round;
      const approval = vendorApprovals.find(va => Number(va.vendor_id) === vendorId);
      let approvalStatus = null;
      if (isInRound) {
        approvalStatus = approval?.status || 'PENDING';
      }

      // Disabled if in round AND not rejected
      const isDisabled = isInRound && approvalStatus !== 'REJECTED';

      return {
        id: vendorId,
        name: getVendorDisplayName(v),
        totalPrice: parseFloat(matchedQuote?.total_price || 0),
        activeRoundInfo: v.active_round_info || null,
        approvalStatus,
        isDisabled,
      };
    }).sort((a, b) => a.totalPrice - b.totalPrice);
  }, [product, getVendorDisplayName]);

  const availableVendors = vendors.filter(v => !v.isDisabled);
  const allAvailableSelected = availableVendors.length > 0 &&
    availableVendors.every(v => selectedVendorIds.includes(v.id));

  if (vendors.length === 0) {
    return null;
  }

  return (
    <section className={styles.vendorSelectionSurface}>
      <div className={styles.vendorSelectionHeader}>
        <div>
          <p className={styles.vendorSelectionTitle}>Select Vendors</p>
          <p className={styles.vendorSelectionSub}>
            Choose which vendors to include in this negotiation round.
          </p>
        </div>
        <span className={styles.vendorSelectionMeta}>
          {vendors.length} vendor{vendors.length > 1 ? 's' : ''}
        </span>
      </div>

      {availableVendors.length > 0 && (
        <div className={styles.vendorSelectAllRow}>
          <input
            type="checkbox"
            checked={allAvailableSelected}
            onChange={onSelectAll}
            className={styles.vendorSelectAllCheckbox}
            id="vendor-select-all"
          />
          <label htmlFor="vendor-select-all" className={styles.vendorSelectAllLabel}>
            Select All
          </label>
        </div>
      )}

      <div className={styles.vendorList}>
        {vendors.map(vendor => {
          const { isDisabled } = vendor;
          const isSelected = selectedVendorIds.includes(vendor.id);

          return (
            <div
              key={vendor.id}
              className={`${styles.vendorRow} ${isSelected ? styles.vendorRowSelected : ''} ${isDisabled ? styles.vendorRowDisabled : ''}`}
              onClick={() => !isDisabled && onVendorToggle(vendor.id)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={(e) => { e.stopPropagation(); if (!isDisabled) onVendorToggle(vendor.id); }}
                onClick={(e) => e.stopPropagation()}
                className={styles.vendorCheckbox}
              />
              <div className={styles.vendorInfo}>
                <p className={styles.vendorName}>{vendor.name}</p>
                {vendor.approvalStatus && (
                  <span className={`${styles.vendorApprovalBadge} ${
                    vendor.approvalStatus === 'APPROVED' ? styles.vendorApprovalApproved :
                    vendor.approvalStatus === 'REJECTED' ? styles.vendorApprovalRejected :
                    styles.vendorApprovalPending
                  }`}>
                    {vendor.approvalStatus === 'APPROVED' ? 'Approved' :
                     vendor.approvalStatus === 'REJECTED' ? 'Rejected' :
                     'Pending Approval'}
                    {vendor.activeRoundInfo?.round_number ? ` · Round ${vendor.activeRoundInfo.round_number}` : ''}
                  </span>
                )}
                {vendor.totalPrice > 0 && (
                  <p className={styles.vendorPrice}>
                    ₹{vendor.totalPrice.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedVendorIds.length > 0 && (
        <p className={styles.vendorSelectedNote}>
          {selectedVendorIds.length} vendor{selectedVendorIds.length > 1 ? 's' : ''} selected
        </p>
      )}
    </section>
  );
};

export default VendorSelectionPanel;
