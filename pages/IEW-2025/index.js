import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faCalendarAlt,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import Head from "next/head";
import { contactUsFormService } from "@/services/contact";
import { toast } from "react-toastify";
import SecondSection from "../newHomePageDesign/SecondSection";

const pageInfo = {
  title: "Workwise | IEW 2025",
  description:
    "Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons",
  img: "https://api.letsworkwise.com/banner_image/1722514573447-a067f17b-6eac-4633-b5f2-f199e5edf45c.png",
};

const dataObj = [
  { msg: "procurement completed", value: "332 Cr." },
  { msg: "saved", value: "21 Cr." },
  { msg: "happy customers", value: "25" },
  { msg: "PSU approved vendors", value: "10,000+" },
];

const benefits = [
  {
    id: 1,
    icon: faMoneyBillWave,
    text: "20% more profit",
  },
  {
    id: 2,
    icon: faCalendarAlt,
    text: "100 days of work in 10 days",
  },
  {
    id: 3,
    icon: faChartLine,
    text: "Bid right. Win big. Grow fast.",
  },
];

const InterestForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phoneNumber: "",
    email: "",
    painPoints: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      subject: formData.companyName + " - IEW 2025",
      phone: formData.phoneNumber,
      name: formData.name,
      email: formData.email,
      comment: formData.painPoints,
      IEW: true,
    };

    try {
      const response = await contactUsFormService(payload);
      toast.success("Form submitted successfully!");
      console.log(response);
      setFormData({
        name: "",
        companyName: "",
        phoneNumber: "",
        email: "",
        painPoints: "",
      });
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Head>
        <title>{pageInfo.title}</title>
        <meta name="description" content={pageInfo.description} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "http://schema.org",
            "@type": "IEWPage",
            name: "IEW 2025 - Workwise",
            description:
              "Reach out to Workwise for any inquiries or support needed. Our team is ready to help you!",
            url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/IEW-2025`,
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "Customer Support",
              email: "support@letsworkwise.com",
              telephone: "9930787798",
              hoursAvailable: {
                "@type": "OpeningHoursSpecification",
                name: "Available 24/7",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ],
              },
            },
          })}
        </script>

        <meta property="og:title" content={pageInfo.title} />
        <meta property="og:description" content={pageInfo.description} />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/IEW-2025`}
        />
        <meta property="og:image" content={pageInfo.img} />
        <meta property="og:site_name" content="Workwise" />
      </Head>

      <section
        className="min-vh-100 bg-light d-flex flex-column justify-content-center align-items-center p-4 "
        style={{
          marginTop: "60px",
          background:
            "linear-gradient(50deg, var(--primary-color), var(--secondary-color))",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
          }}
        >
          <h2
            className="text-center mb-3 text-white"
            style={{ fontWeight: "700" }}
          >
            Thank you for visiting us at India Energy Week
          </h2>
          <p
            className="text-center mb-3 text-white "
            style={{ fontWeight: "600", color: "white" }}
          >
            We're excited to help you transform <u> procurement </u>
          </p>
        </div>

        <div
          className="card p-4 shadow-lg w-100 mx-auto "
          style={{
            maxWidth: "500px",
            background: "rgba(160, 169, 188, 0.4)",
            backdropFilter: "blur(15px)",
            webkitBackdropFilter: "blur(15px)",
            borderRadius: "15px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p
            className="text-center mb-3 text-white "
            style={{ fontWeight: "600", color: "white" }}
          >
            {" "}
            Fill this form to show your interest
          </p>{" "}
          {/* <img src="/logo.png" alt="Workwise Logo" className="mx-auto d-block mb-3" style={{ width: "100px" }} /> */}
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="form-control mb-3"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              required
            />
            <input
              type="text"
              className="form-control mb-3"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Company Name"
              required
            />
            <input
              type="text"
              className="form-control mb-3"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Phone Number"
              required
            />
            <input
              type="email"
              className="form-control mb-3"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email (Optional)"
            />
            <textarea
              className="form-control mb-3"
              name="painPoints"
              value={formData.painPoints}
              onChange={handleChange}
              placeholder="Pain Points/Any Other Comments?"
              rows="4"
            ></textarea>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              ) : (
                "Submit Your Interest"
              )}
            </button>
          </form>
        </div>
      </section>

      <SecondSection />

      <section
        className="text-center py-5 mt-4 "
        style={{
          background:
            "linear-gradient(55deg, var(--secondary-color), var(--primary-color))",
          color: "white",
        }}
      >
        {/* Heading */}
        <h2
          style={{
            fontWeight: "700",
            fontSize: "32px",
            lineHeight: "38px",
            fontFamily: "Poppins, sans-serif",
            textAlign: "center",
            color: "white",
          }}
        >
          Key Benefits
        </h2>

        {/* Benefits Grid */}
        <div className="container mt-4">
          <div className="row justify-content-center gap-4 ">
            {benefits.map((benefit) => (
              <div
                key={benefit.id}
                className="d-flex flex-wrap align-items-center justify-content-center p-2"
                style={{
                  background: "#FFF",
                  borderRadius: "10px",
                  width: "150px",
                  height: "140px",
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                }}
              >
                <p className="mb-0">
                  <FontAwesomeIcon
                    icon={benefit.icon}
                    size="2x"
                    color="#305BA6"
                  />
                </p>
                <p
                  className="mb-0 "
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#191919",
                    lineHeight: "21px",
                  }}
                >
                  {benefit.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default InterestForm;
