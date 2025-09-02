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

  const handleViewPositions = () => {
    router.push('/work-with-us/careers');
  };

  // Team member image component
  const TeamMemberImage = ({ src, name }) => (
    <img 
      src={src}
      alt={name}
      className="rounded-circle"
      style={{ 
        width: '120px', 
        height: '120px',
        objectFit: 'cover',
        border: '2px solid #e9ecef'
      }}
    />
  );

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

      {/* Team Section */}
      <section className="py-5 bg-white">
        <div className="container">
          {/* Title */}
          <h2 className="fs-2 fw-bold text-dark mb-5 text-center">
            {ourStoryData.team.title}
          </h2>

          {/* Team Members Grid - Founder in Middle */}
          <div className="row g-4 mb-4">
            {/* First Team Member - Mukul */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <TeamMemberImage src={ourStoryData.team.members[0].image} name={ourStoryData.team.members[0].name} />
                  </div>
                  <h4 className="fs-4 fw-bold text-dark mb-1">
                    {ourStoryData.team.members[0].name}
                  </h4>
                  <p className="text-primary fw-medium mb-3">
                    {ourStoryData.team.members[0].title}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {ourStoryData.team.members[0].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Founder - Middle Position - Siddharth */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <TeamMemberImage src={ourStoryData.team.founder.image} name={ourStoryData.team.founder.name} />
                  </div>
                  <h3 className="fs-3 fw-bold text-dark mb-1">
                    {ourStoryData.team.founder.name}
                  </h3>
                  <p className="text-primary fw-medium mb-3">
                    {ourStoryData.team.founder.title}
                  </p>
                  <blockquote className="fst-italic text-muted mb-3" style={{ fontSize: '0.95rem' }}>
                    "{ourStoryData.team.founder.quote}"
                  </blockquote>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    With over 15 years in industrial procurement, driving Workwise's vision.
                  </p>
                </div>
              </div>
            </div>

            {/* Second Team Member - Ayush */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <TeamMemberImage src={ourStoryData.team.members[1].image} name={ourStoryData.team.members[1].name} />
                  </div>
                  <h4 className="fs-4 fw-bold text-dark mb-1">
                    {ourStoryData.team.members[1].name}
                  </h4>
                  <p className="text-primary fw-medium mb-3">
                    {ourStoryData.team.members[1].title}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {ourStoryData.team.members[1].description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row - Three Team Members */}
          <div className="row g-4 mb-4">
            {/* Agnij - Left */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <TeamMemberImage src={ourStoryData.team.members[2].image} name={ourStoryData.team.members[2].name} />
                  </div>
                  <h4 className="fs-4 fw-bold text-dark mb-1">
                    {ourStoryData.team.members[2].name}
                  </h4>
                  <p className="text-primary fw-medium mb-3">
                    {ourStoryData.team.members[2].title}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {ourStoryData.team.members[2].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Kushal - Center */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <TeamMemberImage src={ourStoryData.team.members[3].image} name={ourStoryData.team.members[3].name} />
                  </div>
                  <h4 className="fs-4 fw-bold text-dark mb-1">
                    {ourStoryData.team.members[3].name}
                  </h4>
                  <p className="text-primary fw-medium mb-3">
                    {ourStoryData.team.members[3].title}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {ourStoryData.team.members[3].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Vineet - Right */}
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <TeamMemberImage src={ourStoryData.team.members[4].image} name={ourStoryData.team.members[4].name} />
                  </div>
                  <h4 className="fs-4 fw-bold text-dark mb-1">
                    {ourStoryData.team.members[4].name}
                  </h4>
                  <p className="text-primary fw-medium mb-3">
                    {ourStoryData.team.members[4].title}
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {ourStoryData.team.members[4].description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Link */}
          <div className="text-center">
            <button
              onClick={handleViewPositions}
              className="btn btn-link text-primary p-0 border-0"
              style={{ textDecoration: 'none' }}
            >
              {ourStoryData.team.ctaLink.text} <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <CtaSection
        title={ourStoryData.finalCta.title}
        description={ourStoryData.finalCta.subtitle}
        primaryButton={{
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