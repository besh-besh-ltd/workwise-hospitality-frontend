"use client"; // Enable React features for Next.js app directory
import React from "react";
import Testimonials from "./Testimonials";

export default function WorkDoneSoFar() {
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
                  <h2
                    className="text-center"
                    style={{ marginBottom: "30px", color: "#fff" }}
                  >
                    {/* How It Works
                    <span
                      style={{
                        width: "48px",
                        height: "3px",
                        display: "block",
                        backgroundColor: "silver",
                        marginLeft: "10px",
                      }}
                    ></span>
                  </h2>
                  <h2>
                    <strong>
                      Find the right vendors and Workwise!
                    </strong>
                    */}
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
                  <div className="h-100 h5 banner-bottom-con text-white d-flex flex-column justify-content-between">
                    {/* <h3 className="text-white fs-5">01</h3> */}
                    <div className="mb-3">
                      <h4 className="h1">Explore</h4>
                      <p className="h6">Database of 10,000+ Vendors</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 02 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white d-flex flex-column justify-content-between">
                    {/* <h3 className="text-white fs-5">02</h3> */}
                    <div className="mb-3">
                      <h4 className="h1">Shortlist</h4>
                      <p className="h6">Approved vendors of industry leaders</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 03 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white d-flex flex-column justify-content-between">
                    {/* <h3 className="text-white fs-5">03</h3> */}
                    <div className="mb-3">
                      <h4 className="h1">Send</h4>
                      <p className="h6">With just 1 click</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 04 */}
              <div className="col-md-3">
                <div className="banner-bottom-area">
                  <div className="h-100 h5 banner-bottom-con text-white d-flex flex-column justify-content-between">
                    {/* <h3 className="text-white fs-5">04</h3> */}
                    <div className="mb-3">
                      <h4 className="h1">Get</h4>
                      <p className="h6">AI-generated rate comparison chart</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* <Testimonials /> */}
      </section>
    </div>
  );
}
