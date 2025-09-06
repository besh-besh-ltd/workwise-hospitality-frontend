import axios from "axios";
const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1';

const getStates = async () => {
  const res = await axios.get(`${API_URL}/general/states`);
  // Try res.data.data, fallback to res.data, fallback to []
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
};
const getCities = async () => {
  const res = await axios.get(`${API_URL}/general/cities`);
  return Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
};

const createUrlset = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
    <url>
      <loc>${EXTERNAL_DATA_URL}${url}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.5</priority>
    </url>
  `).join('')}
</urlset>`;

function VendorGeoSitemap() { return null; }

export async function getServerSideProps({ params, res }) {
  const slug = params?.slug || [];
  if (!slug.length) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }

  const baseSlug = slug.join('-').replace(/\.xml$/, '');
  const states = await getStates();
  const cities = await getCities();
  const urls = [];
  for (const state of states) {
    urls.push(`/vendor/${baseSlug}-${encodeURIComponent(state.state_name)}`);
    for (const city of cities.filter(c => c.state_id === state.id)) {
      urls.push(`/vendor/${baseSlug}-${encodeURIComponent(city.city_name)}-${encodeURIComponent(state.state_name)}`);
    }
  }

  const xml = createUrlset(urls);
  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();
  return { props: {} };
}

export default VendorGeoSitemap; 