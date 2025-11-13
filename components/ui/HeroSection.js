import React from 'react';
import { Button } from './Button';

const HeroSection = React.forwardRef(({ 
  className, 
  title,
  subtitle,
  valueProps,
  primaryButton,
  secondaryButton,
  visualContent,
  mobileVideoContent,
  layout = "split", // "split" | "centered" | "full-width"
  size = "large", // "large" | "medium" | "small"
  textAlign = "left", // "left" | "center" | "right"
  showVisual = true,
  children,
  ...props 
}, ref) => {
  // Size configurations
  const sizeConfig = {
    large: { minHeight: '100vh', paddingTop: '80px', paddingBottom: '60px' },
    medium: { minHeight: '60vh', paddingTop: '100px', paddingBottom: '40px' },
    small: { minHeight: '10vh', paddingTop: '100px', paddingBottom: '20px' }
  };

  const currentSize = sizeConfig[size];

  return (
    <section
      className={`d-flex align-items-center position-relative ${className || ''}`}
      style={{
        background: 'linear-gradient(to bottom, #004B84, #30A07D)',
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
                <h1 className={`${size === 'large' ? 'display-4' : size === 'medium' ? 'fs-1' : 'fs-2'} fw-bold text-white mb-4`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)', fontSize: size === 'medium' ? 'clamp(2.2rem, 7vw, 3.2rem)' : undefined }}>
                  {title === "Procurement se Profit Banao" ? (
                    <>
                      Procurement se <span style={{ color: '#FF8C00', whiteSpace: 'nowrap' }}>Profit Banao</span>
                    </>
                  ) : (
                    title
                  )}
                </h1>

                {/* Subtitle */}
                <p className={`${size === 'large' ? 'fs-4' : 'fs-5'} text-white mb-4`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {subtitle}
                </p>

                {/* Value Props Strip - Hide ISO and ERP on mobile */}
                {valueProps && valueProps.length > 0 && (
                  <div className={`d-flex flex-wrap gap-3 mb-4 mb-lg-5 ${textAlign === 'center' ? 'justify-content-center' : textAlign === 'right' ? 'justify-content-end' : 'justify-content-start'}`}>
                    {valueProps.map((prop, index) => {
                      // Hide ISO-Certified and ERP-Integrated on mobile only for better CTA visibility
                      const shouldHideOnMobile = prop.text === 'ISO-Certified' || prop.text === 'ERP-Integrated';
                      const mobileClass = shouldHideOnMobile ? 'd-none d-lg-flex' : 'd-flex';
                      
                      return (
                        <div
                          key={index}
                          className={`${mobileClass} align-items-center gap-2 px-3 py-2 rounded-pill`}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <span style={{ color: prop.color || '#0EA5E9', filter: 'brightness(1.2) contrast(1.3)' }}>
                            {prop.icon}
                          </span>
                          <span className="text-white fw-medium small">{prop.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mobile Video Content - Above CTA Buttons */}
                {mobileVideoContent && (
                  <div className="d-lg-none mb-3">
                    {mobileVideoContent}
                  </div>
                )}

                {/* CTA Buttons */}
                <div className={`d-flex flex-column flex-sm-row gap-3 ${textAlign === 'center' ? 'justify-content-center' : textAlign === 'right' ? 'justify-content-end' : 'justify-content-start'}`}>
                  {primaryButton && (
                    primaryButton.custom ? (
                      primaryButton.component
                    ) : (
                      <Button
                        id={primaryButton.id}
                        label={primaryButton.label}
                        variant={primaryButton.variant || "black"}
                        icon={primaryButton.icon || "none"}
                        size="md"
                        onClick={primaryButton.onClick}
                      />
                    )
                  )}
                  {secondaryButton && !primaryButton?.custom && (
                    <Button
                      id={secondaryButton.id}
                      label={secondaryButton.label}
                      variant={secondaryButton.variant || "white"}
                      icon={secondaryButton.icon || "phone"}
                      size="md"
                      onClick={secondaryButton.onClick}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel */}
            {showVisual && (
              <div className="col-lg-6 d-none d-lg-block position-relative">
                <div className="position-relative h-100 d-flex align-items-center justify-content-center">
                  {visualContent?.video ? (
                    <div className="w-100">
                      {visualContent.video}
                    </div>
                  ) : visualContent?.image ? (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <img 
                        src={visualContent.image} 
                        alt="Hero Visual" 
                        style={{
                          maxWidth: '80%',
                          maxHeight: '80%',
                          borderRadius: '16px',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
                        }}
                      />
                    </div>
                  ) : visualContent?.component ? visualContent.component() : (
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
              <h1 className={`${size === 'large' ? 'display-4' : size === 'medium' ? 'fs-1' : 'fs-2'} fw-bold text-white mb-4`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {title === "Procurement se Profit Banao" ? (
                  <>
                    Procurement se <span style={{ color: '#FF8C00' }}>Profit Banao</span>
                  </>
                ) : (
                  title
                )}
              </h1>

              {/* Subtitle */}
              <p className={`${size === 'large' ? 'lead' : 'fs-5'} text-white mb-4`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {subtitle}
              </p>

              {/* Value Props Strip */}
              {valueProps && valueProps.length > 0 && (
                <div className="d-flex flex-wrap gap-3 justify-content-center mb-5">
                  {valueProps.map((prop, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <span style={{ color: prop.color || '#0EA5E9' }}>
                        {prop.icon}
                      </span>
                      <span className="text-white fw-medium small">{prop.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                {primaryButton && (
                  primaryButton.custom ? (
                    primaryButton.component
                  ) : (
                    <Button
                      id={primaryButton.id}
                      label={primaryButton.label}
                      variant={primaryButton.variant || "black"}
                      icon={primaryButton.icon || "none"}
                      size="lg"
                      onClick={primaryButton.onClick}
                      classname="w-auto"
                    />
                  )
                )}
                {secondaryButton && !primaryButton?.custom && (
                  <Button
                    id={secondaryButton.id}
                    label={secondaryButton.label}
                    variant={secondaryButton.variant || "white"}
                    icon={secondaryButton.icon || "phone"}
                    size="lg"
                    onClick={secondaryButton.onClick}
                    classname="w-auto"
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
                <h1 className={`${size === 'large' ? 'display-4' : size === 'medium' ? 'fs-1' : 'fs-2'} fw-bold text-white mb-4`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  {title === "Procurement se Profit Banao" ? (
                    <>
                      Procurement se <span style={{ color: '#FF8C00' }}>Profit Banao</span>
                    </>
                  ) : (
                    title
                  )}
                </h1>

                {/* Subtitle */}
                <p className={`${size === 'large' ? 'fs-4' : 'fs-5'} text-white mb-4`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {subtitle}
                </p>

                {/* Value Props Strip */}
                {valueProps && valueProps.length > 0 && (
                  <div className={`d-flex flex-wrap gap-3 mb-5 ${textAlign === 'center' ? 'justify-content-center' : textAlign === 'right' ? 'justify-content-end' : 'justify-content-start'}`}>
                    {valueProps.map((prop, index) => (
                      <div
                        key={index}
                        className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <span style={{ color: prop.color || '#0EA5E9', filter: 'brightness(1.2) contrast(1.3)' }}>
                          {prop.icon}
                        </span>
                        <span className="text-white fw-medium small">{prop.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA Buttons */}
                <div className={`d-flex flex-column flex-sm-row gap-3 ${textAlign === 'center' ? 'justify-content-center' : textAlign === 'right' ? 'justify-content-end' : 'justify-content-start'}`}>
                  {primaryButton && (
                    primaryButton.custom ? (
                      primaryButton.component
                    ) : (
                      <Button
                        id={primaryButton.id}
                        label={primaryButton.label}
                        variant={primaryButton.variant || "black"}
                        icon={primaryButton.icon || "none"}
                        size="lg"
                        onClick={primaryButton.onClick}
                        classname="w-auto"
                      />
                    )
                  )}
                  {secondaryButton && !primaryButton?.custom && (
                    <Button
                      id={secondaryButton.id}
                      label={secondaryButton.label}
                      variant={secondaryButton.variant || "white"}
                      icon={secondaryButton.icon || "phone"}
                      size="lg"
                      onClick={secondaryButton.onClick}
                      classname="w-auto"
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