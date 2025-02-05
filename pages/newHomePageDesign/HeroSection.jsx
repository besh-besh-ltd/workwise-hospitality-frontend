import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import CallNowModal from "./CallNowModal";
import { TypeAnimation } from "react-type-animation";

export default function HeroSection() {
  return (
    <div
      className="d-flex flex-lg-row flex-column  justify-content-lg-around  justify-content-center align-items-center"
      style={{
        background: "linear-gradient(50deg, #005F96, #50A055)",
        color: "white",
        padding: "40px 20px",
        textAlign: "center",
        minHeight: "100vh",
        marginTop: "50px",
      }}
    >
      <div>
        {/* Main Heading */}
        <h1
          style={{
            fontWeight: "bold",
            fontSize: "36px",
            marginBottom: "10px",
            lineHeight: "40px",
            color: "white",
            // maxWidth: "286px",
          }}
        >
          Procurement se profit banao
        </h1>

        {/* Subheading */}
        <p className="mb-0"
          style={{
            color: "#FFD700",
            fontWeight: "600",
            fontSize: "18px",
            lineHeight: "26px",
          }}
        >
          Is your procurement causing
        </p>

        <p
          style={{
            color: "#FFD700",
            fontWeight: "600",
            fontSize: "22px",
            lineHeight: "26px",
          }}
        >
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

      {/* Video Section */}
      <div>
        <div
          style={{
            background: "white",
            borderRadius: "15px",
            padding: "15px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "400px",
            maxHeight: "400px",
            height: "100%",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "300px",
              position: "relative",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <video
              src="/videos/hero_video.mp4"
              autoPlay
              loop
              controls
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "10px",
              }}
            ></video>
          </div>

          <p
            style={{
              fontWeight: "500",
              fontSize: "22px",
              marginTop: "10px",
              color: "#305BA6",
            }}
          >
            Presenting combination of{" "}
            <span style={{ fontWeight: "600" }}> software + service </span>{" "}
          </p>
        </div>

        {/* CTA Button - Visible only on small & medium screens */}
        <div className="d-lg-none mt-5">
          <CallNowModal />
        </div>
      </div>
    </div>
  );
}
