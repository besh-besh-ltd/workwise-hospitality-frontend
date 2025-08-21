import Head from 'next/head';
import { Inter } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faPhone, faWrench, faShield, faClock, faEye, faUsers, faBuilding, faCheckCircle, faExclamationTriangle, faMoneyBill, faPlay, faCheck, faTimes, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import Slider from 'react-slick';
import { useEffect, useRef, useState } from 'react';

// Import slick carousel styles
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { HeroVideo } from '@/components/ui/HeroVideo';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { Button } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { CtaSection } from '@/components/ui/CtaSection';
import RegisterUserModal from '../modal/RegisterUserModal';
import BookCall from '@/components/bookCall';
import { Modal } from 'react-bootstrap';

// Import data
import { vendorPageData } from '@/components/constants/vendorPageData';

// Icon mapping for FAQ categories
const faqIconMap = {
  'FaRocket': faRocket,
  'FaBriefcase': faBuilding,
  'FaWrench': faWrench,
  'FaUsers': faUsers,
  'FaShield': faShield
};

const inter = Inter({ subsets: ['latin'] });

const ForVendors = () => {
  // Counting animation helper
  const AnimatedCounter = ({ targetValue, duration = 1500, suffix = '' }) => {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
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
        },
        { threshold: 0.4 }
      );
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, [targetValue, duration]);

    return (
      <div ref={ref}
        className="fw-bold text-primary"
        style={{ 
          fontSize: 'clamp(1.1rem, 7vw, 2.5rem)',
          background: 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {value.toLocaleString()}<span style={{ WebkitTextFillColor: 'currentColor' }}>{suffix}</span>
      </div>
    );
  };

  // Event handlers
  const handleStartSelling = () => {
    console.log('Start selling clicked');
    setShowRegistrationModal(true);
  };

  const handleTalkToVendorTeam = () => {
    // Redirect to contact us page instead of opening modal
    if (typeof window !== 'undefined') {
      window.location.href = '/contactus';
    }
  };

  const handleJoinNow = () => {
    console.log('Join now clicked');
    setShowRegistrationModal(true);
  };

  // const handleSeeToolsInAction = () => {
  //   console.log('See tools in action clicked');
  //   // Navigate to tools page
  //   window.open('/ai-tools', '_blank');
  // };

  // FAQ: track which category is expanded
  const [openCategoryIndex, setOpenCategoryIndex] = useState(null);
  
  // Registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  // Book a call modal state
  const [showCallModal, setShowCallModal] = useState(false);

  return (
    <>
      <main className={inter.className}>
        <style jsx>{`
          .company-logos-carousel .slick-slide {
            display: flex !important;
            justify-content: center;
            align-items: center;
          }
          .company-logos-carousel .slick-track {
            display: flex !important;
            align-items: center;
          }
          .company-logos-carousel .slick-list {
            overflow: hidden;
          }
          .company-logos-carousel .slick-slide img {
            margin: 0 auto;
          }
          
          /* Custom styles for testimonial cards */
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
            
            /* Stats inline tweak */
            .stat-inline { flex-wrap: nowrap !important; justify-content: space-between !important; gap: 8px; }
            .stat-inline > div { min-width: 0; }
            .stat-inline .text-muted { font-size: 0.78rem !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .stat-inline .fw-bold { font-size: 1.4rem !important; }
          }
          
          /* Enhanced card shadows */
          .card {
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
            transition: all 0.3s ease;
          }
          
          .card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
            transform: translateY(-2px);
          }

          /* FAQ SEO-friendly hiding */
          .faq-category-content.faq-collapsed {
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: all 0.3s ease;
            padding: 0;
            margin: 0;
            border: none;
          }
          
          .faq-category-content.faq-expanded {
            max-height: 2000px;
            opacity: 1;
            transition: all 0.3s ease;
          }
          
          .faq-category-content.faq-collapsed * {
            visibility: hidden;
          }
          
          .faq-category-content.faq-expanded * {
            visibility: visible;
          }
        `}</style>

        {/* Hero Section */}
        <HeroSection
          title={vendorPageData.hero.title}
          subtitle={vendorPageData.hero.subtitle}
          valueProps={vendorPageData.hero.valueProps}
          primaryButton={{
            ...vendorPageData.hero.primaryButton,
            onClick: handleStartSelling
          }}
          secondaryButton={{
            ...vendorPageData.hero.secondaryButton,
            onClick: handleTalkToVendorTeam
          }}
          visualContent={{
            video: <HeroVideo /> 
          }}
          mobileVideoContent={<HeroVideo />}
          layout="split"
          size="medium"
          textAlign="left"
        />

        {/* Trust & Security Section */}
        <section className="py-5 bg-light">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {vendorPageData.trustSection.title}
              </h2>
            </div>

            {/* Stats Cards */}
            <div className="row g-4 mb-5">
              {vendorPageData.trustSection.stats.map((stat, index) => (
                <div key={index} className="col-lg-6">
                                      <div className="card h-100 border-0 shadow-lg rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center justify-content-center mb-4">
                          <h4 className="fw-bold text-dark mb-0 fs-3">{stat.title}</h4>
                        </div>
                      {/* Stats: numbers on one line and labels below */}
                      <div className="d-flex flex-row justify-content-around text-center stat-inline">
                        {stat.items.map((item, itemIndex) => {
                          const [number] = item.split(' ', 2);
                          const remainingText = item.substring(number.length + 1);
                  return (
                            <div key={itemIndex} className="flex-fill d-flex flex-column align-items-center justify-content-center mb-3 mb-sm-0">
                              <AnimatedCounter 
                                targetValue={parseInt(number.replace(/[^0-9]/g, ''))} 
                                suffix={number.replace(/[0-9]/g, '')} 
                              />
                              <div className="text-muted fw-medium mt-1" style={{ fontSize: '0.9rem' }}>
                                {stat.title === 'Business Volume' && remainingText.startsWith('Cr ')
                                  ? (
                                    <>
                                      <span style={{ color: '#0EA5E9', fontWeight: 600 }}>Cr</span>{' '}
                                      {remainingText.slice(3)}
                                    </>
                                  )
                                  : remainingText}
                              </div>
                            </div>
                          );
                        })}
                            </div>
                          </div>
                        </div>
                      </div>
              ))}
            </div>

            {/* Vendors of Prominent PSUs */}
            <div className="text-center mb-5">
              <h3 className="fw-bold text-dark mb-4">Vendors of Prominent PSUs Are Onboard</h3>
              <div className="company-logos-carousel">
                <Slider {...vendorPageData.carouselSettings}>
                  {vendorPageData.trustSection.psuLogos.map((logo, index) => (
                    <div key={index}>
                      <img
                        src={logo}
                        alt=""
                        style={{
                          maxWidth: '120px',
                          maxHeight: '60px',
                          objectFit: 'contain',
                          filter: 'none',
                          opacity: '1',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </div>
                  ))}
              </Slider>
              </div>
            </div>

            {/* Testimonials */}
            <div className="text-center mb-4">
              <h3 className="fw-bold text-dark">What Suppliers Are Saying</h3>
            </div>
            <div className="row g-4 mb-5">
              {vendorPageData.trustSection.testimonials.map((testimonial, index) => (
                <div key={index} className="col-lg-4 col-md-6 col-12">
                  <TestimonialCard
                    className="testimonial-card-compact h-100"
                    quote={testimonial.quote}
                    authorName={testimonial.author}
                    authorTitle={testimonial.position}
                  />
                </div>
              ))}
            </div>

            {/* Security Features */}
            <div className="row g-4">
              {vendorPageData.trustSection.securityFeatures.map((feature, index) => (
                <div key={index} className="col-lg-3 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    {/* Desktop Layout - Centered */}
                    <div className="card-body p-4 text-center d-none d-md-block">
                      <div 
                        className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                        style={{
                          width: '48px',
                          height: '48px',
                          background: feature.iconBg,
                          color: 'white'
                        }}
                      >
                        <FontAwesomeIcon icon={feature.icon} style={{ fontSize: '16px' }} />
                      </div>
                      <h5 className="fw-bold text-dark mb-0">{feature.title}</h5>
                    </div>
                    
                    {/* Mobile Layout - Left aligned */}
                    <div className="card-body p-4 d-md-none d-flex align-items-center">
                      <div 
                        className="d-flex align-items-center justify-content-center rounded-circle me-3"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: feature.iconBg,
                          color: 'white',
                          flexShrink: 0
                        }}
                      >
                        <FontAwesomeIcon icon={feature.icon} style={{ fontSize: '20px' }} />
                      </div>
                      <h6 className="fw-bold text-dark mb-0 text-start">{feature.title}</h6>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Workwise Section */}
        <section className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">{vendorPageData.whyChooseSection.title}</h2>
            </div>

            {/* Benefits Cards */}
            <div className="row g-4 mb-5">
              {vendorPageData.whyChooseSection.cards.map((card, index) => (
                <div key={index} className="col-lg-4 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4 text-center">
                      <div 
                        className="d-flex align-items-center justify-content-center rounded-3 mx-auto mb-3"
                style={{
                          width: '64px',
                          height: '64px',
                          background: card.iconBg,
                          color: 'white'
                        }}
                      >
                        <FontAwesomeIcon icon={card.icon} style={{ fontSize: '24px' }} />
                      </div>
                      <h4 className="fw-bold text-dark mb-3">{card.title}</h4>
                      <p className="text-muted mb-0">{card.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button
                onClick={handleTalkToVendorTeam}
                variant="primary"
                size="lg"
              >
                <FontAwesomeIcon icon={faPhone} style={{ fontSize: '20px' }} />
                Talk to Vendor Success Team
              </Button>
            </div>
          </div>
        </section>

        {/* Demo Video Section */}
        <section className="py-5" style={{ background: '#1E293B' }}>
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-white mb-3" style={{ fontSize: '2.5rem' }}>
                How Workwise Helps You Get More Orders
              </h2>
              <p className="text-white mb-0" style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                Watch a quick walkthrough of how suppliers get RFQs, respond via WhatsApp/Email, and win orders.
              </p>
            </div>

            {/* Video Player */}
            <div className="row justify-content-center mb-5">
              <div className="col-12">
                <div 
                  className="video-container"
                  style={{
                    position: 'relative',
                    paddingBottom: '56.25%', // 16:9 aspect ratio
                    height: 0,
                    overflow: 'hidden',
                    maxWidth: '100%',
                    backgroundColor: '#000',
                    borderRadius: '16px'
                  }}
                >
                  <iframe
                    src="https://www.youtube.com/embed/-JPa1MX2HVE?autoplay=0&rel=0&modestbranding=1"
                    title="How Workwise Helps You Get More Orders"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '16px'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-center text-white mt-3 mb-0" style={{ opacity: 0.8 }}>
                  Powered by AI from IIT Bombay
                </p>
              </div>
            </div>

                         {/* CTA */}
             <div className="text-center">
               <Button 
                 onClick={() => setShowRegistrationModal(true)}
                 className="btn-secondary fw-bold text-white px-4 py-2 w-auto"
               >
                 <FontAwesomeIcon icon={faRocket} className="me-2" />
                 Create Your Free Supplier Account
               </Button>
             </div>
          </div>
        </section>

        {/* Smart Selling Tools Section */}
        <section className="py-5 bg-light">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">{vendorPageData.smartTools.title}</h2>
              <p className="text-muted fs-5 mb-0">{vendorPageData.smartTools.subtitle}</p>
            </div>

            {/* Tools Grid */}
            <div className="row g-4 mb-5">
              {vendorPageData.smartTools.tools.map((tool, index) => (
                <div key={index} className="col-lg-4 col-md-6">
                  <FeatureCard
                    icon={() => <FontAwesomeIcon icon={tool.icon} />}
                    iconBgColor="bg-white"
                    iconColor="text-dark"
                    title={tool.title}
                    description={tool.description}
                    className="h-100 text-center"
                style={{
                      borderTop: `4px solid ${tool.iconBg}`
                    }}
                  />
                </div>
              ))}
                </div>


                </div>
        </section>

        {/* Pricing Snapshot Section */}
        <section className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">{vendorPageData.pricingSection.title}</h2>
            </div>

            {/* Pricing Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="bg-dark text-white fw-bold px-4 py-3">Plan</th>
                      <th className="bg-primary text-white fw-bold text-center px-4 py-3">Enquiry Guarantee</th>
                      <th className="bg-success text-white fw-bold text-center px-4 py-3">AI Tools</th>
                      <th className="bg-warning text-white fw-bold text-center px-4 py-3">Visibility Boost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorPageData.pricingSection.plans.map((plan, index) => (
                      <tr key={index} style={{ background: index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'white' }}>
                        <td className="px-4 py-3 fw-medium text-dark">{plan.name}</td>
                        <td className="px-4 py-3 text-center">
                          {plan.enquiryGuarantee ? (
                            <span className="text-success">
                              <FontAwesomeIcon icon={faCheck} className="me-2" />
                              {plan.enquiryGuarantee}
                            </span>
                          ) : (
                            <span className="text-danger">
                              <FontAwesomeIcon icon={faTimes} />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {plan.aiTools ? (
                            <span className="text-success">
                              <FontAwesomeIcon icon={faCheck} />
                            </span>
                          ) : (
                            <span className="text-danger">
                              <FontAwesomeIcon icon={faTimes} />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center fw-medium">{plan.visibilityBoost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-4">
              <p className="text-muted mb-3">
                <a href="/pricing?tab=supplier" className="text-decoration-none fw-bold">
                  See Full Comparison →
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <CtaSection
          title={vendorPageData.finalCta.title}
          description={vendorPageData.finalCta.subtitle}
          primaryButton={{
            label: "Join Now",
            variant: "white",
            icon: "rocket",
            onClick: handleJoinNow
          }}
          secondaryButton={{
            label: "Talk to Vendor Success Team",
            variant: "outline-white",
            icon: "phone",
            onClick: handleTalkToVendorTeam
          }}
        />

        {/* FAQ Section */}
        <section className="py-5" style={{ background: '#F8FAFC' }}>
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3" style={{ fontSize: '2.5rem' }}>
                Frequently Asked Questions
              </h2>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                We've answered the most common questions suppliers ask us about Workwise, RFQs, tools, and getting started.
          </p>
        </div>

            {/* FAQ Categories */}
            <div className="row justify-content-center">
              <div className="col-lg-10">
                {vendorPageData.faqSection.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="mb-4">
                    {/* Category Header as dropdown trigger */}
                    <button
                      className="w-100 bg-transparent border-0 p-0 text-start"
                      onClick={() => setOpenCategoryIndex(openCategoryIndex === categoryIndex ? null : categoryIndex)}
                      aria-expanded={openCategoryIndex === categoryIndex}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{ 
                              width: '48px', 
                              height: '48px', 
                              background: category.iconBg 
                            }}
                          >
                            <FontAwesomeIcon 
                              icon={faqIconMap[category.icon]} 
                              style={{ fontSize: '1.5rem', color: 'white' }} 
                            />
                          </div>
                          <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '1.25rem' }}>
                            {category.title}
                          </h3>
                        </div>
                        <FontAwesomeIcon 
                          icon={openCategoryIndex === categoryIndex ? faChevronUp : faChevronDown}
                          className="text-muted"
                          style={{ fontSize: '1.2rem', transition: 'transform 0.2s ease' }}
                        />
                      </div>
                    </button>

                    <div 
                      className={`bg-white rounded shadow-sm p-4 faq-category-content ${openCategoryIndex === categoryIndex ? 'faq-expanded' : 'faq-collapsed'}`}
                      aria-hidden={openCategoryIndex !== categoryIndex}
                    >
                      <FaqAccordion 
                        questions={category.questions} 
                      />
                    </div>
                  </div>
                ))}
              </div>
                    </div>
          </div>
        </section>

        {/* Registration Modal */}
        <RegisterUserModal 
          showModal={showRegistrationModal}
          setShowModal={setShowRegistrationModal}
          showButton={false}
        />

        {/* Book a Call Modal */}
        <Modal
          show={showCallModal}
          onHide={() => setShowCallModal(false)}
          centered
          backdrop="static"
          style={{ backdropFilter: "blur(5px)" }}
        >
          <Modal.Header closeButton>
            <Modal.Title className="p-4">Contact Us</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <BookCall />
          </Modal.Body>
        </Modal>
      </main>
    </>
  );
};

export default ForVendors;