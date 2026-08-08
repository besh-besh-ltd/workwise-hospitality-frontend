import React from 'react';
import { FiTrendingUp, FiClock, FiUsers, FiShield, FiFileText, FiCheckCircle } from 'react-icons/fi';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { PAPER_ALT, INK, INK_2, RULE, GOLD, GOLD_DEEP, SERIF, SANS, BP } from './theme';

// Fully-formed element per branch — see the Turbopack note in ProblemSection.
const renderIcon = (key, size) => {
  if (key === 'trending-up') return <FiTrendingUp size={size} />;
  if (key === 'clock') return <FiClock size={size} />;
  if (key === 'users') return <FiUsers size={size} />;
  if (key === 'shield') return <FiShield size={size} />;
  if (key === 'file') return <FiFileText size={size} />;
  return <FiCheckCircle size={size} />;
};

/**
 * Six benefits on a hairline grid. The previous build spotlit one at a time
 * behind ~7 viewport heights of pinned scroll, which meant five of the six
 * were invisible at any given moment.
 */
const WhatYouGetSection = ({ content }) => (
  <Section id="lh-benefits" tone="alt">
    <SectionHead
      number={content.number}
      eyebrow={content.eyebrow}
      heading={content.heading}
      subheading={content.subheading}
    />

    <ul className="lh-ben-grid">
      {content.benefits.map((benefit, index) => (
        <Reveal as="li" key={benefit.title} className="lh-ben-item" delay={(index % 3) * 90}>
          <span className="lh-ben-icon">{renderIcon(benefit.icon, 19)}</span>
          <h3 className="lh-ben-title">{benefit.title}</h3>
          <p className="lh-ben-desc">{benefit.description}</p>
        </Reveal>
      ))}
    </ul>

    <style jsx>{`
      .lh-ben-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        /* Hairlines come from the gap showing the rule-coloured backdrop. */
        gap: 1px;
        background: ${RULE};
        border: 1px solid ${RULE};
      }
      :global(.lh-ben-item) {
        background: ${PAPER_ALT};
        padding: clamp(26px, 3vw, 38px);
      }
      .lh-ben-icon {
        display: block;
        color: ${GOLD_DEEP};
        margin-bottom: 20px;
      }
      .lh-ben-title {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(1.15rem, 1.6vw, 1.4rem);
        line-height: 1.2;
        color: ${INK};
        margin: 0 0 10px;
      }
      .lh-ben-desc {
        font-family: ${SANS};
        font-size: 0.9rem;
        line-height: 1.65;
        color: ${INK_2};
        margin: 0;
      }

      @media (max-width: ${BP.lg}) {
        .lh-ben-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: ${BP.sm}) {
        .lh-ben-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  </Section>
);

export default WhatYouGetSection;
