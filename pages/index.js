import Head from 'next/head'
import { Inter } from 'next/font/google'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faBriefcase, faFileAlt, faListUl, faCalculator, faFileContract, faRocket, faPlay, faShield, faUsers, faBuilding, faCloud, faLock, faBrain, faHammer, faSearch, faWrench, faPhone, faClock, faEye, faTimes, faCheck, faExclamationTriangle, faPaperPlane, faCopy, faTable, faChartLine, faEnvelope, faQuestionCircle, faHourglassHalf, faBolt, faDollarSign, faPercent, faCheckSquare, faChartColumn, faComments, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { faCirclePlay } from '@fortawesome/free-regular-svg-icons';
import Slider from 'react-slick';
import { FaMicrochip, FaProjectDiagram, FaRobot, FaWrench } from 'react-icons/fa';

// Import slick carousel styles
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { HeroVideo } from '@/components/ui/HeroVideo';
import { ColourfulCard } from '@/components/ui/ColourfulCard';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { Button } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import BookCall from '@/components/bookCall';
import { Modal } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'react';

// Import data
import { homepageData } from '@/components/constants/homepageData';

// Icon mapping for FAQ categories
const faqIconMap = {
  'FaChartColumn': faChartColumn,
  'FaPaperPlane': faPaperPlane,
  'FaUsers': faUsers,
  'FaChartLine': faChartLine,
  'FaWrench': faWrench,
  'FaShield': faShield,
  'FaCheckSquare': faCheckSquare,
  'FaBuilding': faBuilding
};

const inter = Inter({ subsets: ['latin'] })

const pageInfo = {
    title: "Workwise: Find PSU Approved Vendors, Automate RFQs, Compare Rates",
    description: "Workwise saves 5% on costs and 90% on time. Find PSU approved vendors, automate RFQs, compare rates, and streamline procurement for EPCs, contractors & industrial buyers.",
    keywords: "PSU approved vendors, procurement automation, RFQ automation, vendor comparison, EPC procurement, contractor procurement, industrial procurement, capex procurement",
    ogImage: "/assets/images/workwise-og-image.jpg",
    ogUrl: "https://workwise.in"
}

export default function Home() {
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
  const handleBookCall = () => {
    // Open the CallNowModal
    setShowCallModal(true);
  };

  const handleTryFreeTools = () => {
    // Scroll to tools section
    const toolsSection = document.getElementById('free-tools-section');
    if (toolsSection) {
      toolsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreVendorTools = () => {};

  const handleVendorSupport = () => {
    // Redirect to contact us page
    window.location.href = '/contactus';
  };

  // FAQ: track which category is expanded
  const [openCategoryIndex, setOpenCategoryIndex] = useState(null);

  // CallNowModal state
  const [showCallModal, setShowCallModal] = useState(false);

  // Demo video modal state for "See How Workwise Simplifies" section
  const [showPortalDemoModal, setShowPortalDemoModal] = useState(false);

  const handleToolClick = (toolName) => {};

  return (
    <>
      <Head>
        <title>{pageInfo.title}</title>
        <meta name="description" content={pageInfo.description} />
        <meta name="keywords" content={pageInfo.keywords} />
        <meta property="og:title" content={pageInfo.title} />
        <meta property="og:description" content={pageInfo.description} />
        <meta property="og:image" content={pageInfo.ogImage} />
        <meta property="og:url" content={pageInfo.ogUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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
            
            /* Ensure clear section separation */
            section + section {
              border-top: 1px solid rgba(0,0,0,0.05);
            }
            
            /* Prevent text wrapping in mobile */
            h1, h2, h3, h4, h5, h6 {
              white-space: normal !important;
              word-wrap: break-word !important;
              line-height: 1.2 !important;
            }
            
            /* Optimize card layouts for mobile */
            .card-body {
              padding: 1rem !important;
            }

            /* Stats inline tweak */
            .stat-inline { flex-wrap: nowrap !important; justify-content: space-between !important; gap: 8px; }
            .stat-inline > div { min-width: 0; }
            .stat-inline .text-muted { font-size: 0.78rem !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .stat-inline .fw-bold { font-size: 1.4rem !important; }
            
            /* Ensure proper spacing between sections */
            .py-5 {
              padding-top: 2.5rem !important;
              padding-bottom: 2.5rem !important;
            }
          }
          
          /* Better section separation */
          section {
            position: relative;
          }
          
          section:not(:last-child)::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            height: 1px;
            background: linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent);
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

          /* FAQ SEO-friendly hiding - content always in DOM but visually hidden */
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
          
          /* Ensure content is accessible to screen readers even when collapsed */
          .faq-category-content.faq-collapsed * {
            visibility: hidden;
          }
          
          .faq-category-content.faq-expanded * {
            visibility: visible;
          }

          /* Mobile-first responsive design */
          @media (max-width: 767px) {
            /* Ensure proper spacing in mobile carousel */
            .company-logos-carousel .slick-slide {
              padding: 0 8px !important;
              margin: 0 4px !important;
            }
            
            .company-logos-carousel .slick-track {
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            
            .company-logos-carousel .slick-list {
              padding: 0 10px !important;
            }
            
            .company-logos-carousel .slick-slide img {
              max-width: 100px !important;
              max-height: 50px !important;
              margin: 0 auto !important;
            }
          }
          
          /* Desktop carousel spacing */
          @media (min-width: 768px) {
            .company-logos-carousel .slick-slide {
              padding: 0 12px !important;
              margin: 0 6px !important;
            }
            
            .company-logos-carousel .slick-list {
              padding: 0 20px !important;
            }
            
            .company-logos-carousel .slick-slide img {
              max-width: 120px !important;
              max-height: 60px !important;
              margin: 0 auto !important;
            }
          }
          
          /* Ensure carousel logos don't overlap */
          .company-logos-carousel .slick-slide {
            opacity: 1 !important;
            transition: opacity 0.3s ease !important;
          }
          
          .company-logos-carousel .slick-slide:hover {
            opacity: 0.8 !important;
          }
          
          /* Fix carousel track alignment */
          .company-logos-carousel .slick-track {
            display: flex !important;
            align-items: center !important;
          }
          
          .company-logos-carousel .slick-slide {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          /* Ensure clear section separation */
          section + section {
            border-top: 1px solid rgba(0,0,0,0.05);
          }

          /* Video section sizing (desktop) */
          @media (min-width: 992px) {
            .video-section-player { 
              max-width: 820px; 
              margin: 0 auto; 
            }
          }
        `}</style>
        {/* Hero Section */}
        {/* <div style={{position: 'relative'}}> */}
        <HeroSection
          title={homepageData.hero.title}
          subtitle={homepageData.hero.subtitle}
          valueProps={homepageData.hero.valueProps}
          primaryButton={{
            ...homepageData.hero.primaryButton,
            id: "primary_cta-hero-landing_page",
            onClick: handleBookCall
          }}
          secondaryButton={{
            ...homepageData.hero.secondaryButton,
            id: "try_free_tools-hero-landing_page",
            onClick: handleTryFreeTools
          }}
          visualContent={{
            video: <HeroVideo /> 
          }}
          mobileVideoContent={<HeroVideo />}
          layout="split"
          size="large"
          textAlign="left"
        >
        </HeroSection>
        {/* Floating Icons
         <div
            className="floatingIcon floatA d-none d-lg-block"
            style={{ top: "19%", left: "52%" }}
          >
            <FaRobot size={20} />
          </div>
          <div
            className="floatingIcon floatB d-none d-md-block"
            style={{ top: "45%", left: "93%" }}
          >
            <FaMicrochip size={20} />
          </div>
          <div
            className="floatingIcon floatC d-none d-md-block"
            style={{ top: "76%", left: "52%" }}
          >
            <FaProjectDiagram size={20} />
          </div>
        </div> */}
        
        {/* Free Tools Section */}
        <section id="free-tools-section" className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                4 Tools That Make Procurement 10X Faster & Smarter
              </h2>
              <p className="text-muted fs-5 mb-0">
                Try our <span style={{ color: '#0EA5E9', fontWeight: '600' }}>free</span> tools, made for project buyers like you. Save hours, avoid errors, and get instant insights.
              </p>
            </div>

            {/* Tool Cards Grid */}
            <div className="row g-4 mb-5">
              {homepageData.toolCards.map((tool, index) => (
                <div key={index} className="col-lg-6">
                  <ColourfulCard
                    title={tool.title}
                    subtitle={tool.subtitle}
                    bgGradient={tool.bgGradient}
                    icon={tool.icon}
                    features={tool.features}
                    buttonText={tool.buttonText}
                    buttonVariant={tool.buttonVariant}
                    iconColor={tool.iconColor}
                    note={tool.note}
                    url={tool.url}
                    onClick={(url) => { if (url) window.location.href = url; }}
                  />
                </div>
              ))}
            </div>


          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="py-5 bg-light">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {homepageData.trustSection.title}
              </h2>
            </div>

            {/* Stats Cards */}
            <div className="row g-4 mb-5">
              {homepageData.trustSection.stats.map((stat, index) => (
                <div key={index} className="col-lg-6">
                  <div className="card h-100 border-0 shadow-lg rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-4">
                        <h4 className="fw-bold text-dark mb-0 fs-3">{stat.title}</h4>
                      </div>
                      {/* Stats: numbers on one line (with +) and labels below */}
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
                                {remainingText}
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
              <h3 className="fw-bold text-dark mb-4">Vendors of Prominent PSUs</h3>
              <div className="company-logos-carousel">
                <Slider {...homepageData.carouselSettings}>
                  {homepageData.companyLogos.map((logo, index) => (
                    <div key={index} className="px-2">
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

            {/* Security Features */}
            <div className="row g-4">
              {homepageData.trustSection.securityFeatures.map((feature, index) => (
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
                    
                        {/* Mobile Layout - Left aligned for all */}
                        <div className={`card-body p-4 d-md-none d-flex align-items-center`}>
                      <div 
                          className={`d-flex align-items-center justify-content-center rounded-circle me-3`}
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
                        <h6 className={`fw-bold text-dark mb-0 text-start`}>{feature.title}</h6>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why You Should Choose Workwise */}
        <section className="py-5 px-5">
          <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">{homepageData.whyChooseSection.title}</h2>
            <div className="row g-4">
              {homepageData.whyChooseSection.cards.map((card, index) => (
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
          </div>
        </section>

        {/* Modular Offerings Section */}
        <section className="py-5 bg-light">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-4">
             <h2 className="fs-1 fw-bold text-dark mb-3">{homepageData.modularOfferings.title}</h2>
              <p className="text-muted fs-5 mb-0">{homepageData.modularOfferings.intro}</p>
            </div>

            {/* Modules Grid */}
             <div className="row g-4 mb-5">
               {homepageData.modularOfferings.modules.map((module, index) => {
                 // Use colors from the module data
                 const colors = {
                   border: module.iconColor || '#0EA5E9',
                   bg: module.iconColor || '#0EA5E9',
                   icon: module.iconColor || '#0EA5E9'
                 };
                 
                 return (
                   <div key={index} className="col-lg-6">
                     <div 
                       className="rounded-4 shadow-sm h-100 position-relative bg-white cursor-pointer" 
                       style={{
                         borderTop: `5px solid ${colors.border}`,
                         cursor: 'pointer',
                         transition: 'all 0.3s ease'
                       }}
                       id="open_module-modular_offerings-landing_page"
                       onClick={() => window.location.href = module.link}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.transform = 'translateY(-4px)';
                         e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.transform = 'translateY(0)';
                         e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                       }}
                     >
                       <div className="d-flex flex-column p-4">
                         {/* Header with Icon */}
                         <div className="d-flex align-items-center mb-3">
                           <span style={{
                             display: 'inline-flex', 
                             alignItems: 'center', 
                             justifyContent: 'center', 
                             width: 48, 
                             height: 48, 
                             borderRadius: '50%', 
                             background: colors.bg, 
                             marginRight: 12
                           }}>
                             <FontAwesomeIcon icon={module.icon} style={{color: 'white', fontSize: 20}} />
                           </span>
                           <h4 className="fw-bold text-dark mb-0" style={{ 
                             fontSize: '1.1rem',
                             lineHeight: '1.3'
                           }}>
                             {module.title}
                           </h4>
                         </div>

                       {/* Desktop Description */}
                       <p className="text-muted mb-3 d-none d-lg-block" style={{ 
                         fontSize: '0.9rem',
                         lineHeight: '1.4'
                       }}>
                         {module.description}
                       </p>

                       {/* Desktop Features */}
                       <div className="mb-3 d-none d-lg-block">
                         <ul className="list-unstyled mb-0">
                           {module.desktopFeatures.map((feature, featureIndex) => (
                             <li key={featureIndex} className="d-flex align-items-center mb-2">
                               <span className="text-success me-2">✓</span>
                               <span className="text-muted small">{feature}</span>
                             </li>
                           ))}
                         </ul>
                       </div>

                       {/* Mobile Description */}
                       <div className="d-lg-none">
                         <p className="text-muted small mb-0" style={{ 
                           fontSize: '0.85rem',
                           lineHeight: '1.4'
                         }}>
                           {module.mobileDescription}
                       </p>
                       </div>

                       {/* Learn More Link */}
                       <div className="mt-auto">
                         <span 
                           className="text-decoration-none fw-bold d-inline-flex align-items-center"
                           style={{ color: colors.icon }}
                         >
                           Learn more →
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>

            {/* Vendor Support Services */}
            <div className="bg-light rounded-4 p-4 position-relative" style={{borderLeft: '4px solid #F59E0B'}}>
              <div className="row">
                <div className="col-12">
                  <div className="d-flex align-items-center mb-3">
                    <h3 className="fw-bold text-dark mb-0">{homepageData.modularOfferings.vendorSupport.title}</h3>
                  </div>
                  <p className="text-muted mb-4 d-none d-md-block">{homepageData.modularOfferings.vendorSupport.subtitle}</p>
                  
                  <div className="row g-3 mb-4">
                    {homepageData.modularOfferings.vendorSupport.services.map((service, index) => (
                      <div key={index} className="col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 h-100">
                          {/* Desktop Layout - Centered */}
                          <div className="card-body text-center p-4 d-none d-md-block">
                            <div 
                              className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                              style={{
                                width: '48px',
                                height: '48px',
                                background: service.iconBg
                              }}
                            >
                              <FontAwesomeIcon icon={service.icon} style={{ color: 'white', fontSize: '20px' }} />
                            </div>
                            <h6 className="fw-bold text-dark mb-2">{service.title}</h6>
                            <p className="text-muted small mb-0">{service.description}</p>
                          </div>
                          
                          {/* Mobile Layout - Icon Left, Text Right */}
                          <div className="card-body p-3 d-md-none d-flex align-items-center">
                            <div 
                              className="d-flex align-items-center justify-content-center rounded-circle me-3"
                              style={{
                                width: '40px',
                                height: '40px',
                                background: service.iconBg,
                                flexShrink: 0
                              }}
                            >
                              <FontAwesomeIcon icon={service.icon} style={{ color: 'white', fontSize: '16px' }} />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '0.95rem' }}>{service.title}</h6>
                              <p className="text-muted small mb-0" style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>{service.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-muted mb-3 d-none d-md-block">{homepageData.modularOfferings.vendorSupport.footerText}</p>
                  <Button 
                    id="vendor_support-cta-landing_page"
                    onClick={handleVendorSupport}
                    className="btn fw-bold text-white w-auto"
                    type="button"
                    style={{background: '#F59E0B', border: 'none', borderRadius: '8px'}}
                  >
                    {homepageData.modularOfferings.vendorSupport.buttonText}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Built for Heavy Industries Section */}
        <section className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3">{homepageData.heavyIndustries.headline}</h2>
              <p className="text-muted fs-5 mb-0">{homepageData.heavyIndustries.subheadline}</p>
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
                      {homepageData.heavyIndustries.industries.map((industry, index) => (
                        <div key={index} className="col-12">
                          <div 
                            className="d-flex align-items-center p-3 rounded-3"
                            style={{ background: `${industry.color}15` }}
                          >
                            <span className="me-3" style={{ fontSize: '20px' }}>{industry.icon}</span>
                            <span className="fw-medium text-dark">{industry.name}</span>
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
                      {homepageData.heavyIndustries.domains.map((domain, index) => (
                        <div key={index} className="col-12">
                          <div 
                            className="d-flex align-items-center p-3 rounded-3"
                            style={{ background: `${domain.color}15` }}
                          >
                            <span className="me-3" style={{ fontSize: '20px' }}>{domain.icon}</span>
                            <span className="fw-medium text-dark">{domain.name}</span>
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
                    {homepageData.heavyIndustries.industries.map((industry, index) => (
                      <div key={index} className="d-flex align-items-center mb-2">
                        <span className="text-success me-2">✓</span>
                        <span className="fw-medium text-dark">{industry.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <h4 className="fw-bold text-dark mb-3">Disciplines:</h4>
                  <div className="mb-3">
                    {homepageData.heavyIndustries.domains.map((domain, index) => (
                      <div key={index} className="d-flex align-items-center mb-2">
                        <span className="text-success me-2">✓</span>
                        <span className="fw-medium text-dark">{domain.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className="text-center mb-4">
              <h3 className="fw-bold text-dark">What Our Customers Say</h3>
            </div>
            <div className="row g-4">
              {homepageData.heavyIndustries.testimonials.map((testimonial, index) => (
                <div key={index} className="col-lg-4 col-md-6 col-12">
                  <TestimonialCard
                    className="testimonial-card-compact"
                    quote={testimonial.quote}
                    quoteDesktop={testimonial.quoteDesktop}
                    quoteMobile={testimonial.quoteMobile}
                    authorName={testimonial.author}
                    authorTitle={testimonial.position}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* See Workwise in Action Section */}
        <section className="py-5" style={{ background: '#1E293B' }}>
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-white mb-3" style={{ fontSize: '2.5rem' }}>
                See How Workwise Simplifies{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>Project Procurement</span>
              </h2>
              <p className="text-white mb-0" style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                Watch a quick walkthrough of how Workwise takes you from BOQ to final PO- faster, smarter, and more profitably.
              </p>
            </div>

            {/* Video Player (clickable thumbnail opens modal) */}
            <div className="row justify-content-center mb-3">
              <div className="col-12 d-flex flex-column align-items-center">
                <div className="video-section w-100" style={{ maxWidth: '900px' }}>
                  <button
                    id="portal-demo-video-btn"
                    onClick={() => setShowPortalDemoModal(true)}
                    className="video-button"
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 7',
                      background: 'url(/assets/images/hero.png) center / contain no-repeat',
                      borderRadius: '18px',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <FontAwesomeIcon icon={faCirclePlay} className="video-play-icon" style={{ fontSize: 50, color: '#000000', opacity: 0.9 }} />
                  </button>
                </div>
                <p className="text-center text-white mt-3 mb-0" style={{ opacity: 0.8 }}>
                  This video shows a real example using a sample BOQ
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-4">
                <span className="text-white fw-medium" style={{ fontSize: '1.1rem' }}>Liked the Demo? Let's Talk.</span>
              </div>
              
                      <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mb-4">
                <Button 
                id="book_a_call-cta-landing_page"
                  onClick={handleBookCall}
                  className="btn fw-medium text-dark px-4 py-3"
                  size="md"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    filter: 'brightness(1.05) saturate(1.05)',
                    boxShadow: '0 8px 24px rgba(255,165,0,0.35)'
                  }}
                >
                  <FontAwesomeIcon icon={faPhone} className="me-2" />
                  Book a Call
                </Button>

              </div>

              {/* Features */}
              <div className="row justify-content-center">
                <div className="col-auto">
                  <div className="d-flex align-items-center text-white small" style={{ opacity: 0.8 }}>
                    <FontAwesomeIcon icon={faShield} className="me-2" />
                    No Credit Card Required
                  </div>
                </div>
                <div className="col-auto">
                  <div className="d-flex align-items-center text-white small" style={{ opacity: 0.8 }}>
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    15-min Setup
                  </div>
                </div>
                <div className="col-auto">
                  <div className="d-flex align-items-center text-white small" style={{ opacity: 0.8 }}>
                    <FontAwesomeIcon icon={faUsers} className="me-2" />
                    Free Support
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Styled-jsx for video section responsiveness */}
        <style jsx>{`
          @media (max-width: 768px) {
            .video-button { aspect-ratio: 4 / 3; }
          }
          @media (max-width: 480px) {
            .video-button { aspect-ratio: 2 / 1; }
          }
        `}</style>

        {/* Why Workwise Is a No-Brainer for Project Procurement Section */}
        <section className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                Why Workwise Is a No-Brainer for Project Procurement
              </h2>
              <p className="text-muted fs-5 mb-4">
                Compare the reality of traditional procurement vs what it looks like with Workwise - and decide for yourself.
              </p>

            </div>

            {/* Comparison Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              {/* Desktop View - Table */}
              <div className="table-responsive d-none d-lg-block">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="bg-dark text-white fw-bold px-4 py-3" style={{ width: '30%' }}>
                        Procurement Activity
                      </th>
                      <th className="bg-danger text-white fw-bold text-center px-4 py-3" style={{ width: '35%' }}>
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Without Workwise
                      </th>
                      <th className="bg-success text-white fw-bold text-center px-4 py-3" style={{ width: '35%' }}>
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        With Workwise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faFileAlt} className="me-2 text-primary" />
                        BOQ Handling
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        Manual formatting, errors, hours of Excel cleanup
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                        Upload file → Get clean, structured BOQ in minutes
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faPaperPlane} className="me-2 text-primary" />
                        RFQ Creation
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faCopy} className="me-2" />
                        Copy-paste across emails/Word files
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faRocket} className="me-2" />
                        Auto-generate RFQs from BOQ + send in 1 click
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faSearch} className="me-2 text-primary" />
                        Vendor Discovery
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faPhone} className="me-2" />
                        Calling old vendors, outdated lists
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faBuilding} className="me-2" />
                        12,000+ PSU-approved vendors, ready to quote
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faListUl} className="me-2 text-primary" />
                        Quote Evaluation
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faTable} className="me-2" />
                        Manual comparisons, messy Excel tables
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faChartLine} className="me-2" />
                        Smart chart + deviation check + exportable report
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2 text-primary" />
                        Negotiation
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                        Endless phone/email back-and-forth
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faWrench} className="me-2" />
                        Reverse auction or custom digital workflows
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faCheckSquare} className="me-2 text-primary" />
                        PO & Payment Tracking
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faQuestionCircle} className="me-2" />
                        No single source of truth, missed follow-ups
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faEye} className="me-2" />
                        Track both vendor & client side till final payment
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faClock} className="me-2 text-primary" />
                        Procurement Timeline
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faHourglassHalf} className="me-2" />
                        3–4 months (avg)
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faBolt} className="me-2" />
                        3–4 weeks (avg)
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <td className="px-4 py-3 fw-medium text-dark">
                        <FontAwesomeIcon icon={faDollarSign} className="me-2 text-primary" />
                        Savings Per Project
                      </td>
                      <td className="px-4 py-3 text-danger">
                        <FontAwesomeIcon icon={faTimes} className="me-2" />
                        Missed opportunities
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faPercent} className="me-2" />
                        6–9% cost savings
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile View - Stacked Cards */}
              <div className="d-lg-none">
                <div className="p-3">
                  <div className="row g-3">
                    {/* BOQ Handling */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">BOQ Handling</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>Manual, error-prone formatting</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>Upload & get clean, structured BOQ</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RFQ Creation - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">RFQ Creation</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>Copy-paste & delays</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>Auto-generated & sent instantly</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Discovery - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">Vendor Discovery</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>Calling old vendors, outdated lists</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>12,000+ PSU-approved vendors</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quote Evaluation - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">Quote Evaluation</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>Manual comparisons, messy Excel</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>Smart chart + deviation check</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Negotiation - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">Negotiation</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>Endless phone/email back-and-forth</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>Reverse auction or digital workflows</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PO & Payment Tracking - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">PO & Payment Tracking</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>No single source of truth</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>Track both sides till final payment</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Procurement Timeline - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">Procurement Timeline</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-danger fw-bold me-2">Without:</small>
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>3-4 months (avg)</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <small className="text-success fw-bold me-2">With:</small>
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>3-4 weeks (avg)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Savings Per Project - single line without/with */}
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="fw-bold text-dark mb-0">Savings Per Project</h6>
                          </div>
                          <div className="d-flex flex-column g-2">
                            <div className="d-flex align-items-center mb-2">
                              <small className="text-danger fw-bold me-2">Without:</small>
                              <div className="d-flex align-items-center">
                                <span className="text-danger" style={{ fontSize: '0.9rem' }}>Missed opportunities</span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <small className="text-success fw-bold me-2">With:</small>
                              <div className="d-flex align-items-center">
                                <span className="text-success" style={{ fontSize: '0.9rem' }}>6-9% cost savings</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions Section */}
        <section className="py-5" style={{ background: '#F8FAFC' }}>
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-3" style={{ fontSize: '2.5rem' }}>
                Frequently Asked Questions
                {/* <span style={{ color: '#8B5CF6' }}>Workwise & Procurement Automation</span> */}
              </h2>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                We've answered the most common questions buyers and vendors ask us about Workwise, AI tools, procurement workflows, and integrations.
              </p>
            </div>

            {/* FAQ Categories */}
            <div className="row justify-content-center">
              <div className="col-lg-10">
                {homepageData.faqSection.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="mb-4">
                    {/* Category Header as dropdown trigger */}
                    <button
                      id={`toggle_faq_category_${categoryIndex}-faq-landing_page`}
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
                              backgroundColor: category.iconBg 
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

        {/* End Frequently Asked Questions Section */}

        
      </main>

      {/* CallNowModal */}
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

      {/* Portal Demo Video Modal (custom lightweight overlay) */}
      {showPortalDemoModal && (
        <div
          className="modal fade show d-block p-4"
          tabIndex="-1"
          role="dialog"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          id="close_demo_overlay-modal_overlay-landing_page"
          onClick={() => setShowPortalDemoModal(false)}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title p-4 text-center fw-bold">workwise Demo</h5>
                <button type="button" className="btn-close" id="close_demo_modal-modal_header-landing_page" onClick={() => setShowPortalDemoModal(false)}></button>
              </div>
              <div className="modal-body d-flex justify-content-center">
                <iframe
                  width="100%"
                  height="500px"
                  src={"https://www.youtube.com/embed/hGLXaqCF5fc?autoplay=1"}
                  title="YouTube Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
