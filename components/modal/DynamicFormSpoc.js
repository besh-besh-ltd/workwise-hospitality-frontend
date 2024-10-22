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
                        maxWidth: "80vw",  // Reduced from 90vw
                        width: "70vw",      // Reduced from 80vw
                        border: "none",
                        background: "transparent",
                        overflow: "hidden",
                        padding: "40px",    // Reduced from 50px
                        maxHeight: "90vh",  // Keeping the same
                        height: "80vh",     // Reduced from 90vh
                    },
                }}
            >



                <div className="modal-body contact-sec-modal w-75 mx-auto">
                    <div className="contact-sec-3 flex">
                        <div className="contact-sec-3-form">

                            <div className="contact-form w-100 ">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h2 className="tab-titlex m-0">{type === "create-spoc" ? 'New SPOC' : 'Edit SPOC'}</h2>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="btn-close"
                                        aria-label="Close"
                                    ></button>
                                </div>

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
                                        <Form className="row add-vendor-modal-form w-100 ">

                                            <div className="col-md-12">

                                                <div className='row'>
                                                    <div className='col-md-6'>

                                                        <div className="form-group">
                                                            <label htmlFor="spoc_name">Name <sup>*</sup></label>
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

                                                    </div>
                                                    <div className='col-md-6'>
                                                        <div className="form-group">
                                                            <label htmlFor="spoc_email">Email <sup>*</sup></label>
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

                                                    </div>
                                                </div>

                                                {/* New row for bottom two fields side by side */}
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <div className="form-group">
                                                            <label htmlFor="spoc_mobile">Mobile <sup>*</sup></label>
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
                                                    </div>

                                                    <div className="col-md-6">
                                                        <div className="form-group">
                                                            <label htmlFor="spoc_role">Role <sup>*</sup></label>
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
                                                </div>

                                                <div className="d-flex justify-content-end">
                                                    <button
                                                        type="submit"
                                                        disabled={!isValid}
                                                        className="btn btn-success btn-sm"
                                                    >
                                                       Submit
                                                    </button>
                                                </div>

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
