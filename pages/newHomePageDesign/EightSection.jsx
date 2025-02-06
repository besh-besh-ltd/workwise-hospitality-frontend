import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function EightSection() {
  return (
    <div
      className="py-4 text-center"
      style={{
        maxWidth: "900px",
        margin: "auto",
      }}
    >
      {/* Logo Section */}
      <div className="container d-flex flex-column align-items-center">
        <div className="row justify-content-center">
          <div className="col-4 d-flex justify-content-center">
            <img
              src="/assets/images/iso_iso.svg"
              alt="ISO Certification"
            //   style={{ maxWidth: "100px", height: "auto" }}
            />
          </div>
          <div className="col-4 d-flex justify-content-center">
            <img
              src="/assets/images/iso_iaf.svg"
              alt="IAF Certification"
            //   style={{ maxWidth: "100px", height: "auto" }}
            />
          </div>
          <div className="col-4 d-flex justify-content-center align-items-center ">
            <img
              src="/assets/images/iso_uaf.png"
              alt="UAF Certification"
              style={{ width: "114px", height: "50px" }}
            />
          </div>
        </div>
      </div>

      {/* Certification Text */}
      <p
        className="mt-3 px-4 "
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#2D5DA9",
        }}
      >
        Your data is Secure. ISO/IEC 27001:2022 Certified
      </p>
    </div>
  );
}
