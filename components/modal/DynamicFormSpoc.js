import React from 'react'
import Modal from "react-modal";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";

const DynamicFormSpoc = ({
    type,
    spocData,
    openModal,
    closeModal,
    handleAddSpoc,
    handlEditSpoc
}) => {


    const initialSpocValue = {
        spoc_name: "",
        spoc_email: "",
        spoc_mobile: "",
        spoc_role: ""
    }




    return (
        <>
            <Modal
                isOpen={openModal}
                onRequestClose={closeModal}
                ariaHideApp={false}
                contentLabel={type === "create-spoc" ? 'Add Spoc Modal' : 'Update Spoc Modal'}
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
                        width: "80vw", // Set to 'auto' or a specific value based on your design
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
                        type="button"
                        onClick={closeModal}
                        className="btn-close"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="modal-body contact-sec-modal" style={{}}>
                    <div className="contact-sec-3">
                        <div className="contact-sec-3-form">
                            <div className="contact-form">
                                <h2 className="tab-titlex mb-4">{type === "create-spoc" ? 'Add SPOC' : 'Edit SPOC'}</h2>
                            </div>
                        </div>
                    </div>
                </div>


            </Modal>
        </>
    )
}

export default DynamicFormSpoc
