import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast, ToastContainer } from 'react-toastify';
import RegisterUserModal from '../components/modal/RegisterUserModal';
import SubscriptionModal from '../components/modal/SubscriptionModal';
import AuthModal from '../components/modal/AuthModal';
import {
  loadScript,
  testRazorPayEndpoint,
  hospitalitySubscriptionPayment
} from '../services/subscription';
import storageInstance from '../utils/storageInstance';
import { pricingData } from '../components/constants/pricingData';

const HotelVendor = () => {
  const router = useRouter();
  const { register, login } = router.query;

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState({
    plan: null,
    billingCycle: null,
    userData: null,
  });
  const [appliedCouponData, setAppliedCouponData] = useState([]);
  const [couponCode, setCouponCode] = useState('');

  // Query param auto-open
  useEffect(() => {
    if (register === 'true' || register === '') {
      setShowRegisterModal(true);
    }
    if (login === 'true' || login === '') {
      setShowLoginModal(true);
      setActiveTab('login');
    }
  }, [register, login]);

  // Cleanup token when component unmounts
  useEffect(() => {
    return () => {
      storageInstance.removeStorege('token');
    };
  }, []);

  const payWithRazorPay = async (orderId) => {
    const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderId,
      currency: 'INR',
      name: 'Phileein',
      description: 'Hospitality Vendor Registration',
      image: '/assets/images/logo.png',
      handler: function () {
        const payload = { order_id: orderId };
        testRazorPayEndpoint(payload).then((res) => {
          if (res.data) {
            toast.success('Payment successful! Your account will be approved shortly.');
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        });
      },
      prefill: { name: '', email: '', contact: '' },
      notes: { address: 'India' },
      theme: { color: '#158993' },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const handleCloseSubscription = () => {
    setAppliedCouponData([]);
    setCouponCode('');
    setShowSubscriptionModal(false);
    storageInstance.removeStorege('token');
  };

  const handleRegistrationSuccess = (userData) => {
    setShowRegisterModal(false);
    const plan = selectedPlan || pricingData.sellers.plans.find((p) => p.name === 'Silver');

    if (!userData || !plan) {
      toast.error('Registration successful but user data missing. Please try again.');
      return;
    }

    if (userData.token) {
      storageInstance.setStorage('token', userData.token);
    }

    const numCategories = (userData.categories || []).length;
    const numHotels = (userData.hotels || []).length;
    const perCategoryFee = 500;
    const perHotelFee = 500;
    const totalAmount =
      (numCategories * perCategoryFee + numHotels * perHotelFee) ||
      parseInt(plan.price.replace(/[^\d]/g, ''), 10) ||
      0;

    const subscriptionId =
      plan.name === 'Silver'
        ? '21'
        : plan.name === 'Gold'
        ? '23'
        : `plan_${plan.name.toLowerCase()}_${Date.now()}`;

    const billingCycle = {
      id: subscriptionId,
      duration: 12,
      label: 'Yearly',
      price: totalAmount,
      currency: 'INR',
      discount_price: totalAmount,
      plan_type: plan.name === 'Free' ? 'f' : 'p',
      Offers: [],
      active: false,
      start_date: new Date(),
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    };

    setSelectedSubscription((prev) => ({
      ...prev,
      plan: {
        plan_name: plan.name,
        plan_type: plan.name === 'Free' ? 'f' : 'p',
        feature: plan.features.map((f) => ({ feature_name: f.name })),
      },
      billingCycle,
      costBreakdown: {
        total: totalAmount,
        numCategories,
        numHotels,
        perCategoryFee,
        perHotelFee,
        categoryNames: userData?.categoryNames || [],
        hotelNames: userData?.hotelNames || [],
      },
      userData: userData || prev?.userData || {},
    }));

    setShowSubscriptionModal(true);
  };

  const handleRegistrationClose = () => {
    setShowRegisterModal(false);
    setSelectedPlan(null);
    storageInstance.removeStorege('token');
  };

  const handleShowModal = (plan, userData) => {
    setSelectedPlan(plan);
    handleRegistrationSuccess(userData);
  };

  const handleCpuponCode = (e) => setCouponCode(e.target.value);

  const applyCouponToPlan = () => {
    if (couponCode === '') {
      toast.error('Enter coupon code');
      return;
    }
    const payload = {
      sub_id: selectedSubscription.billingCycle?.id,
      coupon_code: couponCode,
    };
    import('../services/subscription').then(({ applyCoupon }) => {
      applyCoupon(payload)
        .then((res) => {
          if (res?.status === 1) {
            toast.success('Coupon Applied');
            setAppliedCouponData(res.data);
          } else if (res.status === 2) {
            toast.error(res?.errors?.coupon_code);
          } else {
            toast.error('Internal server error');
          }
        })
        .catch((error) => {
          if (error?.message) {
            toast.error(error.message.response?.data?.message || 'Failed to apply coupon');
          }
        });
    });
  };

  const proceedToBuy = () => {
    const userData = selectedSubscription.userData || {};
    const payload = {
      user_key: userData.user_key,
      categories: userData.categories || [],
      hotels: userData.hotels || [],
    };

    hospitalitySubscriptionPayment(payload)
      .then(async (res) => {
        if (res?.status) {
          await payWithRazorPay(res?.data);
          setShowSubscriptionModal(false);
        }
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(error.message.response?.data?.message || 'Payment failed', {
            position: 'top-right',
          });
        }
      });
  };

  const handleRegisterClick = () => {
    const silverPlan = pricingData.sellers.plans.find((p) => p.name === 'Silver');
    setSelectedPlan(silverPlan);
    setShowRegisterModal(true);
  };

  return (
    <>
      <Head>
        <title>Welcome to Phileein</title>
        <meta name="description" content="Phileein vendor onboarding" />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: 'white',
            marginBottom: '2rem',
          }}
        >
          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Phileein
          </h1>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 'normal',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            Welcome to Phileein
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => {
              setShowLoginModal(true);
              setActiveTab('login');
            }}
            style={{
              padding: '12px 32px',
              fontSize: '1.1rem',
              fontWeight: '600',
              backgroundColor: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 8px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
            }}
          >
            Login
          </button>
          <button
            onClick={handleRegisterClick}
            style={{
              padding: '12px 32px',
              fontSize: '1.1rem',
              fontWeight: '600',
              backgroundColor: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 8px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
            }}
          >
            Register
          </button>
        </div>
      </div>

      <RegisterUserModal
        showModal={showRegisterModal}
        setShowModal={setShowRegisterModal}
        showButton={false}
        onRegistrationSuccess={handleRegistrationSuccess}
        onClose={handleRegistrationClose}
        isPaidSubscription={true}
        isHospitality={true}
      />

      <SubscriptionModal
        show={showSubscriptionModal}
        onHide={handleCloseSubscription}
        proceedToBuy={proceedToBuy}
        selectedSubscription={selectedSubscription}
        applyCouponToPlan={applyCouponToPlan}
        appliedCouponData={appliedCouponData}
        handleCpuponCode={handleCpuponCode}
        couponCode={couponCode}
        isHospitality={true}
      />

      <AuthModal
        showModal={showLoginModal}
        closeModal={() => setShowLoginModal(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={showLoginModal}
        setOpenAuthModal={setShowLoginModal}
        setEmail={() => {}}
        setPassword={() => {}}
        loading={false}
        setloading={() => {}}
        loginSubmitHandler={() => {}}
        loginWithGoogle={() => {}}
      />

      <ToastContainer />
    </>
  );
};

export default HotelVendor;


