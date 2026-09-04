import Image from "next/image";
import brand from "@/data/ihg/brand";

/**
 * The client's mark. Renders the supplied asset when `brand.logo.src` is set;
 * until then it draws a wordmark so nothing in the demo depends on a file we
 * do not have yet. Swapping in the real logo is a one-line change in brand.js.
 */
const BrandLogo = ({ height = 22, tone = "navy" }) => {
  const { logo, clientShortName, productName } = brand;

  if (logo.src) {
    return (
      <Image
        src={logo.src}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        priority
        style={{ height, width: "auto", objectFit: "contain" }}
      />
    );
  }

  const ink = tone === "light" ? "#ffffff" : "var(--navy)";
  const sub = tone === "light" ? "rgba(255,255,255,0.72)" : "var(--fg-3)";

  return (
    <span
      aria-label={`${clientShortName} ${productName}`}
      style={{ display: "inline-flex", alignItems: "baseline", gap: 7, lineHeight: 1 }}
    >
      <span
        style={{
          fontSize: height * 0.92,
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: ink,
        }}
      >
        {clientShortName}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: height * 0.66,
          background: tone === "light" ? "rgba(255,255,255,0.34)" : "var(--border-strong)",
          alignSelf: "center",
        }}
      />
      <span
        style={{
          fontSize: height * 0.52,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: sub,
        }}
      >
        {productName}
      </span>
    </span>
  );
};

export default BrandLogo;
