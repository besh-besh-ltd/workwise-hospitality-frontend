import React from 'react';
import Reveal from './Reveal';
import CountUpValue from './CountUpValue';
import { PAPER_ALT, INK, INK_2, INK_3, RULE, GOLD, GOLD_DEEP, MONO, SANS, MAXW, GUTTER, BP } from './theme';

/**
 * The numbers, given their own band rather than crammed into the hero as
 * glass cards. Figures are set in tabular mono so the digits align down the
 * row — the "ledger" idea carried into typography.
 */
const ProofBand = ({ content }) => (
  <section className="lh-proof">
    <div className="lh-proof-inner">
      <ul className="lh-proof-list">
        {content.stats.map((stat, i) => (
          <Reveal as="li" key={stat.label} className="lh-proof-item" delay={i * 90}>
            <span className="lh-proof-value">
              <CountUpValue value={stat.value} />
            </span>
            <span className="lh-proof-label">{stat.label}</span>
          </Reveal>
        ))}
      </ul>

      {content.footnote && <p className="lh-proof-note">{content.footnote}</p>}
    </div>

    <style jsx>{`
      .lh-proof {
        background: ${PAPER_ALT};
        padding: clamp(48px, 6vw, 80px) ${GUTTER};
      }
      .lh-proof-inner {
        max-width: ${MAXW};
        margin: 0 auto;
      }
      .lh-proof-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        /* Driven by the stat count so the band stays full-width if it changes. */
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1px;
        background: ${RULE};
        border-top: 1px solid ${RULE};
        border-bottom: 1px solid ${RULE};
      }
      :global(.lh-proof-item) {
        background: ${PAPER_ALT};
        padding: clamp(24px, 3vw, 36px) clamp(16px, 2vw, 28px);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .lh-proof-value {
        font-family: ${MONO};
        font-size: clamp(1.9rem, 3.4vw, 2.75rem);
        font-weight: 500;
        line-height: 1;
        letter-spacing: -0.03em;
        color: ${GOLD_DEEP};
        font-variant-numeric: tabular-nums;
      }
      .lh-proof-label {
        font-family: ${SANS};
        font-size: 0.84rem;
        line-height: 1.45;
        color: ${INK_2};
        max-width: 22ch;
      }
      .lh-proof-note {
        font-family: ${SANS};
        font-size: 0.78rem;
        line-height: 1.6;
        color: ${INK_3};
        margin: 22px 0 0;
        max-width: 60ch;
      }

      @media (max-width: ${BP.lg}) {
        .lh-proof-list {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: ${BP.sm}) {
        .lh-proof-list {
          grid-template-columns: 1fr;
        }
        .lh-proof-value {
          color: ${INK};
        }
      }
    `}</style>
  </section>
);

export default ProofBand;
