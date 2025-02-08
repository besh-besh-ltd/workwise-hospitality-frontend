import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function ThirdSection() {

  const testimonials = [
    {
      id: 1,
      text: "With Workwise’s huge vendor database, our procurement cycle is significantly faster, ensuring we find the right suppliers quickly and manage large-scale procurement with ease",
      name: "-CMD of 1000 Crore+ turnover EPC company",
      image: "/user-placeholder.png",
    },
    {
      id: 2,
      text: "Workwise’s price discovery tool and reverse auction have made procurement effortless. We get quick quotes, negotiate better, and always secure the best deals—saving time and money",
      name: "-CEO of 300 Crore turnover Contracting firm",
      image: "/user-placeholder.png",
    },
    {
      id: 3,
      text: "BOQ to RFQ automation, combined with seamless integration into our Microsoft ERP, has transformed our estimation process. Faster quotes, better accuracy—helping us win more tenders efficiently",
      name: "-Procurement head of 5000 Crore turnover Project company",
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
