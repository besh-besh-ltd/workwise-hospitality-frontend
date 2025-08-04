import React from 'react';
import { 
  Rocket,
  Building,
  Target,
  Globe,
  Users,
  CheckCircle,
  Star,
  Phone,
  ArrowRight
} from 'lucide-react';

// Import reusable components
import { Button } from '@/components/ui/Button';
import { CtaSection } from '@/components/ui/CtaSection';
import { FeatureCard } from '@/components/ui/FeatureCard';

// Import data
import { ourStoryData } from '@/components/constants/ourStoryData';

const OurStoryPage = () => {
  const handleMeetPeople = () => {
    console.log('Meet the People Behind Workwise clicked');
  };

  const handleBookCall = () => {
    console.log('Book a Call with the Workwise Team clicked');
  };

  const handleViewPositions = () => {
    console.log('View our open positions clicked');
  };

  // Team member placeholder image component
  const TeamMemberImage = ({ name }) => (
    <div 
      className="rounded-circle bg-light d-flex align-items-center justify-content-center"
      style={{ 
        width: '120px', 
        height: '120px',
        backgroundColor: '#f8f9fa',
        border: '2px solid #e9ecef'
      }}
    >
      <span className="fw-bold text-muted fs-4">
        {name.split(' ').map(n => n[0]).join('')}
      </span>
    </div>
  );

  // Hero visual placeholder
  const HeroVisual = () => (
    <div className="d-flex align-items-center justify-content-center h-100">
      <div className="text-center text-white">
        <div className="bg-white bg-opacity-20 rounded p-4">
          <div className="d-flex align-items-center justify-content-center mb-3">
            <div className="bg-white bg-opacity-30 rounded-circle p-3 me-3">
              <Users size={24} />
            </div>
            <div className="bg-white bg-opacity-30 rounded-circle p-3 me-3">
              <Building size={24} />
            </div>
            <div className="bg-white bg-opacity-30 rounded-circle p-3">
              <Target size={24} />
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
      <section
        className="pt-5"
        style={{
          background: 'linear-gradient(135deg, var(--primary-color) 0%, #428B41 100%)',
          paddingTop: '160px',
          paddingBottom: '60px'
        }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              {/* Title */}
              <h1 className="fs-1 fw-bold text-white mb-3">
                {ourStoryData.hero.title}
              </h1>

              {/* Subtitle */}
              <p className="text-white mb-4" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                {ourStoryData.hero.subtitle}
              </p>

              {/* CTA Button */}
              <Button
                label={ourStoryData.hero.ctaButton.label}
                variant={ourStoryData.hero.ctaButton.variant}
                icon={ourStoryData.hero.ctaButton.icon}
                onClick={handleMeetPeople}
                size="sm"
                className="px-3 py-3"
                style={{ 
                  backgroundColor: 'white',
                  borderColor: 'white',
                  color: 'black',
                  minWidth: '300px',
                  whiteSpace: 'nowrap'
                }}
              />
            </div>
            
            <div className="col-lg-6">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

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
                icon={CheckCircle}
                iconBgColor="bg-success"
                iconColor="text-white"
                title={ourStoryData.mission.leftColumn.title}
                description={
                  <div className="d-flex flex-column gap-3">
                    {ourStoryData.mission.leftColumn.benefits.map((benefit, index) => (
                      <div key={index} className="d-flex align-items-center">
                        <CheckCircle className="text-success me-3" size={20} />
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
                icon={CheckCircle}
                iconBgColor="bg-success"
                iconColor="text-white"
                title={ourStoryData.mission.rightColumn.title}
                description={
                  <div className="d-flex flex-column gap-3">
                    {ourStoryData.mission.rightColumn.benefits.map((benefit, index) => (
                      <div key={index} className="d-flex align-items-center">
                        <CheckCircle className="text-success me-3" size={20} />
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
                      <CheckCircle className="text-success me-3" size={20} />
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

          {/* Description in Light Blue Box */}
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div 
                className="p-4 rounded"
                style={{ 
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #bbdefb'
                }}
              >
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{ 
                      width: '24px', 
                      height: '24px',
                      backgroundColor: '#0d6efd',
                      color: 'white'
                    }}
                  >
                    <span className="fw-bold" style={{ fontSize: '12px' }}>i</span>
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

          {/* Founder */}
          <div className="row justify-content-center mb-5">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-md-3 text-center mb-3 mb-md-0">
                      <TeamMemberImage name={ourStoryData.team.founder.name} />
                    </div>
                    <div className="col-md-9">
                      <h3 className="fs-3 fw-bold text-dark mb-1">
                        {ourStoryData.team.founder.name}
                      </h3>
                      <p className="text-primary fw-medium mb-3">
                        {ourStoryData.team.founder.title}
                      </p>
                      <blockquote className="fst-italic text-muted mb-3" style={{ fontSize: '1rem' }}>
                        "{ourStoryData.team.founder.quote}"
                      </blockquote>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {ourStoryData.team.founder.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="row g-4 mb-4">
            {ourStoryData.team.members.map((member, index) => (
              <div key={index} className="col-md-4">
                <FeatureCard
                  icon={Users}
                  iconBgColor="bg-primary"
                  iconColor="text-white"
                  title={member.name}
                  description={
                    <div className="text-center">
                      <p className="text-primary fw-medium mb-3">{member.title}</p>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {member.description}
                      </p>
                    </div>
                  }
                  className="text-center"
                />
              </div>
            ))}
          </div>

          {/* CTA Link */}
          <div className="text-center">
            <button
              onClick={handleViewPositions}
              className="btn btn-link text-primary p-0 border-0"
              style={{ textDecoration: 'none' }}
            >
              {ourStoryData.team.ctaLink.text} <ArrowRight size={16} />
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
    </div>
  );
};

export default OurStoryPage; 