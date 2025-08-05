import React, { useState } from 'react';
import { 
  Wrench,
  ShoppingBag,
  Check,
  X,
  Star,
  Compass,
  Settings,
  BarChart3,
  Info
} from 'lucide-react';

// Import existing components
import { Button } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { HeroSection } from '@/components/ui/HeroSection';

// Import data
import { pricingData } from '@/components/constants/pricingData';

const PricingPage = () => {
  const [activeTab, setActiveTab] = useState('buyers');

  const handleContactUs = () => {
    console.log('Contact Us clicked');
    // Route to contact form or CRM
  };

  const handleStartFree = () => {
    console.log('Start for Free clicked');
    // Route to signup with tag "pricing-page"
  };

  const handleUpgradeSilver = () => {
    console.log('Upgrade to Silver clicked');
    // Route to sales CRM with tag "pricing-page"
  };

  const handleGetGoldAccess = () => {
    console.log('Get Gold Access clicked');
    // Route to sales CRM with tag "pricing-page"
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
      {/* Hero Section */}
      <HeroSection
        title={pricingData.hero.title}
        subtitle={pricingData.hero.subtitle}
        layout="centered"
        size="small"
        showVisual={false}
      />

      {/* Tab Navigation */}
      <section className="py-4" style={{ backgroundColor: '#F8F8F8' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-auto">
              <div className="d-flex" style={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px', 
                padding: '4px',
                border: '1px solid #e9ecef'
              }}>
                <button
                  className="btn"
                  onClick={() => setActiveTab('buyers')}
                  style={{
                    borderRadius: '6px',
                    border: activeTab === 'buyers' ? '1px solid #e9ecef' : 'none',
                    backgroundColor: activeTab === 'buyers' ? '#ffffff' : 'transparent',
                    color: activeTab === 'buyers' ? '#000000' : '#6c757d',
                    padding: '8px 24px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTab === 'buyers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Buyers
                </button>
                <button
                  className="btn"
                  onClick={() => setActiveTab('sellers')}
                  style={{
                    borderRadius: '6px',
                    border: activeTab === 'sellers' ? '1px solid #e9ecef' : 'none',
                    backgroundColor: activeTab === 'sellers' ? '#ffffff' : 'transparent',
                    color: activeTab === 'sellers' ? '#000000' : '#6c757d',
                    padding: '8px 24px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTab === 'sellers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Sellers
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Buyers Tab Content */}
      {activeTab === 'buyers' && (
        <section className="py-5" style={{ backgroundColor: '#F8F8F8' }}>
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                {/* Main White Card */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body p-5">
                    <div className="text-center">
                      {/* Section Title */}
                      <div className="d-flex align-items-center justify-content-center mb-3">
                        <div 
                          className="me-3"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#ff9800',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Wrench size={16} style={{ color: 'white' }} />
                        </div>
                        <h2 className="fs-2 fw-bold text-dark mb-0">
                          {pricingData.buyers.title}
                        </h2>
                      </div>

                      {/* Message Block */}
                      <p className="text-muted mb-5" style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>
                        {pricingData.buyers.message}
                      </p>

                      {/* Feature Cards */}
                      <div className="row g-4 mb-5">
                        {pricingData.buyers.features.map((feature, index) => (
                          <div key={index} className="col-md-4">
                            <div className="card h-100 border-0" style={{ 
                              backgroundColor: '#F8F8F8', 
                              borderRadius: '12px' 
                            }}>
                              <div className="card-body p-4 text-center">
                                <div 
                                  className="mx-auto mb-3"
                                  style={{
                                    width: '64px',
                                    height: '64px',
                                    backgroundColor: '#fff3e0',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <span style={{ fontSize: '24px', color: '#ff9800' }}>✓</span>
                                </div>
                                <h5 className="fw-bold text-dark mb-2">{feature.title}</h5>
                                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                                  {feature.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <Button
                        label={pricingData.buyers.cta.label}
                        variant="dark"
                        icon="arrow-right"
                        onClick={handleContactUs}
                        className="px-5 py-3 mb-5"
                        style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '600',
                          minWidth: '400px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Trusted by Industry Leaders Section */}
                <div className="text-center mt-5">
                  <h3 className="fs-4 fw-bold text-dark mb-4">Trusted by Industry Leaders</h3>
                  <div className="row g-4 justify-content-center">
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: '#ff9800' }}>⭐</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>ISO 9001:2015</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: '#ff9800' }}>🛡️</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>ISO 27001</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: '#ff9800' }}>🏛️</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>Govt. Approved</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: '#ff9800' }}>🤝</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>PSU Partner</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sellers Tab Content */}
      {activeTab === 'sellers' && (
        <>
          {/* Pricing Tiers Section */}
          <section className="py-5" style={{ backgroundColor: '#ffffff' }}>
            <div className="container">
              <div className="row justify-content-center text-center mb-5">
                <div className="col-lg-8">
                  <div className="d-flex align-items-center justify-content-center mb-3">
                    <div 
                      className="me-3"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#ff9800',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ShoppingBag size={16} style={{ color: 'white' }} />
                    </div>
                                      <h2 className="fs-2 fw-bold text-dark mb-0">
                    {pricingData.sellers.title}
                  </h2>
                  </div>
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="row g-4 justify-content-center">
                {pricingData.sellers.plans.map((plan, index) => (
                  <div key={index} className="col-lg-4 col-md-6">
                    <div 
                      className={`card h-100 border-0 shadow-sm position-relative`}
                      style={{ 
                        borderRadius: '12px',
                        border: plan.popular ? '2px solid #ff9800' : 'none',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      {plan.popular && (
                        <div 
                          className="position-absolute"
                          style={{
                            top: '-12px',
                            right: '20px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          MOST POPULAR
                        </div>
                      )}

                      <div className="card-body p-4">
                        {/* Plan Header */}
                        <div className="text-center mb-4">
                          <h3 className="fw-bold text-dark mb-1">{plan.name}</h3>
                          <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                            {plan.subtitle}
                          </p>
                          <div className="fs-3 fw-bold text-dark">{plan.price}</div>
                        </div>

                        {/* Features List */}
                        <div className="mb-4">
                          {plan.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="d-flex align-items-center mb-3">
                              <div className="me-3">
                                {feature.included ? (
                                  <Check size={16} style={{ color: '#4caf50' }} />
                                ) : (
                                  <X size={16} style={{ color: '#f44336' }} />
                                )}
                              </div>
                              <div className="flex-grow-1">
                                <span className="text-dark" style={{ fontSize: '0.9rem' }}>
                                  {feature.name}
                                </span>
                                {feature.value && (
                                  <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                                    ({feature.value})
                                  </span>
                                )}
                                {feature.note && (
                                  <Info size={12} className="ms-1 text-muted" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* CTA Button */}
                        <Button
                          label={plan.cta.label}
                          variant={plan.name === 'Silver' ? 'warning' : 'dark'}
                          onClick={
                            plan.name === 'Free' ? handleStartFree :
                            plan.name === 'Silver' ? handleUpgradeSilver :
                            handleGetGoldAccess
                          }
                          className="w-100"
                          style={{
                            backgroundColor: plan.name === 'Silver' ? '#ff9800' : '#000000',
                            borderColor: plan.name === 'Silver' ? '#ff9800' : '#000000',
                            color: '#ffffff',
                            fontWeight: '600'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* All Plans Include */}
              <div className="row justify-content-center mt-5">
                <div className="col-lg-8">
                  <div className="rounded p-4" style={{ backgroundColor: '#f8f9fa' }}>
                    <h5 className="fw-bold text-dark mb-3 text-center">All plans include:</h5>
                                         <div className="row">
                       {pricingData.sellers.allPlansInclude.map((feature, index) => (
                         <div key={index} className="col-md-4">
                           <div className="d-flex align-items-center mb-2">
                             <Check size={16} className="me-2" style={{ color: '#4caf50' }} />
                             <span style={{ fontSize: '0.9rem' }}>{feature}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Why Upgrade Section */}
          <section className="py-5" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="container">
              <div className="row justify-content-center text-center mb-5">
                <div className="col-lg-8">
                  <h2 className="fs-2 fw-bold text-dark mb-4">{pricingData.sellers.whyUpgrade.title}</h2>
                </div>
              </div>

              <div className="row g-4">
                {pricingData.sellers.whyUpgrade.features.map((feature, index) => (
                  <div key={index} className="col-md-6 col-lg-3">
                    <div className="text-center">
                      <div 
                        className="mx-auto mb-3"
                        style={{
                          width: '64px',
                          height: '64px',
                          backgroundColor: '#fff3e0',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '24px', color: '#ff9800' }}>✓</span>
                      </div>
                      <h5 className="fw-bold text-dark mb-2">{feature.title}</h5>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-5" style={{ backgroundColor: '#ffffff' }}>
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <h2 className="fs-2 fw-bold text-dark text-center mb-5">Frequently Asked Questions</h2>
                  <FaqAccordion questions={pricingData.sellers.faq} />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default PricingPage; 