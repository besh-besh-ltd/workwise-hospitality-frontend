import React from "react";
import Slider from "react-slick";
import { Card } from "react-bootstrap";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const ProductCarousel = ({ data }) => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 6,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
        pauseOnHover: true,
        responsive: [
            {
                breakpoint: 1200, // Large screens
                settings: {
                    slidesToShow: 5,
                },
            },
            {
                breakpoint: 992, // Medium screens
                settings: {
                    slidesToShow: 4,
                },
            },
            {
                breakpoint: 768, // Small screens
                settings: {
                    slidesToShow: 2,
                },
            },
            {
                breakpoint: 576, // Extra small screens
                settings: {
                    slidesToShow: 1,
                },
            },
        ],
    };

    return (
        <div className="mb-5">
            <Slider {...settings}>
                {data.map((product) => (
                    <div key={`prod-item-${product.product_id}`}>
                        <Card style={{ height: "200px" }}>
                            <Card.Img
                                variant="top"
                                src={product.product_images ?
                                    product.product_images[0]?.new_product_image ||
                                    product.product_images[0]?.original_product_image :
                                    "/assets/images/vendor.png"
                                }
                                alt={product.product_name}
                                style={{ objectFit: "cover", height: "120px", width: "100%" }}
                            />
                            <Card.Body>
                                <Card.Text style={{ fontSize: "13px" }}>
                                    {product.product_name}
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </div>
                ))}
            </Slider>
        </div>
    );
};

export default ProductCarousel;
