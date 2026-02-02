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
import { LoginService, SWSubscribe, handleSocialLogin } from '../services/Auth';
import { useGoogleLogin } from '@react-oauth/google';
import { useSelector } from 'react-redux';

const HotelVendor = () => {
  const router = useRouter();
  const { register, login } = router.query;
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
  const [loginWith, setLoginWith] = useState('');
  // Use ref instead of state for payment success tracking - refs are synchronous
  const paymentSuccessfulRef = useRef(false);

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
                  }
                } catch (loginError) {
                  console.error('Auto-login error:', loginError);
                }
              }

              // Mark payment as successful so token isn't cleared on unmount (use ref for sync update)
              paymentSuccessfulRef.current = true;
              toast.success('Payment successful!');
              // Redirect to generic payment success page with summary and invoice link
              router.push({
                pathname: '/payment-success',
                query: {
                  type: 'hospitality_vendor',
                  order_id: orderId,
                  amount: summary.amount || '',
                  currency: 'INR',
                  description: 'Hospitality Vendor Registration',
                  expiry_date: summary.expiry_date || '',
                  invoice_url: summary.invoice_url || ''
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
    setLoading(true);
    LoginService(values, isFromOtherModal)
      .then((response) => {
        setLoading(false);
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
          setTimeout(() => {
            setShowLoginModal(false);
          }, 1000);

          setTimeout(() => {
            setLoginWith('email');
            setShowOtherDeviceModal(true);
          }, 1000);
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
        .then((response) => {
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
            setTimeout(() => {
              setShowLoginModal(false);
            }, 2000);

            setTimeout(() => {
              setLoginWith('google');
              setShowOtherDeviceModal(true);
            }, 1000);
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
        setEmail={setEmail}
        setPassword={setPassword}
        loading={loading}
        setloading={setLoading}
        loginSubmitHandler={loginSubmitHandler}
        loginWithGoogle={loginWithGoogle}
      />

      <LoginWithOtherDeviceModal
        show={showOtherDeviceModal}
        onHide={() => {
          setShowOtherDeviceModal(false);
          setLoginWith('');
        }}
        email={email}
        password={password}
        loginSubmitHandler={loginSubmitHandler}
        loginWithGoogle={loginWithGoogle}
        loginWith={loginWith}
      />

      <ToastContainer />
    </>
  );
};

export default HotelVendor;


