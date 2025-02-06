"use client";

import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlay } from "@fortawesome/free-regular-svg-icons";

export default function SeventhSection() {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div
      className="py-5 text-center "
      style={{
        background: "linear-gradient(135deg, #005F96, #50A055)",
        color: "white",
      }}
    >
      {/* Video Section */}
      <div
  className="d-flex flex-column align-items-center p-4"
  style={{
    background: "white",
    borderRadius: "18px",
    width: "90%",
    maxWidth: "900px",
    textAlign: "center",
    marginBottom: "20px",
    margin: "auto",
  }}
>
  <p
    style={{
      fontSize: "28px",
      fontWeight: "700",
      color: "#305BA6",
      marginBottom: "10px",
    }}
  >
    Here’s how workwise works
  </p>

  {/* Clickable Image Wrapper */}
  <button
    onClick={handleOpenModal}
    style={{
      width: "100%",
      height: "350px",
      background: `url(/assets/images/hero.png) center/cover`,
      borderRadius: "10px",

      border: "none",
      padding: "0",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundSize: "cover",
    }}
  >
    <FontAwesomeIcon
      icon={faCirclePlay}
      style={{ fontSize: "50px", color: "#000000", opacity: "0.9" }}
    />
  </button>
</div>


      {/* Subheading */}
      <h3
        className=" px-4"
        style={{
          marginTop: "40px",
          fontWeight: "700",
          fontSize: "32px",
          fontFamily: "Poppins, sans-serif",
          color: "white",
        }}
      >
        Workwise is smart and wise
      </h3>
      <div className=" mt-4 p-4 d-flex justify-content-center w-100 ">
        <div
          className=" w-100"
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            // border: "0.5px solid #428A41",
          }}
        >
          <table
            className="table text-center  mx-auto"
            style={{
              maxWidth: "900px",
              background: "white",
              borderRadius: "12px",
              borderCollapse: "separate",
              borderSpacing: "0",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    background: "white",
                    color: "black",
                    fontWeight: "bold",
                    padding: "12px",
                  }}
                >
                  {" "}
                </th>
                <th
                  style={{
                    background: "#428A41",
                    color: "#FDE500",
                    fontWeight: "bold",
                    padding: "12px",
                  }}
                >
                  Workwise
                </th>
                <th
                  style={{
                    background: "#BFAC3C",
                    color: "white",
                    fontWeight: "bold",
                    padding: "12px",
                  }}
                >
                  Without Workwise
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Procurement is a", "Profit centre", "Cost centre"],
                ["Bidding", "With Surety", "Guesswork"],
                ["Procurement time", "10 days", "100 days"],
                ["Vendors", "10,000+ PSU Approved", "Selected few in contact"],
                ["Negotiations", "Reverse Auction", "Manual"],
              ].map((row, index) => (
                <tr
                  key={index}
                  style={{
                    border: "1px solid #428A41",
                  }}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      style={{
                        padding: "12px",
                        fontSize: "16px",
                        fontWeight: cellIndex === 0 ? "bold" : "normal",
                        backgroundColor:
                          cellIndex === 1 ? "#E8F5E9" : "transparent",
                        color: "#191919",
                        borderRight:
                          cellIndex !== 2 ? "1px solid #428A41" : "none",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bootstrap Modal for Video */}
      {showModal && (
        <div
          className="modal fade show d-block p-4 h-sm-50 "
          tabIndex="-1"
          role="dialog"
          style={{ background: "rgba(0, 0, 0, 0.6)" }}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-centered "
            role="document"
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title p-4 text-center fw-bold ">
                  workwise Demo{" "}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <div className="modal-body d-flex justify-content-center">
                <iframe
                  width="100%"
                  height="500px"
                  src={`https://www.youtube.com/embed/-JPa1MX2HVE?autoplay=1`}
                  title="YouTube Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
