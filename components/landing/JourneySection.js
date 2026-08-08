import React from 'react';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import useInView from './useInView';
import { PAPER, INK, INK_2, GOLD, GOLD_DEEP, SERIF, SANS, MONO, BP } from './theme';

/**
 * A drawn timeline rather than a pinned stepper. The rule fills as the section
 * enters view, which gives the same sense of progression the scroll-jacked
 * version was reaching for without taking the scrollbar away from the user.
 *
 * Previously rendered Bootstrap `ui/FeatureCard` on mobile only, which pulled
 * a second, clashing design system onto the page.
 */
const JourneySection = ({ content }) => {
  const [ref, inView] = useInView();

  return (
    <Section id="lh-journey" tone="paper">
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
            <span className="lh-jrn-marker" style={{ transitionDelay: `${300 + index * 200}ms` }}>
              <i />
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
          gap: clamp(28px, 4vw, 56px);
        }
        .lh-jrn-rule {
          position: absolute;
          top: 7px;
          left: 0;
          right: 0;
          height: 1px;
          background: ${GOLD};
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
        }
        .lh-jrn-in .lh-jrn-rule {
          transform: scaleX(1);
        }
        :global(.lh-jrn-step) {
          position: relative;
          padding-top: 40px;
        }
        .lh-jrn-marker {
          position: absolute;
          top: 0;
          left: 0;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: ${PAPER};
          border: 1px solid ${GOLD};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lh-jrn-marker i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${GOLD};
          transform: scale(0);
          transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .lh-jrn-in .lh-jrn-marker i {
          transform: scale(1);
        }
        .lh-jrn-num {
          display: block;
          font-family: ${MONO};
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${GOLD_DEEP};
          margin-bottom: 16px;
        }
        .lh-jrn-title {
          font-family: ${SERIF};
          font-weight: 400;
          font-size: clamp(1.3rem, 2vw, 1.65rem);
          line-height: 1.15;
          letter-spacing: -0.012em;
          color: ${INK};
          margin: 0 0 12px;
          max-width: 16ch;
        }
        .lh-jrn-desc {
          font-family: ${SANS};
          font-size: 0.92rem;
          line-height: 1.65;
          color: ${INK_2};
          margin: 0;
          max-width: 40ch;
        }

        @media (max-width: ${BP.lg}) {
          .lh-jrn-track {
            grid-template-columns: 1fr;
            gap: 0;
            padding-left: 30px;
          }
          .lh-jrn-rule {
            top: 7px;
            bottom: 0;
            left: 7px;
            right: auto;
            width: 1px;
            height: auto;
            transform: scaleY(0);
            transform-origin: top center;
          }
          .lh-jrn-in .lh-jrn-rule {
            transform: scaleY(1);
          }
          :global(.lh-jrn-step) {
            padding: 0 0 40px;
          }
          .lh-jrn-marker {
            left: -30px;
            top: 0;
          }
          .lh-jrn-title,
          .lh-jrn-desc {
            max-width: 100%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lh-jrn-rule,
          .lh-jrn-marker i {
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </Section>
  );
};

export default JourneySection;
