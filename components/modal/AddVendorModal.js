import React from 'react'
import Modal from "react-modal";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";


const AddVendorModal = ({
    type,
    projectData,
    openModal,
    closeModal,
    handleAddVendor,
    handleCreateProject,
    handleEditProject
}) => {

    const initialVendorValues = {
        vendorName: "",
        email: "",
        phone: "",
        productList: "",
    };

    const initialProjectValues = {
        projectName: projectData?.name || "",
        projectDescription: projectData?.description || "",
        location: projectData?.location || "",
        ended_at: projectData?.ended_at || "",
    }

    const validateVendorSchema = yup.object().shape({
        vendorName: yup.string().required("Name is required")
            .min(2, "Name not less than 2 characters short")
            .max(50, "Name not more than 50 characters long"),
        email: yup.string().email()
            .matches(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please enter valid email address"
            )
            .required("Email is required"),
        phone: yup.string()
            .matches(
                /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
                "please enter valid mobile number"
            )
            .min(10, "Min 10 digit is required")
            .max(12, "Mobile number not more than 11 digit long")
            .required("Mobile number is required"),
        productList: yup.string().required("product List is Required")
            .min(2, "product Name not less than 2 characters short")
    });

    const validateProjectSchema = yup.object().shape({
        projectName: yup.string().required("Project Name is required")
            .min(2, "Name not less than 2 characters short")
            .max(50, "Name not more than 50 characters long"),
        projectDescription: yup.string(),
        location: yup.string(),
        ended_at: yup.date()
    });

    return (
        <>
            <Modal
                isOpen={openModal}
                onRequestClose={closeModal}
                ariaHideApp={false}
                contentLabel={type === "add-vendor" ? 'Add Vendor Modal' : 'Create Project Modal'}
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
                                <h2 className="tab-titlex mb-4">{type === "add-vendor" ? 'Add Single Vendor' : type === "create-project" ? 'Create Project' : 'Edit Project'}</h2>
                                <Formik
                                    initialValues={type === "add-vendor" ? initialVendorValues : initialProjectValues}
                                    validationSchema={type === "add-vendor" ? validateVendorSchema : validateProjectSchema}
                                    onSubmit={(values, { resetForm }) => {
                                        type === "add-vendor"
                                            ? handleAddVendor(values, resetForm)
                                            : type === "create-project"
                                                ? handleCreateProject(values, resetForm)
                                                : handleEditProject(values, resetForm)
                                    }}
                                >
                                    {({ errors, isValid, touched }) => (
                                        <Form className="row add-vendor-modal-form">
                                            <div className="col-md-6">
                                                {type === "add-vendor"
                                                    ?
                                                    <>
                                                        {/* add vendor section */}
                                                        <div className="form-group">
                                                            <label htmlFor="vendorName">Vendor's Name <sup>*</sup></label>
                                                            <Field
                                                                type="text"
                                                                id="vendorName"
                                                                name="vendorName"
                                                                placeholder="Demo Manufactuters Pvt. Ltd."
                                                            />
                                                            {touched.vendorName && errors.vendorName && (
                                                                <div className="form-error">{errors.vendorName}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="email">Vendor's Email <sup>*</sup></label>
                                                            <Field
                                                                type="email"
                                                                id="email"
                                                                name="email"
                                                                placeholder="example@letsworkwise.com"
                                                            />
                                                            {touched.email && errors.email && (
                                                                <div className="form-error">{errors.email}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="phone">Phone No <sup>*</sup></label>
                                                            <Field
                                                                type="text"
                                                                id="phone"
                                                                name="phone"
                                                                placeholder="Ex. 9123456789"
                                                            />
                                                            {touched.phone && errors.phone && (
                                                                <div className="form-error">{errors.phone}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                    : <>
                                                        {/* project fields section */}
                                                        <div className="form-group">
                                                            <label htmlFor="projectName">Project Name <sup>*</sup></label>
                                                            <Field
                                                                type="text"
                                                                id="projectName"
                                                                name="projectName"
                                                                placeholder="Demo Project Name"
                                                            />
                                                            {touched.projectName && errors.projectName && (
                                                                <div className="form-error">{errors.projectName}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="location">Location</label>
                                                            <Field
                                                                type="text"
                                                                id="location"
                                                                name="location"
                                                                placeholder="JBR Tech Park, Bengaluru, karnataka"
                                                            />
                                                            {touched.location && errors.location && (
                                                                <div className="form-error">{errors.location}</div>
                                                            )}
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor="ended_at">End Date</label>
                                                            <Field
                                                                type="date"
                                                                id="ended_at"
                                                                name="ended_at"
                                                            />
                                                            {touched.ended_at && errors.ended_at && (
                                                                <div className="form-error">{errors.ended_at}</div>
                                                            )}
                                                        </div>
                                                    </>
                                                }
                                            </div>

                                            <div className="col-md-6">
                                                {type === "add-vendor"
                                                    ?
                                                    <div className="form-group">
                                                        <label htmlFor="productList">Product List <sup>*</sup></label>
                                                        <Field
                                                            component="textarea"
                                                            id="productList"
                                                            name="productList"
                                                            placeholder="Brass Binding Wire, Ceramic Marble..."
                                                        />
                                                        {touched.productList && errors.productList && (
                                                            <div className="form-error">{errors.productList}</div>
                                                        )}
                                                    </div>
                                                    : <div className="form-group">
                                                        <label htmlFor="projectDescription">Description</label>
                                                        <Field
                                                            component="textarea"
                                                            id="projectDescription"
                                                            name="projectDescription"
                                                            placeholder="Brass Binding Wire, Ceramic Marble..."
                                                        />
                                                        {touched.projectDescription && errors.projectDescription && (
                                                            <div className="form-error">{errors.projectDescription}</div>
                                                        )}
                                                    </div>
                                                }
                                            </div>

                                            <div className="d-flex flex-row justify-content-between align-items-center g-6">
                                                <button disabled={!isValid} class="btn btn-success btn-sm">
                                                    {type === "add-vendor" ? "Add vendor" : "Create"}
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

export default AddVendorModal
