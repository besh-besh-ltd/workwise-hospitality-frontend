import React from "react";

const DynamicBlog = ({ image, title, description }) => {
  const maxLength = 100;
  const trimmedDescription = 
    description.length > maxLength
      ? `${description.substring(0, maxLength)}...`
      : description;

  return (
    <div className="card h-100 shadow-hover border-0 transition-all">
      <div className="card-img-top overflow-hidden position-relative rounded-top">
        <img 
          src={image} 
          alt={title} 
          className="img-fluid w-100 object-fit-cover" 
          style={{ height: "200px" }}
        />
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title fs-5 fw-semibold mb-3">{title}</h5>
        <p className="card-text text-muted flex-grow-1">{trimmedDescription}</p>
        <div className="mt-3">
          <a 
            href="#" 
            className="btn btn-outline-primary stretched-link"
            aria-label={`Read more about ${title}`}
          >
            Read More
          </a>
        </div>
      </div>
      <style jsx>{`
        .shadow-hover {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .shadow-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 1rem 3rem rgba(0,0,0,.15)!important;
        }
        .object-fit-cover {
          object-fit: cover;
        }
      `}</style>
    </div>
  );
};

export default DynamicBlog;