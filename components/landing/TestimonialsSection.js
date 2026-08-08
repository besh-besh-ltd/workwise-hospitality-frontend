import React from 'react';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import { INK, INK_3, RULE, GOLD, GOLD_DEEP, SERIF, SANS, BP } from './theme';

/**
 * An editorial pull quote rather than a card in a carousel.
 *
 * The previous build ran react-slick as an infinite marquee, then short-
 * circuited to a static Bootstrap `ui/TestimonialCard` because there is only
 * one quote — carrying a clashing #FBB928 accent onto the page for nothing.
 *
 * Scales up on its own: one quote reads as a statement, several read as a set.
 */
const TestimonialsSection = ({ content }) => {
  const items = content.items || [];
  if (!items.length) return null;

  const isSingle = items.length === 1;

  return (
    <Section id="lh-testimonials" tone="paper">
      <SectionHead number={content.number} eyebrow={content.eyebrow} heading={content.heading} />

      <div className={`lh-quote-wrap ${isSingle ? 'lh-quote-solo' : ''}`}>
        {items.map((item, index) => (
          <Reveal as="figure" key={item.author} className="lh-quote" delay={index * 120}>
            <span className="lh-quote-mark" aria-hidden="true">
              &ldquo;
            </span>

            <blockquote className="lh-quote-text">{item.quote}</blockquote>

            <figcaption className="lh-quote-by">
              <span className="lh-quote-author">{item.author}</span>
              <span className="lh-quote-role">
                {item.position}
                {item.company ? ` · ${item.company}` : ''}
              </span>
            </figcaption>
          </Reveal>
        ))}
      </div>

      <style jsx>{`
        .lh-quote-wrap {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(32px, 5vw, 64px);
        }
        .lh-quote-solo {
          grid-template-columns: 1fr;
          max-width: 62ch;
        }
        :global(.lh-quote) {
          margin: 0;
        }
        .lh-quote-mark {
          display: block;
          font-family: ${SERIF};
          font-size: 4rem;
          line-height: 0.6;
          color: ${GOLD_DEEP};
          margin-bottom: 20px;
        }
        .lh-quote-text {
          font-family: ${SERIF};
          font-weight: 400;
          font-size: clamp(1.35rem, 2.6vw, 2.1rem);
          line-height: 1.32;
          letter-spacing: -0.012em;
          color: ${INK};
          margin: 0 0 32px;
          border: none;
          padding: 0;
        }
        .lh-quote-solo .lh-quote-text {
          font-size: clamp(1.5rem, 3.2vw, 2.5rem);
        }
        .lh-quote-by {
          padding-top: 20px;
          border-top: 1px solid ${RULE};
        }
        .lh-quote-author {
          display: block;
          font-family: ${SANS};
          font-size: 0.95rem;
          font-weight: 500;
          color: ${INK};
          margin-bottom: 4px;
        }
        .lh-quote-role {
          display: block;
          font-family: ${SANS};
          font-size: 0.85rem;
          line-height: 1.5;
          color: ${INK_3};
        }

        @media (max-width: ${BP.lg}) {
          .lh-quote-wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Section>
  );
};

export default TestimonialsSection;
