import { useEffect, useRef, useState } from "react";
import { BsStars } from "react-icons/bs";
import styles from "./WizardChat.module.css";

const STORAGE_KEY = "wizardchat-pos";
const FAB_SIZE = 56;

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export default function WizardChat() {
  const [pos, setPos] = useState(null); // null = CSS default (bottom-right)
  const posRef = useRef(null);
  const fabRef = useRef(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Load persisted position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        posRef.current = parsed;
        setPos(parsed);
      }
    } catch {}
  }, []);

  const getXY = (e) =>
    e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

  const onPointerDown = (e) => {
    dragging.current = true;
    moved.current = false;
    const { x, y } = getXY(e);
    const rect = fabRef.current.getBoundingClientRect();
    dragOffset.current = { x: x - rect.left, y: y - rect.top };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      moved.current = true;
      const { x, y } = e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };
      const newPos = {
        x: clamp(x - dragOffset.current.x, 0, window.innerWidth - FAB_SIZE),
        y: clamp(y - dragOffset.current.y, 0, window.innerHeight - FAB_SIZE),
      };
      posRef.current = newPos;
      setPos({ ...newPos });
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (moved.current && posRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
        } catch {}
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const handleClick = (e) => {
    if (moved.current) {
      e.preventDefault(); // drag ended — don't navigate
    }
  };

  const fabStyle = pos
    ? { left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
    : {};

  return (
    <a
      ref={fabRef}
      href="https://assist.letsworkwise.com/login"
      target="_blank"
      rel="noopener noreferrer"
      draggable="false"
      className={styles.fab}
      style={fabStyle}
      aria-label="Open WorkWise AI assistant"
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onClick={handleClick}
    >
      <BsStars size={22} />
    </a>
  );
}
