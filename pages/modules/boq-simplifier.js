import React from 'react';
import { 
  Upload, 
  Tag, 
  Download, 
  FileText, 
  Brain, 
  CheckCircle,
  TrendingUp,
  HelpCircle
} from 'lucide-react';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { CtaSection } from '@/components/ui/CtaSection';
import { FaqAccordion } from '@/components/ui/FaqAccordion';

// Import data
import {
  heroData,
  benefitsData,
  howItWorksData,
  customerSayingsData,
  faqData,
  finalCtaData
} from '@/components/constants/boqPageData';

const BoqSimplifierPage = () => {
  // Icon components for features
  const featureIcons = [
    Upload,
    Tag,
    Download
  ];

  // Icon components for how it works
  const stepIcons = [
    FileText,
    Brain,
    Download
  ];

  const handleTryBoqSimplifier = () => {
    // Handle primary CTA
    console.log('Try BOQ Simplifier clicked');
  };

  const handleBookCall = () => {
    // Handle secondary CTA
    console.log('Book a Call clicked');
  };

  // Simple placeholder component for BOQ visual
  const BoqVisualPlaceholder = () => (
    <div className="d-flex align-items-center justify-content-center h-100">
      <div className="text-center text-white">
        <div className="mb-3">
          <div className="d-flex align-items-center gap-4">
            <div className="bg-white bg-opacity-20 rounded p-3">
              <div className="text-center mb-2">
                <strong>BOQ</strong>
              </div>
              <div className="small">
                <div>Staffy icannet</div>
                <div>ccedfit loools</div>
                <div>stinfilisctution</div>
              </div>
            </div>
            <div>→</div>
            <div className="bg-white bg-opacity-20 rounded p-3">
              <div className="small">
                <div>Ctudficgane</div>
                <div>Ccedfil pools</div>
                <div>Ccedft: ciater</div>
                <div>Cesate pools</div>
                <div>Ccedtil plant</div>
              </div>
            </div>
          </div>
        </div>
        <p className="mb-0 small">BOQ Simplification Process</p>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <HeroSection
        title={heroData.title}
        subtitle={heroData.subtitle}
        primaryButton={{
          ...heroData.primaryButton,
          onClick: handleTryBoqSimplifier
        }}
        secondaryButton={{
          ...heroData.secondaryButton,
          onClick: handleBookCall
        }}
        visualContent={{
          component: BoqVisualPlaceholder
        }}
      />

      {/* Top Benefits Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <h2 className="fs-1 fw-bold text-dark text-center mb-5">
            {benefitsData.title}
          </h2>
          
          <div className="row g-4">
            {benefitsData.features.map((feature, index) => (
              <div key={index} className="col-md-4">
                <FeatureCard
                  icon={featureIcons[index]}
                  iconBgColor={feature.iconBgColor}
                  iconColor={feature.iconColor}
                  title={feature.title}
                  description={feature.description}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          <div className="d-flex align-items-center justify-content-center mb-5">
            <TrendingUp className="me-2" size={24} style={{ color: 'var(--text-color)' }} />
            <h2 className="fs-1 fw-bold text-dark mb-0">
              {howItWorksData.title}
            </h2>
          </div>
          
          <div className="row g-4">
            {howItWorksData.steps.map((step, index) => (
              <div key={index} className="col-md-4">
                <FeatureCard
                  icon={stepIcons[index]}
                  iconBgColor="bg-light"
                  iconColor="text-muted"
                  title={step.title}
                  description={step.description}
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
            <TrendingUp className="me-2" size={24} style={{ color: 'var(--red-color)' }} />
            <h2 className="fs-1 fw-bold text-dark mb-0">
              {customerSayingsData.title}
            </h2>
          </div>
          
          <div className="row g-4">
            {/* Testimonial Card */}
            <div className="col-lg-6">
              <TestimonialCard
                quote={customerSayingsData.testimonial.quote}
                authorName={customerSayingsData.testimonial.authorName}
                authorTitle={customerSayingsData.testimonial.authorTitle}
                authorImage={customerSayingsData.testimonial.authorImage}
              />
            </div>
            
            {/* Real Outcomes Card */}
            <div className="col-lg-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body p-4">
                  <h3 className="fs-3 fw-bold text-dark mb-4">
                    {customerSayingsData.realOutcomes.title}
                  </h3>
                  
                  <div className="d-flex flex-column gap-3">
                    {customerSayingsData.realOutcomes.items.map((item, index) => (
                      <div key={index} className="d-flex align-items-center">
                        <CheckCircle className="text-success me-3" size={20} />
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
                {faqData.title}
              </h2>
              
              <FaqAccordion questions={faqData.questions} />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <CtaSection
        title={finalCtaData.title}
        icon={HelpCircle}
        primaryButton={{
          ...finalCtaData.primaryButton,
          onClick: handleTryBoqSimplifier
        }}
        secondaryButton={{
          ...finalCtaData.secondaryButton,
          onClick: handleBookCall
        }}
      />
    </div>
  );
};

export default BoqSimplifierPage; 