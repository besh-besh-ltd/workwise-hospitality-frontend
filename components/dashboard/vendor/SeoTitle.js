import React from "react";
import { textCapitalize } from "@/utils/sharedFunctions";

const SeoTitle = ({ slug, currentSelectedProduct, address }) => {
  const { selectedCity, selectedState } = address || {};

  const slugStr = Array.isArray(slug)
    ? slug.join("/")
    : typeof slug === "string"
    ? slug
    : "";

  // ————————————————————
  // 1. Get product name (from selected product OR fallback to slug)
  // ————————————————————
  const getProductName = () => {
    if (currentSelectedProduct) {
      return (
        currentSelectedProduct.variant_name ||
        currentSelectedProduct.product_name ||
        ""
      );
    }

    // Fallback: extract from slug (e.g. "flange-pipe-mumbai-maharashtra" → "flange pipe")
    if (!slugStr || slugStr === "all") return "";

    const clean = slugStr
      .replace(/category\d*/gi, "")           // remove -category123
      .replace(/\/+/g, " ")                   // slashes → space
      .replace(/-[a-z]+(-[a-z]+)?$/gi, "")    // remove location suffix like -mumbai-maharashtra
      .replace(/-/g, " ")                     // hyphens → space
      .replace(/\d+/g, "")                    // remove numbers
      .replace(/\s{2,}/g, " ")
      .trim();

    return clean || "";
  };

  const rawProductName = getProductName();
  const productName = rawProductName
    ? textCapitalize(rawProductName)
    : "";

  // ————————————————————
  // 2. Location
  // ————————————————————
  const cityName = selectedCity?.name || "";
  const stateName = selectedState?.name || "";

  // ————————————————————
  // 3. Build final SEO title
  // ————————————————————
  let title = "Discover Verified Vendors for Industrial Procurement";

  if (slugStr === "all") {
    title = "All Industrial Product Vendors & Suppliers in India | Workwise";
  } else if (productName && cityName && stateName) {
    title = `${productName} Suppliers & Manufacturers in ${cityName}, ${stateName} | Workwise`;
  } else if (productName && stateName) {
    title = `${productName} Suppliers & Manufacturers in ${stateName} | Workwise`;
  } else if (productName) {
    title = `${productName} Suppliers & Manufacturers in India | Workwise`;
  }

  return <h1 className="heading">{title}</h1>;
};

export default SeoTitle;