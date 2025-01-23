import { getTestimonials } from "@/services/cms";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { faQuoteLeft, faStar } from '@fortawesome/free-solid-svg-icons';
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Slider from "react-slick";
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';


export default function WorkDoneSoFar() {
  const [testimonials, setTestimonials] = useState(null);
  const pageRef = useRef(1);

  const getTestimonialsList = () => {
    getTestimonials(pageRef.current)
      .then((response) => {
        setTestimonials(response.data);
      })
      .catch((error) => {
        if (error.message.response?.status === 400) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        } else {
          toast.error(error.message.message, {
            position: "top-center",
          });
        }
      });
  };

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  useEffect(() => {
    getTestimonialsList();
  }, []);

  return (
    <div>
      <section
        className="Highlight-cards sc-pt-80 pb-3"
        aria-label="how-it-works"
      >
        <div className="container mb-20">
          {/* Header Section */}
          <div className="home-sec-2-top">
            <div className="row">
              <div className="col-md-12">
                <div className="common-header">
                  <h2
                    className="my-auto text-center"
                    style={{ marginBottom: "20px" }}
                  >
                    Work done so far
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Section */}
          <div
            className="home-sec-2-btm pt-3"
          >
            <div className="row">
              {/* Step 01 */}
              <div className="col-lg-3 col-md-3 col-sm-2 col-6 p-1  ">
                <div className="banner-bottom-area border border-2 rounded-4 p-3 text-center h-100">
                  <h4 className="h3 my-4">2000+</h4>
                  <p className="h6">Vendors</p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="col-lg-3 col-md-3 col-sm-2 col-6  p-1  ">
                <div className="banner-bottom-area border border-2 rounded-4 p-3 text-center h-100">
                  <h4 className="h3 my-4">250+ CR.</h4>
                  <p className="h6">Procurement</p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="col-lg-3 col-md-3 col-sm-2 col-6  p-1  ">
                <div className="banner-bottom-area border border-2 rounded-4 p-3 text-center h-100">
                  <h4 className="h3 my-4">25+</h4>
                  <p className="h6">Clients</p>
                </div>
              </div>

              {/* Step 04 */}
              <div className="col-lg-3 col-md-3 col-sm-1 col-6  p-1  ">
                <div className="banner-bottom-area border border-2 rounded-4 p-3 text-center h-100">
                  <h4 className="h3 my-4">800+</h4>
                  <p className="h6">Quotations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials?.length > 0 && (
        <section
          className="solution-section-4 py-5"
          aria-label="hear-from-our-customers"
        >
          <div className="container">
            {/* <h2 className="h5 text-center mb-5" style={{ color: "var(--primary-color)" }}>
              Hear from Our Customers
            </h2> */}

            <div className="container">
              <Slider {...settings}>
                {testimonials.map((item, index) => (
                  <div className="container px-3" key={index}>
                  <div className=" text-center mx-auto p-2 p-lg-0">
                        <div className="d-flex h-100 justify-content-start align-items-center">
                          <div className="w-100">
                            {/* <FontAwesomeIcon icon={faQuoteLeft} fontSize={24} /> */}
                      
                            <p className="mb-4">{item.description}</p>
                            <p className="fw-semibold mb-1">{item.title}</p>
                            <p className="text-sm fw-medium">
                              {item.created_name}
                            </p>
                            <div className="d-flex justify-content-center gap-2 my-2">
                              {[...Array(5)].map((_, i) => (
                                <FontAwesomeIcon
                                  key={i}
                                  icon={faStar}
                                  fontSize={16}
                                  className="text-warning"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
