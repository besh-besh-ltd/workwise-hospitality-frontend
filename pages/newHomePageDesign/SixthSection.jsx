import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

export default function SixthSection() {
  const features = [
    {
      id: 1,
      title: "AI-generated price comparison chart",
      image: "/videos/chart.gif",
    },
    {
      id: 2,
      title: "Automate RFQs creation and follow-ups",
      image: "/videos/rfq.gif",
    },
    {
      id: 3,
      title: "Reverse Auction to negotiate pricing",
      image: "/videos/chart.gif",
    },
  ];

  return (
    <div className="py-5 text-center">
      <h2
        style={{
          fontWeight: "700",
          fontSize: "28px",
          lineHeight: "32px",
          fontFamily: "Poppins, sans-serif",
          textAlign: "center",
        }}
      >
        Here's what Workwise can do for you
      </h2>

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
                    backgroundImage: `url(${feature.image})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    borderRadius: "10px",
                    objectFit: "cover", // Ensures image covers entire div
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