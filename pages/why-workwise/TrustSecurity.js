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
// import { FaLock } from 'react-icons/fa';





// 1️⃣  Questions & answers
const securityFaqs = [
  {
    question: "Where is our data hosted and backed up?",
    answer:
      "All data is hosted on the AWS India region with automatic daily backups and a 99.9% uptime SLA."
  },
  {
    question: "Can we restrict access by project or team?",
    answer:
      "Yes. Granular role-based access controls let you set project-specific and team-specific permissions."
  },
  {
    question: "How does Workwise handle vendor data confidentiality?",
    answer:
      "Complete vendor isolation — each vendor sees only its own RFQs and can’t access other vendors’ data."
  },
  {
    question: "Can we audit quote versions?",
    answer:
      "Yes. Workwise keeps a full version history with timestamps for every quote submission and modification."
  }
];

// 2️⃣  Section wrapper
const FaqSecuritySection = () => (
  <section className="py-5 bg-light">
    <div className="container">
      <h2 className="h4 fw-bold text-center mb-4">
        ❓ Common Questions About Workwise Security
      </h2>

      <FaqAccordion questions={securityFaqs} />
    </div>
  </section>
);




const HeroDataSafe = ({
  className = '',
  title = "Data-Safe. Audit-Ready. Built for Industrial Projects.",
  description = "From BOQs to vendor quotes, Workwise ensures your procurement data is protected, private, and traceable — end to end.",
  buttonLabel = "Talk to Us About Compliance Requirements",
  onButtonClick,
  imageSrc,
  ...props
}) => {
  return (
    <section
      className={`py-5 ${className || ''}`}
      style={{
        background: 'linear-gradient(135deg, #4a73c4 0%, #2e8b7c 100%)',
        minHeight: '420px'
      }}
      {...props}
    >
      <div className="container h-100">
        <div className="row align-items-center h-100 g-4">
          {/* Left Content */}
          <div className="col-lg-6">
            <div className="text-white pe-lg-4">
              {/* Title with Lock Icon */}
              <h1 className="display-4 fw-bold mb-4 lh-1">
                
                {title}
              </h1>

              {/* Description */}
              <p className="fs-5 mb-4 text-white-50 lh-base">
                {description}
              </p>

              {/* CTA Button */}
              <button
                className="btn btn-dark btn-lg px-4 py-3 fw-semibold rounded-3 d-flex align-items-center"
                onClick={onButtonClick}
                style={{ minWidth: '300px' }}
              >
                <span className="me-2">●</span>
                {buttonLabel}
              </button>
            </div>
          </div>

          {/* Right Content - Dashboard Image */}
          <div className="col-lg-6">
            <div className="text-center">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Security Dashboard"
                  className="img-fluid rounded-3 shadow-lg"
                  style={{ maxHeight: '280px', width: '100%', objectFit: 'cover' }}
                />
              ) : (
                /* Dashboard Placeholder */
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
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SecurityFeatures = ({ 
  className = '',
  title,
  features,
  ...props 
}) => {
  const defaultFeatures = [
    {
      id: 1,
      icon: <FaLock className="text-warning" size={32} />,
      title: 'End-to-End Encryption',
      description: 'AES-256 encryption across documents, messages, and attachments'
    },
    {
      id: 2,
      icon: <FaCloud className="text-muted" size={32} />,
      title: 'Hosted on AWS (India Region)',
      description: 'Enterprise-grade, secure, and scalable infrastructure'
    },
    {
      id: 3,
      icon: <FaCheckCircle className="text-success" size={32} />,
      title: 'ISO 27001 Certified',
      description: 'Third-party audits, data handling SOPs, and compliance readiness'
    },
    {
      id: 4,
      icon: <FaUsers className="text-primary" size={32} />,
      title: 'Strict Buyer-Vendor Access Control',
      description: 'Role-based internal access + vendor data isolation across RFQs'
    }
  ];

  const displayFeatures = features || defaultFeatures;

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
                  {/* Icon Container */}
                  <div className="flex-shrink-0 me-3">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle bg-light"
                      style={{ width: '60px', height: '60px' }}
                    >
                      {feature.icon}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-grow-1">
                    <h5 className="fw-bold mb-2 text-dark">
                      {feature.title}
                    </h5>
                    <p className="text-muted mb-0 lh-base">
                      {feature.description}
                    </p>
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
  title = "🔍 Audit-Ready. Private. Always in Control.",
  subtitle = "Workwise ensures full transparency for your team — and complete confidentiality from vendors.",
  features,
  ...props 
}) => {
  const defaultFeatures = [
    {
      id: 1,
      icon: <FaLock className="text-warning" size={28} />,
      title: 'Full Activity Trail',
      description: 'Track every action across RFQs, quote submissions, clarifications, and approvals'
    },
    {
      id: 2,
      icon: <FaFileAlt className="text-muted" size={28} />,
      title: 'Quote Version Tracking',
      description: 'Compare version histories across vendor submissions with time stamps'
    },
    {
      id: 3,
      icon: <FaCheck className="text-success" size={28} />,
      title: 'Role-Based Access',
      description: 'Set access limits per team member — per module or project'
    },
    {
      id: 4,
      icon: <FaShieldAlt className="text-muted" size={28} />,
      title: 'Vendor Data Isolation',
      description: "Vendors see only their RFQs. No visibility into others' quotes or history"
    },
    {
      id: 5,
      icon: <FaFolderOpen className="text-warning" size={28} />,
      title: 'Controlled Document Access',
      description: 'BOQs, drawings, and specs are only shared with selected vendors'
    },
    {
      id: 6,
      icon: <FaFileContract className="text-danger" size={28} />,
      title: 'NDA Enforcement',
      description: 'Enforce NDAs digitally before sharing confidential documents or terms'
    }
  ];

  const displayFeatures = features || defaultFeatures;

  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Header Section */}
        <div className="text-center mb-5">
          <h2 className="display-6 fw-bold text-dark mb-3">
            {title}
          </h2>
          <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
            {subtitle}
          </p>
        </div>

        {/* Features Grid */}
        <div className="row g-4">
          {displayFeatures.map((feature) => (
            <div key={feature.id} className="col-lg-4 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100 border-0">
                <div className="d-flex align-items-start">
                  {/* Icon */}
                  <div className="me-3 mt-1 flex-shrink-0">
                    {feature.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-grow-1">
                    <h5 className="fw-bold mb-2 text-dark">
                      {feature.title}
                    </h5>
                    <p className="text-muted mb-0 lh-base">
                      {feature.description}
                    </p>
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
  title = "📋 Fits Right Into Your Enterprise Stack",
  features,
  ...props 
}) => {
  const defaultFeatures = [
    {
      id: 1,
      icon: <FaLink className="text-muted" size={32} />,
      title: 'Works with SAP, Oracle, D365, StrategicERP & 3000+ more'
    },
    {
      id: 2,
      icon: <FaWhatsapp className="text-muted" size={32} />,
      title: 'WhatsApp + Email workflows'
    },
    {
      id: 3,
      icon: <FaLock className="text-muted" size={32} />,
      title: 'Optional SSO support'
    },
    {
      id: 4,
      icon: <FaFileAlt className="text-muted" size={32} />,
      title: 'IT onboarding & documentation available'
    }
  ];

  const displayFeatures = features || defaultFeatures;

  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold text-dark">
            {title}
          </h2>
        </div>

        {/* Features Row */}
        <div className="row justify-content-center g-4">
          {displayFeatures.map((feature) => (
            <div key={feature.id} className="col-lg-3 col-md-6 col-sm-6">
              <div className="text-center px-2">
                {/* Icon */}
                <div className="mb-3">
                  {feature.icon}
                </div>
                
                {/* Description */}
                <p className="text-muted mb-0 small lh-base">
                  {feature.title}
                </p>
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
      <HeroDataSafe
        title="Secure Procurement Platform"
        description="Enterprise-grade security for all your procurement needs"
        buttonLabel="Schedule a Demo"
        onButtonClick={() => console.log("Demo requested")}
        imageSrc="/path/to/dashboard-image.png"
      />
      <SecurityFeatures/>
      <AuditReadySection/>
      <EnterpriseStackIntegration/>
        <FaqSecuritySection />
    </>
  );
}

export default TrustSecurity
