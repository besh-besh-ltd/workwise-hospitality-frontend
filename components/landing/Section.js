import React from 'react';
import { PAPER, PAPER_ALT, INK, MAXW, GUTTER } from './theme';

const TONES = {
  paper: PAPER,
  alt: PAPER_ALT,
  ink: INK,
};

/**
 * Shared section shell. The first build re-declared .lh-section /
 * .lh-section-inner in every section file; this replaces all of them so
 * rhythm and gutters stay identical down the page.
 */
const Section = ({ id, tone = 'paper', size = 'default', className = '', children }) => (
  <section id={id} className={`lh-section lh-section-${size} ${className}`}>
    <div className="lh-section-inner">{children}</div>

    <style jsx>{`
      .lh-section {
        background: ${TONES[tone] || PAPER};
        padding: clamp(72px, 9vw, 132px) ${GUTTER};
      }
      .lh-section-tight {
        padding-top: clamp(40px, 5vw, 64px);
        padding-bottom: clamp(40px, 5vw, 64px);
      }
      .lh-section-inner {
        max-width: ${MAXW};
        margin: 0 auto;
        width: 100%;
      }
    `}</style>
  </section>
);

export default Section;
