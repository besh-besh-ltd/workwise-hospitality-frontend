import React, { useState } from "react";
import ReadMore from "@/components/shared/ReadMore";
import LPRModal from "@/components/shared/LPRModal";
import ProductComparisonMatrix from "@/components/dashboard/buyer/quoteCompare/tables/ProductComparisonMatrix";
import QuoteVisibilityLockPanel from "@/components/dashboard/buyer/quoteCompare/QuoteVisibilityLockPanel";
import NegotiationModal from "@/components/dashboard/buyer/negotiation/NegotiationModal";
import { getNegotiationRounds } from "@/services/negotiation";
import {
  addCommasToNumber,
  formatPrice,
} from "@/utils/sharedFunctions";
import styles from "./QuoteCompareRevamp.module.scss";

const getQuantityValue = (item) => {
  return (
    item?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === "Quantity")?.value ||
    item?.product_specs?.find((spec) => spec.title === "Quantity")?.value ||
    "-"
  );
};

const getQuantityUnit = (item) => {
  return item?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === "Unit")?.value || "";
};

const getSellingPrice = (item) => {
  return item?.product_specs?.find((spec) => spec.title === "total_price")?.value;
};

const getSpec = (item) => {
  return (
    item?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === "Spec")?.value ||
    item?.product_specs?.find((spec) => spec.title === "Spec")?.value ||
    ""
  );
};

// Server-computed baseline (last_purchase_rate or last_quote_rate, whichever
// is present). The aggregates.baseline_total field is set by the quote-compare
// enricher; we tag the source by checking which raw rate is present.
const getHistoricalTotal = (item) => {
  const value = Number(item?.aggregates?.baseline_total) || 0;
  if (value <= 0) return null;
  if (item?.last_purchase_rate) return { type: "Last Purchase", value };
  if (item?.last_quote_rate) return { type: "Last Quote", value };
  return { type: "Baseline", value };
};

const ProductComparisonTab = ({
  context,
  quotesLoading,
  quotes,
  rfq,
  openModals,
  openModalForVariant,
  closeModalForVariant,
  handleFinalize,
  finalizeLoading = false,
  originalQuotes,
  availableBudget,
  normalizeFilter,
  freightFilter,
  productNegotiationData,
  loadNegotiationData,
  canWriteQuoteCompare,
  quoteComparePermissionsLoading,
  currentRFQ,
  productSummaryMap,
  quoteVisibility,
  availableHierarchies = null,
  quoteApprovalDetails = {},
  vendorRejections = [],
}) => {
  const comparisonContext = context || {};
  const currentRfqId = rfq || comparisonContext?.rfq;
  const contextRFQ = currentRFQ || comparisonContext?.currentRFQ;
  const negotiationMap = productNegotiationData || comparisonContext?.maps?.productNegotiationData || {};
  const visibility = quoteVisibility || comparisonContext?.quoteVisibility || null;

  // Per-product negotiation history modal ("View History" moved here from the
  // Negotiation Desk banner). One shared modal; rounds fetched per product.
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyRounds, setHistoryRounds] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openNegotiationHistory = async (item) => {
    setHistoryProduct(item);
    setHistoryRounds([]);
    setHistoryLoading(true);
    try {
      // Backend matches multi-product rounds covering this product too.
      const res = await getNegotiationRounds(currentRfqId, item.id);
      setHistoryRounds(res?.data || []);
    } catch (err) {
      console.error("Failed to load negotiation history:", err);
      setHistoryRounds([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeNegotiationHistory = () => {
    setHistoryProduct(null);
    setHistoryRounds([]);
  };

  if (quotesLoading) {
    return null; // Handled by the parent's informative loader
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="quote-sec-table-sub hasFullLoader">
        <h4>You don't have any quotes.</h4>
      </div>
    );
  }

  return (
    <>
      {quotes.map((item, index) => {
        const key = `${item.product_variant_id}_${item.variant}`;
        const spec = getSpec(item);
        const quantity = getQuantityValue(item);
        const unit = getQuantityUnit(item);
        const sellingPrice = getSellingPrice(item);
        const historicalTotal = getHistoricalTotal(item);
        const summary = productSummaryMap?.[item.id] || { topVendors: [] };

        // PO rejection state for this product — drives the prominent card
        // highlight (red/amber border + attention ribbon at the top) so the
        // evaluator can spot at a glance which products need a second look.
        // The ribbon copy and color follow the LATEST rejection so the user
        // sees what most recently went wrong, not a mix from earlier events.
        // Backend orders rejections by rejected_at DESC, so index 0 is latest.
        const productRejections = vendorRejections.filter(
          (r) => String(r.product_variant_id) === String(item.product_variant_id)
            && String(r.variant) === String(item.variant)
        );
        const hasRejection = productRejections.length > 0;
        const latestProductRejection = productRejections[0] || null;
        const latestRejectionIsApprover = latestProductRejection?.rejection_type === 'approver';
        const latestRejectionVendorName = latestProductRejection
          ? (latestProductRejection.vendor_organization || latestProductRejection.vendor_name)
          : '';
        const cardHighlightStyle = hasRejection
          ? {
              borderColor: latestRejectionIsApprover ? '#FB923C' : '#F87171',
              borderWidth: 2,
              boxShadow: latestRejectionIsApprover
                ? '0 0 0 4px rgba(251, 146, 60, 0.12)'
                : '0 0 0 4px rgba(248, 113, 113, 0.12)',
            }
          : undefined;

        return (
          <div
            className={styles.productCard}
            key={`qq_${index}`}
            style={cardHighlightStyle}
          >
            {hasRejection && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: latestRejectionIsApprover ? '#FFF7ED' : '#FEF2F2',
                  color: latestRejectionIsApprover ? '#9A3412' : '#991B1B',
                  borderBottom: `1px solid ${latestRejectionIsApprover ? '#FED7AA' : '#FECACA'}`,
                  padding: '10px 16px',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <span aria-hidden="true">⚠</span>
                <span>
                  {latestRejectionIsApprover
                    ? `Action needed: latest PO drafted for ${latestRejectionVendorName} was rejected by an internal approver. Review and pick the next vendor.`
                    : `Action needed: ${latestRejectionVendorName} rejected the PO. Review and pick the next vendor.`}
                </span>
              </div>
            )}
            <div className={styles.productBody}>
            <div className={styles.productHead}>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h4 className={styles.productTitle}>{item?.product_details?.[0]?.product_name}</h4>
                  {/* ProductNegotiationBadge hidden on buyer quote-compare — vendor-oriented badge that fires N per-product API calls */}
                </div>
                <p className={styles.productMeta}>
                  Quantity: {quantity} {unit}
                </p>
                {sellingPrice ? (
                  <p className={styles.productMeta}>Selling Price: {formatPrice(sellingPrice)}</p>
                ) : null}
                {!visibility?.locked && historicalTotal ? (
                  <p className={styles.productMeta}>
                    {historicalTotal.type}: Rs. {addCommasToNumber(historicalTotal.value)}
                  </p>
                ) : null}
              </div>
              <div className="d-flex gap-2 flex-wrap justify-content-end">
                {!visibility?.locked && (
                  <button
                    id="view_negotiation_history-quote_actions-quote_compare_page"
                    className={styles.actionBtnDark}
                    onClick={() => openNegotiationHistory(item)}
                    disabled={historyLoading && historyProduct?.id === item.id}
                  >
                    {historyLoading && historyProduct?.id === item.id ? 'Loading…' : 'Negotiation History'}
                  </button>
                )}
                {!visibility?.locked && (
                  <button
                    id="view_lpr_button-quote_actions-quote_compare_page"
                    className={styles.actionBtnDark}
                    onClick={() => openModalForVariant(key)}
                  >
                    View LPR History
                  </button>
                )}
              </div>
            </div>

            {spec ? (
              <div className={styles.productSpec}>
                <strong>Spec:</strong> <ReadMore content={spec} maxLines={3} />
              </div>
            ) : null}

            {!visibility?.locked && (
              <div className={styles.productBadges}>
                <span className={styles.productBadge}>Quotes: {summary.quoteCount || 0}</span>
                <span className={styles.productBadge}>Regrets: {summary.regretCount || 0}</span>
                <span className={styles.productBadge}>Target: {(() => {
                  const negoTarget = negotiationMap[item.id]?.activeRound?.target_price;
                  const productTarget = item.latest_target_price;
                  const effective = negoTarget || productTarget;
                  return effective ? formatPrice(effective) : "-";
                })()}</span>
              </div>
            )}

            {!visibility?.locked && summary.topVendors?.length > 0 ? (
              <div className={styles.productTopVendors}>
                {summary.topVendors.map((vendor) => (
                  <div className={styles.vendorCard} key={`${item.id}_${vendor.rank}_${vendor.vendorName}`}>
                    <div className={styles.vendorRank}>{vendor.rank}</div>
                    <div className={styles.vendorName}>{vendor.vendorName}</div>
                    <div className={styles.vendorValue}>{formatPrice(vendor.total)}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* PO Rejection Badge — brief product-level indicator. Distinct
                copy + color for vendor rejection vs internal approver
                rejection so the buyer immediately understands the source. */}
            {(() => {
              const rejections = vendorRejections.filter(
                r => String(r.product_variant_id) === String(item.product_variant_id) && String(r.variant) === String(item.variant)
              );
              if (rejections.length === 0) return null;
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '14px 0 10px' }}>
                  {rejections.map((rej, i) => {
                    const vendorName = rej.vendor_organization || rej.vendor_name;
                    const isApprover = rej.rejection_type === 'approver';
                    const isLatest = i === 0; // backend sends DESC by rejected_at
                    const palette = isApprover
                      ? { color: '#7C2D12', bg: '#FFF7ED', border: '#FED7AA' }
                      : { color: '#991B1B', bg: '#FEE2E2', border: '#FECACA' };
                    const text = isApprover
                      ? `Internal approver rejected the PO drafted for ${vendorName}`
                      : `${vendorName} rejected the PO`;
                    return (
                      <span
                        key={`${rej.vendor_id}_${rej.po_number || i}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, fontWeight: 600, color: palette.color,
                          background: palette.bg, border: `1px solid ${palette.border}`,
                          padding: '3px 10px', borderRadius: 6,
                        }}
                      >
                        <span aria-hidden="true">⚠</span>
                        {text}
                        {isLatest && rejections.length > 1 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 0.4,
                              textTransform: 'uppercase',
                              background: 'rgba(0,0,0,0.08)',
                              color: 'inherit',
                              padding: '1px 6px',
                              borderRadius: 999,
                              marginLeft: 2,
                            }}
                          >
                            Latest
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })()}

            {!visibility?.locked && (
              <LPRModal
                show={openModals[key] || false}
                onHide={() => closeModalForVariant(key)}
                variantId={item.product_variant_id}
              />
            )}

            {visibility?.locked ? (
              <QuoteVisibilityLockPanel
                compact
                title="Quotes Unlock After Submission Deadline"
                message="This product stays read only until the quote submission deadline passes. Vendor quotations and rates will appear automatically after that."
                deadline={visibility.deadline}
                remainingMs={visibility.remainingMs}
              />
            ) : item?.quotations?.length === 0 ? (
              <h4 className="mt-4 text-center">No Quotations yet!</h4>
            ) : (
              <ProductComparisonMatrix
                rfqId={currentRfqId}
                proditem={item}
                handleFinalize={handleFinalize}
                finalizeLoading={finalizeLoading}
                quotations={item?.quotations}
                originalQuotations={
                  originalQuotes.find((origItem) => origItem.id === item.id)?.quotations || item?.quotations
                }
                quantity={quantity}
                alreadyFinalized={item?.quotations?.filter((quoteItem) => quoteItem.finalization != null)}
                isRfqClosed={Array.isArray(item.rfq) && item.rfq[0]?.status === 2}
                projectId={Array.isArray(item.rfq) && item.rfq[0]?.project_id}
                availableBudget={availableBudget}
                normalizeFilter={normalizeFilter}
                negotiationRoundQuotes={negotiationMap[item.id]?.roundQuotes || []}
                activeRound={negotiationMap[item.id]?.activeRound || null}
                freightFilter={freightFilter}
                onRoundEnded={loadNegotiationData}
                canWrite={canWriteQuoteCompare}
                permissionsLoading={quoteComparePermissionsLoading}
                is_tender={contextRFQ?.is_tender == 1 || contextRFQ?.is_tender === true}
                hospitalityCompanyId={contextRFQ?.hospitality_company_id}
                hotelId={contextRFQ?.hotel_id}
                departmentId={contextRFQ?.department_id}
                preloadedHierarchies={availableHierarchies}
                preloadedQuoteApprovalStatus={item.quote_approval_status || null}
                preloadedInstances={quoteApprovalDetails?.[item.id] || null}
                vendorRejections={vendorRejections.filter(
                  r => String(r.product_variant_id) === String(item.product_variant_id) && String(r.variant) === String(item.variant)
                )}
              />
            )}
            </div>
          </div>
        );
      })}

      {/* Per-product negotiation history modal (relocated from the
          Negotiation Desk banner) — scoped to one product's rounds. */}
      {historyProduct && (
        <NegotiationModal
          show={!!historyProduct}
          handleShow={() => {}}
          onHide={closeNegotiationHistory}
          mode="history"
          rfq_id={currentRfqId}
          products={quotes}
          activeRounds={[]}
          roundsHistory={historyRounds}
          selectedProduct={historyProduct}
          onProductSelect={() => {}}
          onRefresh={() => openNegotiationHistory(historyProduct)}
          canWrite={canWriteQuoteCompare}
          permissionsLoading={quoteComparePermissionsLoading}
          hospitalityCompanyId={contextRFQ?.hospitality_company_id}
          hotelId={contextRFQ?.hotel_id}
          departmentId={contextRFQ?.department_id}
        />
      )}
    </>
  );
};

export default ProductComparisonTab;
