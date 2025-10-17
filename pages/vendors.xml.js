import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.letsworkwise.com/api/v1";

function VendorsSitemapIndex() {
  // This component will never render
  return null;
}

export const getServerSideProps = async ({ res }) => {
  try {
    // Directly fetch the backend XML
    const response = await axios.get(`${API_URL}/seo/vendors/sitemap/dynamic`, {
      responseType: "text", // important: keep it as raw XML string
    });

    res.setHeader("Content-Type", "application/xml");
    res.write(response.data);
    res.end();
  } catch (error) {
    console.error("Error fetching vendor sitemap index:", error.message);

    // fallback minimal XML
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://letsworkwise.com/vendors/sitemap/1.xml</loc>
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

export default VendorsSitemapIndex;
