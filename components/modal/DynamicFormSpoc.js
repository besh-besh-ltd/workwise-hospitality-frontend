import React from 'react'
import Modal from "react-modal";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";

const DynamicFormSpoc = ({
    type,
    spocData,
    openModal,
    closeModal,
    handleSpoc,
    handleEditSpoc
}) => {

    const initialSpocValue = {
        spoc_name: type === "create-spoc" ? "" : spocData?.spoc_name,
        spoc_email: type === "create-spoc" ? "" : spocData?.spoc_email,
        spoc_mobile: type === "create-spoc" ? "" : spocData?.spoc_mobile,
        spoc_role: type === "create-spoc" ? "" : spocData?.spoc_role
    }

    const validateSpocSchema = yup.object().shape({
        spoc_name: yup.string().required("Spoc name is required")
            .min(2, "Name not less than 2 characters short")
            .max(50, "Name not more than 50 characters long"),
        spoc_email: yup.string().email()
            .matches(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please enter valid email address"
            )
            .required("Email is required"),
        spoc_mobile: yup.string()
            .matches(
                /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
                "please enter valid mobile number"
            )
            .min(10, "Min 10 digit is required")
            .max(12, "Mobile number not more than 11 digit long")
            .required("Mobile number is required"),
        spoc_role: yup.string().required("Role is required")
            .min(3, "Role not less than 3 characters short")
            .max(50, "Role not more than 50 characters long"),
    })


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

                <div className="modal-body contact-sec-modal">
                    <div className="contact-sec-3">
                        <div className="contact-sec-3-form">
                            <div className="contact-form">
                                <h2 className="tab-titlex mb-4">{type === "create-spoc" ? 'Add SPOC' : 'Edit SPOC'}</h2>
                                <Formik
                                    initialValues={initialSpocValue}
                                    validationSchema={validateSpocSchema}
                                    onSubmit={(values, { resetForm }) => {
                                        type === "create-spoc"
                                            ? handleSpoc(values, resetForm)
                                            : handleEditSpoc(values, resetForm);
                                    }}
                                >
                                    {({ errors, isValid, touched }) => (
                                        <Form className="row add-vendor-modal-form">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label htmlFor="spoc_name">SPOC Name <sup>*</sup></label>
                                                    <Field
                                                        type="text"
                                                        id="spoc_name"
                                                        name="spoc_name"
                                                        placeholder="Spoc Name"
                                                    />
                                                    {touched.spoc_name && errors.spoc_name && (
                                                        <div className="form-error">{errors.spoc_name}</div>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="spoc_email">SPOC Email <sup>*</sup></label>
                                                    <Field
                                                        type="text"
                                                        id="spoc_email"
                                                        name="spoc_email"
                                                        placeholder="Spoc Email"
                                                    />
                                                    {touched.spoc_email && errors.spoc_email && (
                                                        <div className="form-error">{errors.spoc_email}</div>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="spoc_mobile">SPOC Mobile <sup>*</sup></label>
                                                    <Field
                                                        type="text"
                                                        id="spoc_mobile"
                                                        name="spoc_mobile"
                                                        placeholder="Spoc Mobile"
                                                    />
                                                    {touched.spoc_mobile && errors.spoc_mobile && (
                                                        <div className="form-error">{errors.spoc_mobile}</div>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="spoc_role">SPOC Role <sup>*</sup></label>
                                                    <Field
                                                        type="text"
                                                        id="spoc_role"
                                                        name="spoc_role"
                                                        placeholder="Spoc Role"
                                                    />
                                                    {touched.spoc_role && errors.spoc_role && (
                                                        <div className="form-error">{errors.spoc_role}</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="d-flex justify-content-end">
                                                <button
                                                    type="submit"
                                                    disabled={!isValid}
                                                    className="btn btn-success btn-sm"
                                                >
                                                    {type === "create-spoc" ? "Add Spoc" : "Update Spoc"}
                                                </button>
                                            </div>
                                        </Form>
                                    )}
                                </Formik>
                            </div>
                        </div>
                    </div>
                </div>


            </Modal>
        </>
    )
}

export default DynamicFormSpoc
