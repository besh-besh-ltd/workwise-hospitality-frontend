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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.letsworkwise.com/api/v1';
  const apiRes = await fetch(`${API_URL}/seo/vendors/sitemap?page=${pageNumber}&limit=50000`, {
    method: 'GET',
    headers: { 'Accept': 'application/xml' }
  });
  const xml = await apiRes.text();
  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default VendorsSitemap;
