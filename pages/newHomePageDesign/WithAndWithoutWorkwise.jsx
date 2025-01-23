"use client"; // Enable client-side React in Next.js
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faMoneyBillWave,
  faChartLine,
  faClock,
  faBullseye,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function CleanComparison() {
  return (
    <div
      className="container-fluid p-5 text-center"
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: "1rem",
        lineHeight: "1.8",
        color: "#333",
        backgroundColor: "#eef3f5",
      }}
    >
      {/* Section Heading */}
      <h2
        className="text-center mb-5"
        style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          color: "#333",
        }}
      >
        Why Choose Workwise?
      </h2>

      {/* Comparison Section */}
      <div
        className="d-flex flex-column flex-md-row justify-content-center align-items-stretch gap-5"
      >
        {/* Left Column (With Workwise) */}
        <div
          className="d-flex flex-column align-items-center text-start p-4"
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            maxWidth: "400px",
            width: "100%",
          }}
        >
          <h4
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "20px",
              color: "#4caf50",
            }}
          >
            With Workwise
          </h4>
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faCheckCircle} size="lg" className="me-3" style={{ color: "#4caf50" }} />
            <strong>Never Miss Deadlines</strong>
          </div>
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faBullseye} size="lg" className="me-3" style={{ color: "#4caf50" }} />
            <strong>Right Price Estimates</strong>
          </div>
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faChartLine} size="lg" className="me-3" style={{ color: "#4caf50" }} />
            <strong>Increase Profit by 20%</strong>
          </div>
        </div>

        {/* Right Column (Without Workwise) */}
        <div
          className="d-flex flex-column align-items-center text-start p-4"
          style={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            maxWidth: "400px",
            width: "100%",
          }}
        >
          <h4
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "20px",
              color: "#f44336",
            }}
          >
            Without Workwise
          </h4>
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faTimesCircle} size="lg" className="me-3" style={{ color: "#f44336" }} />
              <strong>Struggle and Guess</strong>
          </div>
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faMoneyBillWave} size="lg" className="me-3" style={{ color: "#f44336" }} />
              <strong>Price Guesstimate</strong>
            </div>
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faClock} size="lg" className="me-3" style={{ color: "#f44336" }} />
            <strong>Profit by 10% or Less</strong>
          </div>
        </div>
      </div>

      {/* Call-to-Action Section */}
      <div className="mt-5">
        <p
          style={{
            marginTop: "15px",
            fontSize: "1.5rem",
            color: "#666",
            cursor: "pointer",
          }}
        >
          Now that you know Workwise
        </p>

        <Link
          href="/aboutus"
          style={{
            marginTop: "15px",
            fontSize: "2rem",
            color: "#666",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          <p>let's work together</p>
        </Link>

        <Link
          href="/aboutus"
          style={{
            marginTop: "15px",
            fontSize: "2.5rem",
            color: "#666",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          <p>Still not convinced? Know more about us</p>
        </Link>
      </div>
    </div>
  );
}
