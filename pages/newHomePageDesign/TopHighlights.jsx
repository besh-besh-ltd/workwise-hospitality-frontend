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
                  <span className="fs-6 badge badge-pill text-bg-warning">
                    Top Highlights
                  </span>
                </p>
                <h2>Auto generated Price comparison chart</h2>
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
                  <span className="fs-6 badge badge-pill text-bg-warning">
                    Top Highlights
                  </span>
                </p>
                <h2 className="text-end">Reverse Auction</h2>
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
                  <span className="fs-6 badge badge-pill text-bg-warning">
                    Top Highlights
                  </span>
                </p>
                <h2>Hightlight 3</h2>
              </div>
            </div>
            <div className="col-md-12 col-lg-7">
              <img
                src="http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737270267/elsixrwkrhxow9zygnow.png"
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