import React from 'react';
import { Button } from './Button';

const CtaSection = React.forwardRef(({ 
  className, 
  title,
  icon: Icon,
  primaryButton,
  secondaryButton,
  ...props 
}, ref) => {
  return (
    <section
      className={`py-5 ${className || ''}`}
      style={{
        background: 'linear-gradient(90deg, var(--primary-color) 0%, #428B41 50%, #20c997 100%)'
      }}
      ref={ref}
      {...props}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            {/* Icon */}
            {Icon && (
              <div className="text-white-50 mb-4">
                <Icon size={48} />
              </div>
            )}

            {/* Title */}
            <h2 className="display-5 fw-bold text-white mb-5">
              {title}
            </h2>

            {/* CTA Buttons */}
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              {primaryButton && (
                <Button
                  label={primaryButton.label}
                  variant={primaryButton.variant || "black"}
                  icon={primaryButton.icon || "arrow"}
                  size="lg"
                  onClick={primaryButton.onClick}
                  className="w-auto"
                />
              )}
              {secondaryButton && (
                <Button
                  label={secondaryButton.label}
                  variant={secondaryButton.variant || "white"}
                  icon={secondaryButton.icon || "phone"}
                  size="lg"
                  onClick={secondaryButton.onClick}
                  className="w-auto"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

CtaSection.displayName = "CtaSection";

export { CtaSection }; 