import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { FiArrowRight, FiZap, FiPlay } from 'react-icons/fi';
import RateCard from './RateCard';
import {
  PAPER,
  INK,
  INK_2,
  RULE,
  GOLD,
  GOLD_DEEP,
  GOLD_WASH,
  SERIF,
  SANS,
  MONO,
  TYPE,
  MAXW,
  GUTTER,
  BP,
} from './theme';

// "Crafted exclusively for Hospitality", carried visually rather than only
// stated: a colonnade of arches. Encoded via encodeURIComponent because a raw
// data URI with unescaped <, > and " silently resolves to `none` in Chrome.
const ARCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="260" viewBox="0 0 220 260"><g fill="none" stroke="${GOLD}" stroke-width="1.5"><path d="M20 250V96a45 45 0 0 1 90 0v154"/><path d="M130 250V128a35 35 0 0 1 70 0v122"/></g></svg>`;
const ARCH_BG = `url("data:image/svg+xml,${encodeURIComponent(ARCH_SVG)}")`;

const HeroSection = ({ content, onBookDemo }) => {
  const media = content.media || {};
  const hasMedia = Boolean(media.src);
  const videoRef = useRef(null);
  const [filmStarted, setFilmStarted] = useState(false);

  // The film is 87s / 20.5MB, so it is click-to-play against a poster rather
  // than an autoplaying loop: preload="none" means a visitor who never presses
  // play downloads none of it. Safari rejects play() in some states and an
  // unhandled rejection surfaces as a page error, so it is caught.
  const startFilm = () => {
    setFilmStarted(true);
    const el = videoRef.current;
    if (!el) return;
    const started = el.play();
    if (started && typeof started.catch === 'function') started.catch(() => {});
  };

  return (
    <section id="lh-hero" className="lh-hero">
      <div className="lh-hero-inner">
        <div className="lh-hero-copy">
          <span className="lh-hero-badge">
            <FiZap size={13} />
            {content.badge}
          </span>

          <h1 className="lh-hero-title">{content.title}</h1>

          <p className="lh-hero-tagline">{content.tagline}</p>

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
        </div>

        <div className="lh-hero-visual">
          {hasMedia && media.type === 'video' && (
            <div className="lh-hero-film">
              <video
                ref={videoRef}
                className="lh-hero-media"
                src={media.src}
                poster={media.poster || undefined}
                playsInline
                preload="none"
                controls={filmStarted}
                onEnded={() => setFilmStarted(false)}
              />

              {!filmStarted && (
                <button
                  type="button"
                  className="lh-hero-play"
                  onClick={startFilm}
                  aria-label={`${media.playLabel || 'Play the film'}${
                    media.duration ? `, ${media.duration}` : ''
                  }`}
                >
                  <span className="lh-hero-play-disc">
                    <FiPlay size={20} />
                  </span>
                  <span className="lh-hero-play-text">
                    {media.playLabel || 'Play the film'}
                    {media.duration && <em>{media.duration}</em>}
                  </span>
                </button>
              )}
            </div>
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
        </div>
      </div>

      <style jsx>{`
        .lh-hero {
          position: relative;
          isolation: isolate;
          background: ${PAPER};
          padding: clamp(56px, 8vw, 104px) ${GUTTER} clamp(64px, 8vw, 112px);
          /* Radial warmth rather than a flat fill, so the paper has depth. */
          background-image: radial-gradient(
            120% 80% at 78% 12%,
            rgba(201, 162, 39, 0.05) 0%,
            rgba(11, 31, 58, 0) 62%
          );
        }
        /* Arch colonnade at very low alpha, held to the right half and faded
           out toward the copy by the mask, so it never sits under body text. */
        .lh-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-image: ${ARCH_BG};
          background-repeat: repeat;
          background-size: clamp(180px, 16vw, 240px) auto;
          opacity: 0.07;
          -webkit-mask-image: linear-gradient(100deg, transparent 38%, #000 92%);
          mask-image: linear-gradient(100deg, transparent 38%, #000 92%);
        }
        .lh-hero-inner {
          max-width: ${MAXW};
          margin: 0 auto;
          display: grid;
          /* The film now carries the hook, so the visual column takes the
             larger share and the gap tightens to buy it width. */
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
          gap: clamp(32px, 4vw, 56px);
          align-items: start;
        }
        /* The AI-powered claim, promoted out of the old footnote USP block. */
        .lh-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: ${MONO};
          font-size: ${TYPE.eyebrow};
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${GOLD_DEEP};
          background: ${GOLD_WASH};
          border: 1px solid ${GOLD}55;
          border-radius: 999px;
          padding: 8px 16px;
          margin-bottom: clamp(22px, 2.8vw, 32px);
        }
        .lh-hero-title {
          font-family: ${SERIF};
          font-weight: 400;
          font-size: ${TYPE.display};
          line-height: 1.02;
          letter-spacing: -0.022em;
          color: ${INK};
          margin: 0 0 12px;
          text-wrap: balance;
        }
        .lh-hero-tagline {
          font-family: ${SERIF};
          font-style: italic;
          font-size: clamp(1.35rem, 2.4vw, 1.9rem);
          line-height: 1.25;
          color: ${GOLD_DEEP};
          margin: 0 0 clamp(20px, 2.4vw, 28px);
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
        /* Dropped by exactly the badge's own height plus its bottom margin, so
           the film's top edge sits on the same line as the heading rather than
           floating centred between the heading and the description. */
        .lh-hero-visual {
          position: relative;
          margin-top: calc(35px + clamp(22px, 2.8vw, 32px));
        }
        .lh-hero-film {
          position: relative;
          display: block;
          line-height: 0;
        }
        /* Covers the poster so anywhere on the frame starts the film, but the
           control itself is parked bottom-right: the poster carries its own
           headline and a centred disc sat straight on top of it. Bottom-left is
           already taken by the rate chip. */
        .lh-hero-play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 14px;
          padding: clamp(16px, 2vw, 24px);
          background: linear-gradient(0deg, rgba(11, 31, 58, 0.62) 0%, rgba(11, 31, 58, 0) 42%);
          border: none;
          cursor: pointer;
          font-family: ${SANS};
          transition: background 0.3s ease;
        }
        .lh-hero-play:hover {
          background: linear-gradient(0deg, rgba(11, 31, 58, 0.74) 0%, rgba(11, 31, 58, 0.06) 52%);
        }
        .lh-hero-play-disc {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: ${GOLD};
          color: ${PAPER};
          /* Optical centring: a play triangle reads left-heavy when centred. */
          padding-left: 3px;
          transition: transform 0.3s ease;
        }
        .lh-hero-play:hover .lh-hero-play-disc {
          transform: scale(1.07);
        }
        .lh-hero-play-text {
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
          line-height: 1;
          font-size: 0.9rem;
          letter-spacing: 0.04em;
          color: ${INK};
        }
        .lh-hero-play-text em {
          font-style: normal;
          font-family: ${MONO};
          font-size: 0.75rem;
          color: ${GOLD_DEEP};
        }
        @media (prefers-reduced-motion: reduce) {
          .lh-hero-play,
          .lh-hero-play-disc {
            transition: none;
          }
          .lh-hero-play:hover .lh-hero-play-disc {
            transform: none;
          }
        }
        .lh-hero-visual :global(.lh-hero-media) {
          width: 100%;
          height: auto;
          display: block;
          border: 1px solid ${RULE};
        }

        @media (max-width: ${BP.lg}) {
          .lh-hero-inner {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          /* Stacked: there is no heading beside the film to line up with, so
             the badge-height offset would just be dead space. */
          .lh-hero-visual {
            margin-top: 0;
          }
          .lh-hero-cta {
            margin-bottom: 0;
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
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
