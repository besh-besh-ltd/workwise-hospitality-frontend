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
      question: "Can I compare quotes from different vendors on Workwise?.",
      answer: "Yes, Workwise provides AI-driven automated rate comparison charts for each product, allowing contractors to easily compare quotes from different vendors and select the best option."

    },
    {
      question: "How can I send multiple RFQs quickly on Workwise?",
      answer : "Workwise allows contractors to send hundreds of RFQs with a single click. Our platform uses AI to automate the process, ensuring that all relevant vendors receive your request and respond promptly."
    },
    {
     question:"How can Workwise help my business grow?",
     answer:"Workwise acts as your business partner, leveraging advanced AI technology to streamline procurement processes and connect you with the right vendors. This partnership allows you to focus on core business activities while we handle procurement challenges, taking your business to new heights."
    },
    {
      question:"How do I get started with Workwise?",
      answer:"Getting started with Workwise is easy. Simply sign up on our website, create your profile, and start sending RFQs. Our user-friendly interface and comprehensive support will guide you through the process."
     },
     {
      question:"How does Workwise automate follow-ups with vendors?",
      answer:"Workwise uses AI-powered automated follow-up systems to ensure timely responses from vendors. This helps contractors avoid delays and ensures that procurement processes run smoothly."
     },
     {
      question:"How does Workwise benefit contractors?",
      answer:"Workwise offers contractors a range of benefits, including AI-driven automated follow-ups, rate comparison charts, and standardized documentation for products. This helps contractors save time, reduce costs, and ensure they receive quality products on time."
     },
     {
      question:"How does Workwise ensure the quality of products?",
      answer:"Workwise ensures product quality by providing standardized documentation, including technical data sheets and quality assurance plans (QAP). These documents outline product specifications and manufacturing standards, ensuring contractors receive high-quality products."
     },
     {
      question:"How secure is my data on Workwise?",
      answer:"At Workwise, we prioritize the security of your data. Our platform uses advanced security measures to protect your information and ensure confidentiality in all your procurement activities."
     },
     {
      question:"What kind of support does Workwise offer to contractors?",
      answer:"Workwise offers comprehensive support to contractors, including a dedicated customer support team, detailed user guides, and FAQs to help you navigate the platform and maximize its benefits."
     },
     {
question:"Who are the key stakeholders in Workwise?",
answer:"Workwise connects two main stakeholders: contractors and suppliers/vendors. We facilitate seamless interactions between these groups to ensure efficient and cost-effective procurement."
     }
  ];

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container-fluid py-5">
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
    <div className="row justify-content-center px-2 px-md-4">
      <div className="col-12 col-md-10">
        <div className="row">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="col-12 col-lg-6 mb-3 px-2 px-md-3" // Single column on small/medium, two columns on large
            >
              <div
                className="faq-card"
                style={{
                  background: "#F2F2F2",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease-in-out",
                  padding: "15px",
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                }}
                onClick={() => handleToggle(index)}
              >
                {/* Question */}
                <div className="d-flex justify-content-between align-items-center">
                  <h5
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "400",
                      fontFamily: "Poppins, sans-serif",
                      color: "#004896",
                      wordWrap: "break-word",
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
                      marginLeft: "10px",
                      transition: "transform 0.3s ease",
                      transform: openIndex === index ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </div>
  
                {/* Answer Section */}
                <div
                  className="faq-answer"
                  style={{
                    maxHeight: openIndex === index ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.4s ease-in-out, padding 0.4s ease-in-out",
                    padding: openIndex === index ? "10px 0px" : "0px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "16px",
                      color: "#191919",
                      opacity: openIndex === index ? 1 : 0,
                      transition: "opacity 0.3s ease-in-out",
                      wordWrap: "break-word",
                    }}
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  
  
  
  
  
  );
}
