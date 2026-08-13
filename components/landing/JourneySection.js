import React from 'react';
import { LuClipboardList, LuGitCompare, LuReceiptIndianRupee } from 'react-icons/lu';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import useInView from './useInView';
import {
  PAPER,
  PAPER_ALT,
  INK,
  INK_2,
  GOLD,
  GOLD_DEEP,
  SERIF,
  SANS,
  MONO,
  BP,
} from './theme';

// Fully-formed element per branch — see the Turbopack note in ProblemSection.
const renderIcon = (key, size) => {
  if (key === 'raise') return <LuClipboardList size={size} />;
  if (key === 'compare') return <LuGitCompare size={size} />;
  return <LuReceiptIndianRupee size={size} />;
};

/**
 * A drawn timeline rather than a pinned stepper. The rule fills as the section
 * enters view, which gives the same sense of progression the scroll-jacked
 * version was reaching for without taking the scrollbar away from the user.
 *
 * Deliberately unboxed: the medallions are the only opaque things on the row,
 * so the rule threads behind them as one continuous line. Carding the steps
 * chopped that line into stubs and turned the row into three heavy rectangles.
 */
const JourneySection = ({ content }) => {
  const [ref, inView] = useInView();

  return (
    <Section id="lh-journey" tone="alt">
      <SectionHead
        number={content.number}
        eyebrow={content.eyebrow}
        heading={content.heading}
        subheading={content.subheading}
      />

      <ol ref={ref} className={`lh-jrn-track ${inView ? 'lh-jrn-in' : ''}`}>
        <span className="lh-jrn-rule" aria-hidden="true" />

        {content.steps.map((step, index) => (
          <Reveal as="li" key={step.title} className="lh-jrn-step" delay={index * 140}>
            <span className="lh-jrn-marker" style={{ transitionDelay: `${260 + index * 180}ms` }}>
              {renderIcon(step.icon, 28)}
            </span>
            <span className="lh-jrn-num">{`Step ${step.step}`}</span>
            <h3 className="lh-jrn-title">{step.title}</h3>
            <p className="lh-jrn-desc">{step.description}</p>
          </Reveal>
        ))}
      </ol>

      <style jsx>{`
        .lh-jrn-track {
          list-style: none;
          margin: 0;
          padding: 0;
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(32px, 4.5vw, 64px);
        }
        /* Sits at the medallion's centre line — the medallion is the only opaque
           thing on the row, so the rule reads as one continuous line threaded
           behind all three. Boxing the steps chopped it into stubs. */
        .lh-jrn-rule {
          position: absolute;
          top: 34px;
          left: 0;
          right: 0;
          height: 1px;
          background: ${GOLD};
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
          z-index: 0;
        }
        .lh-jrn-in .lh-jrn-rule {
          transform: scaleX(1);
        }
        :global(.lh-jrn-step) {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 0 clamp(8px, 1.4vw, 20px);
        }
        .lh-jrn-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 68px;
          height: 68px;
          margin: 0 auto 22px;
          border-radius: 50%;
          /* Matches the section fill so it masks the rail cleanly. */
          background: ${PAPER_ALT};
          border: 1px solid ${GOLD}55;
          color: ${GOLD};
          transform: scale(0.9);
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            opacity 0.4s ease, background 0.35s ease, color 0.35s ease,
            border-color 0.35s ease;
        }
        .lh-jrn-in .lh-jrn-marker {
          transform: scale(1);
          opacity: 1;
        }
        .lh-jrn-num {
          display: block;
          font-family: ${MONO};
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${GOLD_DEEP};
          margin-bottom: 12px;
        }
        .lh-jrn-title {
          font-family: ${SERIF};
          font-weight: 400;
          font-size: clamp(1.3rem, 2vw, 1.65rem);
          line-height: 1.15;
          letter-spacing: -0.012em;
          color: ${INK};
          margin: 0 0 12px;
          text-wrap: balance;
        }
        .lh-jrn-desc {
          font-family: ${SANS};
          font-size: 0.92rem;
          line-height: 1.65;
          color: ${INK_2};
          margin: 0 auto;
          max-width: 40ch;
          text-wrap: pretty;
        }

        /* Gated on hover-capable pointers so the state cannot stick on touch. */
        @media (hover: hover) {
          :global(.lh-jrn-step:hover) .lh-jrn-marker {
            background: ${GOLD};
            border-color: ${GOLD};
            color: ${PAPER};
          }
        }

        @media (max-width: ${BP.lg}) {
          .lh-jrn-track {
            grid-template-columns: 1fr;
            gap: 44px;
          }
          /* Vertical between stacked steps, still threaded behind them. */
          .lh-jrn-rule {
            top: 0;
            bottom: 0;
            left: 50%;
            right: auto;
            width: 1px;
            height: auto;
            transform: scaleY(0);
            transform-origin: top center;
          }
          .lh-jrn-in .lh-jrn-rule {
            transform: scaleY(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lh-jrn-rule,
          .lh-jrn-marker {
            transform: none;
            opacity: 1;
            transition: none;
          }
        }
      `}</style>
    </Section>
  );
};

export default JourneySection;
