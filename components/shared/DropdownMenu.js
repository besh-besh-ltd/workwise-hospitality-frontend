import React, { useState, useRef } from 'react';
import Link from 'next/link';

const DropdownMenu = ({ label, options }) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef();

  // Show dropdown on hover
  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  // Hide dropdown with slight delay for smooth UX
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <li
      className="navbar-dropdown-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      <span className="navbar-link" style={{ cursor: 'pointer', fontWeight: 600 }}>{label}</span>
      <ul
        className={`navbar-dropdown${open ? ' show' : ''}`}
        style={{
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
          transform: open ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.18s cubic-bezier(.4,0,.2,1), transform 0.18s cubic-bezier(.4,0,.2,1)',
          display: 'flex',
          flexDirection: 'column',       
        }}
      >
        {options.map(opt => (
          <li key={opt.href} style={{ listStyle: 'none' }}>
            <Link href={opt.href} legacyBehavior>
              <a className="navbar-dropdown-link" style={{
                display: 'block',
                padding: '10px 20px',
                color: '#222',
                padding: '10px 20px 6px 20px',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background 0.15s',
                borderRadius: 0
              }}>
                {opt.label}
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
};

export default DropdownMenu;
