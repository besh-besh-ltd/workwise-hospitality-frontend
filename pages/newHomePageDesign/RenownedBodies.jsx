import React from 'react'
import Slider from 'react-slick';

const vendorLogos = [
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png',
    'http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270453/d33obrygoqr8mg1slupc.png'

];


export default function RenownedBodies() {

    
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
                breakpoint: 768,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
        ],
    };

  return (
    <section className="container-fluid py-5  "     style={{ backgroundColor: "#eef3f5" }}

>
    <div className="container text-center">
        <h2 className="mb-5">Explore 10,000+ Approved Vendors on Our Platform</h2>
        <h2 className="h3 mb-5 ">From This Renowed Bodies</h2>
        <Slider {...logoSettings}>
            {vendorLogos.map((logo, index) => (
                <div key={index} className="d-flex mt-5 justify-content-center">
                    <img src={logo} alt={`Vendor Logo ${index}`} className="mx-3" style={{ height: '100px', objectFit: 'contain' }} />
                </div>
            ))}
        </Slider>
    </div>
</section>
  )
}
