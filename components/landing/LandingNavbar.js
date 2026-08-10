import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiMenu, FiX } from 'react-icons/fi';
import { PAPER, INK, INK_2, RULE, GOLD, GOLD_DEEP, SANS, MAXW, GUTTER, BP } from './theme';

const LandingNavbar = ({ content, logo, onBookDemo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // The bar sits on paper the whole way down; scrolling only earns it a
  // hairline and a blur. The previous build swapped to navy and rendered the
  // white logo on a white bar, which left the logo invisible on first paint.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 8);
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className={`lh-nav ${isScrolled ? 'lh-nav-stuck' : ''}`}>
      <div className="lh-nav-inner">
        <a href="#lh-hero" className="lh-nav-logo" onClick={closeMenu}>
          <Image src={logo.logoLight} alt={logo.logoAlt} width={132} height={30} priority />
        </a>

        <nav className={`lh-nav-links ${isOpen ? 'lh-nav-links-open' : ''}`}>
          {content.items.map((item) => (
            <a key={item.href} href={item.href} className="lh-nav-link" onClick={closeMenu}>
              {item.label}
            </a>
          ))}

          <div className="lh-nav-actions">
            <Link href={content.loginHref} className="lh-nav-login" onClick={closeMenu}>
              {content.loginLabel}
            </Link>
            <button
              type="button"
              className="lh-nav-demo"
              onClick={() => {
                closeMenu();
                onBookDemo();
              }}
            >
              {content.demoLabel}
            </button>
          </div>
        </nav>

        <button
          type="button"
          className="lh-nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      <style jsx>{`
        .lh-nav {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: ${PAPER};
          border-bottom: 1px solid transparent;
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .lh-nav-stuck {
          border-bottom-color: ${RULE};
          background: rgba(11, 31, 58, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .lh-nav-inner {
          max-width: ${MAXW};
          margin: 0 auto;
          padding: 18px ${GUTTER};
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .lh-nav-logo {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .lh-nav-logo :global(img) {
          height: auto;
        }
        .lh-nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .lh-nav-link {
          font-family: ${SANS};
          font-size: 0.88rem;
          color: ${INK_2};
          text-decoration: none;
          white-space: nowrap;
          padding-bottom: 2px;
          border-bottom: 1px solid transparent;
          transition: color 0.25s ease, border-color 0.25s ease;
        }
        .lh-nav-link:hover {
          color: ${INK};
          border-bottom-color: ${GOLD_DEEP};
        }
        .lh-nav-actions {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-left: 8px;
        }
        /* next/link renders its own <a>, which styled-jsx cannot scope-hash. */
        .lh-nav :global(.lh-nav-login) {
          font-family: ${SANS};
          font-size: 0.88rem;
          color: ${INK_2};
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.25s ease;
        }
        .lh-nav :global(.lh-nav-login:hover) {
          color: ${GOLD_DEEP};
        }
        .lh-nav-demo {
          font-family: ${SANS};
          background: ${GOLD};
          color: ${PAPER};
          border: none;
          border-radius: 2px;
          padding: 11px 22px;
          font-weight: 500;
          font-size: 0.86rem;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.25s ease;
        }
        .lh-nav-demo:hover {
          background: ${GOLD_DEEP};
        }
        .lh-nav-toggle {
          display: none;
          background: none;
          border: none;
          color: ${INK};
          padding: 4px;
          cursor: pointer;
        }

        @media (max-width: ${BP.lg}) {
          .lh-nav-toggle {
            display: inline-flex;
          }
          .lh-nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: ${PAPER};
            border-bottom: 1px solid ${RULE};
            flex-direction: column;
            align-items: flex-start;
            gap: 0;
            padding: 0 ${GUTTER};
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.3s ease, opacity 0.25s ease, padding 0.3s ease;
          }
          .lh-nav-links-open {
            max-height: 420px;
            opacity: 1;
            padding: 8px ${GUTTER} 24px;
          }
          .lh-nav-link {
            width: 100%;
            padding: 14px 0;
            border-bottom: 1px solid ${RULE};
          }
          .lh-nav-link:hover {
            border-bottom-color: ${RULE};
          }
          .lh-nav-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin: 18px 0 0;
          }
          .lh-nav-demo {
            width: 100%;
            padding: 13px 22px;
          }
        }
      `}</style>
    </header>
  );
};

export default LandingNavbar;
