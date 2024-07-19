import { useEffect, useState } from "react";
import Modal from "react-modal";
import Login from "../login";
import Register from "../register";
const AuthModal = (props) => {
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
						setEmail={props.setEmail}
        				setPassword={props.setPassword}
						loading={props.loading}
						setloading={props.setloading}
						loginSubmitHandler={props.loginSubmitHandler}
						loginWithGoogle={props.loginWithGoogle}
					/>
				) : (
					<Register closeModal={props.closeModal} />
				)}
			</div>
		</Modal>
	);
};

export default AuthModal;
