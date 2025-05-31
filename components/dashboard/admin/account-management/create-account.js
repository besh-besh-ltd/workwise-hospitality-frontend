import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Select from "react-select";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import FullLoader from "@/components/shared/FullLoader";
import { createBuyerCompanyUser } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import { createAccountSchema } from "@/utils/schema";

const CreateAccountPage = () => {
    const router = useRouter();
    
    // Grouped states object to reduce number of individual states
    const [appState, setAppState] = useState({
        loading: false,
        countryCodes: [],
        selectedCountryCode: "+91"
    });

    // Role options with color coding
    const roleOptions = [
        { value: 7, label: "Admin", color: "#007bff" },
        { value: 8, label: "Top Management", color: "#2E5BA8" },
        { value: 2, label: "Procurement", color: "#428B41" },
        { value: 9, label: "Engineering", color: "#FFE600" },
        { value: 10, label: "Finance", color: "#5b5b5b" },
    ];

    // Initial form values
    const initialValues = {
        name: "",
        email: "",
        mobile: "",
        countryCode: "+91",
        password: "",
        confirmPassword: "",
        role: null
    };

    const handleSubmit = async (values, { resetForm, setSubmitting }) => {
        setAppState(prev => ({ ...prev, loading: true }));
        
        try {
            // Format mobile with country code
            const formattedMobile = `${values.countryCode}-${values.mobile}`;
            
            const apiData = {
                name: values.name,
                email: values.email,
                mobile: formattedMobile,
                user_type: values.role.value.toString(),
                password: values.password
            };
            
            const response = await createBuyerCompanyUser(apiData);
            
            if (response.status) {
                toast.success("Account created successfully!");
                resetForm();
                router.push("/dashboard/admin/account-management/manage-accounts?refresh=true");
            } else {
                toast.error(response.message || "Failed to create account");
            }
        } catch (error) {
            console.error("Error creating account:", error);
            toast.error("Failed to create account. Please try again.");
        } finally {
            setAppState(prev => ({ ...prev, loading: false }));
            setSubmitting(false);
        }
    };
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getCountryCodes();
                if (response?.data) {
                    setAppState(prev => ({
                        ...prev,
                        countryCodes: response.data
                    }));
                }
            } catch (error) {
                console.error("Error fetching country codes:", error);
                toast.error("Failed to load country codes");
            }
        };
        
        fetchData();
    }, []);
        
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
                                    <Link href="/dashboard/admin/account-management/manage-accounts" className="btn btn-outline-secondary">
                                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                        Back to Manage Accounts
                                    </Link>
                                </div>
                                {/*END: Back Button */}

                                <div className="card shadow-sm">
                                    <div className="card-body p-4 hasFullLoader">
                                        {appState.loading && <FullLoader />}
                                        
                                        <Formik
                                            initialValues={initialValues}
                                            validationSchema={createAccountSchema}
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
                                                                <div className="d-flex">
                                                                    {/*START: Country Code Selector */}
                                                                    <Field name="countryCode">
                                                                        {({ field, form }) => (
                                                                            <select
                                                                                {...field}
                                                                                className={`form-select me-2 ${touched.countryCode && errors.countryCode ? "is-invalid" : ""}`}
                                                                                style={{ maxWidth: "140px" }}
                                                                                onChange={(e) => {
                                                                                    form.setFieldValue("countryCode", e.target.value);
                                                                                    setAppState(prev => ({ 
                                                                                        ...prev, 
                                                                                        selectedCountryCode: e.target.value 
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                {appState.countryCodes.map((country) => (
                                                                                    <option key={country.id} value={country.phone_code}>
                                                                                        {country.country_code} ({country.phone_code})
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </Field>
                                                                    {/*END: Country Code Selector */}
                                                                    
                                                                    <Field
                                                                        type="text"
                                                                        id="mobile"
                                                                        name="mobile"
                                                                        placeholder="Enter mobile number"
                                                                        className={`form-control ${touched.mobile && errors.mobile ? "is-invalid" : ""}`}
                                                                    />
                                                                </div>
                                                                <ErrorMessage name="mobile" component="div" className="invalid-feedback" />
                                                                <ErrorMessage name="countryCode" component="div" className="invalid-feedback" />
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

                                                    <div className="row mb-4">
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

                                                    <div className="row">
                                                        <div className="col-md-12 d-flex justify-content-end">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary me-2"
                                                                onClick={() => router.push("/dashboard/admin/account-management/manage-accounts")}
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
