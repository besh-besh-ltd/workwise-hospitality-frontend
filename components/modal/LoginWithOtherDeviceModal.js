import React, { useEffect, useState } from 'react'
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useSelector } from "react-redux";
import { handleSocialLogin, LoginService, SWSubscribe } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { useGoogleLogin } from "@react-oauth/google";

const LoginWithOtherDeviceModal = (props) => {
    const { onHide, show, email, password, loginWith } = props;
    const router = useRouter();
	const { redirect } = router.query;
	const [loading, setloading] = useState(false)

    const swSubscription = useSelector((data) => data.swSubscription);

	const loginSubmitHandler = (values, isFromOtherModal = false) => {
		setloading(true);
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
				setloading(false);
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

				props.setOpenAuthModal(false);
				if (redirect && redirect != "") {
					router.push(window.atob(redirect));
					return;
				} else {
					if (userType == "buyer") {
						router.push(`/products`);
					} else {
						router.push(`/dashboard/${userType}`);
					}
				}
				// router.push(`/dashboard/${userType}`);
			})
			.catch((error) => {
				setloading(false);
				if (
					error?.message?.response?.status === 400 &&
					error?.message?.response?.data?.status === 4
				) {
					toast.error(error?.message?.response?.data?.message, {
						position: "top-center",
					});
					setTimeout(() => {
						props.setOpenAuthModal(false);
					}, 2000);

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
				.catch((err) => { console.log(err) });
			  setloading(false);
			  toast.success(response.message, {
				position: "top-center",
			  });
			  console.log(response, "response *");
			  console.log(response?.profile?.user_type, "response type *");
	
			  let userType = "";
			  if (response?.profile?.user_type == 2) {
				userType = "buyer";
			  } else if (response?.profile?.user_type == 3) {
				userType = "vendor";
			  }
			  storageInstance.setStorage("current-user-type", userType);
			  
			  props.setOpenAuthModal(false);
			  if (userType == "buyer") {
				router.push(`/products`);
			  } else {
				router.push(`/dashboard/${userType}`);
			  }
			})
			.catch((error) => {
			  setloading(false);
			  if (
				error?.message?.response?.status === 400 &&
				error?.message?.response?.data?.status === 4
			  ) {
				toast.error(error?.message?.response?.data?.message, {
				  position: "top-center",
				});
				setTimeout(() => {
				  props.setOpenAuthModal(false);
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
		  setloading(false);
		},
	  });

    const handleLogin = () => {
        const values = {
            email,
            password,
        };
        loginWith === 'google' ? loginWithGoogle() : loginSubmitHandler(values, true);
    }

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="p-3">Login With Other Device</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Do you want to Login with current device ?
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => onHide()}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={() => handleLogin()}>
                    Yes
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default LoginWithOtherDeviceModal