// pages/category/sitemap/[[...slug]].js
import { pipeline } from "stream/promises"; // Node 16+ built-in for streaming
import fetch from "node-fetch"; // Required for fetch streaming in Node

function CategorySitemap() {
  return null; // No UI rendering needed
}

export const getServerSideProps = async ({ params, res }) => {
  const slug = params?.slug || [];

  // Must be in form /category/sitemap/[page].xml
  if (!slug.length) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }

  // Parse the page number
  const raw = Array.isArray(slug) ? slug[0] : slug;
  const pageStr = String(raw).replace(/\.xml$/, "");
  const pageNumber = parseInt(pageStr, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.letsworkwise.com/api/v1";

  try {
    // Fetch the API response directly from backend
    const apiRes = await fetch(
      `${API_URL}/seo/vendors/categories?page=${pageNumber}&limit=1000`,
      {
        method: "GET",
        headers: {
          Accept: "application/xml",
          "Accept-Encoding": "gzip, deflate, br",
        },
      }
    );

    // If backend fails or returns not found
    if (!apiRes.ok) {
      console.error("Backend category sitemap error:", apiRes.status);
      res.statusCode = apiRes.status;
      res.end();
      return { props: {} };
    }

    // Set headers
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");

    // Stream backend response to Next.js response
    await pipeline(apiRes.body, res);

    return { props: {} };
  } catch (error) {
    console.error("Error streaming category sitemap:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end();
    }
    return { props: {} };
  }
};

export default CategorySitemap;
