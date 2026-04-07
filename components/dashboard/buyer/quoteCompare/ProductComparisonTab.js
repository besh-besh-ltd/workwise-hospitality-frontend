import React from "react";
import { Button } from "react-bootstrap";
import ReadMore from "@/components/shared/ReadMore";
import LPRModal from "@/components/shared/LPRModal";
import ProductNegotiationBadge from "@/components/dashboard/vendor/ProductNegotiationBadge";
import ProductComparisonMatrix from "@/components/dashboard/buyer/quoteCompare/tables/ProductComparisonMatrix";
import {
  addCommasToNumber,
  calculateTotal,
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

const getHistoricalTotal = (item, normalizeFilter) => {
  const quantity = getQuantityValue(item);
  if (item?.last_purchase_rate) {
    return {
      type: "Last Purchase",
      value: calculateTotal(item.last_purchase_rate, quantity, normalizeFilter),
    };
  }

  if (item?.last_quote_rate) {
    return {
      type: "Last Quote",
      value: calculateTotal(item.last_quote_rate, quantity, normalizeFilter),
    };
  }

  return null;
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
}) => {
  const comparisonContext = context || {};
  const currentRfqId = rfq || comparisonContext?.rfq;
  const contextRFQ = currentRFQ || comparisonContext?.currentRFQ;
  const negotiationMap = productNegotiationData || comparisonContext?.maps?.productNegotiationData || {};

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
        const historicalTotal = getHistoricalTotal(item, normalizeFilter);
        const summary = productSummaryMap?.[item.id] || { topVendors: [] };

        return (
          <div className={styles.productCard} key={`qq_${index}`}>
            <div className={styles.productHead}>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h4 className={styles.productTitle}>{item?.product_details?.[0]?.product_name}</h4>
                  <ProductNegotiationBadge rfq_id={currentRfqId} rfq_product_id={item.id} />
                </div>
                <p className={styles.productMeta}>
                  Quantity: {quantity} {unit}
                </p>
                {sellingPrice ? (
                  <p className={styles.productMeta}>Selling Price: {formatPrice(sellingPrice)}</p>
                ) : null}
                {historicalTotal ? (
                  <p className={styles.productMeta}>
                    {historicalTotal.type}: Rs. {addCommasToNumber(historicalTotal.value)}
                  </p>
                ) : null}
              </div>
              <div>
                <button
                  id="view_lpr_button-quote_actions-quote_compare_page"
                  className={styles.actionBtnDark}
                  onClick={() => openModalForVariant(key)}
                >
                  View LPR History
                </button>
              </div>
            </div>

            {spec ? (
              <div className={styles.productSpec}>
                <strong>Spec:</strong> <ReadMore content={spec} maxLines={3} />
              </div>
            ) : null}

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

            {summary.topVendors?.length > 0 ? (
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

            <LPRModal
              show={openModals[key] || false}
              onHide={() => closeModalForVariant(key)}
              variantId={item.product_variant_id}
            />

            {item?.quotations?.length === 0 ? (
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
              />
            )}
          </div>
        );
      })}
    </>
  );
};

export default ProductComparisonTab;
