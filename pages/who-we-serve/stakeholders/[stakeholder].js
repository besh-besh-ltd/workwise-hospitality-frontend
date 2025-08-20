import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { DynamicCard } from '@/components/ui/DynamicCard';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { CtaSection } from '@/components/ui/CtaSection';
import { Button } from '@/components/ui/Button';
import ContactUsModal from '@/components/modal/contactUsModal';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';
import { stakeholdersPageData } from '@/components/constants/stakeholderPageData';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faUsers, faBriefcase, faCalculator, faShieldAlt, faClock, faLock } from '@fortawesome/free-solid-svg-icons';
import { TestimonialCard } from '@/components/ui/TestimonialCard';

const iconMap = {
  file: (props) => <FontAwesomeIcon icon={faFileAlt} {...props} />,
  users: (props) => <FontAwesomeIcon icon={faUsers} {...props} />,
  briefcase: (props) => <FontAwesomeIcon icon={faBriefcase} {...props} />,
  calculator: (props) => <FontAwesomeIcon icon={faCalculator} {...props} />,
  shield: (props) => <FontAwesomeIcon icon={faShieldAlt} {...props} />,
  clock: (props) => <FontAwesomeIcon icon={faClock} {...props} />,
  lock: (props) => <FontAwesomeIcon icon={faLock} {...props} />,
  // Additional common icons for features
  fileText: (props) => <FontAwesomeIcon icon={faFileAlt} {...props} />,
  user: (props) => <FontAwesomeIcon icon={faUsers} {...props} />,
  time: (props) => <FontAwesomeIcon icon={faClock} {...props} />,
  security: (props) => <FontAwesomeIcon icon={faShieldAlt} {...props} />,
  workflow: (props) => <FontAwesomeIcon icon={faBriefcase} {...props} />,
  analysis: (props) => <FontAwesomeIcon icon={faCalculator} {...props} />,
};

const ComparisonTable = ({ rows }) => (
  <div className="table-responsive">
    <table className="table align-middle">
      <thead>
        <tr>
          <th className="text-muted small">Procurement Activity</th>
          <th className="text-muted small">Without Workwise</th>
          <th className="text-muted small">With Workwise</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={idx}>
            <td className="fw-medium text-dark small">{r.activity}</td>
            <td className="text-danger small">{r.without}</td>
            <td className="text-success small">{r.with}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StakeholderPage = () => {
  const router = useRouter();
  const { stakeholder } = router.query;
  const key = typeof stakeholder === 'string' ? stakeholder.toLowerCase() : 'epcs';
  useEffect(() => {
    if (!router.isReady) return;
    const slug = typeof stakeholder === 'string' ? stakeholder.toLowerCase() : '';
    const vendorAliases = ['vendors', 'vendor', 'oems', 'oem', 'vendors-oems', 'vendors-and-oems', 'suppliers', 'supplier'];
    if (vendorAliases.includes(slug)) {
      router.replace('/for-vendors');
    }
  }, [router, router.isReady, stakeholder]);
  const data = stakeholdersPageData[key] || stakeholdersPageData['epcs'];

  const AnimatedCounter = ({ targetValue, suffix = '', duration = 1500 }) => {
    const [value, setValue] = React.useState(0);
    const ref = React.useRef(null);
    const hasAnimated = React.useRef(false);
    React.useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const start = performance.now();
            const animate = (now) => {
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
      <div ref={ref} className="fw-bold" style={{ fontSize: '1.75rem' }}>
        {value.toLocaleString()}<span>{suffix}</span>
      </div>
    );
  };

  const [showBookCall, setShowBookCall] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      <style jsx>{`
        /* Custom styles for testimonial cards on this page */
        .testimonial-card-compact .card-body {
          padding: 1rem !important;
        }
        .testimonial-card-compact .text-warning {
          font-size: 3rem !important;
          margin-bottom: 0.75rem !important;
        }
        .testimonial-card-compact blockquote {
          font-size: 1rem !important;
          line-height: 1.4 !important;
          margin-bottom: 1rem !important;
        }
        .testimonial-card-compact .d-flex.align-items-center {
          margin-top: auto;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          section {
            padding-top: 3rem !important;
            padding-bottom: 3rem !important;
          }
          
          h1, h2 {
            line-height: 1.3 !important;
          }
          
          h2.fs-1 {
            font-size: 2rem !important;
          }
          
          p {
            line-height: 1.5 !important;
          }
          
          .container {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          
          /* Enhanced card shadows for better visibility */
          .card {
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
            transition: all 0.3s ease;
          }
          
          .card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
            transform: translateY(-2px);
          }
        }
      `}</style>
      
      {/* Hero */}
      <HeroSection
        title={data.hero.title}
        subtitle={data.hero.subtitle}
        layout="centered"
        size="medium"
        textAlign="left"
        primaryButton={{ label: data.hero.buttonLabel, variant: 'black', onClick: () => setShowBookCall(true) }}
        showVisual={false}
      />

      {/* Benefits */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">Why Choose Workwise?</h2>
            <p className="text-muted fs-5 mb-0">Get measurable results from day one with features built specifically for procurement teams.</p>
          </div>
          <div className="row g-4 justify-content-center">
            {data.benefits.map((b, idx) => (
              <div key={idx} className="col-lg-4 col-md-6">
                <FeatureCard
                  title={b.title}
                  description={b.description}
                  icon={iconMap[b.icon]}
                  iconBgColor="bg-primary"
                  iconColor="text-white"
                  className="h-100 shadow-sm"
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Button 
              className="w-auto" 
              variant="primary" 
              size="lg"
              onClick={() => setShowBookCall(true)}
            >
              Book a Call
            </Button>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="py-5 bg-light">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">Trusted by Industry Leaders</h2>
            <p className="text-muted fs-5 mb-0">Join hundreds of companies who trust Workwise with their critical procurement workflows.</p>
          </div>

          {/* Stats Cards */}
          <div className="row g-4 mb-5 justify-content-center">
            {data.trust.counters.map((c, idx) => (
              <div key={idx} className="col-lg-3 col-md-6 col-6">
                <div className="card h-100 border-0 shadow-lg rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
                  <div className="card-body p-4 text-center">
                    <div className="mb-3">
                      <AnimatedCounter 
                        targetValue={parseInt((c.value||'').replace(/[^0-9]/g,''))} 
                        suffix={(c.value||'').replace(/[0-9]/g,'')} 
                      />
                    </div>
                    <div className="text-muted fw-medium" style={{ fontSize: '0.9rem' }}>
                      {c.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Security Features */}
          <div className="row g-4 mb-5">
            <div className="col-lg-3 col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4 text-center d-none d-md-block">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white'
                    }}
                  >
                    <FontAwesomeIcon icon={faShieldAlt} size="lg" />
                  </div>
                  <h5 className="fw-bold text-dark mb-0">ISO 27001 Certified</h5>
                </div>
                <div className="card-body p-4 d-md-none d-flex align-items-center">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle me-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <FontAwesomeIcon icon={faShieldAlt} />
                  </div>
                  <h6 className="fw-bold text-dark mb-0 text-start">ISO 27001 Certified</h6>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4 text-center d-none d-md-block">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      color: 'white'
                    }}
                  >
                    <FontAwesomeIcon icon={faLock} size="lg" />
                  </div>
                  <h5 className="fw-bold text-dark mb-0">Data Encryption</h5>
                </div>
                <div className="card-body p-4 d-md-none d-flex align-items-center">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle me-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <FontAwesomeIcon icon={faLock} />
                  </div>
                  <h6 className="fw-bold text-dark mb-0 text-start">Data Encryption</h6>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4 text-center d-none d-md-block">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                      color: 'white'
                    }}
                  >
                    <FontAwesomeIcon icon={faShieldAlt} size="lg" />
                  </div>
                  <h5 className="fw-bold text-dark mb-0">Cloud Security</h5>
                </div>
                <div className="card-body p-4 d-md-none d-flex align-items-center">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle me-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <FontAwesomeIcon icon={faShieldAlt} />
                  </div>
                  <h6 className="fw-bold text-dark mb-0 text-start">Cloud Security</h6>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4 text-center d-none d-md-block">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      color: 'white'
                    }}
                  >
                    <FontAwesomeIcon icon={faClock} size="lg" />
                  </div>
                  <h5 className="fw-bold text-dark mb-0">24/7 Monitoring</h5>
                </div>
                <div className="card-body p-4 d-md-none d-flex align-items-center">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-circle me-3"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <h6 className="fw-bold text-dark mb-0 text-start">24/7 Monitoring</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="text-center mb-4">
            <h3 className="fw-bold text-dark">What Our Customers Say</h3>
          </div>
          <div className="row g-4 mb-4">
            {data.trust.success.map((s, idx) => (
              <div key={idx} className="col-lg-4 col-md-6">
                <TestimonialCard 
                  quote={s.quote} 
                  authorName={s.author} 
                  className="h-100 shadow-sm testimonial-card-compact" 
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Button 
              className="w-auto" 
              variant="secondary" 
              size="lg"
              onClick={() => {
                window.location.href = '/contactus';
              }}
            >
              Let's Talk
            </Button>
          </div>
        </div>
      </section>

      {/* Functionalities */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">Functionalities That Matter</h2>
            <p className="text-muted fs-5 mb-0">Powerful features designed to streamline every step of your procurement process.</p>
          </div>
          <div className="row g-4 justify-content-center">
            {data.features.map((f, idx) => (
              <div key={idx} className="col-lg-4 col-md-6">
                <FeatureCard 
                  title={f.title} 
                  description={f.description}
                  icon={iconMap[f.icon] || iconMap['briefcase']}
                  iconBgColor="bg-success"
                  iconColor="text-white"
                  className="h-100 shadow-sm"
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Button 
              className="w-auto" 
              variant="primary" 
              size="lg"
              onClick={() => {
                const videoSection = document.getElementById('video-section');
                if (videoSection) {
                  videoSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              See It in Action
            </Button>
          </div>
        </div>
      </section>

      {/* Built for Heavy Industries Section */}
      <section className="py-5 bg-light">
        <div className="container">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">Built for Heavy Industries & Complex Projects</h2>
            <p className="text-muted fs-5 mb-0">Serving procurement teams across critical infrastructure and industrial projects worldwide.</p>
          </div>

          {/* Industries and Domains - Desktop Only */}
          <div className="row g-4 mb-5 d-none d-lg-flex">
            {/* Industries Card */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-4">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle me-3"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: '#10B981'
                      }}
                    >
                      <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                    </div>
                    <h4 className="fw-bold text-dark mb-0">We Support Projects In</h4>
                  </div>
                  <div className="row g-2">
                    {data.industries.map((industry, index) => (
                      <div key={index} className="col-12">
                        <div 
                          className="d-flex align-items-center p-3 rounded-3"
                          style={{ background: '#10B98115' }}
                        >
                          <FontAwesomeIcon icon={faBriefcase} className="me-3" style={{ fontSize: '20px' }} />
                          <span className="fw-medium text-dark">{industry}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Domains Card */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-4">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle me-3"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: '#10B981'
                      }}
                    >
                      <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                    </div>
                    <h4 className="fw-bold text-dark mb-0">And Cover These Technical Domains</h4>
                  </div>
                  <div className="row g-2">
                    {data.disciplines.map((domain, index) => (
                      <div key={index} className="col-12">
                        <div 
                          className="d-flex align-items-center p-3 rounded-3"
                          style={{ background: '#3B82F615' }}
                        >
                          <FontAwesomeIcon icon={faBriefcase} className="me-3" style={{ fontSize: '20px' }} />
                          <span className="fw-medium text-dark">{domain}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout - Stacked List */}
          <div className="d-lg-none mb-5">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h4 className="fw-bold text-dark mb-3">Industries:</h4>
                <div className="mb-4">
                  {data.industries.map((industry, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                      <span className="text-success me-2">✓</span>
                      <span className="fw-medium text-dark">{industry}</span>
                    </div>
                  ))}
                </div>
                
                <h4 className="fw-bold text-dark mb-3">Disciplines:</h4>
                <div className="mb-3">
                  {data.disciplines.map((domain, index) => (
                    <div key={index} className="d-flex align-items-center mb-2">
                      <span className="text-success me-2">✓</span>
                      <span className="fw-medium text-dark">{domain}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* See Workwise in Action Section */}
      <section id="video-section" className="py-5" style={{ background: '#1E293B' }}>
        <div className="container">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-white mb-3" style={{ fontSize: '2.5rem' }}>
              {data.video.title}
            </h2>
            <p className="text-white mb-0" style={{ fontSize: '1.1rem', opacity: 0.9 }}>
              {data.video.subtitle}
            </p>
          </div>

          {/* Video Player */}
          <div className="row justify-content-center mb-5">
            <div className="col-lg-10">
              <div className="card border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                <div className="ratio ratio-16x9">
                  <iframe
                    src="https://www.youtube.com/embed/-JPa1MX2HVE?si=DcUYfxiaX1Sd0akG"
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    style={{ borderRadius: '20px' }}
                  />
                </div>
              </div>
              <p className="text-center text-white mt-3 mb-0" style={{ opacity: 0.8 }}>
                Watch how Workwise transforms procurement workflows in real-time
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="d-flex align-items-center justify-content-center mb-4">
              <span className="text-white fw-medium" style={{ fontSize: '1.1rem' }}>Ready to see it in action?</span>
            </div>
            
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mb-4">
              <Button 
                className="w-auto" 
                variant="white" 
                size="lg"
                onClick={() => setShowRegister(true)}
              >
                Book a Demo
              </Button>
              <Button 
                className="w-auto text-white border-white" 
                variant="outline-white" 
                size="lg"
                style={{
                  color: 'white',
                  borderColor: 'white',
                  background: 'transparent'
                }}
                onClick={() => setShowBookCall(true)}
              >
                Let's Talk
              </Button>
            </div>

            {/* Features */}
            <div className="row justify-content-center">
              <div className="col-auto">
                <div className="d-flex align-items-center text-white small" style={{ opacity: 0.8 }}>
                  <span className="ms-2">No Credit Card Required</span>
                </div>
              </div>
              <div className="col-auto">
                <div className="d-flex align-items-center text-white small" style={{ opacity: 0.8 }}>
                  <span className="ms-2">15-min Setup</span>
                </div>
              </div>
              <div className="col-auto">
                <div className="d-flex align-items-center text-white small" style={{ opacity: 0.8 }}>
                  <span className="ms-2">Free Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* With vs Without - reuse homepage pattern: two-column rows */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">Why Workwise Is a No-Brainer</h2>
            <p className="text-muted fs-5 mb-0">Compare traditional procurement vs what it looks like with Workwise - and decide for yourself.</p>
          </div>
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive d-none d-lg-block">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th className="bg-dark text-white fw-bold px-4 py-3" style={{ width: '30%' }}>Procurement Activity</th>
                    <th className="bg-danger text-white fw-bold text-center px-4 py-3" style={{ width: '35%' }}>Without Workwise</th>
                    <th className="bg-success text-white fw-bold text-center px-4 py-3" style={{ width: '35%' }}>With Workwise</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparison.map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? '' : ''}>
                      <td className="px-4 py-3 fw-medium text-dark">{r.activity}</td>
                      <td className="px-4 py-3 text-danger">{r.without}</td>
                      <td className="px-4 py-3 text-success">{r.with}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile stacked */}
            <div className="d-lg-none p-3">
              {data.comparison.map((r, i) => (
                <div key={i} className="card border-0 shadow-sm mb-3" style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : '#fff' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                      <h6 className="fw-bold text-dark mb-0">{r.activity}</h6>
                    </div>
                    <div className="d-flex flex-column g-2">
                      <div className="d-flex align-items-center mb-2">
                        <small className="text-danger fw-bold me-2">Without:</small>
                        <span className="text-danger" style={{ fontSize: '0.9rem' }}>{r.without}</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <small className="text-success fw-bold me-2">With:</small>
                        <span className="text-success" style={{ fontSize: '0.9rem' }}>{r.with}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-5">
            <Button 
              className="w-auto" 
              variant="primary" 
              size="lg"
              onClick={() => setShowBookCall(true)}
            >
              Book a Call
            </Button>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-5" style={{ background: '#F8FAFC' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3" style={{ fontSize: '2.5rem' }}>
              Frequently Asked Questions
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
              Common questions about Workwise features, implementation, and procurement workflows.
            </p>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="bg-white rounded shadow-sm p-4">
                <FaqAccordion questions={data.faqs} />
              </div>
            </div>
          </div>
          <div className="text-center mt-5">
            <Button 
              className="w-auto" 
              variant="secondary" 
              size="lg"
              onClick={() => setShowBookCall(true)}
            >
              Let's Talk
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CtaSection
        title={data.hero.title}
        description={data.hero.subtitle}
        primaryButton={{ label: data.hero.buttonLabel, variant: 'white', onClick: () => setShowBookCall(true) }}
        className="mt-0"
      />

      {/* Global Modals */}
      <ContactUsModal
        showModal={showBookCall}
        fromType={'stakeholders'}
        closeModal={() => setShowBookCall(false)}
      />
      <RegisterFormModal
        show={showRegister}
        onClose={() => setShowRegister(false)}
        title="Book a Demo"
        subtitle="Tell us a bit about your team."
        fields={[
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Work Email', type: 'email', required: true },
          { name: 'company', label: 'Company', type: 'text', required: true },
          { name: 'phone', label: 'Phone', type: 'text', required: false },
          { name: 'terms', label: 'I agree to be contacted by Workwise', type: 'checkbox', required: true }
        ]}
        onSubmit={async () => setShowRegister(false)}
      />
    </>
  );
};

export default StakeholderPage;
