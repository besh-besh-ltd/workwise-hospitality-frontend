import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { BsX } from "react-icons/bs";
import Register from "../register";
import { useRouter } from "next/router";
import styles from "../register/Register.module.css";

const modalOverlayStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(6px)",
  zIndex: 1050,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalContentStyle = {
  position: "relative",
  top: "auto",
  left: "auto",
  right: "auto",
  bottom: "auto",
  border: "none",
  background: "transparent",
  overflow: "visible",
  padding: 0,
  borderRadius: 0,
  maxWidth: "700px",
  width: "95%",
  margin: "0 auto",
};

export default function RegisterUserModal({
  showModal,
  setShowModal,
  showButton = true,
  onRegistrationSuccess,
  onClose,
  isPaidSubscription = false,
  isHospitality = false,
  subscription_plan = 0,
}) {
  const router = useRouter();
  const source = router?.query?.source;

  // Backward-compatible internal state
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const modalShow = showModal !== undefined ? showModal : internalShowModal;
  const setModalShow = setShowModal !== undefined ? setShowModal : setInternalShowModal;

  // Clear T&C/CoC localStorage when modal opens
  useEffect(() => {
    if (modalShow) {
      localStorage.removeItem("vendor_tnc_accepted");
      localStorage.removeItem("vendor_coc_accepted");
    }
  }, [modalShow]);

  const handleClose = () => {
    setModalShow(false);
    if (onClose) onClose();
  };

  const getStepSubtitle = () => {
    if (currentStep === 1) return "Tell us about yourself";
    if (currentStep === 2) return "Share where you operate";
    if (currentStep === 3 && isHospitality) return "Select business units";
    if (currentStep === 4 && isHospitality) return "Bank details & documents";
    return "Complete your registration";
  };

  return (
    <>
      {showButton && (
        <div>
          <button
            id="register-as-vendor-modal"
            className={styles.triggerBtn}
            onClick={() => setModalShow(true)}
          >
            Register As Vendor
          </button>
        </div>
      )}

      <Modal
        isOpen={modalShow}
        onRequestClose={handleClose}
        ariaHideApp={false}
        contentLabel="Vendor Registration"
        shouldCloseOnOverlayClick={false}
        style={{ overlay: modalOverlayStyle, content: modalContentStyle }}
      >
        <div className={styles.modalWrap}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.modalHeaderLeft}>
              <h2>Register As Vendor</h2>
              <p>{getStepSubtitle()}</p>
            </div>
            <button
              type="button"
              className={styles.modalClose}
              onClick={handleClose}
            >
              <BsX size={20} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.modalBody}>
            <Register
              registerAs={"vendor"}
              onRegistrationSuccess={onRegistrationSuccess}
              isPaidSubscription={isPaidSubscription}
              isHospitality={isHospitality}
              source={source}
              subscription_plan={subscription_plan}
              onStepChange={setCurrentStep}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
