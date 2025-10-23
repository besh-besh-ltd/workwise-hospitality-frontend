import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.letsworkwise.com/api/v1";

function CategorySitemapIndex() {
  // This page renders nothing — it just streams XML
  return null;
}

export const getServerSideProps = async ({ res }) => {
  try {
    // Fetch category sitemap index XML from backend
    const response = await axios.get(`${API_URL}/seo/category/sitemap-index`, {
      responseType: "text", // ensure raw XML response
    });

    // Set response type and send the XML directly
    res.setHeader("Content-Type", "application/xml");
    res.write(response.data);
    res.end();
  } catch (error) {
    console.error("Error fetching category sitemap index:", error.message);

    // Fallback XML (minimal)
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://letsworkwise.com/vendors/categories/sitemap/1.xml</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.setHeader("Content-Type", "application/xml");
    res.statusCode = 200;
    res.write(fallbackXml);
    res.end();
  }

  return { props: {} };
};

export default CategorySitemapIndex;
