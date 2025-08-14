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
    if (!isMobile) {
      setIsHovering(false);
      
      // Check if mouse is leaving the entire dropdown area (trigger + dropdown)
      const relatedTarget = e.relatedTarget;
      
      // If moving to another dropdown area, don't close immediately
      if (relatedTarget && (
        relatedTarget.closest('.dropdown-menu') || 
        relatedTarget.closest('.dropdown-trigger') ||
        relatedTarget.closest('[data-dropdown]')
      )) {
        return;
      }

      // Only close if actually leaving the dropdown system
      if (!dropdownRef.current?.contains(relatedTarget) && !triggerRef.current?.contains(relatedTarget)) {
        timeoutRef.current = setTimeout(() => {
          if (!isHovering) {
            setOpen(false);
            setNestedOpen(null);
            dropdownManager.clearActive();
          }
        }, 150);
      }
    }
  };

  const handleDropdownMouseEnter = () => {
    if (!isMobile) {
      clearTimeout(timeoutRef.current);
      setIsHovering(true);
      dropdownManager.setActive(dropdownId.current);
    }
  };

  const handleDropdownMouseLeave = (e) => {
    if (!isMobile) {
      setIsHovering(false);
      
      // Check if moving to another dropdown area
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && (
        relatedTarget.closest('.dropdown-menu') || 
        relatedTarget.closest('.dropdown-trigger') ||
        relatedTarget.closest('[data-dropdown]')
      )) {
        return;
      }

      // Check if moving within the same dropdown (e.g., from menu to nested menu)
      if (relatedTarget && dropdownRef.current?.contains(relatedTarget)) {
        return;
      }

      timeoutRef.current = setTimeout(() => {
        if (!isHovering) {
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
    if (!isMobile) {
      clearTimeout(nestedTimeoutRef.current);
      setNestedOpen(index);
    }
  };

  const handleNestedMouseLeave = () => {
    if (!isMobile) {
      nestedTimeoutRef.current = setTimeout(() => setNestedOpen(null), 100);
    }
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
          padding: '8px 12px',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1000,
          userSelect: 'none',
          outline: 'none'
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
              }
            : {
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                minWidth: 340,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                borderRadius: 16,
                padding: '8px 0',
                margin: 0,
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transform: open ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                textAlign: 'left',
                alignItems: 'stretch',
                zIndex: 1001,
                maxHeight: '80vh',
                overflowY: 'auto',
                isolation: 'isolate'
              }),
        }}
      >
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
                 <div style={{ fontWeight: 700, fontSize: '1rem', padding: '8px 8px', opacity: 0.9 }}>Stakeholders</div>
                 <a href="/who-we-serve/stakeholders/epcs" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/epcs'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>EPCs / Contractors</a>
                 <a href="/who-we-serve/stakeholders/turnkey" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/turnkey'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Turnkey Project Firms</a>
                 <a href="/who-we-serve/stakeholders/consultants" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/consultants'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Project Consultants</a>
                 <a href="/who-we-serve/stakeholders/industrial-clients" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/industrial-clients'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Industrial Clients</a>
                 <a href="/for-vendors" onClick={(e)=>handleOptionClick(e,{href:'/for-vendors'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Vendors & OEMs</a>
               </div>
               <div style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: 16 }}>
                 <div style={{ fontWeight: 700, fontSize: '1rem', padding: '8px 8px', opacity: 0.9 }}>Industries</div>
                 <a href="/who-we-serve/industries/power" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/power'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Power</a>
                 <a href="/who-we-serve/industries/energy" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/energy'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Energy</a>
                 <a href="/who-we-serve/industries/petrochemical" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/petrochemical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Petrochemical & Chemical</a>
                 <a href="/who-we-serve/industries/steel-cement" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/steel-cement'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Steel & Cement</a>
                 <a href="/who-we-serve/industries/infrastructure" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/infrastructure'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Infrastructure</a>
                 <a href="/who-we-serve/industries/heavy-equipment" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/heavy-equipment'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Heavy Engineering & Machine Tools</a>
                 <a href="/who-we-serve/industries/marine-mining" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/marine-mining'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Marine & Mining</a>
               </div>
               <div style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: 16 }}>
                 <div style={{ fontWeight: 700, fontSize: '1rem', padding: '8px 8px', opacity: 0.9 }}>Disciplines</div>
                 <a href="/solutions/electrical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/electrical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Electrical</a>
                 <a href="/solutions/mechanical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/mechanical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Mechanical</a>
                 <a href="/solutions/civil" onClick={(e)=>handleOptionClick(e,{href:'/solutions/civil'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Civil</a>
                 <a href="/solutions/hvac" onClick={(e)=>handleOptionClick(e,{href:'/solutions/hvac'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>HVAC</a>
                 <a href="/solutions/fire-engineering" onClick={(e)=>handleOptionClick(e,{href:'/solutions/fire-engineering'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Fire & Safety</a>
                 <a href="/solutions/chemical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/chemical'})} style={{display:'block', padding:'8px 12px', textDecoration:'none', color:'#333'}}>Chemical</a>
               </div>
             </div>
           </li>
         ) : label === 'Who We Serve' && isMobile ? (
           <li style={{ listStyle: 'none', width: '100%' }}>
             <div style={{ padding: '8px 4px' }}>
               {/* Stakeholders */}
               <div onClick={() => setNestedOpen(nestedOpen === 'stakeholders' ? null : 'stakeholders')} style={{ padding: '10px 8px', fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>Stakeholders</span>
                 <FontAwesomeIcon icon={nestedOpen === 'stakeholders' ? faChevronUp : faChevronDown} size="sm"/>
               </div>
               {nestedOpen === 'stakeholders' && (
                 <div style={{ paddingLeft: 12 }}>
                   <a href="/who-we-serve/stakeholders/epcs" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/epcs'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>EPCs / Contractors</a>
                   <a href="/who-we-serve/stakeholders/turnkey" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/turnkey'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Turnkey Project Firms</a>
                   <a href="/who-we-serve/stakeholders/consultants" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/consultants'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Project Consultants</a>
                   <a href="/who-we-serve/stakeholders/industrial-clients" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/stakeholders/industrial-clients'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Industrial Clients</a>
                   <a href="/for-vendors" onClick={(e)=>handleOptionClick(e,{href:'/for-vendors'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Vendors & OEMs</a>
                 </div>
               )}
               {/* Industries */}
               <div onClick={() => setNestedOpen(nestedOpen === 'industries' ? null : 'industries')} style={{ padding: '10px 8px', fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>Industries</span>
                 <FontAwesomeIcon icon={nestedOpen === 'industries' ? faChevronUp : faChevronDown} size="sm"/>
               </div>
               {nestedOpen === 'industries' && (
                 <div style={{ paddingLeft: 12 }}>
                   <a href="/who-we-serve/industries/power" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/power'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Power</a>
                   <a href="/who-we-serve/industries/energy" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/energy'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Energy</a>
                   <a href="/who-we-serve/industries/petrochemical" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/petrochemical'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Petrochemical & Chemical</a>
                   <a href="/who-we-serve/industries/steel-cement" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/steel-cement'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Steel & Cement</a>
                   <a href="/who-we-serve/industries/infrastructure" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/infrastructure'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Infrastructure</a>
                   <a href="/who-we-serve/industries/heavy-equipment" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/heavy-equipment'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Heavy Engineering & Machine Tools</a>
                   <a href="/who-we-serve/industries/marine-mining" onClick={(e)=>handleOptionClick(e,{href:'/who-we-serve/industries/marine-mining'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Marine & Mining</a>
                 </div>
               )}
               {/* Disciplines */}
               <div onClick={() => setNestedOpen(nestedOpen === 'disciplines' ? null : 'disciplines')} style={{ padding: '10px 8px', fontWeight: 700, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span>Disciplines</span>
                 <FontAwesomeIcon icon={nestedOpen === 'disciplines' ? faChevronUp : faChevronDown} size="sm"/>
               </div>
               {nestedOpen === 'disciplines' && (
                 <div style={{ paddingLeft: 12 }}>
                   <a href="/solutions/electrical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/electrical'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Electrical</a>
                   <a href="/solutions/mechanical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/mechanical'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Mechanical</a>
                   <a href="/solutions/civil" onClick={(e)=>handleOptionClick(e,{href:'/solutions/civil'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Civil</a>
                   <a href="/solutions/hvac" onClick={(e)=>handleOptionClick(e,{href:'/solutions/hvac'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>HVAC</a>
                   <a href="/solutions/fire-engineering" onClick={(e)=>handleOptionClick(e,{href:'/solutions/fire-engineering'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Fire & Safety</a>
                   <a href="/solutions/chemical" onClick={(e)=>handleOptionClick(e,{href:'/solutions/chemical'})} style={{display:'block', padding:'8px 8px', color:'#fff', textDecoration:'none'}}>Chemical</a>
                 </div>
               )}
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
              <div /* disabled for who we serve */
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
                  e.currentTarget.style.color = '#333';
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
                  color: isMobile ? '#fff' : '#333',
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
                      left: 'calc(100% + 4px)',
                      top: 0,
                      minWidth: 300, /* Increased by 100px */
                      background: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      borderRadius: 16,
                      padding: '8px 0',
                      margin: 0,
                      zIndex: 1002,
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      animation: 'slideInRight 0.2s ease-out',
                      isolation: 'isolate'
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
                onClick={(e) => {
                  if (label === 'Insights & Resources' && isInsightsUpcoming(opt)) {
                    e.preventDefault();
                    return;
                  }
                  handleOptionClick(e, opt);
                }}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  borderRadius: '8px',
                  margin: '0',
                  color: label === 'Insights & Resources' && isInsightsUpcoming(opt) ? (isMobile ? 'rgba(255,255,255,0.6)' : '#aaa') : (isMobile ? '#fff' : '#333'),
                  fontSize: '0.9rem', 
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  lineHeight: '1.4',
                  width: '100%',
                  boxSizing: 'border-box',
                  pointerEvents: label === 'Insights & Resources' && isInsightsUpcoming(opt) ? 'none' : 'auto',
                }}
                onMouseEnter={e => {
                  if (!isMobile) {
                    if (!(label === 'Insights & Resources' && isInsightsUpcoming(opt))) {
                  e.currentTarget.style.color = 'var(--secondary-color)';
                  e.currentTarget.style.background = 'rgba(66, 139, 65, 0.08)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }
                }}
                onMouseLeave={e => {
                  if (!isMobile) {
                  e.currentTarget.style.color = '#333';
                  e.currentTarget.style.background = 'transparent';
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
