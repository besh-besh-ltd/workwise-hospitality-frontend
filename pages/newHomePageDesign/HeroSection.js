"use client";

import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import CallNowModal from "./CallNowModal";
import { TypeAnimation } from "react-type-animation";

export default function HeroSection() {
  const [visible, setVisible] = useState(true);

  return (
    <div className=" mt-5  " style={{height: "95vh",   background: "linear-gradient(50deg, #005F96, #50A055)"}}>
      {/* // only for IEW */}
      {visible && (
        <div
          className="w-100 px-4 py-2 text-center fw-semibold"
          style={{
            background: "var(--yellow-color)",
            fontWeight: "600",
            fontSize: "16px",
            borderTop: "1px solid black",
            borderBottom: "1px solid black",
            width: "100%",
            margin: "0px",
          }}
        >
          <span>
            Meet us at India Energy Week -{" "}
            <span style={{ fontWeight: "800" }}> Stall no. 2L 29 </span> | Proud
            Sponsor of IEW 2025
          </span>
          <button
            onClick={() => setVisible(false)}
            style={{
              float: "right",
              background: "transparent",
              fontSize: "18px",
              border: "none",
              cursor: "pointer",
            }}
          >
            ✖
          </button>
        </div>
      )}

      <div
        className={`d-flex flex-lg-row flex-column justify-content-lg-around justify-content-center  align-items-center`}
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "white",
          height:visible?"88%":"95%",
          // marginTop: "50px",
        }}
      >
        {/* Text Section */}
        <div className="text-center text-lg-start ">
          <h1 className="fw-bold fs-2  mb-4 text-white">
            Procurement se profit banao
          </h1>

          {/* Subheading */}
          <p className="mb-0 fw-semibold fs-6 text-warning ">
            Is your procurement causing
          </p>

          <p className="fw-semibold fs-3 text-warning ">
            <TypeAnimation
              sequence={[
                "Cost Overrun ?",
                1500,
                "Project Delay ?",
                1500,
                "Losses ?",
                1500,
              ]}
              speed={200}
              repeat={Infinity}
            />
          </p>

          {/* CallNowModal - Visible only on large screens */}
          <div className="d-none d-lg-block">
            <CallNowModal />
          </div>
        </div>

        {/* Video Section - Responsive Width & Height */}
        <div className="col-lg-5 col-md-8 col-sm-6 ">
          <div className="bg-white rounded-3 p-3 d-flex flex-column align-items-center">
            <div className="video-container">
              <video
                src="/videos/hero_video.mp4"
                autoPlay
                loop
                controls
                muted
                playsInline
                className="w-100 h-100"
                style={{ objectFit: "fill" }}
              ></video>
            </div>

            <p className="fw-medium mt-3 text-primary mb-0 video-sub-heading ">
              <span className="fw-semibold"> Meet Workwise: </span> Your
              Competitive Edge in Procurement
            </p>
          </div>

          {/* CTA Button - Visible only on small & medium screens */}
          <div className="d-lg-none mt-2">
            <CallNowModal />
          </div>
        </div>

        {/* Responsive Height Adjustment */}
        <style>
          {`
    .video-container {
      width: 100%;
      max-width: 100%;
      aspect-ratio: 5 / 4; /* Ensures 5:4 ratio */
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }

    .video-container video {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Ensures the video fills the container */
    }

      .video-sub-heading{
      font-size:16px;
      }

    @media (max-width: 992px) {
      .video-container {
        aspect-ratio: 5 / 4 !important; /* Maintain aspect ratio on medium screens */
      }
    }

    @media (max-width: 576px) {
      .video-container {
        aspect-ratio: 5 / 4 !important; /* Maintain aspect ratio on small screens */
      }

    }
  `}
        </style>
      </div>
    </div>
  );
}
