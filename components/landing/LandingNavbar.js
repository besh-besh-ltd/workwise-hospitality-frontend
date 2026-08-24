import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { FiMenu, FiX, FiChevronDown } from 'react-icons/fi';
import useMediaQuery from './useMediaQuery';
import { PAPER, INK, INK_2, RULE, GOLD, GOLD_DEEP, GOLD_WASH, SANS, MAXW, GUTTER, BP } from './theme';

const LandingNavbar = ({ content, logo, onBookDemo, onLogin, onRegister }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const isDesktop = useMediaQuery(`(min-width: ${BP.lg})`);

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

  // Escape closes an open submenu before it closes anything else.
  useEffect(() => {
    if (!openMenu) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenu]);

  const closeMenu = () => {
    setIsOpen(false);
    setOpenMenu(null);
  };

  return (
    <header className={`lh-nav ${isScrolled ? 'lh-nav-stuck' : ''}`}>
      <div className="lh-nav-inner">
        <a href="#lh-hero" className="lh-nav-logo" onClick={closeMenu}>
          <Image src={logo.logo} alt={logo.logoAlt} width={158} height={36} priority />
        </a>

        <nav className={`lh-nav-links ${isOpen ? 'lh-nav-links-open' : ''}`}>
          {content.items.map((item) =>
            item.children?.length ? (
              // Hover opens it on desktop; on touch the caret toggles an
              // in-place accordion, since hover never fires there.
              <span
                key={item.label}
                className={`lh-nav-item ${openMenu === item.label ? 'lh-nav-item-open' : ''}`}
                // Desktop only. On touch a tap fires mouseenter first, which
                // would open the menu and let the caret's toggle immediately
                // close it again.
                onMouseEnter={isDesktop ? () => setOpenMenu(item.label) : undefined}
                onMouseLeave={isDesktop ? () => setOpenMenu(null) : undefined}
              >
                <a
                  href={item.href}
                  className="lh-nav-link lh-nav-link-parent"
                  onClick={closeMenu}
                  onFocus={isDesktop ? () => setOpenMenu(item.label) : undefined}
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.label}
                >
                  {item.label}
                  <FiChevronDown size={14} aria-hidden="true" />
                </a>

                <button
                  type="button"
                  className="lh-nav-caret"
                  aria-label={`Toggle ${item.label} submenu`}
                  aria-expanded={openMenu === item.label}
                  onClick={() => setOpenMenu((prev) => (prev === item.label ? null : item.label))}
                >
                  <FiChevronDown size={16} />
                </button>

                <span className="lh-nav-sub">
                  {item.children.map((child) => (
                    <a
                      key={child.label}
                      href={child.href}
                      className="lh-nav-sublink"
                      onClick={() => {
                        setOpenMenu(null);
                        closeMenu();
                      }}
                    >
                      {child.label}
                    </a>
                  ))}
                </span>
              </span>
            ) : (
              <a key={item.label} href={item.href} className="lh-nav-link" onClick={closeMenu}>
                {item.label}
              </a>
            )
          )}

          <div className="lh-nav-actions">
            <button
              type="button"
              className="lh-nav-login"
              onClick={() => {
                closeMenu();
                onLogin();
              }}
            >
              {content.loginLabel}
            </button>
            <button
              type="button"
              className="lh-nav-register"
              onClick={() => {
                closeMenu();
                onRegister();
              }}
            >
              {content.registerLabel}
            </button>
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
        .lh-nav-item {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .lh-nav-link-parent {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .lh-nav-link-parent :global(svg) {
          transition: transform 0.25s ease;
        }
        .lh-nav-item-open .lh-nav-link-parent :global(svg) {
          transform: rotate(180deg);
        }
        /* The caret button is the touch affordance; on desktop hover already
           opens the menu, so it stays out of the layout. */
        .lh-nav-caret {
          display: none;
          background: none;
          border: none;
          color: ${INK_2};
          padding: 4px;
          cursor: pointer;
        }
        .lh-nav-sub {
          position: absolute;
          top: 100%;
          left: -18px;
          display: flex;
          flex-direction: column;
          min-width: 268px;
          margin-top: 14px;
          padding: 8px;
          background: ${PAPER};
          border: 1px solid ${RULE};
          box-shadow: 0 24px 48px -24px rgba(0, 0, 0, 0.6);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-6px);
          transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
        }
        /* Bridges the 14px gap so the pointer can travel from link to panel. */
        .lh-nav-sub::before {
          content: '';
          position: absolute;
          top: -14px;
          left: 0;
          right: 0;
          height: 14px;
        }
        .lh-nav-item-open .lh-nav-sub {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .lh-nav-sublink {
          font-family: ${SANS};
          font-size: 0.85rem;
          color: ${INK_2};
          text-decoration: none;
          padding: 10px 12px;
          border-left: 2px solid transparent;
          transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .lh-nav-sublink:hover {
          color: ${INK};
          background: rgba(255, 255, 255, 0.04);
          border-left-color: ${GOLD};
        }
        .lh-nav-actions {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-left: 8px;
        }
        .lh-nav-login {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: ${SANS};
          font-size: 0.88rem;
          color: ${INK_2};
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.25s ease;
        }
        .lh-nav-login:hover {
          color: ${GOLD_DEEP};
        }
        /* Outlined gold: secondary to the solid Book-a-demo button. */
        .lh-nav-register {
          font-family: ${SANS};
          background: none;
          color: ${GOLD_DEEP};
          border: 1px solid ${GOLD}66;
          border-radius: 2px;
          padding: 10px 18px;
          font-weight: 500;
          font-size: 0.86rem;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.25s ease, border-color 0.25s ease;
        }
        .lh-nav-register:hover {
          background: ${GOLD_WASH};
          border-color: ${GOLD};
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
            /* Raised from 420px: the submenu adds four more rows and the old
               cap clipped them. Generous, since it only bounds the animation. */
            max-height: 760px;
            opacity: 1;
            padding: 8px ${GUTTER} 24px;
            overflow-y: auto;
          }
          .lh-nav-link {
            width: 100%;
            padding: 14px 0;
            border-bottom: 1px solid ${RULE};
          }
          .lh-nav-link:hover {
            border-bottom-color: ${RULE};
          }
          /* Accordion below lg: hover never fires on touch, so the caret drives
             it and the panel takes flow space instead of floating. */
          .lh-nav-item {
            width: 100%;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .lh-nav-link-parent {
            width: auto;
            flex: 1;
          }
          .lh-nav-link-parent :global(svg) {
            display: none;
          }
          .lh-nav-caret {
            display: inline-flex;
            align-items: center;
            align-self: stretch;
            border-bottom: 1px solid ${RULE};
          }
          .lh-nav-item-open .lh-nav-caret :global(svg) {
            transform: rotate(180deg);
          }
          .lh-nav-caret :global(svg) {
            transition: transform 0.25s ease;
          }
          .lh-nav-sub {
            position: static;
            width: 100%;
            min-width: 0;
            margin: 0;
            padding: 0 0 0 12px;
            background: none;
            border: none;
            border-left: 1px solid ${RULE};
            box-shadow: none;
            display: none;
            transform: none;
          }
          .lh-nav-sub::before {
            display: none;
          }
          .lh-nav-item-open .lh-nav-sub {
            display: flex;
          }
          .lh-nav-sublink {
            padding: 12px 10px;
          }
          .lh-nav-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin: 18px 0 0;
          }
          .lh-nav-demo,
          .lh-nav-register {
            width: 100%;
            padding: 13px 22px;
          }
        }
      `}</style>
    </header>
  );
};

export default LandingNavbar;
