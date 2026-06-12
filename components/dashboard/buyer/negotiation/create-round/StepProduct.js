import React, { useMemo, useState } from 'react';
import { Box, Settings } from 'lucide-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  getProductDetails,
  getVendorNames,
  getVendorPriceData,
  getProductRoundStatus,
} from './negotiationHelpers';
import styles from './CreateRound.module.scss';

// Step 1 — product picker. Lists every product on the RFQ as a radio row,
// plus a card on top for RFQ-level negotiation (no product picked, targets
// quote-wide settings like payment_terms / global_comment / documents /
// global charges).
const StepProduct = ({
  products = [],
  quoteApprovalStatuses = {},
  queuedProductIds,
  selectedProductId,
  onSelectProduct,
  // RFQ-level wiring
  mode = 'product',
  onSelectRfqMode,
  hasQueuedRfqRound = false,
  rfqFieldCount = 0,
  rfqVendorCount = 0,
}) => {
  const [search, setSearch] = useState('');

  const queuedSet = useMemo(
    () => (queuedProductIds instanceof Set
      ? queuedProductIds
      : new Set(Array.isArray(queuedProductIds) ? queuedProductIds.map(Number) : [])),
    [queuedProductIds]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const d = getProductDetails(p);
      return (
        (d.name || '').toLowerCase().includes(q) ||
        (d.spec || '').toLowerCase().includes(q) ||
        (d.size || '').toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const availableCount = useMemo(() => {
    return products.filter(p => {
      if (queuedSet.has(Number(p.id))) return false;
      return !getProductRoundStatus(p, quoteApprovalStatuses).isDisabled;
    }).length;
  }, [products, quoteApprovalStatuses, queuedSet]);

  const isRfqMode = mode === 'rfq';
  const rfqDisabledTooltip = hasQueuedRfqRound
    ? 'RFQ-level round already queued — only one RFQ-level round per submission.'
    : null;
  const rfqDisabled = !!rfqDisabledTooltip;

  return (
    <div className={styles.stepStack}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <Settings size={20} strokeWidth={1.75} />
          </span>
          <div className={styles.cardHeaderTextWrap}>
            <p className={styles.cardHeaderTitle}>RFQ-level negotiation</p>
            <p className={styles.cardHeaderSub}>
              Negotiate vendor-wide settings instead of a specific product.
            </p>
          </div>
        </div>

        <OverlayTrigger
          placement="top"
          overlay={
            rfqDisabled
              ? <Tooltip id="rfq-level-disabled-tooltip">{rfqDisabledTooltip}</Tooltip>
              : <span />
          }
        >
          <div
            className={`${styles.rfqLevelRow} ${isRfqMode ? styles.productRowSelected : ''} ${rfqDisabled ? styles.productRowDisabled : ''}`}
            onClick={() => !rfqDisabled && onSelectRfqMode && onSelectRfqMode()}
            role="button"
            tabIndex={rfqDisabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!rfqDisabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelectRfqMode && onSelectRfqMode();
              }
            }}
          >
            <input
              type="radio"
              name="selectedScope"
              checked={isRfqMode}
              disabled={rfqDisabled}
              readOnly
              className={styles.productRadio}
              aria-label="Start negotiation with RFQ-level fields"
            />
            <div className={styles.rfqLevelMain}>
              <p className={styles.rfqLevelTitle}>Start negotiation with RFQ-level fields</p>
              <p className={styles.rfqLevelSub}>
                Vendor-wide settings: Payment Terms · Global Charges (TCS) · Documents · Global Comment
              </p>
              <div className={styles.rfqLevelMeta}>
                <div>
                  <p className={styles.productMetaLabel}>SCOPE</p>
                  <p className={styles.productMetaValue}>RFQ-wide (no product)</p>
                </div>
                <div>
                  <p className={styles.productMetaLabel}>FIELDS</p>
                  <p className={styles.productMetaValue}>{rfqFieldCount} available</p>
                </div>
                <div>
                  <p className={styles.productMetaLabel}>VENDORS</p>
                  <p className={styles.productMetaValue}>{rfqVendorCount} in RFQ</p>
                </div>
              </div>
            </div>
          </div>
        </OverlayTrigger>
      </section>

    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderIcon}>
          <Box size={20} strokeWidth={1.75} />
        </span>
        <div className={styles.cardHeaderTextWrap}>
          <p className={styles.cardHeaderTitle}>Select product</p>
          <p className={styles.cardHeaderSub}>
            Only products with valid vendor quotes can start a new negotiation round. {availableCount} available.
          </p>
        </div>
      </div>

      {products.length > 0 && (
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search products by name, spec, or size…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {products.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No products found</p>
          <p className={styles.emptySub}>Load an RFQ with products to create rounds.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No matching products</p>
          <p className={styles.emptySub}>Try a different search term.</p>
        </div>
      ) : (
        <div className={styles.productList}>
          {filteredProducts.map((product) => {
            const baseStatus = getProductRoundStatus(product, quoteApprovalStatuses);
            const isQueued = queuedSet.has(Number(product.id));
            const isDisabled = baseStatus.isDisabled || isQueued;
            const statusLabel = isQueued ? 'Queued' : baseStatus.statusLabel;
            const statusClass = isQueued ? 'createStatusQueued' : baseStatus.statusClass;
            const details = getProductDetails(product);
            const priceData = getVendorPriceData(product);
            const isSelected = String(selectedProductId) === String(product.id);
            const l1Vendor = priceData.vendors[0];
            const vendorCount = priceData.vendors.filter(v => !v.isRegret).length;

            return (
              <div
                key={product.id}
                className={`${styles.productRow} ${isSelected ? styles.productRowSelected : ''} ${isDisabled ? styles.productRowDisabled : ''}`}
                onClick={() => !isDisabled && onSelectProduct(product.id)}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectProduct(product.id);
                  }
                }}
              >
                <input
                  type="radio"
                  name="selectedProduct"
                  checked={isSelected}
                  disabled={isDisabled}
                  readOnly
                  className={styles.productRadio}
                  aria-label={`Select ${details.name}`}
                />

                <div className={styles.productMain}>
                  <p className={styles.productName}>{details.name}</p>
                  {details.spec ? (
                    <p className={styles.productSpec} title={details.spec}>{details.spec}</p>
                  ) : null}
                  {statusLabel && statusLabel !== 'Available' && (
                    <span className={`${styles.productStatusBadge} ${styles[statusClass] || ''}`}>
                      {statusLabel}
                    </span>
                  )}
                </div>

                <div>
                  <p className={styles.productMetaLabel}>QTY</p>
                  <p className={styles.productMetaQty}>
                    {details.quantity || '-'}{details.unit ? ` ${details.unit}` : ''}
                  </p>
                </div>

                <div>
                  <p className={styles.productMetaLabel}>L1 TOTAL</p>
                  <p className={styles.productMetaL1}>
                    {priceData.l1 ? `₹${priceData.l1.toLocaleString('en-IN')}` : '-'}
                  </p>
                  {l1Vendor?.vendorName && (
                    <p className={styles.productMetaL1Vendor} title={`L1 ${l1Vendor.vendorName}`}>
                      L1 {l1Vendor.vendorName}
                    </p>
                  )}
                </div>

                <div>
                  <p className={styles.productMetaLabel}>VENDORS</p>
                  <p className={styles.productMetaValue}>
                    {vendorCount > 0 ? `${vendorCount} quoted` : '-'}
                  </p>
                  <p className={styles.productMetaL1Vendor} title={getVendorNames(product)}>
                    {getVendorNames(product)}
                  </p>
                </div>

                <div />
              </div>
            );
          })}
        </div>
      )}
    </section>
    </div>
  );
};

export default StepProduct;
