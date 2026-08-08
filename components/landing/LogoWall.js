import React from 'react';
import Image from 'next/image';
import Reveal from './Reveal';
import { PAPER, INK, INK_3, RULE, SERIF, SANS, MAXW, GUTTER, BP } from './theme';

/**
 * Social proof directly under the hero — the pattern every serious competitor
 * in this category leads with (BirchStreet runs 28 hotel brands here).
 *
 * Names render as typographic wordmarks until real logo files land, so the
 * section is honest and complete with zero assets. Supply `src` on a logo
 * entry and it upgrades to the image automatically. Renders nothing at all
 * when the list is empty — better a missing band than a fake one.
 */
const LogoWall = ({ content }) => {
  const logos = content?.logos?.filter(Boolean) || [];
  if (!logos.length) return null;

  return (
    <section className="lh-logos">
      <Reveal className="lh-logos-inner">
        <span className="lh-logos-eyebrow">{content.eyebrow}</span>

        <ul className="lh-logos-list">
          {logos.map((logo) => (
            <li key={logo.name} className="lh-logos-item">
              {logo.src ? (
                <Image src={logo.src} alt={logo.name} width={132} height={38} />
              ) : (
                <span className="lh-logos-word">{logo.name}</span>
              )}
            </li>
          ))}
        </ul>
      </Reveal>

      <style jsx>{`
        .lh-logos {
          background: ${PAPER};
          padding: 0 ${GUTTER} clamp(48px, 6vw, 72px);
        }
        :global(.lh-logos-inner) {
          max-width: ${MAXW};
          margin: 0 auto;
          border-top: 1px solid ${RULE};
          padding-top: clamp(28px, 3.5vw, 40px);
          display: flex;
          align-items: center;
          gap: clamp(24px, 4vw, 56px);
          flex-wrap: wrap;
        }
        .lh-logos-eyebrow {
          font-family: ${SANS};
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${INK_3};
          white-space: nowrap;
        }
        .lh-logos-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: clamp(20px, 3.5vw, 44px);
        }
        .lh-logos-item {
          display: inline-flex;
          align-items: center;
        }
        .lh-logos-item + .lh-logos-item::before {
          content: '';
          width: 1px;
          height: 18px;
          background: ${RULE};
          margin-right: clamp(20px, 3.5vw, 44px);
        }
        .lh-logos-item :global(img) {
          height: auto;
          filter: grayscale(1);
          opacity: 0.72;
          transition: filter 0.3s ease, opacity 0.3s ease;
        }
        .lh-logos-item:hover :global(img) {
          filter: grayscale(0);
          opacity: 1;
        }
        .lh-logos-word {
          font-family: ${SERIF};
          font-size: clamp(1.05rem, 1.6vw, 1.3rem);
          letter-spacing: 0.02em;
          color: ${INK};
          white-space: nowrap;
        }

        @media (max-width: ${BP.md}) {
          :global(.lh-logos-inner) {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
        }
      `}</style>
    </section>
  );
};

export default LogoWall;
