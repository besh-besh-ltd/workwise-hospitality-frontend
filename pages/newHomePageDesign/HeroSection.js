import React, { useState, useRef, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import CallNowModal from "./CallNowModal";
import { TypeAnimation } from "react-type-animation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";

export default function HeroSection() {
  const [visible, setVisible] = useState(true);
  const [videoPlayed, setVideoPlayed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load(); // Ensures preloaded video is loaded properly
    }
  }, []);

  return (
    <>
      <section
        className="mt-5"
        style={{
          height: "96vh",
          background: "linear-gradient(50deg, #005F96, #50A055)",
        }}
      >
        {/* Announcement Banner */}
        {visible && (
          <div
            className="w-100 px-4 pt-3 pb-2 text-center fw-semibold d-flex justify-content-between align-items-center"
            style={{
              background: "var(--yellow-color)",
              fontWeight: "600",
              fontSize: "16px",
              borderTop: "2px solid black",
              borderBottom: "1px solid black",
              width: "100%",
              margin: "0px",
            }}
          >
            <div></div>
            <div>
              <p className="mb-0">Proud sponsor at India Energy Week!</p>
              <p className="mb-0">
                Visit us at{" "}
                <span style={{ fontWeight: "800" }}>Hall 2, Stand no. 2L 29</span>
              </p>
            </div>
            <button
              onClick={() => setVisible(false)}
              style={{
                background: "transparent",
                fontSize: "18px",
                border: "none",
                cursor: "pointer",
                marginRight: "-5px",
                marginLeft: "5px",
              }}
            >
              ✖
            </button>
          </div>
        )}

        <div
          className={`d-flex flex-lg-row flex-column justify-content-lg-around justify-content-center align-items-center`}
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "white",
            height: visible ? "88%" : "95%",
          }}
        >
          {/* Text Section */}
          <div className="text-center text-lg-start">
            <h1 className="fw-bold fs-1 mb-4 text-white">
              Procurement se profit banao
            </h1>
            <p className="mb-0 fw-semibold fs-6 text-warning">
              Is your procurement causing
            </p>
            <p className="fw-semibold fs-3 text-warning">
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
            <div className="d-none d-lg-block">
              <CallNowModal />
            </div>
          </div>

          {/* Video Section with Play Button */}
          <div className="col-lg-5 col-md-8 col-sm-6">
            <div className="bg-white rounded-3 p-3 d-flex flex-column align-items-center">
              <div className="video-container position-relative">
                {!videoPlayed ? (
                  <div className="thumbnail-container position-relative">
                    <img
                      src="/assets/images/hero-section-thumbnail.png"
                      alt="Video Thumbnail"
                      className="w-100 h-100 rounded-3"
                      style={{ objectFit: "cover" }}
                    />
                    <button
                      id="play-hero-section-video-btn"
                      className="play-button position-absolute top-50 start-50 translate-middle d-flex align-items-center justify-content-center"
                      onClick={() => setVideoPlayed(true)}
                      style={{
                        background: "rgba(46, 91, 168, 0.8)", // 50% transparent blue color
                        width: "70px", // Adjust size for better visibility
                        height: "70px",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "30px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "-20px",
                      }}
                    >
                      <span style={{ marginRight: "-6px", marginBottom:"-5px" }}>
                        <FontAwesomeIcon
                          icon={faPlay}
                          color="white"
                          size="lg"
                        />
                      </span>
                    </button>
                  </div>
                ) : (
                  <video
                   ref={videoRef}
                   src="/videos/hero_video.mp4"
                   autoPlay
                   controls
                   playsInline
                   loop
                   preload="auto"
                   className="w-100 h-100 rounded-3"
                   style={{ objectFit: "fill" }}
                   ></video>
                )}
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

            .play-button {
              font-size: 24px;
              color: white;
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
      </section>
    </>
  );
}
