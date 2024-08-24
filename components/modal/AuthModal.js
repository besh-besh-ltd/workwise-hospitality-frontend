import { useEffect, useRef, useState } from "react";
import Modal from "react-modal";
import Login from "../login";
import Register from "../register";
import { useSelector } from "react-redux";
import { handleSocialLogin, LoginService, SWSubscribe } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { useGoogleLogin } from "@react-oauth/google";

const AuthModal = (props) => {
	const router = useRouter();
	const { type, user_registered, redirect } = router.query;
	// const [activeTab, setActiveTab] = useState('login')
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [loading, setloading] = useState(false)
	const urlRef = useRef(router.asPath)

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
				storageInstance.setStorage("current-user-name", response.user_detail[0].name);
				
				props.setOpenAuthModal(false);
				if (redirect && redirect != "") {
					router.push(window.atob(redirect));
					return;
				} else {
					props.setIsLoggedIn && props.setIsLoggedIn(true)
					if (userType == "buyer") {
						router.push(`/products`);
					} else {
						router.push(`/dashboard/${userType}`);
					}
				}
				// router.push(`/dashboard/${userType}`);
			})
			.catch((error) => {
				console.log(error)
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
				console.log(error)
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
			console.log(error)
		  setloading(false);
		},
	  });

	// Use useEffect to handle the body overflow property
	useEffect(() => {
		const handleBodyOverflow = () => {
			document.body.style.overflow = props.openAuthModal ? "hidden" : "auto";
		};
		handleBodyOverflow(); // Set initial state
		// Cleanup function to restore body overflow when the component unmounts
		return () => {
			document.body.style.overflow = "auto";
		};
	}, [props.openAuthModal]);

	return (
		<Modal
			isOpen={props.showModal}
			onRequestClose={props.closeModal}
			ariaHideApp={false}
			contentLabel="Login/Register Modal"
			className="login-register"
			style={{
				overlay: {
					backgroundColor: "rgba(0, 0, 0, 0.75)",
				},
				content: {
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					maxWidth: "90vw", // Adjust this value as needed
					width: "600px", // Set to 'auto' or a specific value based on your design
					border: "none",
					background: "transparent",
					overflow: "hidden",
					padding: "50px",
					maxHeight: "100vh", // Adjust this value as needed\
					height: "90vh", // Adjust this value as needed
				},
			}}
		>
			<div className="modal-header">
				<button
					onClick={props.closeModal}
					className="btn-close"
					aria-label="Close"
				></button>
			</div>
			<div className="modal-body" style={{}}>
				<div className="tabs-container">
					<button
						onClick={() => props.setActiveTab("login")}
						className={props.activeTab === "login" ? "active" : ""}
					>
						Login
					</button>
					<button
						onClick={() => props.setActiveTab("register")}
						className={props.activeTab === "register" ? "active" : ""}
					>
						Register
					</button>
				</div>
				{props.activeTab === "login" ? (
					<Login
						setActiveTab={props.setActiveTab}
						closeModal={props.closeModal}
						setEmail={setEmail}
						setPassword={setPassword}
						loading={props.loading}
						setloading={setloading}
						loginSubmitHandler={loginSubmitHandler}
						loginWithGoogle={loginWithGoogle}
					/>
				) : (
					<Register closeModal={props.closeModal} />
				)}
			</div>
		</Modal>
	);
};

export default AuthModal;
