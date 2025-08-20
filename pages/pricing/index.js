import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWrench, faShoppingBag, faCheck, faTimes, faStar, faCompass, faGear, faChartBar, faInfoCircle, faShieldAlt, faLock, faClock } from '@fortawesome/free-solid-svg-icons';

// Import existing components
import { Button } from '@/components/ui/Button';
import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { HeroSection } from '@/components/ui/HeroSection';

// Import subscription components and services
import SubscriptionModal from '@/components/modal/SubscriptionModal';
import RegisterUserModal from '@/components/modal/RegisterUserModal';
import { 
  proceedToSubscription, 
  applyCoupon, 
  loadScript, 
  testRazorPayEndpoint 
} from '@/services/subscription';

// Import data
import { pricingData } from '@/components/constants/pricingData';
import { toast, ToastContainer } from 'react-toastify';
import storageInstance from '@/utils/storageInstance';

const PricingPage = () => {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState('buyers');
  
  // Subscription state
  const [showModal, setShowModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState({
    plan: null,
    billingCycle: null
  });
  const [appliedCouponData, setAppliedCouponData] = useState([]);
  const [couponCode, setCouponCode] = useState("");

  // Animated Counter Component
  const AnimatedCounter = ({ targetValue, suffix = '', duration = 1500 }) => {
    const [value, setValue] = React.useState(0);
    const ref = React.useRef(null);
    const hasAnimated = React.useRef(false);
    React.useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const start = performance.now();
            const animate = (now) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(eased * targetValue));
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      }, { threshold: 0.4 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }, [targetValue, duration]);
    return (
      <div ref={ref} className="fw-bold" style={{ fontSize: '1.75rem' }}>
        {value.toLocaleString()}<span>{suffix}</span>
      </div>
    );
  };

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

  // Cleanup token when component unmounts
  useEffect(() => {
    return () => {
      storageInstance.removeStorege("token");
    };
  }, []);

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
      order_id: orderId, // This is Api key. you will get it from razorpay dashboard > account and settings > API keys
      // amount: parseInt(amount * 100),
      currency: "INR", // your 3 letter currency code
      name: "Workwise", // project or transaction name
      description: "Workwise Subscription",
      image: "/assets/images/logo.png",
      handler: function (response) {
        const payload = {
          order_id: orderId
        };
        testRazorPayEndpoint(payload).then(res => {
          if(res.data) {
            console.log("RES DATA => ", res.data);
            router.push(`/dashboard/subscription/confirmation`); // after payment completes on stripe this function will be called and you can do your stuff
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
    // Clean up token when subscription modal is closed
    storageInstance.removeStorege("token");
  };

  const handleRegistrationSuccess = (userData) => {    
    // Close registration modal
    setShowRegisterModal(false);
    
    // Store user data for subscription registration
    if (userData && selectedPlan) {      
      // If we have a token, store it temporarily for API calls
      if (userData.token) {
        storageInstance.setStorage("token", userData.token);
      }
      
      // Store the user data temporarily for subscription
      setSelectedSubscription(prev => ({
        ...prev,
        userData: userData
      }));
      
      // Proceed with subscription modal
      handleShowModal(selectedPlan);
    } else {
      toast.error("Registration successful but user data missing. Please try again.");
    }
  };

  const handleRegistrationClose = () => {
    setShowRegisterModal(false);
    setSelectedPlan(null);
    // Clean up any stored token
    storageInstance.removeStorege("token");
  };

  const handleShowModal = (plan) => {
    // Use specific subscription IDs for Silver and Gold plans
    let subscriptionId;
    if (plan.name === "Silver") {
      subscriptionId = "21";
    } else if (plan.name === "Gold") {
      subscriptionId = "23";
    } else {
      subscriptionId = `plan_${plan.name.toLowerCase()}_${Date.now()}`; // Fallback for other plans
    }

    // Create billing cycle data structure based on plan
    const billingCycle = {
      id: subscriptionId,
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
    const payload = {
      sub_id: selectedSubscription.billingCycle?.id,
      coupon_code: couponCode,
    };
    applyCoupon(payload)
      .then((res) => {
        if (res?.status === 1) {
          toast.success("Coupon Applied");
          setAppliedCouponData(res.data);
        } else if (res.status === 2) {
          toast.error(res?.errors?.coupon_code);
          return;
        } else {
          toast.error("Internal server error");
          return;
        }
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(error.message.response.data.message, {
            position: "top-right",
          });
        }

        if (error.response?.status === 400) {
          if (error.response.data.status === 2) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else if (error.response.data.status === 3) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else {
            toast.error(error.response.data.message, {
              position: "top-right",
            });
          }
        } else {
          toast.error(error.message, {
            position: "top-right",
          });
        }
      });
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
      // Include user data for subscription registration
      user_email: selectedSubscription.userData?.email,
      user_name: selectedSubscription.userData?.name,
      user_mobile: selectedSubscription.userData?.mobile,
      organization_name: selectedSubscription.userData?.organization_name,
      register_as: selectedSubscription.userData?.register_as
    };
    
    proceedToSubscription(payload)
      .then(async (res) => {
        if (res?.status) {
          await payWithRazorPay(res?.data);
          setShowModal(false);
          setCouponCode("");
        }
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(error.message.response.data.message, {
            position: "top-right",
          });
        }

        if (error.response?.status === 400) {
          if (error.response.data.status === 2) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else if (error.response.data.status === 3) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-right",
            });
          } else {
            toast.error(error.response.data.message, {
              position: "top-right",
            });
          }
        } else {
          toast.error(error.message, {
            position: "top-right",
          });
        }
      });
  };

  const handleContactUs = () => {
    console.log('Contact Us clicked');
    // Route to contact form or CRM
    router.push('/contactus');
  };

  const handleStartFree = () => {
    console.log('Start for Free clicked');
    // Route to for-vendors page
    setShowRegisterModal(true);
  };

  const handleUpgradeSilver = () => {
    console.log('Upgrade to Silver clicked');
    // Store selected plan and show registration modal
    const silverPlan = pricingData.sellers.plans.find(p => p.name === 'Silver');
    setSelectedPlan(silverPlan);
    setShowRegisterModal(true);
  };

  const handleGetGoldAccess = () => {
    console.log('Get Gold Access clicked');
    // Store selected plan and show registration modal
    const goldPlan = pricingData.sellers.plans.find(p => p.name === 'Gold');
    setSelectedPlan(goldPlan);
    setShowRegisterModal(true);
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
                          <FontAwesomeIcon icon={faWrench} style={{ color: 'white', fontSize: '16px' }} />
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
                  <p className="text-muted mb-4">Join hundreds of companies who trust Workwise with their critical procurement workflows.</p>
                  
                  {/* Stats Cards */}
                  <div className="row g-4 mb-5 justify-content-center">
                    <div className="col-lg-4 col-md-6 col-6">
                      <div className="card h-90 border-0 shadow-lg rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', minHeight: '160px' }}>
                        <div className="card-body p-5 text-center">
                          <div className="mb-4 d-flex align-items-center justify-content-center">
                            <AnimatedCounter targetValue={12500} />
                            <span>+</span>
                          </div>
                          <div className="text-muted fw-medium" style={{ fontSize: '1rem' }}>
                            Vendors onboarded
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 col-6">
                      <div className="card h-90 border-0 shadow-lg rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', minHeight: '160px' }}>
                        <div className="card-body p-5 text-center">
                          <div className="mb-4 d-flex align-items-center justify-content-center">
                            <AnimatedCounter targetValue={100} />
                            <span>+</span>
                          </div>
                          <div className="text-muted fw-medium" style={{ fontSize: '1rem' }}>
                            EPC clients
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-4 col-md-6 col-6">
                      <div className="card h-90 border-0 shadow-lg rounded-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', minHeight: '160px' }}>
                        <div className="card-body p-5 text-center">
                          <div className="mb-4 d-flex align-items-center justify-content-center">
                            <AnimatedCounter targetValue={1500} />
                            <span>+</span>
                          </div>
                          <div className="text-muted fw-medium" style={{ fontSize: '1rem' }}>
                            International vendors
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="row g-2 mb-5">
                    <div className="col-lg-3 col-md-6">
                      <div className="card h-100 border-0 shadow-sm rounded-4">
                        <div className="card-body px-2 py-4 text-center d-none d-md-block">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                            style={{
                              width: '64px',
                              height: '64px',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: 'white'
                            }}
                          >
                            <FontAwesomeIcon icon={faShieldAlt} size="lg" />
                          </div>
                          <h5 className="fw-bold text-dark mb-0">ISO 27001 Certified</h5>
                        </div>
                        <div className="card-body px-2 py-4 d-md-none d-flex align-items-center">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle me-3"
                            style={{
                              width: '48px',
                              height: '48px',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: 'white',
                              flexShrink: 0
                            }}
                          >
                            <FontAwesomeIcon icon={faShieldAlt} />
                          </div>
                          <h6 className="fw-bold text-dark mb-0 text-start">ISO 27001 Certified</h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="card h-100 border-0 shadow-sm rounded-4">
                        <div className="card-body px-2 py-4 text-center d-none d-md-block">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                            style={{
                              width: '64px',
                              height: '64px',
                              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                              color: 'white'
                            }}
                          >
                            <FontAwesomeIcon icon={faLock} size="lg" />
                          </div>
                          <h5 className="fw-bold text-dark mb-0">Data Encryption</h5>
                        </div>
                        <div className="card-body px-2 py-4 d-md-none d-flex align-items-center">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle me-3"
                            style={{
                              width: '48px',
                              height: '48px',
                              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                              color: 'white',
                              flexShrink: 0
                            }}
                          >
                            <FontAwesomeIcon icon={faLock} />
                          </div>
                          <h6 className="fw-bold text-dark mb-0 text-start">Data Encryption</h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="card h-100 border-0 shadow-sm rounded-4">
                        <div className="card-body px-2 py-4 text-center d-none d-md-block">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                            style={{
                              width: '64px',
                              height: '64px',
                              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                              color: 'white'
                            }}
                          >
                            <FontAwesomeIcon icon={faShieldAlt} size="lg" />
                          </div>
                          <h5 className="fw-bold text-dark mb-0">Cloud Security</h5>
                        </div>
                        <div className="card-body px-2 py-4 d-md-none d-flex align-items-center">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle me-3"
                            style={{
                              width: '48px',
                              height: '48px',
                              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                              color: 'white',
                              flexShrink: 0
                            }}
                          >
                            <FontAwesomeIcon icon={faShieldAlt} />
                          </div>
                          <h6 className="fw-bold text-dark mb-0 text-start">Cloud Security</h6>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="card h-100 border-0 shadow-sm rounded-4">
                        <div className="card-body px-2 py-4 text-center d-none d-md-block">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
                            style={{
                              width: '64px',
                              height: '64px',
                              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                              color: 'white'
                            }}
                          >
                            <FontAwesomeIcon icon={faClock} size="lg" />
                          </div>
                          <h5 className="fw-bold text-dark mb-0">24/7 Monitoring</h5>
                        </div>
                        <div className="card-body px-2 py-4 d-md-none d-flex align-items-center">
                          <div 
                            className="d-flex align-items-center justify-content-center rounded-circle me-3"
                            style={{
                              width: '48px',
                              height: '48px',
                              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                              color: 'white',
                              flexShrink: 0
                            }}
                          >
                            <FontAwesomeIcon icon={faClock} />
                          </div>
                          <h6 className="fw-bold text-dark mb-0 text-start">24/7 Monitoring</h6>
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
                                  <FontAwesomeIcon icon={faCheck} style={{ color: 'var(--green-color)', fontSize: '16px' }} />
                                ) : (
                                  <FontAwesomeIcon icon={faTimes} style={{ color: 'var(--pink-color)', fontSize: '16px' }} />
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
                                  <FontAwesomeIcon icon={faInfoCircle} className="ms-1 text-muted" style={{ fontSize: '12px' }} />
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
                            <FontAwesomeIcon icon={faCheck} className="me-2" style={{ color: 'var(--green-color)', fontSize: '16px' }} />
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

      {/* Registration Modal */}
      <RegisterUserModal
        showModal={showRegisterModal}
        setShowModal={setShowRegisterModal}
        showButton={false}
        onRegistrationSuccess={handleRegistrationSuccess}
        onClose={handleRegistrationClose}
        isPaidSubscription={true}
      />

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