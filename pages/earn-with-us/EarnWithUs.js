import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { HeroSection } from '@/components/ui/HeroSection'
import React, { useEffect, useRef, useState } from 'react'
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';
import { contactUsFormService, registerInterestService } from '@/services/contact';

// Import data
import { earnWithUsData } from '@/components/constants/earnWithUsData';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaVideo, 
  FaFileAlt,
  FaUsers,
  FaPlay,
  FaTrendingUp,
  FaTarget,
  FaCoins,
  FaSitemap,
  FaHome,
  FaNetworkWired,
  FaUser,
  FaHardHat,
  FaHeadset,
  FaBullseye, FaDollarSign, FaCreditCard, FaChartLine,
  FaHandshake,
  FaUserPlus,
  FaLink,
  FaChartPie
} from 'react-icons/fa';
import { FaRocket, FaComments } from 'react-icons/fa';





const HowItWorksSection = ({ 
  className,
  title = earnWithUsData.howItWorks.title,
  steps,
  earningsHighlight = earnWithUsData.howItWorks.earningsHighlight,
  ctaButton = earnWithUsData.howItWorks.ctaButton,
  ...props 
}) => {
  const getFaIcon = (iconName, size = 28) => {
    const map = {
      'user': <FaUser size={size} color="#ffffff" />,
      'file-alt': <FaFileAlt size={size} color="#ffffff" />,
      'handshake': <FaHandshake size={size} color="#ffffff" />,
      'dollar-sign': <FaDollarSign size={size} color="#ffffff" />,
    };
    return map[iconName] || <FaUser size={size} color="#ffffff" />;
  };

  const defaultSteps = earnWithUsData.howItWorks.steps.map(step => ({
    id: step.id,
    icon: step.icon,
    iconBg: step.color,
    title: step.title,
    description: step.description
  }));

  const stepsToShow = steps || defaultSteps;

  return (
    <section className={`py-5 bg-light ${className || ''}`} {...props}>
      <div className="container">
        {/* Section Title */}
        <div className="text-center mb-5">
          <h2 className="h2 fw-bold text-dark mb-4">
            <i className="bi bi-gear-fill text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
            {title}
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="row justify-content-center mb-5">
          {stepsToShow.map((step, index) => (
            <div key={step.id} className="col-lg-3 col-md-6 mb-4">
              {/* Card Container */}
              <div className="card h-100 border-0 shadow-sm bg-white">
                <div className="card-body text-center p-4">
                  {/* Step Icon with Badge */}
                  <div className="position-relative d-inline-block mb-3">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{ 
                        width: '70px', 
                        height: '70px',
                        backgroundColor: step.iconBg
                      }}
                    >
                      {getFaIcon(step.icon, 28)}
                    </div>
                    
                    {/* Number Badge */}
                    <span 
                      className="position-absolute top-0 start-100 translate-middle d-flex align-items-center justify-content-center bg-dark text-white rounded-circle fw-bold"
                      style={{ 
                        width: '24px', 
                        height: '24px',
                        fontSize: '0.75rem',
                        marginLeft: '-12px',
                        marginTop: '-4px'
                      }}
                    >
                      {step.id}
                    </span>
                  </div>

                  {/* Step Content */}
                  <h5 className="fw-bold text-dark mb-3">
                    {step.title}
                  </h5>
                  <p className="text-muted mb-0 lh-base" style={{ fontSize: '0.98rem' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Earnings Highlight */}
        {earningsHighlight !== false && (
          <div className="text-center mb-4">
            <div 
              className="d-inline-flex align-items-center px-5 py-3 rounded-pill"
              style={{ 
                backgroundColor: '#fff3cd',
                border: '1px solid #f0c419',
                fontSize: '1.05rem',
                fontWeight: 600
              }}
            >
              <i className="bi bi-star-fill text-warning me-2"></i>
              <span className="fw-semibold text-dark">
                {earningsHighlight?.text || "Earn 25% in Year 1 + 10% on renewals. Just 4 buyer referrals = ₹2.5L+/month"}
              </span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {ctaButton !== false && (
          <div className="text-center">
            <button
              className="btn btn-primary btn-lg px-4 py-3 fw-semibold rounded-3"
              onClick={ctaButton?.onClick}
              style={{ 
                minWidth: '250px',
                fontSize: '1rem'
              }}
            >
              <i className={`bi bi-${ctaButton?.icon || 'link'} me-2`}></i>
              {ctaButton?.label || "Make an Introduction"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};


const WebinarComponent = ({ onRegister }) => {
  return (
    <div className="container-fluid p-0">
      <div 
        className="row g-0 rounded-4 overflow-hidden shadow-lg mx-auto" 
        style={{ maxWidth: '1000px', background: 'linear-gradient(135deg, #2E5BBA 0%, #41B8A8 100%)' }}
      >
        {/* Left Side - Image */}
        <div className="col-md-6 p-0">
          <div className="position-relative h-100 d-flex align-items-center justify-content-center p-4">
            <div 
              className="bg-white rounded-3 shadow-lg p-3"
              style={{ width: '90%', aspectRatio: '16/10' }}
            >
              {/* Simulated video call interface */}
              <div className="row g-2 h-100">
                {/* Main presenter */}
                <div className="col-6">
                  <div 
                    className="bg-primary rounded-2 h-100 d-flex align-items-center justify-content-center position-relative"
                    style={{ background: 'linear-gradient(45deg, #4c63d2, #6366f1)' }}
                  >
                    <div className="text-white text-center">
                      <FaUsers size={24} className="mb-2 opacity-75" />
                      <div style={{ fontSize: '12px' }}>Presenter</div>
                    </div>
                  </div>
                </div>
                
                {/* Charts/Analytics */}
                <div className="col-6">
                  <div className="h-100 d-flex flex-column gap-2">
                    {/* Chart 1 */}
                    <div 
                      className="bg-primary rounded-2 flex-grow-1 d-flex align-items-center justify-content-center"
                      style={{ background: '#1a1d29' }}
                    >
                      <div className="d-flex align-items-end gap-1">
                        <div className="bg-info" style={{ width: '8px', height: '20px', borderRadius: '1px' }}></div>
                        <div className="bg-success" style={{ width: '8px', height: '25px', borderRadius: '1px' }}></div>
                        <div className="bg-warning" style={{ width: '8px', height: '15px', borderRadius: '1px' }}></div>
                        <div className="bg-danger" style={{ width: '8px', height: '30px', borderRadius: '1px' }}></div>
                      </div>
                    </div>
                    
                    {/* Chart 2 */}
                    <div 
                      className="bg-primary rounded-2 flex-grow-1 d-flex align-items-center justify-content-center"
                      style={{ background: '#1a1d29' }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        <div 
                          className="bg-info rounded-circle"
                          style={{ width: '20px', height: '20px' }}
                        ></div>
                        <div style={{ fontSize: '10px', color: '#fff' }}>Analytics</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom charts */}
                <div className="col-12" style={{ height: '30%' }}>
                  <div className="row g-2 h-100">
                    <div className="col-6">
                      <div 
                        className="bg-primary rounded-2 h-100 d-flex align-items-center justify-content-center"
                        style={{ background: '#1a1d29' }}
                      >
                        <div className="d-flex align-items-end gap-1">
                          {[15, 25, 20, 35, 30, 40].map((height, i) => (
                            <div 
                              key={i}
                              className="bg-primary" 
                              style={{ 
                                width: '4px', 
                                height: `${height}%`, 
                                borderRadius: '1px',
                                opacity: 0.8 
                              }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div 
                        className="bg-primary rounded-2 h-100 d-flex align-items-center justify-content-center"
                        style={{ background: '#1a1d29' }}
                      >
                        <svg width="40" height="20">
                          <path 
                            d="M 2 10 Q 10 5 20 8 T 38 12" 
                            stroke="#17a2b8" 
                            strokeWidth="2" 
                            fill="none"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Audience silhouettes */}
            <div className="position-absolute bottom-0 start-0 p-3">
              <div className="d-flex gap-2">
                {[1, 2, 3].map((_, i) => (
                  <div 
                    key={i}
                    className="bg-dark rounded-circle opacity-25"
                    style={{ 
                      width: '40px', 
                      height: '40px',
                      background: 'rgba(0,0,0,0.3)' 
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="col-md-6 bg-white p-0">
          <div className="p-4 h-100 d-flex flex-column">
            {/* Header */}
            <div className="mb-4">
              <div className="d-flex align-items-center mb-3">
                <FaCalendarAlt className="text-primary me-2" size={20} />
                <h4 className="mb-0 fw-bold text-dark">
                  {earnWithUsData.webinar.title}
                </h4>
              </div>
              
              <p className="text-muted mb-4" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                {earnWithUsData.webinar.description}
              </p>
            </div>

            {/* Schedule Details */}
            <div className="mb-4 flex-grow-1">
              <div className="d-flex align-items-center mb-3">
                <FaCalendarAlt className="text-warning me-3" size={16} />
                <span className="fw-semibold text-dark">{earnWithUsData.webinar.schedule.days}</span>
              </div>
              
              <div className="d-flex align-items-center mb-3">
                <FaClock className="text-warning me-3" size={16} />
                <span className="fw-semibold text-dark">{earnWithUsData.webinar.schedule.time}</span>
              </div>
              
              <div className="d-flex align-items-center mb-4">
                <FaVideo className="text-warning me-3" size={16} />
                <span className="fw-semibold text-dark">{earnWithUsData.webinar.schedule.platform}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              <button 
                className="btn btn-primary btn-lg w-100 py-3 mb-3 fw-semibold d-flex align-items-center justify-content-center"
                style={{ 
                  border: 'none',
                  borderRadius: '8px'
                }} 
                onClick={() => onRegister && onRegister('Webinar Registration')}
              >
                <FaUsers className="me-2" />
                {earnWithUsData.webinar.ctaButton}
              </button>

              {/* For Now, we are not showing the past webinars link */}
              
              {/* <div className="text-center">
                <a 
                  href="#" 
                  className="text-primary text-decoration-none d-flex align-items-center justify-content-center"
                  style={{ fontSize: '14px' }}
                >
                  <FaPlay className="me-2" size={12} />
                  {earnWithUsData.webinar.pastWebinarsLink}
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const WhoIsThisForComponent = ({ onJoin }) => {
  const allItems = earnWithUsData.targetAudience;
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12">
          <div className="text-center mb-5">
            <div className="d-flex align-items-center justify-content-center mb-4">
              <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                Who Is This For?
              </h2>
            </div>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="row g-4 mb-5">
                {allItems.map((item) => (
                  <div key={item.id} className="col-12 col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          background: 'linear-gradient(135deg, #4a90a4 0%, #5fa8c0 100%)'
                        }}
                      >
                        <FaUser className="text-white" size={20} />
                      </div>
                      <h5 className="mb-0 fw-semibold text-dark" style={{ fontSize: '1.05rem' }}>
                        {item.title}
                      </h5>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="text-muted mb-4" style={{ fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 2rem' }}>
                  Have contacts in industrial, manufacturing, or procurement sectors? You're a perfect fit!
                </p>
                <button onClick={() => onJoin && onJoin('Partner Registration')} className="btn btn-primary w-auto px-4 py-3 fw-semibold d-inline-flex align-items-center" style={{ border: 'none', borderRadius: '8px', fontSize: '1rem' }}>
                  <FaUserPlus className="me-2" size={16} />
                  Join as a Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



const PartnerStatsSection = () => {
  const AnimatedCounter = ({ targetValue, duration = 1500, suffix = '' }) => {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const start = performance.now();
            const animate = now => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(eased * targetValue));
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      }, { threshold: 0.4 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, [targetValue, duration]);

    return (
      <div ref={ref} className="fw-bold" style={{ fontSize: '2rem' }}>
        {value.toLocaleString()}<span>{suffix}</span>
      </div>
    );
  };

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="fw-bold text-dark mb-2" style={{ fontSize: '2rem' }}>How Our Partners Are Performing</h2>
          <p className="text-muted mb-0">Live snapshot of referrals, closures, and total earnings</p>
        </div>

        <div className="row g-4 justify-content-center">
          {/* Referrals */}
          <div className="col-12 col-md-4">
            <div className="rounded-4 shadow-sm p-4 h-100 text-center" style={{ borderTop: '5px solid #3B82F6', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
              <div className="text-dark" style={{ fontWeight: 800, fontSize: '3rem', lineHeight: 1, color: '#3B82F6' }}>
                <AnimatedCounter targetValue={114} duration={1600} />
              </div>
              <div className="mt-2 fw-semibold" style={{ fontSize: '1.1rem' }}>Referrals</div>
            </div>
          </div>

          {/* Sales Closed */}
          <div className="col-12 col-md-4">
            <div className="rounded-4 shadow-sm p-4 h-100 text-center" style={{ borderTop: '5px solid #10B981', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
              <div className="text-dark" style={{ fontWeight: 800, fontSize: '3rem', lineHeight: 1, color: '#10B981' }}>
                <AnimatedCounter targetValue={60} duration={1600} />
              </div>
              <div className="mt-2 fw-semibold" style={{ fontSize: '1.1rem' }}>Sales Closed</div>
            </div>
          </div>

          {/* Earnings */}
          <div className="col-12 col-md-4">
            <div className="rounded-4 shadow-sm p-4 h-100 text-center" style={{ borderTop: '5px solid #F59E0B', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
              <div className="text-dark" style={{ fontWeight: 800, fontSize: '3rem', lineHeight: 1, color: '#F59E0B' }}>
                <AnimatedCounter targetValue={44} duration={1600} suffix="L" />
              </div>
              <div className="mt-2 fw-semibold" style={{ fontSize: '1.1rem' }}>Earnings</div>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <button className="btn btn-primary w-auto px-4 py-3 fw-semibold" style={{ borderRadius: '10px' }}>
            Start Earning Now
          </button>
        </div>
      </div>
    </section>
  );
};




const faqList = earnWithUsData.faqs;

const FaqSection = () => (
  <section className="py-5 bg-light">
    <div className="container">
      <h2 className="h3 fw-bold text-center mb-4">
        Frequently Asked Questions
      </h2>

      <FaqAccordion questions={faqList} />
    </div>
  </section>
);


const WorkwisePartnerComponent = () => {
  const getIcon = (iconName) => {
    const iconMap = {
      'dollar-sign': <FaDollarSign className="text-primary" size={24} />,
      'equals': <FaCreditCard className="text-success" size={24} />,
      'hand-holding': <FaHeadset className="text-warning" size={24} />,
      'building': <FaChartLine className="text-info" size={24} />
    };
    return iconMap[iconName] || <FaDollarSign className="text-primary" size={24} />;
  };

  const features = earnWithUsData.benefits.map(item => ({
    id: item.id,
    icon: getIcon(item.icon),
    iconBg: `rgba(${item.color === '#007bff' ? '13, 110, 253' : item.color === '#28a745' ? '25, 135, 84' : item.color === '#ffc107' ? '255, 193, 7' : '13, 202, 240'}, 0.1)`,
    title: item.title,
    description: item.description || 'Benefit description'
  }));

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                Why Become a Workwise Partner?
              </h2>
            </div>
          </div>

          {/* Features Grid */}
            <div className="row g-4 justify-content-center">
              {features.map((feature) => (
                <div key={feature.id} className="col-lg-5 col-md-6">
                  <div className="d-flex align-items-start justify-content-start">
                  {/* Icon */}
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-4"
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      background: feature.iconBg
                    }}
                  >
                    {feature.icon}
                  </div>
                  {/* Content */}
                  <div className="flex-grow-1">
                    <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '1.25rem' }}>
                      {feature.title}
                    </h4>
                    <p 
                      className="text-muted mb-0" 
                      style={{ 
                        fontSize: '1rem', 
                        lineHeight: '1.6',
                        color: '#6c757d !important'
                      }}
                    >
                      {feature.description || 'Benefit description'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};




const JoinPartnersCTAComponent = ({ onPrimaryClick, onSecondaryClick }) => {
  return (
    <div 
      className="py-5"
      style={{ 
        background: 'linear-gradient(135deg, #2E5BBA 0%, #41B8A8 100%)',
        minHeight: '300px'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 text-center">
            
            {/* Header Section */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-center mb-4">
                <FaRocket className="text-white me-3" size={32} />
                <h1 
                  className="mb-0 fw-bold text-white" 
                  style={{ 
                    fontSize: '2.5rem',
                    lineHeight: '1.2'
                  }}
                >
                  {earnWithUsData.bottomCta.title}
                </h1>
              </div>
              
              <p 
                className="text-white mb-5" 
                style={{ 
                  fontSize: '1.25rem',
                  opacity: '0.95',
                  maxWidth: '600px',
                  margin: '0 auto 3rem'
                }}
              >
                {earnWithUsData.bottomCta.subtitle}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="d-flex flex-wrap justify-content-center gap-3">
              {/* Primary CTA - Register */}
              <button 
                className="btn btn-lg px-5 py-3 fw-semibold d-flex align-items-center"
                onClick={onPrimaryClick}
                style={{ 
                  backgroundColor: '#2E5BBB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  minWidth: '300px',
                  boxShadow: '0 4px 12px rgba(122, 119, 119, 0.15)'
                }}
              >
                {earnWithUsData.bottomCta.primaryButton.label}
              </button>

              {/* Secondary CTA - Talk to Team */}
              <button 
                className="btn btn-lg px-5 py-3 fw-semibold w-auto d-flex align-items-center"
                onClick={onSecondaryClick}
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#2E5BBA',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  minWidth: '300px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {earnWithUsData.bottomCta.secondaryButton.label}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};




const EarnWithUs = () => {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Register Your Interest');

  const openRegister = (title) => {
    if (title) setModalTitle(title);
    setShowRegisterModal(true);
  };

  const handleSecondaryCTA = () => {
    window.location.href = '/contactus';
  };

  const onSubmitRegister = async (values) => {
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      subject: modalTitle,
      comment: values.message || 'Earn With Us form submission',
      submitted_from: 'earn-with-us'
    };
    // Hit the alias endpoint that reuses contact-us controller
    await registerInterestService(payload);
  };

  return (
    <>
    <HeroSection
  title={earnWithUsData.hero.title}
  subtitle={earnWithUsData.hero.subtitle}
  primaryButton={{
    label: earnWithUsData.hero.primaryButton.label,
    variant: earnWithUsData.hero.primaryButton.variant,
    icon: "person-plus",
    onClick: () => openRegister('Partner Registration')
  }}
  secondaryButton={{
    label: earnWithUsData.hero.secondaryButton.label,
    variant: earnWithUsData.hero.secondaryButton.variant,
    onClick: handleSecondaryCTA
  }}
/>
<HowItWorksSection ctaButton={{ onClick: () => openRegister('Make an Introduction') }} />
<WebinarComponent onRegister={openRegister} />
<WorkwisePartnerComponent />
<WhoIsThisForComponent onJoin={openRegister} />
<PartnerStatsSection/>

<FaqSection />

<JoinPartnersCTAComponent onPrimaryClick={() => openRegister('Register To Become A Partner')} onSecondaryClick={handleSecondaryCTA} />

      {/* Register Interest Modal */}
      <RegisterFormModal
        show={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title={modalTitle}
        subtitle={"Please fill in your details and our team will contact you shortly."}
        fields={[
          { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your name' },
          { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
          { name: 'phone', label: 'Phone', type: 'text', required: true, placeholder: '+91-XXXXXXXXXX' },
          { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: 'Optional message' },
          { name: 'agree', label: 'I agree to be contacted by Workwise', type: 'checkbox', required: true },
        ]}
        onSubmit={onSubmitRegister}
        successMessage={"Thanks! Our partnership team will reach out soon."}
      />
    </>
  )
}

export default EarnWithUs
