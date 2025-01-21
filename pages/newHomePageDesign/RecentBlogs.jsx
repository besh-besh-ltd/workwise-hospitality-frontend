"use client";
import React from "react";
import Slider from "react-slick";


export default function RecentBlogs() {
  const blogs = [
    {
      title: "How To Travel With Paper Map and Navigate Easily Anywhere",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      image:
        "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737275509/slenchsmfrjomfdpdkgd.jpg",
      link: "#",
    },
    {
      title: "Stay Always Hydrated While Travelling with These Tips",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      image:
        "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737275509/slenchsmfrjomfdpdkgd.jpg",
      link: "#",
    },
    {
      title: "Things You Need In Your Bag Before Travelling Anywhere",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      image:
        "http://res.cloudinary.com/dfrhy6m3m/image/upload/v1737275509/slenchsmfrjomfdpdkgd.jpg",
      link: "#",
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: true,
          dots: true
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          initialSlide: 1
        }
      }
    ]
  };

  return (
    <div
      className="container-fluid py-5"
      style={{
        backgroundColor: "#f0f0f0",
      }}
    >
      <div className="container">
        <h2
          className="text-center mb-3"
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          Recent Articles
        </h2>
        <p
          className="text-center mb-5"
          style={{ color: "#777", maxWidth: "600px", margin: "10px auto" }}
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
          tempor incididunt ut labore.
        </p>

        <div className="slider-container px-3">
          <Slider {...settings}>
            {blogs.map((blog, index) => (
              <div key={index} className="px-2" style={{ height: "480px" }}>
                <div
                  className="card border-1 shadow-sm"
                  style={{
                    height: "450px",
                    borderRadius: "10px",
                    border: "1px solid #ccc",
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    transition: "all 0.3s ease-in-out",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ height: "200px", flexShrink: 0 }}>
                    <img
                      src={blog.image}
                      alt={blog.title}
                      className="card-img-top"
                      style={{ 
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "10px 10px 0 0"
                      }}
                    />
                  </div>
                  <div 
                    className="card-body text-start p-4"
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <h5
                        className="fw-bold mb-3"
                        style={{
                          height: "75px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 3,
                        }}
                      >
                        {blog.title}
                      </h5>
                      <p
                        className="text-muted"
                        style={{
                          height: "75px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 3,
                          marginBottom: "1rem"
                        }}
                      >
                        {blog.description}
                      </p>
                    </div>
                    <a
                      href={blog.link}
                      className="text-decoration-none mt-auto"
                      style={{
                        color: "#f58634",
                        fontWeight: "bold",
                        fontSize: "1rem",
                      }}
                    >
                      Read More
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>      
      </div>
    </div>
  );
}