import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/router';

const DropdownMenu = ({ label, options, href, onAction }) => {
  const [open, setOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef();
  const nestedTimeoutRef = useRef();

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
      timeoutRef.current = setTimeout(() => {
        setOpen(false);
        setNestedOpen(null);
      }, 150);
    }
  };

  const handleClick = () => {
    if (isMobile) setOpen((prev) => !prev);
  };

  const router = useRouter();

  const handleMainLabelClick = (e) => {
    if (href) {
      e.stopPropagation();
      router.push(href);
    }
  };

  const handleOptionClick = (e, option) => {
    e.preventDefault();
    
    if (option.action === 'book-call' && onAction) {
      onAction('open-auth-modal');
    } else if (option.action === 'buyer-pricing') {
      router.push('/pricing?tab=buyer');
    } else if (option.action === 'supplier-pricing') {
      router.push('/pricing?tab=supplier');
    } else if (option.href && option.href !== 'javascript:void(0)') {
      router.push(option.href);
    }
  };

  const handleNestedMouseEnter = (index) => {
    if (!isMobile) {
      clearTimeout(nestedTimeoutRef.current);
      setNestedOpen(index);
    }
  };

  const handleNestedMouseLeave = () => {
    if (!isMobile) {
      nestedTimeoutRef.current = setTimeout(() => setNestedOpen(null), 150);
    }
  };

  return (
    <li
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: isMobile ? 'static' : 'relative' }}
    >
      <span
        onClick={href ? handleMainLabelClick : handleClick}
        style={{
          cursor: 'pointer',
          fontWeight: 500,
          color: isMobile ? '#fff !important' : 'inherit',
          textDecoration: 'none !important',
          padding: '8px 12px',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center'
        }}
        className="d-flex align-items-center flex-nowrap"
      >
        {href ? (
          <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
            {label}
          </Link>
        ) : (
          label
        )}
        <FontAwesomeIcon 
          icon={isMobile ? (open ? faChevronUp : faChevronDown) : faChevronDown} 
          className="ms-2" 
          style={{ fontSize: '0.8rem', opacity: 0.7, flexShrink: 0 }}
        />
      </span>

      <ul
        style={{
          ...(isMobile
            ? {
                padding: 0,
                margin: 0,
                display: open ? 'block' : 'none',
                listStyle: 'none',
                textAlign: 'left',
              }
            : {
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: 340, /* Increased by 100px */
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                borderRadius: 16,
                padding: '8px 0',
                margin: '8px 0 0 0',
                zIndex: 1000,
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transform: open ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                textAlign: 'left',
                alignItems: 'stretch',
              }),
        }}
      >
        {options.map((opt, index) => (
          <li key={opt.href || index} style={{ 
            listStyle: 'none', 
            position: 'relative',
            textAlign: 'left',
            width: '100%'
          }}>
            {opt.type === 'nested-dropdown' ? (
              // Nested dropdown item
              <div
                onMouseEnter={(e) => {
                  handleNestedMouseEnter(index);
                  e.currentTarget.style.color = 'var(--secondary-color)';
                  e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  handleNestedMouseLeave();
                  e.currentTarget.style.color = '#333';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  borderRadius: '8px',
                  margin: '0',
                  color: '#333',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  lineHeight: '1.4',
                  width: '100%',
                }}
              >
                <span style={{ 
                  textAlign: 'left', 
                  flex: '1', 
                  paddingRight: '12px',
                  display: 'block',
                  width: '100%'
                }}>{opt.label}</span>
                <FontAwesomeIcon 
                  icon={faChevronRight} 
                  size="sm" 
                  style={{ 
                    opacity: 0.6, 
                    flexShrink: 0,
                    marginLeft: 'auto'
                  }} 
                />
                
                {/* Nested dropdown */}
                {nestedOpen === index && (
                  <ul
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: 0,
                      minWidth: 300, /* Increased by 100px */
                      background: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      borderRadius: 16,
                      padding: '8px 0',
                      margin: '0 0 0 8px',
                      zIndex: 1001,
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      animation: 'slideInRight 0.2s ease-out',
                    }}
                  >
                    {opt.options.map((nestedOpt, nestedIndex) => (
                      <li key={nestedOpt.href || nestedIndex} style={{ listStyle: 'none' }}>
                        <a
                          href={nestedOpt.href}
                          onClick={(e) => handleOptionClick(e, nestedOpt)}
                          style={{
                            display: 'block',
                            padding: '12px 20px',
                            fontWeight: 500,
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            borderRadius: '8px',
                            margin: '0',
                            color: '#333',
                            fontSize: '0.9rem',
                            textAlign: 'left',
                            whiteSpace: 'normal',
                            lineHeight: '1.4',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = 'var(--secondary-color)';
                            e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = '#333';
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          {nestedOpt.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              // Regular dropdown item
              <a
                href={opt.href}
                onClick={(e) => handleOptionClick(e, opt)}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  borderRadius: '8px',
                  margin: '0',
                  color: '#333',
                  fontSize: '0.9rem', 
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  lineHeight: '1.4',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--secondary-color)';
                  e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#333';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {opt.label}
              </a>
            )}
          </li>
        ))}
      </ul>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </li>
  );
};

export default DropdownMenu;
