"use client"; // Enable client-side rendering in Next.js
import React from "react";

export default function Testimonials() {
  return (
    <div
      id="carouselExampleControls"
      className="carousel slide text-center carousel-light"
      data-bs-ride="carousel"
    >
      {/* Carousel Items */}
      <div className="carousel-inner">
        {/* Testimonial 1 */}
        <div className="carousel-item active">
          <img
            className="rounded-circle shadow-1-strong mb-4"
            src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(10).webp"
            alt="avatar"
            style={{ width: "150px" }}
          />
          <div className="row d-flex justify-content-center">
            <div className="col-lg-8">
              <h5 className="mb-3">Maria Kate</h5>
              <p>Photographer</p>
              <p className="text-muted">
                <i className="fas fa-quote-left pe-2"></i>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus
                et deleniti nesciunt sint eligendi reprehenderit reiciendis,
                quibusdam illo, beatae quia fugit consequatur laudantium velit
                magnam error. Consectetur distinctio fugit doloremque.
              </p>
            </div>
          </div>
         
        </div>

        {/* Testimonial 2 */}
        <div className="carousel-item">
          <img
            className="rounded-circle shadow-1-strong mb-4"
            src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(32).webp"
            alt="avatar"
            style={{ width: "150px" }}
          />
          <div className="row d-flex justify-content-center">
            <div className="col-lg-8">
              <h5 className="mb-3">John Doe</h5>
              <p>Web Developer</p>
              <p className="text-muted">
                <i className="fas fa-quote-left pe-2"></i>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus
                et deleniti nesciunt sint eligendi reprehenderit reiciendis.
              </p>
            </div>
          </div>
         
        </div>

        {/* Testimonial 3 */}
        <div className="carousel-item">
          <img
            className="rounded-circle shadow-1-strong mb-4"
            src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/img%20(1).webp"
            alt="avatar"
            style={{ width: "150px" }}
          />
          <div className="row d-flex justify-content-center">
            <div className="col-lg-8">
              <h5 className="mb-3">Anna Deynah</h5>
              <p>UX Designer</p>
              <p className="text-muted">
                <i className="fas fa-quote-left pe-2"></i>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus
                et deleniti nesciunt sint eligendi reprehenderit reiciendis,
                quibusdam illo, beatae quia fugit consequatur laudantium velit
                magnam error. Consectetur distinctio fugit doloremque.
              </p>
            </div>
          </div>
           
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        className="carousel-control-prev"
        type="button"
        data-bs-target="#carouselExampleControls"
        data-bs-slide="prev"
      >
        <span
          className="carousel-control-prev-icon text-body"
          aria-hidden="true"
        ></span>
        <span className="visually-hidden">Previous</span>
      </button>
      <button
        className="carousel-control-next"
        type="button"
        data-bs-target="#carouselExampleControls"
        data-bs-slide="next"
      >
        <span
          className="carousel-control-next-icon text-body"
          aria-hidden="true"
        ></span>
        <span className="visually-hidden">Next</span>
      </button>
    </div>
  );
}
