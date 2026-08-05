// Vendor initials + colored circle. Determines its own palette deterministically
// from the vendor id so the same vendor gets the same colour across pages.
import styles from "./VendorAvatar.module.scss";

const PALETTE = ["indigo","sky","green","warm","violet","teal","rose"];
const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");

export default function VendorAvatar({ id, name, size = "md" }) {
  const palette = PALETTE[(Number(id) || 0) % PALETTE.length];
  const initials = initialsOf(name) || "??";
  return (
    <span
      title={name}
      className={`${styles.av} ${styles[palette]} ${size === "sm" ? styles.sm : ""}`}
    >
      {initials}
    </span>
  );
}
