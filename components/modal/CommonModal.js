import React from 'react'
import Modal from "react-modal";

const CommonModal = ({ data, openCommonModal, closeModal }) => {
    
    return (
        <>
            <Modal
                isOpen={openCommonModal}
                onRequestClose={closeModal}
                ariaHideApp={false}
                contentLabel="Common Modal"
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
                        minWidth: "50vw", // Set to 'auto' or a specific value based on your design
                        maxWidth: "90vw", // Adjust this value as needed
                        height: "90vh", // Adjust this value as needed
                        maxHeight: "100vh", // Adjust this value as needed\
                        border: "none",
                        background: "transparent",
                        overflow: "hidden",
                        padding: "50px",
                    },
                }}
            >

                <div className="modal-header">
                    <button
                        onClick={closeModal}
                        className="btn-close"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="modal-body contact-sec-modal" style={{}}>
                    <div className="contact-sec-3">
                        <div className="contact-sec-3-form">
                            <div className="contact-form">
                                <h2 className="tab-titlex">{data.title}</h2>
                                <p>Please find the details below</p>

                                <section className="d-flex justify-content-center align-items-center my-5">
                                    <div className="w-75">
                                        <div class="input-group mb-3">
                                            <span class="input-group-text" id={`mobile_${data?.mobile}`}>Mobile</span>
                                            <input type="text" class="form-control" aria-label="Mobile data section" aria-describedby={`mobile_${data?.mobile}`} value={`${data?.mobile}`} disabled />
                                        </div>
                                        <div class="input-group mb-3">
                                            <span class="input-group-text" id={`email${data?.email}`}>Email</span>
                                            <input type="text" class="form-control" aria-label="Email section" aria-describedby={`email${data?.email}`} value={`${data?.email}`} disabled />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default CommonModal
