"use client";
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What is Workwise?",
      answer:
        "Workwise is an AI-powered platform that helps businesses streamline their procurement processes and find reliable vendors efficiently.",
    },
    {
      question: "How does Workwise help in cost reduction?",
      answer:
        "Workwise helps in reducing procurement costs by offering automated bidding, vendor comparisons, and optimizing supplier selection.",
    },
    {
      question: "Is Workwise suitable for small businesses?",
      answer:
        "Yes, Workwise is designed to cater to businesses of all sizes, providing scalable solutions to meet your procurement needs.",
    },
    {
      question: "How can I sign up for Workwise?",
      answer:
        "You can sign up by visiting our website and filling out the registration form. Our team will assist you with onboarding.",
    },
  ];

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container py-5">
      {/* Section Title */}
      <h2
        className="text-center mb-4"
        style={{
          fontSize: "32px",
          fontWeight: "700",
          color: "#305BA6",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        Frequently Asked Questions
      </h2>

      {/* FAQ Accordion */}
      <div className="row justify-content-center">
        <div className="col-md-8">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="mb-3"
              style={{
                background: "#F2F2F2",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.3s ease-in-out",
              }}
              onClick={() => handleToggle(index)}
            >
              {/* Question */}
              <div
                className="d-flex justify-content-between align-items-center"
                style={{
                  padding: "15px 20px",
                  transition: "background 0.3s ease",
                }}
              >
                <h5
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "400",
                    fontFamily: "Poppins, sans-serif",
                    color: "#004896",
                  }}
                >
                  {faq.question}
                </h5>
                <FontAwesomeIcon
                  icon={openIndex === index ? faMinus : faPlus}
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#305BA6",
                    marginLeft:"10px",
                    transition: "transform 0.3s ease",
                    transform: openIndex === index ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </div>

              {/* Answer Section with Smooth Transition */}
              <div
                className="faq-answer"
                style={{
                  maxHeight: openIndex === index ? "200px" : "0",
                  overflow: "hidden",
                  transition: "max-height 0.4s ease-in-out, padding 0.4s ease-in-out",
                  padding: openIndex === index ? "10px 20px" : "0px 20px",
                }}
              >
                <p
                  style={{
                    fontSize: "16px",
                    color: "#191919",
                    opacity: openIndex === index ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                  }}
                >
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
