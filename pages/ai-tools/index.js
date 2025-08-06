import React from 'react';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faListAlt,
  faFileAlt,
  faCalculator
} from '@fortawesome/free-solid-svg-icons';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { ColourfulCard } from '@/components/ui/ColourfulCard';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { CtaSection } from '@/components/ui/CtaSection';

// Import data
import { aiToolsData } from '@/components/constants/aiToolsData';

const AiToolsPage = () => {
  const getAudienceIcon = (iconName) => {
    const iconMap = {
      'users': faUsers,
      'list-alt': faListAlt,
      'file-alt': faFileAlt,
      'calculator': faCalculator
    };
    return iconMap[iconName] || faUsers;
  };

  const handleToolClick = (url) => {
    window.location.href = url;
  };

  const handleWatchDemo = () => {
    console.log('Watch Demo clicked');
  };

  const handleTryForFree = () => {
    console.log('Try for Free clicked');
  };

  const handleBookDemo = () => {
    console.log('Book Demo clicked');
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      <Head>
        <title>AI Tools | Workwise</title>
        <meta name="description" content="Workwise AI Tools help you simplify procurement by automating tender summaries, BOQ simplification, cost estimation, and technical document analysis – saving time and reducing costs." />
      </Head>

      {/* Hero Section */}
      <HeroSection
        title="AI-Powered Tools for Procurement & EPC Professionals"
        subtitle="Transform complex tenders, BOQs, and technical documents into actionable insights with our suite of AI tools."
        layout="centered"
        size="large"
        showVisual={false}
        primaryButton={{
          label: "Explore AI Tools",
          variant: "black",
          onClick: () => {}
        }}
        secondaryButton={{
          label: "Watch Demo",
          variant: "white",
          onClick: handleWatchDemo
        }}
      />

      {/* Trusted by Industry Leaders */}
      <section className="py-5 bg-light text-center">
        <div className="container">
          <h2 
            className="text-uppercase fw-bold mb-4"
            style={{ letterSpacing: "1px" }}
          >
            Trusted by Industry Leaders
          </h2>
          <div className="row justify-content-center align-items-center g-4">
            {aiToolsData.trustSignals.logos.map((logo, index) => (
              <div key={index} className="col-auto">
                <div className="d-flex flex-column align-items-center">
                  <div className="bg-white rounded-3 p-3 shadow-sm mb-2">
                    <span className="fw-bold text-primary">{logo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Tools Grid */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3 text-dark">Our AI-Powered Tools</h2>
            <p className="text-muted mb-0">
              Start using our AI tools today and experience the difference in efficiency, accuracy, and insights.
            </p>
          </div>
          
          <div className="row g-4 justify-content-center">
            {Object.values(aiToolsData).filter(tool => tool.slug).map((tool, index) => (
              <div key={index} className="col-md-6 col-lg-6">
                <ColourfulCard
                  title={tool.title}
                  subtitle={tool.subtitle}
                  bgGradient={tool.bgGradient}
                  icon={tool.icon}
                  features={tool.benefits?.features || []}
                  buttonText={tool.buttonText}
                  buttonVariant={tool.buttonVariant}
                  iconColor={tool.iconColor}
                  note={tool.note}
                  buttonStyle={tool.buttonStyle}
                  url={`/ai-tools/${tool.slug}`}
                  onClick={handleToolClick}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">How It Works</h2>
            <p className="text-muted mb-0">
              Our AI tools follow a seamless 3-step process to deliver insights that drive smarter decisions.
            </p>
          </div>
          
          <div className="row g-4">
            {aiToolsData.boqSimplifier.howItWorks.steps.map((step, index) => (
              <div key={index} className="col-md-4">
                <FeatureCard
                  icon={step.icon || "step"}
                  title={`${step.step}. ${step.title}`}
                  description={step.description}
                  variant="centered"
                  size="medium"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-2">Who It's For</h2>
            <p className="text-muted mb-0">
              Powerful AI-driven solutions to streamline your workflow and boost productivity
            </p>
          </div>
          
          <div className="row g-4">
            {aiToolsData.audience?.map((audience, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div className="p-4 bg-light rounded-4 shadow-sm text-start h-100">
                  <div className="mb-2 text-info">
                    <FontAwesomeIcon icon={getAudienceIcon(audience.icon)} />
                  </div>
                  <h6 className="fw-bold">{audience.title}</h6>
                  <p className="small text-muted">
                    {audience.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <CtaSection
        title="Ready to Transform Your Procurement Process?"
        subtitle="Start using our AI tools today and experience the difference in efficiency, accuracy, and insights."
        primaryButton={{
          label: "Try for Free",
          variant: "white",
          onClick: handleTryForFree
        }}
        secondaryButton={{
          label: "Book a Demo",
          variant: "outline",
          onClick: handleBookDemo
        }}
        background="gradient"
      />
    </div>
  );
};

export default AiToolsPage;