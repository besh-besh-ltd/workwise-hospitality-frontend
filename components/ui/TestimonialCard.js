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
      className="rounded-circle me-3 d-flex align-items-center justify-content-center text-white fw-bold"
      style={{ 
        width: '40px', 
        height: '40px',
        backgroundColor: 'var(--primary-color)',
        fontSize: '16px'
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
      <div className="card-body p-4">
        {/* Quote Icon */}
        <div className="text-warning mb-3" style={{ fontSize: '2rem' }}>
          "
        </div>

        {/* Quote Text */}
        <blockquote className="text-dark mb-4" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
          {quote}
        </blockquote>

        {/* Author Info */}
        <div className="d-flex align-items-center">
          {authorImage ? (
            <img
              src={authorImage}
              alt={authorName}
              className="rounded-circle me-3"
              style={{ width: '40px', height: '40px' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : null}
          <PlaceholderImage />
          <div>
            <div className="fw-semibold text-dark">
              {authorName}
            </div>
            <div className="text-muted small">
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