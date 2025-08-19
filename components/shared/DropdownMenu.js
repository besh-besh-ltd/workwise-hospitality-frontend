import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/router';

// Global dropdown state manager to prevent overlapping issues
const dropdownManager = {
  activeDropdown: null,
  listeners: new Set(),
  
  setActive(dropdownId) {
    if (this.activeDropdown !== dropdownId) {
      // Close previous dropdown if different
      if (this.activeDropdown) {
        this.listeners.forEach(listener => {
          if (listener.id !== dropdownId) {
            listener.close();
          }
        });
      }
      this.activeDropdown = dropdownId;
    }
  },
  
  clearActive() {
    this.activeDropdown = null;
  },
  
  register(listener) {
    this.listeners.add(listener);
  },
  
  unregister(listener) {
    this.listeners.delete(listener);
  }
};

const DropdownMenu = ({ label, options, href, onAction }) => {
  const [open, setOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringRef = useRef(false);
  const timeoutRef = useRef();
  const nestedTimeoutRef = useRef();
  const dropdownRef = useRef();
  const triggerRef = useRef();
  const dropdownId = useRef(`${label}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Register with dropdown manager
  useEffect(() => {
    const listener = {
      id: dropdownId.current,
      close: () => {
        setOpen(false);
        setNestedOpen(null);
      }
    };
    
    dropdownManager.register(listener);
    return () => dropdownManager.unregister(listener);
  }, []);

  const handleMouseEnter = (e) => {
    if (!isMobile) {
      clearTimeout(timeoutRef.current);
      setIsHovering(true);
      
      // Only open if mouse is actually on the trigger element
      if (e.currentTarget === triggerRef.current) {
        // Small delay to prevent accidental opening
        timeoutRef.current = setTimeout(() => {
          dropdownManager.setActive(dropdownId.current);
      setOpen(true);
        }, 50);
      }
    }
  };

  const handleMouseLeave = (e) => {
    if (!isMobile && e) {
      try {
        setIsHovering(false);
        
        // Check if mouse is leaving the entire dropdown area (trigger + dropdown)
        const relatedTarget = e?.relatedTarget;
        
        // Simple approach: check if moving within our own dropdown system
        const isMovingWithinDropdown = relatedTarget && (
          dropdownRef.current?.contains(relatedTarget) || 
          triggerRef.current?.contains(relatedTarget)
        );
        
        // If moving within our dropdown system, don't close
        if (isMovingWithinDropdown) {
          return;
        }

        // Also check if moving to any element with dropdown-related classes
        let isMovingToDropdownElement = false;
        if (relatedTarget && relatedTarget.classList && typeof relatedTarget.classList.contains === 'function') {
          try {
            isMovingToDropdownElement = 
              relatedTarget.classList.contains('dropdown-menu') ||
              relatedTarget.classList.contains('dropdown-trigger') ||
              relatedTarget.hasAttribute('data-dropdown');
          } catch (error) {
            // If there's an error accessing classList, assume it's not a dropdown element
            isMovingToDropdownElement = false;
          }
        }
        
        if (isMovingToDropdownElement) {
          return;
        }

        // Close the dropdown after a delay
        timeoutRef.current = setTimeout(() => {
          if (!isHoveringRef.current) {
            setOpen(false);
            setNestedOpen(null);
            dropdownManager.clearActive();
          }
        }, 150);
      } catch (error) {
        // If any error occurs, just close the dropdown safely
        console.warn('Error in handleMouseLeave:', error);
        setOpen(false);
        setNestedOpen(null);
        dropdownManager.clearActive();
      }
    }
  };

  const handleDropdownMouseEnter = () => {
    if (!isMobile) {
      clearTimeout(timeoutRef.current);
      setIsHovering(true);
      isHoveringRef.current = true;
      dropdownManager.setActive(dropdownId.current);
    }
  };

  const handleDropdownMouseLeave = (e) => {
    if (!isMobile) {
      setIsHovering(false);
      isHoveringRef.current = false;
      
      // Check if moving to another dropdown area
      const relatedTarget = e?.relatedTarget;
      
      // Simple approach: check if moving within our own dropdown system
      const isMovingWithinDropdown = relatedTarget && (
        dropdownRef.current?.contains(relatedTarget) || 
        triggerRef.current?.contains(relatedTarget)
      );
      
      if (isMovingWithinDropdown) {
        return;
      }

      // Also check if moving to any element with dropdown-related classes
      let isMovingToDropdownElement = false;
      if (relatedTarget && relatedTarget.classList && typeof relatedTarget.classList.contains === 'function') {
        try {
          isMovingToDropdownElement = 
            relatedTarget.classList.contains('dropdown-menu') ||
            relatedTarget.classList.contains('dropdown-trigger') ||
            relatedTarget.hasAttribute('data-dropdown');
        } catch (error) {
          // If there's an error accessing classList, assume it's not a dropdown element
          isMovingToDropdownElement = false;
        }
      }
      
      if (isMovingToDropdownElement) {
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (!isHoveringRef.current) {
          setOpen(false);
          setNestedOpen(null);
          dropdownManager.clearActive();
        }
      }, 150);
    }
  };

  // Add a small buffer zone around the dropdown to prevent accidental closing
  const handleDropdownMouseMove = (e) => {
    if (!isMobile && open) {
      clearTimeout(timeoutRef.current);
      setIsHovering(true);
      isHoveringRef.current = true;
      dropdownManager.setActive(dropdownId.current);
    }
  };

  // Handle mouse movement from trigger to dropdown content
  const handleTriggerMouseMove = (e) => {
    if (!isMobile && open) {
      clearTimeout(timeoutRef.current);
      setIsHovering(true);
      dropdownManager.setActive(dropdownId.current);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isMobile && open && 
          !triggerRef.current?.contains(event.target) && 
          !dropdownRef.current?.contains(event.target)) {
        setOpen(false);
        setNestedOpen(null);
        dropdownManager.clearActive();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, isMobile]);

  // Close dropdown when pressing Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        setNestedOpen(null);
        dropdownManager.clearActive();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  // Close dropdown when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!isMobile && open) {
        setOpen(false);
        setNestedOpen(null);
        dropdownManager.clearActive();
      }
    };

    if (open) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [open, isMobile]);

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

  const isInsightsUpcoming = (opt) => {
    if (!opt) return false;
    const labels = [
      'Procurement Guide for Project & Purchase Managers',
      'AI in Procurement – Use Cases',
      'Trends in EPC Procurement',
    ];
    return labels.includes(opt.label);
  };

  const handleNestedMouseEnter = (index) => {
      clearTimeout(nestedTimeoutRef.current);
      setNestedOpen(index);
  };

  const handleNestedMouseLeave = () => {
      nestedTimeoutRef.current = setTimeout(() => setNestedOpen(null), 100);
  };

  return (
    <li
      style={{ position: isMobile ? 'static' : 'relative' }}
      data-dropdown={label}
    >
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleTriggerMouseMove}
        onClick={href ? handleMainLabelClick : handleClick}
        style={{
          cursor: 'pointer',
          fontWeight: 500,
          color: isMobile ? '#fff' : 'inherit',
          textDecoration: 'none',
          padding: isMobile ? '16px 25px' : '8px 12px',
          borderRadius: isMobile ? 0 : '8px',
          transition: 'all 0.2s ease',
          whiteSpace: 'normal',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
          position: 'relative',
          zIndex: 1000,
          userSelect: 'none',
          outline: 'none',
          fontSize: isMobile ? '20px' : 'inherit',
          borderBottom: isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          width: isMobile ? '100%' : 'auto'
        }}
        className="d-flex align-items-center flex-nowrap dropdown-trigger"
        data-dropdown={label}
      >
        {href ? (
          <Link href={href} style={{ color: isMobile ? '#fff' : 'inherit', textDecoration: 'none' }}>
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
        ref={dropdownRef}
        onMouseEnter={handleDropdownMouseEnter}
        onMouseLeave={handleDropdownMouseLeave}
        onMouseMove={handleDropdownMouseMove}
        className="dropdown-menu"
        data-dropdown={label}
        style={{
          ...(isMobile
            ? {
                padding: 0,
                margin: 0,
                display: open ? 'block' : 'none',
                listStyle: 'none',
                textAlign: 'left',
                position: 'static',
                background: 'transparent',
                boxShadow: 'none',
                borderRadius: 0,
                border: 'none',
                width: '100%',
                zIndex: 'auto'
              }
            : {
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                minWidth: 340,
                background: 'transparent',
                backdropFilter: 'none',
                boxShadow: 'none',
                borderRadius: 16,
                padding: '8px 0',
                margin: 0,
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transform: open ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: open ? 'flex' : 'none',
                flexDirection: 'column',
                border: 'none',
                textAlign: 'left',
                alignItems: 'stretch',
                zIndex: 1001,
                maxHeight: '80vh',
                overflowY: 'auto',
                isolation: 'isolate'
              }),
        }}
      >
        {/* Only render dropdown content when open */}
        {open && (
          <>
            {/* CUSTOM WHO WE SERVE MEGA DROPDOWN: three-column layout; nested dropdown disabled */}
            {label === 'Who We Serve' && !isMobile ? (
              <li style={{ listStyle: 'none', width: '100%' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    padding: '12px 16px',
                    minWidth: 540,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', padding: '8px 8px', opacity: 0.9, color: '#333' }}>Stakeholders</div>
                    <a href="/who-we-serve/stakeholders/epcs" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/epcs'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>EPCs / Contractors</a>
                    <a href="/who-we-serve/stakeholders/turnkey" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/turnkey'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Turnkey Project Firms</a>
                    <a href="/who-we-serve/stakeholders/consultants" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/consultants'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Project Consultants</a>
                    <a href="/who-we-serve/stakeholders/industrial-clients" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/industrial-clients'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Industrial Clients</a>
                    <a href="/for-vendors" onClick={(e)=>handleOptionClick(e,{href:'/for-vendors'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Vendors & OEMs</a>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', padding: '8px 8px', opacity: 0.9, color: '#333' }}>Industries</div>
                    <a href="/who-we-serve/industries/power" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/power'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Power</a>
                    <a href="/who-we-serve/industries/energy" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/energy'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Energy</a>
                    <a href="/who-we-serve/industries/petrochemical" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/petrochemical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Petrochemical & Chemical</a>
                    <a href="/who-we-serve/industries/steel-cement" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/steel-cement'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Steel & Cement</a>
                    <a href="/who-we-serve/industries/infrastructure" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/infrastructure'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Infrastructure</a>
                    <a href="/who-we-serve/industries/heavy-equipment" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/heavy-equipment'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Heavy Engineering & Machine Tools</a>
                    <a href="/who-we-serve/industries/marine-mining" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/marine-mining'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Marine & Mining</a>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', padding: '8px 8px', opacity: 0.9, color: '#333' }}>Disciplines</div>
                    <a href="/solutions/electrical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/electrical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Electrical</a>
                    <a href="/solutions/mechanical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/mechanical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Mechanical</a>
                    <a href="/solutions/civil" onClick={(e)=>handleOptionClick(e,{href:'/solutions/civil'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Civil</a>
                    <a href="/solutions/hvac" onClick={(e)=>handleOptionClick(e,{href:'/solutions/hvac'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>HVAC</a>
                    <a href="/solutions/fire-engineering" onClick={(e)=>handleOptionClick(e,{href:'/solutions/fire-engineering'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Fire & Safety</a>
                    <a href="/solutions/chemical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/chemical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333', whiteSpace: 'normal', wordWrap: 'break-word'}}>Chemical</a>
                  </div>
                </div>
              </li>
            ) : (
              options.map((opt, index) => (
                <li key={opt.href || index} style={{ 
                  listStyle: 'none', 
                  position: 'relative',
                  textAlign: 'left',
                  width: '100%'
                }}>
                  {opt.type === 'nested-dropdown' ? (
                    // Nested dropdown item
                    <div 
                      onClick={() => {
                        if (isMobile) {
                          setNestedOpen(nestedOpen === index ? null : index);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) {
                        handleNestedMouseEnter(index);
                        e.currentTarget.style.color = 'var(--secondary-color)';
                        e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) {
                        handleNestedMouseLeave();
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                        }
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
                        color: '#fff',
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
                            position: isMobile ? 'static' : 'absolute',
                            left: isMobile ? 0 : 'calc(100% + 4px)',
                            top: isMobile ? 'auto' : 0,
                            minWidth: isMobile ? '100%' : 300,
                            background: 'transparent',
                            backdropFilter: 'none',
                            boxShadow: 'none',
                            borderRadius: isMobile ? 0 : 16,
                            padding: isMobile ? '0' : '8px 0',
                            margin: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            border: 'none',
                            animation: isMobile ? 'none' : 'slideInRight 0.2s ease-out',
                            isolation: 'isolate'
                          }}
                        >
                          {/* Nested dropdown header */}
                          <div style={{
                            padding: isMobile ? '12px 40px' : '12px 20px',
                            fontSize: isMobile ? '16px' : '0.85rem',
                            fontWeight: 600,
                            color: '#fff',
                            opacity: 0.9,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {opt.label} Options
                          </div>
                          
                          {opt.options.map((nestedOpt, nestedIndex) => (
                            <li key={nestedOpt.href || nestedIndex} style={{ listStyle: 'none' }}>
                              <a
                                href={nestedOpt.href}
                                onClick={(e) => handleOptionClick(e, nestedOpt)}
                                style={{
                                  display: 'block',
                                  padding: isMobile ? '14px 40px' : '12px 20px',
                                  fontWeight: isMobile ? 400 : 500,
                                  textDecoration: 'none',
                                  transition: 'all 0.2s ease',
                                  borderRadius: isMobile ? 0 : '8px',
                                  margin: '0',
                                  color: '#fff',
                                  fontSize: isMobile ? '18px' : '0.9rem',
                                  textAlign: 'left',
                                  whiteSpace: 'normal',
                                  lineHeight: '1.4',
                                  borderBottom: isMobile ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.color = 'var(--secondary-color)';
                                  e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                                  e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.color = '#fff';
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
                      onClick={(e) => {
                        if (label === 'Insights & Resources' && isInsightsUpcoming(opt)) {
                          e.preventDefault();
                          return;
                        }
                        handleOptionClick(e, opt);
                      }}
                      style={{
                        display: 'block',
                        padding: isMobile ? '14px 40px' : '12px 20px',
                        fontWeight: opt.isHighlighted ? 600 : (isMobile ? 400 : 500),
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                        borderRadius: isMobile ? 0 : '8px',
                        margin: '0',
                        color: opt.isHighlighted ? '#FF6B35' : (label === 'Insights & Resources' && isInsightsUpcoming(opt) ? 'rgba(255,255,255,0.6)' : '#fff'),
                        fontSize: isMobile ? '18px' : '0.9rem', 
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        lineHeight: '1.4',
                        width: '100%',
                        boxSizing: 'border-box',
                        pointerEvents: label === 'Insights & Resources' && isInsightsUpcoming(opt) ? 'none' : 'auto',
                        background: opt.isHighlighted ? (isMobile ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 107, 53, 0.1)') : 'transparent',
                        border: opt.isHighlighted ? (isMobile ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255, 107, 53, 0.3)') : 'none',
                        borderBottom: isMobile ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                      }}
                      onMouseEnter={e => {
                        if (!isMobile) {
                          if (!(label === 'Insights & Resources' && isInsightsUpcoming(opt))) {
                            if (opt.isHighlighted) {
                              e.currentTarget.style.color = '#FF4500';
                              e.currentTarget.style.background = 'rgba(255, 107, 53, 0.2)';
                            } else {
                              e.currentTarget.style.color = 'var(--secondary-color)';
                              e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                            }
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isMobile) {
                          if (opt.isHighlighted) {
                            e.currentTarget.style.color = '#FF6B35';
                            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)';
                          } else {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'transparent';
                          }
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                      {label === 'Insights & Resources' && isInsightsUpcoming(opt) && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: isMobile ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                          color: isMobile ? '#fff' : '#666'
                        }}>Upcoming</span>
                      )}
                    </a>
                  )}
                </li>
              ))
            )}
          </>
        )}
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