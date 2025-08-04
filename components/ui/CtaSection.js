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
        background: 'linear-gradient(135deg, var(--primary-color) 0%, #428B41 100%)'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            {title && (
              <h2 className="fs-3 fw-bold text-white mb-4">
                {title}
              </h2>
            )}
            
            {description && (
              <p className="text-white mb-5" style={{ fontSize: '1rem' }}>
                {description}
              </p>
            )}

            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              {primaryButton && (
                <Button
                  label={primaryButton.label}
                  variant={primaryButton.variant}
                  icon={primaryButton.icon}
                  onClick={primaryButton.onClick}
                  size="lg"
                  className="px-5 py-2"
                  style={{ minWidth: '330px' }}
                />
              )}
              
              {secondaryButton && (
                <Button
                  label={secondaryButton.label}
                  variant={secondaryButton.variant}
                  icon={secondaryButton.icon}
                  onClick={secondaryButton.onClick}
                  size="lg"
                  className="px-5 py-2 text-white border-white"
                  style={{
                    color: 'white',
                    borderColor: 'white',
                    minWidth: '330px'
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