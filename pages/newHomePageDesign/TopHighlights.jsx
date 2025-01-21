import React from 'react';

export default function TopHighlights() {
  return (
    <>
      <section className="container-fluid py-5" aria-label="video-media">
        <div className="container">
          <div className="row">
            <div className="col-md-12 col-lg-5">
              <div className="h-100 d-flex flex-column justify-content-center">
                <p>
                  <span className="fs-lg-6 badge badge-pill text-bg-warning">
                    Top Highlights
                  </span>
                </p>
                <h2>AI Powered Price comparison chart</h2>
                <h5 className="fw-medium opacity-75 text-dark">Smarter Insights, Better Decisions!</h5>
              </div>
            </div>
            <div className="col-md-12 col-lg-7">
              <img
                src="http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270267/elsixrwkrhxow9zygnow.png"
                alt="Price Comparison Chart"
                className="img-fluid"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container-fluid py-5" aria-label="video-media" style={{ backgroundColor: "#eef3f5" }}>
        <div className="container">
          <div className="row d-flex flex-column-reverse flex-md-row">
            <div className="col-md-12 col-lg-7">
              <img
                src="http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270775/sex7rre9z38vpqoketgw.png"
                alt="Reverse Auction"
                className="img-fluid"
              />
            </div>
            <div className="col-md-12 col-lg-5">
              <div className="h-100 d-flex flex-column justify-content-center">
                <p className="d-flex justify-content-end">
                  <span className="fs-lg-6 badge badge-pill text-bg-warning">
                    Top Highlights
                  </span>
                </p>
                <h2 className="text-end">Reverse Auction</h2>
                <h5 className="text-end fw-medium opacity-75 text-dark">Drive Competitive Pricing with Ease!</h5>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fluid py-5" aria-label="video-media">
        <div className="container">
          <div className="row">
            <div className="col-md-12 col-lg-5">
              <div className="h-100 d-flex flex-column justify-content-center">
                <p>
                  <span className="fs-lg-6 badge badge-pill text-bg-warning">
                    Top Highlights
                  </span>
                </p>
                <h2>Magic Search</h2>
                <h5 className="fw-medium opacity-75 text-dark">Upload Your BOQ, Let AI Find Vendors & Create RFQs Instantly!</h5>
              </div>
            </div>
            <div className="col-md-12 col-lg-7">
              <img
                src="/assets/images/magic-search.png"
                alt="Highlight 3"
                className="img-fluid"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}