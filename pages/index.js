import Head from 'next/head'
import { Inter } from 'next/font/google'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faBriefcase, faFileAlt, faListUl, faCalculator, faFileContract, faRocket, faPlay, faShield, faUsers, faBuilding, faCloud, faLock, faBrain, faHammer, faSearch, faWrench, faPhone, faClock, faEye, faTimes, faCheck, faExclamationTriangle, faPaperPlane, faCopy, faTable, faChartLine, faEnvelope, faQuestionCircle, faHourglassHalf, faBolt, faDollarSign, faPercent, faCheckSquare, faChartColumn, faComments } from '@fortawesome/free-solid-svg-icons';
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
  const handleBookCall = () => {
    // Handle book a call action
    console.log('Book a call clicked');
  };

  const handleTryFreeTools = () => {
    // Handle try free tools action
    console.log('Try free tools clicked');
  };

  const handleExploreVendorTools = () => {
    // Handle explore vendor tools action
    console.log('Explore vendor tools clicked');
  };

  const handleVendorSupport = () => {
    // Handle vendor support action
    console.log('Vendor support clicked');
  };

  const handleToolClick = (toolName) => {
    console.log(`${toolName} clicked`);
    // Navigate to specific tool page
  };

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
        `}</style>
        {/* Hero Section */}
        <div style={{position: 'relative'}}>
        <HeroSection
          title={homepageData.hero.title}
          subtitle={homepageData.hero.subtitle}
          valueProps={homepageData.hero.valueProps}
          primaryButton={{
            ...homepageData.hero.primaryButton,
            onClick: handleBookCall
          }}
          secondaryButton={{
            ...homepageData.hero.secondaryButton,
            onClick: handleTryFreeTools
          }}
          visualContent={{
            video: <HeroVideo />
          }}
          layout="split"
          size="large"
          textAlign="left"
        />
  {/* Floating Icons */}
        <div style={{position: 'absolute', top: '30%', left: '50%', zIndex: 2, animation: 'floatA 6s ease-in-out infinite'}} className="d-none d-lg-block">
          <FaRobot size={32} color="#fff" style={{filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))'}} />
        </div>
        <div style={{position: 'absolute', top: '64%', left: '95%', zIndex: 2, animation: 'floatB 7s ease-in-out infinite'}} className="d-none d-md-block">
          <FaMicrochip size={28} color="#fff" style={{filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))'}} />
        </div>
      </div>

      <div className="position-absolute" style={{ top: '70%', right: '-40px', zIndex: 1 }}>
        <FaProjectDiagram 
          style={{ 
            color: 'rgba(255, 255, 255, 0.3)', 
            fontSize: '28px',
            animation: 'float 3s ease-in-out infinite 1.5s'
          }} 
        />
      </div>

        {/* Supplier CTA Section */}
        <section className="py-4" style={{ background: 'rgba(0, 0, 0, 0.05)' }}>
          <div className="container-fluid">
            <div className="row align-items-center">
              <div className="col-lg-6 d-flex align-items-center gap-2">
                <FontAwesomeIcon 
                  icon={faTruck} 
                  style={{ color: '#6B7280', fontSize: '18px' }} 
                />
                <span className="text-muted fw-medium">Are you a Supplier?</span>
              </div>
              <div className="col-lg-6 d-flex justify-content-lg-end justify-content-start">
                <Button
                  onClick={handleExploreVendorTools}
                  variant="primary"
                  size="default"
                  icon="none"
                  className="w-auto"
                >
                  <FontAwesomeIcon icon={faSearch} />
                  Explore Vendor Tools
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Free Tools Section */}
        <section className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 100%)',
                    color: 'white'
                  }}
                >
                  <FontAwesomeIcon icon={faBriefcase} style={{ fontSize: '20px' }} />
                </div>
                <h2 className="fs-1 fw-bold text-dark mb-0">
                  Tools That Make Procurement 10X Faster & Smarter
                </h2>
              </div>
              <p className="text-muted fs-5 mb-0">
                Try our free tools, made for project buyers like you. Save hours, avoid errors, and get instant insights.
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
                    onClick={() => handleToolClick(tool.title)}
                  />
                </div>
              ))}
            </div>

            {/* Unified CTA */}
            <div className="text-center">
              <Button
                onClick={handleTryFreeTools}
                className="w-auto"
                variant="secondary"
                size="lg"
              >
                <FontAwesomeIcon icon={faBriefcase} style={{ fontSize: '20px' }} />
                Try These Free Tools Now
              </Button>
              <div className="mt-3">
                <p className="text-muted mb-1">Free to use. Just verify your mobile via OTP.</p>
                <p className="text-muted small">No login required. Just drag & drop your file.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="py-5 bg-light">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{
                    width: '48px',
                    height: '48px',
                    background: homepageData.trustSection.iconBg,
                    color: 'white'
                  }}
                >
                  <FontAwesomeIcon icon={homepageData.trustSection.icon} style={{ fontSize: '20px' }} />
                </div>
                <h2 className="fs-1 fw-bold text-dark mb-0">
                  {homepageData.trustSection.title}
                </h2>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-4 mb-5">
              {homepageData.trustSection.stats.map((stat, index) => (
                <div key={index} className="col-lg-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center mb-3">
                        <div 
                          className="d-flex align-items-center justify-content-center rounded-3 me-3"
                          style={{
                            width: '48px',
                            height: '48px',
                            background: stat.iconBg,
                            color: 'white'
                          }}
                        >
                          <FontAwesomeIcon icon={stat.icon} style={{ fontSize: '20px' }} />
                        </div>
                        <h4 className="fw-bold text-dark mb-0">{stat.title}</h4>
                      </div>
                      <ul className="list-unstyled mb-0">
                        {stat.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="d-flex align-items-center mb-2">
                            <span className="text-success me-2">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
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
                          filter: 'grayscale(100%)',
                          opacity: '0.7',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.filter = 'grayscale(0%)';
                          e.target.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.filter = 'grayscale(100%)';
                          e.target.style.opacity = '0.7';
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
                  <div className="card h-100 border-0 shadow-sm rounded-4 text-center">
                    <div className="card-body p-4">
                      <div 
                        className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                        style={{
                          width: '64px',
                          height: '64px',
                          background: feature.iconBg,
                          color: 'white'
                        }}
                      >
                        <FontAwesomeIcon icon={feature.icon} style={{ fontSize: '24px' }} />
                      </div>
                      <h5 className="fw-bold text-dark mb-0">{feature.title}</h5>
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
            <h2 className="fw-bold text-dark mb-5">{homepageData.whyChooseSection.title}</h2>
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
              <h2 className="fs-1 fw-bold text-dark mb-2">{homepageData.modularOfferings.title}</h2>
              <h3 className="fs-3 fw-bold text-color-primary mb-3">{homepageData.modularOfferings.subtitle}</h3>
              <p className="text-muted fs-5 mb-0">{homepageData.modularOfferings.intro}</p>
            </div>

            {/* Modules Grid */}
             <div className="row g-4 mb-5">
               {homepageData.modularOfferings.modules.map((module, index) => {
                 return (
                   <div key={index} className="col-lg-6">
                     <div className="rounded-4 shadow-sm h-100 position-relative bg-white" style={{borderTop: `5px solid ${module.iconColor}`}}>
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
                             background: module.iconBg, 
                             marginRight: 12
                           }}>
                             <FontAwesomeIcon icon={module.icon} style={{color: 'white', fontSize: 20}} />
                           </span>
                           <h4 className="fw-bold text-dark mb-0">{module.title}</h4>
                         </div>

                       {/* Description */}
                       <p className="text-muted mb-3">{module.description}</p>

                       {/* Desktop Features */}
                       <div className="mb-3">
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
                       <div className="d-md-none">
                         <p className="text-muted small mb-0">{module.mobileDescription}</p>
                       </div>

                       {/* Learn More Link */}
                       <div className="mt-auto">
                         <a 
                           href={module.link}
                           className="text-decoration-none fw-bold"
                           style={{ color: '#0EA5E9' }}
                         >
                           Learn more →
                         </a>
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
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle me-3"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: '#F59E0B'
                      }}
                    >
                      <FontAwesomeIcon icon={faWrench} style={{ color: 'white', fontSize: '16px' }} />
                    </div>
                    <h3 className="fw-bold text-dark mb-0">{homepageData.modularOfferings.vendorSupport.title}</h3>
                  </div>
                  <p className="text-muted mb-4">{homepageData.modularOfferings.vendorSupport.subtitle}</p>
                  
                  <div className="row g-3 mb-4">
                    {homepageData.modularOfferings.vendorSupport.services.map((service, index) => (
                      <div key={index} className="col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 h-100">
                          <div className="card-body text-center p-4">
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
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-muted mb-3">{homepageData.modularOfferings.vendorSupport.footerText}</p>
                  <Button 
                    onClick={handleVendorSupport}
                    className="btn fw-bold text-white px-4 py-3 w-auto"
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
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle me-3"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#0EA5E9'
                  }}
                >
                  <span style={{ color: 'white', fontSize: '16px' }}>🏭</span>
                </div>
                <h2 className="fw-bold text-dark mb-0">{homepageData.heavyIndustries.headline}</h2>
              </div>
              <p className="text-muted fs-5 mb-0">{homepageData.heavyIndustries.subheadline}</p>
            </div>

            {/* Industries and Domains */}
            <div className="row g-4 mb-5">
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
                      <h4 className="fw-bold text-dark mb-0">We Support These Heavy Industries</h4>
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

            {/* Testimonials */}
            <div className="text-center mb-4">
              <h3 className="fw-bold text-dark">What Our Customers Say</h3>
            </div>
            <div className="row g-4">
              {homepageData.heavyIndustries.testimonials.map((testimonial, index) => (
                <div key={index} className="col-lg-4 col-md-6">
                  <TestimonialCard
                    className="testimonial-card-compact"
                    quote={testimonial.quote}
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
              <h2 className="fw-bold text-white mb-2" style={{ fontSize: '2.5rem' }}>
                See How Workwise Simplifies{' '}
                <span style={{ color: '#8B5CF6' }}>Project Procurement</span>
              </h2>
              <p className="text-white mb-0" style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                Watch a quick walkthrough of how Workwise takes you from BOQ to final PO— faster, smarter, and more profitably.
              </p>
            </div>

            {/* Video Player */}
            <div className="row justify-content-center mb-5">
              <div className="col-12">
                <HeroVideo /> 
                <p className="text-center text-white mt-3 mb-0" style={{ opacity: 0.8 }}>
                  This video shows a real example using a sample BOQ
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-4">
                <span style={{ fontSize: '20px', marginRight: '8px' }}>❤️</span>
                <span className="text-white fw-medium" style={{ fontSize: '1.1rem' }}>Liked the Demo? Let's Talk.</span>
              </div>
              
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mb-4">
                <Button 
                  onClick={handleBookCall}
                  className="btn fw-bold text-white px-4 py-3 w-auto"
                  style={{background: '#8B5CF6', border: 'none', borderRadius: '8px'}}
                >
                  <FontAwesomeIcon icon={faPhone} className="me-2" />
                  Book a Call
                </Button>
                <Button 
                  onClick={handleTryFreeTools}
                  className="btn fw-bold px-4 py-3 w-auto"
                  style={{border: '2px solid #6B7280', color: '#6B7280', borderRadius: '8px', background: 'transparent'}}
                >
                  <FontAwesomeIcon icon={faWrench} className="me-2" />
                  Try Free Tools
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

        {/* Why Workwise Is a No-Brainer for Project Procurement Section */}
        <section className="py-5">
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fw-bold text-dark mb-3">
                Why Workwise Is a No-Brainer for Project Procurement
              </h2>
              <p className="text-muted fs-5 mb-4">
                Compare the reality of traditional procurement vs what it looks like with Workwise — and decide for yourself.
              </p>
              <Button
                onClick={() => console.log('Show Full Comparison clicked')}
                variant="primary"
                size="default"
                icon="eye"
                className="d-flex align-items-center gap-2 mx-auto w-auto"
              >
                <FontAwesomeIcon icon={faEye} />
                Show Full Comparison
              </Button>
            </div>

            {/* Comparison Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              <div className="table-responsive">
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
                        3–4 weeks (avg)
                      </td>
                      <td className="px-4 py-3 text-success">
                        <FontAwesomeIcon icon={faBolt} className="me-2" />
                        4–5 days (avg)
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
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions Section */}
        <section className="py-5" style={{ background: '#F8FAFC' }}>
          <div className="container">
            {/* Header */}
            <div className="text-center mb-5">
              <h2 className="fw-bold text-dark mb-2" style={{ fontSize: '2.5rem' }}>
                Frequently Asked Questions about{' '}
                <span style={{ color: '#8B5CF6' }}>Workwise & Procurement Automation</span>
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
                    {/* Category Header */}
                    <div className="d-flex align-items-center mb-3">
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

                    {/* Category Questions */}
                    <div className="bg-white rounded shadow-sm p-4">
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

        {/* Floating Chat Icon */}
        <div 
          className="position-fixed"
          style={{
            bottom: '30px',
            right: '30px',
            zIndex: 1000
          }}
        >
          <div 
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '60px',
              height: '60px',
              background: '#10B981',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <FontAwesomeIcon 
              icon={faComments} 
              style={{ fontSize: '24px', color: 'white' }} 
            />
          </div>
        </div>
      </main>
    </>
  )
}
