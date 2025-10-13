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
  const safeRawProduct = Array.isArray(rawProduct) ? rawProduct.join(' ') : String(rawProduct || '');
  const productName = textCapitalize(safeRawProduct.replace(/-/g, ' ').trim());

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
