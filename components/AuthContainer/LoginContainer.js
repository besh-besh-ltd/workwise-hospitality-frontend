import React, { useState } from 'react'
import { useRouter } from 'next/router';
import { LoginService, SWSubscribe, handleSocialLogin } from "@/services/Auth";
import { hospitalitySubscriptionPayment, loadScript, testRazorPayEndpoint } from "@/services/subscription";
import { toast } from 'react-toastify';
import { useGoogleLogin } from "@react-oauth/google";
import { useSelector } from 'react-redux';
import AuthModal from '../modal/AuthModal';
import LoginWithOtherDeviceModal from '../modal/LoginWithOtherDeviceModal';
import storageInstance from '@/utils/storageInstance';
import { usePathname } from 'next/navigation';

const LoginContainer = (props) => {
    const router = useRouter();
    const pathname = usePathname();
    const { redirect } = router.query;
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [employeeCode, setEmployeeCode] = useState("");
    const [loginWith, setLoginWith] = useState("");
    const [, setIsHospitalityPaymentLoading] = useState(false);
    
    const handleOtherDeviceLoginModalOpen = () => {
        setShowModal(true);
    };

    const handleChange = (setState) => (event) => {
        setState(event);
    };

    const handleClose = () => {
        setShowModal(false);
        setLoginWith("");
    };

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
                await payWithRazorPay(response?.data);
            } else {
                toast.error("Unable to initiate payment. Please try again.");
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
            handler: function () {
                const payload = {
                    order_id: orderId
                };
                testRazorPayEndpoint(payload)
                    .then(() => {
                        toast.success("Payment successful! Please login again after a minute.");
                    })
                    .catch(() => {
                        toast.success("Payment captured. Please login again after a minute.");
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
        props.setloading(true);
        if (values.employee_code) {
            setEmployeeCode(values.employee_code);
        }
        LoginService(values, isFromOtherModal)
            .then((response) => {
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

                if (redirect && redirect != "") {
                    router.push(window.atob(redirect));
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
                    setTimeout(() => {
                        handleChange(props.setOpenAuthModal(false));
                    }, 1000);

                    setTimeout(() => {
                        setLoginWith(values.employee_code ? "employee_code" : "email");
                        handleOtherDeviceLoginModalOpen();
                    }, 1000);
                } else if (error?.message?.response?.data) {
                    toast.error(error?.message?.response?.data?.message, {
                        position: "top-right",
                    });
                }

                if (error?.response?.status === 400) {
                } else {
                    toast.error(error?.message, {
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
                loginWith ? true : false
            )
                .then((response) => {
                    if (loginWith === "google") {
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
                        setTimeout(() => {
                            handleChange(props.setOpenAuthModal(false));
                        }, 2000);

                        setTimeout(() => {
                            setLoginWith("google");
                            handleOtherDeviceLoginModalOpen();
                        }, 1000);
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
                email={email}
                password={password}
                employeeCode={employeeCode}
                loginSubmitHandler={loginSubmitHandler}
                loginWithGoogle={loginWithGoogle}
                loginWith={loginWith}
            />
        </>
    )
}

export default LoginContainer
