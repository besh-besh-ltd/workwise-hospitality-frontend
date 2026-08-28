import React, { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import styles from "./InfoTip.module.scss";

/**
 * The "i" affordance for explaining a term in place.
 *
 * Previously CardTooltip, which opened on hover only. That is fine for a
 * mouse and useless for a keyboard or a touch screen, and this component now
 * appears next to terms an admin genuinely may not know ("coverage"), where
 * being unable to read the explanation is the difference between configuring
 * access correctly and guessing. So the trigger is a real button: it takes
 * focus, opens on focus as well as hover, toggles on tap, and closes on
 * Escape. `aria-describedby` ties the bubble to the trigger for screen
 * readers.
 *
 * Positioning flips below the trigger when there is not enough room above,
 * which matters in dense tables where the first row sits near the viewport
 * top and a bubble rendered upward would be clipped.
 */
const InfoTip = ({ text, label = "More information", size = 13, className = "" }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, below: false });
  const triggerRef = useRef(null);
  const bubbleId = useId();

  const place = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // 56px is a comfortable clearance for a two-line bubble plus its arrow.
    const below = rect.top < 56;
    setPos({
      top: below
        ? rect.bottom + window.scrollY + 8
        : rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2,
      below,
    });
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    place();
    const close = () => setVisible(false);
    // Scroll and resize move the trigger out from under an absolutely
    // positioned bubble, so dismiss rather than chase it.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [visible, place]);

  const onKeyDown = (e) => {
    if (e.key === "Escape" && visible) {
      e.stopPropagation();
      setVisible(false);
    }
  };

  if (!text) return null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${className}`.trim()}
        aria-label={label}
        aria-describedby={visible ? bubbleId : undefined}
        aria-expanded={visible}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          // Tap-to-toggle for touch, where there is no hover and no focus ring.
          e.preventDefault();
          setVisible((v) => !v);
        }}
      >
        <Info size={size} className={styles.icon} aria-hidden="true" />
      </button>
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            id={bubbleId}
            role="tooltip"
            className={`${styles.bubble} ${pos.below ? styles.below : ""}`.trim()}
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
            <span className={styles.arrow} />
          </span>,
          document.body
        )}
    </>
  );
};

export default InfoTip;
