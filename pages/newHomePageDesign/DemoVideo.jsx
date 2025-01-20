import React, { useState } from "react";

export default function DemoVideo({ title, videoLink }) {
  const [openVideo, setOpenVideo] = useState(false);

  return (
    <>
      <div
        id="portal_teaser"
        className="container-fluid py-5 vh-75"
        style={{ backgroundColor: "#f8f9fa", padding: "20px" }}
      >
        <div className="container">
          <div className="row">

            {/* Heading */}
            <div className="col-md-12 col-lg-5 d-flex mb-4">
              <h2 className="my-auto text-center" style={{ marginBottom: "20px" }}>
                {title}
              </h2>
            </div>

            {/* Video Teaser Section */}
            <div className="col-md-12 col-lg-7 mb-4">
              <div
                className="d-flex flex-column p-4"
                style={{
                  border: "1px solid grey",
                  height: "60vh",
                  borderRadius: "15px",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#e9ecef",
                }}
              >
                {/* Autoplay Video */}
                <div className="h-100">
                  <video
                    style={{
                      height: "100%",
                      width: "100%",
                      maxWidth: "500px",
                      objectFit: "cover",
                    }}
                    autoPlay
                    loop
                    muted
                  >
                    <source src="/teaser-video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Button for Full Video */}
                <button
                  className="btn btn-primary mx-auto"
                  style={{ width: "100%", maxWidth: "400px" }}
                  onClick={() => {
                    setOpenVideo(true);
                  }}
                >
                  Click here to view portal full video
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openVideo && (
        <div
          className="video-section"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            opacity: '1',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <button
            onClick={() => setOpenVideo(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              zIndex: 10000
            }}
            className="btn-close btn-close-white"
            aria-label="Close"
          />
          <iframe
            width="80%"
            height="80%"
            src={videoLink}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </>
  );
}