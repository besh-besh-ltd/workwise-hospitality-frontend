// ----------------------------------------------------
// HeroSectionTeam.jsx
// ----------------------------------------------------
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout';
import { FaUser ,FaUsers, FaLinkedin , FaCalendarAlt , FaRocket , FaArrowRight} from "react-icons/fa";
import { teamTimelineData } from '@/components/constants/teamTimelineData';

const TeamPageWithNavbar = () => {
  return (
    <>
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
              {/* Title - White text */}
              <h1 className="fw-bold display-4 mb-4 text-white">
                {teamTimelineData.hero.title}
              </h1>
              
              {/* Subtitle - White text */}
              <p className="lead fw-normal text-white mx-auto lh-base" style={{ maxWidth: "700px" }}>
                {teamTimelineData.hero.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};




const FoundersTeamComponent = () => {
  const { teamBehindWorkwise } = teamTimelineData;

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
              {member.linkedin && (
                <a 
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none"
                >
                  <FaLinkedin 
                    className="text-primary" 
                    size={16} 
                    style={{ opacity: 0.7, cursor: 'pointer' }}
                  />
                </a>
              )}
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
          
          {/* Team Section */}
          <div className="mb-4">
            <div className="row">
              {teamBehindWorkwise.map((member) => (
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
  const { journeyMilestones } = teamTimelineData;

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
  const { missionSection } = teamTimelineData;
  const router = useRouter();

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
            {missionSection.title}
          </h1>
        </div>

        {/* Description */}
        <p className="fs-5 text-muted mb-4">
          {missionSection.description}
        </p>

        {/* CTA */}
        <button
          type="button"
          className="btn btn-dark btn-lg d-inline-flex align-items-center gap-2 px-4 py-3 fw-semibold"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => router.push('/work-with-us/careers')}
          style={{ transition: "transform .3s", minWidth: "280px" }}
        >
          {missionSection.buttonText}
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
    <Layout>
      <TeamPageWithNavbar />
      <FoundersTeamComponent/>
      {/* <OurJourneyComponent/> */}
      <MissionRecruitmentBanner />
    </Layout>
  )
}
export default TeamPage;
