import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function ThirdSection() {

  const testimonials = [
    {
      id: 1,
      text: "As a seasoned contractor in the Oil and Gas industry, I've seen it all. Since embracing this portal, my chances of securing tenders have soared by 50%.",
      name: "CMD of 1000 Crore+ turnover EPC company",
      image: "/user-placeholder.png",
    },
    {
      id: 2,
      text: "Working in Oil and Gas means things can get pretty hectic. But, wow, this portal has made my life a breeze! Imagine verified vendors at your fingertips.",
      name: "CEO of 300 Crore turnover Contracting firm",
      image: "/user-placeholder.png",
    },
    {
      id: 3,
      text: "Workwise has truly transformed the way we do business. We’ve gained access to exclusive contracts and high-quality leads that perfectly match our expertise.",
      name: "Procurement head of 5000 Crore turnover Project company",
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
    <div className="px-4" style={{  textAlign: "center" }}>
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
                  // minHeight: "180px",
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
