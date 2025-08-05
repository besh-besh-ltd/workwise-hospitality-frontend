"use client";

import React from "react";
import { Container, Row, Col, Button, Badge } from "react-bootstrap";
import {
  FaMicrochip,
  FaBuilding,
  FaHardHat,
  FaRobot,
  FaUpload,
  FaBrain,
  FaCheckCircle,
} from "react-icons/fa";
import { FaProjectDiagram, FaBolt } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faWandMagicSparkles,
  faClock,
  faChartColumn,
  faLightbulb,
  faRobot,
  faShareAlt,
  faStream,
  faList,
  faScrewdriverWrench,
  faMoneyBill,
  faChartLine,
  faBolt,
  faPlay,
  faUsers,
  faCalculator,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import {
  faEyeSlash,
  faFileAlt,
  faListAlt,
} from "@fortawesome/free-regular-svg-icons";

const AiToolsPage = () => {
  const tools = [
    {
      title: "Tender Summary",
      subtitle: "Extract key information from complex tender documents",
      bgGradient: "linear-gradient(45deg,  #1D4ED8, #2563EB)",
      iconColor: "#1D4ED8",
      url: "/ai-tools/tools/tender-summary",
      icon: faChartColumn,
      features: [
        {
          icon: faWandMagicSparkles,
          title: "AI-Powered Analysis",
          desc: "Processes up to 500 pages to extract critical requirements",
        },
        {
          icon: faClock,
          title: "Save Time",
          desc: "Reduce analysis from days to minutes",
        },
        {
          icon: faChartColumn,
          title: "Interactive Q&A",
          desc: "Ask questions about your tender document",
        },
      ],
      buttonText: "Get Tender Summary",
      buttonVariant: "primary",
      note: "Free processing for documents up to 500 pages",
    },
    {
      title: "Technical Summary",
      subtitle: "Simplify complex technical specifications",
      bgGradient: "linear-gradient(45deg, #15803D, #22C55E)",
      iconColor: "#15803D",
      url: "/ai-tools/tools/technical-summary",
      icon: faLightbulb,
      features: [
        {
          icon: faLightbulb,
          title: "Simplified Insights",
          desc: "Convert technical jargon into clear, actionable points",
        },
        {
          icon: faRobot,
          title: "AI Assistant",
          desc: "Ask up to 10 questions about your technical document",
        },
        {
          icon: faShareAlt,
          title: "Shareable Reports",
          desc: "Export and share simplified summaries",
        },
      ],
      buttonText: "Simplify Technical Document",
      buttonVariant: "success",
      note: "Free processing for documents up to 10 pages",
    },
    {
      title: "BOQ Simplification",
      subtitle: "Transform complex BOQs into structured data",
      bgGradient: "linear-gradient(45deg, #7E22CE, #9333EA)",
      iconColor: "#7E22CE",
      url: "/ai-tools/tools/boq-simplification",
      icon: faStream,
      features: [
        {
          icon: faList,
          title: "Smart Categorization",
          desc: "Auto-categorize line items by type and category",
        },
        {
          icon: faScrewdriverWrench,
          title: "Clean & Structured",
          desc: "Standardize formats and units for easier processing",
        },
        {
          icon: faRobot,
          title: "RFQ Ready",
          desc: "Convert BOQs directly into RFQ formats",
        },
      ],
      buttonText: "Simplify BOQ/PR/PI",
      buttonVariant: "secondary",
      buttonStyle: { backgroundColor: "#9333EA", border: "none" },
      note: "Free processing for up to 100 line items",
    },
    {
      title: "Cost Estimation",
      subtitle: "Generate accurate cost estimates from BOQs",
      bgGradient: "linear-gradient(45deg, #F59E0B, #FACC15)",
      iconColor: "#F59E0B",
      url: "/ai-tools/tools/cost-estimation",
      icon: faMoneyBill,
      features: [
        {
          icon: faMoneyBill,
          title: "Cost Breakdown",
          desc: "Split costs into Material, Service & Manpower",
        },
        {
          icon: faChartLine,
          title: "Market Rates",
          desc: "Access current market rates and historical data",
        },
        {
          icon: faBolt,
          title: "Rapid Estimation",
          desc: "Get accurate estimates in minutes, not days",
        },
      ],
      buttonText: "Get BOQ Cost Estimate",
      buttonVariant: "warning",
      note: "Free processing for up to 100 line items",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className={`position-relative heroSection`}>
        <Container className="min-vh-100 d-flex flex-column justify-content-center align-items-center text-center position-relative z-1">
          <Row>
            <Col lg={12}>
              <h1 className="fw-bold display-4 text-white mb-3">
                AI-Powered Tools for <br /> Procurement & EPC Professionals
              </h1>
              <p className="lead text-white mb-4">
                Transform complex tenders, BOQs, and technical documents into
                actionable <br />
                insights with our suite of AI tools.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Button variant="light" className="fw-semibold px-4 py-2">
                  Explore AI Tools
                </Button>
                <Button
                  variant="outline-light"
                  className="fw-semibold px-4 py-2 text-white border-white"
                >
                  Watch Demo
                </Button>
              </div>
            </Col>
          </Row>

          {/* Floating Icons with different animations */}
          <div
            className="floatingIcon floatA d-none d-lg-block"
            style={{ top: "20%", left: "80%" }}
          >
            <FaRobot size={20} />
          </div>
          <div
            className="floatingIcon floatB d-none d-md-block"
            style={{ top: "45%", left: "95%" }}
          >
            <FaMicrochip size={20} />
          </div>
          <div
            className="floatingIcon floatC d-none d-md-block"
            style={{ top: "65%", left: "75%" }}
          >
            <FaProjectDiagram size={20} />
          </div>
        </Container>
      </section>

      {/* Trusted by Industry Leaders */}
      <section className="py-5 bg-light text-center">
        <Container>
          <h2 
            className="text-uppercase fw-bold  mb-4"
            style={{ letterSpacing: "1px" }}
          >
            Trusted by Industry Leaders
          </h2>
          <Row className="justify-content-center align-items-center g-4">
            <Col xs="auto">
              <div className="d-flex flex-column align-items-center">
                <FaBuilding size={28} className="text-secondary mb-1" />
                <small className="text-muted">IOCL</small>
              </div>
            </Col>
            <Col xs="auto">
              <div className="d-flex flex-column align-items-center">
                <FaHardHat size={28} className="text-secondary mb-1" />
                <small className="text-muted">NTPC</small>
              </div>
            </Col>
            <Col xs="auto">
              <div className="d-flex flex-column align-items-center">
                <FaProjectDiagram size={28} className="text-secondary mb-1" />
                <small className="text-muted">ONGC</small>
              </div>
            </Col>
            <Col xs="auto">
              <div className="d-flex flex-column align-items-center">
                <FaBolt size={28} className="text-secondary mb-1" />
                <small className="text-muted">PowerGrid</small>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* our ai tools */}
      <section className="py-5 bg-white text-center">
        <Container>
          <h2  className="fw-bold mb-3 text-dark">Our AI-Powered Tools</h2>
          <p className="mb-4">
            Start using our AI tools today and experience the difference in
            efficiency, accuracy, and insights.
          </p>
          <Row className="g-4 justify-content-center">
            {tools.map((tool, idx) => (
              <ToolCard key={idx} {...tool} />
            ))}
          </Row>
        </Container>
      </section>

      {/* See AI Tools in Action Section */}
      <section className="py-5 bg-light ">
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="mb-4 mb-md-0">
              <h2  className="fw-bold mb-3">See Our AI Tools in Action</h2>
              <p className="text-muted mb-4">
                Watch how our AI tools transform complex procurement documents
                into actionable insights in minutes.
              </p>
              <ul className="list-unstyled text-start">
                <li className="d-flex align-items-start mb-3">
                  <span className="text-success me-2">✔</span>
                  <span>Extract key information from 500+ page tenders</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <span className="text-success me-2">✔</span>
                  <span>Simplify technical documents into clear summaries</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <span className="text-success me-2">✔</span>
                  <span>Transform complex BOQs into structured data</span>
                </li>
                <li className="d-flex align-items-start mb-4">
                  <span className="text-success me-2">✔</span>
                  <span>Generate accurate cost estimates in minutes</span>
                </li>
              </ul>
              <Button variant="primary">
                <FontAwesomeIcon icon={faRobot} className="me-2" /> Watch Demo
              </Button>
            </Col>
            <Col md={6} className="text-center">
              <div
                style={{
                  borderRadius: "12px",
                  backgroundColor: "#0F172A",
                  padding: "1rem",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                  <div className="d-flex gap-2">
                    <span
                      className="rounded-circle"
                      style={{
                        backgroundColor: "#EF4444",
                        width: 12,
                        height: 12,
                      }}
                    ></span>
                    <span
                      className="rounded-circle"
                      style={{
                        backgroundColor: "#FACC15",
                        width: 12,
                        height: 12,
                      }}
                    ></span>
                    <span
                      className="rounded-circle"
                      style={{
                        backgroundColor: "#22C55E",
                        width: 12,
                        height: 12,
                      }}
                    ></span>
                  </div>
                  <div className="text-white small">Workwise AI Demo</div>
                </div>
                <div
                  className="d-flex flex-column justify-content-center align-items-center"
                  style={{
                    backgroundColor: "#0F172A",
                    borderRadius: "8px",
                    height: "220px",
                  }}
                >
                  <div
                    className="rounded-circle d-flex justify-content-center align-items-center"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: "#E5E7EB",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faPlay}
                      style={{ color: "#0F172A" }}
                    />
                  </div>
                  <div className="text-white-50 mt-2">Click to play demo</div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Workwise AI Tools - Audience & Output Preview */}
      <section className="py-5 bg-white text-center">
        <Container>
          <h2  className="fw-bold mb-2 ">Who It’s For</h2>
          <p className="text-muted mb-4">
            Powerful AI-driven solutions to streamline your workflow and boost
            productivity
          </p>

          <Row className="g-4 mb-5">
            <Col md={6} lg={3}>
              <div className="p-4 bg-light rounded-4 shadow-sm text-start h-100">
                <div className="mb-2 text-info">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <h6 className="fw-bold">EPC Buyer</h6>
                <p className="small text-muted">
                  Create comprehensive procurement plans with automated cost
                  analysis and risk assessment
                </p>
              </div>
            </Col>
            <Col md={6} lg={3}>
              <div className="p-4 bg-light rounded-4 shadow-sm text-start h-100">
                <div className="mb-2 text-primary">
                  <FontAwesomeIcon icon={faListAlt} />
                </div>
                <h6 className="fw-bold">Contractor</h6>
                <p className="small text-muted">
                  Create faster BOQs with 1-click summaries and resource
                  allocation recommendations
                </p>
              </div>
            </Col>

            <Col md={6} lg={3}>
              <div className="p-4 bg-light rounded-4 shadow-sm text-start h-100">
                <div className="mb-2 text-success">
                  <FontAwesomeIcon icon={faFileAlt} />
                </div>
                <h6 className="fw-bold">Tender Team</h6>
                <p className="small text-muted">
                  Streamline bid preparation with intelligent document analysis
                  and competitive positioning
                </p>
              </div>
            </Col>
            <Col md={6} lg={3}>
              <div className="p-4 bg-light rounded-4 shadow-sm text-start h-100">
                <div className="mb-2 text-warning">
                  <FontAwesomeIcon icon={faCalculator} />
                </div>
                <h6 className="fw-bold">Cost Estimator</h6>
                <p className="small text-muted">
                  Generate precise cost breakdowns with AI-powered historical
                  data analysis
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* How It Works Section - Modern UI */}
      <section className="py-5 bg-light text-center">
        <Container>
          <h2  className="fw-bold mb-3">How It Works</h2>
          <p className="text-muted mb-5">
            Our AI tools follow a seamless 3-step process to deliver insights
            that drive smarter decisions.
          </p>
          <Row className="g-4">
            <Col md={4}>
              <div className="p-4 bg-white rounded-4 shadow-sm h-100 d-flex flex-column align-items-center text-center">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 mb-3">
                  <FaUpload className="text-primary" size={24} />
                </div>
                <h5 className="fw-bold mb-2">1. Upload Document</h5>
                <p className="text-muted small">
                  Upload your tender, BOQ, or technical document securely to our
                  AI-powered platform.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-4 bg-white rounded-4 shadow-sm h-100 d-flex flex-column align-items-center text-center">
                <div className="rounded-circle bg-success bg-opacity-10 p-3 mb-3">
                  <FaBrain className="text-success" size={24} />
                </div>
                <h5 className="fw-bold mb-2">2. AI Processing</h5>
                <p className="text-muted small">
                  Our AI extracts critical information, simplifies data, and
                  prepares clear summaries.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-4 bg-white rounded-4 shadow-sm h-100 d-flex flex-column align-items-center text-center">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3 mb-3">
                  <FaCheckCircle className="text-warning" size={24} />
                </div>
                <h5 className="fw-bold mb-2">3. Get Results</h5>
                <p className="text-muted small">
                  Download structured insights and cost-ready outputs—instantly
                  actionable.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

<section className="py-5 text-center">

        <Container>
          <h2  className="fw-bold mb-2  ">Sample Output Preview</h2>
          <p className="text-muted mb-4 ">
            Powerful AI-driven solutions to streamline your workflow and boost
            productivity
          </p>

          <Row className="g-4 mb-3">
            <Col md={6}>
              <div className="bg-light rounded-4 shadow-sm p-3">
                <div className="mb-2 text-start fw-semibold small text-muted">
                  Procurement Analysis Report
                </div>
                <div className="rounded overflow-hidden">
                  <img
                    src="http://localhost:8001/assets/images/hero-section-thumbnail.png"
                    alt="Procurement Report Preview"
                    className="img-fluid"
                    style={{ filter: "blur(2px)" }}
                  />
                </div>
                <div className="mt-2 text-muted small">
                  <FontAwesomeIcon icon={faLock} className="me-2" /> Preview
                  format only — your data stays secure
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div className="bg-light rounded-4 shadow-sm p-3">
                <div className="mb-2 text-start fw-semibold small text-muted">
                  Bill of Quantities (BOQ)
                </div>
                <div className="rounded overflow-hidden">
                  <img
                    src="http://localhost:8001/assets/images/hero-section-thumbnail.png"
                    alt="BOQ Report Preview"
                    className="img-fluid"
                    style={{ filter: "blur(2px)" }}
                  />
                </div>
                <div className="mt-2 text-muted small">
                  <FontAwesomeIcon icon={faLock} className="me-2" /> Preview
                  format only — your data stays secure
                </div>
              </div>
            </Col>
          </Row>

          <Button variant="secondary" disabled>
            <FontAwesomeIcon icon={faEyeSlash} className="me-2" /> View Full
            Sample
          </Button>
        </Container>
</section>

      {/* ...remaining sections */}



      {/* Call to Action Section */}
      <section
        className="py-5 text-center text-white"
        style={{ background: "linear-gradient(to bottom, #004B84, #30A07D)" }}
      >
        <Container>
          <h4 className="fw-bold mb-3 text-white">
            Ready to Transform Your Procurement Process?
          </h4>
          <p className="mb-4">
            Start using our AI tools today and experience the difference in
            efficiency, accuracy, and insights.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button variant="light" className="fw-semibold px-4 py-2 ">
              Try for Free
            </Button>
            <Button
              variant="outline-light"
              className="fw-semibold px-4 py-2 text-white border-white"
            >
              Book a Demo
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
};

export default AiToolsPage;

const Feature = ({ icon, title, desc, iconColor }) => (
  <div className="d-flex align-items-start mb-4">
    <div
      className="d-flex align-items-center justify-content-center me-3 p-2"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        backgroundColor: `${iconColor}26`, // 15% opacity as hex suffix
      }}
    >
      <FontAwesomeIcon
        icon={icon}
        style={{ color: iconColor, fontSize: "16px" }}
      />
    </div>

    <div>
      <strong>{title}</strong>
      <div className="text-muted small">{desc}</div>
    </div>
  </div>
);

const ToolCard = ({
  title,
  subtitle,
  bgGradient,
  icon,
  features,
  buttonText,
  buttonVariant,
  iconColor,
  note,
  buttonStyle,
  url = "#",
}) => (
  <Col md={6} lg={6}>
    <div className="shadow rounded-4 overflow-hidden text-start">
      <div className="p-4" style={{ background: bgGradient, color: "white" }}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h4 className="fw-bold text-white mb-1 mt-5">{title}</h4>
            <div className="fw-normal">{subtitle}</div>
          </div>
          <div className="bg-white bg-opacity-25 p-2 rounded-circle">
            <FontAwesomeIcon icon={icon} className="text-white" />
          </div>
        </div>
      </div>
      <div className="bg-white p-4">
        {features.map((f, idx) => (
          <Feature
            key={idx}
            icon={f.icon}
            title={f.title}
            desc={f.desc}
            iconColor={iconColor}
          />
        ))}
        <Button
          variant={buttonVariant}
          className="w-100 py-2 fw-semibold rounded-3 text-white"
          style={buttonStyle}
          onClick={() => (window.location.href = url)}
        >
          {buttonText}
        </Button>

        <div className="text-muted text-center small mt-2">{note}</div>
      </div>
    </div>
  </Col>
);