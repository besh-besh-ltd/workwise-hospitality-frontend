import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { useGoogleLogin } from '@react-oauth/google';
import { useSelector, useDispatch } from 'react-redux';
import RegisterUserModal from '../modal/RegisterUserModal';
import AuthModal from '../modal/AuthModal';
import LoginWithOtherDeviceModal from '../modal/LoginWithOtherDeviceModal';
import MembershipInfoModal from '../modal/MembershipInfoModal';
import PostPaymentFlow from '../register/PostPaymentFlow';
import {
  loadScript,
  hospitalitySubscriptionPayment,
} from '../../services/subscription';
import storageInstance from '../../utils/storageInstance';
import { resolvePostLoginRedirect } from '../../utils/sharedFunctions';
import { LoginService, SWSubscribe, handleSocialLogin, getProfile } from '../../services/Auth';
import { setUserProfile } from '@/redux/slice';

const USER_TYPE_BY_CODE = {
  2: 'buyer',
  3: 'vendor',
  4: 'other',
  7: 'admin',
  8: 'management',
  9: 'engineering',
  10: 'finance',
};

/**
 * Login, registration and the vendor signup-payment flow, lifted wholesale off
 * the old /hotel-vendor page so the landing page can own them.
 *
 * This is also a bug fix: authGuard and the axios 401 handler already send
 * unauthenticated users to `/?redirect=…`, which previously had no way to sign
 * in. The `redirect` query param is honoured here on success.
 *
 * Renders nothing until a modal is opened — it is purely behavioural.
 */
const LandingAuth = ({ open, setOpen, registerOpen, setRegisterOpen }) => {
  const router = useRouter();
  const { register, login, redirect: redirectParam } = router.query;
  const dispatch = useDispatch();
  const swSubscription = useSelector((data) => data.swSubscription);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showMembershipInfoModal, setShowMembershipInfoModal] = useState(false);
  const [showOtherDeviceModal, setShowOtherDeviceModal] = useState(false);
  const [postPaymentData, setPostPaymentData] = useState(null);
  // Refs, not state: the unmount cleanup reads these synchronously.
  const paymentSuccessfulRef = useRef(false);
  const retryDataRef = useRef(null);

  // Vendors enter through the membership/pricing step, not the login modal:
  // AuthModal's register tab is commented out upstream and renders BookCall.
  useEffect(() => {
    if (registerOpen) {
      setShowMembershipInfoModal(true);
      setRegisterOpen(false);
    }
  }, [registerOpen, setRegisterOpen]);

  // ?login=true / ?register=true deep links, used by payment-success.js and by
  // anything that links straight at the sign-in step.
  useEffect(() => {
    if (register === 'true' || register === '') {
      setShowMembershipInfoModal(true);
    }
    if (login === 'true' || login === '') {
      setOpen(true);
      setActiveTab('login');
    }
  }, [register, login, setOpen]);

  // Clear the half-issued token if someone abandons registration mid-payment.
  // Never clear it when payment succeeded or a session already exists.
  useEffect(
    () => () => {
      const userType = storageInstance.getStorage('current-user-type');
      if (!paymentSuccessfulRef.current && !userType) {
        storageInstance.removeStorege('token');
      }
    },
    []
  );

  const closeLogin = () => {
    setOpen(false);
    setLoginError('');
  };

  const finishLogin = async (response, userType) => {
    storageInstance.setStorage('current-user-type', userType);
    setOpen(false);
    toast.success(response.message, { position: 'top-right' });

    try {
      const profileRes = await getProfile();
      dispatch(setUserProfile(profileRes.data));
    } catch (err) {
      /* profile is non-blocking — the session is already valid */
    }

    window.dispatchEvent(new Event('loginStatusChanged'));

    setTimeout(() => {
      window.location.href = redirectParam
        ? resolvePostLoginRedirect(redirectParam, userType)
        : `/dashboard/${userType}`;
    }, 300);
  };

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
        // Mark payment as successful so the token isn't cleared on unmount.
        paymentSuccessfulRef.current = true;
        // PostPaymentFlow handles verify, login, RFQ auto-join and redirect.
        setPostPaymentData({
          razorpayData: {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          },
          orderId,
          userCredentials,
        });
      },
      modal: {
        ondismiss: function () {
          // Dismissed without completing — no action needed.
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

        toast.error(
          res?.message ||
            'Your account was created, but we could not start payment. Please log in and complete payment.',
          { position: 'top-right' }
        );
      })
      .catch((error) => {
        if (error?.message) {
          toast.error(
            error.message.response?.data?.message ||
              'Your account was created, but we could not start payment. Please log in and complete payment.',
            { position: 'top-right' }
          );
        }
      });
  };

  const handleRegistrationClose = () => {
    setShowRegisterModal(false);
    storageInstance.removeStorege('token');
  };

  const handleProceedToRegister = () => {
    setShowMembershipInfoModal(false);
    setShowRegisterModal(true);
  };

  const loginSubmitHandler = (values, isFromOtherModal = false) => {
    setLoading(true);
    setLoginError('');
    LoginService(values, isFromOtherModal)
      .then(async (response) => {
        setLoading(false);
        if (isFromOtherModal) {
          handleCloseOtherDeviceModal();
        }
        // HTTP 200 but an API-level failure.
        if (response?.status === 2 || response?.status === 0 || response?.status === 3) {
          setLoginError(response?.message || 'Login failed. Please try again.');
          return;
        }
        if (response?.status === 5 && response?.hospitality_user) {
          toast.warning(
            'Payment required for hospitality vendors. Please complete the payment to activate your account.'
          );
          const payload = {
            user_key: response.hospitality_user.user_key,
            categories: response.hospitality_user.categories || [],
            subcategories: response.hospitality_user.subcategories || [],
            hotels: response.hospitality_user.hotels || [],
          };
          hospitalitySubscriptionPayment(payload)
            .then(async (res) => {
              if (res?.status) {
                // Free renewal: the backend settled it server-side (admin
                // assigned / zero-priced). Nothing to pay.
                if (res?.free_renewal) {
                  toast.success(res?.message || 'Subscription renewed. Please log in again.');
                  setOpen(false);
                  return;
                }
                await payWithRazorPay(res?.data, {
                  email: values.email,
                  password: values.password,
                });
                setOpen(false);
              }
            })
            .catch((error) => {
              toast.error(error?.response?.data?.message || 'Payment failed');
            });
          return;
        }
        if (response?.token) {
          SWSubscribe({ subscription: swSubscription, token: response.token }).catch(() => {});
        }

        const userDetail = response?.user_detail?.[0];
        if (!userDetail) {
          toast.error('Unable to fetch user details. Please try again.');
          setLoading(false);
          return;
        }

        const userType = USER_TYPE_BY_CODE[userDetail.user_type];
        if (!userType) {
          toast.error('Unknown user type. Please contact support.');
          setLoading(false);
          return;
        }

        await finishLogin(response, userType);
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
          setOpen(false);
          setShowOtherDeviceModal(true);
        } else if (error?.message?.response?.data) {
          setLoginError(
            error?.message?.response?.data?.message || 'Login failed. Please try again.'
          );
        } else {
          setLoginError(
            typeof error?.message === 'string' ? error.message : 'Login failed. Please try again.'
          );
        }
      });
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setLoading(true);
      handleSocialLogin({ login_type: 'google', access_token: tokenResponse.access_token }, false)
        .then(async (response) => {
          if (response?.token) {
            SWSubscribe({ subscription: swSubscription, token: response.token }).catch(() => {});
          }

          // Google sign-in never yields user_type 4 ('other').
          const userType = USER_TYPE_BY_CODE[response?.profile?.user_type];
          if (!userType || userType === 'other') {
            toast.error('Unknown user type. Please contact support.');
            setLoading(false);
            return;
          }

          setLoading(false);
          await finishLogin(response, userType);
        })
        .catch((error) => {
          setLoading(false);
          if (
            error?.message?.response?.status === 400 &&
            error?.message?.response?.data?.status === 4
          ) {
            retryDataRef.current = { type: 'google', values: null };
            setOpen(false);
            setShowOtherDeviceModal(true);
          } else if (error?.message?.response?.data) {
            toast.error(error?.message?.response?.data?.message, { position: 'top-right' });
          } else {
            toast.error(error?.message || 'Google login failed. Please try again.', {
              position: 'top-right',
            });
          }
        });
    },
    onError: () => {
      setLoading(false);
      toast.error('Google login failed. Please try again.', { position: 'top-right' });
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
        showModal={open}
        closeModal={closeLogin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openAuthModal={open}
        setOpenAuthModal={setOpen}
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
          setOpen(true);
          setActiveTab('login');
        }}
      />

      <PostPaymentFlow
        show={!!postPaymentData}
        razorpayData={postPaymentData?.razorpayData}
        orderId={postPaymentData?.orderId}
        userCredentials={postPaymentData?.userCredentials}
        swSubscription={swSubscription}
        onDone={() => {
          paymentSuccessfulRef.current = true;
        }}
      />
    </>
  );
};

export default LandingAuth;
