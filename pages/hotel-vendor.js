import React, { useState, useEffect } from 'react';
import { HeroSection } from '../components/ui/HeroSection';
import { ColourfulCard } from '../components/ui/ColourfulCard';
import { CtaSection } from '../components/ui/CtaSection';
import RegisterUserModal from '../components/modal/RegisterUserModal';
import SubscriptionModal from '../components/modal/SubscriptionModal';
import Head from 'next/head';
import { toast, ToastContainer } from 'react-toastify';
import { useRouter } from 'next/router';
import { 
  proceedToSubscription, 
  loadScript, 
  testRazorPayEndpoint 
} from '../services/subscription';
import storageInstance from '../utils/storageInstance';
import { pricingData } from '../components/constants/pricingData';

const HotelVendor = () => {
  const router = useRouter();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState({
    plan: null,
    billingCycle: null
  });
  const [appliedCouponData, setAppliedCouponData] = useState([]);
  const [couponCode, setCouponCode] = useState("");

  const features = [
    {
      title: "Specialized for Hospitality",
      subtitle: "Tailored solutions for hotels, restaurants, and hospitality businesses",
      bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      icon: "lightbulb",
      iconColor: "#667eea",
      features: [
        { icon: "list", title: "Hospitality Products", description: "Access specialized products for hotels and restaurants" },
        { icon: "users", title: "B2B Networking", description: "Connect with hospitality buyers nationwide" },
        { icon: "chart-line", title: "Industry Insights", description: "Get market trends specific to hospitality sector" }
      ],
      buttonText: "Register Now",
      url: "#register"
    },
    {
      title: "Exclusive Benefits",
      subtitle: "Special features designed for hospitality vendors",
      bgGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      icon: "wand-magic-sparkles",
      iconColor: "#f093fb",
      features: [
        { icon: "bolt", title: "Fast Onboarding", description: "Quick registration and approval process" },
        { icon: "share-alt", title: "Wide Reach", description: "Access to major hotel chains and restaurants" },
        { icon: "money-bill", title: "Better Margins", description: "Competitive pricing and better profit margins" }
      ],
      buttonText: "Learn More",
      url: "#benefits"
    }
  ];

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
      order_id: orderId,
      currency: "INR",
      name: "Workwise",
      description: "Hospitality Vendor Registration",
      image: "/assets/images/logo.png",
      handler: function (response) {
        const payload = {
          order_id: orderId
        };
        testRazorPayEndpoint(payload).then(res => {
          if(res.data) {
            toast.success('Payment successful! Your account will be approved shortly.');
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        })
      },
      prefill: {
        name: "",
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
    storageInstance.removeStorege("token");
  };

  const handleRegistrationSuccess = (userData) => {    
    setShowRegisterModal(false);
    
    if (userData && selectedPlan) {      
      if (userData.token) {
        storageInstance.setStorage("token", userData.token);
      }
      
      setSelectedSubscription(prev => ({
        ...prev,
        userData: userData
      }));
      
      handleShowModal(selectedPlan);
    } else {
      toast.error("Registration successful but user data missing. Please try again.");
    }
  };

  const handleRegistrationClose = () => {
    setShowRegisterModal(false);
    setSelectedPlan(null);
    storageInstance.removeStorege("token");
  };

  const handleShowModal = (plan) => {
    let subscriptionId;
    if (plan.name === "Silver") {
      subscriptionId = "21";
    } else if (plan.name === "Gold") {
      subscriptionId = "23";
    } else {
      subscriptionId = `plan_${plan.name.toLowerCase()}_${Date.now()}`;
    }

    const billingCycle = {
      id: subscriptionId,
      duration: 12,
      label: "Yearly",
      price: plan.price.replace(/[^\d]/g, ''),
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
    // Import applyCoupon from services
    import('../services/subscription').then(({ applyCoupon }) => {
      applyCoupon(payload)
        .then((res) => {
          if (res?.status === 1) {
            toast.success("Coupon Applied");
            setAppliedCouponData(res.data);
          } else if (res.status === 2) {
            toast.error(res?.errors?.coupon_code);
          } else {
            toast.error("Internal server error");
          }
        })
        .catch((error) => {
          if (error?.message) {
            toast.error(error.message.response?.data?.message || "Failed to apply coupon");
          }
        });
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
          toast.error(error.message.response?.data?.message || "Payment failed", {
            position: "top-right",
          });
        }
      });
  };

  const handleRegisterClick = () => {
    // Use Silver plan as default for hospitality vendors
    const silverPlan = pricingData.sellers.plans.find(p => p.name === 'Silver');
    setSelectedPlan(silverPlan);
    setShowRegisterModal(true);
  };

  return (
    <>
      <Head>
        <title>Hotel & Restaurant Vendor Registration | Workwise</title>
        <meta name="description" content="Join Workwise as a hospitality vendor. Connect with hotels and restaurants across India." />
      </Head>

      <HeroSection
        title="Grow Your Hospitality Business"
        subtitle="Join India's leading B2B platform for hotels and restaurants"
        layout="split"
        size="medium"
        valueProps={[
          { icon: '🏨', text: '1000+ Hotels', color: '#667eea' },
          { icon: '🍽️', text: '500+ Restaurants', color: '#f093fb' },
          { icon: '✅', text: 'Verified Platform', color: '#10b981' }
        ]}
        primaryButton={{
          id: "hero_register_now",
          label: "Register Now",
          variant: "white",
          onClick: handleRegisterClick
        }}
      />

      {/* Features Section */}
      <section id="features" className="py-5">
        <div className="container">
          <div className="row justify-content-center mb-4">
            <div className="col-lg-8 text-center">
              <h2 className="fw-bold mb-3">Why Choose Workwise for Hospitality?</h2>
              <p className="text-muted">Specialized platform designed for hospitality vendors</p>
            </div>
          </div>
          <div className="row g-4">
            {features.map((feature, index) => (
              <div key={index} className="col-lg-6">
                <ColourfulCard
                  title={feature.title}
                  subtitle={feature.subtitle}
                  bgGradient={feature.bgGradient}
                  icon={feature.icon}
                  iconColor={feature.iconColor}
                  features={feature.features}
                  buttonText={feature.buttonText}
                  buttonVariant="primary"
                  url={feature.url}
                  onClick={() => feature.url === '#register' && setShowRegistrationModal(true)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CtaSection
        title="Ready to Transform Your Business?"
        description="Join thousands of successful hospitality vendors on Workwise"
        primaryButton={{
          id: "cta_register_now",
          label: "Register Now",
          variant: "white",
          onClick: handleRegisterClick
        }}
      />

      {/* Registration Modal */}
      <RegisterUserModal
        showModal={showRegisterModal}
        setShowModal={setShowRegisterModal}
        showButton={false}
        onRegistrationSuccess={handleRegistrationSuccess}
        onClose={handleRegistrationClose}
        isPaidSubscription={true}
        isHospitality={true}
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
    </>
  );
};

export default HotelVendor;


