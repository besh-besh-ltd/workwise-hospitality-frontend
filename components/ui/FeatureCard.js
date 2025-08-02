import React from 'react';

const FeatureCard = React.forwardRef(({ 
  className, 
  icon: Icon,
  iconBgColor = "bg-primary",
  iconColor = "text-white",
  title,
  description,
  stepNumber,
  isStep = false,
  ...props 
}, ref) => {
  return (
    <div
      className={`card h-100 shadow-sm border-0 ${className || ''}`}
      ref={ref}
      {...props}
    >
      <div className="card-body text-center p-4 position-relative">
        {/* Step Number Badge */}
        {isStep && stepNumber && (
          <div className="position-absolute top-0 start-0 bg-dark text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" 
               style={{ 
                 width: '32px', 
                 height: '32px', 
                 zIndex: 10, 
                 transform: 'translate(-8px, -8px)',
                 fontSize: '14px'
               }}>
            {stepNumber}
          </div>
        )}

        {/* Icon */}
        <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 ${iconBgColor}`} 
             style={{ width: '48px', height: '48px' }}>
          {Icon && <Icon className={`${iconColor}`} size={24} />}
        </div>

        {/* Title */}
        <h5 className="card-title fw-bold text-dark mb-3">
          {title}
        </h5>

        {/* Description */}
        <p className="card-text text-muted">
          {description}
        </p>
      </div>
    </div>
  );
});

FeatureCard.displayName = "FeatureCard";

export { FeatureCard }; 