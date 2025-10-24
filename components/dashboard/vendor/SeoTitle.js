import React from 'react';
import { textCapitalize } from '@/utils/sharedFunctions';

const SeoTitle = ({ slug, search_key, currentSelectedProduct, selectedState, selectedCity }) => {
  const slugStr = Array.isArray(slug) ? slug.join('/') : typeof slug === 'string' ? slug : '';

  const getProductTitle = () => {
    if (currentSelectedProduct) {
      const title = currentSelectedProduct.variant_name || currentSelectedProduct.product_name || '';
      return title;
    }
    return '';
  };

  const rawProduct = getProductTitle() || search_key || slugStr;

  // Convert to safe string
  const safeRawProduct = Array.isArray(rawProduct)
    ? rawProduct.join(" ")
    : String(rawProduct || "");

  // ✅ Clean unwanted tokens: "category1234", numbers, slashes, etc.
  const cleanedProduct = safeRawProduct
    .replace(/category\d*/gi, "")  // remove words like "category3211"
    .replace(/\/+/g, " ")          // replace slashes with spaces
    .replace(/\d+/g, "")           // remove standalone numbers
    .replace(/--+/g, "-")          // collapse multiple dashes
    .replace(/\s{2,}/g, " ")       // collapse multiple spaces
    .trim();

  // Capitalize the cleaned product name
  const productName = textCapitalize(cleanedProduct.replace(/-/g, " ").trim());


  const stateName = selectedState?.[0]?.name;
  const cityName = selectedCity?.[0]?.name;

  let title = 'Discover Verified Vendors for Industrial Procurement';
  if (slugStr === 'all') title = 'Discover Verified Vendors for Industrial Procurement';
  else if (productName && cityName && stateName) title = `Top ${productName} Vendors & Suppliers Near ${cityName},  ${stateName}`;
  else if (productName && stateName) title = `Top ${productName} Vendors & Suppliers Near ${stateName}`;
  else if (productName) title = `Top ${productName} Vendors & Suppliers`;

  return <h1 className="heading">{title}</h1>;
};

export default SeoTitle;
