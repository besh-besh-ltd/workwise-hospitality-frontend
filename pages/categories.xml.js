import React from "react";

const Categories = () => {
  const xmlData = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
  >
    <url>
      <loc>https://letsworkwise.com/vendor/electrical-category1234</loc>
      <lastmod>2025-10-15</lastmod>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://letsworkwise.com/vendor/mechanical-category5678</loc>
      <lastmod>2025-10-14</lastmod>
      <priority>0.9</priority>
    </url>
    <url>
      <loc>https://letsworkwise.com/vendor/instrumentation-category8910</loc>
      <lastmod>2025-10-13</lastmod>
      <priority>0.8</priority>
    </url>
    <url>
      <loc>https://letsworkwise.com/vendor/chemical-category2222</loc>
      <lastmod>2025-10-12</lastmod>
      <priority>0.7</priority>
    </url>
  </urlset>
  `;

  return (
    <pre
      style={{
        whiteSpace: "pre-wrap",
        background: "#f7f7f7",
        padding: "20px",
        borderRadius: "10px",
        fontFamily: "monospace",
        color: "#333",
      }}
    >
      {xmlData}
    </pre>
  );
};

export default Categories;
