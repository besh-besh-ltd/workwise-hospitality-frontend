import content from "@/data/landingPageContent.json";

/**
 * The link-preview tags for the site, as a scraper reads them.
 *
 * ── WHY THESE LIVE IN _document AND NOT ON THE PAGE ──
 * `redux/provider.js` wraps the whole app in `PersistGate loading={null}`.
 * PersistGate renders its `loading` prop until redux-persist has rehydrated,
 * and rehydration never happens on the server — so every page below it renders
 * as `null` server-side. The HTML a crawler receives today contains the _app
 * chrome and nothing else: no page markup, no <title>, and no meta tags.
 *
 * WhatsApp, Slack, LinkedIn and X do not run JavaScript. With no server-
 * rendered metadata they fall back to printing the bare hostname, which is the
 * reported bug: pasting hospitality.letsworkwise.com showed
 * "hospitality.letsworkwise.com" as both the title and the description.
 *
 * `_document` renders OUTSIDE the Providers tree, so it is the one place whose
 * output survives that gate. Putting the tags on the landing page instead
 * would be the tidier architecture and would do nothing at all for previews
 * until the PersistGate SSR problem is fixed separately.
 *
 * Values come from data/landingPageContent.json — the same file the landing
 * page renders from — so the preview and the page cannot drift apart.
 *
 * Site-wide rather than per-page on purpose: only the marketing root is ever
 * shared as a link; every dashboard route sits behind auth and sets its own
 * <title> through next/head for the browser tab.
 */
const SiteMeta = () => {
  const { seo, meta } = content;
  // Absolute — a crawler has no page context to resolve a relative path
  // against, which is the usual reason a card renders with no image.
  const image = `${seo.siteUrl}${seo.ogImage}`;

  return (
    <>
      <meta name="description" content={seo.description} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={meta.siteName} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.siteUrl} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content={String(seo.ogImageWidth)} />
      <meta property="og:image:height" content={String(seo.ogImageHeight)} />
      <meta property="og:image:alt" content={seo.ogImageAlt} />

      {/* summary_large_image, not summary: the card is a purpose-built
          1200x630 image, so the wide treatment is the one it is drawn for. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={seo.ogImageAlt} />
    </>
  );
};

export default SiteMeta;
