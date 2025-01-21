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
                  <h2 className="my-auto text-center" style={{ marginBottom: "20px" }}>
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
              <div className="col-md-4 px-3 mb-2">
                <div className="banner-bottom-area border border-2 rounded-4 p-3">
                  <div className="h-100 h5 banner-bottom-con ">
                    {/* <h3 className="text-white fs-5">01</h3> */}
                    {/* <div className="mb-3"> */}
                    <h4 className="h3 my-4">Explore</h4>
                    <p className="h6">Database of 10,000+ Vendors</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>

              {/* Step 02 */}
              <div className="col-md-4 px-3 mb-2">
                <div className="banner-bottom-area border border-2 rounded-4 p-3">
                  <div className="h-100 h5 banner-bottom-con ">
                    {/* <h3 className="text-white fs-5">02</h3> */}
                    {/* <div className="mb-3"> */}
                    <h4 className="h3 my-4">Shortlist</h4>
                    <p className="h6">Approved vendors of industry leaders</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>

              {/* Step 03 */}
              <div className="col-md-4 px-3 mb-2">
                <div className="banner-bottom-area border border-2 rounded-4 p-3">
                  <div className="h-100 h5 banner-bottom-con  ">
                    {/* <h3 className="text-white fs-5">03</h3> */}
                    {/* <div className="mb-3"> */}
                    <h4 className="h3 my-4">Send</h4>
                    <p className="h6">With just 1 click</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials?.length > 0 &&
        <section className="solution-section-4 py-5" aria-label="hear-from-our-customers" >
          <div className="container">
            <h2 className="h5 mb-5" style={{ color: 'var(--primary-color)' }}>Hear from Our Customers</h2>

            <div className="container" >
              <Slider {...settings}>
                {testimonials.map((item, index) => (
                  <div className="container px-5" key={index}>
                    <div className="row">
                      <div className="col-sm-6 p-2 p-lg-0">
                        <div className="d-flex justify-content-center">
                          <Image
                            src={item.image_url || item.created_image}
                            alt="trusted-customer"
                            layout="intrinsic"
                            width={300}
                            height={400}
                          />
                        </div>
                      </div>
                      <div className="col-sm-6 p-2 p-lg-0">
                        <div className="d-flex h-100 justify-content-start align-items-center">
                          <div className="w-100">
                            <FontAwesomeIcon icon={faQuoteLeft} fontSize={24} />
                            <div className="d-flex gap-2 my-2">
                              {[...Array(5)].map((_, i) => (
                                <FontAwesomeIcon key={i} icon={faStar} fontSize={16} className="text-warning" />
                              ))}
                            </div>
                            <p className="mb-4">{item.description}</p>
                            <p className="fw-semibold mb-1">{item.title}</p>
                            <p className="text-sm fw-medium">{item.created_name}</p>
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
      }
    </div>
  );
}
