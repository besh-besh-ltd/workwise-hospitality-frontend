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
        {item.target_price != null && <span>Target ₹{Number(item.target_price).toLocaleString()}</span>}
        {item.spec_text && <span className={styles.spec}>{item.spec_text}</span>}
      </div>
    </div>
  );
}
