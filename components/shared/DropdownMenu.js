import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

const DropdownMenu = ({ label, options }) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseEnter = () => {
    if (!isMobile) {
      clearTimeout(timeoutRef.current);
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      timeoutRef.current = setTimeout(() => setOpen(false), 150);
    }
  };

  const handleClick = () => {
    if (isMobile) setOpen((prev) => !prev);
  };

  return (
    <li
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: isMobile ? 'static' : 'relative' }}
    >
      <span
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          fontWeight: 600,
          color: isMobile ? '#fff' : '#222',
          textDecoration: 'none !important',
        }}
        className="d-flex align-items-center"
      >
        {label}
        {isMobile && (
          <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="ms-2" />
        )}
      </span>

      <ul
        style={{
          ...(isMobile
            ? {
                padding: 0,
                margin: 0,
                display: open ? 'block' : 'none',
                listStyle: 'none',
              }
            : {
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: 180,
                background: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                borderRadius: 8,
                padding: 0,
                margin: 0,
                zIndex: 1000,
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transform: open ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
              }),
        }}
      >
        {options.map((opt) => (
          <li key={opt.href} style={{ listStyle: 'none' }}>
            <Link href={opt.href} legacyBehavior>
 <a
                className="navbar-dropdown-link"
                style={{
                  display: 'block',
                  padding: '10px 0px 0px 0px', // more bottom padding for underline
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background 0.15s',
                  borderRadius: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  // e.currentTarget.querySelector('.dropdown-underline').style.width = '100%';
                  // e.currentTarget.style.background = '#f5f7fa';
                  e.currentTarget.style.color = 'var(--secondary-color)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.querySelector('.dropdown-underline').style.width = '0';
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.color = '#222';
                }}
              >
                <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                  {opt.label}
                  <span
                    className="dropdown-underline"
                    style={{
                      display: 'block',
                      height: 5, // thicker underline
                      background: 'var(--secondary-color)',
                      width: 0,
                      margin: '10px 0 0 0', // more space below text
                      transition: 'width 0.18s cubic-bezier(.4,0,.2,1)',
                      borderRadius: 3,
                    }}
                  />
                </span>
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
};

export default DropdownMenu;
