import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import RegisterUserModal from '../components/modal/RegisterUserModal';
import AuthModal from '../components/modal/AuthModal';
import LoginWithOtherDeviceModal from '../components/modal/LoginWithOtherDeviceModal';
import MembershipInfoModal from '../components/modal/MembershipInfoModal';
import PostPaymentFlow from '../components/register/PostPaymentFlow';
import {
  loadScript,
  verifyHospitalityPayment,
  hospitalitySubscriptionPayment
} from '../services/subscription';
import storageInstance from '../utils/storageInstance';
import { resolvePostLoginRedirect } from '../utils/sharedFunctions';
import { LoginService, SWSubscribe, handleSocialLogin, getProfile } from '../services/Auth';
import { useGoogleLogin } from '@react-oauth/google';
import { useSelector, useDispatch } from 'react-redux';
import { setUserProfile } from '@/redux/slice';

const HotelVendor = () => {
  const router = useRouter();
  const { register, login, redirect: redirectParam, payment_loader_preview: paymentLoaderPreview } = router.query;
  const dispatch = useDispatch();
  const swSubscription = useSelector((data) => data.swSubscription);
  const showPaymentLoaderPreview =
    paymentLoaderPreview === '' ||
    paymentLoaderPreview === 'true' ||
    (Array.isArray(paymentLoaderPreview) && (paymentLoaderPreview[0] === '' || paymentLoaderPreview[0] === 'true'));

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showMembershipInfoModal, setShowMembershipInfoModal] = useState(false);
  const [showOtherDeviceModal, setShowOtherDeviceModal] = useState(false);
  const [postPaymentData, setPostPaymentData] = useState(null);
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
      setShowMembershipInfoModal(true);
    }
    if (login === 'true' || login === '') {
      setShowLoginModal(true);
      setActiveTab('login');
    }
  }, [register, login]);

  // Cleanup token when component unmounts (only for registration payment flow)
  useEffect(() => {
    return () => {
      // Only remove token if this was a fresh registration payment flow
      // Do NOT remove if user is already logged in (navigating to dashboard) or payment succeeded
      const userType = storageInstance.getStorage('current-user-type');
      if (!paymentSuccessfulRef.current && !userType) {
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
        // Mark payment as successful so token isn't cleared on unmount
        paymentSuccessfulRef.current = true;
        // Launch PostPaymentFlow — it handles verification, login, RFQs, and dashboard redirect
        setPostPaymentData({
          razorpayData: {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          },
          orderId,
          userCredentials,
        });
        setShowPaymentProcessingModal(true);
        // Secure, signature-validated path. The deprecated
        // /users/test-razorpay-webhook bypassed signature verification
        // and did not handle the modification/extension branches.
        const payload = {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        };
        verifyHospitalityPayment(payload)
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
              setShowPaymentProcessingModal(false);
              toast.error('Payment processed but could not verify status. Please try logging in again.');
            }
          })
          .catch(() => {
            setShowPaymentProcessingModal(false);
            toast.error('Payment verification failed. Please contact support if your amount was debited.');
          });
      },
      modal: {
        ondismiss: function () {
          // Razorpay modal dismissed without completing — no action needed
        },
      },
      prefill: { name: '', email: '', contact: '' },
      notes: { address: 'India' },
      theme: { color: '#158993' },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on('payment.failed', function () {
      toast.error('Payment failed. Please try again.');
    });
    paymentObject.open();
  };

  const handleRegistrationSuccess = (userData) => {
    if (!userData?.user_key) {
      toast.error(
        userData?.email
          ? 'Your account was created, but we could not continue to payment automatically. Please log in to complete payment.'
          : 'Registration successful but user data missing. Please try again.'
      );
      return;
    }

    setShowRegisterModal(false);

    if (userData.token) {
      storageInstance.setStorage('token', userData.token);
    }

    const payload = {
      user_key: userData.user_key,
      categories: userData.categories || [],
      subcategories: userData.subcategories || [],
      hotels: userData.hotels || [],
    };

    hospitalitySubscriptionPayment(payload)
      .then(async (res) => {
        if (res?.status) {
          const userCredentials =
            userData.email && userData.password
              ? { email: userData.email, password: userData.password }
              : null;
          await payWithRazorPay(res?.data, userCredentials);
          return;
        }

        toast.error(res?.message || 'Your account was created, but we could not start payment. Please log in and complete payment.', {
          position: 'top-right',
        });
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(
            error.message.response?.data?.message ||
              'Your account was created, but we could not start payment. Please log in and complete payment.',
            {
            position: 'top-right',
            }
          );
        }
      });
  };

  const handleRegistrationClose = () => {
    setShowRegisterModal(false);
    storageInstance.removeStorege('token');
  };

  const handleRegisterClick = () => {
    setShowMembershipInfoModal(true);
  };

  const handleProceedToRegister = () => {
    setShowMembershipInfoModal(false);
    setShowRegisterModal(true);
  };

  const loginSubmitHandler = (values, isFromOtherModal = false) => {
    console.log("Login attempt with values:", values);
    setLoading(true);
    setLoginError('');
    LoginService(values, isFromOtherModal)
      .then(async (response) => {
        console.log("Login response:", response);
        setLoading(false);
        if (isFromOtherModal) {
          handleCloseOtherDeviceModal();
        }
        // Handle API-level errors (HTTP 200 but status != 1)
        if (response?.status === 2 || response?.status === 0 || response?.status === 3) {
          setLoginError(response?.message || 'Login failed. Please try again.');
          return;
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
                // Free renewal path: backend completed the renewal server-
                // side (admin-assigned / zero-priced items). Nothing to pay.
                if (res?.free_renewal) {
                  toast.success(res?.message || 'Subscription renewed. Please log in again.');
                  setShowLoginModal(false);
                  return;
                }
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
          window.location.href = redirectParam
            ? resolvePostLoginRedirect(redirectParam, userType)
            : `/dashboard/${userType}`;
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
          setShowOtherDeviceModal(true);
        } else if (error?.message?.response?.data) {
          setLoginError(error?.message?.response?.data?.message || 'Login failed. Please try again.');
        } else {
          setLoginError(typeof error?.message === 'string' ? error.message : 'Login failed. Please try again.');
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
            window.location.href = redirectParam
              ? resolvePostLoginRedirect(redirectParam, userType)
              : `/dashboard/${userType}`;
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
            setShowOtherDeviceModal(true);
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
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          max-width: 320px;
        }
        .hp-vcard {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          padding: 18px 22px;
          color: #fff;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .hp-vcard:hover {
          border-color: rgba(255,255,255,0.18);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .hp-vcard-1 {
          animation: hp-float-1 7s ease-in-out infinite;
          margin-left: 10px;
        }
        .hp-vcard-2 {
          animation: hp-float-2 8s ease-in-out infinite;
          margin-left: 30px;
        }
        .hp-vcard-3 {
          animation: hp-float-3 9s ease-in-out infinite;
          margin-left: 0px;
        }
        @keyframes hp-float-1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(4px, -6px); }
          66% { transform: translate(-2px, -3px); }
        }
        @keyframes hp-float-2 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-3px, 4px); }
          66% { transform: translate(5px, 2px); }
        }
        @keyframes hp-float-3 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(3px, 5px); }
          66% { transform: translate(-4px, -2px); }
        }
        .hp-vcard-label {
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 6px;
        }
        .hp-vcard-value {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 2px;
          line-height: 1.3;
        }
        .hp-vcard-sub {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
        }
        .hp-vcard-row {
          display: flex;
          gap: 24px;
          margin-top: 10px;
        }
        .hp-vcard-stat {
          display: flex;
          flex-direction: column;
        }
        .hp-vcard-stat-val {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .hp-vcard-stat-label {
          font-size: 0.58rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .hp-vcard-bar {
          height: 4px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          margin-top: 10px;
          overflow: hidden;
        }
        .hp-vcard-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #5eead4, #34d399);
        }
        .hp-vcard-dots {
          display: flex;
          gap: 5px;
          margin-top: 10px;
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
                  {/* Card 1: Active RFQ with progress */}
                  <div className="hp-vcard hp-vcard-1">
                    <div className="hp-vcard-label">Active RFQ</div>
                    <div className="hp-vcard-value">Kitchen Equipment Supply</div>
                    <div className="hp-vcard-sub">RFQ-2025-1247 &middot; 8 vendors invited</div>
                    <div className="hp-vcard-bar"><div className="hp-vcard-bar-fill" style={{ width: '65%' }} /></div>
                    <div className="hp-vcard-sub" style={{ marginTop: 4 }}>5 of 8 quotes received</div>
                  </div>

                  {/* Card 2: PO Stats */}
                  <div className="hp-vcard hp-vcard-2">
                    <div className="hp-vcard-label">Purchase Orders This Month</div>
                    <div className="hp-vcard-row">
                      <div className="hp-vcard-stat">
                        <span className="hp-vcard-stat-val" style={{ color: '#5eead4' }}>24</span>
                        <span className="hp-vcard-stat-label">Approved</span>
                      </div>
                      <div className="hp-vcard-stat">
                        <span className="hp-vcard-stat-val" style={{ color: '#fbbf24' }}>5</span>
                        <span className="hp-vcard-stat-label">Pending</span>
                      </div>
                      <div className="hp-vcard-stat">
                        <span className="hp-vcard-stat-val">14</span>
                        <span className="hp-vcard-stat-label">Delivered</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Technical Evaluation */}
                  <div className="hp-vcard hp-vcard-3">
                    <div className="hp-vcard-label">Technical Evaluation</div>
                    <div className="hp-vcard-dots">
                      <span className="hp-vcard-dot" style={{ background: '#5eead4', width: 10, height: 10 }} />
                      <span className="hp-vcard-dot" style={{ background: '#5eead4', width: 10, height: 10 }} />
                      <span className="hp-vcard-dot" style={{ background: '#5eead4', width: 10, height: 10 }} />
                      <span className="hp-vcard-dot" style={{ background: '#fbbf24', width: 10, height: 10 }} />
                      <span className="hp-vcard-dot" style={{ background: 'rgba(255,255,255,0.15)', width: 10, height: 10 }} />
                    </div>
                    <div className="hp-vcard-sub" style={{ marginTop: 8 }}>3 cleared &middot; 1 in progress &middot; 1 pending</div>
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

      <MembershipInfoModal
        show={showMembershipInfoModal}
        onHide={() => setShowMembershipInfoModal(false)}
        onProceed={handleProceedToRegister}
      />

      <RegisterUserModal
        showModal={showRegisterModal}
        setShowModal={setShowRegisterModal}
        showButton={false}
        onRegistrationSuccess={handleRegistrationSuccess}
        onClose={handleRegistrationClose}
        isPaidSubscription={true}
        isHospitality={true}
      />

      <AuthModal
        showModal={showLoginModal}
        closeModal={() => { setShowLoginModal(false); setLoginError(''); }}
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
        loginError={loginError}
      />

      <LoginWithOtherDeviceModal
        show={showOtherDeviceModal}
        onHide={handleCloseOtherDeviceModal}
        handleRetryLogin={handleRetryLogin}
        loading={loading}
        onCancel={() => {
          setShowLoginModal(true);
          setActiveTab('login');
        }}
      />

      <PostPaymentFlow
        show={!!postPaymentData || showPaymentLoaderPreview}
        razorpayData={postPaymentData?.razorpayData || (showPaymentLoaderPreview ? { razorpay_payment_id: 'preview', razorpay_order_id: 'preview', razorpay_signature: 'preview' } : null)}
        orderId={postPaymentData?.orderId || (showPaymentLoaderPreview ? 'preview' : null)}
        userCredentials={postPaymentData?.userCredentials}
        swSubscription={swSubscription}
        onDone={() => { paymentSuccessfulRef.current = true; }}
      />

    </>
  );
};

export default HotelVendor;
