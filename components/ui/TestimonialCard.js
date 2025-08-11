import React from 'react';

const TestimonialCard = React.forwardRef(({ 
  className, 
  quote,
  authorName,
  authorTitle,
  authorImage,
  ...props 
}, ref) => {
  // Placeholder image component
  const PlaceholderImage = () => (
    <div 
      className="rounded-circle me-2 d-flex align-items-center justify-content-center text-white fw-bold"
      style={{ 
        width: '32px', 
        height: '32px',
        backgroundColor: 'var(--primary-color)',
        fontSize: '14px'
      }}
    >
      {authorName ? authorName.charAt(0).toUpperCase() : 'U'}
    </div>
  );

  return (
    <div
      className={`card h-100 shadow-sm border-0 ${className || ''}`}
      ref={ref}
      {...props}
    >
      <div className="card-body p-3 p-md-3 p-lg-4">
        {/* Quote Icon - Compact sizing */}
        <div className="text-warning mb-2" style={{ 
          fontSize: 'clamp(1.5rem, 3vw, 3rem)',
          lineHeight: '1'
        }}>
          "
        </div>

        {/* Quote Text - Compact sizing */}
        <blockquote className="text-dark mb-3" style={{ 
          fontSize: 'clamp(0.85rem, 2vw, 1rem)', 
          lineHeight: '1.4'
        }}>
          {quote}
        </blockquote>

        {/* Author Info */}
        <div className="d-flex align-items-center">
          {authorImage ? (
            <img
              src={authorImage}
              alt={authorName}
              className="rounded-circle me-2"
              style={{ width: '32px', height: '32px' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <PlaceholderImage />
          )}
          <div>
            <div className="fw-semibold text-dark" style={{ fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)' }}>
              {authorName}
            </div>
            <div className="text-muted small" style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)' }}>
              {authorTitle}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TestimonialCard.displayName = "TestimonialCard";

export { TestimonialCard }; 