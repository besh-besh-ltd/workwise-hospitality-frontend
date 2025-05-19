import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Select from "react-select";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import FullLoader from "@/components/shared/FullLoader";

    // Initial form values
    const initialValues = {
        name: "",
        email: "",
        mobile: "",
        password: "",
        confirmPassword: "",
        role: null,
        projects: [],
        company_id: 1, // This would be retrieved from context in a real implementation
    };

const CreateAccountPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Role options with color coding
    const roleOptions = [
        { value: 8, label: "Top Management", color: "#2E5BA8" }, // Primary color
        { value: 2, label: "Procurement", color: "#428B41" }, // Secondary color
        { value: 9, label: "Engineering", color: "#FFE600" }, // Yellow color
        { value: 10, label: "Finance", color: "#5b5b5b" }, // Text color
    ];

    // Project options
    const projectOptions = [
        { value: 1, label: "Project 1" },
        { value: 2, label: "Project 2" },
        { value: 3, label: "Project 3" },
    ];

    // Validation schema
    const validationSchema = Yup.object().shape({
        name: Yup.string().required("Name is required"),
        email: Yup.string().email("Invalid email format").required("Email is required"),
        mobile: Yup.string()
            .matches(/^[0-9+\- ]+$/, "Invalid mobile number format")
            .required("Mobile number is required"),
        password: Yup.string()
            .min(8, "Password must be at least 8 characters")
            .required("Password is required"),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref("password"), null], "Passwords must match")
            .required("Confirm password is required"),
        role: Yup.object().required("Role is required"),
    });


    // Handle form submission
    const handleSubmit = (values, { resetForm, setSubmitting }) => {
        setLoading(true);
        
        // Format the data for API
        const formData = {
            ...values,
            role: values.role.value,
            projects: values.projects.map(project => project.value),
        };
        
        // Simulate API call
        setTimeout(() => {
            toast.success("Account created successfully!");
            resetForm();
            setLoading(false);
            setSubmitting(false);
            
            // Redirect to manage accounts page
            router.push("/dashboard/admin/manage-accounts");
        }, 1000);
    };

    return (
        <>
            <section className="buyer-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Create New Account</h1>
                </div>
            </section>

            <section className="buyer-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="vendor-mngt-con">
                                {/*START: Back Button */}
                                <div className="mb-4">
                                    <Link href="/dashboard/admin/manage-accounts" className="btn btn-outline-secondary">
                                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                        Back to Manage Accounts
                                    </Link>
                                </div>
                                {/*END: Back Button */}

                                <div className="card shadow-sm">
                                    <div className="card-body p-4 hasFullLoader">
                                        {loading && <FullLoader />}
                                        
                                        <Formik
                                            initialValues={initialValues}
                                            validationSchema={validationSchema}
                                            onSubmit={handleSubmit}
                                        >
                                            {({ errors, touched, values, setFieldValue, isSubmitting }) => (
                                                <Form>
                                                    <div className="row mb-4">
                                                        <div className="col-md-12">
                                                            <h4 className="mb-3">Account Information</h4>
                                                            <p className="text-muted">Create a new user account for internal roles</p>
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-6">
                                                            <div className="form-group mb-3">
                                                                <label htmlFor="name" className="form-label">
                                                                    Name <span className="text-danger">*</span>
                                                                </label>
                                                                <Field
                                                                    type="text"
                                                                    id="name"
                                                                    name="name"
                                                                    className={`form-control ${touched.name && errors.name ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="name" component="div" className="invalid-feedback" />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="form-group mb-3">
                                                                <label htmlFor="email" className="form-label">
                                                                    Email <span className="text-danger">*</span>
                                                                </label>
                                                                <Field
                                                                    type="email"
                                                                    id="email"
                                                                    name="email"
                                                                    className={`form-control ${touched.email && errors.email ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="email" component="div" className="invalid-feedback" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-6">
                                                            <div className="form-group mb-3">
                                                                <label htmlFor="mobile" className="form-label">
                                                                    Mobile <span className="text-danger">*</span>
                                                                </label>
                                                                <Field
                                                                    type="text"
                                                                    id="mobile"
                                                                    name="mobile"
                                                                    className={`form-control ${touched.mobile && errors.mobile ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="mobile" component="div" className="invalid-feedback" />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="form-group mb-3">
                                                                <label htmlFor="role" className="form-label">
                                                                    Role <span className="text-danger">*</span>
                                                                </label>
                                                                <Select
                                                                    id="role"
                                                                    name="role"
                                                                    options={roleOptions}
                                                                    value={values.role}
                                                                    onChange={(option) => setFieldValue("role", option)}
                                                                    className={`${touched.role && errors.role ? "is-invalid" : ""}`}
                                                                    styles={{
                                                                        option: (provided, state) => ({
                                                                            ...provided,
                                                                            color: state.data.color,
                                                                            fontWeight: 'bold'
                                                                        })
                                                                    }}
                                                                />
                                                                {touched.role && errors.role && (
                                                                    <div className="invalid-feedback d-block">{errors.role}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-6">
                                                            <div className="form-group mb-3">
                                                                <label htmlFor="password" className="form-label">
                                                                    Password <span className="text-danger">*</span>
                                                                </label>
                                                                <Field
                                                                    type="password"
                                                                    id="password"
                                                                    name="password"
                                                                    className={`form-control ${touched.password && errors.password ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="password" component="div" className="invalid-feedback" />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="form-group mb-3">
                                                                <label htmlFor="confirmPassword" className="form-label">
                                                                    Confirm Password <span className="text-danger">*</span>
                                                                </label>
                                                                <Field
                                                                    type="password"
                                                                    id="confirmPassword"
                                                                    name="confirmPassword"
                                                                    className={`form-control ${touched.confirmPassword && errors.confirmPassword ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="confirmPassword" component="div" className="invalid-feedback" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row mb-4">
                                                        <div className="col-md-12">
                                                            <div className="form-group">
                                                                <label htmlFor="projects" className="form-label">
                                                                    Assign to Projects
                                                                </label>
                                                                <Select
                                                                    id="projects"
                                                                    name="projects"
                                                                    options={projectOptions}
                                                                    value={values.projects}
                                                                    onChange={(options) => setFieldValue("projects", options)}
                                                                    isMulti
                                                                    placeholder="Select projects to assign"
                                                                />
                                                                <small className="form-text text-muted">
                                                                    Select multiple projects to assign this user to
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-12 d-flex justify-content-end">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary me-2"
                                                                onClick={() => router.push("/dashboard/admin/manage-accounts")}
                                                                disabled={isSubmitting}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                className="btn btn-primary"
                                                                disabled={isSubmitting}
                                                            >
                                                                Create Account
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
                    </div>
                </div>
            </section>
        </>
    );
};

export default CreateAccountPage;
