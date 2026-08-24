import React from 'react';
import { LuChartColumnBig, LuLock, LuEyeOff } from 'react-icons/lu';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import CardVisual from './CardVisual';
import { INK, INK_2, RULE, GOLD, GOLD_WASH, DOC, DOC_INK, SERIF, SANS, BP } from './theme';

// Fully-formed element per branch — see the Turbopack note in ProblemSection.
// The keys double as CardVisual's `variant`, so they stay as-is even though the
// glyphs changed: a comparison chart, a locked rate, and a hidden identity.
const renderIcon = (key, size) => {
  if (key === 'chart') return <LuChartColumnBig size={size} />;
  if (key === 'check') return <LuLock size={size} />;
  return <LuEyeOff size={size} />;
};

/**
 * The page's most generous section — this is what the visitor is buying, so it
 * gets the illustrations and the room. Rows alternate sides to keep the eye
 * moving without any scroll hijacking.
 */
const SolutionSection = ({ content }) => (
  <Section id="lh-solution" tone="alt">
    <SectionHead
      number={content.number}
      eyebrow={content.eyebrow}
      heading={content.heading}
      subheading={content.subheading}
    />

    <div className="lh-sol-rows">
      {content.points.map((point, index) => (
        <Reveal key={point.title} className={`lh-sol-row ${index % 2 ? 'lh-sol-row-flip' : ''}`}>
          <div className="lh-sol-copy">
            <span className="lh-sol-icon">{renderIcon(point.icon, 26)}</span>
            <h3 className="lh-sol-title">{point.title}</h3>
            <p className="lh-sol-desc">{point.description}</p>
          </div>

          <div className="lh-sol-visual">
            <CardVisual
              variant={point.icon}
              iconElement={renderIcon(point.icon, 56)}
              color={DOC_INK}
              activeKey={point.icon}
            />
          </div>
        </Reveal>
      ))}
    </div>

    <style jsx>{`
      .lh-sol-rows {
        display: flex;
        flex-direction: column;
        gap: clamp(56px, 8vw, 104px);
      }
      :global(.lh-sol-row) {
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
        gap: clamp(32px, 5vw, 72px);
        align-items: center;
      }
      /* Flip via order so the DOM keeps copy-before-visual for screen readers. */
      :global(.lh-sol-row-flip) .lh-sol-copy {
        order: 2;
      }
      :global(.lh-sol-row-flip) .lh-sol-visual {
        order: 1;
      }
      /* Sits where the 01/02/03 index used to, keeping the rule underneath so
         the row still opens on the same horizontal beat as the rest of page. */
      .lh-sol-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 1px solid ${GOLD}40;
        background: ${GOLD_WASH};
        color: ${GOLD};
        margin-bottom: 24px;
      }
      .lh-sol-title {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(1.5rem, 2.6vw, 2.15rem);
        line-height: 1.1;
        letter-spacing: -0.015em;
        color: ${INK};
        margin: 0 0 16px;
        max-width: 32ch;
        text-wrap: balance;
      }
      .lh-sol-desc {
        font-family: ${SANS};
        font-size: 0.98rem;
        line-height: 1.7;
        color: ${INK_2};
        margin: 0;
        max-width: 46ch;
      }
      /* Light panel on the navy field: the illustrations inside are printed
         sheets and screens, so the frame reads as paper, like the brochure. */
      .lh-sol-visual {
        background: ${DOC};
        border: 1px solid ${RULE};
        padding: clamp(18px, 2.5vw, 28px);
        min-height: clamp(300px, 34vw, 420px);
        display: flex;
      }
      .lh-sol-visual > :global(*) {
        flex: 1;
        min-width: 0;
      }

      @media (max-width: ${BP.lg}) {
        :global(.lh-sol-row),
        :global(.lh-sol-row-flip) {
          grid-template-columns: 1fr;
          gap: 32px;
        }
        :global(.lh-sol-row-flip) .lh-sol-copy {
          order: 0;
        }
        :global(.lh-sol-row-flip) .lh-sol-visual {
          order: 0;
        }
        .lh-sol-visual {
          min-height: 280px;
        }
      }
    `}</style>
  </Section>
);

export default SolutionSection;
