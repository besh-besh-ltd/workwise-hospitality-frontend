import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import CommonFormInput from '@/components/shared/CommonFormInput';

const RegisterFormModal = React.forwardRef(({ 
  show, 
  onClose, 
  title = "Register Your Interest",
  subtitle,
  fields = [],
  onSubmit,
  successMessage = "Thanks! You'll hear from our team soon.",
  className = "",
  ...props 
}, ref) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Create initial values and validation schema based on fields
  const getInitialValues = () => {
    const initialValues = {};
    fields.forEach(field => {
      initialValues[field.name] = field.type === 'checkbox' ? false : '';
    });
    return initialValues;
  };

  const getValidationSchema = () => {
    const validationFields = {};
    fields.forEach(field => {
      if (field.required) {
        if (field.type === 'email') {
          validationFields[field.name] = Yup.string().email('Invalid email format').required('This field is required');
        } else if (field.type === 'checkbox') {
          validationFields[field.name] = Yup.boolean().oneOf([true], 'This field is required');
        } else {
          validationFields[field.name] = Yup.string().required('This field is required');
        }
      }
    });
    return Yup.object().shape(validationFields);
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (onSubmit) {
        await onSubmit(values);
      }
      
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div 
      className={`modal show d-block ${className}`} 
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1050
      }}
      ref={ref}
      {...props}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
        <div className="modal-content border-0 shadow">
          {/* Header */}
          <div className="modal-header border-0 pb-0" style={{ padding: '24px 24px 0 24px' }}>
            <div className="d-flex align-items-center justify-content-between w-100">
              <h5 className="modal-title fw-bold text-dark" style={{ fontSize: '1.25rem' }}>
                {title}
              </h5>
              <button
                onClick={onClose}
                className="btn-close-custom"
                style={{
                  width: '24px',
                  height: '24px',
                  border: 'none',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e")`,
                  backgroundSize: '16px',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              />
            </div>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '20px 24px 24px 24px' }}>
            {!isSubmitted ? (
              <Formik
                initialValues={getInitialValues()}
                validationSchema={getValidationSchema()}
                onSubmit={handleSubmit}
              >
                {({ values, errors, touched, isSubmitting }) => (
                  <Form>
                    {/* Subtitle */}
                    {subtitle && (
                      <div className="mb-4">
                        <div className="d-flex align-items-center mb-2">
                          <span className="fw-semibold text-dark" style={{ fontSize: '1rem' }}>
                            {subtitle}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Form Fields using CommonFormInput */}
                    {fields.map((field, index) => {
                      // Handle checkbox fields separately as CommonFormInput doesn't support them
                      if (field.type === 'checkbox') {
                        return (
                          <div key={field.name} className={index === fields.length - 1 ? 'mb-4' : 'mb-3'}>
                            <div className="form-check">
                              <Field
                                type="checkbox"
                                name={field.name}
                                className="form-check-input"
                                id={field.name}
                                style={{ marginTop: '0.2rem' }}
                              />
                              <label className="form-check-label text-dark" htmlFor={field.name} style={{ fontSize: '0.9rem' }}>
                                {field.label}
                              </label>
                              {errors[field.name] && touched[field.name] && (
                                <div className="invalid-feedback d-block">{errors[field.name]}</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Map field types to CommonFormInput types
                      const getInputType = (fieldType) => {
                        switch (fieldType) {
                          case 'textarea':
                            return 'textarea';
                          case 'select':
                            return 'select';
                          case 'email':
                            return 'email';
                          case 'password':
                            return 'password';
                          case 'number':
                            return 'number';
                          default:
                            return 'simple-text';
                        }
                      };

                      return (
                        <div key={field.name} className={index === fields.length - 1 ? 'mb-4' : 'mb-3'}>
                          <CommonFormInput
                            name={field.name}
                            label={field.label}
                            type={getInputType(field.type)}
                            required={field.required}
                            placeholder={field.placeholder}
                            options={field.options}
                            values={values[field.name]}
                            touched={touched}
                            errors={errors}
                            className=""
                          />
                        </div>
                      );
                    })}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn w-100 fw-semibold"
                      disabled={isSubmitting}
                      style={{
                        backgroundColor: '#0056b3',
                        borderColor: '#0056b3',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}
                    >
                      {isSubmitting ? 'Submitting...' : (fields.find(f => f.type === 'checkbox') ? 'Register Interest' : 'Submit')}
                    </button>
                  </Form>
                )}
              </Formik>
            ) : (
              /* Success Message */
              <div className="text-center py-4">
                <div className="mb-3">
                  <div 
                    className="rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#d4edda',
                      color: '#155724'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>✓</span>
                  </div>
                </div>
                <h6 className="fw-bold text-dark mb-2">Thanks!</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  {successMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

RegisterFormModal.displayName = "RegisterFormModal";

export { RegisterFormModal }; 