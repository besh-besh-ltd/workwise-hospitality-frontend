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
      className={`card h-100 shadow-sm border-0 ${className || ""}`}
      ref={ref}
      {...props}
    >
      <div className="card-body text-center p-4 position-relative">
        {/* Step Number Badge */}
        {isStep && stepNumber && (
          <div
            className="position-absolute top-0 start-0 bg-dark text-white rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style={{
              width: "32px",
              height: "32px",
              zIndex: 10,
              transform: "translate(-8px, -8px)",
              fontSize: "14px",
            }}
          >
            {stepNumber}
          </div>
        )}

        {/* Icon + Title: inline on mobile, stacked on >= sm */}
        <div className="d-flex d-sm-block align-items-center justify-content-center mb-3">
          {Icon && (
            <div
              className={`rounded-circle d-inline-flex align-items-center justify-content-center me-2 me-sm-0 mb-0 mb-sm-3 ${iconBgColor}`}
              style={{ width: "48px", height: "48px" }}
            >
              <Icon className={iconColor} size={24} />
            </div>
          )}
          <h5 className="card-title fw-bold text-dark mb-0 mb-sm-3">{title}</h5>
        </div>

        {/* Description */}
        <p className="card-text text-muted mb-0">{description}</p>

        <style jsx>{`
          @media (max-width: 576px) {
            .card-body .rounded-circle { width: 40px !important; height: 40px !important; }
            .card-body .rounded-circle svg { width: 18px !important; height: 18px !important; }
          }
          
          /* Ensure consistent card heights on mobile */
          @media (max-width: 768px) {
            .card {
              height: auto !important;
              min-height: auto !important;
            }
            
            .card-body {
              padding: 1.5rem !important;
            }
            
            .card-title {
              font-size: 1.1rem !important;
              line-height: 1.3 !important;
            }
            
            .card-text {
              font-size: 0.9rem !important;
              line-height: 1.4 !important;
            }
            
            /* Ensure proper text wrapping and consistent heights */
            .card-text {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              hyphens: auto !important;
            }
          }
          
          /* Ensure consistent heights across all screen sizes */
          .card {
            display: flex !important;
            flex-direction: column !important;
          }
          
          .card-body {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
        `}</style>
      </div>
    </div>
  );
});

FeatureCard.displayName = "FeatureCard";

export { FeatureCard }; 