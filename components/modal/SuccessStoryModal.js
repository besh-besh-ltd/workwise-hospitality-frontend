import React from 'react';
import { 
  X, 
  MessageCircle, 
  AlertTriangle, 
  Wrench, 
  TrendingUp 
} from 'lucide-react';

const SuccessStoryModal = ({ show, onClose, story, onBookCall }) => {
  if (!show || !story) return null;

  return (
    <>
      {/* Bootstrap Modal Backdrop */}
      <div className="modal-backdrop fade show"></div>
      
      {/* Bootstrap Modal */}
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header border-0 pb-0">
              <div className="d-flex align-items-center justify-content-between w-100">
                <h5 className="modal-title fw-semibold text-dark fs-5 mb-0">Success Story Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                  style={{ 
                    backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e\")",
                    backgroundSize: "16px",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    width: "16px",
                    height: "16px",
                    border: "none",
                    backgroundColor: "transparent",
                    padding: "0",
                    margin: "0"
                  }}
                ></button>
              </div>
            </div>
            
            {/* Body */}
            <div className="modal-body px-5 py-4">
              {/* Main Topic */}
              <h2 className="fw-semibold text-dark mb-4 fs-5">
                {story.industry} - Equipment Procurement
              </h2>

              {/* Role/Location */}
              <div className="d-flex align-items-center mb-5">
                <MessageCircle className="text-primary me-3" size={18} />
                <span className="text-primary fw-medium">
                  Procurement Manager, {story.industry}, {story.location}
                </span>
              </div>

              {/* The Challenge */}
              <div className="mb-5">
                <div className="d-flex align-items-center mb-3">
                  <AlertTriangle className="text-warning me-3" size={18} />
                  <h3 className="fw-semibold text-dark mb-0 fs-6">The Challenge:</h3>
                </div>
                <p className="text-muted mb-0 lh-base ps-5">
                  {story.challenge || "Finding specialized equipment vendors for rolling mill components was taking weeks with limited industry connections."}
                </p>
              </div>

              {/* What We Did */}
              <div className="mb-5">
                <div className="d-flex align-items-center mb-3">
                  <Wrench className="text-secondary me-3" size={18} />
                  <h3 className="fw-semibold text-dark mb-0 fs-6">What We Did:</h3>
                </div>
                <p className="text-muted mb-0 lh-base ps-5">
                  {story.solution || "Leveraged Workwise's extensive vendor network and industry-specific search filters to identify qualified suppliers quickly."}
                </p>
              </div>

              {/* The Outcome */}
              <div className="mb-5">
                <div className="d-flex align-items-center mb-3">
                  <TrendingUp className="text-success me-3" size={18} />
                  <h3 className="fw-semibold text-dark mb-0 fs-6">The Outcome:</h3>
                </div>
                <p className="text-muted mb-0 lh-base ps-5">
                  {story.outcome || "Reduced vendor discovery time by 15 days, connected with 8 specialized suppliers, improved equipment quality by 25%."}
                </p>
              </div>

              {/* Testimonial */}
              <div className="mb-5">
                <div className="border-start border-warning border-4 ps-4">
                  <p className="text-muted fst-italic mb-0">
                    "{story.testimonial || "Workwise opened up a whole new network of reliable vendors we never knew existed."}"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 pt-0" style={{ backgroundColor: '#e3f2fd' }}>
              <div className="w-100">
                <div className="text-center mb-4">
                  <a href="#" className="text-primary text-decoration-none fw-medium">
                    Need help with vendor discovery? → Try Our Tool
                  </a>
                </div>
                <button
                  onClick={onBookCall}
                  className="btn w-100 py-3 fw-semibold text-white"
                  style={{ 
                    backgroundColor: '#fd7e14',
                    borderColor: '#fd7e14'
                  }}
                >
                  Book a Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuccessStoryModal; 