import { BsStars } from "react-icons/bs";
import styles from "./WizardChat.module.css";

export default function WizardChat() {
  return (
    <a
      href="https://workwise-assist.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.fab}
      aria-label="Open WorkWise AI assistant"
    >
      <BsStars size={22} />
    </a>
  );
}
