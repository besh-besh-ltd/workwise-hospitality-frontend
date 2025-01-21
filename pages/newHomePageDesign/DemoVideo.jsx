import React, { useEffect, useRef, useState } from "react";

export default function DemoVideo({ type, title, videoLink, openVideo, handleToggleVideo }) {
  const videoRef = useRef(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (openVideo[type]) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [openVideo, type]);

  useEffect(() => {
    const videoElement = videoRef.current;

    const handleTimeUpdate = () => {
      if (videoElement) {
        const currentTime = videoElement.currentTime;
        const duration = videoElement.duration;

        // Show button if current time is within 10 seconds of the end
        if (duration && duration - currentTime <= 10 && currentTime > 0) {
          setShowButton(true);
        } else {
          setShowButton(false);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setShowButton(false);
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  return (
    <>
      <div
        id={`${type}_section`}
        className="container-fluid py-5"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <div className="container">
          <div className="row align-items-stretch">
            {/* Heading */}
            <div className="col-md-12 col-lg-5 mb-4 d-flex align-items-center">
              <h2 className="text-center w-100 my-auto">
                {title}
              </h2>
            </div>

            {/* Video Teaser Section */}
            <div className="col-md-12 col-lg-7 mb-4">
              <div
                className="d-flex flex-column p-4 h-100"
                style={{
                  border: "1px solid #dee2e6",
                  borderRadius: "12px",
                  backgroundColor: "#f1f3f5",
                  minHeight: "60vh"
                }}
              >
                {/* Autoplay Video */}
                <div className="flex-grow-1 mb-4">
                  <video
                    ref={videoRef}
                    style={{
                      height: "100%",
                      width: "100%",
                      maxWidth: "500px",
                      objectFit: "cover",
                      margin: "0 auto",
                      display: "block"
                    }}
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/videos/Motion Graphic_3840x2160.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Button for Full Video */}
                {showButton && (
                  <button
                    className="btn btn-primary mx-auto"
                    style={{
                      width: "100%",
                      maxWidth: "400px"
                    }}
                    onClick={handleToggleVideo}
                  >
                    Click here to view full video
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {openVideo[type] && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 1050
          }}
        >
          <button
            onClick={handleToggleVideo}
            className="btn-close btn-close-white position-absolute"
            aria-label="Close"
            style={{
              top: "20px",
              right: "20px",
              zIndex: 1051
            }}
          />

          <div style={{ width: "90%", height: "85%" }}>
            <iframe
              className="w-100 h-100"
              src={`${videoLink}${openVideo[type] ? '?autoplay=1' : ''}`}
              title="Video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}