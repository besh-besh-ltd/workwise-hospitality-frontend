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
      
      {/* Custom CSS for responsive modal */}
      <style jsx>{`
        @media (max-width: 767px) {
          .modal-dialog {
            max-width: 90vw !important;
            margin: 0.5rem auto !important;
          }
          
          .modal-content {
            font-size: 11px !important;
          }
          
          .modal-title {
            font-size: 13px !important;
          }
          
          .modal-body {
            padding: 0.5rem !important;
          }
          
          .modal-footer {
            padding: 0.5rem !important;
          }
        }
        
        @media (min-width: 768px) {
          .modal-dialog {
            max-width: 500px !important;
            margin: 1.5rem auto !important;
          }
        }
        
        /* Ensure modal content is properly sized */
        .modal-content {
          max-height: 85vh !important;
          overflow-y: auto !important;
        }
        
        /* Smooth transitions */
        .modal-dialog {
          transition: all 0.3s ease !important;
        }
      `}</style>
      
      {/* Bootstrap Modal */}
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-sm modal-dialog-centered" role="document" style={{
          maxWidth: '85vw',
          width: '100%',
          margin: '1rem auto'
        }}>
          <div className="modal-content" style={{ borderRadius: '10px' }}>
            {/* Header */}
            <div className="modal-header border-0 pb-0 px-3 px-md-3 pt-3">
              <div className="d-flex align-items-center justify-content-between w-100">
                <h5 className="modal-title fw-semibold text-dark fs-7 mb-0">Success Story Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={onClose}
                  style={{ 
                    border: "none",
                    backgroundColor: "transparent",
                    padding: "4px",
                    margin: "0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f0f0f0"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                >
                  <X size={16} color="#000" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="modal-body px-2 px-md-3 py-1">
              {/* Main Topic */}
              <h4 className="fw-semibold text-dark mb-2 mb-md-2 fs-7">
                {story.industry} - Equipment Procurement
              </h4>

              {/* Role/Location */}
              <div className="d-flex align-items-center mb-2 mb-md-2">
                <MessageCircle className="text-primary me-2" size={14} />
                <span className="text-primary fw-medium fs-8">
                  Procurement Manager, {story.industry}, {story.location}
                </span>
              </div>

              {/* The Challenge */}
              <div className="mb-2 mb-md-2">
                <div className="d-flex align-items-center mb-1 mb-md-1">
                  <AlertTriangle className="text-warning me-2" size={14} />
                  <h5 className="fw-semibold text-dark mb-0 fs-8">The Challenge:</h5>
                </div>
                <p className="text-muted mb-0 lh-base ps-2 ps-md-3 fs-8">
                  {story.challenge || "Finding specialized equipment vendors for rolling mill components was taking weeks with limited industry connections."}
                </p>
              </div>

              {/* What We Did */}
              <div className="mb-2 mb-md-2">
                <div className="d-flex align-items-center mb-1 mb-md-1">
                  <Wrench className="text-secondary me-2" size={14} />
                  <h5 className="fw-semibold text-dark mb-0 fs-8">What We Did:</h5>
                </div>
                <p className="text-muted mb-0 lh-base ps-2 ps-md-3 fs-8">
                  {story.solution || "Leveraged Workwise's extensive vendor network and industry-specific search filters to identify qualified suppliers quickly."}
                </p>
              </div>

              {/* The Outcome */}
              <div className="mb-2 mb-md-2">
                <div className="d-flex align-items-center mb-1 mb-md-1">
                  <TrendingUp className="text-success me-2" size={14} />
                  <h5 className="fw-semibold text-dark mb-0 fs-8">The Outcome:</h5>
                </div>
                <p className="text-muted mb-0 lh-base ps-2 ps-md-3 fs-8">
                  {story.outcome || "Reduced vendor discovery time by 15 days, connected with 8 specialized suppliers, improved equipment quality by 25%."}
                </p>
              </div>

              {/* Testimonial */}
              <div className="mb-2 mb-md-3">
                <div className="border-start border-warning border-2 ps-2 ps-md-2">
                  <p className="text-muted fst-italic mb-0 fs-8">
                    "{story.testimonial || "Workwise opened up a whole new network of reliable vendors we never knew existed."}"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 pt-0 px-2 px-md-3 pb-2" style={{ backgroundColor: '#e3f2fd' }}>
              <div className="w-100">
                <div className="text-center mb-2 mb-md-2">
                  <a href="#" className="text-primary text-decoration-none fw-medium fs-8">
                    Need help with vendor discovery? → Try Our Tool
                  </a>
                </div>
                <button
                  onClick={onBookCall}
                  className="btn w-100 py-1 fw-semibold text-white"
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