import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { NAVY, GOLD } from './theme';

const validationSchema = yup.object().shape({
  fullName: yup
    .string()
    .min(2, 'Name is too short')
    .max(60, 'Name is too long')
    .required('Full name is required'),
  email: yup.string().email('Enter a valid email address').required('Email is required'),
  phone: yup
    .string()
    .matches(/^[0-9]{7,12}$/, 'Enter a valid phone number')
    .required('Phone number is required'),
  companyName: yup.string().required('Company name is required'),
  interest: yup.string().required('Please select an option'),
  message: yup.string().optional(),
});

const BookDemoForm = ({ content, onClose }) => {
  const handleSubmit = (values, { resetForm, setSubmitting }) => {
    // UI-only stub for now — no backend endpoint exists yet for this field set
    // (company name / interest). Wire a real service call here later.
    // eslint-disable-next-line no-console
    console.log('Book demo form submitted (stub):', values);
    toast.success("Thanks! We'll get back to you shortly.", { position: 'top-center' });
    setSubmitting(false);
    resetForm();
    if (onClose) {
      setTimeout(onClose, 600);
    }
  };

  return (
    <Formik
      initialValues={{
        fullName: '',
        email: '',
        countryCode: content.defaultCountryCode,
        phone: '',
        companyName: '',
        interest: '',
        message: '',
      }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched, isSubmitting }) => (
        <Form className="lh-demo-form">
          <div className="lh-demo-row">
            <div className="lh-demo-field">
              <label htmlFor="fullName">Full Name *</label>
              <Field id="fullName" name="fullName" type="text" placeholder="Ex. Manoj Kumar" />
              {touched.fullName && errors.fullName && <span className="lh-demo-error">{errors.fullName}</span>}
            </div>
            <div className="lh-demo-field">
              <label htmlFor="email">Email Address *</label>
              <Field id="email" name="email" type="email" placeholder="example@company.com" />
              {touched.email && errors.email && <span className="lh-demo-error">{errors.email}</span>}
            </div>
          </div>

          <div className="lh-demo-row">
            <div className="lh-demo-field">
              <label htmlFor="phone">Phone Number *</label>
              <div className="lh-demo-phone">
                <Field as="select" name="countryCode" className="lh-demo-code">
                  {content.countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Field>
                <Field id="phone" name="phone" type="tel" placeholder="9123456789" />
              </div>
              {touched.phone && errors.phone && <span className="lh-demo-error">{errors.phone}</span>}
            </div>
            <div className="lh-demo-field">
              <label htmlFor="companyName">Company Name *</label>
              <Field id="companyName" name="companyName" type="text" placeholder="Your Company Name" />
              {touched.companyName && errors.companyName && (
                <span className="lh-demo-error">{errors.companyName}</span>
              )}
            </div>
          </div>

          <div className="lh-demo-field">
            <label htmlFor="interest">I&apos;m interested in *</label>
            <Field as="select" id="interest" name="interest">
              <option value="">Select your interest</option>
              {content.interestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Field>
            {touched.interest && errors.interest && <span className="lh-demo-error">{errors.interest}</span>}
          </div>

          <div className="lh-demo-field">
            <label htmlFor="message">Message</label>
            <Field
              as="textarea"
              id="message"
              name="message"
              rows={4}
              placeholder="Tell us more about your requirements..."
            />
          </div>

          <button type="submit" className="lh-demo-submit lh-demo-submit-spaced" disabled={isSubmitting}>
            {content.submitLabel}
          </button>

          <style jsx>{`
            .lh-demo-form {
              display: flex;
              flex-direction: column;
              gap: 26px;
            }
            .lh-demo-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 26px;
            }
            .lh-demo-field {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .lh-demo-field label {
              display: block;
              margin: 0;
              font-weight: 600;
              font-size: 0.85rem;
              color: var(--dark-color);
            }
            .lh-demo-field :global(input),
            .lh-demo-field :global(select),
            .lh-demo-field :global(textarea) {
              display: block;
              margin: 0;
              box-sizing: border-box;
              border: 1px solid var(--border-color, #d3d3d3);
              border-radius: 10px;
              padding: 11px 14px;
              font-size: 0.92rem;
              width: 100%;
              font-family: inherit;
              line-height: 1.4;
            }
            .lh-demo-field :global(textarea) {
              resize: vertical;
            }
            .lh-demo-phone {
              display: flex;
              align-items: stretch;
              gap: 8px;
            }
            .lh-demo-phone :global(select.lh-demo-code) {
              flex: 0 0 110px;
              width: 110px;
              min-width: 0;
              padding-left: 8px;
              padding-right: 4px;
            }
            .lh-demo-phone :global(input) {
              flex: 1 1 0%;
              min-width: 0;
              width: auto;
            }
            .lh-demo-error {
              color: var(--red-color);
              font-size: 0.78rem;
            }
            .lh-demo-submit {
              background: ${GOLD};
              color: ${NAVY};
              border: none;
              border-radius: 999px;
              padding: 13px 28px;
              font-weight: 700;
              font-size: 0.95rem;
              cursor: pointer;
              align-self: flex-start;
            }
            .lh-demo-submit:disabled {
              opacity: 0.7;
              cursor: not-allowed;
            }
            .lh-demo-submit-spaced {
              margin-top: 10px;
            }

            @media (max-width: 576px) {
              .lh-demo-row {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
        </Form>
      )}
    </Formik>
  );
};

export default BookDemoForm;
