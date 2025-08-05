import React from 'react';
import { Button } from './Button';

const HeroSection = React.forwardRef(({ 
  className, 
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  visualContent,
  layout = "split", // "split" | "centered" | "full-width"
  size = "large", // "large" | "medium" | "small"
  textAlign = "left", // "left" | "center" | "right"
  showVisual = true,
  children,
  ...props 
}, ref) => {
  // Size configurations
  const sizeConfig = {
    large: { minHeight: '100vh', paddingTop: '120px', paddingBottom: '60px' },
    medium: { minHeight: '70vh', paddingTop: '120px', paddingBottom: '40px' },
    small: { minHeight: '10vh', paddingTop: '120px', paddingBottom: '20px' }
  };

  const currentSize = sizeConfig[size];

  return (
    <section
      className={`d-flex align-items-center position-relative ${className || ''}`}
              style={{
          background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
          minHeight: currentSize.minHeight,
          paddingTop: currentSize.paddingTop,
          paddingBottom: currentSize.paddingBottom
        }}
      ref={ref}
      {...props}
    >
      {/* Content Container */}
      <div className="container-fluid">
        {layout === "split" && (
          <div className="row align-items-center">
            <div className="col-lg-6 px-4 px-lg-5">
              <div className={`${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-end' : 'text-start'}`}>
                {/* Title */}
                <h1 className={`${size === 'large' ? 'display-4' : size === 'medium' ? 'fs-1' : 'fs-2'} fw-bold text-white mb-4`}>
                  {title}
                </h1>

                {/* Subtitle */}
                <p className={`${size === 'large' ? 'lead' : 'fs-5'} text-white mb-5`}>
                  {subtitle}
                </p>

                {/* CTA Buttons */}
                <div className={`d-flex flex-column flex-sm-row gap-3 ${textAlign === 'center' ? 'justify-content-center' : textAlign === 'right' ? 'justify-content-end' : 'justify-content-start'}`}>
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
            {showVisual && (
              <div className="col-lg-6 d-none d-lg-block position-relative">
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{
                    background: 'linear-gradient(135deg, var(--tertiary-color) 0%, var(--red-color) 100%)'
                  }}
                >
                  {visualContent?.component ? visualContent.component() : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <div className="text-center text-white">
                        <p className="mb-0">Visual Placeholder</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {layout === "centered" && (
          <div className="row justify-content-center text-center">
            <div className="col-lg-8 px-4 px-lg-5">
              {/* Title */}
              <h1 className={`${size === 'large' ? 'display-4' : size === 'medium' ? 'fs-1' : 'fs-2'} fw-bold text-white mb-4`}>
                {title}
              </h1>

              {/* Subtitle */}
              <p className={`${size === 'large' ? 'lead' : 'fs-5'} text-white mb-5`}>
                {subtitle}
              </p>

              {/* CTA Buttons */}
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
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
        )}

        {layout === "full-width" && (
          <div className="row">
            <div className="col-12 px-4 px-lg-5">
              <div className={`${textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-end' : 'text-start'}`}>
                {/* Title */}
                <h1 className={`${size === 'large' ? 'display-4' : size === 'medium' ? 'fs-1' : 'fs-2'} fw-bold text-white mb-4`}>
                  {title}
                </h1>

                {/* Subtitle */}
                <p className={`${size === 'large' ? 'lead' : 'fs-5'} text-white mb-5`}>
                  {subtitle}
                </p>

                {/* CTA Buttons */}
                <div className={`d-flex flex-column flex-sm-row gap-3 ${textAlign === 'center' ? 'justify-content-center' : textAlign === 'right' ? 'justify-content-end' : 'justify-content-start'}`}>
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
          </div>
        )}
        
        {/* Custom Children Content */}
        {children}
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";

export { HeroSection }; 