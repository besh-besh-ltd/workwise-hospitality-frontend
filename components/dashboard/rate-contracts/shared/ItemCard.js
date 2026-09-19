// Item summary card — variant name + code + uom + indicative qty. Used in
// the ARC detail page item list, the wizard item picker, and the MR-item
// preview row.

import styles from "./ItemCard.module.scss";

export default function ItemCard({ item, dense = false }) {
  if (!item) return null;
  const name = item.variant_name || item.product_name || `Variant #${item.product_variant_id || ""}`;
  const code = item.variant_slug || item.product_code || null;
  const qty  = item.indicative_qty != null ? Number(item.indicative_qty) : null;
  return (
    <div className={`${styles.card} ${dense ? styles.dense : ""}`}>
      <div className={styles.head}>
        <div className={styles.name}>{name}</div>
        {code && <div className={styles.code}>{code}</div>}
      </div>
      <div className={styles.meta}>
        {qty != null && <span><strong>{qty.toLocaleString()}</strong> {item.uom || ""}</span>}
        {/* Sampling is a property of the item (client feedback item 3). This
            card is shared by the buyer's ARC detail and the vendor's quote
            page, so saying it here is how the supplier finds out which items
            need a physical sample — the old contract-wide flag was documented
            as "displayed to suppliers" but was never actually shown to them. */}
        {item.sample_required && <span className={styles.sample}>Sample required</span>}
        {item.spec_text && <span className={styles.spec}>{item.spec_text}</span>}
      </div>
    </div>
  );
}
