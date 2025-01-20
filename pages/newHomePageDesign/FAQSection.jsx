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
    <div
      className="container py-5"
      style={{
        // backgroundColor: "#f9f9f9",
      }}
    >
      {/* Section Title */}
      <h2
        className="text-center mb-4"
        style={{
          fontSize: "2.5rem",
          fontWeight: "bold",
          color: "#333",
        }}
      >
        Frequently Asked Questions
      </h2>
      <p
        className="text-center mb-4"
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          color: "#777",
          fontSize: "1.1rem",
        }}
      >
        Find answers to some of the most common questions below.
      </p>

      {/* FAQ Accordion */}
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="mb-3 p-3"
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                backgroundColor: "#fff",
                transition: "all 0.3s ease",
                boxShadow: openIndex === index ? "0 4px 8px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <div
                className="d-flex justify-content-between align-items-center cursor-pointer"
                style={{ cursor: "pointer" }}
                onClick={() => handleToggle(index)}
              >
                <h5 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>
                  {faq.question}
                </h5>
                <FontAwesomeIcon
                  icon={openIndex === index ? faMinus : faPlus}
                  style={{
                    fontSize: "1.5rem",
                    color: openIndex === index ? "#d9534f" : "#333",
                    transition: "all 0.3s ease",
                  }}
                />
              </div>
              <div
                className="mt-3"
                style={{
                  maxHeight: openIndex === index ? "200px" : "0",
                  overflow: "hidden",
                  transition: "max-height 0.3s ease",
                }}
              >
                <p style={{ fontSize: "1rem", color: "#555" }}>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
