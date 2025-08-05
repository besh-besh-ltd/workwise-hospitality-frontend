// ----------------------------------------------------
// HeroSectionTeam.jsx
// ----------------------------------------------------
import React, { useState } from 'react';
import { Navbar, Nav, Container } from "react-bootstrap";
import { FaUser ,FaUsers, FaLinkedin , FaCalendarAlt , FaRocket , FaArrowRight} from "react-icons/fa";


const TeamPageWithNavbar = () => {
  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Search Vendor", href: "/search-vendor" },
    { label: "RFQ management", href: "/rfq-management" },
    { label: "Technical Evaluation", href: "/technical-evaluation" },
    { label: "Quote Comparison", href: "/quote-comparison" },
    { label: "Purchase Orders", href: "/purchase-orders" }
  ];

  return (
    <>
      {/* Navigation Bar */}
      <Navbar bg="white" expand="lg" className="shadow-sm">
        <Container fluid className="px-4">
          {/* Logo */}
          <Navbar.Brand href="/" className="fw-bold fs-4 text-primary">
            work<span className="text-dark">wise</span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            {/* Navigation Links */}
            <Nav className="me-auto">
              {navItems.map((item, index) => (
                <Nav.Link key={index} href={item.href} className="fw-medium text-dark mx-2">
                  {item.label}
                </Nav.Link>
              ))}
            </Nav>

            {/* User Icon */}
            <Nav>
              <Nav.Link href="/profile">
                <FaUser size={20} className="text-dark" />
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <section
        className="w-100 d-flex align-items-center justify-content-center text-center position-relative overflow-hidden"
        style={{ 
          background: "linear-gradient(135deg, #4a73c4 0%, #2e8b7c 100%)", 
          minHeight: "400px",
          paddingTop: "80px",
          paddingBottom: "80px"
        }}
      >
        <div className="container px-4">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              {/* Title - Black text */}
              <h1 className="fw-bold display-4 mb-4 text-dark">
                Meet the Team Behind Workwise
              </h1>
              
              {/* Subtitle - White text */}
              <p className="lead fw-normal text-white mx-auto lh-base" style={{ maxWidth: "700px" }}>
                We're a mix of engineers, operators, and domain experts solving India's toughest procurement problems — one project at a time.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};




const FoundersTeamComponent = () => {
  const leadershipTeam = [
    {
      id: 1,
      name: 'Rahul Sharma',
      title: 'Founder & CEO',
      titleColor: '#2E5BBA',
      description: 'IIT Bombay, 11+ years in industrial tech',
      image: 'https://via.placeholder.com/80x80/4285F4/ffffff?text=RS'
    },
    {
      id: 2,
      name: 'Vikram Mehta',
      title: 'Co-Founder & CTO',
      titleColor: '#41B8A8',
      description: 'IIT Delhi, Ex-Amazon, 8+ years in tech',
      image: 'https://via.placeholder.com/80x80/6c757d/ffffff?text=VM'
    },
    {
      id: 3,
      name: 'Priya Desai',
      title: 'Co-Founder & COO',
      titleColor: '#FFA500',
      description: 'ISB, 9+ years in supply chain management',
      image: 'https://via.placeholder.com/80x80/dc3545/ffffff?text=PD'
    }
  ];

  const engineeringTeam = [
    {
      id: 1,
      name: 'Arjun Kumar',
      title: 'Lead Engineer',
      description: 'BITS Pilani, ML/AI specialist',
      image: 'https://via.placeholder.com/80x80/28a745/ffffff?text=AK'
    },
    {
      id: 2,
      name: 'Rohan Verma',
      title: 'Backend Developer',
      description: 'NIT Trichy, 5+ years in cloud architecture',
      image: 'https://via.placeholder.com/80x80/17a2b8/ffffff?text=RV'
    },
    {
      id: 3,
      name: 'Neha Gupta',
      title: 'Frontend Developer',
      description: 'IIIT Hyderabad, UX/UI specialist',
      image: 'https://via.placeholder.com/80x80/e83e8c/ffffff?text=NG'
    }
  ];

  const productOperationsTeam = [
    {
      id: 1,
      name: 'Anjali Reddy',
      title: 'Product Manager',
      description: 'IIM Ahmedabad, Ex-Flipkart',
      image: 'https://via.placeholder.com/80x80/fd7e14/ffffff?text=AR'
    },
    {
      id: 2,
      name: 'Sameer Joshi',
      title: 'Operations Manager',
      description: 'XLRI, 7+ years in supply chain',
      image: 'https://via.placeholder.com/80x80/20c997/ffffff?text=SJ'
    },
    {
      id: 3,
      name: 'Meera Shah',
      title: 'Customer Success',
      description: 'MDI Gurgaon, Ex-Microsoft',
      image: 'https://via.placeholder.com/80x80/6f42c1/ffffff?text=MS'
    }
  ];

  const TeamCard = ({ member, isLeadership = false }) => (
    <div className="col-lg-4 col-md-6 mb-4">
      <div 
        className="bg-white rounded-4 p-4 h-100 shadow-sm border-0"
        style={{ 
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          border: '1px solid #f1f3f4'
        }}
      >
        <div className="d-flex align-items-start">
          {/* Profile Image */}
          <img 
            src={member.image}
            alt={member.name}
            className="rounded-circle me-3 flex-shrink-0"
            style={{ 
              width: '70px', 
              height: '70px', 
              objectFit: 'cover',
              border: '2px solid #f8f9fa'
            }}
          />
          
          {/* Content */}
          <div className="flex-grow-1">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
                {member.name}
              </h5>
              <FaLinkedin 
                className="text-primary" 
                size={16} 
                style={{ opacity: 0.7, cursor: 'pointer' }}
              />
            </div>
            
            <p 
              className="mb-2 fw-semibold" 
              style={{ 
                fontSize: '0.95rem',
                color: member.titleColor || '#6c757d'
              }}
            >
              {member.title}
            </p>
            
            <p 
              className="mb-0 text-muted" 
              style={{ 
                fontSize: '0.85rem',
                lineHeight: '1.4'
              }}
            >
              {member.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12">
          
          {/* Header */}
          <div className="text-center mb-5">
            <div className="d-flex align-items-center justify-content-center mb-3">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center me-3"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'rgba(108, 117, 125, 0.1)' 
                }}
              >
                <FaUsers className="text-secondary" size={20} />
              </div>
              <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                Founders & Whole Team
              </h2>
            </div>
            {/* Orange underline */}
            <div 
              className="mx-auto"
              style={{ 
                width: '60px', 
                height: '3px', 
                backgroundColor: '#FFA500',
                borderRadius: '2px'
              }}
            ></div>
          </div>

          {/* Leadership Section */}
          <div className="mb-5">
            <h3 className="mb-4 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
              Leadership
            </h3>
            <div className="row">
              {leadershipTeam.map((member) => (
                <TeamCard key={member.id} member={member} isLeadership={true} />
              ))}
            </div>
          </div>

          {/* Engineering Section */}
          <div className="mb-5">
            <h3 className="mb-4 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
              Engineering
            </h3>
            <div className="row">
              {engineeringTeam.map((member) => (
                <TeamCard key={member.id} member={member} />
              ))}
            </div>
          </div>

          {/* Product & Operations Section */}
          <div className="mb-4">
            <h3 className="mb-4 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
              Product & Operations
            </h3>
            <div className="row">
              {productOperationsTeam.map((member) => (
                <TeamCard key={member.id} member={member} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};



const OurJourneyComponent = () => {
  const journeyMilestones = [
    {
      id: 1,
      year: '2020',
      yearColor: '#2E5BBA',
      title: 'Founded in Bangalore',
      description: 'Initial team of 3 set out to solve procurement challenges',
      circleColor: '#2E5BBA'
    },
    {
      id: 2,
      year: '2021',
      yearColor: '#2E5BBA',
      title: 'First Major Client',
      description: 'Secured first enterprise client and raised seed funding',
      circleColor: '#2E5BBA'
    },
    {
      id: 3,
      year: '2022',
      yearColor: '#41B8A8',
      title: 'Team Expansion',
      description: 'Grew to 15 team members and expanded product offerings',
      circleColor: '#41B8A8'
    },
    {
      id: 4,
      year: '2023',
      yearColor: '#41B8A8',
      title: 'Series A Funding',
      description: 'Raised $8M in Series A to accelerate growth and innovation',
      circleColor: '#41B8A8'
    },
    {
      id: 5,
      year: '2024',
      yearColor: '#FFA500',
      title: 'Today & Beyond',
      description: 'Serving 50+ enterprise clients across India and Southeast Asia',
      circleColor: '#FFA500'
    }
  ];

  return (
    <div 
      className="py-5"
      style={{ 
        backgroundColor: '#f8f9fa',
        minHeight: '600px'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12">
            
            {/* Header */}
            <div className="text-center mb-5">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <div 
                  className="rounded-3 d-flex align-items-center justify-content-center me-3"
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 100%)',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <FaCalendarAlt className="text-white" size={18} />
                </div>
                <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                  Our Journey
                </h2>
              </div>
              {/* Orange underline */}
              <div 
                className="mx-auto"
                style={{ 
                  width: '60px', 
                  height: '3px', 
                  backgroundColor: '#FFA500',
                  borderRadius: '2px'
                }}
              ></div>
            </div>

            {/* Timeline */}
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="position-relative">
                  
                  {/* Vertical Line */}
                  <div 
                    className="position-absolute"
                    style={{
                      left: '50%',
                      top: '0',
                      bottom: '0',
                      width: '3px',
                      background: 'linear-gradient(to bottom, #2E5BBA 0%, #2E5BBA 40%, #41B8A8 40%, #41B8A8 80%, #FFA500 80%, #FFA500 100%)',
                      transform: 'translateX(-50%)',
                      zIndex: 1
                    }}
                  ></div>

                  {/* Timeline Items */}
                  {journeyMilestones.map((milestone, index) => (
                    <div key={milestone.id} className="row align-items-center mb-5 position-relative">
                      
                      {/* Left Side (Even items) */}
                      {index % 2 === 0 && (
                        <>
                          <div className="col-6 text-end pe-5">
                            <div className="mb-2">
                              <h4 
                                className="fw-bold mb-1" 
                                style={{ 
                                  fontSize: '1.5rem',
                                  color: milestone.yearColor
                                }}
                              >
                                {milestone.year}
                              </h4>
                              <h5 className="fw-bold text-dark mb-2" style={{ fontSize: '1.2rem' }}>
                                {milestone.title}
                              </h5>
                              <p className="text-muted mb-0" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                {milestone.description}
                              </p>
                            </div>
                          </div>
                          <div className="col-6"></div>
                        </>
                      )}

                      {/* Right Side (Odd items) */}
                      {index % 2 === 1 && (
                        <>
                          <div className="col-6"></div>
                          <div className="col-6 ps-5">
                            <div className="mb-2">
                              <h4 
                                className="fw-bold mb-1" 
                                style={{ 
                                  fontSize: '1.5rem',
                                  color: milestone.yearColor
                                }}
                              >
                                {milestone.year}
                              </h4>
                              <h5 className="fw-bold text-dark mb-2" style={{ fontSize: '1.2rem' }}>
                                {milestone.title}
                              </h5>
                              <p className="text-muted mb-0" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                {milestone.description}
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Circle Marker */}
                      <div 
                        className="position-absolute"
                        style={{
                          left: '50%',
                          top: '20px',
                          transform: 'translateX(-50%)',
                          zIndex: 2
                        }}
                      >
                        <div 
                          className="rounded-circle bg-white d-flex align-items-center justify-content-center"
                          style={{
                            width: '20px',
                            height: '20px',
                            border: `4px solid ${milestone.circleColor}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div 
                            className="rounded-circle"
                            style={{
                              width: '6px',
                              height: '6px',
                              backgroundColor: milestone.circleColor
                            }}
                          ></div>
                        </div>
                      </div>

                    </div>
                  ))}

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

function MissionRecruitmentBanner() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section
      className="position-relative d-flex align-items-center justify-content-center text-center px-3 py-5"
      style={{
        minHeight: "400px",
        background: "linear-gradient(135deg,#f8f9fa 0%,#ffffff 100%)"
      }}
    >
      {/* MAIN CARD */}
      <div className="container" style={{ maxWidth: "640px" }}>
        {/* Heading */}
        <div className="d-flex align-items-center justify-content-center mb-4 gap-3">
          <span className="position-relative">
            <FaRocket
              size={32}
              className="text-danger"
              style={{ transform: "rotate(45deg)" }}
            />
            {/* pink pulse dot */}
            <span
              className="position-absolute top-0 start-100 translate-middle rounded-circle bg-danger"
              style={{
                width: "12px",
                height: "12px",
                animation: "pulse 1.5s infinite"
              }}
            />
          </span>

          <h1 className="fw-bold display-5 mb-0 text-dark">
            Want&nbsp;to&nbsp;Join&nbsp;the&nbsp;Mission?
          </h1>
        </div>

        {/* Description */}
        <p className="fs-5 text-muted mb-4">
          We're always looking for sharp, mission-driven folks across AI, sales,
          procurement, and product.
        </p>

        {/* CTA */}
        <button
          type="button"
          className="btn btn-dark btn-lg d-inline-flex align-items-center gap-2 px-4 py-3 fw-semibold"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ transition: "transform .3s" }}
        >
          See&nbsp;Open&nbsp;Roles
          <FaArrowRight
            className="arrow-icon"
            style={{
              transition: "transform .3s",
              transform: isHovered ? "translateX(4px)" : "translateX(0)"
            }}
          />
        </button>

        {/* Tag pills */}
        {/* <hr className="my-5 opacity-25" />
        <div className="d-flex flex-wrap justify-content-center gap-2">
          {[
            "AI & Machine Learning",
            "Sales & Growth",
            "Procurement",
            "Product Development"
          ].map((tag) => (
            <span
              key={tag}
              className="badge rounded-pill bg-light text-secondary fw-medium py-2 px-3"
            >
              {tag}
            </span>
          ))}
        </div> */}
      </div>

      {/* BOUNCING DECORATIVE DOTS */}
      <span
        className="position-absolute rounded-circle bg-danger"
        style={{
          top: "20%",
          left: "10%",
          width: "8px",
          height: "8px",
          animation: "bounce 2s infinite"
        }}
      />
      <span
        className="position-absolute rounded-circle bg-primary"
        style={{
          top: "30%",
          right: "15%",
          width: "6px",
          height: "6px",
          animation: "bounce 2s .5s infinite"
        }}
      />
      <span
        className="position-absolute rounded-circle bg-purple"
        style={{
          bottom: "30%",
          left: "15%",
          width: "7px",
          height: "7px",
          animation: "bounce 2s 1s infinite"
        }}
      />
      <span
        className="position-absolute rounded-circle bg-success"
        style={{
          bottom: "15%",
          right: "10%",
          width: "9px",
          height: "9px",
          animation: "bounce 2s 1.5s infinite"
        }}
      />

      {/* KEYFRAMES */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1.6); opacity: .2; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </section>
  );
}




function TeamPage() {
  return (
    <>
      <TeamPageWithNavbar />

      <FoundersTeamComponent/>
      <OurJourneyComponent/>
        <MissionRecruitmentBanner />

      {/* …rest of the page… */}
    </>
  )
}
export default TeamPage;
