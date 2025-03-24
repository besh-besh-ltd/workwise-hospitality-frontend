import Link from "next/link";

const DynamicCard = ({ image, title, styleType, link, slug }) => {
  const CardContent = () => (
    <div
      className="card border-1 rounded-3 text-center mx-auto hover-shadow"
      style={{
        width: "18rem",
        transition: "0.3s",
        minHeight: "100px",
        maxHeight: "250px",
        height: "fit-content",
        cursor: "pointer",
      }}
    >
      {image && (
        <div
          className="d-flex justify-content-center p-3"
          style={{ height: "180px" }}
        >
          <div
            className={`${
              styleType === "circular" ? "rounded-circle" : "rounded"
            } overflow-hidden position-relative`}
            style={{
              width: "165px",
              height: "165px",
              border: styleType === "circular" ? "3px solid #dee2e6" : "none",
            }}
          >
            <img
              src={image}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      )}

      <div className="card-body py-3">
        <span className="card-title text-dark fw-bold mb-0 ">{title}</span>
      </div>
    </div>
  );

  return link ? (
    <Link href={link} passHref legacyBehavior>
      <a className="text-decoration-none">
        <CardContent />
      </a>
    </Link>
  ) : (
    <CardContent />
  );
};

export default DynamicCard;
