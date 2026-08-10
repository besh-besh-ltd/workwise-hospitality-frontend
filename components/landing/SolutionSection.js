import React from 'react';
import { FiBarChart2, FiCheckCircle, FiShield } from 'react-icons/fi';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import CardVisual from './CardVisual';
import { INK, INK_2, RULE, GOLD, GOLD_DEEP, DOC, DOC_INK, SERIF, SANS, MONO, BP } from './theme';

// Fully-formed element per branch — see the Turbopack note in ProblemSection.
const renderIcon = (key, size) => {
  if (key === 'chart') return <FiBarChart2 size={size} />;
  if (key === 'check') return <FiCheckCircle size={size} />;
  return <FiShield size={size} />;
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
            <span className="lh-sol-index">{`0${index + 1}`}</span>
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
      .lh-sol-index {
        display: block;
        font-family: ${MONO};
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        color: ${GOLD_DEEP};
        font-variant-numeric: tabular-nums;
        padding-bottom: 16px;
        border-bottom: 1px solid ${RULE};
        margin-bottom: 22px;
        width: fit-content;
        min-width: 56px;
      }
      .lh-sol-title {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(1.5rem, 2.6vw, 2.15rem);
        line-height: 1.1;
        letter-spacing: -0.015em;
        color: ${INK};
        margin: 0 0 16px;
        max-width: 18ch;
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
