import React from "react";
import { Download } from "lucide-react";
import styles from "./SendQuoteWizard.module.scss";

/**
 * The files the buyer attached to a product, shown to the vendor quoting it.
 *
 * getRfqById json_aggs `tbl_rfq_product_files` into three per-product fields,
 * so each arrives as an ARRAY of URLs — or null when the buyer attached none.
 * A few older payloads carry a bare string, which is why `toList` accepts both.
 *
 * Rendering them was previously inline in one place only — the technical
 * evaluation screen — so an RFQ without technical evaluation showed the vendor
 * nothing at all (RFQ 1104, reported 2026-09-23). That inline version also did
 * `href={p.datasheet_file}` on the array, which stringifies to a comma-joined
 * URL as soon as a product has two files. Both are why this lives in one
 * component used by every screen that shows a product.
 */
const TYPES = [
  { key: "datasheet_file", label: "TDS", title: "Technical data sheet" },
  { key: "spec_file", label: "SPEC", title: "Specification" },
  { key: "qap_file", label: "QAP", title: "Quality assurance plan" },
];

const toList = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(
    (url) => typeof url === "string" && url.trim() !== ""
  );

/** Flat list of `{ url, label, title }`, in TDS → SPEC → QAP order. */
export const buyerAttachmentsOf = (product) =>
  TYPES.flatMap(({ key, label, title }) => {
    const urls = toList(product?.[key]);
    // Numbered only when there is more than one of a kind, so the common case
    // reads "TDS" rather than "TDS 1".
    return urls.map((url, i) => ({
      url,
      label: urls.length > 1 ? `${label} ${i + 1}` : label,
      title,
    }));
  });

const BuyerAttachments = ({ product, className }) => {
  const files = buyerAttachmentsOf(product);
  if (files.length === 0) return null;

  return (
    <div className={className || styles.productMetaRow}>
      {files.map((file, i) => (
        <a
          key={`${file.label}-${i}`}
          className={styles.fileChip}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          title={file.title}
        >
          <Download size={11} />
          {file.label}
        </a>
      ))}
    </div>
  );
};

export default BuyerAttachments;
