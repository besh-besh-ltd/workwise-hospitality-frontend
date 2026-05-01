import React, { useState, useRef } from 'react'
import { useRouter } from 'next/router';
import { LoginService, SWSubscribe, handleSocialLogin, getProfile } from "@/services/Auth";
import { hospitalitySubscriptionPayment, loadScript, verifyHospitalityPayment } from "@/services/subscription";
import { toast } from 'react-toastify';
import { useGoogleLogin } from "@react-oauth/google";
import { useSelector, useDispatch } from 'react-redux';
import { setUserProfile } from '@/redux/slice';
import AuthModal from '../modal/AuthModal';
import LoginWithOtherDeviceModal from '../modal/LoginWithOtherDeviceModal';
import storageInstance from '@/utils/storageInstance';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { resolvePostLoginRedirect } from '@/utils/sharedFunctions';

const LoginContainer = (props) => {
    const router = useRouter();
    const pathname = usePathname();
    const { redirect } = router.query;
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [employeeCode, setEmployeeCode] = useState("");
    const [, setIsHospitalityPaymentLoading] = useState(false);
    const retryDataRef = useRef(null);
    
    const handleOtherDeviceLoginModalOpen = () => {
        setShowModal(true);
    };

    const handleChange = (setState) => (event) => {
        setState(event);
    };

    const handleClose = () => {
        setShowModal(false);
        retryDataRef.current = null;
    };

    const dispatch = useDispatch();
    const swSubscription = useSelector((data) => data.swSubscription);

    const initiateHospitalityPayment = async (hospitalityUser) => {
        try {
            setIsHospitalityPaymentLoading(true);
            const payload = {
                user_key: hospitalityUser.user_key,
                categories: hospitalityUser.categories || [],
                subcategories: hospitalityUser.subcategories || [],
                hotels: hospitalityUser.hotels || []
            };
            const response = await hospitalitySubscriptionPayment(payload);
            if (response?.status) {
                // Free renewal path: backend completed the renewal server-side
                // (admin-assigned items / zero-priced items). No Razorpay
                // modal to open — just prompt the vendor to log in again.
                if (response?.free_renewal) {
                    toast.success(response?.message || "Subscription renewed. Please log in again.");
                    return;
                }
                await payWithRazorPay(response?.data);
            } else {
                toast.error(response?.message || "Unable to initiate payment. Please try again.");
            }
        } catch (error) {
            console.error("Hospitality payment error:", error);
            toast.error(error?.response?.data?.message || "Failed to start payment. Please try again.");
        } finally {
            setIsHospitalityPaymentLoading(false);
        }
    };

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
            description: "Hospitality Vendor Subscription",
            image: "/assets/images/logo.png",
            handler: function (response) {
                // Use the secure verify-payment endpoint which validates the
                // Razorpay HMAC signature server-side. Previously this used
                // /users/test-razorpay-webhook which is deprecated and skips
                // signature validation. All three fields below are supplied
                // by Razorpay in the handler response.
                const payload = {
                    razorpay_order_id: response?.razorpay_order_id || orderId,
                    razorpay_payment_id: response?.razorpay_payment_id,
                    razorpay_signature: response?.razorpay_signature
                };
                verifyHospitalityPayment(payload)
                    .then(() => {
                        toast.success("Payment successful! Please login again.");
                    })
                    .catch((err) => {
                        const msg = err?.message?.response?.data?.message
                            || err?.response?.data?.message
                            || "Payment verification failed. Please contact support if the amount was debited.";
                        toast.error(msg);
                    });
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

    const loginSubmitHandler = (values, isFromOtherModal = false) => {
        console.log("Login attempt with values:", values);
        props.setloading(true);
        if (values.employee_code) {
            setEmployeeCode(values.employee_code);
        }
        LoginService(values, isFromOtherModal)
            .then(async (response) => {
                console.log("Login response:", response);
                props.setloading(false);
                if (response?.status === 5 && response?.hospitality_user) {
                    toast.warning("Payment required for hospitality vendors. Please complete the payment to activate your account.");
                    initiateHospitalityPayment(response.hospitality_user);
                    return;
                }
                if (isFromOtherModal) {
                    handleClose();
                }
                if (response?.token) {
                    SWSubscribe({ subscription: swSubscription, token: response.token })
                        .catch(() => {});
                }
                handleChange(props.setOpenAuthModal(false));

                toast.success(response.message, {
                    position: "top-right",
                    offset: '60px'
               });

                const userDetail = response?.user_detail?.[0];
                if (!userDetail) {
                    toast.error("Unable to fetch user details. Please try again.");
                    return;
                }
                let userType = "";
                if (userDetail.user_type == 2) {
                    userType = "buyer";
                } else if (userDetail.user_type == 3) {
                    userType = "vendor";
                } else if (userDetail.user_type == 4) {
                    userType = "other";
                } else if (userDetail.user_type == 7) {
                    userType = "admin";
                } else if (userDetail.user_type == 8) {
                    userType = "management";
                } else if (userDetail.user_type == 9) {
                    userType = "engineering";
                } else if (userDetail.user_type == 10) {
                    userType = "finance";
                }
                storageInstance.setStorage("current-user-type", userType);
                storageInstance.setStorage("current-user-email", userDetail.email || "");
                storageInstance.setStorage("current-user-name", userDetail.name || "");
                posthog.identify(String(userDetail.user_id), {
                    name: userDetail.name,
                    email: userDetail.email,
                    user_type: userType,
                });
                try {
                    const profileRes = await getProfile();
                    dispatch(setUserProfile(profileRes.data));
                } catch (err) {}

                if (redirect && redirect != "") {
                    router.push(resolvePostLoginRedirect(redirect, userType));
                    return;
                } else {
                    let prod_name = storageInstance.getStorage('product_name');
                    if (pathname.includes("/dashboard/buyer/rfq-management-vendor/vendor-profile")) {
                        router.reload();
                    } else if (prod_name != "" && prod_name != "all" && userType != "vendor" && userType != "admin") {
                        router.push(`/vendor/${prod_name}`);
                    } else if (userType == "buyer") {
                        router.push(`/vendor/all?loggedin=true`);
                    } else if (userType == "vendor" && pathname.includes("/dashboard/vendor/inquiries-details")) {
                        console.log("Push Sent")
                    } else if (userType == "admin") {
                        router.push(`/dashboard/admin/hospitality-manager`);
                    } else if (userType == "finance" || userType == "engineering") {
                        router.push(`/dashboard/${userType}/editprofile`);
                    } else {
                        router.push(`/dashboard/${userType}`);
                    }
                }
            })
            .catch((error) => {
                props.setloading(false);
                if (
                    error?.message?.response?.status === 400 &&
                    error?.message?.response?.data?.status === 4
                ) {
                    retryDataRef.current = {
                        type: values.employee_code ? "employee_code" : "email",
                        values: { ...values },
                    };
                    props.setOpenAuthModal(false);
                    setTimeout(() => {
                        handleOtherDeviceLoginModalOpen();
                    }, 300);
                } else if (error?.message?.response?.data) {
                    toast.error(error?.message?.response?.data?.message, {
                        position: "top-right",
                    });
                }
            });
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            handleSocialLogin(
                {
                    login_type: "google",
                    access_token: tokenResponse.access_token,
                },
                retryDataRef.current?.type === "google" ? true : false
            )
                .then(async (response) => {
                    if (retryDataRef.current?.type === "google") {
                        handleClose();
                    }
                    // subscribe to SW
                    SWSubscribe({ subscription: swSubscription, token: response.token })
                        .then((res) => {
                            console.log("PUSH SENT");
                        })
                        .catch((err) => { });
                    props.setloading(false);
                    handleChange(props.setOpenAuthModal(false));

                    toast.success(response.message, {
                        position: "top-right",
                    });

                    let userType = "";
                    if (response?.profile?.user_type == 2) {
                        userType = "buyer";
                    } else if (response?.profile?.user_type == 3) {
                        userType = "vendor";
                    } else if (response?.profile?.user_type == 7) {
                        userType = "admin";
                    } else if (response?.profile?.user_type == 8) {
                        userType = "management";
                    } else if (response?.profile?.user_type == 9) {
                        userType = "engineering";
                    } else if (response?.profile?.user_type == 10) {
                        userType = "finance";
                    }
                    storageInstance.setStorage("current-user-type", userType);
                    storageInstance.setStorage("current-user-email", response?.profile?.email || "");
                    storageInstance.setStorage("current-user-name", response?.profile?.name || "");
                    posthog.identify(String(response?.profile?.user_id), {
                        name: response?.profile?.name,
                        email: response?.profile?.email,
                        user_type: userType,
                    });
                    try {
                        const profileRes = await getProfile();
                        dispatch(setUserProfile(profileRes.data));
                    } catch (err) {}
                    if (userType == "buyer") {
                        router.push(`/vendor/all?loggedin=true`);
                    } else if (userType == "admin") {
                        router.push(`/dashboard/admin/hospitality-manager`);
                    } else if (userType == "finance" || userType == "engineering") {
                        router.push(`/dashboard/${userType}/editprofile`);
                    } else {
                        router.push(`/dashboard/${userType}`);
                    }
                })
                .catch((error) => {
                    props.setloading(false);
                    if (
                        error?.message?.response?.status === 400 &&
                        error?.message?.response?.data?.status === 4
                    ) {
                        retryDataRef.current = {
                            type: "google",
                            values: null,
                        };
                        props.setOpenAuthModal(false);
                        setTimeout(() => {
                            handleOtherDeviceLoginModalOpen();
                        }, 300);
                    } else if (error?.message?.response?.data) {
                        toast.error(error?.message?.response?.data?.message, {
                            position: "top-right",
                        });
                    }
                });
        },
        onError: (error) => {
            props.setloading(false);
        },
    });

    const handleRetryLogin = () => {
        const retryData = retryDataRef.current;
        if (!retryData) return;
        if (retryData.type === "google") {
            loginWithGoogle();
        } else {
            loginSubmitHandler(retryData.values, true);
        }
    };

    return (
        <>
            <AuthModal
                showModal={props.openAuthModal}
                closeModal={() => {
                    handleChange(props.setOpenAuthModal(false));
                }}
                activeTab={props.activeAuthTab}
                setActiveTab={handleChange(props.setActiveAuthTab)}
                setEmail={setEmail}
                setPassword={setPassword}
                setEmployeeCode={setEmployeeCode}
                loading={props.loading}
                setloading={props.setloading}
                loginSubmitHandler={loginSubmitHandler}
                loginWithGoogle={loginWithGoogle}
            />
            <LoginWithOtherDeviceModal
                show={showModal}
                onHide={handleClose}
                handleRetryLogin={handleRetryLogin}
            />
        </>
    )
}

export default LoginContainer
