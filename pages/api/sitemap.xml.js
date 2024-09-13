const EXTERNAL_DATA_URL =  process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://letsworkwise.com';

const sitemaps = [
  '/sitemap-website.xml',
  '/sitemap-vendors.xml',
];

const createSitemapIndex = (sitemaps) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${sitemaps.map(sitemap => `
        <sitemap>
            <loc>${`${EXTERNAL_DATA_URL}${sitemap}`}</loc>
        </sitemap>`).join('')}
</sitemapindex>`;

export default function sitemapIndexXml(req, res) {
  res.setHeader('Content-Type', 'application/xml');
  res.send(createSitemapIndex(sitemaps));
}
