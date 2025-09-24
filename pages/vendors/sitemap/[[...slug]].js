// pages/vendors/sitemap/[[...slug]].js
import { pipeline } from 'stream/promises'; // For streaming the response
import fetch from 'node-fetch'; // Ensure node-fetch is installed for streaming support

function VendorsSitemap() {
  return null; // No UI rendering needed
}

export const getServerSideProps = async ({ params, res }) => {
  const slug = params?.slug || [];
  if (!slug.length) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }

  // Accept formats: 1, 1.xml
  const raw = Array.isArray(slug) ? slug[0] : slug;
  const pageStr = String(raw).replace(/\.xml$/, '');
  const pageNumber = parseInt(pageStr, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1';
  
  try {
    // Fetch the API response with streaming enabled
    const apiRes = await fetch(`${API_URL}/seo/vendors/sitemap?page=${pageNumber}&limit=1000`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml',
        'Accept-Encoding': 'gzip, deflate, br', // Enable compression
      },
    });

    // Check if the response is OK
    if (!apiRes.ok) {
      res.statusCode = apiRes.status;
      res.end();
      return { props: {} };
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // Cache for 1 hour

    // Pipe the API response stream directly to the Next.js response
    await pipeline(apiRes.body, res);

    // No need to call res.end() as pipeline handles it
    return { props: {} };
  } catch (error) {
    console.error('Error streaming sitemap:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end();
    }
    return { props: {} };
  }
};

export default VendorsSitemap;