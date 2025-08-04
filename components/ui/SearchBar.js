import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ 
  placeholder = "Search events...",
  onSearch,
  className = "",
  ...props 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Trigger search on input change for real-time filtering
    onSearch(value);
  };

  return (
    <div className={`position-relative ${className}`} {...props}>
      <form onSubmit={handleSearch}>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            style={{
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '10px 40px 10px 12px',
              fontSize: '0.9rem',
              backgroundColor: '#f8f9fa',
              color: '#495057'
            }}
          />
          <div 
            className="position-absolute"
            style={{
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10
            }}
          >
            <Search 
              size={16} 
              style={{ color: '#6c757d' }}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export { SearchBar }; 