import React from 'react';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faListAlt,
  faFileAlt,
  faCalculator,
  faPlay,
  faLock,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { FaUpload, FaBrain, FaCheckCircle, FaBuilding, FaHardHat, FaProjectDiagram, FaBolt, FaMicrochip, FaRobot } from 'react-icons/fa';
import { Container, Button } from 'react-bootstrap';
// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { ColourfulCard } from '@/components/ui/ColourfulCard';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { CtaSection } from '@/components/ui/CtaSection';
import FilePreview from '@/components/ui/FilePreview';

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
      <div style={{position: 'relative'}}>
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
        {/* Floating Icons */}
        <div
            className="floatingIcon floatA d-none d-lg-block"
            style={{ top: "20%", left: "80%" }}
          >
            <FaRobot size={20} />
          </div>
          <div
            className="floatingIcon floatB d-none d-md-block"
            style={{ top: "45%", left: "80%" }}
          >
            <FaMicrochip size={20} />
          </div>
          <div
            className="floatingIcon floatC d-none d-md-block"
            style={{ top: "65%", left: "75%" }}
          >
            <FaProjectDiagram size={20} />
          </div>
      </div>

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
            <div className="col-auto">
              <div className="d-flex flex-column align-items-center">
                <FaBuilding size={28} className="text-secondary mb-1" />
                <small className="text-muted">IOCL</small>
              </div>
            </div>
            <div className="col-auto">
              <div className="d-flex flex-column align-items-center">
                <FaHardHat size={28} className="text-secondary mb-1" />
                <small className="text-muted">NTPC</small>
              </div>
            </div>
            <div className="col-auto">
              <div className="d-flex flex-column align-items-center">
                <FaProjectDiagram size={28} className="text-secondary mb-1" />
                <small className="text-muted">ONGC</small>
              </div>
            </div>
            <div className="col-auto">
              <div className="d-flex flex-column align-items-center">
                <FaBolt size={28} className="text-secondary mb-1" />
                <small className="text-muted">PowerGrid</small>
              </div>
            </div>
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
            {/* Tender Summary - Top Left */}
            <div className="col-md-6 col-lg-6">
              <ColourfulCard
                title={aiToolsData.tenderSummary.title}
                subtitle={aiToolsData.tenderSummary.subtitle}
                bgGradient={aiToolsData.tenderSummary.bgGradient}
                icon={aiToolsData.tenderSummary.icon}
                features={aiToolsData.tenderSummary.benefits?.features || []}
                buttonText={aiToolsData.tenderSummary.buttonText}
                buttonVariant={aiToolsData.tenderSummary.buttonVariant}
                iconColor={aiToolsData.tenderSummary.iconColor}
                note={aiToolsData.tenderSummary.note}
                buttonStyle={aiToolsData.tenderSummary.buttonStyle}
                url={`/ai-tools/${aiToolsData.tenderSummary.slug}`}
                onClick={handleToolClick}
              />
            </div>
            
            {/* Technical Summary - Top Right */}
            <div className="col-md-6 col-lg-6">
              <ColourfulCard
                title={aiToolsData.technicalSummary.title}
                subtitle={aiToolsData.technicalSummary.subtitle}
                bgGradient={aiToolsData.technicalSummary.bgGradient}
                icon={aiToolsData.technicalSummary.icon}
                features={aiToolsData.technicalSummary.benefits?.features || []}
                buttonText={aiToolsData.technicalSummary.buttonText}
                buttonVariant={aiToolsData.technicalSummary.buttonVariant}
                iconColor={aiToolsData.technicalSummary.iconColor}
                note={aiToolsData.technicalSummary.note}
                buttonStyle={aiToolsData.technicalSummary.buttonStyle}
                url={`/ai-tools/${aiToolsData.technicalSummary.slug}`}
                onClick={handleToolClick}
              />
            </div>
            
            {/* BOQ Simplification - Bottom Left */}
            <div className="col-md-6 col-lg-6">
              <ColourfulCard
                title={aiToolsData.boqSimplifier.title}
                subtitle={aiToolsData.boqSimplifier.subtitle}
                bgGradient={aiToolsData.boqSimplifier.bgGradient}
                icon={aiToolsData.boqSimplifier.icon}
                features={aiToolsData.boqSimplifier.benefits?.features || []}
                buttonText={aiToolsData.boqSimplifier.buttonText}
                buttonVariant={aiToolsData.boqSimplifier.buttonVariant}
                iconColor={aiToolsData.boqSimplifier.iconColor}
                note={aiToolsData.boqSimplifier.note}
                buttonStyle={aiToolsData.boqSimplifier.buttonStyle}
                url={`/ai-tools/${aiToolsData.boqSimplifier.slug}`}
                onClick={handleToolClick}
              />
            </div>
            
            {/* Cost Estimation - Bottom Right */}
            <div className="col-md-6 col-lg-6">
              <ColourfulCard
                title={aiToolsData.costEstimator.title}
                subtitle={aiToolsData.costEstimator.subtitle}
                bgGradient={aiToolsData.costEstimator.bgGradient}
                icon={aiToolsData.costEstimator.icon}
                features={aiToolsData.costEstimator.benefits?.features || []}
                buttonText={aiToolsData.costEstimator.buttonText}
                buttonVariant={aiToolsData.costEstimator.buttonVariant}
                iconColor={aiToolsData.costEstimator.iconColor}
                note={aiToolsData.costEstimator.note}
                buttonStyle={aiToolsData.costEstimator.buttonStyle}
                url={`/ai-tools/${aiToolsData.costEstimator.slug}`}
                onClick={handleToolClick}
              />
            </div>
          </div>
        </div>
      </section>

      {/* See AI Tools in Action Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-4 mb-md-0">
              <h2 className="fw-bold mb-3">See Our AI Tools in Action</h2>
              <p className="text-muted mb-4">
                Watch how our AI tools transform complex procurement documents into actionable insights in minutes.
              </p>
              <ul className="list-unstyled text-start">
                <li className="d-flex align-items-start mb-3">
                  <span className="text-success me-2">✔</span>
                  <span>Extract key information from 500+ page tenders</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <span className="text-success me-2">✔</span>
                  <span>Simplify technical documents into clear summaries</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <span className="text-success me-2">✔</span>
                  <span>Transform complex BOQs into structured data</span>
                </li>
                <li className="d-flex align-items-start mb-4">
                  <span className="text-success me-2">✔</span>
                  <span>Generate accurate cost estimates in minutes</span>
                </li>
              </ul>
              <button className="btn btn-primary">
                <FontAwesomeIcon icon={faPlay} className="me-2" /> Watch Demo
              </button>
            </div>
            <div className="col-md-6 text-center">
              <div
                style={{
                  borderRadius: "12px",
                  backgroundColor: "#0F172A",
                  padding: "1rem",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                  <div className="d-flex gap-2">
                    <span
                      className="rounded-circle"
                      style={{
                        backgroundColor: "#EF4444",
                        width: 12,
                        height: 12,
                      }}
                    ></span>
                    <span
                      className="rounded-circle"
                      style={{
                        backgroundColor: "#FACC15",
                        width: 12,
                        height: 12,
                      }}
                    ></span>
                    <span
                      className="rounded-circle"
                      style={{
                        backgroundColor: "#22C55E",
                        width: 12,
                        height: 12,
                      }}
                    ></span>
                  </div>
                  <div className="text-white small">Workwise AI Demo</div>
                </div>
                <div
                  className="d-flex flex-column justify-content-center align-items-center"
                  style={{
                    backgroundColor: "#0F172A",
                    borderRadius: "8px",
                    height: "220px",
                  }}
                >
                  <div
                    className="rounded-circle d-flex justify-content-center align-items-center"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: "#E5E7EB",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faPlay}
                      style={{ color: "#0F172A" }}
                    />
                  </div>
                  <div className="text-white-50 mt-2">Click to play demo</div>
                </div>
              </div>
            </div>
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
            {aiToolsData.audience?.map((audience, index) => {
              // Inline AudienceCard
              const iconMap = {
                'users': faUsers,
                'list-alt': faListAlt,
                'file-alt': faFileAlt,
                'calculator': faCalculator
              };
              const Icon = iconMap[audience.icon] || faUsers;
              return (
                <div key={index} className="col-md-6 col-lg-3">
                  <div className="rounded-4 shadow-sm h-100 text-center position-relative bg-white" style={{borderTop: `5px solid ${audience.iconColor}`}}>
                    <div className="d-flex flex-column align-items-center justify-content-center pt-4 pb-3">
                      <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: `${audience.iconColor}1A`, marginBottom: 12}}>
                        <FontAwesomeIcon icon={Icon} style={{color: audience.iconColor, fontSize: 24}} />
                      </span>
                      <h6 className="fw-bold mb-1">{audience.title}</h6>
                      <p className="small text-muted mb-0 px-2">{audience.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
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
            <div className="col-md-4">
              <FeatureCard
                icon={FaUpload}
                title="1. Upload your file"
                description="Upload any BOQ in Excel, PDF, or Word format"
                iconBgColor="bg-primary bg-opacity-10"
                iconColor="text-primary"
              />
            </div>
            <div className="col-md-4">
              <FeatureCard
                icon={FaBrain}
                title="2. Wisely reads and structures"
                description="Workwise AI reads, extracts, and structures data"
                iconBgColor="bg-success bg-opacity-10"
                iconColor="text-success"
              />
            </div>
            <div className="col-md-4">
              <FeatureCard
                icon={FaCheckCircle}
                title="3. Get results instantly"
                description="Your results are emailed + previewed instantly on site"
                iconBgColor="bg-warning bg-opacity-10"
                iconColor="text-warning"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sample Output Preview Section */}
      <section className="py-5 text-center">
        <div className="container">
          <h2 className="fw-bold mb-2">Sample Output Preview</h2>
          <p className="text-muted mb-4">
            Powerful AI-driven solutions to streamline your workflow and boost productivity
          </p>

          <div className="row g-4 mb-3">
            <div className="col-md-6">
              <FilePreview
                title="Procurement Analysis Report"
                description="Preview format only — your data stays secure"
                image="/assets/images/placeholder.jpeg"
                showPreview={false}
              />
            </div>
            <div className="col-md-6">
              <FilePreview
                title="Bill of Quantities (BOQ)"
                description="Preview format only — your data stays secure"
                image="/assets/images/placeholder.jpeg"
                showPreview={false}
              />
            </div>
          </div>

          <button className="btn btn-secondary" disabled>
            <FontAwesomeIcon icon={faEyeSlash} className="me-2" /> View Full Sample
          </button>
        </div>
      </section>

      {/* Call to Action Section */}
      <div style={{ position: 'relative' }}>
        <CtaSection
          title="Ready to Transform Your Procurement Process?"
          description={
            <>
              <span>Start using our AI tools today and experience the difference in efficiency, accuracy, and insights.</span>
              <span className="d-block mt-2" style={{fontWeight: 500}}>No credit card required. Free for your first file.</span>
            </>
          }
          primaryButton={{
            label: "Try for Free",
            variant: "white",
            onClick: handleTryForFree,
            icon: undefined,
            style: { minWidth: '200px' }
          }}
          secondaryButton={{
            label: "Book a Demo",
            variant: "outline",
            onClick: handleBookDemo,
            icon: undefined,
            style: { 
              minWidth: '200px',
              backgroundColor: 'transparent',
              borderColor: 'rgba(255,255,255,0.8)',
              color: 'white'
            }
          }}
        />
        <style>{`
          .CtaSection .btn, .CtaSection .btn-lg {
            min-width: 200px !important;
            max-width: 260px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AiToolsPage;