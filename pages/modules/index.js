import React from 'react';
import { useRouter } from 'next/router';
import { 
  Upload, 
  Tag, 
  Download, 
  FileText, 
  Brain, 
  CheckCircle,
  TrendingUp,
  HelpCircle,
  Search,
  Users,
  BarChart3,
  MessageSquare,
  CreditCard
} from 'lucide-react';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { CtaSection } from '@/components/ui/CtaSection';
import { FaqAccordion } from '@/components/ui/FaqAccordion';

// Import data
import { modulePageData } from '@/components/constants/modulePageData';

const ModulePage = () => {
  const router = useRouter();
  const { module } = router.query;
  
  // Wait for router to be ready to avoid hydration mismatch
  if (!router.isReady) {
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
      boq: [Upload, Tag, Download],
      rfq: [FileText, MessageSquare, BarChart3],
      vendors: [Search, Users, CheckCircle],
      evaluation: [BarChart3, TrendingUp, Download],
      negotiation: [MessageSquare, CheckCircle, FileText],
      payments: [CreditCard, BarChart3, Users]
    };
    return iconMap[moduleType] || [Upload, Tag, Download];
  };

  // Icon mapping for how it works steps
  const getStepIcons = (moduleType) => {
    const iconMap = {
      boq: [FileText, Brain, Download],
      rfq: [FileText, Brain, MessageSquare],
      vendors: [Search, Upload, Users],
      evaluation: [FileText, BarChart3, Download],
      negotiation: [MessageSquare, BarChart3, FileText],
      payments: [FileText, CheckCircle, CreditCard]
    };
    return iconMap[moduleType] || [FileText, Brain, Download];
  };

  const featureIcons = getFeatureIcons(currentModule);
  const stepIcons = getStepIcons(currentModule);

  const handlePrimaryAction = () => {
    // Handle primary CTA based on module
    console.log(`${moduleData.hero.primaryButton.label} clicked`);
  };

  const handleSecondaryAction = () => {
    // Handle secondary CTA
    console.log('Book a Call clicked');
  };

  // Dynamic visual placeholder based on module
  const ModuleVisualPlaceholder = () => {
    const visualMap = {
      boq: {
        title: "BOQ Simplification Process",
        left: { title: "BOQ", items: ["Staffy icannet", "ccedfit loools", "stinfilisctution"] },
        right: { title: "Simplified", items: ["Ctudficgane", "Ccedfil pools", "Ccedft: ciater", "Cesate pools", "Ccedtil plant"] }
      },
      rfq: {
        title: "RFQ Generation Process",
        left: { title: "BOQ", items: ["Product A", "Product B", "Product C"] },
        right: { title: "RFQ", items: ["Vendor 1", "Vendor 2", "Vendor 3"] }
      },
      vendors: {
        title: "Vendor Discovery",
        left: { title: "Search", items: ["Category", "Location", "Approval"] },
        right: { title: "Vendors", items: ["Vendor A", "Vendor B", "Vendor C"] }
      },
      evaluation: {
        title: "Quote Evaluation",
        left: { title: "Quotes", items: ["Vendor 1", "Vendor 2", "Vendor 3"] },
        right: { title: "Analysis", items: ["Comparison", "Deviations", "Recommendation"] }
      },
      negotiation: {
        title: "Negotiation Process",
        left: { title: "Initial", items: ["Quote", "Terms", "Timeline"] },
        right: { title: "Final", items: ["Agreement", "Contract", "Approval"] }
      },
      payments: {
        title: "Payment Management",
        left: { title: "PO", items: ["Order", "Delivery", "Quality"] },
        right: { title: "Payment", items: ["Milestone", "Invoice", "Settlement"] }
      }
    };

    const visual = visualMap[currentModule] || visualMap.boq;

    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <div className="text-center text-white">
          <div className="mb-3">
            <div className="d-flex align-items-center gap-4">
              <div className="bg-white bg-opacity-20 rounded p-3">
                <div className="text-center mb-2">
                  <strong>{visual.left.title}</strong>
                </div>
                <div className="small">
                  {visual.left.items.map((item, index) => (
                    <div key={index}>{item}</div>
                  ))}
                </div>
              </div>
              <div>→</div>
              <div className="bg-white bg-opacity-20 rounded p-3">
                <div className="small">
                  {visual.right.items.map((item, index) => (
                    <div key={index}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mb-0 small">{visual.title}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <HeroSection
        title={moduleData.hero.title}
        subtitle={moduleData.hero.subtitle}
        primaryButton={{
          ...moduleData.hero.primaryButton,
          onClick: handlePrimaryAction
        }}
        secondaryButton={{
          ...moduleData.hero.secondaryButton,
          onClick: handleSecondaryAction
        }}
        visualContent={{
          component: ModuleVisualPlaceholder
        }}
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
              {moduleData.howItWorks.title}
            </h2>
          </div>
          
          <div className="row g-4">
            {moduleData.howItWorks.steps.map((step, index) => (
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
        icon={HelpCircle}
        primaryButton={{
          ...moduleData.finalCta.primaryButton,
          onClick: handlePrimaryAction
        }}
        secondaryButton={{
          ...moduleData.finalCta.secondaryButton,
          onClick: handleSecondaryAction
        }}
      />
    </div>
  );
};

export default ModulePage; 