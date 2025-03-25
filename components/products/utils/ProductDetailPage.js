"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Table, Button } from "react-bootstrap";
import { getProductByProductAndCategorySlug } from "@/services/products";
import { useRouter } from "next/router";

const images = [
  "https://picsum.photos/id/101/300/200",
  "https://picsum.photos/id/102/300/200",
  "https://picsum.photos/id/103/300/200",
  "https://picsum.photos/id/104/300/200",
];

const productComponent = () => {
  const [selectedImage, setSelectedImage] = useState(images[0]);
  const [productDetails, setProductDetails] = useState(null);
  const [productTechSpec, setProductTechSpec] = useState(null);

  const router = useRouter();
  const { productSlug } = router.query;

  const fetchProductDetails = async () => {
    await getProductByProductAndCategorySlug(productSlug)
      .then((res) => {
        setProductTechSpec(res?.productSpec);
        setProductDetails(res?.productData);
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    if (productSlug) {
      fetchProductDetails();
    }
  }, [productSlug]);

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
                style={{
                  maxHeight: "100%",
                  objectFit: "contain",
                  width: "100%",
                }}
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

            {/* <div
              className="card p-2 shadow-sm border rounded"
              style={{ maxWidth: "280px", marginTop: "60px" }}
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
            </div> */}
          </Col>

          {/* Product Details */}
          <Col lg={5} md={6} className="px-lg-4">
            <h1 className="h4 fw-normal mb-3">
              {productDetails?.cms_title || productDetails?.product_name}
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
                  {productTechSpec?.map((spec, index) => (
                    <tr key={index}>
                      <td className="text-muted ps-0">{spec.title}</td>
                      <td className="fw-medium">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Col>

          {/* Vendor Process */}
          <Col lg={3} className="ps-lg-4 ">
            <button
              class="upload btn btn-primary pt-2 btn-sm "
              style={{ height: "40px", width: "100%", marginBottom: "20px",  }}
              onClick={() => router.push(`/vendor/${productSlug[productSlug?.length-1]}`)}
              >
              Find Vendors for this product..
            </button>

            <div className="border-start ps-4" style={{ minHeight: "100%" }}>
              <h2 className="h6 fw-normal text-uppercase mb-4">
                How To Get Final Vendors & Rates?
              </h2>

              <div className="mb-4 ratio ratio-16x9">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/-JPa1MX2HVE?si=jZhvunz578-xuhOa" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              </div>

              {/* <ol className="list-unstyled">
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
              </ol> */}

              {/* <div className="mt-4 small text-muted">
                Find Vendors for this product...
              </div> */}
            </div>
          </Col>
        </Row>
      </Container>
      {/*  layput testing  */}
      <div dangerouslySetInnerHTML={{ __html: productDetails?.cms_content }} />
    </>
  );
};

export default productComponent;
