import React from "react";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import styles from "./QuoteCompareTables.module.scss";

const formatAmount = (value, withSymbol = true) => {
  const numeric = Number(value || 0);
  return withSymbol ? `Rs. ${addCommasToNumber(Math.round(numeric))}` : addCommasToNumber(Math.round(numeric));
};

const formatCharge = (value, mode) => {
  if (mode === "percentage") return `${value || 0}%`;
  return formatAmount(value);
};

const CostBreakupPanel = ({ details = {}, quantity = 0, total = 0, showComment = true, showFile = false }) => {
  const qty = Number(quantity || details.quantity || 0);
  const unitPrice = Number(details.unit_price || 0);

  return (
    <div className={styles.breakupPanel}>
      <table className={styles.breakupTable}>
        <tbody>
          <tr>
            <th>Base Price</th>
            <td>{formatAmount(unitPrice)}</td>
          </tr>
          <tr>
            <th>Subtotal</th>
            <td>{formatAmount(unitPrice * qty)}</td>
          </tr>
          <tr>
            <th>Packaging</th>
            <td>{formatCharge(details.package_price, details.package_mode)}</td>
          </tr>
          <tr>
            <th>Freight</th>
            <td>{formatCharge(details.freight_price, details.freight_mode)}</td>
          </tr>
          <tr>
            <th>GST</th>
            <td>{formatCharge(details.tax, details.tax_mode)}</td>
          </tr>
          <tr>
            <th>Delivery</th>
            <td>{details.delivery_period ? `${details.delivery_period} day(s)` : "--"}</td>
          </tr>
          {showComment ? (
            <tr>
              <th>Comment</th>
              <td>{details.comment || "--"}</td>
            </tr>
          ) : null}
          {showFile ? (
            <tr>
              <th>Files</th>
              <td>{Array.isArray(details.document_files) && details.document_files.length > 0 ? "Attached" : "--"}</td>
            </tr>
          ) : null}
          <tr>
            <th>Total</th>
            <td>{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default CostBreakupPanel;
