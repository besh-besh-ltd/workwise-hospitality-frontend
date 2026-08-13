import React from 'react';
import {
  LuTrendingDown,
  LuTimer,
  LuMessagesSquare,
  LuLayoutDashboard,
  LuHistory,
  LuHeadset,
} from 'react-icons/lu';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { PAPER, PAPER_ALT, INK, INK_2, RULE, GOLD, GOLD_WASH, SERIF, SANS, BP } from './theme';

// Fully-formed element per branch — see the Turbopack note in ProblemSection.
// Note `cost` is a *down* arrow: the benefit is spend falling, and the old
// trending-up glyph argued the opposite of the copy next to it.
const renderIcon = (key, size) => {
  if (key === 'cost') return <LuTrendingDown size={size} />;
  if (key === 'speed') return <LuTimer size={size} />;
  if (key === 'negotiate') return <LuMessagesSquare size={size} />;
  if (key === 'visibility') return <LuLayoutDashboard size={size} />;
  if (key === 'audit') return <LuHistory size={size} />;
  return <LuHeadset size={size} />;
};

/**
 * Six benefits on a hairline grid. The previous build spotlit one at a time
 * behind ~7 viewport heights of pinned scroll, which meant five of the six
 * were invisible at any given moment.
 *
 * Kept left-ranged rather than centred like the other card sections: at six
 * dense cards a centred axis turns the block into wallpaper, and the page
 * needs the rhythm change by this point.
 */
const WhatYouGetSection = ({ content }) => (
  <Section id="lh-benefits" tone="paper">
    <SectionHead
      number={content.number}
      eyebrow={content.eyebrow}
      heading={content.heading}
      subheading={content.subheading}
    />

    <ul className="lh-ben-grid">
      {content.benefits.map((benefit, index) => (
        <li key={benefit.title} className="lh-ben-item">
          {/* Oversized ghost of the card's own glyph, rising with the wash. */}
          <span className="lh-ben-watermark" aria-hidden="true">
            {renderIcon(benefit.icon, 148)}
          </span>

          <Reveal delay={(index % 3) * 90}>
            <span className="lh-ben-icon">{renderIcon(benefit.icon, 26)}</span>
            <h3 className="lh-ben-title">{benefit.title}</h3>
            <p className="lh-ben-desc">{benefit.description}</p>
          </Reveal>
        </li>
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
      .lh-ben-item {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        background: ${PAPER};
        padding: clamp(26px, 3vw, 38px);
      }
      /* The wash itself: a panel that slides up from the bottom edge. */
      .lh-ben-item::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        background: linear-gradient(0deg, ${GOLD}1c 0%, transparent 72%), ${PAPER_ALT};
        transform: translateY(101%);
        transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .lh-ben-watermark {
        position: absolute;
        right: -26px;
        bottom: -30px;
        z-index: -1;
        color: ${GOLD};
        opacity: 0;
        transform: translateY(28px);
        pointer-events: none;
        transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .lh-ben-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 1px solid ${GOLD}40;
        background: ${GOLD_WASH};
        color: ${GOLD};
        margin-bottom: 22px;
        transition: background 0.4s ease, color 0.4s ease, border-color 0.4s ease;
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
        text-wrap: pretty;
      }

      /* Gated on hover-capable pointers so the state cannot stick on touch. */
      @media (hover: hover) {
        .lh-ben-item:hover::before {
          transform: translateY(0);
        }
        .lh-ben-item:hover .lh-ben-watermark {
          opacity: 0.09;
          transform: translateY(0);
        }
        .lh-ben-item:hover .lh-ben-icon {
          background: ${GOLD};
          border-color: ${GOLD};
          color: ${PAPER};
        }
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
      @media (prefers-reduced-motion: reduce) {
        .lh-ben-item::before,
        .lh-ben-watermark,
        .lh-ben-icon {
          transition: none;
        }
      }
    `}</style>
  </Section>
);

export default WhatYouGetSection;
