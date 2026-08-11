import React, { useState } from 'react';
import Head from 'next/head';
import content from '@/data/landingPageContent.json';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import LogoWall from './LogoWall';
import ProofBand from './ProofBand';
import ProblemSection from './ProblemSection';
import SolutionSection from './SolutionSection';
import JourneySection from './JourneySection';
import WhatYouGetSection from './WhatYouGetSection';
import TestimonialsSection from './TestimonialsSection';
import ClosingCta from './ClosingCta';
import LandingFooter from './LandingFooter';
import BookDemoModal from './BookDemoModal';
import { PAPER, INK, SANS } from './theme';

const LandingPage = () => {
  const [showBookDemo, setShowBookDemo] = useState(false);

  const openBookDemo = () => setShowBookDemo(true);
  const closeBookDemo = () => setShowBookDemo(false);

  return (
    <>
      {/* Browser-tab title only. The link-preview tags (og:*, twitter:*)
          are server-rendered from _document via components/seo/SiteMeta.js,
          because nothing rendered here reaches a crawler — see that file. */}
      <Head>
        <title>{content.seo.title}</title>
        <link rel="canonical" href={content.seo.siteUrl} />
      </Head>

      <div className="lh-page">
        <LandingNavbar content={content.nav} logo={content.meta} onBookDemo={openBookDemo} />
        <HeroSection content={content.hero} onBookDemo={openBookDemo} />
        <LogoWall content={content.logoWall} />
        <ProofBand content={content.proofBand} />
        <ProblemSection content={content.problem} />
        <SolutionSection content={content.solution} />
        <JourneySection content={content.journey} />
        <WhatYouGetSection content={content.whatYouGet} />
        <TestimonialsSection content={content.testimonials} />
        <ClosingCta content={content.closingCta} onBookDemo={openBookDemo} />
        <LandingFooter content={content.footer} logo={content.meta} />
      </div>

      {showBookDemo && <BookDemoModal content={content.bookDemoModal} onClose={closeBookDemo} />}

      <style jsx global>{`
        /* Scoped to .lh-page so the dashboard keeps its own Geist/arc_v2 stack.
           arc_v2.css loads last in _app.js and sets body { font-family: Geist },
           so the landing page has to restate its own base here. */
        /* arc_v2.css paints a light body; on a navy page that shows through on
           overscroll. :has() outranks its bare body rule and unmounts with
           the landing page, so the dashboard is untouched. */
        html:has(.lh-page),
        body:has(.lh-page) {
          background: ${PAPER};
        }
        .lh-page {
          background: ${PAPER};
          color: ${INK};
          font-family: ${SANS};
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .lh-page * {
          box-sizing: border-box;
        }
        .lh-page section {
          scroll-margin-top: 80px;
        }
        .lh-page h1,
        .lh-page h2,
        .lh-page h3,
        .lh-page h4,
        .lh-page p,
        .lh-page ul,
        .lh-page ol,
        .lh-page figure,
        .lh-page blockquote {
          margin: 0;
        }
        .lh-page img {
          max-width: 100%;
        }
      `}</style>
    </>
  );
};

export default LandingPage;
