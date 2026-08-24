import React, { useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { contactUsFormService } from '@/services/contact';
import {
  executeRecaptcha,
  isRecaptchaConfigured,
  loadRecaptchaScript,
  unloadRecaptchaScript,
} from '@/utils/recaptcha';
import { PAPER, INK, INK_3, RULE, GOLD, GOLD_DEEP, TERRACOTTA, SANS, BP } from './theme';

const RECAPTCHA_ACTION = 'book_demo_form';

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
  useEffect(() => {
    if (!isRecaptchaConfigured) return undefined;
    loadRecaptchaScript().catch(() => {});
    return () => unloadRecaptchaScript();
  }, []);

  // Posts to /cms/contact-us — the same endpoint the site's contact form has
  // used in production. Chosen over /cms/register-interest, which exists in
  // services/contact.js but has never had a single caller, so its payload
  // contract is unverified.
  //
  // This form previously console.log'd and discarded every submission.
  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    try {
      let recaptchaToken;
      if (isRecaptchaConfigured) {
        // Best-effort: a reCAPTCHA failure must not cost us the lead.
        recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTION).catch(() => undefined);
      }

      const comment = [
        `Company: ${values.companyName}`,
        `Interested in: ${values.interest}`,
        values.message ? `Message: ${values.message}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await contactUsFormService({
        name: values.fullName,
        email: values.email,
        phone: `${values.countryCode}${values.phone}`,
        subject: `Demo request — ${values.interest}`,
        comment,
        submitted_from: 'landing_book_demo',
        ...(recaptchaToken ? { recaptchaToken } : {}),
      });

      toast.success(response?.message || "Thanks! We'll be in touch shortly.", {
        position: 'top-center',
      });
      resetForm();
      if (onClose) setTimeout(onClose, 600);
    } catch (error) {
      const raw = error?.message?.response?.data?.message || error?.response?.data?.message || error?.message;
      toast.error(typeof raw === 'string' ? raw : 'Could not send your request. Please try again.', {
        position: 'top-center',
      });
    } finally {
      setSubmitting(false);
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
              <label htmlFor="fullName">Full name</label>
              <Field id="fullName" name="fullName" type="text" placeholder="Ex. Manoj Kumar" />
              {touched.fullName && errors.fullName && <span className="lh-demo-error">{errors.fullName}</span>}
            </div>
            <div className="lh-demo-field">
              <label htmlFor="email">Work email</label>
              <Field id="email" name="email" type="email" placeholder="example@company.com" />
              {touched.email && errors.email && <span className="lh-demo-error">{errors.email}</span>}
            </div>
          </div>

          <div className="lh-demo-row">
            <div className="lh-demo-field">
              <label htmlFor="phone">Phone number</label>
              <div className="lh-demo-phone">
                <Field as="select" name="countryCode" className="lh-demo-code" aria-label="Country code">
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
              <label htmlFor="companyName">Company</label>
              <Field id="companyName" name="companyName" type="text" placeholder="Your company name" />
              {touched.companyName && errors.companyName && (
                <span className="lh-demo-error">{errors.companyName}</span>
              )}
            </div>
          </div>

          <div className="lh-demo-field">
            <label htmlFor="interest">I&apos;m interested in</label>
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
            <label htmlFor="message">Anything specific? (optional)</label>
            <Field
              as="textarea"
              id="message"
              name="message"
              rows={3}
              placeholder="Tell us about your properties and what you buy most."
            />
          </div>

          <button type="submit" className="lh-demo-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : content.submitLabel}
          </button>

          <style jsx>{`
            /* :global() is required, and must stay its own rule. This class
               sits on Formik's <Form>, a child component, so styled-jsx never
               stamps its scope hash onto the element — the plain .lh-demo-form
               selector matched nothing and the form fell back to display:block
               with no gap at all. Do not comma-join it with a scoped selector
               either; styled-jsx drops the :global() half of a mixed list. */
            :global(.lh-demo-form) {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .lh-demo-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .lh-demo-field {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .lh-demo-field label {
              display: block;
              margin: 0;
              font-family: ${SANS};
              font-size: 0.72rem;
              font-weight: 500;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: ${INK_3};
            }
            .lh-demo-field :global(input),
            .lh-demo-field :global(select),
            .lh-demo-field :global(textarea) {
              display: block;
              margin: 0;
              box-sizing: border-box;
              background: ${PAPER};
              border: 1px solid ${RULE};
              border-radius: 2px;
              padding: 12px 14px;
              font-family: ${SANS};
              font-size: 0.92rem;
              color: ${INK};
              width: 100%;
              line-height: 1.4;
              transition: border-color 0.2s ease;
            }
            .lh-demo-field :global(input:focus),
            .lh-demo-field :global(select:focus),
            .lh-demo-field :global(textarea:focus) {
              outline: none;
              border-color: ${GOLD_DEEP};
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
              flex: 0 0 108px;
              width: 108px;
              min-width: 0;
              padding-left: 10px;
              padding-right: 4px;
            }
            .lh-demo-phone :global(input) {
              flex: 1 1 0%;
              min-width: 0;
              width: auto;
            }
            .lh-demo-error {
              font-family: ${SANS};
              color: ${TERRACOTTA};
              font-size: 0.76rem;
            }
            .lh-demo-submit {
              font-family: ${SANS};
              background: ${GOLD};
              color: ${PAPER};
              border: none;
              border-radius: 2px;
              padding: 11px 26px;
              font-weight: 500;
              font-size: 0.88rem;
              cursor: pointer;
              align-self: flex-start;
              /* Sits on top of the form's 20px gap, which only started applying
                 once the :global() fix above landed. */
              margin-top: 4px;
              transition: background 0.25s ease;
            }
            .lh-demo-submit:hover:not(:disabled) {
              background: ${GOLD_DEEP};
            }
            .lh-demo-submit:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }

            @media (max-width: ${BP.sm}) {
              .lh-demo-row {
                grid-template-columns: 1fr;
              }
              .lh-demo-submit {
                width: 100%;
                align-self: stretch;
              }
            }
          `}</style>
        </Form>
      )}
    </Formik>
  );
};

export default BookDemoForm;
