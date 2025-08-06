import React from 'react';
import { Download, Eye, Lock } from 'lucide-react';

const FilePreview = ({ 
  title, 
  description, 
  image = "/assets/images/placeholder.jpeg",
  downloadText = "Download (with watermark)",
  onDownload,
  onView,
  showPreview = true
}) => {
  return (
    <div className="bg-light rounded-4 p-4 h-100">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <h6 className="fw-bold mb-0">{title}</h6>
        <div className="d-flex align-items-center text-muted small">
          <Lock size={14} className="me-1" />
          Preview
        </div>
      </div>
      
      <div className="rounded overflow-hidden mb-3">
        <img
          src={image}
          alt={title}
          className="img-fluid"
          style={{ 
            filter: "blur(3px)",
            maxHeight: "200px",
            width: "100%",
            objectFit: "cover"
          }}
        />
      </div>
      
      <p className="text-muted small mb-3">{description}</p>
      
      {showPreview && (
        <div className="d-flex gap-2">
          <button
            onClick={onView}
            className="btn btn-outline-primary btn-sm flex-fill"
          >
            <Eye size={14} className="me-1" />
            View Preview
          </button>
          <button
            onClick={onDownload}
            className="btn btn-primary btn-sm flex-fill"
          >
            <Download size={14} className="me-1" />
            {downloadText}
          </button>
        </div>
      )}
    </div>
  );
};

export default FilePreview; 