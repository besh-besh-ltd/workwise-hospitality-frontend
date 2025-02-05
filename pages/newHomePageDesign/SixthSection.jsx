import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function SixthSection() {
  const features = [
    {
      id: 1,
      title: "AI-generated price comparison chart",
      image: "https://www.svgrepo.com/show/508699/landscape-placeholder.svg", // Replace with actual image
    },
    {
      id: 2,
      title: "Automate RFQs creation and follow-ups",
      image: "https://www.svgrepo.com/show/508699/landscape-placeholder.svg",
    },
    {
      id: 3,
      title: "Reverse Auction to negotiate pricing",
      image: "https://www.svgrepo.com/show/508699/landscape-placeholder.svg",
    },
  ];

  return (
    <div className="py-5 text-center">
      {/* Heading */}
      <h2
        style={{
          fontWeight: "700",
          fontSize: "28px",
          lineHeight: "32px",
          fontFamily: "Poppins, sans-serif",
          textAlign: "center",
        }}
      >
        Here’s what Workwise can do for you
      </h2>

      {/* Features List */}
      <div className="container mt-4">
        <div className="row justify-content-center">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="col-md-6 col-lg-4 d-flex justify-content-center"
            >
              <div
                className="d-flex flex-column align-items-center p-3"
                style={{
                  background: "#305BA6",
                  borderRadius: "18px",
                  width: "320px",
                  padding: "15px",
                  textAlign: "center",
                  color: "white",
                  marginBottom: "20px",
                }}
              >
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#FFD700",
                    marginBottom: "10px",
                  }}
                >
                  {feature.title}
                </p>
                <div
                  style={{
                    width: "290px",
                    height: "230px",
                    background: `url(${feature.image}) center/cover`,
                    borderRadius: "10px",
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
