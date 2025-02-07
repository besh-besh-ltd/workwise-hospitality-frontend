import React from "react";
import Slider from "react-slick";

const vendorLogos = [
  "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png",
  "/assets/images/companylogo/aai.png",
  "/assets/images/companylogo/bhel.png",
  "/assets/images/companylogo/bpcl.png",
  "/assets/images/companylogo/bpil.png",
  "/assets/images/companylogo/cet.png",
  "/assets/images/companylogo/cil.png",
  "/assets/images/companylogo/EIL.png",
  "/assets/images/companylogo/gail.png",
  "/assets/images/companylogo/grse.png",
  "/assets/images/companylogo/HP logo.png",
  "/assets/images/companylogo/iggl.png",
  "/assets/images/companylogo/Indian-Oil-Emblem.png",
  "/assets/images/companylogo/mrpl.png",
  "/assets/images/companylogo/msetc.png",
  "/assets/images/companylogo/nalco.png",
  "/assets/images/companylogo/nhpc.png",
  "/assets/images/companylogo/nmdc.png",
  "/assets/images/companylogo/npcil.png",
  "/assets/images/companylogo/ntpc.png",
  "/assets/images/companylogo/oil.png",
  "/assets/images/companylogo/pdil.png",
  "/assets/images/companylogo/pgci.png",
  "/assets/images/companylogo/sail.png",
  "/assets/images/companylogo/vedanta.png"
];

export default function FourthSection() {
  const logoSettings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToShow: 8,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 6,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 4,
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
        <h2 className="mb-4" style={{ fontSize: "20px", fontWeight: "700", marginTop: "30px" }}>
          Vendors of Prominent PSUs
        </h2>
        <div className="py-4 px-2" style={{ backgroundColor: "#F8F9FA", width: "100%" }}>
        <Slider {...logoSettings}>
  {vendorLogos.map((logo, index) => (
    <div 
      key={index} 
      className="d-flex align-items-center justify-content-center"
      style={{ height: "100px", width: "100px" }} // Fixed width and height
    >
      <div 
        style={{
          width: "80px", 
          height: "80px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          overflow: "hidden"
        }}
      >
        <img
          src={logo}
          alt={`Vendor Logo ${index}`}
          style={{
            width: "100%", 
            height: "100%", 
            objectFit: " contain", // Ensure images fill the space evenly
            mixBlendMode: "multiply",
            filter: "drop-shadow(2px 2px 5px rgba(0,0,0,0.1))"
          }}
        />
      </div>
    </div>
  ))}
</Slider>

        </div>
      </div>
    </>
  );
}