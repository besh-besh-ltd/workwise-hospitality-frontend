import React from "react";

export default function DemoVideo() {
  return (
    <div
      className="container-fluid py-5"
      style={{ backgroundColor: "#f8f9fa", padding: "20px" }}
    >
      <div className="container text-center">
        {/* Heading */}
        <h2 style={{ marginBottom: "20px" }}>
          For the first time in the world, experience AI-powered software and
          service together
        </h2>

        {/* Video Teaser Section */}
        <div
          className="d-flex flex-column p-4"
          style={{
            border: "2px solid #000",
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

          {/* /* Button for Full Video */}
          <button
            className="btn btn-primary mx-auto"
            style={{ width: "100%", maxWidth: "400px" }}
            onClick={() => {
              // Add logic to open the full video in a popup
              alert("Full video popup");
            }}
          >
            Click here to view portal full video
          </button>
        </div>
      </div>
    </div>
  );
}
