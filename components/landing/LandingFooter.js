import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiMail, FiPhone } from 'react-icons/fi';
import { NAVY_DARK, GOLD } from './theme';

const LandingFooter = ({ content, logo }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="lh-footer">
      <div className="lh-footer-inner">
        <div className="lh-footer-top">
          <div className="lh-footer-brand">
            <Image src={logo.logoLight} alt={logo.logoAlt} width={140} height={32} />
            <p className="lh-footer-tagline">{content.tagline}</p>
            <div className="lh-footer-contact">
              <a href={`mailto:${content.contact.email}`} className="lh-footer-contact-item">
                <FiMail size={15} /> {content.contact.email}
              </a>
              <a href={`tel:${content.contact.phone}`} className="lh-footer-contact-item">
                <FiPhone size={15} /> {content.contact.phone}
              </a>
            </div>
          </div>

          <div className="lh-footer-columns">
            {content.columns.map((col) => (
              <div key={col.heading} className="lh-footer-col">
                <h4 className="lh-footer-col-heading">{col.heading}</h4>
                <ul className="lh-footer-col-links">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="lh-footer-bottom">
          © {year} {content.copyrightName}. All rights reserved.
        </div>
      </div>

      <style jsx>{`
        .lh-footer {
          background: ${NAVY_DARK};
          padding: 56px 20px 24px;
        }
        .lh-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .lh-footer-top {
          display: flex;
          justify-content: space-between;
          gap: 48px;
          padding-bottom: 36px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }
        .lh-footer-brand {
          max-width: 320px;
        }
        .lh-footer-brand :global(img) {
          height: auto;
        }
        .lh-footer-tagline {
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 16px 0 20px;
        }
        .lh-footer-contact {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lh-footer-contact-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.88rem;
          text-decoration: none;
        }
        .lh-footer-contact-item:hover {
          color: ${GOLD};
        }
        .lh-footer-columns {
          display: flex;
          gap: 48px;
          flex-wrap: wrap;
        }
        .lh-footer-col-heading {
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          margin-bottom: 16px;
        }
        .lh-footer-col-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lh-footer-col-links :global(a) {
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.88rem;
          text-decoration: none;
        }
        .lh-footer-col-links :global(a:hover) {
          color: ${GOLD};
        }
        .lh-footer-bottom {
          padding-top: 20px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.82rem;
          text-align: center;
        }

        @media (max-width: 767px) {
          .lh-footer-top {
            flex-direction: column;
            gap: 32px;
          }
          .lh-footer-brand {
            max-width: 100%;
          }
          .lh-footer-columns {
            gap: 32px;
          }
        }
      `}</style>
    </footer>
  );
};

export default LandingFooter;
