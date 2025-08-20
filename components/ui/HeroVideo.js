import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { FaRobot, FaMicrochip, FaProjectDiagram } from 'react-icons/fa';

const HeroVideo = () => {
  const [videoPlayed, setVideoPlayed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  return (
    <div className="position-relative">
      {/* Main Video Container */}
      <div className="d-flex flex-column align-items-center">
        <div className="video-container position-relative">
          {!videoPlayed ? (
            <div className="thumbnail-container position-relative">
              <img
                src="/assets/images/hero-section-thumbnail.png"
                alt="Video Thumbnail"
                className="w-100 h-100 rounded-3"
                style={{ objectFit: "cover", transform: "scale(1)" }}
              />
              <button
                className="play-button position-absolute top-50 start-50 translate-middle d-flex align-items-center justify-content-center"
                onClick={() => setVideoPlayed(true)}
                style={{
                  background: "rgba(46, 91, 168, 0.8)",
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "0px",
                }}
              >
                <span style={{ marginRight: "-6px", marginBottom: "-5px" }}>
                  <FontAwesomeIcon icon={faPlay} color="white" size="lg" />
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
              className="w-100 h-99 rounded-3"
              style={{ objectFit: "fill", transform: "scale(1)" }}
            />
          )}
          {/* AI Attribution Badge - placed immediately below the video */}
        <div className="d-flex align-items-center gap-2 justify-content-center mt-2" style={{ lineHeight: 1 }}>
          <FaRobot style={{ color: 'white' }} />
          <span className="text-white fw-medium small">Powered by AI from IIT Bombay</span>
        </div>
        </div>
      </div>



      {/* Background Blur Elements - Adjusted for more room */}
      <div 
        className="position-absolute rounded-circle"
        style={{
          width: '180px',
          height: '180px',
          background: 'rgba(255, 255, 255, 0.05)',
          top: '15%',
          right: '15%',
          zIndex: 0,
          filter: 'blur(40px)'
        }}
      />
      <div 
        className="position-absolute rounded-circle"
        style={{
          width: '140px',
          height: '140px',
          background: 'rgba(255, 255, 255, 0.03)',
          bottom: '25%',
          left: '10%',
          zIndex: 0,
          filter: 'blur(30px)'
        }}
      />

      {/* Styles */}
      <style jsx>{`
        .video-container {
          width: 100%;
          max-width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          transform: scale(0.85);
          transform-origin: center center;
        }

        .play-button {
          font-size: 24px;
          color: white;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @media (max-width: 992px) {
          .video-container {
            max-width: 80%;
            aspect-ratio: 1 / 1 !important;
            transform: scale(1);
          }
        }

        @media (max-width: 576px) {
          .video-container {
            max-width: 90%;
            aspect-ratio: 1 / 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export { HeroVideo };
