import axios from "axios";

const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://letsworkwise.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1';

const getCounts = async () => {
  try {
    const [productsRes, statesRes, citiesRes] = await Promise.all([
      axios.get(`${API_URL}/seo/products/slug`),
      axios.get(`${API_URL}/general/states`),
      axios.get(`${API_URL}/general/cities`)
    ]);

    const productCount = Array.isArray(productsRes.data?.data)
      ? productsRes.data.data.length
      : (Array.isArray(productsRes.data) ? productsRes.data.length : (productsRes.data?.total || 0));

    const states = Array.isArray(statesRes.data?.data) ? statesRes.data.data : (Array.isArray(statesRes.data) ? statesRes.data : []);
    const cities = Array.isArray(citiesRes.data?.data) ? citiesRes.data.data : (Array.isArray(citiesRes.data) ? citiesRes.data : []);

    return {
      productCount,
      stateCount: states.length,
      cityCount: cities.length
    };
  } catch (error) {
    console.log(error);
    return { productCount: 0, stateCount: 0, cityCount: 0 };
  }
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

function VendorsSitemapIndex() {
  // This component will never be rendered
}

export const getServerSideProps = async ({ res }) => {
  const { productCount, stateCount, cityCount } = await getCounts();
  const linksPerFile = 50000;
  const totalCombos = productCount * (stateCount + cityCount);
  const totalFiles = Math.max(1, Math.ceil(totalCombos / linksPerFile));
  
  const sitemaps = [];
  for (let i = 1; i <= totalFiles; i++) {
    sitemaps.push({
      loc: `/vendors/sitemap/${i}.xml`,
      lastmod: new Date().toISOString().split('T')[0]
    });
  }
  
  const xml = createSitemapIndex(sitemaps);
  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();

  return {
    props: {},
  };
};

export default VendorsSitemapIndex;
