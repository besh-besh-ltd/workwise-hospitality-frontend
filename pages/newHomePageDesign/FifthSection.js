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
          color: "white",
        }}
      >
        Key Benefits
      </h2>

      {/* Benefits Grid */}
      <div className="container mt-4">
        <div className="benefit-container ">
          {benefits.map((benefit) => (
            <div
              key={benefit.id}
              className="d-flex flex-sm-row flex-wrap align-items-center justify-content-md-center gap-3  justify-content-sm-start p-4 benefit-card "
            >
              <p className="mb-0"  >
                <FontAwesomeIcon
                  icon={benefit.icon}
                  size="2x"
                  color="#305BA6"
                />
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

      <style>
        {`

        .benefit-container{
        display:flex;
        justify-content:center;
        align-items:center;
        gap:10px
        }

        .benefit-card{
          background: #FFF;
          border-radius: 10px;
          width: 160px;
          height: 150px;
        }

          @media (max-width: 500px) {
            .benefit-container{
             flex-direction: column; 
             }
          
            .benefit-card {
              width: 100%;
              height: fit-content;
              margin-top:10px;
            }
          }

        `}
      </style>
    </div>
  );
}
