import axios from "axios";

const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://letsworkwise.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1';

const getProducts = async () => {
  const res = await axios.get(`${API_URL}/seo/products/slug`);
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
};

const getStates = async () => {
  const res = await axios.get(`${API_URL}/general/states`);
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
};

const getCities = async () => {
  const res = await axios.get(`${API_URL}/general/cities`);
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
};

const createSitemap = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
    <url>
      <loc>${`${EXTERNAL_DATA_URL}${url.loc}`}</loc>
      <changefreq>${url.changefreq}</changefreq>
      <priority>${url.priority}</priority>
    </url>
  `).join('')}
</urlset>`;

function VendorsSitemap() { }

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

  const linksPerFile = 50000;
  const [products, states, cities] = await Promise.all([
    getProducts(),
    getStates(),
    getCities()
  ]);

  // Flattened sequence: for each product, one URL for each state, then for each city of that state
  const urls = [];
  const startIndex = (pageNumber - 1) * linksPerFile;
  const endIndex = pageNumber * linksPerFile;
  let globalIndex = 0;

  for (const productSlug of products) {
    // product + state
    for (const state of states) {
      if (globalIndex >= startIndex && globalIndex < endIndex) {
        urls.push({
          loc: `/vendor/${productSlug}-${encodeURIComponent(state.state_name)}`,
          changefreq: 'weekly',
          priority: 0.5
        });
      }
      globalIndex++;

      // product + city + state
      for (const city of cities.filter(c => c.state_id === state.id)) {
        if (globalIndex >= startIndex && globalIndex < endIndex) {
          urls.push({
            loc: `/vendor/${productSlug}-${encodeURIComponent(city.city_name)}-${encodeURIComponent(state.state_name)}`,
            changefreq: 'weekly',
            priority: 0.5
          });
        }
        globalIndex++;
        if (globalIndex >= endIndex && urls.length >= linksPerFile) break;
      }
      if (globalIndex >= endIndex && urls.length >= linksPerFile) break;
    }
    if (globalIndex >= endIndex && urls.length >= linksPerFile) break;
  }

  const sitemap = createSitemap(urls);
  res.setHeader('Content-Type', 'application/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
};

export default VendorsSitemap;
