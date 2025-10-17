import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import Link from "next/link";

const FeatureSEOSection = () => {
  const features = [
    {
      title: "Extensive Vendor Network",
      desc: "Access thousands of verified industrial suppliers—including OEMs, dealers, and PSU-approved partners—all in one place.",
    },
    {
      title: "Effortless RFQ Generation",
      desc: "Convert your BOQ into Request for Quotation (RFQ) with just a few clicks, powered by smart automation.",
    },
    {
      title: "Search by Location & Category",
      desc: "Easily find vendors by region—Ahmedabad, Kolkata, Delhi, Mumbai—or by product type and service.",
    },
    {
      title: "Secure, Trusted Platform",
      desc: "ISO-certified, hosted on AWS with enterprise-grade encryption for maximum security and reliability.",
    },
    {
      title: "Built for Heavy Industry",
      desc: "Designed for EPC, infrastructure, and industrial procurement to save time and reduce costs.",
    },
  ];

  return (
    <section className="py-5 bg-light">
      <Container className="py-4">
        {/* Features Section */}
        <Row xs={1} md={2} className="g-4 mb-5">
          {features.map((f, i) => (
            <Col key={i}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="p-4">
                  <Card.Title as="h3" className="h5 fw-bold mb-3 text-dark">
                    {f.title}
                  </Card.Title>
                  <Card.Text className="text-muted">
                    {f.desc}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Contact Us Section */}
        <div className="bg-primary text-white rounded-3 p-4 p-md-5 d-flex flex-column flex-md-row align-items-center justify-content-between">
          <div className="mb-4 mb-md-0">
            <h2 className="h3 fw-bold mb-3">Connect with Us</h2>
            <p className="mb-0" style={{ maxWidth: "500px" }}>
              At Workwise, we’re all about connection and collaboration. Whether you’re a buyer, vendor, or just exploring, our team is here to help you every step of the way.
            </p>
          </div>
          <Link href="/contactus" passHref>
            <Button
              variant="light"
              className="rounded-pill px-4 py-2 fw-semibold"
              style={{ color: "#0052cc", border: "none" }}
            >
              Contact Us
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default FeatureSEOSection;