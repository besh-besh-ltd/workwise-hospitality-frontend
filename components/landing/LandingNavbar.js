import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiMenu, FiX } from 'react-icons/fi';
import { NAVY, GOLD } from './theme';

const LandingNavbar = ({ content, logo, onBookDemo }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const headerRef = useRef(null);

  // Flip the bar to its navy treatment once the hero has scrolled fully behind
  // it. The negative top rootMargin pulls the observation line down to the
  // navbar's own bottom edge, so the switch lands exactly as the hero clears it.
  useEffect(() => {
    const heroEl = document.getElementById('lh-hero');
    const headerEl = headerRef.current;
    if (!heroEl || !headerEl) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsPastHero(!entry.isIntersecting),
      { rootMargin: `-${headerEl.offsetHeight}px 0px 0px 0px`, threshold: 0 }
    );
    observer.observe(heroEl);

    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <header ref={headerRef} className={`lh-nav-header ${isPastHero ? 'lh-nav-header-dark' : ''}`}>
      <div className="lh-nav-inner">
        <a href="#lh-hero" className="lh-nav-logo" onClick={closeMenu}>
          <Image src={logo.logoLight} alt={logo.logoAlt} width={140} height={32} priority />
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
              className="lh-nav-demo-btn"
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
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <style jsx>{`
        .lh-nav-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #ffffff;
          box-shadow: 0 1px 12px rgba(0, 0, 0, 0.06);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .lh-nav-header-dark {
          background: ${NAVY};
          box-shadow: 0 1px 16px rgba(0, 0, 0, 0.25);
        }
        .lh-nav-inner {
          max-width: 1600px;
          margin: 0 auto;
          padding: 14px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          gap: 28px;
        }
        .lh-nav-link {
          color: var(--dark-color);
          font-weight: 500;
          font-size: 0.95rem;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.3s ease;
        }
        .lh-nav-link:hover {
          color: ${NAVY};
        }
        .lh-nav-header-dark .lh-nav-link {
          color: #ffffff;
        }
        .lh-nav-header-dark .lh-nav-link:hover {
          color: ${GOLD};
        }
        .lh-nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-left: 8px;
        }
        /* Login is a next/link child component, so styled-jsx can't inject its
           scope hash onto the rendered <a> — these must be :global() to match. */
        .lh-nav-header :global(.lh-nav-login) {
          color: var(--dark-color);
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.3s ease;
        }
        .lh-nav-header :global(.lh-nav-login:hover) {
          color: ${NAVY};
        }
        .lh-nav-header-dark :global(.lh-nav-login) {
          color: #ffffff;
        }
        .lh-nav-header-dark :global(.lh-nav-login:hover) {
          color: ${GOLD};
        }
        .lh-nav-demo-btn {
          background: ${GOLD};
          color: ${NAVY};
          border: none;
          border-radius: 999px;
          padding: 10px 22px;
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
          cursor: pointer;
          transition: opacity 0.2s ease, background 0.3s ease, color 0.3s ease;
        }
        .lh-nav-demo-btn:hover {
          opacity: 0.9;
        }
        .lh-nav-header-dark .lh-nav-demo-btn {
          background: #ffffff;
          color: ${NAVY};
        }
        .lh-nav-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--dark-color);
          padding: 4px;
          cursor: pointer;
          transition: color 0.3s ease;
        }
        .lh-nav-header-dark .lh-nav-toggle {
          color: #ffffff;
        }

        @media (max-width: 991px) {
          .lh-nav-inner {
            padding: 14px 20px;
          }
          .lh-nav-toggle {
            display: inline-flex;
          }
          .lh-nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #ffffff;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
            padding: 8px 20px 20px;
            box-shadow: 0 12px 20px rgba(0, 0, 0, 0.08);
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.25s ease, opacity 0.2s ease;
          }
          .lh-nav-links-open {
            max-height: 480px;
            opacity: 1;
          }
          .lh-nav-header-dark .lh-nav-links {
            background: ${NAVY};
          }
          .lh-nav-link {
            width: 100%;
            padding: 10px 0;
            border-bottom: 1px solid var(--light-grey-color, #f3f3f3);
          }
          .lh-nav-header-dark .lh-nav-link {
            border-bottom-color: rgba(255, 255, 255, 0.14);
          }
          .lh-nav-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            margin-left: 0;
            margin-top: 10px;
          }
          .lh-nav-header :global(.lh-nav-login) {
            padding: 8px 0;
          }
          .lh-nav-demo-btn {
            width: 100%;
            padding: 12px 22px;
          }
        }
      `}</style>
    </header>
  );
};

export default LandingNavbar;
