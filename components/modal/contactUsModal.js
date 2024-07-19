import { useEffect, useState } from "react";
import Modal from "react-modal";
import Login from "../login";
import Register from "../register";
import ContactUsForm from "../contactus/form";
const ContactUsModal = (props) => {
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
      contentLabel="Contact Modal"
      className="contact-modal contact-modal-new"
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
      <div className="modal-body contact-sec-modal" style={{}}>
        <div className="contact-sec-3">
          <div className="contact-sec-3-form">
            <div className="contact-form">
              <h3 className="tab-title">Contact Us</h3>
              <ContactUsForm
                closeModal={props.closeModal}
                isModalForm={true}
                fromType={props.fromType}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ContactUsModal;
