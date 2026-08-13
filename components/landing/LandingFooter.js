import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { INK, PAPER_DEEP, GOLD, GOLD_DEEP, SANS, MAXW, GUTTER, BP } from './theme';

const LandingFooter = ({ content, logo, onLogin, onRegister }) => {
  const year = new Date().getFullYear();
  const { email, phone } = content.contact || {};

  return (
    <footer className="lh-footer">
      <div className="lh-footer-inner">
        <div className="lh-footer-top">
          <div className="lh-footer-brand">
            {/* The white mark is correct here — this is the one dark surface. */}
            <Image src={logo.logoLight} alt={logo.logoAlt} width={132} height={30} />
            <p className="lh-footer-tagline">{content.tagline}</p>
            <div className="lh-footer-contact">
              {email && (
                <a href={`mailto:${email}`} className="lh-footer-contact-item">
                  {email}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="lh-footer-contact-item">
                  {phone}
                </a>
              )}
            </div>
          </div>

          <div className="lh-footer-columns">
            {content.columns.map((col) => (
              <div key={col.heading} className="lh-footer-col">
                <h4 className="lh-footer-col-heading">{col.heading}</h4>
                <ul className="lh-footer-col-links">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.action === 'login' || link.action === 'register' ? (
                        // Opens the modal in place — neither has a route.
                        <button
                          type="button"
                          className="lh-footer-linkbtn"
                          onClick={link.action === 'register' ? onRegister : onLogin}
                        >
                          {link.label}
                        </button>
                      ) : link.href.startsWith('mailto:') ? (
                        <a className="lh-footer-link" href={link.href}>
                          {link.label}
                        </a>
                      ) : (
                        <Link className="lh-footer-link" href={link.href}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {(content.trust || content.legal) && (
          <div className="lh-footer-assure">
            {content.trust && (
              <div className="lh-footer-trust">
                <h4 className="lh-footer-col-heading">{content.trust.heading}</h4>
                <ul className="lh-badge-row">
                  {content.trust.badges.map((badge) => (
                    <li key={badge.label} className={`lh-badge lh-badge-${badge.tone}`}>
                      {badge.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {content.legal && (
              <div className="lh-footer-legal">
                <h4 className="lh-footer-col-heading">{content.legal.heading}</h4>
                <ul className="lh-legal-row">
                  {content.legal.links.map((link) => (
                    <li key={link.label}>
                      <a
                        className="lh-footer-link"
                        href={link.href}
                        {...(link.href.startsWith('http')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="lh-footer-bottom">
          {content.madeIn && (
            <span className="lh-footer-made">
              <span aria-hidden="true">🇮🇳</span> {content.madeIn}
            </span>
          )}
          {/* No trailing period in the template: the legal entity name already
              ends in one ("Pvt. Ltd."), which produced "Ltd.." */}
          <span>
            © {year} {content.copyrightName} All rights reserved.
          </span>
        </div>
      </div>

      <style jsx>{`
        .lh-footer {
          background: ${PAPER_DEEP};
          padding: clamp(64px, 8vw, 96px) ${GUTTER} 32px;
        }
        .lh-footer-inner {
          max-width: ${MAXW};
          margin: 0 auto;
        }
        .lh-footer-top {
          display: flex;
          justify-content: space-between;
          gap: clamp(40px, 8vw, 96px);
          padding-bottom: 48px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        }
        .lh-footer-brand {
          max-width: 34ch;
        }
        .lh-footer-brand :global(img) {
          height: auto;
        }
        .lh-footer-tagline {
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.62);
          font-size: 0.9rem;
          line-height: 1.65;
          margin: 22px 0 24px;
        }
        .lh-footer-contact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lh-footer-contact-item {
          font-family: ${SANS};
          color: ${INK};
          font-size: 0.9rem;
          text-decoration: none;
          width: fit-content;
          padding-bottom: 2px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          transition: border-color 0.25s ease;
        }
        .lh-footer-contact-item:hover {
          border-bottom-color: ${GOLD};
        }
        .lh-footer-columns {
          display: flex;
          gap: clamp(40px, 7vw, 80px);
          flex-wrap: wrap;
        }
        .lh-footer-col-heading {
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
          font-size: 0.7rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin: 0 0 20px;
        }
        .lh-footer-col-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lh-footer-linkbtn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }
        /* Fully global rather than scoped under .lh-footer: next/link renders
           its own <a> outside this component's scope chain, so a scoped
           ancestor makes the rule fail to match and Bootstrap's bare anchor
           rule wins (blue, underlined, Poppins). The lh- prefix keeps this
           collision-safe. Note: no backticks in here — they terminate the
           style-jsx template literal and 500 the page. */
        /* Declared as its OWN rule, never comma-joined with a scoped selector:
           styled-jsx drops the :global() half of a mixed list, which left these
           anchors unstyled and Bootstrap's bare anchor rule won (blue,
           underlined, Poppins). next/link renders its own <a>, so :global is
           required here. No backticks in this comment — they terminate the
           style-jsx template literal and 500 the page. */
        :global(.lh-footer-link) {
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.25s ease;
        }
        :global(.lh-footer-link:hover) {
          color: ${INK};
        }
        .lh-footer-linkbtn {
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.25s ease;
        }
        .lh-footer-linkbtn:hover {
          color: ${INK};
        }
        /* Assurance tier: trust badges left, legal links right, on its own
           hairline-separated row above the copyright. */
        .lh-footer-assure {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(28px, 4vw, 56px);
          margin-top: 40px;
          padding-top: 36px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
        }
        .lh-badge-row,
        .lh-legal-row {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }
        .lh-badge-row {
          gap: 10px;
        }
        .lh-legal-row {
          gap: 10px 22px;
        }
        /* Muted tints rather than the saturated fills of the other site: on
           navy those read as loud, and they would fight the gold accent. */
        .lh-badge {
          font-family: ${SANS};
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding: 5px 11px;
          border-radius: 999px;
          border: 1px solid;
          white-space: nowrap;
        }
        .lh-badge-green {
          background: rgba(63, 174, 128, 0.12);
          border-color: rgba(63, 174, 128, 0.45);
          color: #7FD4AE;
        }
        .lh-badge-amber {
          background: rgba(201, 162, 39, 0.14);
          border-color: rgba(201, 162, 39, 0.5);
          color: ${GOLD_DEEP};
        }
        .lh-badge-blue {
          background: rgba(96, 152, 214, 0.14);
          border-color: rgba(96, 152, 214, 0.45);
          color: #9CC2E8;
        }
        .lh-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px 24px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.45);
          font-size: 0.8rem;
        }

        .lh-footer-made {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: ${BP.md}) {
          .lh-footer-assure {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .lh-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
          .lh-footer-top {
            flex-direction: column;
            gap: 44px;
          }
          .lh-footer-brand {
            max-width: 100%;
          }
        }
      `}</style>
    </footer>
  );
};

export default LandingFooter;
