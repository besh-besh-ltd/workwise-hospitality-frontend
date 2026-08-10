import React from 'react';
import { FiClock, FiFileText, FiAlertTriangle, FiUsers } from 'react-icons/fi';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { INK, INK_2, INK_3, RULE, TERRACOTTA, SERIF, SANS, MONO, BP } from './theme';

// Renders a fully-formed icon element per branch (never a variable holding
// "one of several" component references) — Turbopack hangs indefinitely on
// dynamic icon-component resolution (object/switch lookup into react-icons).
const renderIcon = (key, size) => {
  if (key === 'clock') return <FiClock size={size} />;
  if (key === 'file') return <FiFileText size={size} />;
  if (key === 'users') return <FiUsers size={size} />;
  return <FiAlertTriangle size={size} />;
};

/**
 * Deliberately the tightest section on the page: three costs, side by side,
 * separated by hairlines. The problem should feel like an audit finding, not a
 * carousel — the previous build spent ~3.6 viewport heights of pinned scroll
 * to deliver these same three paragraphs.
 */
const ProblemSection = ({ content }) => (
  <Section id="lh-problem" tone="paper">
    <SectionHead
      number={content.number}
      eyebrow={content.eyebrow}
      heading={content.heading}
      subheading={content.subheading}
    />

    <ul className="lh-prob-grid">
      {content.points.map((point, index) => (
        <Reveal as="li" key={point.title} className="lh-prob-item" delay={index * 110}>
          <span className="lh-prob-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="lh-prob-icon">{renderIcon(point.icon, 20)}</span>
          <h3 className="lh-prob-title">{point.title}</h3>
          <p className="lh-prob-desc">{point.description}</p>
        </Reveal>
      ))}
    </ul>

    <style jsx>{`
      .lh-prob-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: clamp(28px, 4vw, 56px);
      }
      :global(.lh-prob-item) {
        padding-top: 26px;
        border-top: 1px solid ${RULE};
        position: relative;
      }
      .lh-prob-index {
        font-family: ${MONO};
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        color: ${TERRACOTTA};
        font-variant-numeric: tabular-nums;
      }
      .lh-prob-icon {
        display: block;
        color: ${INK_3};
        margin: 22px 0 18px;
      }
      .lh-prob-title {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(1.3rem, 1.9vw, 1.6rem);
        line-height: 1.15;
        letter-spacing: -0.01em;
        color: ${INK};
        margin: 0 0 12px;
      }
      .lh-prob-desc {
        font-family: ${SANS};
        font-size: 0.92rem;
        line-height: 1.65;
        color: ${INK_2};
        margin: 0;
      }

      @media (max-width: ${BP.lg}) {
        .lh-prob-grid {
          grid-template-columns: 1fr;
          gap: 0;
        }
        :global(.lh-prob-item) {
          padding: 26px 0 30px;
        }
        .lh-prob-icon {
          margin: 16px 0 14px;
        }
      }
    `}</style>
  </Section>
);

export default ProblemSection;
