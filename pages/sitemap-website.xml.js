import { GetServerSideProps } from 'next';

const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://letsworkwise.com';

const staticUrls = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/aboutus', changefreq: 'monthly', priority: 0.7 },
  { loc: '/change-password', changefreq: 'monthly', priority: 0.7 },
  { loc: '/contactus', changefreq: 'daily', priority: 0.7 },
  { loc: '/for-vendors', changefreq: 'daily', priority: 0.7 },
  { loc: '/forget-password', changefreq: 'daily', priority: 0.7 },
  { loc: '/privacypolicy', changefreq: 'daily', priority: 0.7 },
  { loc: '/products', changefreq: 'daily', priority: 0.7 },
  { loc: '/terms-of-use', changefreq: 'daily', priority: 0.7 }
];

const createSitemap = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.map(url => `
        <url>
            <loc>${`${EXTERNAL_DATA_URL}${url.loc}`}</loc>
            <changefreq>${url.changefreq}</changefreq>
            <priority>${url.priority}</priority>
        </url>`).join('')}
</urlset>`;

function Sitemap() {
  // This component will never be rendered
  return null;
}

export const getServerSideProps = async ({ res }) => {
  const sitemap = createSitemap(staticUrls);

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default Sitemap;
