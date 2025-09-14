// This file could look similar to your current sitemap generator but only include static pages.
const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

const staticUrls = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/aboutus', changefreq: 'monthly', priority: 0.7 },
  { loc: '/contactus', changefreq: 'daily', priority: 0.7 },
  { loc: '/for-vendors', changefreq: 'daily', priority: 0.7 },
  { loc: '/products', changefreq: 'daily', priority: 0.7 },
  { loc: '/privacypolicy', changefreq: 'daily', priority: 0.7 },
];

const createSitemapIndex = (staticUrls, sitemaps) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls.map(url => `
    <url>
      <loc>${EXTERNAL_DATA_URL}${url.loc}</loc>
      <changefreq>${url.changefreq}</changefreq>
      <priority>${url.priority}</priority>
    </url>
  `).join('')}
  ${sitemaps.map(sm => `
    <url>
      <loc>${EXTERNAL_DATA_URL}${sm.loc}</loc>
      <lastmod>${sm.lastmod}</lastmod>
    </url>
  `).join('')}
</urlset>`;

function SiteMap() { return null; }

export async function getServerSideProps({ res }) {
  const sitemaps = [
    { loc: '/vendors.xml', lastmod: new Date().toISOString().split('T')[0] }
  ];

  const xml = createSitemapIndex(staticUrls, sitemaps);
  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();

  return { props: {} };
}

export default SiteMap;