import axios from "axios";
const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1';

const getProductSlugs = async () => {
  const res = await axios.get(`${API_URL}/seo/products/slug`);
  return res.data?.data || [];
};

const createSitemapIndex = (sitemaps) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.map(sm => `
    <sitemap>
      <loc>${EXTERNAL_DATA_URL}${sm.loc}</loc>
      <lastmod>${sm.lastmod}</lastmod>
    </sitemap>
  `).join('')}
</sitemapindex>`;

export default async function handler(req, res) {
  const slugs = await getProductSlugs();
  const sitemaps = slugs.map(slug => ({
    loc: `/api/vendor/${slug}.xml`,
    lastmod: new Date().toISOString().split('T')[0]
  }));
  res.setHeader('Content-Type', 'application/xml');
  res.send(createSitemapIndex(sitemaps));
} 