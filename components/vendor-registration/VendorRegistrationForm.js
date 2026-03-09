import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { BsCheckCircleFill } from 'react-icons/bs';
import styles from './VendorRegistration.module.css';

const validationSchema = Yup.object({
  vendorName: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Vendor name is required'),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^\d{7,15}$/, 'Please enter a valid phone number')
    .required('Phone number is required'),
  companyName: Yup.string()
    .min(2, 'Company name must be at least 2 characters')
    .required('Company name is required'),
});

const initialValues = {
  vendorName: '',
  email: '',
  phone: '',
  companyName: '',
};

const VendorRegistrationForm = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await fetch(process.env.NEXT_PUBLIC_VENDOR_LEAD_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          timestamp: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        }),
      });
      setSubmitted(true);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
  };

  return (
    <div className={styles.pageWrap}>
      {/* Hero Header */}
      <div className={styles.heroHeader}>
        <img
          src="/assets/images/logo.png"
          alt="Workwise"
          className={styles.logo}
        />
        <h1 className={styles.heroTitle}>Vendor Registration</h1>
        <p className={styles.heroSubtitle}>Hospitality by Workwise</p>
      </div>

      {/* Card */}
      <div className={styles.card} key={submitted ? 'success' : 'form'}>
        {submitted ? (
          /* ── Success Screen ── */
          <div className={styles.successWrap}>
            <BsCheckCircleFill className={styles.successIcon} />
            <h2 className={styles.successTitle}>Registration Successful!</h2>
            <p className={styles.successMessage}>
              Thank you for registering with Hospitality by Workwise.
              Our team will reach out to you shortly.
            </p>
            <button
              type="button"
              className={styles.btnReset}
              onClick={handleReset}
            >
              Register Another Vendor
            </button>
          </div>
        ) : (
          /* ── Registration Form ── */
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form noValidate>
                {/* Vendor Name */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Vendor Name<span className={styles.formRequired}>*</span>
                  </label>
                  <Field
                    name="vendorName"
                    type="text"
                    placeholder="Enter your full name"
                    className={`${styles.formInput} ${errors.vendorName && touched.vendorName ? styles.hasError : ''}`}
                  />
                  <ErrorMessage name="vendorName" component="div" className={styles.formError} />
                </div>

                {/* Email Address */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Email Address<span className={styles.formRequired}>*</span>
                  </label>
                  <Field
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    className={`${styles.formInput} ${errors.email && touched.email ? styles.hasError : ''}`}
                  />
                  <ErrorMessage name="email" component="div" className={styles.formError} />
                </div>

                {/* Phone Number */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Phone Number<span className={styles.formRequired}>*</span>
                  </label>
                  <div className={styles.phoneWrap}>
                    <span className={styles.phonePrefix}>+91</span>
                    <Field
                      name="phone"
                      type="text"
                      placeholder="XXXXX XXXXX"
                      className={`${styles.formInput} ${styles.phoneInput} ${errors.phone && touched.phone ? styles.hasError : ''}`}
                    />
                  </div>
                  <ErrorMessage name="phone" component="div" className={styles.formError} />
                </div>

                {/* Company Name */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Company Name<span className={styles.formRequired}>*</span>
                  </label>
                  <Field
                    name="companyName"
                    type="text"
                    placeholder="Enter your company name"
                    className={`${styles.formInput} ${errors.companyName && touched.companyName ? styles.hasError : ''}`}
                  />
                  <ErrorMessage name="companyName" component="div" className={styles.formError} />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <span className={styles.btnSpinner} />}
                  {isSubmitting ? 'Registering...' : 'Register'}
                </button>
              </Form>
            )}
          </Formik>
        )}
      </div>

      {/* Footer */}
      <p className={styles.footerText}>Hospitality by Workwise 2026</p>
    </div>
  );
};

export default VendorRegistrationForm;
