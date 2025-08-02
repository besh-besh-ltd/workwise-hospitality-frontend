import React from 'react';
import { Button } from './Button';

const HeroSection = React.forwardRef(({ 
  className, 
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  visualContent,
  ...props 
}, ref) => {
  return (
    <section
      className={`min-vh-100 d-flex align-items-center position-relative ${className || ''}`}
      style={{
        background: 'linear-gradient(135deg, var(--primary-color) 0%, #428B41 100%)'
      }}
      ref={ref}
      {...props}
    >
      {/* Left Panel */}
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-lg-6 px-4 px-lg-5">
            <div className="max-w-2xl">
              {/* Title */}
              <h1 className="display-4 fw-bold text-white mb-4">
                {title}
              </h1>

              {/* Subtitle */}
              <p className="lead text-white mb-5">
                {subtitle}
              </p>

              {/* CTA Buttons */}
              <div className="d-flex flex-column flex-sm-row gap-3">
                {primaryButton && (
                  <Button
                    label={primaryButton.label}
                    variant={primaryButton.variant || "black"}
                    icon={primaryButton.icon || "none"}
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

          {/* Right Panel */}
          <div className="col-lg-6 d-none d-lg-block position-relative">
            <div 
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                background: 'linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%)'
              }}
            >
              {visualContent?.component ? visualContent.component() : (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="text-center text-white">
                    <p className="mb-0">BOQ Visual Placeholder</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";

export { HeroSection }; 