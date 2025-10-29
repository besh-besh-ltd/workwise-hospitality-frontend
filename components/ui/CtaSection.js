import React from 'react';
import { Button } from './Button';

const CtaSection = ({ 
  title, 
  description, 
  primaryButton, 
  secondaryButton,
  className = "" 
}) => {
  return (
    <section 
      className={`py-5 ${className}`}
      style={{
        background: 'linear-gradient(to bottom, #004B84, #30A07D)'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            {title && (
              <h2 className="fs-3 fw-bold text-white mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {title}
              </h2>
            )}
            
            {description && (
              <p className="text-white mb-5" style={{ fontSize: '1rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {description}
              </p>
            )}

            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              {primaryButton && (
                <Button
                  id={primaryButton.id}
                  label={primaryButton.label}
                  variant={primaryButton.variant}
                  icon={primaryButton.icon}
                  onClick={primaryButton.onClick}
                  size="md"
                  className=""
                  style={{}}
                />
              )}
              
              {secondaryButton && (
                <Button
                  id={secondaryButton.id}
                  label={secondaryButton.label}
                  variant={secondaryButton.variant}
                  icon={secondaryButton.icon}
                  onClick={secondaryButton.onClick}
                  size="md"
                  className="text-white border-white"
                  style={{
                    color: 'white',
                    borderColor: 'white'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { CtaSection }; 