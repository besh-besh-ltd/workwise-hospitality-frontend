import React, { useState } from 'react';

const BroadcastModal = ({ 
  show, 
  onHide, 
  onSendMessage, 
  vendorCount, 
  loading, 
  rfqNumber 
}) => {
  const [messageText, setMessageText] = useState('');
  const [errors, setErrors] = useState({});

  const validateMessage = () => {
    const newErrors = {};
    
    if (!messageText.trim()) {
      newErrors.message = 'Message text is required';
    } else if (messageText.trim().length < 5) {
      newErrors.message = 'Message must be at least 5 characters long';
    } else if (messageText.trim().length > 1000) {
      newErrors.message = 'Message must be less than 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateMessage()) {
      return;
    }
    
    onSendMessage(messageText.trim());
    // Clear form and close modal after sending
    setMessageText('');
    setErrors({});
  };

  const handleClose = () => {
    if (!loading) {
      setMessageText('');
      setErrors({});
      onHide();
    }
  };

  // Quick message templates
  const quickMessages = [
    "Please update your quotation by EOD.",
    "Kindly provide the delivery timeline for your quotation.",
    "Please clarify the warranty terms in your proposal.",
    "Requesting revised pricing for the items in your quotation.",
    "Please confirm your availability for the project timeline."
  ];

  const handleQuickMessage = (message) => {
    setMessageText(message);
    setErrors({});
  };

  if (!show) return null;

  return (
    <div
  className="modal fade show d-block"
  tabIndex="-1"
  style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
>
  <div className="modal-dialog modal-lg">
    <div className="modal-content">
      <div className="modal-header p-3">
        <h5 className="modal-title">
          <i className="fas fa-broadcast-tower me-2"></i>
          Send Broadcast Message
        </h5>
        <button
          type="button"
          className="btn-close"
          onClick={handleClose}
          disabled={loading}
        ></button>
      </div>

      <div className="modal-body p-4">
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>
          This message will be sent to <strong>{vendorCount}</strong> vendor(s) for RFQ #{rfqNumber}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="messageText" className="form-label">
              Message Text <span className="text-danger">*</span>
            </label>
            <textarea
              id="messageText"
              className={`form-control ${errors.message ? "is-invalid" : ""}`}
              rows="4"
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (errors.message) {
                  setErrors({ ...errors, message: null });
                }
              }}
              placeholder="Enter your message here..."
              disabled={loading}
              maxLength="1000"
            />
            {errors.message && (
              <div className="invalid-feedback">{errors.message}</div>
            )}
            <div className="form-text">
              {messageText.length}/1000 characters
            </div>
          </div>

          {/* Quick Message Templates */}
          <div className="mb-3">
            <label className="form-label">Quick Message Templates:</label>
            <div className="list-group">
              {quickMessages.map((message, index) => (
                <button
                  key={index}
                  type="button"
                  className="list-group-item list-group-item-action"
                  onClick={() => handleQuickMessage(message)}
                  disabled={loading}
                >
                  {message}
                </button>
              ))}
            </div>
            <small className="text-muted">
              Click on any template to use it as your message
            </small>
          </div>
        </form>
      </div>

      <div className="modal-footer p-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !messageText.trim()}
          style = {{"minWidth" : "240px"}}
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
              ></span>
              Sending...
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane me-2"></i>
              Send to {vendorCount} Vendor(s)
            </>
          )}
        </button>
      </div>
    </div>
  </div>
</div>

  );
};

export default BroadcastModal;