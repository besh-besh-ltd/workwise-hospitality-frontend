import React from 'react';
import useInView from './useInView';
import { INK, INK_2, INK_3, RULE, GOLD, GOLD_DEEP, SERIF, MONO, TYPE } from './theme';

/**
 * The editorial signature: a hairline that draws itself in, a mono section
 * number, a tracked eyebrow, then the serif heading. Used by every numbered
 * section so the page reads as one publication rather than stacked cards.
 */
const SectionHead = ({ number, eyebrow, heading, subheading, invert = false }) => {
  const [ref, inView] = useInView();

  return (
    <header ref={ref} className={`lh-head ${inView ? 'lh-head-in' : ''} ${invert ? 'lh-head-invert' : ''}`}>
      <div className="lh-head-rule" />

      <div className="lh-head-meta">
        {number && <span className="lh-head-number">{number}</span>}
        {eyebrow && <span className="lh-head-eyebrow">{eyebrow}</span>}
      </div>

      <h2 className="lh-head-title">{heading}</h2>
      {subheading && <p className="lh-head-sub">{subheading}</p>}

      <style jsx>{`
        .lh-head {
          margin-bottom: clamp(48px, 6vw, 80px);
        }
        .lh-head-rule {
          height: 1px;
          background: ${RULE};
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          margin-bottom: 22px;
        }
        .lh-head-in .lh-head-rule {
          transform: scaleX(1);
        }
        .lh-head-meta {
          display: flex;
          align-items: baseline;
          gap: 18px;
          margin-bottom: clamp(20px, 3vw, 32px);
        }
        .lh-head-number {
          font-family: ${MONO};
          font-size: ${TYPE.eyebrow};
          font-weight: 500;
          color: ${GOLD_DEEP};
          font-variant-numeric: tabular-nums;
        }
        .lh-head-eyebrow {
          font-size: ${TYPE.eyebrow};
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${INK_3};
        }
        .lh-head-title {
          font-family: ${SERIF};
          font-weight: 400;
          font-size: ${TYPE.heading};
          line-height: 1.06;
          letter-spacing: -0.015em;
          color: ${INK};
          margin: 0;
          max-width: 20ch;
        }
        .lh-head-sub {
          font-size: ${TYPE.body};
          line-height: 1.65;
          color: ${INK_2};
          margin: 20px 0 0;
          max-width: 54ch;
        }

        /* Inverted treatment for the ink-on-dark closing band. */
        .lh-head-invert .lh-head-rule {
          background: rgba(255, 255, 255, 0.22);
        }
        /* Deep gold is tuned for light surfaces; on navy it needs the bright one. */
        .lh-head-invert .lh-head-number {
          color: ${GOLD};
        }
        .lh-head-invert .lh-head-title {
          color: #ffffff;
        }
        .lh-head-invert .lh-head-sub {
          color: rgba(255, 255, 255, 0.72);
        }
        .lh-head-invert .lh-head-eyebrow {
          color: rgba(255, 255, 255, 0.55);
        }

        @media (prefers-reduced-motion: reduce) {
          .lh-head-rule {
            transform: scaleX(1);
            transition: none;
          }
        }
      `}</style>
    </header>
  );
};

export default SectionHead;
