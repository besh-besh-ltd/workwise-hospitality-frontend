import React from 'react';
import { FaWrench, FaPhone } from 'react-icons/fa';
import { FaUsers, FaFileAlt, FaSitemap, FaClipboardCheck } from 'react-icons/fa';
import { FaBolt, FaBuilding, FaCogs } from 'react-icons/fa';

import { 
 
  FaCog, 
  FaExchangeAlt, 
  FaThermometerHalf, 
  FaFireExtinguisher,
  FaFan
} from 'react-icons/fa';
import { GiPipes } from 'react-icons/gi';

import { TestimonialCard } from '@/components/ui/TestimonialCard';


import {

  FaFileInvoice,
  FaSearch,
  FaChartBar,
} from "react-icons/fa";

import { FaqAccordion } from '@/components/ui/FaqAccordion';

import { CtaSection } from '@/components/ui/CtaSection';     // ← adjust import paths
import { FaCalendarCheck, FaArrowRight } from "react-icons/fa";

const PowerProjectCta = () => (
  <CtaSection
    /* -----------------------------  headline & copy  ----------------------------- */
    title="Ready to Transform Your Power Project Procurement?"
    description="Join industry leaders who are already using Workwise to streamline their procurement processes."
    
    /* -----------------------------  primary button  ------------------------------ */
    primaryButton={{
      label: "Book a Demo",
      variant: "dark",                  // renders solid dark background
      icon: FaCalendarCheck,            // optional icon (shows at left)
      onClick: () => window.open("/book-demo", "_blank")
    }}

    /* ----------------------------- secondary button  ----------------------------- */
    secondaryButton={{
      label: "See Success Stories",
      variant: "outline-light",         // white outline just like the mock-up
      icon: FaArrowRight,
      onClick: () => window.open("/success-stories", "_blank")
    }}

    /* optional extra class if you need custom spacing */
    className="mt-4"
  />
);



// 1️⃣ Questions & answers for Power Teams
const powerTeamsFaqs = [
  {
    question: "How do I find reliable vendors for Power industry projects?",
    answer:
      "Workwise offers a vendor discovery module with 12,000+ PSU-approved vendors across various disciplines in the Power sector. You can filter by experience, certifications, and past project history."
  },
  {
    question: "What makes procurement in Power projects different?",
    answer:
      "Power projects involve unique challenges like multi-vendor coordination across electrical, civil, and mechanical disciplines, complex BOQ structures, and stringent PSU approval processes. Workwise is designed to address these sector-specific challenges."
  },
  {
    question: "How can I compare supplier quotes in Power industry tenders?",
    answer:
      "Workwise's Quote Evaluation module creates deviation-aware comparison charts that highlight technical and commercial differences across vendors, making it easier to evaluate complex Power industry proposals."
  },
  {
    question: "Is Workwise suitable for procurement tool for Power capex projects of all sizes?",
    answer:
      "Yes, Workwise scales from ₹1 Cr to ₹100+ Cr power projects. The platform is modular, allowing you to use only the features you need based on project complexity and team size."
  }
];

// 2️⃣ Section wrapper
const PowerTeamsFaq = ({ className = "" }) => (
  <section className={`py-5 bg-light ${className}`}>
    <div className="container">
      <h2 className="h4 fw-bold text-center mb-4">
        ❓ Questions Power Teams Ask Us
      </h2>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <FaqAccordion questions={powerTeamsFaqs} />
        </div>
      </div>
    </div>
  </section>
);



const WorkwiseModules = ({
  className = "",
  title = "Top Workwise Modules for Power Teams",
  modules,
  onLearnMore, // optional callback (id) => void
  ...props
}) => {
  /* ------------------------------------------------------------------ */
  /* 1. Default data                                                    */
  /* ------------------------------------------------------------------ */
  const defaultModules = [
    {
      id: "boq",
      icon: <FaFileInvoice size={20} />,
      name: "BOQ Simplification",
      description:
        "Upload any format, get a clean structure that standardizes even the most complex power project BOQs",
      link: "#",
    },
    {
      id: "vendor",
      icon: <FaSearch size={20} />,
      name: "Vendor Discovery",
      description:
        "Access 12,000+ PSU vendors specialized in power sector equipment and services",
      link: "#",
    },
    {
      id: "quote",
      icon: <FaChartBar size={20} />,
      name: "Quote Evaluation",
      description:
        "Deviation-aware comparison chart that highlights technical and commercial differences",
      link: "#",
    },
  ];

  const displayModules = modules || defaultModules;

 
  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Heading */}
        <div className="text-center mb-5">
          <h2 className="h4 fw-bold text-dark d-inline-flex align-items-center gap-2">
            <FaCog className="text-secondary" />
            {title}
          </h2>
        </div>

        {/* Cards */}
        <div className="row g-4">
          {displayModules.map((mod) => (
            <div key={mod.id} className="col-lg-4 col-md-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body p-4">
                  {/* Circle icon */}
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#e9effa",
                      color: "#3466d3",
                    }}
                  >
                    {mod.icon}
                  </div>

                  {/* Title */}
                  <h5 className="fw-semibold mb-3 text-dark">{mod.name}</h5>

                  {/* Description */}
                  <p className="text-muted small mb-4" style={{ minHeight: "64px" }}>
                    {mod.description}
                  </p>

                  {/* Learn more link */}
                  <a
                    href={mod.link}
                    onClick={(e) => {
                      if (onLearnMore) {
                        e.preventDefault();
                        onLearnMore(mod.id);
                      }
                    }}
                    className="text-primary small fw-medium text-decoration-none"
                  >
                    Learn more →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};




const TestimonialsSection = ({
  className = '',
  title = "🏢 Used in Projects by Companies You Know",
  testimonials,
  ...props
}) => {
  const defaultTestimonials = [
    {
      id: 1,
      quote: "Workwise transformed our vendor management process, reducing the time to finalize technical evaluations by 40% for our 400kV substation project.",
      authorName: "Rajesh Kumar",
      authorTitle: "Procurement Head, NTPC",
      authorImage: null, // Will use placeholder
      company: "Power Utility"
    },
    {
      id: 2,
      quote: "The BOQ simplification tool saved us countless hours on our underground cabling project. What used to take days now takes minutes.",
      authorName: "Priya Sharma",
      authorTitle: "Project Manager, L&T Power",
      authorImage: null, // Will use placeholder
      company: "EPC",
      hasLink: true,
      linkText: "See how EPCs use Workwise →"
    },
    {
      id: 3,
      quote: "Workwise's vendor discovery module helped us find specialized switchgear manufacturers we didn't know existed, improving our bid competitiveness.",
      authorName: "Vikram Singh",
      authorTitle: "Procurement Director, Tata Power",
      authorImage: null, // Will use placeholder
      company: "Power Distribution"
    }
  ];

  const displayTestimonials = testimonials || defaultTestimonials;

  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="h4 fw-bold text-dark">
            {title}
          </h2>
        </div>

        {/* Company Logos Placeholder */}
        <div className="d-flex justify-content-center align-items-center gap-4 mb-5 flex-wrap">
          {[1, 2, 3, 4, 5].map((logo) => (
            <div
              key={logo}
              className="bg-white rounded shadow-sm d-flex align-items-center justify-content-center"
              style={{ 
                width: '100px', 
                height: '60px',
                backgroundColor: '#f8f9ff'
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ 
                  width: '40px', 
                  height: '40px',
                  backgroundColor: '#6c63ff',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                }}
              />
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="row g-4">
          {displayTestimonials.map((testimonial) => (
            <div key={testimonial.id} className="col-lg-4 col-md-6">
              <TestimonialCard
                quote={testimonial.quote}
                authorName={testimonial.authorName}
                authorTitle={testimonial.authorTitle}
                authorImage={testimonial.authorImage}
                className="h-100"
              >
                {/* Company Badge */}
                <div className="position-absolute top-0 end-0 m-3">
                  <span 
                    className="badge rounded-pill px-3 py-2 small fw-medium"
                    style={{ 
                      backgroundColor: '#e3f2fd', 
                      color: '#1976d2',
                      fontSize: '0.75rem'
                    }}
                  >
                    {testimonial.company}
                  </span>
                </div>

                {/* Optional Link */}
                {testimonial.hasLink && (
                  <div className="mt-3 pt-3 border-top">
                    <a 
                      href="#" 
                      className="text-primary text-decoration-none small fw-medium"
                      onClick={(e) => e.preventDefault()}
                    >
                      {testimonial.linkText}
                    </a>
                  </div>
                )}
              </TestimonialCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};



const AllDisciplines = ({
  className = '',
  title = "📦 All Disciplines — One Platform",
  disciplines,
  variant = 'grid', // 'grid' or 'compact'
  ...props
}) => {
  const defaultDisciplines = [
    {
      id: 1,
      icon: <FaBolt style={{ color: '#4285f4' }} size={24} />,
      label: "Electrical"
    },
    {
      id: 2,
      icon: <FaCog style={{ color: '#4285f4' }} size={24} />,
      label: "Mechanical"
    },
    {
      id: 3,
      icon: <FaBuilding style={{ color: '#4285f4' }} size={24} />,
      label: "Civil"
    },
    {
      id: 4,
      icon: <GiPipes style={{ color: '#4285f4' }} size={24} />,
      label: "Piping"
    },
    {
      id: 5,
      icon: <FaThermometerHalf style={{ color: '#4285f4' }} size={24} />,
      label: "Instrumentation"
    },
    {
      id: 6,
      icon: <FaFireExtinguisher style={{ color: '#4285f4' }} size={24} />,
      label: "Fire & Safety"
    },
    {
      id: 7,
      icon: <FaFan style={{ color: '#4285f4' }} size={24} />,
      label: "HVAC"
    }
  ];

  const displayDisciplines = disciplines || defaultDisciplines;

  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="h4 fw-bold text-dark">
            {title}
          </h2>
        </div>

        {/* Disciplines Grid */}
        <div className="row g-3 justify-content-center">
          {displayDisciplines.map((discipline) => (
            <div key={discipline.id} className="col-lg-6 col-md-6">
              <div 
                className="bg-white rounded-3 shadow-sm p-4 d-flex align-items-center"
                style={{ minHeight: '90px',  maxWidth : '80%'}}
              >
                <div className="me-3 flex-shrink-0">
                  {discipline.icon}
                </div>
                <div className="fw-semibold text-dark">
                  {discipline.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};



const HeroPowerCapex = ({
  className = '',
  title = "Procurement Built for Power Capex Projects",
  description = "From ₹1 Cr to ₹100 Cr packages — Workwise simplifies your vendor discovery, quote handling, and technical evaluation across disciplines.",
  buttonLabel = "Book a Call for Your Power Project",
  onButtonClick,
  imageSrc,
  ...props
}) => {
  return (
    <section
      className={`py-5 ${className || ''}`}
      style={{
        background: 'linear-gradient(135deg, #4a73c4 0%, #2e8b7c 100%)',
        minHeight: '450px'
      }}
      {...props}
    >
      <div className="container h-100">
        <div className="row align-items-center h-100 g-4">
          {/* Left Content */}
          <div className="col-lg-6">
            <div className="text-white pe-lg-4">
              {/* Title with Wrench Icon */}
              <h1 className="display-4 fw-bold mb-4 lh-1">
                <FaWrench className="text-white me-3" size={42} />
                {title}
              </h1>

              {/* Description */}
              <p className="fs-5 mb-4 text-white-50 lh-base">
                {description}
              </p>

              {/* CTA Button */}
              <button
                className="btn btn-dark btn-lg px-4 py-3 fw-semibold rounded-3 d-flex align-items-center"
                onClick={onButtonClick}
                style={{ minWidth: '280px' }}
              >
                <span className="me-2">●</span>
                {buttonLabel}
              </button>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="col-lg-6">
            <div className="text-center">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Power Capex Infrastructure"
                  className="img-fluid rounded-3 shadow-lg"
                  style={{ maxHeight: '320px', width: '100%', objectFit: 'cover' }}
                />
              ) : (
                /* Power Infrastructure Placeholder */
                <div
                  className="position-relative rounded-3 shadow-lg mx-auto"
                  style={{
                    width: '100%',
                    maxWidth: '450px',
                    height: '320px',
                    backgroundColor: '#87ceeb',
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                >
                  {/* Simulated Power Infrastructure */}
                  <div className="position-absolute bottom-0 start-0 w-100 h-75 d-flex align-items-end justify-content-center p-4">
                    {/* Power Lines Simulation */}
                    <div className="d-flex align-items-end gap-2 w-100">
                      {/* Power Towers */}
                      {[80, 120, 100, 90, 110].map((height, i) => (
                        <div key={i} className="d-flex flex-column align-items-center">
                          {/* Tower Structure */}
                          <div
                            className="bg-dark"
                            style={{
                              width: '4px',
                              height: `${height}px`,
                              opacity: 0.7
                            }}
                          />
                          {/* Cross Beam */}
                          <div
                            className="bg-dark"
                            style={{
                              width: '20px',
                              height: '2px',
                              marginTop: '-10px',
                              opacity: 0.6
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Power Lines */}
                    <div className="position-absolute top-50 start-0 w-100">
                      {[0, 1, 2].map((line) => (
                        <div
                          key={line}
                          className="position-absolute start-0 w-100 bg-dark"
                          style={{
                            height: '1px',
                            top: `${line * 15}px`,
                            opacity: 0.4
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Overlay Text */}
                  <div className="position-absolute top-50 start-50 translate-middle text-center">
                    <div className="bg-white bg-opacity-90 rounded-2 p-3">
                      <h6 className="fw-bold text-dark mb-1">Power Infrastructure</h6>
                      <small className="text-muted">Capex Projects</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};



const PowerProcurementChallenges = ({
  className = '',
  title = "🎯 We Understand the Real-World Challenges of Power Procurement",
  challenges,
  ...props
}) => {
  const defaultChallenges = [
    {
      id: 1,
      icon: <FaUsers className="text-primary" size={32} />,
      title: 'Multi-vendor coordination',
      description: 'Managing dozens of vendors across multiple project phases with clear communication'
    },
    {
      id: 2,
      icon: <FaFileAlt className="text-primary" size={32} />,
      title: 'BOQ variability in tenders',
      description: 'Handling complex BOQs with thousands of line items and inconsistent formats'
    },
    {
      id: 3,
      icon: <FaSitemap className="text-primary" size={32} />,
      title: 'Discipline fragmentation',
      description: 'Coordinating electrical, mechanical, and civil teams with different requirements'
    },
    {
      id: 4,
      icon: <FaClipboardCheck className="text-primary" size={32} />,
      title: 'PSU approval chains',
      description: 'Navigating complex approval workflows and technical evaluations'
    }
  ];

  const displayChallenges = challenges || defaultChallenges;

  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold text-dark">
            {title}
          </h2>
        </div>

        {/* Challenges Grid */}
        <div className="row g-4">
          {displayChallenges.map((challenge) => (
            <div key={challenge.id} className="col-lg-3 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100 border-0">
                <div className="text-center mb-3">
                  {challenge.icon}
                </div>
                <div className="text-center">
                  <h5 className="fw-bold text-dark mb-3">
                    {challenge.title}
                  </h5>
                  <p className="text-muted mb-0 small lh-base">
                    {challenge.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};




const CapexProjectsServed = ({
  className = '',
  title = "📋 Capex Projects We've Served in Power",
  projects,
  ...props
}) => {
  const defaultProjects = [
    {
      id: 1,
      name: "400kV Substation",
      cost: "₹85 Cr",
      categories: [
        { icon: <FaBolt className="text-secondary" size={14} />, label: "Electrical" },
        { icon: <FaBuilding className="text-secondary" size={14} />, label: "Civil" }
      ],
      description: "Complete procurement management for a greenfield 400kV substation with 25+ vendors"
    },
    {
      id: 2,
      name: "Underground Cabling",
      cost: "₹32 Cr",
      categories: [
        { icon: <FaBolt className="text-secondary" size={14} />, label: "Electrical" },
        { icon: <FaBuilding className="text-secondary" size={14} />, label: "Civil" }
      ],
      description: "Urban power distribution network with 12km of HT/LT underground cabling"
    },
    {
      id: 3,
      name: "Switchgear EPCs",
      cost: "₹18 Cr",
      categories: [
        { icon: <FaBolt className="text-secondary" size={14} />, label: "Electrical" },
        { icon: <FaCogs className="text-secondary" size={14} />, label: "Mechanical" }
      ],
      description: "Modernization of industrial switchgear systems for power distribution company"
    }
  ];

  const displayProjects = projects || defaultProjects;

  return (
    <section className={`py-5 bg-light ${className}`} {...props}>
      <div className="container">
        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="h3 fw-bold text-dark">
            {title}
          </h2>
        </div>

        {/* Projects Grid */}
        <div className="row g-4 justify-content-center">
          {displayProjects.map((project) => (
            <div key={project.id} className="col-lg-4 col-md-6">
              <div className="bg-white rounded-3 shadow-sm p-4 h-100 border-0">
                {/* Project Header */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="fw-bold text-dark mb-0 flex-grow-1 me-2">
                    {project.name}
                  </h5>
                  <span 
                    className="badge rounded-pill px-3 py-2 fw-bold"
                    style={{ 
                      backgroundColor: '#ffc107', 
                      color: '#000',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {project.cost}
                  </span>
                </div>

                {/* Categories Tags */}
                <div className="d-flex gap-2 mb-3 flex-wrap">
                  {project.categories.map((category, idx) => (
                    <span
                      key={idx}
                      className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-2 bg-light text-muted small"
                      style={{ fontSize: '0.75rem' }}
                    >
                      {category.icon}
                      <span className="fw-medium">{category.label}</span>
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-muted mb-0 small lh-base">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};





const IndustryPage = () => {
  return (
    <>
      <HeroPowerCapex/>
      <PowerProcurementChallenges/>
      <CapexProjectsServed/>
      <AllDisciplines />
      <TestimonialsSection />
      <WorkwiseModules/>
        <PowerTeamsFaq className="mt-5" />
        <PowerProjectCta />
    </>
  )
}

export default IndustryPage

