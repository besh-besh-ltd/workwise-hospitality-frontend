import Link from "next/link";

/**
 A flexible and reusable button that can act as a regular clickable button or a navigation link.
  Supports:
   - Conditional rendering as <Link> or <button> based on `href`
   - Optional icons (left or right of label)
   - Theming (primary or secondary) via CSS variables
   - Custom width and additional class styling 
   Ideal for use across pages where consistent UI behavior is needed with minimal setup.
 */

const SmartButton = ({
  href = "",
  label = "Click",
  onClick = null,
  icon = null,
  iconPosition = "left", // "left" or "right"
  theme = "primary", // "primary" or "secondary"
  width = "120px",
  className = "",
}) => {
  const backgroundColor =
    theme === "secondary" ? "var(--secondary-color)" : "var(--primary-color)";

  const ButtonContent = (
    <>
      {icon && iconPosition === "left" && <span className="me-1">{icon}</span>}
      {label}
      {icon && iconPosition === "right" && <span className="ms-1">{icon}</span>}
    </>
  );

  const ButtonElement = (
    <button
      type="button"
      onClick={onClick}
      className={` border-0 text-white rounded-2  ${className}`}
      style={{
        width,
        backgroundColor,
        transition: "background-color 0.3s ease",
      }}
    >
      {ButtonContent}
    </button>
  );

  return href ? <Link href={href}>{ButtonElement}</Link> : ButtonElement;
};

export default SmartButton;
