import React, { useState } from 'react'
import { useRouter } from 'next/router';
import { LoginService, SWSubscribe, handleSocialLogin } from "@/services/Auth";
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
    const [loginWith, setLoginWith] = useState("");
    
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

    const loginSubmitHandler = (values, isFromOtherModal = false) => {
        props.setloading(true);
        LoginService(values, isFromOtherModal)
            .then((response) => {
                if (isFromOtherModal) {
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
                    position: "top-center",
                });

                let userType = "";
                if (response.user_detail[0].user_type == 2) {
                    userType = "buyer";
                } else if (response.user_detail[0].user_type == 3) {
                    userType = "vendor";
                } else if (response.user_detail[0].user_type == 4) {
                    userType = "other";
                }
                storageInstance.setStorage("current-user-type", userType);

                if (redirect && redirect != "") {
                    router.push(window.atob(redirect));
                    return;
                } else {
                    let prod_name = storageInstance.getStorage('product_name');
                    if (pathname.includes("/dashboard/buyer/rfq-management-vendor/vendor-profile")) {
                        router.reload();
                    } else if (prod_name != "" && prod_name != "all" && userType != "vendor") {
                        router.push(`/vendor/${prod_name}`);
                    } else if (userType == "buyer") {
                        router.push(`/vendor/all?loggedin=true`);
                    } else if (userType == "vendor" && pathname.includes("/dashboard/vendor/inquiries-details")) {
                        console.log("Push Sent")
                    }    
                    else {
                        router.push(`/dashboard/${userType}`);
                    }
                }
                //router.push(`/dashboard`);
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
                        setLoginWith("email");
                        handleOtherDeviceLoginModalOpen();
                    }, 1000);
                } else if (error?.message?.response?.data) {
                    toast.error(error?.message?.response?.data?.message, {
                        position: "top-center",
                    });
                }

                if (error?.response?.status === 400) {
                } else {
                    toast.error(error?.message, {
                        position: "top-center",
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
                        position: "top-center",
                    });

                    let userType = "";
                    if (response?.profile?.user_type == 2) {
                        userType = "buyer";
                    } else if (response?.profile?.user_type == 3) {
                        userType = "vendor";
                    }
                    storageInstance.setStorage("current-user-type", userType);
                    if (userType == "buyer") {
                        router.push(`/vendor/all?loggedin=true`);
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
                            position: "top-center",
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
                loginSubmitHandler={loginSubmitHandler}
                loginWithGoogle={loginWithGoogle}
                loginWith={loginWith}
            />
        </>
    )
}

export default LoginContainer
