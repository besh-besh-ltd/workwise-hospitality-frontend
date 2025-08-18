import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Upload, 
  CheckCircle, 
  Download,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faCloudArrowUp, faPlay, faLock, faEyeSlash, faUsers, faListAlt, faFileAlt, faCalculator } from '@fortawesome/free-solid-svg-icons';
import { FaUpload, FaBrain, FaCheckCircle, FaBuilding, FaHardHat, FaProjectDiagram, FaBolt, FaMicrochip, FaRobot } from 'react-icons/fa';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { CtaSection } from '@/components/ui/CtaSection';
import FilePreview from '@/components/ui/FilePreview';

// Import data
import { aiToolsData } from '@/components/constants/aiToolsData';
import { getBOQexcelToJsonAI, handleCostEstimation, handleTenderSummary, handleTechnicalSummary, startCostEstimationProcess, getSImplifiedVersionOfBOQ } from '@/services/rfq';
import { toast } from 'react-toastify';
import { LoginService, SWSubscribe } from '@/services/Auth';
import { useSelector } from 'react-redux';
import storageInstance from '@/utils/storageInstance';
import TenderSummary from '@/components/ui/TenderSummary';
import { homepageData } from '@/components/constants/homepageData';

const AiToolPage = () => {
  const router = useRouter();
  const { tool } = router.query;
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formError, setFormError] = useState(null);
  const [summary , setSummary] = useState(false)
  const [technicalSummary, setTechnicalSummary] = useState(false)
  const [showTechnicalSummaryModal, setShowTechnicalSummaryModal] = useState(false)
  const swSubscription = useSelector((data) => data.swSubscription);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !router.isReady) {
    return <div>Loading...</div>;
  }

  // Get tool data based on slug
  const getToolData = () => {
    const toolMap = {
      'boq-simplification': aiToolsData.boqSimplifier,
      'cost-estimation': aiToolsData.costEstimator,
      'tender-summary': aiToolsData.tenderSummary,
      'technical-summary': aiToolsData.technicalSummary
    };
    return toolMap[tool] || aiToolsData.boqSimplifier;
  };

  const toolData = getToolData();

  // If tool doesn't exist, redirect to AI tools page
  if (!toolData) {
    router.push('/ai-tools');
    return null;
  }

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile?.name || '');
  };

  const handleUpload = () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }
    setShowFormModal(true);
  };

  const handleUserLogin = async (values) => {
    try {
      const response = await LoginService(values, true);
      // subscribe to SW
      SWSubscribe({ subscription: swSubscription, token: response.token });
      let userType = "";
      if (response.user_detail[0].user_type == 2) {
        userType = "buyer";
      } else if (response.user_detail[0].user_type == 3) {
        userType = "vendor";
      } else if (response.user_detail[0].user_type == 4) {
        userType = "other";
      } else if (response.user_detail[0].user_type == 7) {
        userType = "admin";
      } else if (response.user_detail[0].user_type == 8) {
        userType = "management";
      } else if (response.user_detail[0].user_type == 9) {
        userType = "engineering";
      } else if (response.user_detail[0].user_type == 10) {
        userType = "finance";
      }
      storageInstance.setStorage("current-user-type", userType);
      return true;
    } catch (error) {
      if (error?.response?.status === 400) {
      } else {
        toast.error(error?.message, {
          position: "top-center",
        });
      }
      return false;
    }
  }

  const handleCostEstimationRequest = async (formData) => {
    const persistJob = await handleCostEstimation(
      fileName,
      "cost-estimation",
      formData
    );
    const webhook = persistJob.webhook;

    if (persistJob.didUserRegister) {
      const isLoginSuccess = await handleUserLogin({
        email: persistJob.user.email,
        password: persistJob.user.password,
      });
      if (!isLoginSuccess) throw new Error("Login Failed!");
    }

    const startResponse = await startCostEstimationProcess(file, webhook);
    const response = startResponse.data;

    if (startResponse) {
      toast.success(response.message);
      setShowFormModal(false);
      setShowSuccessModal(true);
    } else {
      throw new Error(
        "Server is too busy to handle your request, please try again in some time..."
      );
    }
  };

  const handleBoqSimplificaitonRequest = async (formData) => {
    const persistJob = await handleCostEstimation(
      fileName,
      "simplified",
      formData
    );
    const webhook = persistJob.webhook;

    if (persistJob.didUserRegister) {
      const isLoginSuccess = await handleUserLogin({
        email: persistJob.user.email,
        password: persistJob.user.password,
      });
      if (!isLoginSuccess) throw new Error("Login Failed!");
    }

    const startResponse = await getSImplifiedVersionOfBOQ(file, webhook);
    const response = startResponse.data;

    if (startResponse) {
      toast.success(response.message);
      setShowFormModal(false);
      setShowSuccessModal(true);
    } else {
      throw new Error(
        "Server is too busy to handle your request, please try again in some time..."
      );
    }
  };

  const handleTenderSummaryRequest = async (formData) => {
    const summaryResponse = await handleTenderSummary(
      fileName,
      formData
    );
    
    if (summaryResponse.didUserRegister) {
      const isLoginSuccess = await handleUserLogin({
        email: summaryResponse.user.email,
        password: summaryResponse.user.password,
      });
      if (!isLoginSuccess) throw new Error("Login Failed!");
    }

    if(summaryResponse.status == 2) {
      toast.error("Summary cannot be generated for given file at the time, please try again later!")
    }
    setSummary(summaryResponse.markup);
  };

  const handleTechnicalSummaryRequest = async (formData) => {
    try {
      const response = await handleTechnicalSummary(file, formData);
      
      if (response.didUserRegister) {
        const isLoginSuccess = await handleUserLogin({
          email: response.user.email,
          password: response.user.password,
        });
        if (!isLoginSuccess) throw new Error("Login Failed!");
      }
      
      if (response.status === 1) {
        setTechnicalSummary(response);
        setShowFormModal(false);
        setShowTechnicalSummaryModal(true);
        toast.success("Technical document analyzed successfully!");
      } else {
        throw new Error(response.message || "Failed to analyze technical document");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      switch(toolData.slug) {
        case 'cost-estimation':
          handleCostEstimationRequest(formData);
          break;
        
        case 'tender-summary':
          handleTenderSummaryRequest(formData);
          break;
          
        case 'technical-summary':
          handleTechnicalSummaryRequest(formData);
          break;
        
        case 'boq-simplification':
          handleBoqSimplificaitonRequest(formData);
          break;
      }
    } catch (error) {
      setFormError(error?.response?.data?.message ?? error.message ?? "Something went wrong while uploading your file, please try again in sometime!")
      toast.error(error?.response?.data?.message ?? error.message ?? "Something went wrong while uploading your file, please try again in sometime!")
    }
  };

  const handleBookCall = () => {
    console.log('Book a Call clicked');
  };

  const handleDownload = () => {
    console.log('Download clicked');
  };

  const handleWatchDemo = () => {
    console.log('Watch Demo clicked');
  };

  const handleTryForFree = () => {
    console.log('Try for Free clicked');
  };

  const handleBookDemo = () => {
    console.log('Book Demo clicked');
  };

  return (
    <>
      <Head>
        <title>{`${toolData.title} | Workwise AI Tools`}</title>
        <meta name="description" content={`${toolData.hero.subtitle} - ${toolData.hero.title}`} />
      </Head>

      {!summary && !technicalSummary ? (<div className="min-vh-100" style={{ backgroundColor: 'var(--light-grey-color)' }}>
        <style jsx>{`
          .floatingIcon {
            position: absolute;
            color: rgba(255, 255, 255, 0.8);
            animation: float 6s ease-in-out infinite;
            z-index: 10;
          }
          
          .floatA {
            animation-delay: 0s;
          }
          
          .floatB {
            animation-delay: 2s;
          }
          
          .floatC {
            animation-delay: 4s;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          .company-logos-carousel .slick-slide {
            display: flex !important;
            justify-content: center;
            align-items: center;
          }
          .company-logos-carousel .slick-track {
            display: flex !important;
            align-items: center;
          }
          .company-logos-carousel .slick-list {
            overflow: hidden;
          }
          .company-logos-carousel .slick-slide img {
            margin: 0 auto;
          }
        `}</style>
        {/* Hero Section */}
        <div style={{position: 'relative'}}>
          <HeroSection
            title={toolData.hero.title}
            subtitle={toolData.hero.subtitle}
            layout="centered"
            size="large"
            showVisual={false}
            primaryButton={{
              label: toolData.hero.primaryButton.label,
              variant: "black",
              onClick: () => {}
            }}
            secondaryButton={{
              label: "Watch Demo",
              variant: "white",
              onClick: handleWatchDemo
            }}
          />
          {/* Floating Icons */}
          <div
            className="floatingIcon floatA d-none d-lg-block"
            style={{ top: "20%", left: "80%" }}
          >
            <FaRobot size={20} />
          </div>
          <div
            className="floatingIcon floatB d-none d-md-block"
            style={{ top: "45%", left: "80%" }}
          >
            <FaMicrochip size={20} />
          </div>
          <div
            className="floatingIcon floatC d-none d-md-block"
            style={{ top: "65%", left: "75%" }}
          >
            <FaProjectDiagram size={20} />
          </div>
        </div>

        {/* Trusted by Industry Leaders */}
        <section className="py-5 bg-light text-center">
          <div className="container">
            <h2 
              className="text-uppercase fw-bold mb-4"
              style={{ letterSpacing: "1px" }}
            >
              Trusted by Industry Leaders
            </h2>
            <div className="company-logos-carousel">
              <Slider {...homepageData.carouselSettings}>
                {homepageData.companyLogos.map((logo, index) => (
                  <div key={index} className="px-2">
                    <img
                      src={logo}
                      alt=""
                      style={{
                        maxWidth: '120px',
                        maxHeight: '60px',
                        objectFit: 'contain',
                        filter: 'none',
                        opacity: '1'
                      }}
                    />
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </section>

        {/* File Upload Section */}
        <section className="py-5 bg-white">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="text-center mb-4">
                  <h3 className="fw-bold mb-3">Upload Your File</h3>
                  <p className="text-muted">
                    Select your file and we'll process it using our AI technology
                  </p>
                </div>
                
                <div className="rounded-4 p-4">
                  <div
                    className="file-drop-area text-center rounded mb-4"
                    style={{
                      border: "2px dashed #007bff",
                      cursor: "pointer",
                      backgroundColor: "#fff",
                      color: "#007bff",
                      transition: "all 0.3s ease",
                      minHeight: "300px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "60px 20px"
                    }}
                    onClick={() => document.getElementById("fileInput").click()}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "#0056b3";
                      e.target.style.backgroundColor = "#f8fbff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#007bff";
                      e.target.style.backgroundColor = "#fff";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={fileName ? faFileExcel : faCloudArrowUp}
                      style={{ fontSize: "60px" }}
                    />
                    <p className="fw-semibold mb-0 mt-4 fs-5">
                      {fileName || "Upload/Drag & drop your file here"}
                    </p>
                    <p className="text-muted small mb-0 mt-3">
                      Supported formats: Excel (.xlsx, .xls), PDF, Word (.docx, .doc)
                    </p>
                  </div>

                  <input
                    id="fileInput"
                    type="file"
                    accept=".xlsx,.xls,.pdf,.docx,.doc"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  <div className="text-center">
                    <button
                      onClick={handleUpload}
                      className="btn btn-primary px-5 py-3 fw-medium"
                      style={{ minWidth: "300px" }}
                      disabled={!file}
                    >
                      <Upload size={16} className="me-2" />
                      {toolData.hero.primaryButton.label}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For Section */}
        <section className="py-5 bg-white">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fw-bold mb-2">Who It's For</h2>
              <p className="text-muted mb-0">
                Powerful AI-driven solutions to streamline your workflow and boost productivity
              </p>
            </div>
            <div className="row g-4">
              {aiToolsData.audience?.map((audience, index) => {
                // Inline AudienceCard
                const iconMap = {
                  'users': faUsers,
                  'list-alt': faListAlt,
                  'file-alt': faFileAlt,
                  'calculator': faCalculator
                };
                const Icon = iconMap[audience.icon] || faUsers;
                return (
                  <div key={index} className="col-md-6 col-lg-3">
                    <div className="rounded-4 shadow-sm h-100 position-relative bg-white" style={{borderTop: `5px solid ${audience.iconColor}`}}>
                      <div className="d-flex flex-column align-items-center justify-content-center pt-4 pb-3">
                        <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: `${audience.iconColor}1A`, marginBottom: 12}}>
                          <FontAwesomeIcon icon={Icon} style={{color: audience.iconColor, fontSize: 24}} />
                        </span>
                        <h6 className="fw-bold mb-1">{audience.title}</h6>
                        <p className="text-muted small mb-0 px-2">{audience.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {toolData.howItWorks.title}
              </h2>
            </div>
            <div className="row g-4">
              {toolData.howItWorks.steps.map((step, index) => (
                <div key={index} className="col-md-4">
                  <div className="text-center">
                    <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3"
                         style={{ width: '60px', height: '60px' }}>
                      <span className="fw-bold fs-5">{step.step}</span>
                    </div>
                    <h5 className="fw-bold mb-2">{step.title}</h5>
                    <p className="text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* See AI Tools in Action Section */}
        <section className="py-5 bg-light">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-6 mb-4 mb-md-0">
                <h2 className="fw-bold mb-3">See Our AI Tools in Action</h2>
                <p className="text-muted mb-4">
                  Watch how our AI tools transform complex procurement documents into actionable insights in minutes.
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
                <button className="btn btn-primary">
                  <FontAwesomeIcon icon={faPlay} className="me-2" /> Watch Demo
                </button>
              </div>
              <div className="col-md-6 text-center">
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
              </div>
            </div>
          </div>
        </section>

        {/* Sample Output Preview Section */}
        <section className="py-5 text-center">
          <div className="container">
            <h2 className="fw-bold mb-2">Sample Output Preview</h2>
            <p className="text-muted mb-4">
              Powerful AI-driven solutions to streamline your workflow and boost productivity
            </p>

            <div className="row g-4 mb-3">
              <div className="col-md-6">
                <FilePreview
                  title="Procurement Analysis Report"
                  description="Preview format only — your data stays secure"
                  image="/assets/images/placeholder.jpeg"
                  showPreview={false}
                />
              </div>
              <div className="col-md-6">
                <FilePreview
                  title="Bill of Quantities (BOQ)"
                  description="Preview format only — your data stays secure"
                  image="/assets/images/placeholder.jpeg"
                  showPreview={false}
                />
              </div>
            </div>

            <button className="btn btn-secondary" disabled>
              <FontAwesomeIcon icon={faEyeSlash} className="me-2" /> View Full Sample
            </button>
          </div>
        </section>

        {/* Trust Signals Section */}
        {/* <section className="py-5 bg-light">
          <div className="container"> */}
            {/* <div className="text-center mb-5">
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {toolData.trustSignals.title}
              </h2>
            </div> */}
            
            {/* Logos */}
            {/* <div className="row justify-content-center mb-5">
              {toolData.trustSignals.logos.map((logo, index) => (
                <div key={index} className="col-auto">
                  <div className="bg-white rounded-3 p-3 shadow-sm">
                    <span className="fw-bold text-primary">{logo}</span>
                  </div>
                </div>
              ))}
            </div> */}

            {/* Testimonials */}
            {/* <div className="row g-4 mb-4">
              {toolData.trustSignals.testimonials.map((testimonial, index) => (
                <div key={index} className="col-md-6">
                  <div className="bg-white rounded-4 p-4 shadow-sm h-100">
                    <p className="text-muted mb-3">"{testimonial.text}"</p>
                    <small className="fw-medium text-dark">{testimonial.author}</small>
                  </div>
                </div>
              ))}
            </div> */}

            {/* Badges */}
            {/* <div className="text-center mb-3">
              {toolData.trustSignals.badges.map((badge, index) => (
                <span key={index} className="badge bg-primary me-2 mb-2">
                  {badge}
                </span>
              ))}
            </div> */}

            {/* <div className="text-center">
              <p className="text-muted small">{toolData.trustSignals.tagline}</p>
            </div> */}
          {/* </div>
        </section> */}

        {/* Register Form Modal */}
        <RegisterFormModal
          show={showFormModal}
          onClose={() => setShowFormModal(false)}
          title={toolData.leadForm.title}
          subtitle={toolData.leadForm.subtitle}
          fields={toolData.leadForm.fields}
          onSubmit={handleFormSubmit}
          successMessage="Your file has been uploaded successfully! You will receive an email once it's processed."
        />

        {/* Success Modal */}
        {showSuccessModal && (
          <div 
            className="modal show d-block" 
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1050
            }}
          >
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
              <div className="modal-content border-0 shadow">
                <div className="modal-body text-center py-5">
                  <div className="mb-4">
                    <div 
                      className="rounded-circle d-inline-flex align-items-center justify-content-center"
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}
                    >
                      <CheckCircle size={40} />
                    </div>
                  </div>
                  <h4 className="fw-bold text-dark mb-3">File Uploaded Successfully!</h4>
                  <p className="text-muted mb-4">
                    Your file has been uploaded and is being processed. You will receive an email with the results once processing is complete.
                  </p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="btn btn-primary px-4 py-2"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Output View Section */}
        {showPreview && (
          <section className="py-5 bg-white">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <div className="text-center mb-4">
                    <h3 className="fw-bold mb-2">
                      {toolData.outputView.title}
                    </h3>
                    <p className="text-muted">
                      {toolData.emailResult.message}
                    </p>
                  </div>
                  
                  <div className="bg-light rounded-4 p-4 mb-4">
                    <div className="text-center">
                      <img
                        src={toolData.outputPreview.previews[0].image}
                        alt="Preview"
                        className="img-fluid rounded"
                        style={{ filter: "blur(2px)", maxHeight: "300px" }}
                      />
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <button
                      onClick={handleDownload}
                      className="btn btn-outline-primary px-4 py-2"
                    >
                      <Download size={16} className="me-2" />
                      {toolData.outputView.downloadText}
                    </button>
                    <button
                      onClick={handleBookCall}
                      className="btn btn-primary px-4 py-2"
                    >
                      {toolData.outputView.cta}
                    </button>
                  </div>
                  
                  {/* Chatbot Teaser */}
                  <div className="text-center mt-4">
                    <div className="bg-primary bg-opacity-10 rounded-3 p-3">
                      <h6 className="fw-bold text-primary mb-2">
                        {toolData.outputView.chatbotTeaser.title}
                      </h6>
                      <p className="text-muted small mb-0">
                        {toolData.outputView.chatbotTeaser.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Call to Action Section */}
        <div style={{ position: 'relative' }}>
          <CtaSection
            title="Ready to Transform Your Procurement Process?"
            description={
              <>
                <span>Start using our AI tools today and experience the difference in efficiency, accuracy, and insights.</span>
                <span className="d-block mt-2" style={{fontWeight: 500}}>No credit card required. Free for your first file.</span>
              </>
            }
            primaryButton={{
              label: "Try for Free",
              variant: "white",
              onClick: handleTryForFree,
              icon: undefined,
              style: { minWidth: '200px' }
            }}
            secondaryButton={{
              label: "Book a Demo",
              variant: "outline",
              onClick: handleBookDemo,
              icon: undefined,
              style: { 
                minWidth: '200px',
                backgroundColor: 'transparent',
                borderColor: 'rgba(255,255,255,0.8)',
                color: 'white'
              }
            }}
          />
          <style>{`
            .CtaSection .btn, .CtaSection .btn-lg {
              min-width: 200px !important;
              max-width: 260px;
            }
          `}</style>
        </div>
        {/* Bottom CTA Section */}
        {/* <CtaSection
          title={toolData.bottomCta.title}
          primaryButton={{
            ...toolData.bottomCta.button,
            variant: "white",
            onClick: handleBookCall
          }}
        /> */}
      </div>) : <TenderSummary summary={summary}/>}

      {/* Technical Summary Modal */}
      {showTechnicalSummaryModal && technicalSummary && (
        <div 
          className="modal show d-block" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1050
          }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h4 className="modal-title fw-bold">Technical Document Summary</h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowTechnicalSummaryModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-4">
                  {/* Technical Specifications */}
                  {technicalSummary.structuredData?.technicalSpecifications && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-cog me-2 text-primary"></i>
                            Technical Specifications
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            {technicalSummary.structuredData.technicalSpecifications.map((clause, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-check-circle me-2 mt-1 text-success"></i>
                                  <div className="flex-grow-1">
                                    {typeof clause === 'string' ? (
                                      <p className="mb-0 text-muted">{clause}</p>
                                    ) : (
                                      <div>
                                        {clause.parameter && (
                                          <span className="fw-medium">{clause.parameter}: </span>
                                        )}
                                        {clause.value && (
                                          <span className="text-muted">{clause.value}</span>
                                        )}
                                        {clause.unit && (
                                          <span className="text-muted"> {clause.unit}</span>
                                        )}
                                        {clause.text && (
                                          <span className="text-muted">{clause.text}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commercial Requirements */}
                  {technicalSummary.structuredData?.commercialRequirements && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-file-alt me-2 text-primary"></i>
                            Commercial Requirements
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            {technicalSummary.structuredData.commercialRequirements.map((clause, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-check-circle me-2 mt-1 text-success"></i>
                                  <div className="flex-grow-1">
                                    {typeof clause === 'string' ? (
                                      <p className="mb-0 text-muted">{clause}</p>
                                    ) : (
                                      <div>
                                        {clause.parameter && (
                                          <span className="fw-medium">{clause.parameter}: </span>
                                        )}
                                        {clause.value && (
                                          <span className="text-muted">{clause.value}</span>
                                        )}
                                        {clause.text && (
                                          <span className="text-muted">{clause.text}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standards */}
                  {technicalSummary.structuredData?.standards && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-check-circle me-2 text-primary"></i>
                            Standards & Compliance
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            {technicalSummary.structuredData.standards.map((clause, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-check-circle me-2 mt-1 text-success"></i>
                                  <div className="flex-grow-1">
                                    {typeof clause === 'string' ? (
                                      <p className="mb-0 text-muted">{clause}</p>
                                    ) : (
                                      <div>
                                        {clause.standard && (
                                          <span className="fw-medium">{clause.standard}: </span>
                                        )}
                                        {clause.description && (
                                          <span className="text-muted">{clause.description}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inspection Requirements */}
                  {technicalSummary.structuredData?.inspectionRequirements && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-clipboard-list me-2 text-primary"></i>
                            Inspection Requirements
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            {technicalSummary.structuredData.inspectionRequirements.map((clause, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-check-circle me-2 mt-1 text-success"></i>
                                  <div className="flex-grow-1">
                                    {typeof clause === 'string' ? (
                                      <p className="mb-0 text-muted">{clause}</p>
                                    ) : (
                                      <div>
                                        {clause.requirement && (
                                          <span className="fw-medium">{clause.requirement}: </span>
                                        )}
                                        {clause.description && (
                                          <span className="text-muted">{clause.description}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {technicalSummary.structuredData?.notes && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-file-alt me-2 text-primary"></i>
                            Additional Notes
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            {technicalSummary.structuredData.notes.map((clause, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-check-circle me-2 mt-1 text-success"></i>
                                  <div className="flex-grow-1">
                                    {typeof clause === 'string' ? (
                                      <p className="mb-0 text-muted">{clause}</p>
                                    ) : (
                                      <div>
                                        {clause.note && (
                                          <span className="text-muted">{clause.note}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tables */}
                  {technicalSummary.structuredData?.tables && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-clipboard-list me-2 text-primary"></i>
                            Data Tables
                          </h6>
                        </div>
                        <div className="card-body">
                          {technicalSummary.structuredData.tables.map((table, index) => (
                            <div key={index} className="mb-4">
                              {table.title && <h6 className="mb-3">{table.title}</h6>}
                              {table.headers && table.rows && (
                                <div className="table-responsive">
                                  <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                      <tr>
                                        {table.headers.map((header, hIndex) => (
                                          <th key={hIndex} className="text-center">{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {table.rows.map((row, rIndex) => (
                                        <tr key={rIndex}>
                                          {row.map((cell, cIndex) => (
                                            <td key={cIndex} className="text-center">{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {technicalSummary.structuredData?.attachments && technicalSummary.structuredData.attachments.length > 0 && (
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light border-0">
                          <h6 className="mb-0">
                            <i className="fas fa-file-alt me-2 text-primary"></i>
                            Referenced Documents
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            {technicalSummary.structuredData.attachments.map((attachment, index) => (
                              <div key={index} className="col-12">
                                <div className="d-flex align-items-start">
                                  <i className="fas fa-file-alt me-2 mt-1 text-muted"></i>
                                  <div>
                                    <div className="fw-medium">{attachment.name}</div>
                                    {attachment.description && (
                                      <div className="text-muted small">{attachment.description}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTechnicalSummaryModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Download functionality
                    const summaryText = JSON.stringify(technicalSummary, null, 2);
                    const blob = new Blob([summaryText], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'technical-summary.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </>
  );
};

export default AiToolPage; 