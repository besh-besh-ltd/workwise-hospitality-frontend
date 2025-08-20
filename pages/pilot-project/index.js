import Head from 'next/head';
import { Inter } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { Button } from '@/components/ui/Button';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { FeatureCard } from '@/components/ui/FeatureCard';
import BookCall from '@/components/bookCall';
import { Modal } from 'react-bootstrap';

// Import data
import { pilotProjectData } from '@/components/constants/pilotProjectData';

const inter = Inter({ subsets: ['latin'] });

const pageInfo = {
  title: "Claim Your Free Pilot Project Access - Workwise",
  description: "Get full access to Workwise for your current project. Experience 75% time savings and 6-9% cost reductions risk-free.",
  keywords: "pilot project, free trial, procurement automation, BOQ automation, RFQ automation, cost savings",
  ogImage: "/assets/images/workwise-pilot-og.jpg",
  ogUrl: "https://workwise.in/pilot-project"
};

const PilotProjectPage = () => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);



  const handleFormSubmit = async (values) => {
    console.log('Pilot form submitted:', values);
    // Here you would typically send the data to your backend
    // For now, just log it
  };

  const handleClaimPilot = () => {
    setShowCallModal(true);
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

          /* Form card styling */
          .form-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
        `}</style>

        {/* Hero Section */}
        <HeroSection
          title={pilotProjectData.hero.title}
          subtitle={pilotProjectData.hero.subtitle}
          primaryButton={{
            label: pilotProjectData.formSection.buttonText,
            variant: "white",
            onClick: handleClaimPilot
          }}
          visualContent={{
            image: "/assets/images/pilot-project-placeholder.jpg"
          }}
          mobileVideoContent={
            <div className="card form-card rounded-4 p-4">
              <div className="text-center mb-4">
                <h3 className="fw-bold text-dark mb-2">
                  {pilotProjectData.formSection.title}
                </h3>
                <p className="text-muted mb-0">
                  {pilotProjectData.formSection.subtitle}
                </p>
              </div>
              <Button
                label={pilotProjectData.formSection.buttonText}
                variant="primary"
                onClick={handleClaimPilot}
                className="w-100"
                size="lg"
              />
              <div className="text-center mt-3">
                <small className="text-muted">
                  No credit card required • 1-day setup
                </small>
              </div>
            </div>
          }
          layout="centered"
          size="medium"
          textAlign="left"
        />

        {/* Why Pilot Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {pilotProjectData.whyPilot.title}
              </h2>
            </div>

            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="row g-4">
                  {pilotProjectData.whyPilot.benefits.map((benefit, index) => (
                    <div key={index} className="col-12">
                      <div className="d-flex align-items-center p-4 bg-white rounded-4 shadow-sm">
                        <div 
                          className="d-flex align-items-center justify-content-center rounded-circle me-4"
                          style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#10B981',
                            flexShrink: 0
                          }}
                        >
                          <FontAwesomeIcon icon={benefit.icon} className="text-white" style={{ fontSize: '20px' }} />
                        </div>
                        <p className="fw-medium text-dark mb-0" style={{ fontSize: '1.1rem' }}>
                          {benefit.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get Section */}
        <section className="py-5">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-1 fw-bold text-dark mb-3">
                {pilotProjectData.pilotFeatures.title}
              </h2>
            </div>

            <div className="row g-4">
              {pilotProjectData.pilotFeatures.features.map((feature, index) => (
                <div key={index} className="col-lg-4 col-md-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-4 text-center">
                      <div 
                        className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                        style={{
                          width: '64px',
                          height: '64px',
                          backgroundColor: feature.iconBg,
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

            {/* CTA */}
            <div className="text-center mt-5">
              <Button
                label="Start Your Free Pilot Today"
                variant="primary"
                icon="arrow"
                onClick={handleClaimPilot}
                size="lg"
                className=""
              />
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="row g-4 justify-content-center">
              {pilotProjectData.trustIndicators.indicators.map((indicator, index) => (
                <div key={index} className="col-lg-2 col-md-4 col-6">
                  <div className="card h-100 border-0 shadow-sm rounded-4">
                    <div className="card-body p-3 text-center">
                      <div className="mb-2">
                        <FontAwesomeIcon 
                          icon={indicator.icon} 
                          style={{ fontSize: '24px', color: '#10B981' }}
                        />
                      </div>
                      <span className="text-dark fw-medium small">{indicator.text}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-5">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <TestimonialCard
                  quote={pilotProjectData.testimonial.quote}
                  authorName={pilotProjectData.testimonial.author}
                  authorTitle={pilotProjectData.testimonial.company}
                  className="h-100"
                />
              </div>
            </div>

            {/* Final CTA */}
            <div className="text-center mt-5">
              <Button
                label="🚀 Claim Your Pilot Project Access"
                variant="gradient"
                onClick={handleClaimPilot}
                size="lg"
                className=""
              />
              <div className="mt-3">
                <small className="text-muted">
                  Limited pilot slots available • Setup within 24 hours
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* Form Modal */}
        <RegisterFormModal
          show={showFormModal}
          onClose={() => setShowFormModal(false)}
          title="Claim Your Pilot Project Access"
          subtitle="We'll set up your pilot within 1 business day"
          fields={pilotProjectData.formSection.fields}
          onSubmit={handleFormSubmit}
          successMessage="Thanks! We'll contact you within 24 hours to set up your pilot project."
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

export default PilotProjectPage;
