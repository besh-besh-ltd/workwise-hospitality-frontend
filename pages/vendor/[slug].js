import React from "react";
import SearchPage from "@/components/dashboard/vendor/search";
import Head from "next/head";
import { useRouter } from "next/router";
import { textCapitalize } from "@/utils/sharedFunctions";

const DynamicProductPage = ({ pageTitle }) => {
  const router = useRouter();
  const { slug } = router.query;

  // Handle fallback loading state
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  // Meta title and description per requirements
  const parseSlug = (slugValue) => {
    if (!slugValue || slugValue === 'all') return { product: null, city: null, state: null };
    const parts = String(slugValue).split('-');
    if (parts.length >= 3) {
      const state = parts[parts.length - 1];
      const city = parts[parts.length - 2];
      const product = parts.slice(0, parts.length - 2).join('-');
      return { product, city, state };
    }
    if (parts.length === 2) {
      const state = parts[1];
      const product = parts[0];
      return { product, city: null, state };
    }
    return { product: parts[0], city: null, state: null };
  };

  const toTitle = (val) =>
    val
      ? val
          .split('-')
          .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
          .join(' ')
      : '';

  const { product, city, state } = parseSlug(slug);

  let metaTitle = '';
  let metaDescription = '';

  if (slug === 'all') {
    metaTitle = 'Explore Verified Industrial Vendors | Workwise Vendor Directory';
    metaDescription =
      'Discover top vendors for EPC, infrastructure, and industrial projects. Workwise helps you find verified suppliers and manage vendor relationships easily.';
  } else if (product && city && state) {
    const p = toTitle(product);
    const c = toTitle(city);
    const s = toTitle(state);
    metaTitle = `${p} Vendors Near ${c} , ${s} | ${p} Suppliers in ${c} , ${s} - Workwise`;
    metaDescription = `Explore trusted ${p} vendors near ${c} , ${s}. Efficient sourcing, verified quality, and seamless vendor onboarding through Workwise.`;
  } else if (product && state) {
    const p = toTitle(product);
    const s = toTitle(state);
    metaTitle = `${p} Vendors Near ${s} | ${p} Suppliers in ${s} - Workwise`;
    metaDescription = `Explore trusted ${p} vendors near ${s}. Efficient sourcing, verified quality, and seamless vendor onboarding through Workwise.`;
  } else if (product) {
    const p = toTitle(product);
    metaTitle = `${p} Vendors | ${p} Suppliers - Workwise`;
    metaDescription = `Explore trusted ${p} vendors. Efficient sourcing, verified quality, and seamless vendor onboarding through Workwise.`;
  } else {
    metaTitle = 'Search Vendors | Workwise';
    metaDescription = 'Search and discover trusted manufacturers and suppliers at Workwise.';
  }

  return (
    <>
      <Head>
          <title>{metaTitle}</title>
          <meta name="description" content={metaDescription} />

          <meta property="og:title" content={metaTitle} />
          <meta property="og:description" content={metaDescription} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/vendor/${slug}`} />
          <meta property="og:site_name" content="Workwise" />
          
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "http://schema.org",
              "@type": "WebPage",
              "name": metaTitle,
              "description": metaDescription,
              "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL}/vendor/${slug}`,
              "mainEntity": {
                "@type": "ItemList",
                "name": slug === 'all' ? "Vendor Directory" : `${textCapitalize(slug)} Vendors`,
                "description": slug === 'all' 
                  ? "Find trusted manufacturers and suppliers across all categories"
                  : `Find trusted ${textCapitalize(slug)} manufacturers and suppliers`
              }
            })}
          </script>
      </Head>
      <SearchPage title={`We Find Trusted Vendors for You`} type="products" />
    </>
  );
};

// Function to generate page content dynamically
async function fetchPageTitle(slug) {
  // For simplicity, return a custom page title based on slug
  const knownSlugs = {
    vendors: "Search Vendors",
    products: "Search Products",
  };

  return knownSlugs[slug] || `Explore ${slug}`;
}

export async function getStaticProps({ params }) {
  const { slug } = params;

  // Fetch or dynamically generate the page title based on slug
  const pageTitle = await fetchPageTitle(slug);

  return {
    props: {
      pageTitle,
    },
    revalidate: 60, // Optionally, regenerate the page every 60 seconds
  };
}

export async function getStaticPaths() {
  return {
    // No pre-built paths, all are generated dynamically
    paths: [],

    // Use fallback for dynamic page generation
    fallback: 'blocking', // This will dynamically generate pages on demand
  };
}

export default DynamicProductPage;
