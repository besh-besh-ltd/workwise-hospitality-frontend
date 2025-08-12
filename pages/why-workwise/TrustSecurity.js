import { FaqAccordion } from '@/components/ui/FaqAccordion';
import React from 'react'
import { FaCheckCircle, FaCloud, FaLock, FaUsers } from 'react-icons/fa';
import { 
  FaSearch,
  FaCheck, 
  FaFileAlt, 
  FaFolderOpen, 
  FaFileContract,
  FaShieldAlt,
  FaLink, FaWhatsapp
} from 'react-icons/fa';
import { HeroSection } from '@/components/ui/HeroSection';

// Import data
import { trustSecurityData } from '@/components/constants/trustSecurityData';
// import { FaLock } from 'react-icons/fa';





// 1️⃣  Questions & answers
const securityFaqs = trustSecurityData.faqs;

// 2️⃣  Section wrapper
const FaqSecuritySection = () => (
  <section className="py-5 bg-light">
    <div className="container">
      <h2 className="h4 fw-bold text-center mb-4">
        Common Questions About Workwise Security
      </h2>

      <FaqAccordion questions={securityFaqs} />
    </div>
  </section>
);

const iconMap32 = {
  'lock': <FaLock className="text-warning" size={32} />,
  'cloud': <FaCloud className="text-muted" size={32} />,
  'check-circle': <FaCheckCircle className="text-success" size={32} />,
  'users': <FaUsers className="text-primary" size={32} />,
  'link': <FaLink className="text-muted" size={32} />,
  'whatsapp': <FaWhatsapp className="text-muted" size={32} />,
  'file-alt': <FaFileAlt className="text-muted" size={32} />
};
const iconMap28 = {
  'lock': <FaLock className="text-warning" size={28} />,
  'file-alt': <FaFileAlt className="text-muted" size={28} />,
  'check': <FaCheck className="text-success" size={28} />,
  'shield-alt': <FaShieldAlt className="text-muted" size={28} />,
  'folder-open': <FaFolderOpen className="text-warning" size={28} />,
  'file-contract': <FaFileContract className="text-danger" size={28} />
};

const SecurityFeatures = ({ 
  className = '',
  title,
  features,
  ...props 
}) => {
  const displayFeatures = (features || trustSecurityData.securityFeatures).map(f => ({
    ...f,
    icon: iconMap32[f.icon] || <FaLock className="text-warning" size={32} />
  }));
  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {title && (
          <div className="text-center mb-5">
            <h2 className="h2 fw-bold text-dark">{title}</h2>
          </div>
        )}
        <div className="row g-4">
          {displayFeatures.map((feature) => (
            <div key={feature.id} className="col-lg-6 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100">
                <div className="d-flex align-items-start">
                  <div className="flex-shrink-0 me-3">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle bg-light"
                      style={{ width: '60px', height: '60px' }}
                    >
                      {feature.icon}
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h5 className="fw-bold mb-2 text-dark">{feature.title}</h5>
                    <p className="text-muted mb-0 lh-base">{feature.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AuditReadySection = ({ 
  className = '',
  title = "Audit-Ready. Private. Always in Control.",
  subtitle = "Workwise ensures full transparency for your team — and complete confidentiality from vendors.",
  features,
  ...props 
}) => {
  const displayFeatures = (features || trustSecurityData.auditFeatures).map(f => ({
    ...f,
    icon: iconMap28[f.icon] || <FaLock className="text-warning" size={28} />
  }));
  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-6 fw-bold text-dark mb-3">{title}</h2>
          <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>{subtitle}</p>
        </div>
        <div className="row g-4">
          {displayFeatures.map((feature) => (
            <div key={feature.id} className="col-lg-4 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100 border-0">
                <div className="d-flex align-items-start">
                  <div className="me-3 mt-1 flex-shrink-0">{feature.icon}</div>
                  <div className="flex-grow-1">
                    <h5 className="fw-bold mb-2 text-dark">{feature.title}</h5>
                    <p className="text-muted mb-0 lh-base">{feature.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const EnterpriseStackIntegration = ({ 
  className = '',
  title = "Fits Right Into Your Enterprise Stack",
  features,
  ...props 
}) => {
  const displayFeatures = (features || trustSecurityData.integrationFeatures).map(f => ({
    ...f,
    icon: iconMap32[f.icon] || <FaLink className="text-muted" size={32} />
  }));
  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold text-dark">{title}</h2>
        </div>
        <div className="row justify-content-center g-4">
          {displayFeatures.map((feature) => (
            <div key={feature.id} className="col-lg-3 col-md-6 col-sm-6">
              <div className="px-2">
                <div className="d-flex d-sm-block align-items-center justify-content-center text-center">
                  <div className="me-2 me-sm-0 mb-0 mb-sm-3">{feature.icon}</div>
                  <p className="text-muted mb-0 small lh-base">{feature.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};




const TrustSecurity = () => {
  return (
    <>
      <HeroSection
        title={trustSecurityData.hero.title}
        subtitle={trustSecurityData.hero.description}
        layout="split"
        size="medium"
        showVisual={true}
        primaryButton={{
          label: trustSecurityData.hero.buttonLabel,
          variant: "black",
          onClick: () => console.log('Schedule Demo clicked')
        }}
        visualContent={
          <div className="text-center">
            <div
              className="position-relative rounded-3 shadow-lg mx-auto"
              style={{
                width: '100%',
                maxWidth: '420px',
                height: '280px',
                backgroundColor: '#1a1f2e',
                border: '2px solid #2a3441'
              }}
            >
              {/* Simulated Dashboard Content */}
              <div className="p-4 h-100 d-flex flex-column">
                {/* Top Stats Row */}
                <div className="row mb-3">
                  <div className="col-4">
                    <div className="text-center">
                      <div className="text-info fw-bold fs-4">250</div>
                      <small className="text-muted">Projects</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="text-center">
                      <div className="text-success fw-bold fs-4">2.5</div>
                      <small className="text-muted">Savings</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="text-center">
                      <div className="text-warning fw-bold fs-4">24</div>
                      <small className="text-muted">Days</small>
                    </div>
                  </div>
                </div>

                {/* Security Lock Icon */}
                <div className="position-absolute top-50 end-0 translate-middle-y me-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center bg-primary"
                    style={{ width: '60px', height: '60px' }}
                  >
                    <FaLock className="text-white" size={24} />
                  </div>
                </div>

                {/* Chart Simulation */}
                <div className="flex-grow-1 d-flex align-items-end justify-content-center">
                  <div className="d-flex align-items-end gap-1" style={{ height: '80px' }}>
                    {[20, 35, 45, 30, 55, 40, 65, 50, 70, 45, 60, 35].map((height, i) => (
                      <div
                        key={i}
                        className="bg-primary rounded-top"
                        style={{
                          width: '8px',
                          height: `${height}px`,
                          opacity: 0.7
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Security Indicators */}
                <div className="row mt-3">
                  <div className="col-6">
                    <div className="d-flex align-items-center">
                      <div
                        className="rounded-circle bg-success me-2"
                        style={{ width: '8px', height: '8px' }}
                      />
                      <small className="text-success fw-medium">Secure</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center">
                      <div
                        className="rounded-circle bg-info me-2"
                        style={{ width: '8px', height: '8px' }}
                      />
                      <small className="text-info fw-medium">Encrypted</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />
      <SecurityFeatures/>
      <AuditReadySection/>
      <EnterpriseStackIntegration/>
        <FaqSecuritySection />
    </>
  );
}

export default TrustSecurity
