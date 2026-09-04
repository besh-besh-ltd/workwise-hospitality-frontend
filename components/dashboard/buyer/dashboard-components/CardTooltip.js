import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import styles from "./CardTooltip.module.scss";

const CardTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  useEffect(() => {
    if (visible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPos({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [visible]);

  return (
    <span
      ref={iconRef}
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <Info size={13} className={styles.icon} />
      {visible &&
        createPortal(
          <span
            className={styles.bubble}
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
            <span className={styles.arrow} />
          </span>,
          document.body
        )}
    </span>
  );
};

export default CardTooltip;
