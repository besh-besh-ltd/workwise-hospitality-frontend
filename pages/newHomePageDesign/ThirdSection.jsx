import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function ThirdSection() {
  const testimonials = [
    {
      id: 1,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      name: "John Doe",
      image: "/user-placeholder.png", // Replace with actual image
    },
    {
      id: 2,
      text: "Great experience! The service was exceptional and exceeded my expectations.",
      name: "Jane Smith",
      image: "/user-placeholder.png",
    },
    {
      id: 3,
      text: "Absolutely loved working with this team. Highly recommended!",
      name: "Michael Brown",
      image: "/user-placeholder.png",
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
  };

  return (
    <div className="px-4" style={{ padding: "50px 0", textAlign: "center" }}>
             <h2 className="mb-4" style={{fontSize:"20px", fontWeight:"700", marginTop:"30px" }} >
        What customers say about us

      </h2>

      <div style={{ maxWidth: "730px", margin: "auto" }}>
        <Slider {...settings}>
          {testimonials.map((testimonial) => (
            <div key={testimonial.id}>
              <div
                style={{
                  background: "#DFF2D8",
                  padding: "20px",
                  borderRadius: "15px",
                  textAlign: "left",
                  minHeight: "180px",
                }}
              >
                <p style={{ fontSize: "16px", color: "#333" }}>
                  {testimonial.text}
                </p>

                <div>
                  <strong>                   {testimonial.name}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </div>
  );
}
