import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast, ToastContainer } from 'react-toastify';
import RegisterUserModal from '../components/modal/RegisterUserModal';
import SubscriptionModal from '../components/modal/SubscriptionModal';
import AuthModal from '../components/modal/AuthModal';
import LoginWithOtherDeviceModal from '../components/modal/LoginWithOtherDeviceModal';
import {
  loadScript,
  testRazorPayEndpoint,
  hospitalitySubscriptionPayment
} from '../services/subscription';
import storageInstance from '../utils/storageInstance';
import { pricingData } from '../components/constants/pricingData';
import { LoginService, SWSubscribe, handleSocialLogin, getProfile } from '../services/Auth';
import { useGoogleLogin } from '@react-oauth/google';
import { useSelector, useDispatch } from 'react-redux';
import { setUserProfile } from '@/redux/slice';

const HotelVendor = () => {
  const router = useRouter();
  const { register, login } = router.query;
  const dispatch = useDispatch();
  const swSubscription = useSelector((data) => data.swSubscription);

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtherDeviceModal, setShowOtherDeviceModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('/dashboard/buyer');
  // Use ref instead of state for payment success tracking - refs are synchronous
  const paymentSuccessfulRef = useRef(false);
  const retryDataRef = useRef(null);

  // Check if user is already logged in
  useEffect(() => {
    const token = storageInstance.getStorage('token');
    const userType = storageInstance.getStorage('current-user-type');
    if (token && userType) {
      setIsLoggedIn(true);
      const routes = {
        buyer: '/dashboard/buyer',
        vendor: '/dashboard/vendor',
        admin: '/dashboard/admin',
        management: '/dashboard/management',
        engineering: '/dashboard/engineering',
        finance: '/dashboard/finance',
      };
      setDashboardUrl(routes[userType] || '/dashboard/buyer');
    }

    const handleLoginChange = () => {
      const t = storageInstance.getStorage('token');
      const ut = storageInstance.getStorage('current-user-type');
      if (t && ut) {
        setIsLoggedIn(true);
        const routes = {
          buyer: '/dashboard/buyer', vendor: '/dashboard/vendor', admin: '/dashboard/admin',
          management: '/dashboard/management', engineering: '/dashboard/engineering', finance: '/dashboard/finance',
        };
        setDashboardUrl(routes[ut] || '/dashboard/buyer');
      }
    };
    window.addEventListener('loginStatusChanged', handleLoginChange);
    return () => window.removeEventListener('loginStatusChanged', handleLoginChange);
  }, []);

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

  // Cleanup token when component unmounts (only if payment wasn't successful)
  useEffect(() => {
    return () => {
      // Don't remove token if payment was successful - user needs it to access dashboard
      if (!paymentSuccessfulRef.current) {
        storageInstance.removeStorege('token');
      }
    };
  }, []);

  const payWithRazorPay = async (orderId, userCredentials = null) => {
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
      handler: function (response) {
        const payload = {
          order_id: orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        };
        testRazorPayEndpoint(payload)
          .then(async (res) => {
            if (res && res.status === 1) {
              const summary = res.data?.payment_summary || {};

              // Auto-login after successful payment
              if (userCredentials?.email && userCredentials?.password) {
                try {
                  const loginResponse = await LoginService(userCredentials, false);
                  if (loginResponse?.token) {
                    storageInstance.setStorage('token', loginResponse.token);
                    storageInstance.setStorage('current-user-type', 'vendor');
                    SWSubscribe({ subscription: swSubscription, token: loginResponse.token })
                      .catch(() => {});
                    try {
                      const profileRes = await getProfile();
                      dispatch(setUserProfile(profileRes.data));
                    } catch (err) {}
                  }
                } catch (loginError) {
                  console.error('Auto-login error:', loginError);
                }
              }

              // Mark payment as successful so token isn't cleared on unmount (use ref for sync update)
              paymentSuccessfulRef.current = true;
              toast.success('Payment successful!');
              // Redirect to generic payment success page with summary
              router.push({
                pathname: '/payment-success',
                query: {
                  type: 'hospitality_vendor',
                  order_id: orderId,
                  amount: summary.amount || '',
                  currency: 'INR',
                  description: 'Hospitality Vendor Registration',
                  expiry_date: summary.expiry_date || '',
                }
              });
            } else {
              toast.error('Payment processed but could not verify status. Please try logging in again.');
            }
          })
          .catch(() => {
            toast.error('Payment verification failed. Please contact support if your amount was debited.');
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
    const numSubcategories = (userData.subcategories || []).length;
    const numHotels = (userData.hotels || []).length;

    // Hospitality pricing model:
    // - Subcategories are free (temporary)
    // - Hotels do not have an independent hotel cost
    // - Total price = (price per category) × (number of categories) × (number of hotels selected)
    const perCategoryFee = 500;
    const perSubcategoryFee = 0;
    const perHotelFee = 0;

    const baseCategoryAmount = numCategories * perCategoryFee;
    const totalAmount =
      (numHotels > 0 ? baseCategoryAmount * numHotels : baseCategoryAmount) ||
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
        numSubcategories,
        numHotels,
        perCategoryFee,
        perSubcategoryFee,
        perHotelFee,
        categoryNames: userData?.categoryNames || [],
        subcategoryNames: userData?.subcategoryNames || [],
        hotelNames: userData?.hotelNames || [],
      },
      userData: {
        ...(userData || prev?.userData || {}),
        // Ensure email and password are available for auto-login after payment
        email: userData?.email || prev?.userData?.email,
        password: userData?.password || prev?.userData?.password,
      },
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
      subcategories: userData.subcategories || [],
      hotels: userData.hotels || [],
    };

    hospitalitySubscriptionPayment(payload)
      .then(async (res) => {
        if (res?.status) {
          // Pass user credentials for auto-login after payment
          const userCredentials = userData.email && userData.password 
            ? { email: userData.email, password: userData.password }
            : null;
          await payWithRazorPay(res?.data, userCredentials);
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

  const loginSubmitHandler = (values, isFromOtherModal = false) => {
    console.log("Login attempt with values:", values);
    setLoading(true);
    LoginService(values, isFromOtherModal)
      .then(async (response) => {
        console.log("Login response:", response);
        setLoading(false);
        if (isFromOtherModal) {
          handleCloseOtherDeviceModal();
        }
        if (response?.status === 5 && response?.hospitality_user) {
          toast.warning('Payment required for hospitality vendors. Please complete the payment to activate your account.');
          const payload = {
            user_key: response.hospitality_user.user_key,
            categories: response.hospitality_user.categories || [],
            subcategories: response.hospitality_user.subcategories || [],
            hotels: response.hospitality_user.hotels || [],
          };
          hospitalitySubscriptionPayment(payload)
            .then(async (res) => {
              if (res?.status) {
                // Pass login credentials for auto-login after payment
                await payWithRazorPay(res?.data, { email: values.email, password: values.password });
                setShowLoginModal(false);
              }
            })
            .catch((error) => {
              toast.error(error?.response?.data?.message || 'Payment failed');
            });
          return;
        }
        if (response?.token) {
          SWSubscribe({ subscription: swSubscription, token: response.token })
            .catch(() => {});
        }

        const userDetail = response?.user_detail?.[0];
        if (!userDetail) {
          toast.error('Unable to fetch user details. Please try again.');
          setLoading(false);
          return;
        }
        let userType = '';
        if (userDetail.user_type == 2) {
          userType = 'buyer';
        } else if (userDetail.user_type == 3) {
          userType = 'vendor';
        } else if (userDetail.user_type == 4) {
          userType = 'other';
        } else if (userDetail.user_type == 7) {
          userType = 'admin';
        } else if (userDetail.user_type == 8) {
          userType = 'management';
        } else if (userDetail.user_type == 9) {
          userType = 'engineering';
        } else if (userDetail.user_type == 10) {
          userType = 'finance';
        }
        
        if (!userType) {
          toast.error('Unknown user type. Please contact support.');
          setLoading(false);
          return;
        }
        
        storageInstance.setStorage('current-user-type', userType);
        setShowLoginModal(false);

        toast.success(response.message, {
          position: 'top-right',
        });

        try {
          const profileRes = await getProfile();
          dispatch(setUserProfile(profileRes.data));
        } catch (err) {}

        window.dispatchEvent(new Event('loginStatusChanged'));

        setTimeout(() => {
          window.location.href = `/dashboard/${userType}`;
        }, 300);
      })
      .catch((error) => {
        setLoading(false);
        if (
          error?.message?.response?.status === 400 &&
          error?.message?.response?.data?.status === 4
        ) {
          retryDataRef.current = {
            type: values.employee_code ? 'employee_code' : 'email',
            values: { ...values },
          };
          setShowLoginModal(false);
          setTimeout(() => {
            setShowOtherDeviceModal(true);
          }, 300);
        } else if (error?.message?.response?.data) {
          toast.error(error?.message?.response?.data?.message, {
            position: 'top-right',
          });
        } else {
          toast.error(error?.message || 'Login failed. Please try again.', {
            position: 'top-right',
          });
        }
      });
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setLoading(true);
      handleSocialLogin(
        {
          login_type: 'google',
          access_token: tokenResponse.access_token,
        },
        false
      )
        .then(async (response) => {
          if (response?.token) {
            SWSubscribe({ subscription: swSubscription, token: response.token })
              .catch(() => {});
          }

          let userType = '';
          if (response?.profile?.user_type == 2) {
            userType = 'buyer';
          } else if (response?.profile?.user_type == 3) {
            userType = 'vendor';
          } else if (response?.profile?.user_type == 7) {
            userType = 'admin';
          } else if (response?.profile?.user_type == 8) {
            userType = 'management';
          } else if (response?.profile?.user_type == 9) {
            userType = 'engineering';
          } else if (response?.profile?.user_type == 10) {
            userType = 'finance';
          }

          if (!userType) {
            toast.error('Unknown user type. Please contact support.');
            setLoading(false);
            return;
          }

          storageInstance.setStorage('current-user-type', userType);
          setLoading(false);
          setShowLoginModal(false);

          toast.success(response.message, {
            position: 'top-right',
          });

          try {
            const profileRes = await getProfile();
            dispatch(setUserProfile(profileRes.data));
          } catch (err) {}

          window.dispatchEvent(new Event('loginStatusChanged'));

          setTimeout(() => {
            window.location.href = `/dashboard/${userType}`;
          }, 300);
        })
        .catch((error) => {
          setLoading(false);
          if (
            error?.message?.response?.status === 400 &&
            error?.message?.response?.data?.status === 4
          ) {
            retryDataRef.current = {
              type: 'google',
              values: null,
            };
            setShowLoginModal(false);
            setTimeout(() => {
              setShowOtherDeviceModal(true);
            }, 300);
          } else if (error?.message?.response?.data) {
            toast.error(error?.message?.response?.data?.message, {
              position: 'top-right',
            });
          } else {
            toast.error(error?.message || 'Google login failed. Please try again.', {
              position: 'top-right',
            });
          }
        });
    },
    onError: (error) => {
      setLoading(false);
      toast.error('Google login failed. Please try again.', {
        position: 'top-right',
      });
    },
  });

  const handleRetryLogin = () => {
    const retryData = retryDataRef.current;
    if (!retryData) return;
    if (retryData.type === 'google') {
      loginWithGoogle();
    } else {
      loginSubmitHandler(retryData.values, true);
    }
  };

  const handleCloseOtherDeviceModal = () => {
    setShowOtherDeviceModal(false);
    retryDataRef.current = null;
  };

  return (
    <>
      <Head>
        <title>Hospitality Procurement Platform | Workwise</title>
        <meta name="description" content="Streamline your hospitality procurement — RFQs, tenders, vendor management, and purchase orders in one place." />
      </Head>

      <style jsx>{`
        .hp-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Poppins', sans-serif;
          background: #f1f5f9;
        }

        /* ════════════════════════════════════════════
           HERO — full viewport, immersive
           ════════════════════════════════════════════ */
        .hp-hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(160deg, #162d50 0%, #2E5BA8 50%, #1a4080 100%);
          position: relative;
          overflow: hidden;
        }
        /* Dot grid pattern overlay */
        .hp-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }
        /* Large decorative circles */
        .hp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .hp-orb-1 {
          width: 500px; height: 500px;
          top: -180px; right: -120px;
          background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
        }
        .hp-orb-2 {
          width: 350px; height: 350px;
          bottom: -100px; left: -80px;
          background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
        }
        .hp-orb-3 {
          width: 200px; height: 200px;
          top: 30%; left: 8%;
          background: radial-gradient(circle, rgba(94,234,212,0.08) 0%, transparent 70%);
        }

        /* ── Top bar ── */
        .hp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px clamp(24px, 5vw, 64px);
          position: relative;
          z-index: 2;
        }
        .hp-logo {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hp-logo-mark {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
        }
        .hp-topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ── Hero content ── */
        .hp-hero-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 clamp(24px, 5vw, 64px) 60px;
          position: relative;
          z-index: 2;
        }
        .hp-hero-content {
          max-width: 640px;
        }
        .hp-hero-right {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 420px;
        }
        .hp-hero-row {
          display: flex;
          align-items: center;
          gap: clamp(40px, 6vw, 100px);
          width: 100%;
          max-width: 1100px;
        }
        .hp-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .hp-label-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #5eead4;
          animation: hp-glow 2s ease-in-out infinite;
        }
        @keyframes hp-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(94,234,212,0.5); }
          50% { opacity: 0.4; box-shadow: none; }
        }
        .hp-heading {
          font-size: clamp(2.4rem, 4.5vw, 3.4rem);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.12;
          letter-spacing: -1px;
          margin: 0 0 16px;
        }
        .hp-heading-light {
          font-weight: 400;
          color: rgba(255,255,255,0.7);
        }
        .hp-desc {
          font-size: 1rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.75;
          margin: 0 0 32px;
          max-width: 480px;
        }
        .hp-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        /* ── Visual card cluster (right side) ── */
        .hp-visual {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 0.95;
        }
        .hp-vcard {
          position: absolute;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 18px 20px;
          color: #fff;
        }
        .hp-vcard-1 {
          top: 0; left: 0; right: 20%;
          z-index: 3;
        }
        .hp-vcard-2 {
          top: 35%; left: 12%; right: 0;
          z-index: 2;
        }
        .hp-vcard-3 {
          bottom: 0; left: 0; right: 10%;
          z-index: 1;
        }
        .hp-vcard-label {
          font-size: 0.62rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          opacity: 0.6;
          margin-bottom: 6px;
        }
        .hp-vcard-value {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .hp-vcard-sub {
          font-size: 0.72rem;
          opacity: 0.5;
        }
        .hp-vcard-row {
          display: flex;
          gap: 20px;
          margin-top: 8px;
        }
        .hp-vcard-stat {
          display: flex;
          flex-direction: column;
        }
        .hp-vcard-stat-val {
          font-size: 1.2rem;
          font-weight: 700;
        }
        .hp-vcard-stat-label {
          font-size: 0.62rem;
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .hp-vcard-bar {
          height: 4px;
          border-radius: 4px;
          background: rgba(255,255,255,0.1);
          margin-top: 10px;
          overflow: hidden;
        }
        .hp-vcard-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: #5eead4;
        }
        .hp-vcard-dots {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }
        .hp-vcard-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
        }

        /* ── Buttons ── */
        .hp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 34px;
          font-size: 0.92rem;
          font-weight: 600;
          color: #1a3d6e;
          background: #ffffff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 16px rgba(0,0,0,0.15);
        }
        .hp-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .hp-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 34px;
          font-size: 0.92rem;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .hp-btn-secondary:hover {
          background: rgba(255,255,255,0.14);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-1px);
        }
        .hp-btn-dashboard {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 34px;
          font-size: 0.92rem;
          font-weight: 600;
          color: #1a3d6e;
          background: #ffffff;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 16px rgba(0,0,0,0.15);
        }
        .hp-btn-dashboard:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
        }
        .hp-btn-sm {
          padding: 10px 22px;
          font-size: 0.82rem;
        }
        .hp-btn-icon {
          display: flex;
          align-items: center;
        }

        /* ════════════════════════════════════════════
           FEATURES — below fold, white cards
           ════════════════════════════════════════════ */
        .hp-features {
          padding: 56px clamp(24px, 5vw, 64px);
          background: #f1f5f9;
        }
        .hp-features-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .hp-features-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1a2730;
          margin: 0 0 6px;
        }
        .hp-features-sub {
          font-size: 0.85rem;
          color: #6c757d;
          margin: 0;
        }
        .hp-features-grid {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .hp-fcard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px 20px;
          text-align: center;
          transition: all 0.2s ease;
        }
        .hp-fcard:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .hp-fcard-icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .hp-fcard-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1a2730;
          margin: 0 0 6px;
        }
        .hp-fcard-desc {
          font-size: 0.74rem;
          color: #6c757d;
          line-height: 1.55;
          margin: 0;
        }

        /* ════════════════════════════════════════════
           FOOTER
           ════════════════════════════════════════════ */
        .hp-footer {
          text-align: center;
          padding: 20px;
          background: #f1f5f9;
          border-top: 1px solid #e5e7eb;
        }
        .hp-footer-text {
          font-size: 0.73rem;
          color: #94a3b8;
          margin: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hp-hero-row { flex-direction: column; text-align: center; }
          .hp-hero-content { max-width: 100%; }
          .hp-cta-row { justify-content: center; }
          .hp-hero-right { display: none; }
          .hp-desc { margin-left: auto; margin-right: auto; }
        }
        @media (max-width: 768px) {
          .hp-topbar { padding: 20px; }
          .hp-hero-body { padding: 0 20px 40px; }
          .hp-heading { font-size: 2rem; }
          .hp-desc { font-size: 0.9rem; }
          .hp-features { padding: 40px 20px; }
          .hp-features-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .hp-cta-row { flex-direction: column; width: 100%; }
          .hp-btn-primary, .hp-btn-secondary, .hp-btn-dashboard { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="hp-page">
        {/* ═══════ HERO ═══════ */}
        <div className="hp-hero">
          <div className="hp-orb hp-orb-1" />
          <div className="hp-orb hp-orb-2" />
          <div className="hp-orb hp-orb-3" />

          {/* Top bar */}
          <div className="hp-topbar">
            <div className="hp-logo">
              <div className="hp-logo-mark">W</div>
              Workwise
            </div>
            <div className="hp-topbar-actions">
              {isLoggedIn ? (
                <button className="hp-btn-primary hp-btn-sm" onClick={() => router.push(dashboardUrl)}>
                  <span className="hp-btn-icon">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/></svg>
                  </span>
                  Dashboard
                </button>
              ) : (
                <>
                  <button className="hp-btn-secondary hp-btn-sm" onClick={() => { setShowLoginModal(true); setActiveTab('login'); }}>
                    Sign In
                  </button>
                  <button className="hp-btn-primary hp-btn-sm" onClick={handleRegisterClick}>
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Hero body */}
          <div className="hp-hero-body">
            <div className="hp-hero-row">
              {/* Left — text */}
              <div className="hp-hero-content">
                <div className="hp-label">
                  <span className="hp-label-dot" />
                  Hospitality Procurement Platform
                </div>

                <h1 className="hp-heading">
                  Streamline your<br />
                  procurement <span className="hp-heading-light">workflow</span>
                </h1>

                <p className="hp-desc">
                  From RFQs and tenders to vendor negotiations and purchase orders — manage the complete procurement lifecycle across all your hotel properties.
                </p>

                <div className="hp-cta-row">
                  {isLoggedIn ? (
                    <button className="hp-btn-dashboard" onClick={() => router.push(dashboardUrl)}>
                      <span className="hp-btn-icon">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/></svg>
                      </span>
                      Open Dashboard
                    </button>
                  ) : (
                    <>
                      <button className="hp-btn-primary" onClick={() => { setShowLoginModal(true); setActiveTab('login'); }}>
                        Sign In
                        <span className="hp-btn-icon">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </button>
                      <button className="hp-btn-secondary" onClick={handleRegisterClick}>
                        Register as Vendor
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Right — visual card cluster */}
              <div className="hp-hero-right">
                <div className="hp-visual">
                  <div className="hp-vcard hp-vcard-1">
                    <div className="hp-vcard-label">Active RFQ</div>
                    <div className="hp-vcard-value">Hotel Linen Supply</div>
                    <div className="hp-vcard-sub">RFQ-2024-0847 &middot; 5 vendors</div>
                    <div className="hp-vcard-bar"><div className="hp-vcard-bar-fill" style={{ width: '72%' }} /></div>
                  </div>
                  <div className="hp-vcard hp-vcard-2">
                    <div className="hp-vcard-label">Purchase Order</div>
                    <div className="hp-vcard-row">
                      <div className="hp-vcard-stat">
                        <span className="hp-vcard-stat-val">12</span>
                        <span className="hp-vcard-stat-label">Approved</span>
                      </div>
                      <div className="hp-vcard-stat">
                        <span className="hp-vcard-stat-val">3</span>
                        <span className="hp-vcard-stat-label">Pending</span>
                      </div>
                      <div className="hp-vcard-stat">
                        <span className="hp-vcard-stat-val">8</span>
                        <span className="hp-vcard-stat-label">Delivered</span>
                      </div>
                    </div>
                  </div>
                  <div className="hp-vcard hp-vcard-3">
                    <div className="hp-vcard-label">Vendor Evaluation</div>
                    <div className="hp-vcard-dots">
                      <span className="hp-vcard-dot" style={{ background: '#5eead4' }} />
                      <span className="hp-vcard-dot" style={{ background: '#5eead4' }} />
                      <span className="hp-vcard-dot" style={{ background: '#5eead4' }} />
                      <span className="hp-vcard-dot" style={{ background: 'rgba(255,255,255,0.2)' }} />
                      <span className="hp-vcard-dot" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <div className="hp-vcard-sub" style={{ marginTop: 6 }}>3 of 5 vendors cleared</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ FEATURES ═══════ */}
        <div className="hp-features">
          <div className="hp-features-header">
            <h2 className="hp-features-title">Everything you need to procure smarter</h2>
            <p className="hp-features-sub">A unified platform built for hospitality procurement teams</p>
          </div>
          <div className="hp-features-grid">
            <div className="hp-fcard">
              <div className="hp-fcard-icon" style={{ background: 'rgba(46,91,168,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="#2E5BA8" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="hp-fcard-title">RFQ & Tender Management</p>
              <p className="hp-fcard-desc">Create, publish, and track RFQs and tenders with multi-level approval workflows</p>
            </div>
            <div className="hp-fcard">
              <div className="hp-fcard-icon" style={{ background: 'rgba(66,139,65,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="#428B41" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="#428B41" strokeWidth="1.5"/></svg>
              </div>
              <p className="hp-fcard-title">Vendor Negotiations</p>
              <p className="hp-fcard-desc">Multi-round negotiations with target pricing, quote comparison, and approvals</p>
            </div>
            <div className="hp-fcard">
              <div className="hp-fcard-icon" style={{ background: 'rgba(255,165,0,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="#ffa500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p className="hp-fcard-title">Purchase Orders & GRN</p>
              <p className="hp-fcard-desc">End-to-end PO lifecycle with milestones, invoicing, and goods receipt tracking</p>
            </div>
            <div className="hp-fcard">
              <div className="hp-fcard-icon" style={{ background: 'rgba(46,91,168,0.08)' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#2E5BA8" strokeWidth="1.5"/><path d="M5 8h6M8 5v6" stroke="#2E5BA8" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="hp-fcard-title">Multi-Hotel Support</p>
              <p className="hp-fcard-desc">Manage procurement across all your hotel properties from one unified place</p>
            </div>
          </div>
        </div>

        {/* ═══════ FOOTER ═══════ */}
        <div className="hp-footer">
          <p className="hp-footer-text">Powered by Workwise</p>
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
        setEmail={setEmail}
        setPassword={setPassword}
        loading={loading}
        setloading={setLoading}
        loginSubmitHandler={loginSubmitHandler}
        loginWithGoogle={loginWithGoogle}
      />

      <LoginWithOtherDeviceModal
        show={showOtherDeviceModal}
        onHide={handleCloseOtherDeviceModal}
        handleRetryLogin={handleRetryLogin}
      />

      <ToastContainer />
    </>
  );
};

export default HotelVendor;


