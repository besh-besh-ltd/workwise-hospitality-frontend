import React from "react";
import Slider from "react-slick";

const vendorLogos = [
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
];

export default function FourthSection() {
  const logoSettings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToShow: 10,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <>
      <div className="text-center mb-4">
        <h2 className="mb-4" style={{fontSize:"20px", fontWeight:"700", marginTop:"30px" }} >Vendors of prominent PSUs </h2>
        <div className="py-4" style={{ backgroundColor: "#DEE8F9", width:"100%" }} >

        <Slider {...logoSettings}>
          {vendorLogos.map((logo, index) => (
            <div key={index} className="d-flex justify-content-center">
              <img
                src={logo}
                alt={`Vendor Logo ${index}`}
                className=""
                style={{ height: "80px", width:"80px", objectFit: "contain" }}
              />
            </div>
          ))}
        </Slider>
        </div>

      </div>
    </>
  );
}
