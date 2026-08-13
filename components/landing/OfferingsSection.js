import React from 'react';
import { LuShoppingCart, LuScrollText, LuHardHat, LuBuilding2 } from 'react-icons/lu';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { PAPER, PAPER_DEEP, INK, INK_2, RULE, GOLD, GOLD_WASH, SERIF, SANS, BP } from './theme';

// Fully-formed element per branch — see the Turbopack note in ProblemSection.
// One glyph per kind of spend: the daily basket, the signed rate contract, the
// refurbishment site, and the brand new property.
const renderIcon = (key, size) => {
  if (key === 'cart') return <LuShoppingCart size={size} />;
  if (key === 'contract') return <LuScrollText size={size} />;
  if (key === 'hardhat') return <LuHardHat size={size} />;
  return <LuBuilding2 size={size} />;
};

/**
 * The four kinds of spend a hotel group runs. Each card carries its own id so
 * the "Our solutions" navbar dropdown can deep-link straight to it; the global
 * `.lh-page section { scroll-margin-top: 80px }` keeps the target clear of the
 * sticky bar, and these ids are the anchors that rule is protecting.
 */
const OfferingsSection = ({ content }) => (
  <Section id="lh-offerings" tone="paper">
    <SectionHead
      number={content.number}
      eyebrow={content.eyebrow}
      heading={content.heading}
      subheading={content.subheading}
    />

    <ul className="lh-off-grid">
      {content.items.map((item, index) => (
        // The id sits on the li, not on Reveal: Reveal holds a translateY(24px)
        // until it enters view, so anchoring to it would scroll to the
        // pre-animation position and the reveal would then lift the card up
        // under the sticky navbar.
        <li key={item.id} id={item.id} className="lh-off-item">
          <Reveal delay={(index % 2) * 90}>
            <span className="lh-off-icon">{renderIcon(item.icon, 28)}</span>
            <h3 className="lh-off-title">{item.title}</h3>
            <p className="lh-off-desc">{item.description}</p>
          </Reveal>
        </li>
      ))}
    </ul>

    <style jsx>{`
      .lh-off-grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        /* Hairlines come from the gap showing the rule-coloured backdrop. */
        gap: 1px;
        background: ${RULE};
        border: 1px solid ${RULE};
      }
      /* Centred both ways. The grid makes every card the height of the tallest,
         so left-and-top alignment dumped all the slack at the bottom of the
         shorter ones; centring shares it evenly above and below. */
      .lh-off-item {
        position: relative;
        overflow: hidden;
        background: ${PAPER};
        padding: clamp(28px, 3.4vw, 44px);
        /* Anchored from the dropdown, so clear the sticky bar on arrival. */
        scroll-margin-top: 104px;
        transition: background 0.35s ease;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
      }
      /* Gold wash that rises from the corner the icon sits in. Kept behind the
         copy — as a plain ::after it paints over the text and muddies it. */
      .lh-off-item::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background: radial-gradient(120% 110% at 0% 0%, ${GOLD}1f 0%, transparent 62%);
        opacity: 0;
        transition: opacity 0.35s ease;
      }
      .lh-off-item > :global(*) {
        position: relative;
        z-index: 1;
        width: 100%;
      }
      .lh-off-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 68px;
        height: 68px;
        border-radius: 50%;
        border: 1px solid ${GOLD}40;
        background: ${GOLD_WASH};
        color: ${GOLD};
        margin: 0 auto 24px;
        transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease,
          transform 0.35s ease;
      }
      /* Gated on hover-capable pointers so the state cannot stick on touch. */
      @media (hover: hover) {
        .lh-off-item:hover {
          background: ${PAPER_DEEP};
        }
        .lh-off-item:hover::after {
          opacity: 1;
        }
        .lh-off-item:hover .lh-off-icon {
          background: ${GOLD};
          border-color: ${GOLD};
          color: ${PAPER};
          transform: translateY(-3px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .lh-off-item,
        .lh-off-item::after,
        .lh-off-icon {
          transition: none;
        }
        .lh-off-item:hover .lh-off-icon {
          transform: none;
        }
      }
      .lh-off-title {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(1.3rem, 1.9vw, 1.65rem);
        line-height: 1.18;
        color: ${INK};
        margin: 0 0 12px;
        text-wrap: balance;
      }
      .lh-off-desc {
        font-family: ${SANS};
        font-size: 0.92rem;
        line-height: 1.65;
        color: ${INK_2};
        /* Tighter than the 52ch it ran to when left-ranged: centred text is
           harder to track back, so the measure is kept short. */
        margin: 0 auto;
        max-width: 44ch;
        text-wrap: pretty;
      }

      @media (max-width: ${BP.md}) {
        .lh-off-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  </Section>
);

export default OfferingsSection;
