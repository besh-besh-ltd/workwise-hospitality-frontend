import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { INK, PAPER, GOLD, SANS, MAXW, GUTTER, BP } from './theme';

const LandingFooter = ({ content, logo }) => {
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
                      {link.href.startsWith('mailto:') ? (
                        <a href={link.href}>{link.label}</a>
                      ) : (
                        <Link href={link.href}>{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="lh-footer-bottom">
          <span>
            © {year} {content.copyrightName}. All rights reserved.
          </span>
        </div>
      </div>

      <style jsx>{`
        .lh-footer {
          background: ${INK};
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
          color: ${PAPER};
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
        .lh-footer-col-links :global(a) {
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.9rem;
          text-decoration: none;
          transition: color 0.25s ease;
        }
        .lh-footer-col-links :global(a:hover) {
          color: ${PAPER};
        }
        .lh-footer-bottom {
          padding-top: 24px;
          font-family: ${SANS};
          color: rgba(255, 255, 255, 0.45);
          font-size: 0.8rem;
        }

        @media (max-width: ${BP.md}) {
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
