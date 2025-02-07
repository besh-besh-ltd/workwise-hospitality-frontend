import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faCalendarAlt,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

export default function FifthSection() {
  const benefits = [
    {
      id: 1,
      icon: faMoneyBillWave,
      text: "20% more profit",
    },
    {
      id: 2,
      icon: faCalendarAlt,
      text: "100 days of work in 10 days",
    },
    {
      id: 3,
      icon: faChartLine,
      text: "Bid right. Win big. Grow fast.",
    },
  ];

  return (
    <div
      className="text-center py-5"
      style={{
        background: "linear-gradient(55deg, #005F96, #50A055)",
        color: "white",
      }}
    >
      {/* Heading */}
      <h2
        style={{
          fontWeight: "700",
          fontSize: "32px",
          lineHeight: "38px",
          fontFamily: "Poppins, sans-serif",
          textAlign: "center",
          color:"white"
        }}
      >
        Key Benefits
      </h2>

      {/* Benefits Grid */}
      <div className="container mt-4">
        <div className="row justify-content-center gap-4 ">
          {benefits.map((benefit) => (
     
              <div
               key={benefit.id}
                className="d-flex flex-wrap align-items-center justify-content-center p-2"
                style={{
                  background: "#FFF",
                  borderRadius: "10px",
                  width: "150px",
                  height: "140px",
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                }}
              >
              <p className="mb-0" >
                <FontAwesomeIcon icon={benefit.icon} size="2x" color="#305BA6" />
              </p>
                <p
                className="mb-0 "
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#191919",
                    lineHeight: "21px",
                  }}
                >
                  {benefit.text}
                </p>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}
