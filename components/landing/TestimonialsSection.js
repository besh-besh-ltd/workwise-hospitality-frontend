import React from 'react';
import Section from './Section';
import SectionHead from './SectionHead';
import Reveal from './Reveal';
import {
  PAPER,
  PAPER_ALT,
  INK,
  INK_2,
  INK_3,
  RULE,
  GOLD,
  GOLD_DEEP,
  GOLD_WASH,
  SERIF,
  SANS,
  MONO,
  BP,
} from './theme';

/**
 * An editorial pull quote rather than a card in a carousel.
 *
 * The previous build ran react-slick as an infinite marquee, then short-
 * circuited to a static Bootstrap `ui/TestimonialCard` because there is only
 * one quote — carrying a clashing #FBB928 accent onto the page for nothing.
 *
 * With a single quote the section is a two-panel proof block: the words on the
 * left, that customer's actual numbers on the right. A lone quote in a
 * full-width column left half the section empty and read as unfinished, and
 * "engaging" here means more evidence, not more decoration.
 *
 * Scales up on its own: several quotes drop the results rail and lay out as a
 * set of cards instead.
 */
const TestimonialsSection = ({ content }) => {
  const items = content.items || [];
  if (!items.length) return null;

  const isSingle = items.length === 1;
  const solo = isSingle ? items[0] : null;
  const results = solo?.results || [];

  return (
    <Section id="lh-testimonials" tone="alt">
      <SectionHead number={content.number} eyebrow={content.eyebrow} heading={content.heading} />

      {isSingle ? (
        <Reveal className="lh-proof-panel">
          <figure className="lh-quote">
            <span className="lh-quote-mark" aria-hidden="true">
              &ldquo;
            </span>

            <blockquote className="lh-quote-text">{solo.quote}</blockquote>

            <figcaption className="lh-quote-by">
              <span className="lh-quote-avatar" aria-hidden="true">
                {solo.author
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span className="lh-quote-ident">
                <span className="lh-quote-author">{solo.author}</span>
                <span className="lh-quote-role">
                  {solo.position}
                  {solo.company ? ` · ${solo.company}` : ''}
                </span>
              </span>
            </figcaption>
          </figure>

          {results.length > 0 && (
            <div className="lh-quote-results">
              {solo.logoText && <span className="lh-quote-logo">{solo.logoText}</span>}

              <ul className="lh-result-list">
                {results.map((result) => (
                  <li key={result.label} className="lh-result">
                    <span className="lh-result-value">{result.value}</span>
                    <span className="lh-result-label">{result.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>
      ) : (
        <div className="lh-quote-wrap">
          {items.map((item, index) => (
            <Reveal as="figure" key={item.author} className="lh-quote" delay={index * 120}>
              <span className="lh-quote-mark" aria-hidden="true">
                &ldquo;
              </span>

              <blockquote className="lh-quote-text">{item.quote}</blockquote>

              <figcaption className="lh-quote-by">
                <span className="lh-quote-ident">
                  <span className="lh-quote-author">{item.author}</span>
                  <span className="lh-quote-role">
                    {item.position}
                    {item.company ? ` · ${item.company}` : ''}
                  </span>
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      )}

      <style jsx>{`
        /* Quote left, that customer's numbers right — the hairline between them
           is the shared gap showing through, same trick as the benefits grid. */
        :global(.lh-proof-panel) {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 1px;
          background: ${RULE};
          border: 1px solid ${RULE};
        }
        .lh-quote-wrap {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(32px, 5vw, 64px);
        }
        :global(.lh-quote) {
          margin: 0;
          background: ${PAPER_ALT};
          padding: clamp(30px, 3.6vw, 48px);
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
          font-size: clamp(1.3rem, 2.2vw, 1.85rem);
          line-height: 1.34;
          letter-spacing: -0.012em;
          color: ${INK};
          margin: 0 0 30px;
          border: none;
          padding: 0;
          text-wrap: pretty;
        }
        .lh-quote-by {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-top: 22px;
          border-top: 1px solid ${RULE};
        }
        /* Initials stand in until there is a real headshot to use. */
        .lh-quote-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: ${GOLD_WASH};
          border: 1px solid ${GOLD}40;
          color: ${GOLD_DEEP};
          font-family: ${SANS};
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .lh-quote-ident {
          display: block;
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

        .lh-quote-results {
          background: ${PAPER};
          padding: clamp(30px, 3.6vw, 48px);
          display: flex;
          flex-direction: column;
        }
        .lh-quote-logo {
          font-family: ${SERIF};
          font-size: clamp(1.1rem, 1.5vw, 1.3rem);
          color: ${INK};
          padding-bottom: 20px;
          margin-bottom: 8px;
          border-bottom: 1px solid ${RULE};
        }
        .lh-result-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-evenly;
        }
        .lh-result {
          padding: 14px 0;
        }
        .lh-result + .lh-result {
          border-top: 1px solid ${RULE};
        }
        .lh-result-value {
          display: block;
          font-family: ${MONO};
          font-size: clamp(1.5rem, 2.4vw, 2rem);
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: ${GOLD_DEEP};
          font-variant-numeric: tabular-nums;
          margin-bottom: 6px;
        }
        .lh-result-label {
          display: block;
          font-family: ${SANS};
          font-size: 0.85rem;
          line-height: 1.5;
          color: ${INK_2};
        }

        @media (max-width: ${BP.lg}) {
          :global(.lh-proof-panel),
          .lh-quote-wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Section>
  );
};

export default TestimonialsSection;
