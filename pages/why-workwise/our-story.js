import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faBuilding, faCrosshairs, faGlobe, faUsers, faCircleCheck, faStar, faPhone, faArrowRight } from '@fortawesome/free-solid-svg-icons';

// Import reusable components
import { CtaSection } from '@/components/ui/CtaSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { HeroSection } from '@/components/ui/HeroSection';

// Import data
import { ourStoryData } from '@/components/constants/ourStoryData';

const OurStoryPage = () => {
  const [mounted, setMounted] = useState(false);
  const [showBookCall, setShowBookCall] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }
  const handleMeetPeople = () => {
    router.push('/work-with-us/TeamTimeline');
  };

  const handleBookCall = () => setShowBookCall(true);



  // Hero visual placeholder
  const HeroVisual = () => (
    <div className="d-flex align-items-center justify-content-center h-100">
      <div className="text-center text-white">
        <div className="bg-white bg-opacity-20 rounded p-4">
          <div className="d-flex align-items-center justify-content-center mb-3">
            <div className="bg-white bg-opacity-30 rounded-circle p-3 me-3">
              <FontAwesomeIcon icon={faUsers} style={{ fontSize: '24px' }} />
            </div>
            <div className="bg-white bg-opacity-30 rounded-circle p-3 me-3">
              <FontAwesomeIcon icon={faBuilding} style={{ fontSize: '24px' }} />
            </div>
            <div className="bg-white bg-opacity-30 rounded-circle p-3">
              <FontAwesomeIcon icon={faCrosshairs} style={{ fontSize: '24px' }} />
            </div>
          </div>
          <p className="mb-0 small">Our Journey from Pain to Platform</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <HeroSection
        title={ourStoryData.hero.title}
        subtitle={ourStoryData.hero.subtitle}
        layout="centered"
        size="medium"
        primaryButton={{
          id: "meet_people_hero-our_story_page",
          label: ourStoryData.hero.ctaButton.label,
          variant: "white",
          icon: "none",
          onClick: handleMeetPeople
        }}
        visualContent={{
          component: HeroVisual,
          image: ourStoryData.hero.image
        }}
      />

      {/* Why We Built Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 text-center">
              {/* Title */}
              <h2 className="fs-2 fw-bold text-dark mb-4">
                {ourStoryData.whyWeBuilt.title}
              </h2>

              {/* Content */}
              <div className="text-start">
                <div className="mb-4">
                  {ourStoryData.whyWeBuilt.content.map((paragraph, index) => (
                    <p key={index} className="text-muted mb-3" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
                
                <div>
                  {ourStoryData.whyWeBuilt.secondParagraph.map((paragraph, index) => (
                    <p key={index} className="text-muted mb-3" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          {/* Title */}
          <h2 className="fs-2 fw-bold text-dark mb-5 text-center">
            {ourStoryData.mission.title}
          </h2>

          <div className="row g-4">
            {/* Left Column */}
            <div className="col-md-6">
              <FeatureCard
                icon={(props) => <FontAwesomeIcon icon={faCircleCheck} {...props} />}
                iconBgColor="bg-success"
                iconColor="text-white"
                title={ourStoryData.mission.leftColumn.title}
                description={
                  <div className="d-flex flex-column gap-3">
                    {ourStoryData.mission.leftColumn.benefits.map((benefit, index) => (
                      <div key={index} className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faCircleCheck} className="text-success me-3" style={{ fontSize: '20px' }} />
                        <span className="text-muted">{benefit}</span>
                      </div>
                    ))}
                  </div>
                }
                className="text-start"
              />
            </div>

            {/* Right Column */}
            <div className="col-md-6">
              <FeatureCard
                icon={(props) => <FontAwesomeIcon icon={faCircleCheck} {...props} />}
                iconBgColor="bg-success"
                iconColor="text-white"
                title={ourStoryData.mission.rightColumn.title}
                description={
                  <div className="d-flex flex-column gap-3">
                    {ourStoryData.mission.rightColumn.benefits.map((benefit, index) => (
                      <div key={index} className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faCircleCheck} className="text-success me-3" style={{ fontSize: '20px' }} />
                        <span className="text-muted">{benefit}</span>
                      </div>
                    ))}
                  </div>
                }
                className="text-start"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 text-center">
              {/* Title */}
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {ourStoryData.vision.title}
              </h2>

              {/* Subtitle */}
              <p className="text-muted mb-5" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                {ourStoryData.vision.subtitle}
              </p>

              {/* Vision Points */}
              <div className="text-start">
                <p className="text-muted mb-3" style={{ fontSize: '1rem' }}>
                  We envision a world where:
                </p>
                <div className="d-flex flex-column gap-3">
                  {ourStoryData.vision.points.map((point, index) => (
                    <div key={index} className="d-flex align-items-center">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-success me-3" style={{ fontSize: '20px' }} />
                      <span className="text-muted">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We've Built Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          {/* Title */}
          <h2 className="fs-2 fw-bold text-dark mb-5 text-center">
            {ourStoryData.whatWeBuilt.title}
          </h2>

          {/* Stats Grid */}
          <div className="row g-4 mb-5">
            {ourStoryData.whatWeBuilt.stats.map((stat, index) => {
              // Define colors for each card
              const cardColors = [
                { border: '#0d6efd', text: '#0d6efd' }, // Blue
                { border: '#198754', text: '#198754' }, // Green
                { border: '#fd7e14', text: '#fd7e14' }, // Orange
                { border: '#212529', text: '#212529' }  // Black
              ];
              
              const colors = cardColors[index];
              
              return (
                <div key={index} className="col-md-6 col-lg-3">
                  <div 
                    className="card h-100"
                    style={{ 
                      border: '1px solid #dee2e6',
                      borderTop: `4px solid ${colors.border}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      backgroundColor: 'white'
                    }}
                  >
                    <div className="card-body p-4 text-center">
                      <h3 
                        className="fs-2 fw-bold mb-2"
                        style={{ color: colors.text }}
                      >
                        {stat.value}
                      </h3>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Description in Subtle Gray Box */}
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div 
                className="p-4 rounded"
                style={{ 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{ 
                      width: '28px', 
                      height: '28px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <span className="fw-bold" style={{ fontSize: '14px' }}>i</span>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                    {ourStoryData.whatWeBuilt.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Final CTA Section */}
      <CtaSection
        title={ourStoryData.finalCta.title}
        description={ourStoryData.finalCta.subtitle}
        primaryButton={{
          id: "book_a_call-final_cta-our_story_page",
          ...ourStoryData.finalCta.button,
          onClick: handleBookCall
        }}
      />
      {showBookCall && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '600px' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Book a Call</h5>
                <button type="button" className="btn-close" onClick={() => setShowBookCall(false)} />
              </div>
              <div className="modal-body">
                {/* Reuse global BookCall form */}
                {/* Lazy require to avoid import cycles if any */}
                {require('@/components/bookCall').default && React.createElement(require('@/components/bookCall').default)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OurStoryPage; 