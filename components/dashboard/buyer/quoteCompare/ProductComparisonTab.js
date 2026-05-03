import React from "react";
import ReadMore from "@/components/shared/ReadMore";
import LPRModal from "@/components/shared/LPRModal";
import ProductComparisonMatrix from "@/components/dashboard/buyer/quoteCompare/tables/ProductComparisonMatrix";
import QuoteVisibilityLockPanel from "@/components/dashboard/buyer/quoteCompare/QuoteVisibilityLockPanel";
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

        return (
          <div className={styles.productCard} key={`qq_${index}`}>
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
              <div>
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

            {/* Vendor Rejection Badge — brief indicator at product level */}
            {(() => {
              const rejections = vendorRejections.filter(
                r => String(r.product_variant_id) === String(item.product_variant_id) && String(r.variant) === String(item.variant)
              );
              if (rejections.length === 0) return null;
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '14px 0 10px' }}>
                  {rejections.map((rej, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11.5, fontWeight: 600, color: '#991B1B',
                      background: '#FEE2E2', border: '1px solid #FECACA',
                      padding: '3px 10px', borderRadius: 6,
                    }}>
                      PO Rejected by {rej.vendor_organization || rej.vendor_name}
                    </span>
                  ))}
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
        );
      })}
    </>
  );
};

export default ProductComparisonTab;
