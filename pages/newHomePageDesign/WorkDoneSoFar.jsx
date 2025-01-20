"use client"; // Enable React features for Next.js app directory
import { getTestimonials } from "@/services/cms";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import { toast } from "react-toastify";


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

  const customerslider = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    autoplay: false,
    dots: false,
    arrows: true,
  };

  useEffect(() => {
    getTestimonialsList();
  }, []);

  return (
    <div>
      <section
        className="home-sec-2 sc-pt-80 sc-pb-80"
        aria-label="how-it-works"
        style={{ paddingTop: "80px", paddingBottom: "80px" }}
      >
        <div className="container mb-20">
          {/* Header Section */}
          <div className="home-sec-2-top">
            <div className="row">
              <div className="col-md-12">
                <div className="common-header common-white-header">
                  <h2 className="my-auto text-center" style={{ marginBottom: "20px" }}>
                    Work done so far
                  </h2>
                </div>
                <div className="home-overview-l">&nbsp;</div>
              </div>
            </div>
          </div>

          {/* Steps Section */}
          <div
            className="home-sec-2-btm sc-pt-50"
            style={{ paddingTop: "50px" }}
          >
            <div className="row">
              {/* Step 01 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white ">
                    {/* <h3 className="text-white fs-5">01</h3> */}
                    {/* <div className="mb-3"> */}
                      <h4 className="h1 my-4">Explore</h4>
                      <p className="h6">Database of 10,000+ Vendors</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>

              {/* Step 02 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white ">
                    {/* <h3 className="text-white fs-5">02</h3> */}
                    {/* <div className="mb-3"> */}
                      <h4 className="h1 my-4">Shortlist</h4>
                      <p className="h6">Approved vendors of industry leaders</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>

              {/* Step 03 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white ">
                    {/* <h3 className="text-white fs-5">03</h3> */}
                    {/* <div className="mb-3"> */}
                      <h4 className="h1 my-4">Send</h4>
                      <p className="h6">With just 1 click</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>

              {/* Step 04 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white ">
                    {/* <h3 className="text-white fs-5">04</h3> */}
                    {/* <div className="mb-3"> */}
                      <h4 className="h1 my-4">Get</h4>
                      <p className="h6">AI-generated rate comparison chart</p>
                    {/* </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials && (
        <section className="home-sec-3 sc-pt-80 sc-pb-80 nobgimg" aria-label="testimonials">
          <div className="container">
            <div className="home-sec-3-btm common-header">
              <h2 className="fs-6" style={{ color: "var(--primary-color)", fontWeight: "500", margin: "0 0 15px", display: "flex", alignItems: "center" }}>
                What Customers Say About Us
                <span style={{ width: "48px", height: "3px", display: "block", backgroundColor: "var(--primary-color)", marginLeft: "10px" }}></span>
              </h2>
              <h2>Testimonials</h2>
              <Slider {...customerslider}>
                {testimonials.map((item) => {
                  return (
                    <div
                      className="customer-slide"
                      key={`testimonial ${item.id}`}
                    >
                      <div className="customer-panel">

                        <div className="customer-con">
                          <div className="common-header">

                          </div>
                          <div className="customer-text">
                            <p>{item?.description}</p>
                          </div>
                          <div className="client-arewa">
                            <div className="client-img">
                              <Image
                                src={
                                  item?.created_image_url == "" ||
                                    item?.created_image_url == null
                                    ? "/assets/images/products-1.jpg"
                                    : item?.created_image_url
                                }
                                alt={item?.name}
                                width={72}
                                height={72}
                                priority={true}
                              />
                            </div>
                            <div className="client-con">
                              <p className="opacity-75" style={{ fontSize: "16px" }}>{item?.title}</p>
                              <p>
                                {item?.created_name}{" "}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Slider>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
