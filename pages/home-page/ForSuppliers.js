import React from "react";
import { HeroSection } from "@/components/ui/HeroSection";
import { BiSearch } from "react-icons/bi";
import { FeatureCard } from "@/components/ui/FeatureCard";

import { FaCommentDots, FaCertificate, FaLock, FaUserShield , FaVideo, FaPlay, FaCheck, FaBoxOpen, FaTimes} from "react-icons/fa";
import { SiAwsorganizations } from "react-icons/si";
import { TestimonialCard } from "@/components/ui/TestimonialCard";
import { FiTrendingUp, FiCpu, FiCheckSquare , FiFileText, FiAlertTriangle, FiClock , FiGift, FiCheck, FiX } from 'react-icons/fi';





function ToolCard({ icon, title, description, children }) {
  return (
    <div className="card h-100 shadow-sm border-0" style={{ borderRadius: 14 }}>
      <div className="card-body p-4">
        <div className="d-flex align-items-center mb-3" style={{ fontSize: 24, color: "#FFA500" }}>
          {icon}
        </div>
        <div className="fw-bold text-dark mb-1" style={{ fontSize: "1.10rem" }}>{title}</div>
        <div className="text-muted mb-3" style={{ fontSize: 15 }}>
          {description}
        </div>
        {children}
      </div>
    </div>
  );
}







const VIDEO_URL = "https://www.youtube.com/watch?v=eDWhbQGMPtU"
const StatsSection = () =>{
    return  (
    <section style={{ background: "#F6F7F9" }} className="py-5">
      <div className="container">
        {/* Heading */}
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-center mb-4 mb-md-5">
          <BiSearch size={26} style={{ color: "#FFA500" }} className="me-2 mb-2 mb-md-0" />
          <h2 className="fw-bold mb-0 text-center text-dark" style={{ fontSize: 26 }}>
            Join India's Largest Procurement Platform for Heavy Industries
          </h2>
        </div>

        {/* Feature Cards Row */}
        <div className="row justify-content-center g-4">
          <div className="col-12 col-md-4">
            <FeatureCard
              title={
                <span style={{ color: "#FFA500", fontSize: 32, fontWeight: 700 }}>11,000+</span>
              }
              description="Domestic Suppliers"
              className="bg-white"
            />
          </div>
          <div className="col-12 col-md-4">
            <FeatureCard
              title={
                <span style={{ color: "#FFA500", fontSize: 32, fontWeight: 700 }}>1,500+</span>
              }
              description="International Suppliers"
              className="bg-white"
            />
          </div>
          <div className="col-12 col-md-4">
            <FeatureCard
              title={
                <span style={{ color: "#FFA500", fontSize: 32, fontWeight: 700 }}>2300+ Cr</span>
              }
              description="Procurement Routed via Workwise"
              className="bg-white"
            />
          </div>
        </div>
      </div>
    </section>
    )
  

} 

const testimonials = [
  {
    authorName: "Rajesh Kumar",
    authorTitle: "Electrical Components, Delhi",
    authorImage: "https://source.unsplash.com/160x160/?portrait",

    quote: "I started with Free plan, upgraded to Gold in 3 months. The ROI has been incredible."
  },
  {
    authorName: "Vikram Singh",
    authorTitle: "Industrial Valves, Mumbai",
     authorImage: "https://source.unsplash.com/160x160/?portrait",
    quote: "Getting genuine RFQs from EPCs — no time-wasting buyers. Quality over quantity."
  },
  {
    authorName: "Amit Patel",
    authorTitle: "Machinery Parts, Ahmedabad",
     authorImage: "https://source.unsplash.com/160x160/?portrait",
    quote: "The Deviation Checker tool saved me hours! No more back-and-forth for clarifications."
  }
];

const features = [
  { icon: <FaCertificate style={{color: "#FFA500"}} />, label: "ISO Certified" },
  { icon: <SiAwsorganizations style={{color: "#FFA500"}} />, label: "AWS-Hosted" },
  { icon: <FaLock style={{color: "#FFA500"}} />, label: "End-to-End Encryption" },
  { icon: <FaUserShield style={{color: "#FFA500"}} />, label: "Role-Based Access" }
];

const newfeatures = [
  {
    icon: FiTrendingUp,
    iconBgColor: "bg-white",
    iconColor: "text-warning",
    title: <span>Business Growth</span>,
    description: (
      <ul className="list-unstyled mb-0 text-start" style={{fontSize: '1rem'}}>
        <li>✅ Only verified RFQs from trusted buyers</li>
        <li>✅ Win more orders with real project enquiries</li>
        <li>✅ Free listing to start</li>
      </ul>
    )
  },
  {
    icon: FiCpu,
    iconBgColor: "bg-white",
    iconColor: "text-warning",
    title: <span>Smart AI Tools</span>,
    description: (
      <ul className="list-unstyled mb-0 text-start" style={{fontSize: '1rem'}}>
        <li>✅ Auto-parse your PDF quotations</li>
        <li>✅ AI Deviation Checker flags mismatches</li>
        <li>✅ Track RFQ status, receive reminders</li>
      </ul>
    )
  },
  {
    icon: FiCheckSquare,
    iconBgColor: "bg-white",
    iconColor: "text-warning",
    title: <span>Hassle-Free Workflow</span>,
    description: (
      <ul className="list-unstyled mb-0 text-start" style={{fontSize: '1rem'}}>
        <li>✅ Respond via WhatsApp/Email — no login needed</li>
        <li>✅ Private data and quote security ensured</li>
        <li>✅ Get nudges when buyers review your quote</li>
      </ul>
    )
  },
];


const plans = [
  {
    name: "Free",
    enquiry: { value: false, text: "" },
    ai: false,
    visibility: "Standard",
  },
  {
    name: "Silver (₹30K/yr)",
    enquiry: { value: true, text: "15 RFQs" },
    ai: false,
    visibility: "High",
  },
  {
    name: "Gold (₹50K/yr)",
    enquiry: { value: true, text: "30 RFQs" },
    ai: true,
    visibility: "Top Tier",
  },
];

function ComparisonTick({ value, text }) {
  if (value)
    return (
      <span className="text-success d-flex align-items-center fw-medium" style={{ fontSize: 15 }}>
        <FiCheck style={{ marginRight: 6, fontSize: 16 }} />
        {text}
      </span>
    );
  return <FiX className="text-danger" style={{ fontSize: 16 }} />;
}

function ComparisonCheck({ value }) {
  return value ? (
    <FiCheck className="text-success" style={{ fontSize: 16 }} />
  ) : (
    <FiX className="text-danger" style={{ fontSize: 16 }} />
  );
}



function IndustrialFeaturesSection() {
  return (
    <section className="py-5 bg-white">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="d-flex justify-content-center align-items-center mb-2" style={{gap: '8px'}}>
            <span style={{ color: "#FFA500", fontSize: 24 }}>
              <FiCheckSquare />
            </span>
            <span className="fw-bold" style={{ fontSize: 26 }}>
              Built for Industrial Suppliers, Not for the Masses
            </span>
          </div>
          <div className="text-muted" style={{ fontSize: 17 }}>
            Our platform is specifically designed for the unique needs of heavy industry suppliers, with tools <br/> and features that address real procurement challenges.
          </div>
        </div>

        {/* Feature cards */}
        <div className="row g-4 justify-content-center my-4">
          {newfeatures.map((feat, idx) => (
            <div className="col-12 col-md-4" key={idx}>
              <FeatureCard
                icon={feat.icon}
                iconBgColor="bg-white"
                iconColor="text-warning"
                title={
                  <span className="fw-bold">{feat.title}</span>
                }
                description={feat.description}
                className="bg-light"
              />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-2">
          <button
            type="button"
            className="btn btn-dark btn-lg fw-semibold"
            style={{
              borderRadius: 8,
              paddingLeft: 30,
              paddingRight: 30,
            }}
          >
            Talk to Vendor Success Team <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section style={{ background: "#F6F7F9" }} className="py-5">
      <div className="container">
        {/* Section Title */}
        <div className="mb-4 text-center d-flex align-items-center justify-content-center">
          <span className="me-2" style={{fontSize: 24, color: "#FFA500"}}>
            <FaCommentDots />
          </span>
          <h2 className="fw-bold mb-0 text-dark" style={{ fontSize: 22 }}>
            What Suppliers Are Saying
          </h2>
        </div>

        {/* Testimonials Row */}
        <div className="row justify-content-center g-4 mb-4">
          {testimonials.map((t, idx) => (
            <div key={idx} className="col-12 col-md-4">
              <TestimonialCard
                authorName={t.authorName}
                authorTitle={t.authorTitle}
                authorImage={t.authorImage}
                quote={t.quote}
              />
            </div>
          ))}
        </div>

        {/* Features Row */}
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-4 mt-3">
          {features.map((f, idx) => (
            <span key={idx} className="d-flex align-items-center gap-2 text-dark fw-medium" style={{fontSize: 17}}>
              {f.icon}
              {f.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}


function VideoSection() {
  return (
    <section className="py-5" style={{ 
      background: "linear-gradient(135deg, #159FBC 0%, #428B41 100%)"
    }}>
      <div className="container">
        {/* Title with icon */}
        <div className="text-center mb-4">
          <span style={{ color: "#FFA500", fontSize: 28, verticalAlign: '-3px', marginRight: 8 }}>
            <FaVideo />
          </span>
          <span className="fw-bold text-white" style={{ fontSize: 26 }}>
            How Workwise Helps You Get More Orders
          </span>
        </div>

        {/* Video box */}
        <div className="mx-auto mb-4" style={{ 
          maxWidth: 800,
          borderRadius: 14,
          background: "#2196f3",
          padding: 8,
          boxShadow: "0 4px 32px rgba(0,0,0,0.13)"
        }}>
          <div style={{
            position: "relative", 
            width: "100%", 
            paddingBottom: "56.25%", /* 16:9 aspect ratio */
            background: "#000", 
            borderRadius: 9,
            overflow: "hidden"
          }}>
            <iframe 
              src={VIDEO_URL}
              title="Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0, left: 0, width: "100%", height: "100%",
                border: "none"
              }}
            />
            {/* Optional manual play button overlay (for placeholder only) */}
            {/* 
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2
            }}>
              <FaPlay color="#FFA500" size={46} />
            </div>
            */}
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button className="btn btn-dark btn-lg fw-bold px-4" style={{ borderRadius: 8 }}>
            Create Your Free Supplier Account
          </button>
        </div>
      </div>
    </section>
  );
}

const PricingTable = () => {
  return (
    <div className="container py-5">
      <div className="text-center mb-4">
        <h3>
          <FaBoxOpen className="me-2 text-warning" />
          Start for Free. Upgrade Anytime.
        </h3>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered align-middle text-center">
          <thead className="table-dark">
            <tr>
              <th>Plan</th>
              <th>Enquiry Guarantee</th>
              <th>AI Tools</th>
              <th>Visibility Boost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Free</td>
              <td>
                <FaTimes className="text-danger" />
              </td>
              <td>
                <FaTimes className="text-danger" />
              </td>
              <td>Standard</td>
            </tr>
            <tr className="table-light">
              <td>Silver (₹30K/yr)</td>
              <td>
                <FaCheck className="text-success" /> 15 RFQs

              </td>
              <td>
                <FaTimes className="text-danger" />
              </td>
              <td>High</td>
            </tr>
            <tr>
              <td>Gold (₹50K/yr)</td>
              <td>
                <FaCheck className="text-success" /> 30 RFQs
              </td>
              <td>
                <FaCheck className="text-success" />
              </td>
              <td>Top Tier</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="text-center mt-3">
        <a href="/full-comparison" className="btn btn-link">
          See Full Comparison &rarr;
        </a>
      </div>
    </div>
  );
};

function CTASection() {
  return (
    <section 
      className="py-5"
      style={{
        background: "linear-gradient(135deg, #3B82F6 0%, #10B981 100%)",
        minHeight: 200
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            {/* Title with Icon */}
            <div className="mb-3">
              <FiTrendingUp 
                style={{ 
                  color: "#FFA500", 
                  fontSize: 26, 
                  verticalAlign: "-3px", 
                  marginRight: 10 
                }} 
              />
              <h2 className="fw-bold text-white d-inline" style={{ fontSize: 26 }}>
                Grow Your Business Where the Right Buyers Are
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-white mb-4" style={{ fontSize: 18, opacity: 0.95 }}>
              Free to list. No bidding fees. Just real enquiries from real projects.
            </p>

            {/* CTA Buttons */}
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              <button 
                className="btn btn-dark btn-lg fw-semibold px-4"
                style={{ 
                  borderRadius: 8,
                  minWidth: 140
                }}
              >
                Join Now
              </button>
              <button 
                className="btn btn-outline-light btn-lg fw-semibold px-4"
                style={{ 
                  borderRadius: 8,
                  minWidth: 200,
                  borderColor: "rgba(255,255,255,0.8)"
                }}
              >
                Talk to Vendor Success Team
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
function SmartSellingToolsSection() {
  return (
    <section className="py-5" style={{ background: "#F6F7F9" }}>
      <div className="container">
        <h2 className="text-center fw-bold mb-4" style={{ fontSize: 27 }}>Smart Selling Tools</h2>
        <div className="row g-4 justify-content-center mb-4">
          {/* Quotation Parser */}
          <div className="col-12 col-md-4">
            <ToolCard
              icon={<FiFileText />}
              title="Quotation Parser"
              description="Upload PDF → Editable auto-format. Save time and reduce errors."
            >
              <div className="d-flex align-items-center mt-2" style={{
                background: "#F4F6F8", borderRadius: 10, padding: "8px 10px", minHeight: 38
              }}>
                <span className="me-2 d-flex align-items-center justify-content-center"
                  style={{
                    background: "#FFA500",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    fontSize: 15
                  }}>
                  <FiFileText />
                </span>
                <span style={{ background: "#E5E7EA", height: 9, width: 80, borderRadius: 6, display: "inline-block" }} />
              </div>
            </ToolCard>
          </div>
          {/* Deviation Checker */}
          <div className="col-12 col-md-4">
            <ToolCard
              icon={<FiAlertTriangle />}
              title="Deviation Checker"
              description="Spot mismatches instantly between RFQ and your quotation."
            >
              <div className="d-flex align-items-center mt-2"
                style={{
                  background: "#F4F6F8", borderRadius: 10, padding: "8px 10px", minHeight: 38
                }}>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#E5E7EA", height: 7, width: 70, borderRadius: 5, marginBottom: 6 }} />
                  <div style={{ background: "#E5E7EA", height: 7, width: 55, borderRadius: 5 }} />
                </div>
                <span style={{
                  background: "#FF3D3D", color: "#fff", borderRadius: "50%",
                  width: 18, height: 18, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 8
                }}>!</span>
              </div>
            </ToolCard>
          </div>
          {/* Reminders & Quote Tracking */}
          <div className="col-12 col-md-4">
            <ToolCard
              icon={<FiClock />}
              title="Reminders & Quote Tracking"
              description="Never miss a deal with automated reminders and status tracking."
            >
              <div className="d-flex align-items-center mt-2" style={{
                background: "#F4F6F8", borderRadius: 10, padding: "8px 10px", minHeight: 38
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#E5E7EA", height: 7, width: 70, borderRadius: 5, marginBottom: 5 }} />
                  <div style={{ background: "#E5E7EA", height: 7, width: 55, borderRadius: 5 }} />
                </div>
                {/* Status dots */}
                <div className="ms-3 d-flex align-items-center gap-1">
                  <span style={{ background: "#FFA500", width: 9, height: 9, borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ background: "#A0E300", width: 9, height: 9, borderRadius: "50%", display: "inline-block" }} />
                  <span style={{ background: "#7BD6FF", width: 9, height: 9, borderRadius: "50%", display: "inline-block" }} />
                </div>
              </div>
            </ToolCard>
          </div>
        </div>
        {/* CTA Button */}
        <div className="text-center pt-3">
          <button className="btn btn-dark btn-lg fw-semibold px-5" style={{ borderRadius: 8 }}>
            See Tools in Action <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
export default function SupplierHero() {
  return (
    <>
    <HeroSection
      className="px-2"
      title={
        <>
          <span style={{ color: "#FFA500", fontWeight: 700 }}>Not Just Leads</span>
          <span style={{ color: "#FFA500", fontWeight: 700, fontSize: 36, margin: "0 12px" }}>—</span>
          <span className="text-white fw-bold">Real Enquiries. Real Orders.</span>
        </>
      }
      subtitle={
        <>
          Workwise is built for serious suppliers selling to heavy industries —<br />
          not just for <span className="fw-semibold">"visibility,"</span> but for actual business. From RFQ to PO,<br />
          everything happens here.
        </>
      }
      primaryButton={{
        label: "Start Selling with Workwise",
        variant: "black",
        onClick: () => {/* ... */}
      }}
      secondaryButton={{
        label: "Talk to Our Vendor Team",
        variant: "white",
        icon: "phone",
        onClick: () => {/* ... */}
      }}
      visualContent={{
        component: () => (
          <img
            src="/process-flow-placeholder.png"
            alt="Process Flow Visual Placeholder"
            style={{
              width: "100%",
              maxWidth: 400,
              borderRadius: 18,
              boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.08)",
              objectFit: "cover"
            }}
          />
        )
      }}
    />
    <StatsSection/>
    <TestimonialSection />
    <IndustrialFeaturesSection/>
    <VideoSection />
    <SmartSellingToolsSection />
    <PricingTable />
    <CTASection />
    </>
  );
}
