import React from 'react';
import Reveal from './Reveal';
import { PAPER, INK, GOLD, GOLD_DEEP, SERIF, SANS, TYPE, MAXW, GUTTER, BP } from './theme';

/**
 * The second conversion path. The first build ran the testimonial straight
 * into the footer, so a visitor who read the whole page had to scroll back up
 * to the navbar to act.
 */
const ClosingCta = ({ content, onBookDemo }) => (
  <section className="lh-cta">
    <Reveal className="lh-cta-inner">
      <h2 className="lh-cta-heading">{content.heading}</h2>
      <p className="lh-cta-desc">{content.description}</p>
      <button type="button" className="lh-cta-btn" onClick={onBookDemo}>
        {content.buttonLabel}
      </button>
    </Reveal>

    <style jsx>{`
      .lh-cta {
        background: ${INK};
        background-image: radial-gradient(
          90% 120% at 50% 108%,
          rgba(201, 162, 39, 0.5) 0%,
          rgba(11, 31, 58, 0) 68%
        );
        padding: clamp(80px, 11vw, 148px) ${GUTTER};
      }
      :global(.lh-cta-inner) {
        max-width: ${MAXW};
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .lh-cta-heading {
        font-family: ${SERIF};
        font-weight: 400;
        font-size: clamp(2.25rem, 5vw, 3.75rem);
        line-height: 1.04;
        letter-spacing: -0.02em;
        color: ${PAPER};
        margin: 0;
        max-width: 18ch;
      }
      .lh-cta-desc {
        font-family: ${SANS};
        font-size: ${TYPE.body};
        line-height: 1.65;
        color: rgba(255, 255, 255, 0.7);
        margin: clamp(20px, 2.4vw, 28px) 0 clamp(32px, 4vw, 44px);
        max-width: 52ch;
      }
      .lh-cta-btn {
        font-family: ${SANS};
        background: ${GOLD};
        color: ${INK};
        border: none;
        border-radius: 2px;
        padding: 16px 38px;
        font-weight: 500;
        font-size: 0.98rem;
        cursor: pointer;
        transition: background 0.25s ease, transform 0.25s ease;
      }
      .lh-cta-btn:hover {
        background: ${GOLD_DEEP};
        transform: translateY(-1px);
      }

      @media (max-width: ${BP.sm}) {
        .lh-cta-btn {
          width: 100%;
        }
      }
    `}</style>
  </section>
);

export default ClosingCta;
