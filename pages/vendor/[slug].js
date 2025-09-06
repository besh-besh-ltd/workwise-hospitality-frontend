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

  // / Meta title and description
    const metaTitle = slug === 'all' 
      ? 'Search Vendors | Workwise'
      : `Top ${textCapitalize(slug)} Manufacturers, Suppliers & Vendors | Workwise`;
    const metaDescription = slug === 'all'
      ? 'Search and discover trusted manufacturers and suppliers at Workwise. Your one-stop platform for finding reliable vendors and suppliers.'
      : `Discover high-quality ${textCapitalize(slug)} from trusted manufacturers and suppliers at Workwise. Your one-stop vendor for premium industrial products and solutions.`;

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
