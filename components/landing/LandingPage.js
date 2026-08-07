import React, { useState } from 'react';
import Head from 'next/head';
import content from '@/data/landingPageContent.json';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import ProblemSection from './ProblemSection';
import SolutionSection from './SolutionSection';
import JourneySection from './JourneySection';
import WhatYouGetSection from './WhatYouGetSection';
import TestimonialsSection from './TestimonialsSection';
import LandingFooter from './LandingFooter';
import BookDemoModal from './BookDemoModal';

const LandingPage = () => {
  const [showBookDemo, setShowBookDemo] = useState(false);

  const openBookDemo = () => setShowBookDemo(true);
  const closeBookDemo = () => setShowBookDemo(false);

  return (
    <>
      <Head>
        <title>Workwise | Procurement se Profit</title>
        <meta
          name="description"
          content="Workwise is an AI powered procurement platform built for EPCs, contractors and industrial buyers."
        />
      </Head>

      <div className="lh-page">
        <LandingNavbar content={content.nav} logo={content.meta} onBookDemo={openBookDemo} />
        <HeroSection content={content.hero} onBookDemo={openBookDemo} />
        <ProblemSection content={content.problem} />
        <SolutionSection content={content.solution} />
        <JourneySection content={content.journey} />
        <WhatYouGetSection content={content.whatYouGet} />
        <TestimonialsSection content={content.testimonials} />
        <LandingFooter content={content.footer} logo={content.meta} />
      </div>

      {showBookDemo && (
        <BookDemoModal content={content.bookDemoModal} onClose={closeBookDemo} />
      )}

      <style jsx global>{`
        .lh-page section {
          scroll-margin-top: 80px;
        }
      `}</style>
    </>
  );
};

export default LandingPage;
