import { FaqAccordion } from '@/components/ui/FaqAccordion';
import { HeroSection } from '@/components/ui/HeroSection'
import React from 'react'
import { 
  FaCalendarAlt, 
  FaClock, 
  FaVideo, 
  
  FaUsers,
  FaPlay,
  FaTrendingUp,
  FaTarget,
  FaCoins,
  FaSitemap,
  FaHome,
  FaNetworkWired,
  FaUser,
  FaHardHat,
  FaHeadset,
  FaBullseye, FaDollarSign, FaCreditCard, FaChartLine,
  FaHandshake,
  FaUserPlus,
  FaLink,
  FaChartPie
} from 'react-icons/fa';
import { FaRocket, FaComments } from 'react-icons/fa';





const HowItWorksSection = ({ 
  className,
  title = "How This Works — In 4 Simple Steps",
  steps,
  earningsHighlight,
  ctaButton,
  ...props 
}) => {
  const defaultSteps = [
    {
      id: 1,
      icon: "person-plus",
      iconBg: "#4a73c4",
      title: "Register",
      description: "Sign up with basic details and get your partner account activated"
    },
    {
      id: 2,
      icon: "gear",
      iconBg: "#2e8b7c", 
      title: "Get Referral Kit",
      description: "Templates, case studies, videos to help you make effective introductions"
    },
    {
      id: 3,
      icon: "handshake",
      iconBg: "#ff9500",
      title: "Make Introductions", 
      description: "Just connect us with potential buyers or suppliers. No selling required"
    },
    {
      id: 4,
      icon: "currency-rupee",
      iconBg: "#4a4a4a",
      title: "We Close, You Earn",
      description: "Commission paid directly to your account upon successful closure"
    }
  ];

  const stepsToShow = steps || defaultSteps;

  return (
    <section className={`py-5 bg-light ${className || ''}`} {...props}>
      <div className="container">
        {/* Section Title */}
        <div className="text-center mb-5">
          <h2 className="h2 fw-bold text-dark mb-4">
            <i className="bi bi-gear-fill text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
            {title}
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="row justify-content-center mb-5">
          {stepsToShow.map((step, index) => (
            <div key={step.id} className="col-lg-3 col-md-6 mb-4">
              {/* Card Container */}
              <div className="card h-100 border-0 shadow-sm bg-white">
                <div className="card-body text-center p-4">
                  {/* Step Icon with Badge */}
                  <div className="position-relative d-inline-block mb-3">
                    <div 
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{ 
                        width: '70px', 
                        height: '70px',
                        backgroundColor: step.iconBg
                      }}
                    >
                      <i className={`bi bi-${step.icon} text-white`} style={{ fontSize: '1.8rem' }}></i>
                    </div>
                    
                    {/* Number Badge */}
                    <span 
                      className="position-absolute top-0 start-100 translate-middle d-flex align-items-center justify-content-center bg-dark text-white rounded-circle fw-bold"
                      style={{ 
                        width: '24px', 
                        height: '24px',
                        fontSize: '0.75rem',
                        marginLeft: '-12px',
                        marginTop: '-4px'
                      }}
                    >
                      {step.id}
                    </span>
                  </div>

                  {/* Step Content */}
                  <h5 className="fw-bold text-dark mb-3">
                    {step.title}
                  </h5>
                  <p className="text-muted mb-0 small lh-base">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Earnings Highlight */}
        {earningsHighlight !== false && (
          <div className="text-center mb-4">
            <div 
              className="d-inline-flex align-items-center px-4 py-2 rounded-pill"
              style={{ 
                backgroundColor: '#fff3cd',
                border: '1px solid #f0c419'
              }}
            >
              <i className="bi bi-star-fill text-warning me-2"></i>
              <span className="fw-semibold text-dark">
                {earningsHighlight?.text || "Earn 25% in Year 1 + 10% on renewals. Just 4 buyer referrals = ₹2.5L+/month"}
              </span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {ctaButton !== false && (
          <div className="text-center">
            <button
              className="btn btn-dark btn-lg px-4 py-3 fw-semibold rounded-3"
              onClick={ctaButton?.onClick}
              style={{ 
                minWidth: '250px',
                fontSize: '1rem'
              }}
            >
              <i className={`bi bi-${ctaButton?.icon || 'link'} me-2`}></i>
              {ctaButton?.label || "Make an Introduction"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};


const WebinarComponent = () => {
  return (
    <div className="container-fluid p-0">
      <div 
        className="row g-0 rounded-4 overflow-hidden shadow-lg mx-auto" 
        style={{ maxWidth: '1000px', background: 'linear-gradient(135deg, #2E5BBA 0%, #41B8A8 100%)' }}
      >
        {/* Left Side - Image */}
        <div className="col-md-6 p-0">
          <div className="position-relative h-100 d-flex align-items-center justify-content-center p-4">
            <div 
              className="bg-white rounded-3 shadow-lg p-3"
              style={{ width: '90%', aspectRatio: '16/10' }}
            >
              {/* Simulated video call interface */}
              <div className="row g-2 h-100">
                {/* Main presenter */}
                <div className="col-6">
                  <div 
                    className="bg-primary rounded-2 h-100 d-flex align-items-center justify-content-center position-relative"
                    style={{ background: 'linear-gradient(45deg, #4c63d2, #6366f1)' }}
                  >
                    <div className="text-white text-center">
                      <FaUsers size={24} className="mb-2 opacity-75" />
                      <div style={{ fontSize: '12px' }}>Presenter</div>
                    </div>
                  </div>
                </div>
                
                {/* Charts/Analytics */}
                <div className="col-6">
                  <div className="h-100 d-flex flex-column gap-2">
                    {/* Chart 1 */}
                    <div 
                      className="bg-dark rounded-2 flex-grow-1 d-flex align-items-center justify-content-center"
                      style={{ background: '#1a1d29' }}
                    >
                      <div className="d-flex align-items-end gap-1">
                        <div className="bg-info" style={{ width: '8px', height: '20px', borderRadius: '1px' }}></div>
                        <div className="bg-success" style={{ width: '8px', height: '25px', borderRadius: '1px' }}></div>
                        <div className="bg-warning" style={{ width: '8px', height: '15px', borderRadius: '1px' }}></div>
                        <div className="bg-danger" style={{ width: '8px', height: '30px', borderRadius: '1px' }}></div>
                      </div>
                    </div>
                    
                    {/* Chart 2 */}
                    <div 
                      className="bg-dark rounded-2 flex-grow-1 d-flex align-items-center justify-content-center"
                      style={{ background: '#1a1d29' }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        <div 
                          className="bg-info rounded-circle"
                          style={{ width: '20px', height: '20px' }}
                        ></div>
                        <div style={{ fontSize: '10px', color: '#fff' }}>Analytics</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom charts */}
                <div className="col-12" style={{ height: '30%' }}>
                  <div className="row g-2 h-100">
                    <div className="col-6">
                      <div 
                        className="bg-dark rounded-2 h-100 d-flex align-items-center justify-content-center"
                        style={{ background: '#1a1d29' }}
                      >
                        <div className="d-flex align-items-end gap-1">
                          {[15, 25, 20, 35, 30, 40].map((height, i) => (
                            <div 
                              key={i}
                              className="bg-primary" 
                              style={{ 
                                width: '4px', 
                                height: `${height}%`, 
                                borderRadius: '1px',
                                opacity: 0.8 
                              }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div 
                        className="bg-dark rounded-2 h-100 d-flex align-items-center justify-content-center"
                        style={{ background: '#1a1d29' }}
                      >
                        <svg width="40" height="20">
                          <path 
                            d="M 2 10 Q 10 5 20 8 T 38 12" 
                            stroke="#17a2b8" 
                            strokeWidth="2" 
                            fill="none"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Audience silhouettes */}
            <div className="position-absolute bottom-0 start-0 p-3">
              <div className="d-flex gap-2">
                {[1, 2, 3].map((_, i) => (
                  <div 
                    key={i}
                    className="bg-dark rounded-circle opacity-25"
                    style={{ 
                      width: '40px', 
                      height: '40px',
                      background: 'rgba(0,0,0,0.3)' 
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="col-md-6 bg-white p-0">
          <div className="p-4 h-100 d-flex flex-column">
            {/* Header */}
            <div className="mb-4">
              <div className="d-flex align-items-center mb-3">
                <FaCalendarAlt className="text-primary me-2" size={20} />
                <h4 className="mb-0 fw-bold text-dark">
                  30-Min Webinar: Learn How You Can Earn
                </h4>
              </div>
              
              <p className="text-muted mb-4" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                Join our weekly webinar to understand the partner model in 
                detail and hear from existing partners who are already 
                earning substantial commissions.
              </p>
            </div>

            {/* Schedule Details */}
            <div className="mb-4 flex-grow-1">
              <div className="d-flex align-items-center mb-3">
                <FaCalendarAlt className="text-warning me-3" size={16} />
                <span className="fw-semibold text-dark">Every Wednesday & Saturday</span>
              </div>
              
              <div className="d-flex align-items-center mb-3">
                <FaClock className="text-warning me-3" size={16} />
                <span className="fw-semibold text-dark">7:00 PM - 7:30 PM IST</span>
              </div>
              
              <div className="d-flex align-items-center mb-4">
                <FaVideo className="text-warning me-3" size={16} />
                <span className="fw-semibold text-dark">Hosted on Zoom</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              <button 
                className="btn btn-dark btn-lg w-100 py-3 mb-3 fw-semibold d-flex align-items-center justify-content-center"
                style={{ 
                  background: '#2c3e50',
                  border: 'none',
                  borderRadius: '8px'
                }}
              >
                <FaUsers className="me-2" />
                Register for Webinar
              </button>
              
              <div className="text-center">
                <a 
                  href="#" 
                  className="text-primary text-decoration-none d-flex align-items-center justify-content-center"
                  style={{ fontSize: '14px' }}
                >
                  <FaPlay className="me-2" size={12} />
                  Past Webinars — View Recordings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const WhoIsThisForComponent = () => {
  const targetAudience = [
    {
      id: 1,
      icon: <FaHardHat className="text-white" size={20} />,
      title: 'Project consultants & PMCs'
    },
    {
      id: 2,
      icon: <FaUser className="text-white" size={20} />,
      title: 'Retired procurement heads'
    },
    {
      id: 3,
      icon: <FaNetworkWired className="text-white" size={20} />,
      title: 'Salespeople with vendor networks'
    },
    {
      id: 4,
      icon: <FaHome className="text-white" size={20} />,
      title: 'Freelancers, industrial agents'
    },
    {
      id: 5,
      icon: <FaSitemap className="text-white" size={20} />,
      title: 'Anyone with deep industry contacts'
    }
  ];

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="d-flex align-items-center justify-content-center mb-4">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center me-3"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'rgba(13, 110, 253, 0.1)' 
                }}
              >
                <FaHandshake className="text-primary" size={20} />
              </div>
              <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                Who Is This For?
              </h2>
            </div>
          </div>

          {/* Target Audience List */}
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="row g-4 mb-5">
                {/* Left Column */}
                <div className="col-md-6">
                  {targetAudience.slice(0, 3).map((item) => (
                    <div key={item.id} className="d-flex align-items-center mb-4">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          background: 'linear-gradient(135deg, #4a90a4 0%, #5fa8c0 100%)'
                        }}
                      >
                        {item.icon}
                      </div>
                      <h5 className="mb-0 fw-semibold text-dark" style={{ fontSize: '1.1rem' }}>
                        {item.title}
                      </h5>
                    </div>
                  ))}
                </div>

                {/* Right Column */}
                <div className="col-md-6">
                  {targetAudience.slice(3, 5).map((item) => (
                    <div key={item.id} className="d-flex align-items-center mb-4">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          background: 'linear-gradient(135deg, #4a90a4 0%, #5fa8c0 100%)'
                        }}
                      >
                        {item.icon}
                      </div>
                      <h5 className="mb-0 fw-semibold text-dark" style={{ fontSize: '1.1rem' }}>
                        {item.title}
                      </h5>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Text & CTA */}
              <div className="text-center">
                <p 
                  className="text-muted mb-4" 
                  style={{ 
                    fontSize: '1.1rem', 
                    lineHeight: '1.6',
                    maxWidth: '600px',
                    margin: '0 auto 2rem'
                  }}
                >
                  Have contacts in industrial, manufacturing, or procurement sectors? You're a perfect fit!
                </p>
                
                <button 
                  className="btn btn-dark btn-lg px-4 py-3 fw-semibold d-inline-flex align-items-center"
                  style={{ 
                    background: '#2c3e50',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <FaUserPlus className="me-2" size={16} />
                  Join as a Partner
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



const PartnerDashboardComponent = () => {
  const referralsData = [
    {
      company: 'ABC Manufacturing',
      contact: 'Vikram Singh',
      type: 'Buyer',
      status: 'Closed',
      statusColor: 'success'
    },
    {
      company: 'XYZ Industries',
      contact: 'Priya Desai',
      type: 'Buyer',
      status: 'Demo',
      statusColor: 'primary'
    },
    {
      company: 'Global Supplies Ltd',
      contact: 'Anand Kumar',
      type: 'Vendor',
      status: 'Contacted',
      statusColor: 'warning'
    }
  ];

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12" style={{ maxWidth: '1000px' }}>
          {/* Dashboard Card */}
          <div className="bg-white rounded-4 shadow-lg p-4" style={{ backgroundColor: '#f8f9fa' }}>
            
            {/* Header */}
            <div className="d-flex align-items-center mb-4">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center me-3"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'rgba(13, 110, 253, 0.1)' 
                }}
              >
                <FaChartPie className="text-primary" size={20} />
              </div>
              <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.75rem' }}>
                Your Partner Dashboard
              </h2>
            </div>

            {/* Profile Section */}
            <div className="d-flex align-items-center justify-content-between mb-4 pb-3" style={{ borderBottom: '1px solid #e9ecef' }}>
              <div className="d-flex align-items-center">
                {/* Profile Image Placeholder */}
                <img 
                  src="https://via.placeholder.com/60x60/6c757d/ffffff?text=RS" 
                  alt="Rajesh Sharma"
                  className="rounded-circle me-3"
                  style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                />
                <div>
                  <h4 className="mb-1 fw-bold text-dark">Rajesh Sharma</h4>
                  <span 
                    className="badge px-3 py-1" 
                    style={{ 
                      backgroundColor: '#d1e7dd', 
                      color: '#0f5132',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Active Partner
                  </span>
                </div>
              </div>
              <div className="text-end">
                <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                  Partner since: <span className="fw-semibold">15 Jun 2023</span>
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div 
                  className="p-4 rounded-3" 
                  style={{ backgroundColor: 'rgba(13, 110, 253, 0.08)' }}
                >
                  <p className="mb-2 text-muted fw-medium" style={{ fontSize: '0.9rem' }}>
                    Total Referrals
                  </p>
                  <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                    12
                  </h3>
                </div>
              </div>
              <div className="col-md-4">
                <div 
                  className="p-4 rounded-3" 
                  style={{ backgroundColor: 'rgba(25, 135, 84, 0.08)' }}
                >
                  <p className="mb-2 text-muted fw-medium" style={{ fontSize: '0.9rem' }}>
                    Active Deals
                  </p>
                  <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                    5
                  </h3>
                </div>
              </div>
              <div className="col-md-4">
                <div 
                  className="p-4 rounded-3" 
                  style={{ backgroundColor: 'rgba(108, 117, 125, 0.08)' }}
                >
                  <p className="mb-2 text-muted fw-medium" style={{ fontSize: '0.9rem' }}>
                    Total Earnings
                  </p>
                  <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                    ₹3.8L
                  </h3>
                </div>
              </div>
            </div>

            {/* Recent Referrals Section */}
            <div className="mb-4">
              <h5 className="mb-3 fw-bold text-dark">Recent Referrals</h5>
              
              {/* Table Header */}
              <div className="row py-2 mb-2" style={{ borderBottom: '2px solid #e9ecef' }}>
                <div className="col-3">
                  <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Company
                  </span>
                </div>
                <div className="col-3">
                  <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Contact
                  </span>
                </div>
                <div className="col-2">
                  <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Type
                  </span>
                </div>
                <div className="col-4">
                  <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status
                  </span>
                </div>
              </div>

              {/* Table Rows */}
              {referralsData.map((referral, index) => (
                <div key={index} className="row py-3 align-items-center" style={{ borderBottom: '1px solid #f1f3f4' }}>
                  <div className="col-3">
                    <span className="fw-semibold text-dark">{referral.company}</span>
                  </div>
                  <div className="col-3">
                    <span className="text-dark">{referral.contact}</span>
                  </div>
                  <div className="col-2">
                    <span className="text-muted">{referral.type}</span>
                  </div>
                  <div className="col-4">
                    <span 
                      className={`badge px-3 py-1 bg-${referral.statusColor}`}
                      style={{ 
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        opacity: referral.statusColor === 'warning' ? '0.9' : '1'
                      }}
                    >
                      {referral.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-center pt-3">
              <button 
                className="btn btn-dark btn-lg px-4 py-3 fw-semibold d-inline-flex align-items-center"
                style={{ 
                  background: '#2c3e50',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <FaLink className="me-2" size={16} />
                Make an Introduction
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};




const faqList = [
  {
    question: "How much can I earn per referral?",
    answer:
      "You earn 25% of the first year's contract value and 10% on all renewals. For example, if a buyer signs up for a ₹10 Lakh package, you earn ₹2.5 Lakhs in the first year and ₹1 Lakh every renewal year."
  },
  {
    question: "What if my contact doesn't convert?",
    answer:
      "There's no penalty for referrals that don't convert. Our sales team will do their best to close the deal, but you only earn when a successful conversion happens. The more referrals you make, the higher your chances of earning."
  },
  {
    question: "Is it free to join?",
    answer:
      "Yes, joining the Workwise Partner Program is completely free. There are no registration fees, monthly charges, or any hidden costs. You only need to register, get verified, and start making introductions."
  },
  {
    question: "How and when do I get paid?",
    answer:
      "Payments are processed within 15 days of the client making their payment to Workwise. You'll receive your commission directly in your bank account. All earnings are clearly visible in your partner dashboard."
  },
  {
    question: "Do I need to be technically skilled?",
    answer:
      "No technical skills required. Your industry connections and ability to make introductions are what matter. We'll provide all the training and materials you need to understand our solution and make effective referrals."
  }
];

const FaqSection = () => (
  <section className="py-5 bg-light">
    <div className="container">
      <h2 className="h3 fw-bold text-center mb-4">
        Frequently Asked Questions
      </h2>

      <FaqAccordion questions={faqList} />
    </div>
  </section>
);


const WorkwisePartnerComponent = () => {
  const features = [
    {
      id: 1,
      icon: <FaDollarSign className="text-primary" size={24} />,
      iconBg: 'rgba(13, 110, 253, 0.1)',
      title: 'Earn Big, Recurring Income',
      description: '25% commission on first year + 10% on renewals. Potential to earn lakhs monthly with just a few good referrals.'
    },
    {
      id: 2,
      icon: <FaCreditCard className="text-success" size={24} />,
      iconBg: 'rgba(25, 135, 84, 0.1)',
      title: 'Zero Investment',
      description: 'No upfront costs or minimum commitments. You simply refer, we handle the sales process and closing.'
    },
    {
      id: 3,
      icon: <FaHeadset className="text-warning" size={24} />,
      iconBg: 'rgba(255, 193, 7, 0.1)',
      title: 'Full Support',
      description: 'Get a complete referral kit, join our partner WhatsApp group, and have a dedicated SPOC to help you succeed.'
    },
    {
      id: 4,
      icon: <FaChartLine className="text-info" size={24} />,
      iconBg: 'rgba(13, 202, 240, 0.1)',
      title: "India's Capex Boom",
      description: "Capitalize on India's growing industrial and procurement sector. Huge demand means more opportunities for you."
    }
  ];

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
                  background: 'rgba(25, 135, 84, 0.1)' 
                }}
              >
                <FaBullseye className="text-success" size={20} />
              </div>
              <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '2rem' }}>
                Why Become a Workwise Partner?
              </h2>
            </div>
          </div>

          {/* Features Grid */}
          <div className="row g-4">
            {features.map((feature) => (
              <div key={feature.id} className="col-lg-6 col-md-6">
                <div className="d-flex align-items-start">
                  {/* Icon */}
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-4"
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      background: feature.iconBg
                    }}
                  >
                    {feature.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-grow-1">
                    <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '1.25rem' }}>
                      {feature.title}
                    </h4>
                    <p 
                      className="text-muted mb-0" 
                      style={{ 
                        fontSize: '1rem', 
                        lineHeight: '1.6',
                        color: '#6c757d !important'
                      }}
                    >
                      {feature.description}
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
};




const JoinPartnersCTAComponent = () => {
  return (
    <div 
      className="py-5"
      style={{ 
        background: 'linear-gradient(135deg, #2E5BBA 0%, #41B8A8 100%)',
        minHeight: '300px'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 text-center">
            
            {/* Header Section */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-center mb-4">
                <FaRocket className="text-white me-3" size={32} />
                <h1 
                  className="mb-0 fw-bold text-white" 
                  style={{ 
                    fontSize: '2.5rem',
                    lineHeight: '1.2'
                  }}
                >
                  Join 100+ Partners Already Earning with Workwise
                </h1>
              </div>
              
              <p 
                className="text-white mb-5" 
                style={{ 
                  fontSize: '1.25rem',
                  opacity: '0.95',
                  maxWidth: '600px',
                  margin: '0 auto 3rem'
                }}
              >
                It takes 2 mins to start. And a lifetime of earnings.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="d-flex flex-wrap justify-content-center gap-3">
              {/* Primary CTA - Register */}
              <button 
                className="btn btn-lg px-5 py-3 fw-semibold d-flex align-items-center"
                style={{ 
                  backgroundColor: '#2c3e50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <FaUserPlus className="me-2" size={18} />
                Register as a Partner
              </button>

              {/* Secondary CTA - Talk to Team */}
              <button 
                className="btn btn-lg px-5 py-3 fw-semibold d-flex align-items-center"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#2E5BBA',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <FaComments className="me-2" size={18} />
                Talk to Partnership Team
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};




const EarnWithUs = () => {
  return (
    <>
    <HeroSection
  title="Turn Your Industry Network into Income"
  subtitle="Start your second innings as a Workwise Partner — no investment needed. Your experience, contacts, and hunger to grow are your assets."
  primaryButton={{
    label: "Register to Become a Partner",
    variant: "dark",
    icon: "person-plus",
    onClick: () => console.log("Register clicked")
  }}
  secondaryButton={{
    label: "Learn More",
    variant: "outline-light",
    onClick: () => console.log("Learn more clicked")
  }}
/>
<HowItWorksSection />
<WebinarComponent />
<WorkwisePartnerComponent />
<WhoIsThisForComponent />
<PartnerDashboardComponent/>

<FaqSection />

<JoinPartnersCTAComponent />


    </>
  )
}

export default EarnWithUs
