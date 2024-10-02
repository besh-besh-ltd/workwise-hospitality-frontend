// Assume you fetch vendor data dynamically here
const EXTERNAL_DATA_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://letsworkwise.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1'
import axios from "axios";

const getVendors = async () => {
  // Fetch your vendor data from the database
  const response = await axios.get(`${API_URL}/admin/seo/products/slug`)
    .then((data) => {
      return data.data
    })
    .catch((error) => {
      console.log(error)
      return []
    })

    return response.data || []
};


const createSitemap = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.map(url => `
        <url>
            <loc>${`${EXTERNAL_DATA_URL}${url.loc}`}</loc>
            <changefreq>${url.changefreq}</changefreq>
            <priority>${url.priority}</priority>
        </url>`).join('')}
</urlset>`;

export default async function sitemapVendorsXml(req, res) {
  const vendors = await getVendors();
  console.log(vendors?.[0])
  const urls = vendors?.map(slug => ({
    loc: `/vendor/${slug}`,
    changefreq: 'weekly',
    priority: 0.5
  }));
  res.setHeader('Content-Type', 'application/xml');
  res.send(createSitemap(urls));
}
