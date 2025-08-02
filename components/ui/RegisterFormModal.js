import React, { useState } from 'react';

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
  const [formData, setFormData] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize form data based on fields
  React.useEffect(() => {
    const initialData = {};
    fields.forEach(field => {
      initialData[field.name] = field.type === 'checkbox' ? false : '';
    });
    setFormData(initialData);
  }, [fields]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (onSubmit) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
        return;
      }
    }
    
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
      // Reset form data
      const initialData = {};
      fields.forEach(field => {
        initialData[field.name] = field.type === 'checkbox' ? false : '';
      });
      setFormData(initialData);
    }, 2000);
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
              <form onSubmit={handleSubmit}>
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

                {/* Dynamic Form Fields */}
                {fields.map((field, index) => (
                  <div key={field.name} className={index === fields.length - 1 ? 'mb-4' : 'mb-3'}>
                    <label className="form-label fw-medium text-dark mb-2">
                      {field.label} {field.required && <span className="text-danger">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="form-control"
                        required={field.required}
                        rows={field.rows || 3}
                        placeholder={field.placeholder}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          resize: 'vertical'
                        }}
                      />
                    ) : field.type === 'checkbox' ? (
                      <div className="form-check">
                        <input
                          type="checkbox"
                          name={field.name}
                          checked={formData[field.name] || false}
                          onChange={handleInputChange}
                          className="form-check-input"
                          id={field.name}
                          style={{ marginTop: '0.2rem' }}
                        />
                        <label className="form-check-label text-dark" htmlFor={field.name} style={{ fontSize: '0.9rem' }}>
                          {field.label}
                        </label>
                      </div>
                    ) : field.type === 'select' ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="form-control"
                        required={field.required}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="">{field.placeholder || 'Select an option'}</option>
                        {field.options?.map(option => (
                          <option key={option.value || option} value={option.value || option}>
                            {option.label || option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        className="form-control"
                        required={field.required}
                        placeholder={field.placeholder}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      />
                    )}
                  </div>
                ))}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn w-100 fw-semibold"
                  style={{
                    backgroundColor: '#0d6efd',
                    borderColor: '#0d6efd',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  {fields.find(f => f.type === 'checkbox') ? 'Register Interest' : 'Submit'}
                </button>
              </form>
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