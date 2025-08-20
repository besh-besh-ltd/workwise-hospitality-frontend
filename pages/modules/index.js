import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getUserDetails } from '@/services/Auth';
import storageInstance from '@/utils/storageInstance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUpload,
  faTag,
  faDownload,
  faFileAlt,
  faBrain,
  faCircleCheck,
  faArrowTrendUp,
  faCircleQuestion,
  faSearch,
  faUsers,
  faChartBar,
  faMessage,
  faCreditCard
} from '@fortawesome/free-solid-svg-icons';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { CtaSection } from '@/components/ui/CtaSection';
import { Button } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import BookCall from '@/components/bookCall';
import { Modal } from 'react-bootstrap';

// Import data
import { modulePageData } from '@/components/constants/modulePageData';

const ModulePage = () => {
  const router = useRouter();
  const { module } = router.query;
  const [loggedinUser, setLoggedinUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);

  // Check user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Align with global auth storage: token is stored under key 'token'
        const token = storageInstance.getStorage("token");
        if (token) {
          const userDetails = await getUserDetails();
          if (userDetails && userDetails.name) {
            setLoggedinUser(userDetails);
          }
        }
      } catch (error) {
        // Silently handle auth errors
        console.log('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (typeof window !== 'undefined') {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);
  
  // Wait for router to be ready to avoid hydration mismatch
  if (!router.isReady || loading) {
    return <div>Loading...</div>;
  }
  
  // Default to 'boq' if no module specified
  const currentModule = module || 'boq';
  const moduleData = modulePageData[currentModule];
  
  // If module doesn't exist, default to boq
  if (!moduleData) {
    router.push('/modules/boq');
    return null;
  }

  // Icon mapping for different modules
  const getFeatureIcons = (moduleType) => {
    const iconMap = {
      boq: [faUpload, faTag, faDownload],
      rfq: [faFileAlt, faMessage, faChartBar],
      vendors: [faSearch, faUsers, faCircleCheck],
      evaluation: [faChartBar, faArrowTrendUp, faDownload],
      negotiation: [faMessage, faCircleCheck, faFileAlt],
      payments: [faCreditCard, faChartBar, faUsers]
    };
    return iconMap[moduleType] || [Upload, Tag, Download];
  };

  // Icon mapping for how it works steps
  const getStepIcons = (moduleType) => {
    const iconMap = {
      boq: [faFileAlt, faBrain, faDownload],
      rfq: [faFileAlt, faBrain, faMessage],
      vendors: [faSearch, faUpload, faUsers],
      evaluation: [faFileAlt, faChartBar, faDownload],
      negotiation: [faMessage, faChartBar, faFileAlt],
      payments: [faFileAlt, faCircleCheck, faCreditCard]
    };
    return iconMap[moduleType] || [faFileAlt, faBrain, faDownload];
  };

  const featureIcons = getFeatureIcons(currentModule);
  const stepIcons = getStepIcons(currentModule);

  const handlePrimaryAction = () => {
    // Handle primary CTA based on module and authentication status
    switch (currentModule) {
      case 'rfq':
      case 'boq':
        if (loggedinUser) {
          router.push('/dashboard/buyer/boq-automation');
        } else {
          // Trigger login modal with login tab via query param consumed by Header
          router.replace({
            pathname: router.pathname,
            query: { ...router.query, auth: 'login' }
          }, undefined, { shallow: true });
        }
        break;
      case 'vendors':
        router.push('/vendor/all'); // find vendor page
        break;
      case 'evaluation':
        router.push('/ai-tools/technical-summary'); // technical summary tool
        break;
      case 'negotiation':
        router.push('/vendor/all'); // find vendor (temporary solution)
        break;
      case 'payments':
        // Payments CTA yet to be finalized - for now open contact modal
        setShowCallModal(true);
        break;
      default:
        console.log(`${moduleData.hero.primaryButton.label} clicked`);
    }
  };

  const handleSecondaryAction = () => {
    // Handle secondary CTA - usually "Book a Call" - open modal
    setShowCallModal(true);
  };


  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Custom CSS for enhanced shadows */}
      <style jsx>{`
        .shadow-lg {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
          transition: all 0.3s ease;
        }
        
        .shadow-lg:hover {
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2) !important;
          transform: translateY(-2px);
        }
        
        .rounded-4 {
          border-radius: 1rem !important;
        }
        
        /* Ensure cards have consistent height */
        .col-md-4 {
          display: flex !important;
        }
        
        .col-md-4 > div {
          width: 100% !important;
        }
        
        /* Enhanced card styling */
        .card {
          border: none !important;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
        }
        
        .card:hover {
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%) !important;
        }
      `}</style>
      
      {/* Hero Section */}
      <HeroSection
        title={moduleData.hero.title}
        subtitle={moduleData.hero.subtitle}
        layout="centered"
        primaryButton={{
          ...moduleData.hero.primaryButton,
          onClick: handlePrimaryAction
        }}
        secondaryButton={{
          ...moduleData.hero.secondaryButton,
          onClick: handleSecondaryAction
        }}
        visualContent={{
          image: moduleData.hero.image
        }}
        mobileVideoContent={<img src={moduleData.hero.image} alt="Module visual" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} />}
      />

      {/* Top Benefits Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <h2 className="fs-1 fw-bold text-dark text-center mb-5">
            {moduleData.benefits.title}
          </h2>
          
          <div className="row g-4">
            {moduleData.benefits.features.map((feature, index) => (
              <div key={index} className="col-md-4">
                <div className="shadow-lg rounded-4">
                  <FeatureCard
                    icon={(props) => <FontAwesomeIcon icon={featureIcons[index]} {...props} />}
                    iconBgColor={feature.iconBgColor}
                    iconColor={feature.iconColor}
                    description={feature.title}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          <div className="d-flex align-items-center justify-content-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-0">
              {moduleData.howItWorks.title}
            </h2>
          </div>
          
          <div className="row g-4">
            {moduleData.howItWorks.steps.map((step, index) => (
              <div key={index} className="col-md-4">
                <FeatureCard
                  icon={(props) => <FontAwesomeIcon icon={stepIcons[index]} {...props} />}
                  iconBgColor="bg-light"
                  iconColor="text-muted"
                  description={step.title}
                  stepNumber={step.stepNumber}
                  isStep={true}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="d-flex align-items-center justify-content-center mb-5">
            <h2 className="fs-1 fw-bold text-dark mb-0">
              {moduleData.customerSayings.title}
            </h2>
          </div>
          
          <div className="row g-4">
            {/* Testimonial Card */}
            <div className="col-lg-6">
              <TestimonialCard
                quote={moduleData.customerSayings.testimonial.quote}
                authorName={moduleData.customerSayings.testimonial.authorName}
                authorTitle={moduleData.customerSayings.testimonial.authorTitle}
                authorImage={moduleData.customerSayings.testimonial.authorImage}
              />
            </div>
            
            {/* Real Outcomes Card */}
            <div className="col-lg-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body p-4">
                  <h3 className="fs-3 fw-bold text-dark mb-4">
                    {moduleData.customerSayings.realOutcomes.title}
                  </h3>
                  
                  <div className="d-flex flex-column gap-3">
                    {moduleData.customerSayings.realOutcomes.items.map((item, index) => (
                      <div key={index} className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faCircleCheck} className="text-success me-3" style={{ fontSize: '20px' }} />
                        <span className="text-muted">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="fs-1 fw-bold text-dark text-center mb-5">
                {moduleData.faq.title}
              </h2>
              
              <FaqAccordion questions={moduleData.faq.questions} />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <CtaSection
        title={moduleData.finalCta.title}
        icon={(props) => <FontAwesomeIcon icon={faCircleQuestion} {...props} />}
        primaryButton={{
          ...moduleData.finalCta.primaryButton,
          onClick: handlePrimaryAction
        }}
        secondaryButton={{
          ...moduleData.finalCta.secondaryButton,
          onClick: handleSecondaryAction
        }}
      />

      {/* Mobile Sticky CTA */}
      <div className="d-lg-none" style={{ position: 'sticky', bottom: 0, zIndex: 1030 }}>
        <div className="bg-white border-top p-3">
          <Button
            label={moduleData.hero.primaryButton.label}
            variant={moduleData.hero.primaryButton.variant || 'primary'}
            icon={moduleData.hero.primaryButton.icon || 'none'}
            onClick={handlePrimaryAction}
            className="w-100"
          />
        </div>
      </div>

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
    </div>
  );
};

export default ModulePage; 