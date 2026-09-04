import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

const Dropdown = React.forwardRef(({ 
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className={`position-relative ${className}`} ref={ref} {...props}>
      {label && (
        <label className="form-label text-white small mb-2">{label}</label>
      )}
      <div className="custom-dropdown" style={{ position: 'relative', width: '100%' }}>
        <div 
          className="custom-dropdown-header"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            color: '#495057',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
        >
          <span>{value || placeholder}</span>
          <FontAwesomeIcon 
            icon={faChevronDown}
            className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`}
            style={{
              fontSize: '14px',
              transition: 'transform 0.2s ease',
              color: '#6c757d',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </div>
        {isOpen && (
          <div
            className="custom-dropdown-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              minWidth: '100%',
              width: 'max-content',
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
              zIndex: 1000,
              maxHeight: '240px',
              overflowY: 'auto',
              padding: '4px 0'
            }}
          >
            {options.map((option, idx) => (
              <div
                key={option}
                className={`custom-dropdown-item ${value === option ? 'active' : ''}`}
                onClick={() => handleSelect(option)}
                style={{
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: value === option ? '#0d6efd' : '#495057',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: value === option ? '#e3f2fd' : 'transparent',
                  fontWeight: value === option ? '500' : 'normal',
                  whiteSpace: 'nowrap',
                  borderBottom: idx === options.length - 1 ? 'none' : '1px solid #f1f3f4'
                }}
                onMouseEnter={(e) => {
                  if (value !== option) {
                    e.target.style.backgroundColor = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

Dropdown.displayName = "Dropdown";

export { Dropdown }; 