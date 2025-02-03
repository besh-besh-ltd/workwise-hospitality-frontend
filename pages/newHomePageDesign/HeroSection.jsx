import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function HeroSection() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #005F96, #50A055)",
        color: "white",
        padding: "40px 20px",
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Navbar */}
      <div
        className="d-flex justify-content-between align-items-center w-100"
        style={{ maxWidth: "400px", marginBottom: "20px" }}
      >
        <div>
          <h3 style={{ fontWeight: "bold", fontSize: "22px" }}>
            work
            <span style={{ color: "#3FAD46", fontWeight: "bold" }}>wise</span>
          </h3>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: "50px" }}>
          Book a Call
        </button>
        <div>
          <span className="navbar-toggler-icon"></span>
        </div>
      </div>

      {/* Main Heading */}
      <h1 style={{ fontWeight: "bold", fontSize: "28px", marginBottom: "10px" }}>
        Procurement <br /> se profit banao
      </h1>

      {/* Subheading */}
      <p style={{ color: "#FFD700", fontWeight: "600", fontSize: "16px" }}>
        Is your procurement causing cost overruns?
      </p>

      {/* Video Section */}
      <div
        style={{
          background: "white",
          borderRadius: "15px",
          padding: "15px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "320px",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "180px",
            background: `url('https://source.unsplash.com/320x180/?office,teamwork') center/cover`,
            position: "relative",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.5)",
              borderRadius: "50%",
              padding: "10px",
            }}
          >
            <span
              className="fa fa-play"
              style={{ color: "white", fontSize: "24px" }}
            ></span>
          </div>
        </div>

        {/* Caption */}
        <p
          style={{
            fontWeight: "bold",
            fontSize: "16px",
            marginTop: "10px",
            color: "#2C3E50",
          }}
        >
          Presenting combination of <span style={{ color: "#005F96" }}>software + service</span>
        </p>
      </div>

      {/* CTA Button */}
      <button
        className="btn btn-primary mt-3"
        style={{
          borderRadius: "50px",
          padding: "10px 20px",
          fontWeight: "bold",
          fontSize: "16px",
        }}
      >
        Book a Call
      </button>
    </div>
  );
}
