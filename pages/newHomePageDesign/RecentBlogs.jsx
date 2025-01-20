"use client";
import React from "react";

export default function RecentBlogs() {
  // Blog data
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

  return (
    <div
      className="container-fluid py-5"
      style={{
        backgroundColor: "#f0f0f0", // Gray background
      }}
    >
    <div className="container" >

      {/* Section Title */}
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
        className="text-center"
        style={{ color: "#777", maxWidth: "600px", margin: "10px auto" }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore.
      </p>

      <div className="row mt-4 d-flex justify-content-center">
        {blogs.map((blog, index) => (
          <div key={index} className="col-lg-4 col-md-6 mb-4">
            <div
              className="card border-1 shadow-sm"
              style={{
                borderRadius: "10px",
                border: "1px solid #ccc",
                overflow: "hidden",
                backgroundColor: "#fff",
                transition: "all 0.3s ease-in-out",
              }}
            >
              <img
                src={blog.image}
                alt={blog.title}
                className="card-img-top"
                style={{ borderRadius: "10px 10px 0 0", height: "200px", objectFit: "cover" }}
              />
              <div className="card-body text-start p-4">
                <h5
                  className="fw-bold"
                  style={{
                    maxHeight: "4.5em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3, // Truncate to 3 lines
                  }}
                >
                  {blog.title}
                </h5>
                <p
                  className="text-muted mb-3"
                  style={{
                    maxHeight: "4.5em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3, // Truncate to 3 lines
                  }}
                >
                  {blog.description}
                </p>
                <a
                  href={blog.link}
                  className="text-decoration-none"
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
      </div>
      </div>

    </div>
  );
}
