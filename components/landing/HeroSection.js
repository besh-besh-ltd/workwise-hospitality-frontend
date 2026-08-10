import React from 'react';
import Image from 'next/image';
import { FiArrowRight, FiLock } from 'react-icons/fi';
import RateCard from './RateCard';
import {
  PAPER,
  INK,
  INK_2,
  RULE,
  GOLD,
  GOLD_DEEP,
  SERIF,
  SANS,
  MONO,
  TYPE,
  MAXW,
  GUTTER,
  BP,
} from './theme';

const HeroSection = ({ content, onBookDemo }) => {
  const media = content.media || {};
  const hasMedia = Boolean(media.src);

  return (
    <section id="lh-hero" className="lh-hero">
      <div className="lh-hero-inner">
        <div className="lh-hero-copy">
          <span className="lh-hero-eyebrow">{content.eyebrow}</span>

          <h1 className="lh-hero-title">
            {content.title}
            <br />
            <em>{content.titleAccent}</em>
          </h1>

          <p className="lh-hero-desc">{content.description}</p>

          <div className="lh-hero-cta">
            <button type="button" className="lh-hero-btn" onClick={onBookDemo}>
              {content.bookDemoLabel}
            </button>
            <a href={content.secondaryHref} className="lh-hero-link">
              {content.secondaryLabel}
              <FiArrowRight size={15} />
            </a>
          </div>

          <div className="lh-hero-usp">
            <span className="lh-hero-usp-head">{content.usp.heading}</span>
            <p className="lh-hero-usp-desc">{content.usp.description}</p>
          </div>
        </div>

        <div className="lh-hero-visual">
          {hasMedia && media.type === 'video' && (
            <video
              className="lh-hero-media"
              src={media.src}
              poster={media.poster || undefined}
              autoPlay
              muted
              loop
              playsInline
            />
          )}

          {hasMedia && media.type === 'image' && (
            <Image
              className="lh-hero-media"
              src={media.src}
              alt={media.alt || ''}
              width={720}
              height={480}
              priority
            />
          )}

          {!hasMedia && <RateCard caption={media.caption} />}

          <div className="lh-hero-chip">
            <FiLock size={13} />
            <span>Negotiated rate · locked across every property</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lh-hero {
          background: ${PAPER};
          padding: clamp(56px, 8vw, 104px) ${GUTTER} clamp(64px, 8vw, 112px);
          /* Radial warmth rather than a flat fill, so the paper has depth. */
          background-image: radial-gradient(
            120% 80% at 78% 12%,
            rgba(201, 162, 39, 0.05) 0%,
            rgba(11, 31, 58, 0) 62%
          );
        }
        .lh-hero-inner {
          max-width: ${MAXW};
          margin: 0 auto;
          display: grid;
          /* Asymmetric by intent: the copy owns more of the measure. */
          grid-template-columns: minmax(0, 1.06fr) minmax(0, 0.94fr);
          gap: clamp(40px, 6vw, 88px);
          align-items: center;
        }
        .lh-hero-eyebrow {
          display: inline-block;
          font-family: ${MONO};
          font-size: ${TYPE.eyebrow};
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: ${GOLD_DEEP};
          padding-bottom: 14px;
          border-bottom: 1px solid ${RULE};
          margin-bottom: clamp(24px, 3vw, 36px);
        }
        .lh-hero-title {
          font-family: ${SERIF};
          font-weight: 400;
          font-size: ${TYPE.display};
          line-height: 1.02;
          letter-spacing: -0.022em;
          color: ${INK};
          margin: 0 0 clamp(20px, 2.4vw, 30px);
        }
        .lh-hero-title em {
          font-style: italic;
          color: ${GOLD_DEEP};
        }
        .lh-hero-desc {
          font-family: ${SANS};
          font-size: ${TYPE.body};
          line-height: 1.65;
          color: ${INK_2};
          max-width: 46ch;
          margin: 0 0 clamp(28px, 3.4vw, 40px);
        }
        .lh-hero-cta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 28px;
          margin-bottom: clamp(36px, 4.5vw, 56px);
        }
        .lh-hero-btn {
          font-family: ${SANS};
          background: ${GOLD};
          color: ${PAPER};
          border: none;
          border-radius: 2px;
          padding: 15px 32px;
          font-weight: 500;
          font-size: 0.95rem;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 0.25s ease, transform 0.25s ease;
        }
        .lh-hero-btn:hover {
          background: ${GOLD_DEEP};
          transform: translateY(-1px);
        }
        .lh-hero-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: ${SANS};
          font-size: 0.92rem;
          color: ${INK};
          text-decoration: none;
          padding-bottom: 3px;
          border-bottom: 1px solid ${INK};
          transition: color 0.25s ease, border-color 0.25s ease, gap 0.25s ease;
        }
        .lh-hero-link:hover {
          color: ${GOLD_DEEP};
          border-color: ${GOLD_DEEP};
          gap: 12px;
        }
        .lh-hero-usp {
          border-left: 2px solid ${GOLD};
          padding-left: 20px;
          max-width: 44ch;
        }
        .lh-hero-usp-head {
          display: block;
          font-family: ${SANS};
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${INK};
          margin-bottom: 8px;
        }
        .lh-hero-usp-desc {
          font-family: ${SANS};
          font-size: 0.9rem;
          line-height: 1.6;
          color: ${INK_2};
          margin: 0;
        }
        .lh-hero-visual {
          position: relative;
        }
        .lh-hero-visual :global(.lh-hero-media) {
          width: 100%;
          height: auto;
          display: block;
          border: 1px solid ${RULE};
        }
        /* The grid-breaking element: overhangs the visual's lower-left corner. */
        .lh-hero-chip {
          position: absolute;
          left: clamp(-40px, -3vw, -16px);
          bottom: clamp(-18px, -2vw, -12px);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: ${GOLD};
          color: ${PAPER};
          font-family: ${SANS};
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          padding: 10px 16px;
          max-width: calc(100% - 24px);
        }
        .lh-hero-chip :global(svg) {
          color: ${PAPER};
          flex-shrink: 0;
        }

        @media (max-width: ${BP.lg}) {
          .lh-hero-inner {
            grid-template-columns: 1fr;
            gap: 56px;
          }
          .lh-hero-chip {
            left: 0;
          }
        }
        @media (max-width: ${BP.sm}) {
          .lh-hero-cta {
            flex-direction: column;
            align-items: stretch;
            gap: 18px;
          }
          .lh-hero-btn {
            width: 100%;
          }
          .lh-hero-link {
            align-self: flex-start;
          }
          .lh-hero-chip {
            position: static;
            margin-top: 20px;
            max-width: 100%;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
