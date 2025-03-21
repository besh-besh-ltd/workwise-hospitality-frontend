"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Container, Row, Col, Table, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments } from "@fortawesome/free-solid-svg-icons";
import { getProductByProductIdOrCategoryId } from "@/services/products";


const images = [
  "https://picsum.photos/id/101/300/200",
  "https://picsum.photos/id/102/300/200",
  "https://picsum.photos/id/103/300/200",
  "https://picsum.photos/id/104/300/200",
];

const ValveComponent = () => {
  const [selectedImage, setSelectedImage] = useState(images[0]);
  const [productDetails , setProductDetails] = useState(null);
  const router = useRouter();
  const { category_id ,product_id} = router.query;

  console.log("cat id prod id",category_id , product_id);

  useEffect(()=>{
    
      getProductByProductIdOrCategoryId(
        { 
          product_id, 
          category_id }
      )
      .then((res)=>setProductDetails(res))
      .catch((err)=>console.log(err))
   
    
  },[product_id,category_id])



  console.log("checking the log profile o product",productDetails);
  return (
    <>
      <Container fluid className="py-4 bg-white">
        <Row className="gx-4 gy-5">
          {/* Image Column */}
          <Col lg={4} md={6}>
            <div className="mb-4">
              <img
                src={selectedImage}
                alt="Product"
                className="img-fluid border"
                style={{ maxHeight: "100%", objectFit: "contain", width:"100%" }}
              />
            </div>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Thumb ${index}`}
                  className={`cursor-pointer border p-1 ${
                    selectedImage === img ? "border-dark" : "border-light"
                  }`}
                  style={{ width: "60px", height: "60px", objectFit: "cover" }}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>

            <div
              className="card p-2 shadow-sm border rounded"
              style={{ maxWidth: "280px", marginTop:"60px" }}
            >
              <div className="d-flex align-items-center">
                <FontAwesomeIcon
                  icon={faComments}
                  className="text-primary"
                  style={{ fontSize: "24px" }}
                />
                <div className="ms-2 small">
                  <p className="mb-1 fw-bold">Looking for Assistance?</p>
                  <p className="mb-0">
                    WhatsApp:{" "}
                    <a href="https://wa.me/919001745995">+91 9001745595</a>
                  </p>
                  <p className="mb-0">
                    E-mail:{" "}
                    <a href="mailto:hello@workswise.com">hello@workswise.com</a>
                  </p>
                </div>
              </div>
            </div>
          </Col>

          {/* Product Details */}
          <Col lg={5} md={6} className="px-lg-4">
            <h1 className="h4 fw-normal mb-3">
            {productDetails?.[0]?.name}
            </h1>

            <div className="bg-light p-3 mb-4 small">
              Offer: Get Off from our setup on RTR, customers partner
            </div>

            <div className="mb-4">
              <h2 className="h6 fw-normal text-uppercase mb-3">
                Technical Specifications
              </h2>
              <table className="table table-borderless small">
                <tbody>
                  <tr>
                    <td className="text-muted ps-0">End Connection</td>
                    <td className="fw-medium">Flargoid</td>
                  </tr>
                  <tr>
                    <td className="text-muted ps-0">Pressure</td>
                    <td className="fw-medium">PN 10 and DN 600</td>
                  </tr>
                  <tr>
                    <td className="text-muted ps-0">Size</td>
                    <td className="fw-medium">DN 30 - DN 600</td>
                  </tr>
                  <tr>
                    <td className="text-muted ps-0">Brand</td>
                    <td className="fw-medium">DBF VALVES</td>
                  </tr>
                  <tr>
                    <td className="text-muted ps-0">Type</td>
                    <td className="fw-medium">Actuator</td>
                  </tr>
                  <tr>
                    <td className="text-muted ps-0">Colour</td>
                    <td className="fw-medium">Blue</td>
                  </tr>
                  <tr>
                    <td className="text-muted ps-0">Application</td>
                    <td className="fw-medium">Industrial</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button className="btn btn-link text-dark p-0 small text-decoration-none">
              [Read More]
            </button>
          </Col>

          {/* Vendor Process */}
          <Col lg={3} className="ps-lg-4">
            <div className="border-start ps-4" style={{ minHeight: "100%" }}>
              <h2 className="h6 fw-normal text-uppercase mb-4">
                How To Get Final Vendors & Rates?
              </h2>

              <div className="mb-4 ratio ratio-16x9">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Vendor Process"
                  className="bg-light"
                ></iframe>
              </div>

              <ol className="list-unstyled">
                <li className="mb-3 d-flex align-items-center">
                  <span className="me-2">1.</span>
                  <div className="border-bottom pb-2 w-100">______</div>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <span className="me-2">2.</span>
                  <div className="border-bottom pb-2 w-100">______</div>
                </li>
                <li className="mb-3 d-flex align-items-center">
                  <span className="me-2">3.</span>
                  <div className="border-bottom pb-2 w-100">______</div>
                </li>
                <li className="d-flex align-items-center">
                  <span className="me-2">4.</span>
                  <div className="border-bottom pb-2 w-100">______</div>
                </li>
              </ol>

              <div className="mt-4 small text-muted">
                Find Vendors for this product...
              </div>
            </div>
          </Col>
        </Row>
      </Container>
      {/*  layput testing  */}
      <div className="container p-4 border">
        {/* Drawing Section */}
        <h3>Drawing</h3>
        <div className="d-flex justify-content-center mb-4">
          <img
            src="https://picsum.photos/600/300"
            alt="Valve Drawing"
            width={600}
            height={300}
          />
        </div>

        {/* Description Section */}
        <h3>Description</h3>
        <ul>
          <li>
            <strong>PN rating and #ratings:</strong> Engineered for
            industrial-grade applications, this ball valve is rated for
            pressures up to <strong>5000 PSI</strong>, ensuring durability and
            performance in high-pressure systems like oil refineries, chemical
            plants, and gas pipelines. It guarantees consistent control in
            demanding environments.
          </li>
          <li>
            <strong>Standard/Full Bore Design:</strong> Featuring a{" "}
            <strong>1.5-inch full bore design</strong>, this valve allows for
            unrestricted flow with minimal pressure loss, reducing turbulence
            and wear in the system. It’s ideal for applications requiring
            maximum flow capacity, such as water treatment facilities and
            industrial fluid systems.
          </li>
          <li>
            <strong>Crafted from High-Quality Material:</strong> It is
            corrosion-resistant, making it perfect for aggressive environments
            like chemical processing, marine applications, and outdoor
            industrial settings. The <strong>PTFE lining</strong> enhances
            durability and reliability, ensuring long-lasting performance.
          </li>
          <li>
            <strong>Threaded NPT Connection:</strong> It is easy to install and
            ensures a secure, leak-free fit. The standardized threading offers
            compatibility with various industrial systems, making it versatile
            across many industries. Available sizes range from{" "}
            <strong>half-inch to 16 inches</strong>.
          </li>
          <li>
            <strong>Port Options:</strong> These valves come in multiple
            configurations, including{" "}
            <strong>
              2 ports, 3 ports (90° and 180°), and 4 ports (90°, 180°, 270°, and
              360°)
            </strong>
            , providing flexibility for various application needs.
          </li>
          <li>
            <strong>Media Compatibility:</strong> These valves are suitable for
            various media, including <strong>gas, water, and acids</strong> (for
            which a plastic variant is required). It provides reliable
            performance across a range of industrial applications.
          </li>
        </ul>

        {/* Specification Download */}
        <h3>Detailed Specification Sheet</h3>
        <Button variant="light" className="border d-flex align-items-center">
          <img
            src="https://img.icons8.com/ios-filled/50/000000/pdf.png"
            alt="PDF Icon"
            width={24}
            height={24}
          />
          <span className="ms-2">Download</span>
        </Button>

        {/* Industry Applications */}
        <h3 className="mt-4">Ideal For These Industries</h3>
        <div className="d-flex gap-4">
          {[
            {
              name: "Oil and Gas",
              icon: "https://img.icons8.com/ios/50/000000/oil-industry.png",
            },
            {
              name: "Chemical",
              icon: "https://img.icons8.com/ios/50/000000/test-tube.png",
            },
            {
              name: "Mining",
              icon: "https://img.icons8.com/ios/50/000000/mining.png",
            },
            {
              name: "Water Treatment",
              icon: "https://img.icons8.com/ios/50/000000/water.png",
            },
          ].map((industry, index) => (
            <div key={index} className="text-center">
              <img
                src={industry.icon}
                alt={industry.name}
                width={40}
                height={40}
              />
              <p>{industry.name}</p>
            </div>
          ))}
        </div>

        {/* Expert Tips */}
        <h3 className="mt-4">Expert Tips</h3>
        <div className="border p-3 rounded d-flex align-items-center">
          <img
            src="https://picsum.photos/80/80"
            alt="Expert"
            width={80}
            height={80}
            className="rounded-circle me-3"
          />
          <div>
            <p>
              <strong>Dr. Mark D.</strong>
            </p>
            <p className="text-muted">Senior Mechanical Engineer</p>
            <a href="#" className="text-decoration-none">
              www.expertadvice.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default ValveComponent;
