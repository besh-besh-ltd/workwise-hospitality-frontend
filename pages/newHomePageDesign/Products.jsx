import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import React, { useState } from 'react'
import Slider from 'react-slick'

const images = [
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


const Products = () => {
    const [productImages, setProductImages] = useState(images || []);

    const settings = {
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
        <section className="container-fluid py-5" >
            <div className="container">
                <h2 className="text-center mb-5">Browse All Products</h2>

                <div className="d-flex justify-content-between align-items-center">
                    <p className="fs-5 fw-medium mb-0">Electrical Products</p>
                    <Link
                        href="/products"
                        className="btn btn-sm btn-secondary fw-medium border-0 p-2"
                        style={{ width: "150px" }}
                    >
                        View All
                        <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                    </Link>
                </div>
                <Slider {...settings}>
                    {productImages.map((logo, index) => (
                        <div key={index} className="d-flex mt-5 justify-content-center">
                            <img src={logo} alt={`Product Image ${index}`} className="mx-3" style={{ height: '100px', objectFit: 'contain' }} />
                        </div>
                    ))}
                </Slider>

                <div className="d-flex justify-content-between align-items-center mt-5">
                    <p className="fs-5 fw-medium mb-0">Fire Products</p>
                    <Link
                        href="/products"
                        className="btn btn-sm btn-secondary fw-medium border-0 p-2"
                        style={{ width: "150px" }}
                    >
                        View All
                        <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                    </Link>
                </div>
                <Slider {...settings}>
                    {productImages.map((logo, index) => (
                        <div key={index} className="d-flex mt-5 justify-content-center">
                            <img src={logo} alt={`Product Image ${index}`} className="mx-3" style={{ height: '100px', objectFit: 'contain' }} />
                        </div>
                    ))}
                </Slider>

            </div>
        </section>
    )
}

export default Products
