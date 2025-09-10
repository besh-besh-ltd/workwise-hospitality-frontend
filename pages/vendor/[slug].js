import React from "react";
import SearchPage from "@/components/dashboard/vendor/search";
import Head from "next/head";
import { useRouter } from "next/router";
import { textCapitalize } from "@/utils/sharedFunctions";
import { State_Cities } from "@/utils/constants";

// Precompute state slugs
const stateSet = new Set(
  State_Cities.map((st) =>
    st.state_name?.trim()?.toLowerCase()?.replace(/\s+/g, "-")
  )
);

// Precompute city slugs
const citySet = new Set();
State_Cities.forEach((st) => {
  st.cities.forEach((c) => {
    const citySlug = c?.name?.trim()?.toLowerCase()?.replace(/\s+/g, "-");
    citySet.add(citySlug);
  });
});

// ✅ Usage
const generateMetatitleDesc = (slug = "") => {
  const slugifyLower = (s) => s?.trim()?.toLowerCase()?.replace(/\s+/g, "-") || "";
  const toTitle = (s) => textCapitalize((s || "").replace(/-/g, " ").trim());

  const slugArr = slug
    .trim()
    .split("-")
    .filter((x) => x !== "");

  // Try to match trailing city/state using 3→2→1 tokens, normalizing spaces
  const tryMatchFromEnd = (arr, set) => {
    for (let len = 3; len >= 1; len--) {
      if (arr.length >= len) {
        const raw = arr.slice(arr.length - len).join("-");
        const candidate = slugifyLower(raw);
        if (set.has(candidate)) {
          return { match: candidate, consumed: len };
        }
      }
    }
    return { match: "", consumed: 0 };
  };

  let remaining = [...slugArr];
  let stateSlug = "";
  let citySlug = "";

  // Prefer matching state first from the end; if not found, try city first
  let res = tryMatchFromEnd(remaining, stateSet);
  if (res.consumed > 0) {
    stateSlug = res.match;
    remaining.splice(remaining.length - res.consumed, res.consumed);
    res = tryMatchFromEnd(remaining, citySet);
    if (res.consumed > 0) {
      citySlug = res.match;
      remaining.splice(remaining.length - res.consumed, res.consumed);
    }
  } else {
    res = tryMatchFromEnd(remaining, citySet);
    if (res.consumed > 0) {
      citySlug = res.match;
      remaining.splice(remaining.length - res.consumed, res.consumed);
    }
    res = tryMatchFromEnd(remaining, stateSet);
    if (res.consumed > 0) {
      stateSlug = res.match;
      remaining.splice(remaining.length - res.consumed, res.consumed);
    }
  }

  const productSlug = remaining.join("-");
  const productName = toTitle(productSlug);
  const stateName = toTitle(stateSlug);
  const cityName = toTitle(citySlug);

  let metaTitle = "Explore Verified Industrial Vendors | Workwise Vendor Directory";
  let metaDescription = "Discover top vendors for EPC, infrastructure, and industrial projects. Workwise helps you find verified suppliers and manage vendor relationships easily.";

  if (slugifyLower(productSlug) === "all") {
    // keep defaults
  } else if (productName && cityName && stateName) {
    metaTitle = `${productName} Vendors Near ${cityName} , ${stateName} | ${productName} Suppliers in ${cityName} , ${stateName} - Workwise`;
    metaDescription = `Explore trusted ${productName} vendors near ${cityName} , ${stateName}. Efficient sourcing, verified quality, and seamless vendor onboarding through Workwise.`;
  } else if (productName && stateName) {
    metaTitle = `${productName} Vendors Near ${stateName} | ${productName} Suppliers in ${stateName} - Workwise`;
    metaDescription = `Explore trusted ${productName} vendors near ${stateName}. Efficient sourcing, verified quality, and seamless vendor onboarding through Workwise.`;
  } else if (productName) {
    metaTitle = `${productName} Vendors | ${productName} Suppliers - Workwise`;
    metaDescription = `Explore trusted ${productName} vendors. Efficient sourcing, verified quality, and seamless vendor onboarding through Workwise.`;
  }

  return {
    metaTitle,
    metaDescription,
  };
};

const DynamicProductPage = ({ pageTitle }) => {
  const router = useRouter();
  const { slug } = router.query;

  // Handle fallback loading state
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  const metaData = generateMetatitleDesc(slug);

  return (
    <>
    <Head>
      <title>{metaData?.metaTitle}</title>
      <meta name="description" content={metaData?.metaDescription} />
      <meta property="og:title" content={metaData?.metaTitle} />
      <meta property="og:description" content={metaData?.metaDescription} />
      <meta property="og:type" content="website" />
      <meta
        property="og:url"
        content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/vendor/${slug}`}
      />
      <meta property="og:site_name" content="Workwise" />
    </Head>
      {/* Meta tags are set inside SearchPage for accuracy based on product/location */}
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
