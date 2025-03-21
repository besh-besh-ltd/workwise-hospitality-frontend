import React from 'react';
import Head from 'next/head';
import { textCapitalize } from '@/utils/sharedFunctions';

export const ProductMetaTags = ({ slug }) => {
  let metaTitle, metaDescription;
  
  const isAllCategories = slug?.[0] === 'all';
  const isCategoryPage = slug?.length === 1 && !isAllCategories;
  const isProductPage = slug?.length === 2;

  if (isAllCategories) {
    metaTitle = "All Product Categories | Workwise";
    metaDescription = "Browse all industrial product categories at Workwise.";
  } else if (isCategoryPage) {
    const category = textCapitalize(slug[0].replace(/-/g, ' '));
    metaTitle = `${category} Products | Workwise`;
    metaDescription = `Discover ${category} products from trusted manufacturers.`;
  } else if (isProductPage) {
    const product = textCapitalize(slug[1].replace(/-/g, ' '));
    metaTitle = `${product} | Workwise`;
    metaDescription = `Find the best ${product} from verified manufacturers.`;
  }

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/products/${slug.join('/')}`} />
    </Head>
  );
};