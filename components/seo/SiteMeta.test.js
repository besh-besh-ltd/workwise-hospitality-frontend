// Link-preview metadata — the tags a scraper actually consumes.
//
// The site shipped with no Open Graph or Twitter tags at all, so WhatsApp,
// Slack, LinkedIn and X fell back to printing the bare hostname: pasting
// hospitality.letsworkwise.com showed "hospitality.letsworkwise.com" as BOTH
// the title and the description.
//
// SiteMeta is rendered from _document rather than from the page, because
// `PersistGate loading={null}` in redux/provider.js renders the whole app as
// null on the server — _document is the only output a crawler receives. That
// is asserted at the integration level by the SSR check in the PR; here we
// pin the tag contract itself.

import React from "react";
import { render } from "@testing-library/react";
import content from "@/data/landingPageContent.json";
import SiteMeta from "./SiteMeta";

// React 19 hoists <meta> into document.head wherever it is rendered.
const find = (sel) => document.head.querySelector(sel) || document.body.querySelector(sel);
const meta = (sel) => find(sel)?.getAttribute("content") ?? null;

describe("SiteMeta", () => {
  beforeEach(() => { render(<SiteMeta />); });

  it("carries the Open Graph title and description", () => {
    expect(meta('meta[property="og:title"]')).toBe(content.seo.title);
    expect(meta('meta[property="og:description"]')).toBe(content.seo.description);
    expect(meta('meta[property="og:site_name"]')).toBe(content.meta.siteName);
    expect(meta('meta[property="og:type"]')).toBe("website");
  });

  it("carries Twitter card tags", () => {
    expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(meta('meta[name="twitter:title"]')).toBe(content.seo.title);
    expect(meta('meta[name="twitter:description"]')).toBe(content.seo.description);
  });

  it("uses ABSOLUTE urls everywhere a crawler needs one", () => {
    // A crawler has no page context to resolve a relative path against, which
    // is the usual reason a card renders with no image.
    for (const sel of ['meta[property="og:url"]', 'meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      expect(meta(sel)).toMatch(/^https:\/\//);
    }
  });

  it("declares the image type and dimensions", () => {
    expect(meta('meta[property="og:image:width"]')).toBe("1200");
    expect(meta('meta[property="og:image:height"]')).toBe("630");
    expect(meta('meta[property="og:image:type"]')).toBe("image/png");
    expect(meta('meta[property="og:image:alt"]')).toBeTruthy();
  });

  it("keeps the preview copy identical to the landing page content", () => {
    // Guards drift: someone edits the landing copy and the shared preview keeps
    // advertising the old positioning.
    expect(meta('meta[name="description"]')).toBe(content.seo.description);
    expect(content.seo.ogImage.startsWith("/")).toBe(true);
  });
});
