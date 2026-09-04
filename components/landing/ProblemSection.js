import React from 'react';
import { LuFileSpreadsheet, LuSplit, LuHandshake } from 'react-icons/lu';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { INK, INK_2, RULE, GOLD, GOLD_WASH, SERIF, SANS, BP } from './theme';

// Renders a fully-formed icon element per branch (never a variable holding
// "one of several" component references) — Turbopack hangs indefinitely on
// dynamic icon-component resolution (object/switch lookup into react-icons).
//
// Each icon names the specific failure rather than the emotion: the spreadsheet
// slog, one item splitting into two rates, and the handshake that decides the
// award. All from one icon set, so only one react-icons chunk is pulled in.
const renderIcon = (key, size) => {
  if (key === 'spreadsheet') return <LuFileSpreadsheet size={size} />;
  if (key === 'split') return <LuSplit size={size} />;
  return <LuHandshake size={size} />;
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
          <span className="lh-prob-icon">{renderIcon(point.icon, 32)}</span>
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
      /* Centred as a unit: a centred icon over left-ranged text reads as a
         misalignment rather than a choice. */
      :global(.lh-prob-item) {
        padding-top: 34px;
        border-top: 1px solid ${RULE};
        position: relative;
        text-align: center;
      }
      .lh-prob-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 76px;
        height: 76px;
        margin: 0 auto 24px;
        border-radius: 50%;
        border: 1px solid ${GOLD}40;
        background: ${GOLD_WASH};
        color: ${GOLD};
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
        margin: 0 auto;
        max-width: 38ch;
      }

      @media (max-width: ${BP.lg}) {
        .lh-prob-grid {
          grid-template-columns: 1fr;
          gap: 0;
        }
        :global(.lh-prob-item) {
          padding: 30px 0 34px;
        }
        .lh-prob-icon {
          margin: 0 auto 18px;
        }
      }
    `}</style>
  </Section>
);

export default ProblemSection;
