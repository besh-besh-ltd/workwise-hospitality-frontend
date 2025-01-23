"use client";
import Link from "next/link";
import React, { useEffect } from "react";
import { TypeAnimation } from "react-type-animation";

export default function HeroSection({ handleToggleVideo }) {

  const handleVideoClick = (e) => {
    e.preventDefault();
    document.getElementById('portal_video_section')?.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      handleToggleVideo();
    }, 800);
  };

  return (
    <div className="hero-section">

      <div className="content">
        <h1 className="hero-heading">Is Procurement...</h1>

        <div className="mb-4 fs-5 type-animation">
          <TypeAnimation
            sequence={[
              "Causing Cost Overruns?",
              2500,
              "Delaying your projects?",
              2500,
              "Eating into your profits?",
              2500,
            ]}
            speed={200}
            repeat={Infinity}
          />
        </div>

        <div className="cta">
          <a href="#portal_video_section" className="cta-btn" onClick={handleVideoClick}>
            If Yes, Watch Video to know more
          </a>
        </div>
      </div>

      <style jsx>{`
        .hero-section {
          position: relative;
          height: 100vh;
          width: 100%;
          background: linear-gradient(180deg, rgb(255, 255, 255) 0%, #f0f0f0 100%);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #333;
          padding: 20px;
        }


        @keyframes floatBubble {
          0% {
            transform: translateY(0);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-80vh);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh);
            opacity: 0;
          }
        }

        .content {
          position: relative;
          z-index: 1;
          max-width: 90%;
        }

        .hero-heading {
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1e3c72;
          text-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
          animation: fadeInUp 1s ease-in-out;
        }


        .cta-btn {
          display: inline-block;
          padding: 15px 40px;
          border-radius: 30px;
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: #fff;
          font-size: 1.2rem;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0px 10px 30px rgba(0, 123, 255, 0.5);
          transition: all 0.3s ease-in-out;
        }

        .cta-btn:hover {
          background: linear-gradient(135deg, #0056b3 0%, #007bff 100%);
          transform: scale(1.05);
          box-shadow: 0px 15px 35px rgba(0, 123, 255, 0.7);
        }

        @media (max-width: 768px) {
          .hero-heading {
            font-size: 1.9rem;
          }
          .type-animation {
            font-size: 1.2rem;
          }
          .cta-btn {
            font-size: 1rem;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
