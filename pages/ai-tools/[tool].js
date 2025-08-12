import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Upload, 
  CheckCircle, 
  Download,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';

// Import components
import { HeroSection } from '@/components/ui/HeroSection';
import { RegisterFormModal } from '@/components/ui/RegisterFormModal';

// Import data
import { aiToolsData } from '@/components/constants/aiToolsData';
import { getBOQexcelToJsonAI, handleCostEstimation, startCostEstimationProcess } from '@/services/rfq';
import { toast } from 'react-toastify';
import { LoginService, SWSubscribe } from '@/services/Auth';
import { useSelector } from 'react-redux';
import storageInstance from '@/utils/storageInstance';

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

  const handleFormSubmit = async (formData) => {
    try {
      const persistJob = await handleCostEstimation(fileName, 'cost-estimation', formData);
      const webhook = persistJob.webhook;

      if(persistJob.didUserRegister) {
        const isLoginSuccess = await handleUserLogin({ email: persistJob.user.email, password: persistJob.user.password });
        if(!isLoginSuccess) throw new Error("Login Failed!")
      }
      
      const startResponse = await startCostEstimationProcess(file, webhook);
      const response = startResponse.data;

      if (startResponse) {
        toast.success(response.message);
        setShowFormModal(false);
        setShowSuccessModal(true);
      } else {
        throw new Error("Server is too busy to handle your request, please try again in some time...")
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


  return (
    <>
      <Head>
        <title>{`${toolData.title} | Workwise AI Tools`}</title>
        <meta name="description" content={`${toolData.hero.subtitle} - ${toolData.hero.title}`} />
      </Head>

      <div className="min-vh-100">
        {/* Hero Section */}
        <HeroSection
          title={toolData.hero.title}
          subtitle={toolData.hero.subtitle}
          layout="centered"
          size="small"
          textAlign="left"
          showVisual={false}
        />

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

        {/* Output Preview Section */}
        {/* <section className="py-5 bg-white">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fs-2 fw-bold text-dark mb-3">
                {toolData.outputPreview.title}
              </h2>
              <p className="text-muted mb-4">
                {toolData.outputPreview.previewNote}
              </p>
            </div>
            <div className="row g-4">
              {toolData.outputPreview.previews.map((preview, index) => (
                <div key={index} className="col-md-6">
                  <AiToolPreview
                    title={preview.title}
                    description={preview.description}
                    image={preview.image}
                    onDownload={handleDownload}
                    onView={() => console.log('View preview')}
                  />
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <small className="text-muted">{toolData.outputPreview.note}</small>
            </div>
          </div>
        </section> */}

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

        {/* Bottom CTA Section */}
        {/* <CtaSection
          title={toolData.bottomCta.title}
          primaryButton={{
            ...toolData.bottomCta.button,
            variant: "white",
            onClick: handleBookCall
          }}
        /> */}
      </div>
    </>
  );
};

export default AiToolPage; 