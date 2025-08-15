import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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

// Import subscription components and services
import SubscriptionModal from '@/components/modal/SubscriptionModal';
import { 
  proceedToSubscription, 
  applyCoupon, 
  loadScript, 
  testRazorPayEndpoint 
} from '@/services/subscription';

// Import data
import { pricingData } from '@/components/constants/pricingData';
import { toast, ToastContainer } from 'react-toastify';

const PricingPage = () => {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState('buyers');
  
  // Subscription state
  const [showModal, setShowModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState({
    plan: null,
    billingCycle: null
  });
  const [appliedCouponData, setAppliedCouponData] = useState([]);
  const [couponCode, setCouponCode] = useState("");

  // Set initial tab based on URL parameter
  useEffect(() => {
    if (router.isReady) {
      if (tab === 'supplier' || tab === 'sellers') {
        setActiveTab('sellers');
      } else if (tab === 'buyer' || tab === 'buyers') {
        setActiveTab('buyers');
      }
    }
  }, [tab, router.isReady]);

  // Payment integration functions
  const payWithRazorPay = async (orderId) => {
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!res) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderId,
      currency: "INR",
      name: "Workwise",
      description: "Workwise Subscription",
      image: "/assets/images/logo.png",
      handler: function (response) {
        const payload = {
          order_id: orderId
        };
        testRazorPayEndpoint(payload).then(res => {
          if(res.data) {
            console.log("RES DATA => ", res.data);
            toast.success("Payment successful! Redirecting to dashboard...");
            setTimeout(() => {
              router.push('/dashboard/subscription');
            }, 2000);
          }
        })
      },
      prefill: {
        name: "Workwise",
        email: "",
        contact: "",
      },
      notes: {
        address: "India",
      },
      theme: {
        color: "#158993",
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const handleClose = () => {
    setAppliedCouponData([]);
    setCouponCode("");
    setShowModal(false);
  };

  const handleShowModal = (plan) => {
    // Create billing cycle data structure based on plan
    const billingCycle = {
      id: `plan_${plan.name.toLowerCase()}`,
      duration: 12, // Yearly
      label: "Yearly",
      price: plan.price.replace(/[^\d]/g, ''), // Extract numeric price
      currency: "INR",
      discount_price: plan.price.replace(/[^\d]/g, ''),
      plan_type: plan.name === "Free" ? "f" : "p",
      Offers: [],
      active: false,
      start_date: new Date(),
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    };

    setSelectedSubscription({
      plan: {
        plan_name: plan.name,
        plan_type: plan.name === "Free" ? "f" : "p",
        feature: plan.features.map(f => ({ feature_name: f.name }))
      },
      billingCycle: billingCycle
    });
    setShowModal(true);
  };

  const handleCpuponCode = (e) => {
    setCouponCode(e.target.value);
  };

  const applyCouponToPlan = () => {
    if (couponCode === "") {
      toast.error("Enter coupon code");
      return;
    }
    
    // For demo purposes, simulate coupon application
    // In real implementation, this would call the API
    const payload = {
      sub_id: selectedSubscription.billingCycle?.id,
      coupon_code: couponCode,
    };
    
    // Simulate API call
    setTimeout(() => {
      if (couponCode.toLowerCase() === 'demo10') {
        const discountAmount = Math.floor(parseInt(selectedSubscription.billingCycle.price) * 0.1);
        setAppliedCouponData([{
          coupon_discount_price: discountAmount
        }]);
        toast.success("Coupon Applied - 10% discount!");
      } else {
        toast.error("Invalid coupon code");
      }
    }, 500);
  };

  const proceedToBuy = () => {
    if (selectedSubscription.plan.plan_name === "Free") {
      toast.success("Free plan activated! Redirecting to dashboard...");
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      setShowModal(false);
      return;
    }

    const payload = {
      sub_id: (selectedSubscription.billingCycle?.id).toString(),
      coupon_code: couponCode,
    };

    // Simulate API call for demo
    toast.info("Processing payment...");
    setTimeout(async () => {
      try {
        // Generate a mock order ID
        const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await payWithRazorPay(mockOrderId);
        setShowModal(false);
        setCouponCode("");
      } catch (error) {
        toast.error("Payment processing failed. Please try again.");
      }
    }, 1000);
  };

  const handleContactUs = () => {
    console.log('Contact Us clicked');
    // Route to contact form or CRM
    router.push('/contactus');
  };

  const handleStartFree = () => {
    console.log('Start for Free clicked');
    // Route to for-vendors page
    router.push('/for-vendors');
  };

  const handleUpgradeSilver = () => {
    console.log('Upgrade to Silver clicked');
    // Show subscription modal for Silver plan
    const silverPlan = pricingData.sellers.plans.find(p => p.name === 'Silver');
    handleShowModal(silverPlan);
  };

  const handleGetGoldAccess = () => {
    console.log('Get Gold Access clicked');
    // Show subscription modal for Gold plan
    const goldPlan = pricingData.sellers.plans.find(p => p.name === 'Gold');
    handleShowModal(goldPlan);
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
      <section className="py-4" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-auto">
              <div className="d-flex" style={{ 
                backgroundColor: 'var(--light-grey-bg)', 
                borderRadius: '8px', 
                padding: '4px',
                border: '1px solid var(--light-grey-border)'
              }}>
                <button
                  className="btn"
                  onClick={() => {
                    setActiveTab('buyers');
                    router.push('/pricing?tab=buyer', undefined, { shallow: true });
                  }}
                  style={{
                    borderRadius: '6px',
                    border: activeTab === 'buyers' ? '1px solid var(--light-grey-border)' : 'none',
                    backgroundColor: activeTab === 'buyers' ? 'var(--white-color)' : 'transparent',
                    color: activeTab === 'buyers' ? 'var(--black-color)' : 'var(--muted-text)',
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
                  onClick={() => {
                    setActiveTab('sellers');
                    router.push('/pricing?tab=supplier', undefined, { shallow: true });
                  }}
                  style={{
                    borderRadius: '6px',
                    border: activeTab === 'sellers' ? '1px solid var(--light-grey-border)' : 'none',
                    backgroundColor: activeTab === 'sellers' ? 'var(--white-color)' : 'transparent',
                    color: activeTab === 'sellers' ? 'var(--black-color)' : 'var(--muted-text)',
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
        <section className="py-5" style={{ backgroundColor: 'var(--light-grey-color)' }}>
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                {/* Main White Card */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body p-4 p-md-5">
                    <div className="text-center">
                      {/* Section Title */}
                      <div className="d-flex align-items-center justify-content-center mb-3">
                        <div 
                          className="me-3"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--orange-color)',
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
                      <p className="text-muted mb-4 mb-md-5" style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                        {pricingData.buyers.message}
                      </p>

                      {/* Feature Cards */}
                      <div className="row g-3 g-md-4 mb-4 mb-md-5">
                        {pricingData.buyers.features.map((feature, index) => (
                          <div key={index} className="col-12 col-md-4">
                            <div className="card h-100 border-0" style={{ 
                              backgroundColor: 'var(--light-grey-bg)', 
                              borderRadius: '12px' 
                            }}>
                              <div className="card-body p-3 p-md-4 text-center">
                                <div 
                                  className="mx-auto mb-3"
                                  style={{
                                    width: '64px',
                                    height: '64px',
                                    backgroundColor: 'var(--light-orange-bg)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <span style={{ fontSize: '24px', color: 'var(--orange-color)' }}>✓</span>
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
                        className="px-4 px-md-5 py-3 mb-4 mb-md-5 w-100 w-md-auto"
                        style={{ 
                          fontSize: '1rem', 
                          fontWeight: '600',
                          minWidth: 'auto'
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
                            <span style={{ fontSize: '32px', color: 'var(--orange-color)' }}>⭐</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>ISO 9001:2015</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: 'var(--orange-color)' }}>🛡️</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>ISO 27001</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: 'var(--orange-color)' }}>🏛️</span>
                          </div>
                          <span className="text-dark fw-medium" style={{ fontSize: '0.9rem' }}>Govt. Approved</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6">
                      <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '8px' }}>
                        <div className="card-body p-3 text-center">
                          <div className="mb-2">
                            <span style={{ fontSize: '32px', color: 'var(--orange-color)' }}>🤝</span>
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
          <section className="py-5" style={{ backgroundColor: 'var(--white-color)' }}>
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
                        border: plan.popular ? '2px solid var(--orange-color)' : 'none',
                        backgroundColor: 'var(--light-grey-bg)'
                      }}
                    >
                      {plan.popular && (
                        <div 
                          className="position-absolute"
                          style={{
                            top: '-12px',
                            right: '20px',
                            backgroundColor: 'var(--orange-color)',
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
                                  <Check size={16} style={{ color: 'var(--green-color)' }} />
                                ) : (
                                  <X size={16} style={{ color: 'var(--pink-color)' }} />
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
                            backgroundColor: plan.name === 'Silver' ? 'var(--orange-color)' : 'var(--black-color)',
                            borderColor: plan.name === 'Silver' ? 'var(--orange-color)' : 'var(--black-color)',
                            color: 'var(--white-color)',
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
                  <div className="rounded p-4" style={{ backgroundColor: 'var(--light-grey-bg)' }}>
                    <h5 className="fw-bold text-dark mb-3 text-center">All plans include:</h5>
                    <div className="row">
                      {pricingData.sellers.allPlansInclude.map((feature, index) => (
                        <div key={index} className="col-md-4">
                          <div className="d-flex align-items-center mb-2">
                            <Check size={16} className="me-2" style={{ color: 'var(--green-color)' }} />
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
          <section className="py-5" style={{ backgroundColor: 'var(--light-grey-bg)' }}>
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
                          backgroundColor: 'var(--light-orange-bg)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '24px', color: 'var(--orange-color)' }}>✓</span>
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
          <section className="py-5" style={{ backgroundColor: 'var(--white-color)' }}>
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

      {/* Subscription Modal */}
      <SubscriptionModal
        show={showModal}
        onHide={handleClose}
        proceedToBuy={proceedToBuy}
        selectedSubscription={selectedSubscription}
        applyCouponToPlan={applyCouponToPlan}
        appliedCouponData={appliedCouponData}
        handleCpuponCode={handleCpuponCode}
        couponCode={couponCode}
      />

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default PricingPage; 