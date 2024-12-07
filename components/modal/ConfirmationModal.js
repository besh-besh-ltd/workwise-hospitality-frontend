import React from 'react'
import Modal from "react-modal";

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    message
}) => {
    return (
        <div className=''>
            <Modal
                isOpen={isOpen}
                onRequestClose={onClose}
                ariaHideApp={false}
                contentLabel="Regret Quote Reason"
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
                        width: "50%", // Set to 'auto' or a specific value based on your design
                        border: "none",
                        background: "transparent",
                        overflow: "hidden",
                        padding: "60px",
                        maxHeight: "100vh", // Adjust this value as needed\
                        height: "90vh", // Adjust this value as needed,
                        alignContent: 'center'
                    },
                }}
            >
                <div className="modal-header">
                    <button
                        onClick={onClose}
                        className="btn-close"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="modal-body text-center">
                    <div className='p-5 pb-3'>
                        <h4 className='mb-4'>{message}</h4>
                        <div className='d-flex justify-content-center'>
                            <button onClick={onConfirm} className="btn btn-primary">Yes</button>
                            <button onClick={onClose} className="btn btn-secondary mx-3 btn-md">No</button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default ConfirmationModal
