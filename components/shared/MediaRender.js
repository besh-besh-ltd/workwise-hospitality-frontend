const MediaRender = ({ fileUrl, fileName, fileType, className = "" }) => {
  const getMediaType = () => {
    if (fileType === "product_image" || fileType === "certification" || fileType === "payment_terms") {
      // Some certifications/payment terms are images (jpg/png), others could be pdfs
      const extension = fileUrl.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image";
      if (["pdf"].includes(extension)) return "document";
      return "document";
    }
    if (fileType === "product_video") return "video";

    // fallback: guess by extension
    const extension = fileUrl.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image";
    if (["mp4", "webm", "ogg", "mov"].includes(extension)) return "video";
    if (["pdf"].includes(extension)) return "document";
    return "unknown";
  };

  const mediaType = getMediaType();

  const renderMedia = () => {
    switch (mediaType) {
      case "image":
        return (
          <div className="position-relative">
            <img
              src={fileUrl}
              className="img-fluid rounded shadow-sm"
              alt={fileName}
              style={{ maxHeight: "220px", objectFit: "cover", width: "100%" }}
            />
          </div>
        );

      case "video":
        return (
          <div className="position-relative bg-dark rounded">
            <video
              className="w-100 rounded"
              controls
              style={{ maxHeight: "220px", objectFit: "cover" }}
            >
              <source src={fileUrl} type={`video/${fileUrl.split(".").pop()}`} />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case "document":
      default:
        return (
          <div
            className="d-flex flex-column align-items-center justify-content-center bg-light rounded p-4"
            style={{ height: "220px" }}
          >
            <i className="bi bi-file-earmark-text display-5 text-secondary mb-2"></i>
            <p className="text-muted small text-center text-truncate" style={{ maxWidth: "180px" }}>
              {fileName}
            </p>
          </div>
        );
    }
  };

  return (
 <>
  <a
    href={fileUrl}
    target="_blank"
    rel="noopener noreferrer"
    download
    className={`text-decoration-none text-reset position-relative d-block media-renderer ${className}`}
    style={{ cursor: "pointer" }}
  >
    <div className="position-relative overflow-hidden rounded">
      {renderMedia()}

      {/* Hover Overlay */}
      <div className="media-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-white fw-semibold">
        <span className="p-2 bg-dark bg-opacity-75 rounded">
          <i className="bi bi-eye me-2"></i> Click to View / Download
        </span>
      </div>
    </div>

    <div className="d-flex align-items-center mt-3 px-1">
      <div className="flex-grow-1">
        <small
          className="text-muted text-truncate d-block"
          style={{ maxWidth: "100%" }}
          title={fileName}
        >
          <i className="bi bi-file-earmark me-1"></i>
          {fileName}
        </small>
      </div>
    </div>
  </a>

  <style jsx>{`
    .media-overlay {
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      background: rgba(0, 0, 0, 0.5); /* subtle dark overlay */
    }
    .media-renderer:hover .media-overlay {
      opacity: 1;
    }
  `}</style>
</>

  );
};

export default MediaRender;
