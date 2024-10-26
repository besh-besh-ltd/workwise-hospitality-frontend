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
    const metaTitle = `Top ${textCapitalize(slug)} Manufacturers, Suppliers & Vendors | Workwise`;
    const metaDescription = `Discover high-quality ${textCapitalize(slug)} from trusted manufacturers and suppliers at Workwise. Your one-stop vendor for premium industrial products and solutions.`;

  return (
    <>
      <Head>
          <title>{metaTitle}</title>
          <meta name="description" content={metaDescription} />

          <meta property="og:title" content={metaTitle} />
          <meta property="og:description" content={metaDescription} />
          <meta property="og:url" content={`https://letsworkwise.com/vendor/${slug}`} />
      </Head>
      <SearchPage title={`Search Vendors`} type="products" />
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
