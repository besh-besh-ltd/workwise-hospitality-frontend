import React from "react";
import { HelpCircle, Link2, PackagePlus } from "lucide-react";
import styles from "./receive.module.scss";

// "Is this the same as …?" A PO line whose product has no stock item yet, but
// the item master holds a likely match (ReceiveContext.itemSuggestions). Yes
// maps the product to that item at post (mapToInvItemId, inventory.update);
// No lets posting create a new item. Either way the answer is the receiver's.
//
// Props: { productName, suggestions:[{invItemId, name}], chosenId, decided,
//          onChoose(invItemId|null), onReset }

const ItemMatchPrompt = ({ productName, suggestions = [], chosenId = null, decided = false, onChoose, onReset }) => {
  if (!suggestions.length) return null;

  if (decided) {
    const chosen = suggestions.find((s) => s.invItemId === chosenId);
    return (
      <div className={styles.matchDone}>
        {chosen ? <Link2 size={13} aria-hidden="true" /> : <PackagePlus size={13} aria-hidden="true" />}
        <span>{chosen ? `Stocked as ${chosen.name}` : "Stocked as a new item"}</span>
        <button type="button" className={styles.btnLink} onClick={onReset}>
          Change
        </button>
      </div>
    );
  }

  const [first, ...others] = suggestions;
  return (
    <div className={styles.match} role="group" aria-label={`Match ${productName} to a stock item`}>
      <div className={styles.matchQ}>
        <HelpCircle size={14} aria-hidden="true" />
        <span>
          Is this the same as <strong>{first.name}</strong>?
        </span>
      </div>
      <div className={styles.matchActions}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => onChoose(first.invItemId)}>
          Yes, same item
        </button>
        {others.map((s) => (
          <button
            key={s.invItemId}
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
            onClick={() => onChoose(s.invItemId)}
          >
            Same as {s.name}
          </button>
        ))}
        <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onChoose(null)}>
          No, new item
        </button>
      </div>
    </div>
  );
};

export default ItemMatchPrompt;
